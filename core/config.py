#!/usr/bin/env python3
"""Rumuze Edit Configuration & Environment Discovery.

Handles multi-tiered configuration loading:
  1. Explicit CLI arguments & flags
  2. Environment variables (RUMUZE_EDIT_* / TGBRIDGE_*)
  3. Project-level configuration (.rumuze-edit.json)
  4. Global user configuration (~/.config/rumuze-edit/config.json)
  5. Safe runtime defaults (current working directory, state in user cache)
"""
import hashlib
import json
import os
import sys

GLOBAL_CONFIG_DIR = os.path.expanduser("~/.config/rumuze-edit")
GLOBAL_CONFIG_FILE = os.path.join(GLOBAL_CONFIG_DIR, "config.json")
GLOBAL_STATE_DIR = os.path.join(GLOBAL_CONFIG_DIR, "state")


def ensure_dirs():
    """Ensure global config and state directories exist with safe permissions."""
    try:
        os.makedirs(GLOBAL_CONFIG_DIR, mode=0o700, exist_ok=True)
        os.makedirs(GLOBAL_STATE_DIR, mode=0o700, exist_ok=True)
    except Exception:
        pass


def get_workspace_id(directory):
    """Generate a stable, human-readable hash id for a given directory path."""
    real_path = os.path.realpath(os.path.abspath(directory))
    digest = hashlib.sha256(real_path.encode("utf-8")).hexdigest()[:12]
    base_name = os.path.basename(real_path) or "root"
    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in base_name)
    return f"{safe_name}_{digest}"


class Config:
    def __init__(self, target_dir=None, config_path=None):
        ensure_dirs()
        self.target_dir = os.path.realpath(os.path.abspath(target_dir or os.getcwd()))
        self.workspace_id = get_workspace_id(self.target_dir)

        # Storage paths
        self.global_config_path = config_path or GLOBAL_CONFIG_FILE
        self.project_config_path = os.path.join(self.target_dir, ".rumuze-edit.json")
        self.state_dir = GLOBAL_STATE_DIR

        # State files scoped by workspace
        self.room_state_path = os.path.join(self.state_dir, f"{self.workspace_id}_room_state.json")
        self.gate_path = os.path.join(self.state_dir, f"{self.workspace_id}_gate.json")
        self.audit_path = os.path.join(GLOBAL_CONFIG_DIR, "audit.log")

        # Config values
        self.bot_token = ""
        self.allowed_chat_id = ""
        self.default_agent = "build"
        self.default_model = ""
        self.favorite_models = [
            "opencode/space-bunny-free",
            "opencode/deepseek-v4.1-flash-free",
            "opencode/glm-5.3-flash-free",
            "opencode/nemotron-3-ultra-free",
            "opencode/mimo-v2.6-flash-free",
            "opencode/longcat-2.5-preview-free"
        ]
        self.daily_limit = 200
        self.run_timeout = 30 * 60
        self.language = "en"
        self.deny_patterns = []
        self.extra = {}

        self.load()

    def load(self):
        """Loads configuration in order: Global -> Project -> Env -> CLI."""
        # 1. Global config (~/.config/rumuze-edit/config.json)
        if os.path.isfile(self.global_config_path):
            try:
                with open(self.global_config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._merge_dict(data)
            except Exception:
                pass

        # Legacy fallback (~/.config/tgbridge/bot_token)
        legacy_token_path = os.path.expanduser("~/.config/tgbridge/bot_token")
        if not self.bot_token and os.path.isfile(legacy_token_path):
            try:
                with open(legacy_token_path, "r", encoding="utf-8") as f:
                    self.bot_token = f.read().strip()
            except Exception:
                pass

        # 2. Project config (.rumuze-edit.json)
        if os.path.isfile(self.project_config_path):
            try:
                with open(self.project_config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._merge_dict(data)
            except Exception:
                pass

        # 3. Environment variables
        env_token = os.environ.get("RUMUZE_EDIT_BOT_TOKEN") or os.environ.get("TGBRIDGE_TOKEN")
        if env_token:
            self.bot_token = env_token.strip()

        env_chat = (os.environ.get("RUMUZE_EDIT_ALLOWED_CHAT_ID") or
                    os.environ.get("TGBRIDGE_ALLOWED_CHAT_ID"))
        if env_chat:
            self.allowed_chat_id = env_chat.strip()

        env_agent = os.environ.get("RUMUZE_EDIT_AGENT") or os.environ.get("TGBRIDGE_AGENT")
        if env_agent:
            self.default_agent = env_agent.strip()

        env_model = os.environ.get("RUMUZE_EDIT_MODEL") or os.environ.get("TGBRIDGE_MODEL")
        if env_model:
            self.default_model = env_model.strip()

        env_favs = os.environ.get("RUMUZE_EDIT_FAVORITE_MODELS") or os.environ.get("TGBRIDGE_FAVORITE_MODELS")
        if env_favs:
            self.favorite_models = [m.strip() for m in env_favs.split(",") if m.strip()]

        env_limit = os.environ.get("RUMUZE_EDIT_DAILY_LIMIT") or os.environ.get("TGBRIDGE_DAILY_LIMIT")
        if env_limit and env_limit.isdigit():
            self.daily_limit = int(env_limit)

        env_timeout = os.environ.get("RUMUZE_EDIT_RUN_TIMEOUT") or os.environ.get("TGBRIDGE_RUN_TIMEOUT")
        if env_timeout and env_timeout.isdigit():
            self.run_timeout = int(env_timeout)

    def _merge_dict(self, data):
        if not isinstance(data, dict):
            return
        if "bot_token" in data and data["bot_token"]:
            self.bot_token = str(data["bot_token"]).strip()
        if "allowed_chat_id" in data and data["allowed_chat_id"]:
            self.allowed_chat_id = str(data["allowed_chat_id"]).strip()
        if "default_agent" in data and data["default_agent"]:
            self.default_agent = str(data["default_agent"]).strip()
        if "default_model" in data:
            self.default_model = str(data["default_model"]).strip()
        if "favorite_models" in data and isinstance(data["favorite_models"], list):
            self.favorite_models = [str(m).strip() for m in data["favorite_models"] if str(m).strip()]
        if "daily_limit" in data and isinstance(data["daily_limit"], int):
            self.daily_limit = data["daily_limit"]
        if "run_timeout" in data and isinstance(data["run_timeout"], int):
            self.run_timeout = data["run_timeout"]
        if "language" in data and data["language"]:
            self.language = str(data["language"]).strip().lower()
        if "deny_patterns" in data and isinstance(data["deny_patterns"], list):
            self.deny_patterns = [str(p) for p in data["deny_patterns"]]
        if "extra" in data and isinstance(data["extra"], dict):
            self.extra.update(data["extra"])

    def save_global(self):
        """Save current configuration to global user config file."""
        ensure_dirs()
        payload = {
            "bot_token": self.bot_token,
            "allowed_chat_id": self.allowed_chat_id,
            "language": self.language,
            "default_agent": self.default_agent,
            "default_model": self.default_model,
            "favorite_models": self.favorite_models,
            "daily_limit": self.daily_limit,
            "run_timeout": self.run_timeout,
            "deny_patterns": self.deny_patterns,
            "extra": self.extra,
        }
        with open(self.global_config_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        try:
            os.chmod(self.global_config_path, 0o600)
        except Exception:
            pass

    def validate(self):
        """Check essential configuration and return list of errors if any."""
        errors = []
        if not self.bot_token:
            errors.append("Telegram Bot Token is missing. Run `rumuze-edit init` or set RUMUZE_EDIT_BOT_TOKEN.")
        if not self.allowed_chat_id:
            errors.append("Allowed Chat ID is missing. Run `rumuze-edit init` to pair your Telegram chat.")
        if not os.path.isdir(self.target_dir):
            errors.append(f"Target directory does not exist: {self.target_dir}")
        return errors
