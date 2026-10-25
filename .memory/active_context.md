# Crewloom Bridge — active context

## 2026-10-22: configurable extensions (LOCAL_RUNTIME)
- Repository resolves to `/Volumes/data/projects/crewloom/bridge`; `/Volumes/data/rumuze-edit` is a compatibility symlink. Existing branch `main` was left unchanged.
- Owner requested greater flexibility for the bridge's engines and channels.
- Added `cliEngines` profiles (executable, base args, explicit `{prompt}` argument templates) and trusted local JS plugins exporting `register(context)`.
- CLI now loads plugins before resolving channels/engines through registries; dedicated OpenCode startup and existing CLI aliases remain supported.
- Extension configuration persists through global/project saves; project engine profiles override by name, project plugin lists replace global lists, and `extra` merges at the top level.
- Updated README support matrix and extension examples; no bundled Slack/Discord/Webhook adapters were added.
- Added `integrations [--json]` to discover built-in, configured, and plugin adapters without launching engines or requiring Telegram pairing. Registry `has`/`list` optionally include configured profiles.
- Verified: build, TypeScript no-emit, all 61 tests (including 7 new extension tests), real CLI startup/failure and discovery subprocess tests, diff whitespace checks, and package dry-run (compiled JS/types plus README/license; no test config or memory included).
- During this session, another actor recorded the base extension changes in `f7826de` together with a release script. Preserve that commit; discovery follow-up changes remain uncommitted. This session did not run npm publication, git commit/push, a daemon restart, or production deployment.

## Remaining
- Review/release the local change through the repository's release workflow when authorized.
- Implement and verify specific third-party channel adapters separately; generic CLI wrappers do not provide full OpenCode permission/event parity.
