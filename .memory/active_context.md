# Crewloom Bridge — active context

## 2026-10-22: configurable extensions (LOCAL_RUNTIME)
- Repository: `/Volumes/data/crewloom-bridge`; `/Volumes/data/rumuze-edit` is a symlink. Existing branch `main` was left unchanged.
- Owner requested greater flexibility for the bridge's engines and channels.
- Added `cliEngines` profiles (executable, base args, explicit `{prompt}` argument templates) and trusted local JS plugins exporting `register(context)`.
- CLI now loads plugins before resolving channels/engines through registries; dedicated OpenCode startup and existing CLI aliases remain supported.
- Extension configuration persists through global/project saves; project engine profiles override by name, project plugin lists replace global lists, and `extra` merges at the top level.
- Updated README support matrix and extension examples; no bundled Slack/Discord/Webhook adapters were added.
- Verified: build, TypeScript no-emit, all 60 tests (including 6 new extension tests), real CLI startup/failure subprocess tests, and diff whitespace checks.
- Changes are local and uncommitted. No npm publication, push, daemon restart, or production deployment was performed.

## Remaining
- Review/release the local change through the repository's release workflow when authorized.
- Implement and verify specific third-party channel adapters separately; generic CLI wrappers do not provide full OpenCode permission/event parity.
