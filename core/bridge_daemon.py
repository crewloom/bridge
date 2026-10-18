#!/usr/bin/env python3
"""Rumuze Edit: Telegram <-> Machine <-> OpenCode Legacy Bridge Daemon.

Polls Bot API getUpdates every 25s, gates via gate state (enabled + read/build),
runs one `opencode run --dir TARGET --format json` at a time with a timeout,
edits a live status card, sends ANSI-stripped chunked replies, handles photo
attachments via getFile, and writes an audit log.

Zero external dependencies (stdlib only).
"""
import http.client
import io
import json
import os
import re
import signal
import ssl
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone

try:
    from core.config import Config
    from core.policy import SecurityPolicy
except ImportError:
    from config import Config
    from policy import SecurityPolicy

TMP_DIR = "/tmp/rumuze_edit"
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\r")
MODEL_RE = re.compile(r"^/m\s+([A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+)[\s\n]+(.*)$", re.DOTALL)
SYNC_RE = re.compile(
    r"(sync|pull).*(update|github|origin|main|master|dev)"
    r"|^(sync|pull updates)\s*$",
    re.IGNORECASE)

CURRENT_CFG = None
CHILD = None


def set_config(cfg):
    global CURRENT_CFG
    CURRENT_CFG = cfg


def get_config():
    global CURRENT_CFG
    if CURRENT_CFG is None:
        CURRENT_CFG = Config()
    return CURRENT_CFG


def log(event, cfg=None, **kw):
    c = cfg or CURRENT_CFG or get_config()
    rec = {"ts": datetime.now(timezone.utc).isoformat(), "event": event}
    rec.update(kw)
    line = json.dumps(rec, ensure_ascii=False)
    try:
        with open(c.audit_path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


_LOCAL_SESSION = threading.local()
_SSL_CTX = None


def _get_tg_connection(timeout):
    global _SSL_CTX
    if _SSL_CTX is None:
        _SSL_CTX = ssl.create_default_context()
    conn = getattr(_LOCAL_SESSION, "conn", None)
    if conn is None:
        conn = http.client.HTTPSConnection("api.telegram.org", port=443, context=_SSL_CTX, timeout=timeout)
        _LOCAL_SESSION.conn = conn
    return conn


def _close_tg_connection():
    conn = getattr(_LOCAL_SESSION, "conn", None)
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass
        _LOCAL_SESSION.conn = None


def api(token, method, params=None, timeout=30, max_retries=3):
    url = f"https://api.telegram.org/bot{token}/{method}"
    body = urllib.parse.urlencode(params).encode("utf-8") if params else None
    headers = {
        "User-Agent": "RumuzeEdit/1.0",
        "Connection": "keep-alive"
    }
    if body:
        headers["Content-Type"] = "application/x-www-form-urlencoded"

    path = f"/bot{token}/{method}"
    last_exc = None

    for attempt in range(max_retries):
        try:
            conn = _get_tg_connection(timeout)
            conn.request("POST" if body else "GET", path, body=body, headers=headers)
            resp = conn.getresponse()
            raw = resp.read()

            if resp.status >= 400:
                if resp.status in (502, 503, 504) and attempt < max_retries - 1:
                    _close_tg_connection()
                    time.sleep(0.3 * (attempt + 1))
                    continue
                fp = io.BytesIO(raw)
                raise urllib.error.HTTPError(url, resp.status, resp.reason, resp.headers, fp)

            return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError:
            raise
        except Exception as e:
            _close_tg_connection()
            last_exc = e
            if attempt < max_retries - 1:
                time.sleep(0.2 * (attempt + 1))
                continue
            raise urllib.error.URLError(e)
    if last_exc:
        raise urllib.error.URLError(last_exc)


def load_token(cfg=None):
    c = cfg or CURRENT_CFG or get_config()
    return c.bot_token


def load_gate(cfg=None):
    c = cfg or CURRENT_CFG or get_config()
    if not os.path.isfile(c.gate_path):
        return True, "build"
    try:
        with open(c.gate_path, "r", encoding="utf-8") as f:
            g = json.load(f)
        return bool(g.get("enabled", True)), g.get("mode", "build")
    except Exception:
        return True, "build"


def check_day_quota(state, cfg=None):
    c = cfg or CURRENT_CFG or get_config()
    today = date.today().isoformat()
    if state.get("day") != today:
        state["day"] = today
        state["count"] = 0
    return state.get("count", 0) < c.daily_limit


def strip_ansi(s):
    return ANSI_RE.sub("", s or "")


def parse_model(text, default_model=None):
    """`/m provider/model <task>` override."""
    m = MODEL_RE.match(text or "")
    if m:
        return m.group(1), m.group(2)
    return default_model or None, text


def policy_deny(text, cfg=None):
    c = cfg or CURRENT_CFG or get_config()
    policy = SecurityPolicy(c.target_dir, custom_patterns=c.deny_patterns)
    return policy.check_command(text)


def policy_check_prompt(text, cfg=None):
    c = cfg or CURRENT_CFG or get_config()
    policy = SecurityPolicy(c.target_dir, custom_patterns=c.deny_patterns)
    return policy.check_prompt(text)


def is_sync_request(text):
    t = text or ""
    if re.search(r"\bgit\s+", t, re.IGNORECASE):
        return False
    return bool(SYNC_RE.search(t))


def run_sync(cfg=None):
    """Fast-forward sync of current git tracking branch."""
    c = cfg or CURRENT_CFG or get_config()
    target_dir = c.target_dir
    dirty = subprocess.run(
        ["git", "-C", target_dir, "status", "--porcelain"],
        capture_output=True, text=True, timeout=30)
    if dirty.returncode != 0:
        return False, f"Git check failed: {(dirty.stderr or '')[:300]}"
    if dirty.stdout.strip():
        n = len(dirty.stdout.strip().splitlines())
        return False, f"Working tree is dirty ({n} modified files). Commit or stash first."

    branch = subprocess.run(
        ["git", "-C", target_dir, "branch", "--show-current"],
        capture_output=True, text=True, timeout=10).stdout.strip() or "main"

    fetch = subprocess.run(
        ["git", "-C", target_dir, "fetch", "origin", branch],
        capture_output=True, text=True, timeout=120)
    if fetch.returncode != 0:
        return False, f"Git fetch failed: {(fetch.stderr or '')[:300]}"

    pull = subprocess.run(
        ["git", "-C", target_dir, "pull", "--ff-only", "origin", branch],
        capture_output=True, text=True, timeout=180)
    if pull.returncode != 0:
        return False, f"Git pull failed: {(pull.stderr or '')[:400]}"

    top = subprocess.run(
        ["git", "-C", target_dir, "log", "--oneline", "-3"],
        capture_output=True, text=True, timeout=30)
    return True, f"✅ Pulled latest changes (ff-only) on {branch}:\n{top.stdout[:800]}"


def extract_reply(raw):
    texts = []
    counts = {}
    for line in raw.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("{"):
            try:
                ev = json.loads(s)
            except json.JSONDecodeError:
                continue
            t = ev.get("type", "")
            counts[t] = counts.get(t, 0) + 1
            part = ev.get("part", {}) if isinstance(ev.get("part"), dict) else {}
            if t == "text" and isinstance(part.get("text"), str):
                texts.append(part["text"])
            elif isinstance(ev.get("text"), str) and t not in ("step_start",):
                texts.append(ev["text"])
            err = ev.get("error") or ev.get("permission_denied")
            if err:
                texts.append(f"[Error: {err}]")
        elif len(s) < 300 and not s.startswith(("[", "<")):
            texts.append(s)
    clean = strip_ansi("\n".join(texts)).strip()
    return clean, counts


def chunk_send(token, chat_id, text, reply_to=None, chunk_size=3900):
    text = strip_ansi(text) or "(empty reply)"
    parts = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    last_id = None
    for p in parts:
        params = {"chat_id": chat_id, "text": p}
        if reply_to:
            params["reply_to_message_id"] = reply_to
        try:
            r = api(token, "sendMessage", params)
            last_id = r.get("result", {}).get("message_id", last_id)
        except Exception:
            pass
    return last_id


def download_photo(token, file_id):
    os.makedirs(TMP_DIR, exist_ok=True)
    info = api(token, "getFile", {"file_id": file_id})
    fpath = info["result"]["file_path"]
    url = f"https://api.telegram.org/file/bot{token}/{fpath}"
    ext = os.path.splitext(fpath)[1] or ".jpg"
    local = os.path.join(TMP_DIR, f"tg_{int(time.time())}_{file_id[-8:]}{ext}")
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=60) as r, open(local, "wb") as f:
        f.write(r.read())
    return local
