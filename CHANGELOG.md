# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Configurable CLI engine profiles with literal prompt arguments and trusted local channel/engine plugins, loaded before adapter resolution without rebuilding the bridge.
- Extension configuration persistence, global/project profile merging, and explicit startup errors for malformed configuration.

### Changed
- Resolve non-OpenCode engines and all channels through the adapter registries so CLI use supports extensions consistently.
- Document actual adapter support and distinguish CLI wrappers and application-level policy checks from full engine integration and operating-system sandboxing.

---

## [2.0.11] - 2026-10-20

### Fixed
- **Permission ID Extraction**: Resolved bug where OpenCode SSE wrapper event ID (`evt_...`) was prioritized over actual permission ID (`per_...`), causing OpenCode HTTP 400 Bad Request on replies.
- **Instant UI Dismissal**: Inline permission keyboards are immediately dismissed upon button click (`replyMarkup: { rows: [] }`) with persistent confirmation badges, preventing duplicate taps or hanging buttons.
- **Telegram 409 Conflict Throttling**: Added intelligent backoff and log throttling for concurrent instance conflicts to prevent log disk filling.
- **Telegram 429 Rate-Limit Compliance**: Automatic handling of `retry_after` parameters with exponential backoff on burst traffic.
- **Message Overflow Protection**: Added `splitTextSafely` for automatic message chunking (> 4000 chars) and clean truncation on edited status cards.

### Added
- **Batch Permission Auto-Resolution**: When "Always Allow" is selected, any existing queued permissions in OpenCode are automatically resolved in batch.
- **Resilient SSE Connection Pool**: Automatic transparent reconnection on connection drops, timeouts, or server restarts with exponential backoff.
- **Unit Test Suite Expansion**: Added dedicated tests for OpenCode SSE event priority normalization and Telegram text splitting.

---

## [2.0.10] - 2026-10-20

### Added
- **Async Prompting Protocol**: Migrated to OpenCode `POST /session/{id}/prompt_async` with structured parts array payload.
- **Global SSE Endpoint**: Switched to `/global/event?directory=...` for unified event streaming across sessions.
- **Interactive Fast Interrupts**: Added instant one-word controls (`وقف`, `stop`, `إيقاف`) and natural language presence queries (`هل انت شغال؟`, `الحالة`).
- **Free Model Support**: Configured default fallback model to `opencode/deepseek-v4.1-flash-free`.

---

## [2.0.0] - 2026-10-19

### Added
- **Full TypeScript & Node.js 18+ Rewrite**: Completely migrated codebase from Python to 100% pure TypeScript.
- **Zero Runtime Dependencies**: Completely standalone runtime using native Node.js standard library (`https`, `crypto`, `child_process`, `events`).
- **Hexagonal Architecture**: Pluggable Channel Abstraction (`IChannelAdapter`) and Agent Engine Abstraction (`IAgentEngine`).
- **Native OS Daemon Integration**: Auto-generating and controlling macOS `launchd` LaunchAgents and Linux `systemd` user units.
- **Dual Package CLI**: Single unified binary supporting `agentgram`, `ag`, and backward-compatible `rumuze-edit`.

---

## [1.0.7] - 2026-10-18

### Added
- **Expanded Operations & Multi-Machine Permissions**: Fully authorized SSH jump-host connections, ops deployment scripts (`pinpoint-go`, `release-and-push.sh`), server log inspections, and multi-machine coordination.
- **Allowed Scopes & Path Boundaries**: Added `allowed_paths` support in `SecurityPolicy` and `is_path_safe` to cleanly support external key paths, certificates, and multi-directory setups without false path-escape alerts.
- **Empowered System Prompt**: Removed artificial LLM refusal prompts regarding SSH and ops; updated system prompt to explicitly empower server ops when requested or approved by the owner.

### Changed
- **Streamlined Security Policy**: Refined `DEFAULT_DENY_PATTERNS` to target irreversible destructive operations (`rm -rf /`, `mkfs`, `dd if=`, `shutdown`, `chmod -R 777`) while allowing daily developer operations like SSH keys, config inspections, and ops commands.

---

## [1.0.4] - 2026-10-18

### Fixed
- **HTML Entity Parsing**: Escaped `<task>` tag in `help_title` which caused Telegram Bot API to reject messages with `HTTP 400 Bad Request`.
- **400 Entity Fallback**: Added automatic plain-text fallback in `send()` and `edit()` so unclosed or lookalike tags seamlessly downgrade to plain text without failing user actions.

---

## [1.0.3] - 2026-10-18

### Added
- **Resilient HTTPS Keep-Alive Connection Pool**: Replaced one-shot `urllib` requests with persistent thread-local `HTTPSConnection` pooling.
- **8x Performance Speedup**: Reduced sequential Telegram API latency by up to 800%.
- **Automatic Retries**: Added transparent 3x retries with exponential backoff on transient network drops (`[Errno 54] Connection reset by peer`, socket timeouts, and `502 Bad Gateway`).

---

## [1.0.2] - 2026-10-18

### Fixed
- **Python Compatibility**: Fixed PEP 701 nested double quote syntax in `OpenCode._url()` for backward compatibility with Python 3.9, 3.10, and 3.11.
- **Full CI Matrix**: All 24 matrix jobs across Ubuntu and macOS passing with 100% green status.

### Added
- Dedicated unit test suite for `OpenCode` client URL builder and character encoding in `tests/test_client.py`.

---

## [1.0.1] - 2026-10-18

### Added
- Multi-language localization module (`core/i18n.py`) with English as the default international language and complete Arabic translations.
- Interactive `/lang` command and inline language selector keyboard.

---

## [1.0.0] - 2026-10-18

### Added
- Initial open-source release of **Rumuze Edit**.
- Zero-dependency Node.js CLI runner (`bin/rumuze-edit.js`) with interactive auto-pairing wizard (`init`).
- Zero-trust security policy engine (`core/policy.py`) blocking destructive shell commands and sensitive credential leakage.
- Live streaming mission control card via Server-Sent Events (SSE).
- Persistent system service manager (`core/service_manager.py`) supporting macOS `launchd` and Linux `systemd`.
- Laravel auto-discovery integration (`src/RumuzeEditServiceProvider.php` and `php artisan rumuze:edit`).
