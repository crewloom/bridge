# ⚡ AgentGram

> **Turn your Telegram into a live AI Agent Control Room & Ops Mission Control**  
> Control [OpenCode](https://opencode.ai), AI coding agents, and terminal operations on your machine or VPS directly from your phone via Telegram.

[![npm version](https://img.shields.io/npm/v/agentgram.svg?style=flat-square&logo=npm&color=CB3837)](https://www.npmjs.com/package/agentgram)
[![npm package size](https://img.shields.io/badge/package%20size-52%20kB-22c55e?style=flat-square&logo=npm)](https://www.npmjs.com/package/agentgram)
[![dependencies](https://img.shields.io/badge/dependencies-0%20(zero)-success.svg?style=flat-square)](https://www.npmjs.com/package/agentgram)
[![CI Matrix](https://img.shields.io/github/actions/workflow/status/rumuze/agentgram/ci.yml?branch=main&label=CI%20matrix&style=flat-square&logo=githubactions&logoColor=white)](https://github.com/rumuze/agentgram/actions)
[![GitHub release](https://img.shields.io/github/v/release/rumuze/agentgram?style=flat-square&color=3b82f6&logo=github)](https://github.com/rumuze/agentgram/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%20..%2026-green.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

<p align="center">
  <a href="https://www.npmjs.com/package/agentgram"><b>📦 View on NPM</b></a> •
  <a href="https://github.com/rumuze/agentgram/releases/latest"><b>🏷️ Releases</b></a> •
  <a href="#-quick-start"><b>🚀 Quick Start</b></a> •
  <a href="#-telegram-experience"><b>📱 Features</b></a> •
  <a href="#-frequently-asked-questions-faq"><b>❓ FAQ</b></a>
</p>

---

## 🌟 Why AgentGram?

Developers shouldn't be chained to their desks waiting for an AI agent to finish modifying code, executing test suites, or running remote deployment scripts.

**AgentGram** turns your phone into a mobile developer cockpit:
* 📲 **Live Streaming Mission Control:** Real-time progress updates inside a dynamic message (updates smoothly every ~2.5s with tools, steps, and output tails).
* 🔘 **One-Tap Permission Buttons:** Approve or reject file edits and commands with `[ ✅ Allow Once ]`, `[ ♾️ Always Allow ]`, or `[ ⛔ Reject ]`.
* ⚡ **Auto Mode:** Enable full autonomy for routine tasks; safety policies automatically intercept destructive commands.
* 🛡️ **Enterprise Prompt Injection Shield:** Multi-layer defense against role hijacking, jailbreaks, delimiter evasion, and malicious prompt injections.
* 🔌 **Extensible Channels & Engines:** Built-in **Telegram** and **Console** channels, a dedicated **OpenCode** adapter, and generic CLI wrappers for **Claude Code**, **Aider**, and **Shell**. Configure additional CLI engines or load your own local channel/engine plugin without rebuilding the bridge. Slack, Discord, and Webhooks require an additional adapter.
* 🌐 **Multi-Machine & Server Ops:** Run operations, SSH jump-host connections, deploy scripts (`pinpoint-go`), and remote log diagnostics directly from your phone.
* ⚡ **Zero Runtime Dependencies:** 100% Pure Node.js & TypeScript with zero external runtime dependencies. Ultra-lightweight and blazingly fast!

---

## 🏗️ Architecture

```mermaid
flowchart LR
    User["📱 Telegram / Console / Webhook"] -->|IChannelAdapter| ControlRoom["⚡ AgentGram Control Room"]
    ControlRoom -->|IAgentEngine| Engine["🤖 OpenCode / Claude Code / Shell"]
    Engine -->|Sandboxed Execution| Project["📂 Project Files & Git"]
    ControlRoom -->|Authorized Ops / SSH| Remote["🖥️ Remote VPS / Server"]
```

### The Live Experience

```text
┌────────────────────────────────────────────────────────┐
│ ⚡ AgentGram · Live Mission Control                    │
│                                                        │
│ Agent: 🧠 build (OpenCode) | Mode: 🔒 build           │
│ Channel: 📡 Telegram Bot                               │
│ Status: 🟢 Executing bash (npm test)                   │
│ Step: 4/12 · ⏳ 14s · 📝 3 files modified              │
│                                                        │
│ ────────────────────────────────────────────────────── │
│ > PASS tests/auth.test.js                              │
│ > PASS tests/api.test.js                               │
│ > All 14 tests passing                                 │
│ ────────────────────────────────────────────────────── │
│                                                        │
│ [ ⏹ Stop ]      [ 📤 Diff ]      [ 🔒 Mode ]           │
│ [ 📁 Projects ]                  [ 🌐 Language ]       │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Instant Run via NPX (Zero Install)

Run immediately in any repository without installing globally:

```bash
# Launch interactive pairing wizard (takes 30 seconds)
npx agentgram init

# Start the live control room
npx agentgram start

# Or run in background as a detached daemon
npx agentgram start --daemon
```

### 2. Global Installation

Install globally across your development machine or VPS:

```bash
npm install -g agentgram

# Initialize pairing in any repo
agentgram init

# Start control room
agentgram start
```

### 3. Running as a Persistent System Service (Auto-Start on Boot)

Want AgentGram to run 24/7 on your machine or cloud VPS?

```bash
# On macOS (installs to ~/Library/LaunchAgents/com.agentgram.plist)
# On Linux (installs to ~/.config/systemd/user/agentgram.service)
npx agentgram service install

# Check service status
npx agentgram service status
```

### 4. Via Docker Compose (Headless Cloud VPS)

Run 24/7 on any cloud server or VPS:

```bash
git clone https://github.com/rumuze/agentgram.git && cd agentgram
TG_BOT_TOKEN="your_bot_token" TG_ALLOWED_CHAT_ID="your_chat_id" docker compose up -d
```

---

## 🎮 Telegram Controls & Commands

Once connected, your Telegram chat becomes your project mission control:

| Command / Control | Description |
|---|---|
| **Live Status Card** | Edits automatically every ~2.5s showing active tools, steps, and output tails |
| **Interactive Approvals** | Commands requiring approval render inline buttons: `[ ✅ Allow Once ]`, `[ ♾️ Always Allow ]`, `[ ⛔ Reject ]` |
| **Interactive Questions** | Agent questions appear as clickable buttons (single-choice, multi-select, or custom text) |
| **Fast Interrupt** | Type `stop`, `وقف`, or `إيقاف` at any time to immediately cancel execution |
| **Presence Check** | Ask `هل انت شغال؟`, `الحالة`, or `status` to get an instant live status report |
| **Instant Mentions** | Mention `@agent` or `@model` in any message to dynamically switch personas |
| `/mode` | Switch execution mode: `read` (read-only diagnosis), `build` (interactive approval), or `auto` (autonomous execution) |
| `/agents` | Switch active agent persona on the fly (e.g. `build`, `delegate`, `code-review`) |
| `/models` | Switch LLM provider and model dynamically |
| `/diff` | Get a condensed git diff summary of unstaged and staged changes |
| `/usage` | View token usage, quota renewal countdowns, and rate limits |
| `/stop` | Immediately interrupt and terminate the running agent process |
| `/lang` | Toggle between English and Arabic UI |

---

## 🔌 Extension Configuration

The following support levels describe the adapters included in this package:

| Integration | Included support |
|---|---|
| Telegram / Console | Built-in channel adapters |
| OpenCode | Dedicated engine adapter |
| Claude Code / Aider / Shell | Generic CLI execution, output, and cancellation; not full OpenCode event/permission parity |
| Additional CLI tools | Configurable executable and argument templates |
| Additional channels / engines | Trusted local JavaScript plugin implementing the exported adapter contracts |
| Slack / Discord / Webhooks | No bundled adapter; supply your own plugin |

### Configure a CLI engine without changing bridge code

Add an engine profile to your project's `.agentgram.json`:

```json
{
  "channel": "console",
  "engine": "my-agent",
  "cliEngines": {
    "my-agent": {
      "command": "my-agent-cli",
      "args": ["--quiet"],
      "promptArgs": ["run", "--prompt", "{prompt}"]
    }
  }
}
```

Replace `my-agent-cli` and its arguments with your installed tool's actual executable and non-interactive options. `{prompt}` is replaced inside each argument and passed directly to the executable without shell interpolation. Profiles can also customize the built-in CLI wrappers; `opencode` remains reserved for the dedicated adapter. Choose another profile with `agentgram start --engine my-agent`.

### Load a local adapter plugin

Create `bridge-plugin.mjs` in your project. This minimal working example registers a named Console channel:

```js
export function register({ channels, engines, config }) {
  channels.register('team-console', cfg => channels.get('console', cfg));
  // Register your own IChannelAdapter or IAgentEngine factory here.
  // Factories receive the resolved config, including config.extra.
}
```

Then add `"plugins": ["./bridge-plugin.mjs"]` and `"channel": "team-console"` to `.agentgram.json`. Plugins are loaded before adapters are resolved. Paths are relative to the project directory; `.js`, `.mjs`, and `.cjs` files are supported. A plugin exports `register(context)` (which may be async), or a default object with that method. The package exports `BridgePluginContext`, `IChannelAdapter`, and `IAgentEngine` for typed plugin authors.

These plugins execute local code with the bridge's privileges: only enable plugins and project configuration you trust. They are not sandboxed. The bridge does not download or install plugins. A missing or invalid plugin stops startup rather than silently falling back.

Global CLI profiles are merged with project profiles by name, with project settings taking precedence. A project's `plugins` list replaces the global list. `extra` settings merge at the top level and survive save/reload. The default Telegram/OpenCode setup requires no extension configuration.

## 🔒 Security Policies & Prompt Injection Checks

The bridge includes application-level policy checks. These are not an operating-system sandbox or a guarantee against prompt injection:

1. **🛡️ Advanced Prompt Injection Defense:**
   - **Role Hijacking & Jailbreak Defense:** Detects and blocks imperative prompt overrides ("ignore previous instructions", "disregard prior directives", "DAN mode", "system override:", and Arabic variants "تجاهل التعليمات السابقة", "أنت الآن في وضع المطور").
   - **System Boundary Isolation:** Blocks delimiter evasion and token spoofing (`</untrusted-report>`, `<system>`, `<|im_start|>`, `[INST] <<SYS>>`).
   - **Unicode & Obfuscation Stripping:** Normalizes Unicode (NFKC) and strips zero-width/invisible evasion characters (`\u200B`, `\u200C`, `\uFEFF`, `\u2060`) and BiDi overrides (`\u202E`). Recursively inspects base64 payloads.
   - **Data Exfiltration Defense:** Blocks markdown image (`![exfil](https://.../?token=)`) and HTML link exfiltration vectors.
2. **🔐 Cryptographic Quarantine Envelopes:**
   - External error logs, server alerts, and untrusted inputs are wrapped inside isolated blocks (`<untrusted-report id="...">`) signed with cryptographically random nonces (`secrets.token_hex(8)`).
3. **🚫 Execution Blocklist:**
   - Irreversible destructive host wiping is blocked by default (`rm -rf /`, `rm -rf ~`, `mkfs`, `shutdown`, `dd if=`).
4. **👤 Single Chat ID Lock:** Every message and inline callback query validates `chat.id == ALLOWED_CHAT_ID`. Unknown users are ignored.
5. **🔒 Loopback & Token Isolation:** OpenCode server runs strictly on `127.0.0.1` with a per-session randomized high-entropy password; bot token is saved with strict `0600` file permissions.

---

## 🛠️ CLI Reference

```text
agentgram <command> [options]
npx agentgram <command> [options]

COMMANDS:
  init               Interactive setup wizard & automatic Telegram pairing
  start              Start the control room for the current project
  stop               Stop running background daemon
  status             Display current daemon, server, and workspace status
  service install    Install as persistent background service (macOS launchd / Linux systemd)
  service uninstall  Remove persistent background service
  service status     Check persistent background service status
  help               Display help message

OPTIONS:
  --dir <path>       Set target project directory (defaults to current working directory)
  --daemon, -d       Run in background as a detached process
  --channel <name>   Communication channel: telegram (default), console
  --engine <name>    AI coding engine: opencode (default), shell, claude, aider
  --version, -v      Show version number
```

---

## 🤝 Contributing & Community

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

Developed with ❤️ by **[Rumuze](https://rumuze.com)**.
