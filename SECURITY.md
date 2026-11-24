# Security Policy

At **Rumuze**, security and developer privacy are our highest priorities. Because Rumuze Edit executes code and controls AI agents on developer machines, we maintain rigorous sandboxing and defense-in-depth principles.

---

## 🔒 Security Architecture Overview

1. **Loopback Only:** The internal OpenCode server binds strictly to `127.0.0.1` with a randomly generated 192-bit cryptographic password on every launch.
2. **Strict Identity Validation:** Only messages and callback queries matching `allowed_chat_id` are processed. All other users are dropped and logged.
3. **Restricted Token Storage:** Telegram Bot Tokens are stored in files with `0600` permissions and are never printed, echoed, or included in logs. Project config files (`.agentgram.json`, `.rumuze-edit.json`) are gitignored and CI runs a gitleaks scan; prefer the `AGENTGRAM_BOT_TOKEN`, `RUMUZE_EDIT_BOT_TOKEN` or `TGBRIDGE_TOKEN` environment variables over a file. If a token was ever committed or shared, revoke it with @BotFather (`/revoke`) and issue a new one.
4. **Command Execution Blocklist:** Destructive commands (`rm -rf /`, `sudo`, `mkfs`, sensitive SSH key accesses) are systematically intercepted and blocked before execution.
5. **No Auto-Approvals:** Tools requesting permissions require explicit single-use approval (`[Once]`) from the authenticated user.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within Rumuze Edit, please **do NOT report it in public GitHub issues**.

Instead, please send a responsible disclosure report directly to our security team:

📧 **`security@rumuze.com`**

Please include:
* Description of the vulnerability.
* Steps or proof-of-concept to reproduce the issue.
* Potential impact.

We will acknowledge your report within 24 hours, provide regular progress updates, and coordinate a public release with attribution once resolved.
