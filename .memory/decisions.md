# Crewloom Bridge — decisions

## 2026-10-22: configuration and local plugin extension points
- Extend the existing channel/engine contracts rather than rewrite the control room or advertise unimplemented integrations.
- Configurable CLI prompts are passed as literal argv values using `shell: false`; replacement uses a function so dollar replacement tokens remain literal. Existing explicit Shell mode remains unchanged.
- Local plugins receive the host registries explicitly to avoid duplicate registry instances when a plugin imports a separate package copy.
- Plugins execute trusted local code with host privileges; no automatic download, installation, or sandbox claim. Malformed extension config or plugin load failures stop startup.
- Keep OpenCode reserved for the dedicated startup path; configurable profiles can customize other CLI engines.
- Preserve backward compatibility for existing Telegram, Console, OpenCode, and shell aliases. Documentation distinguishes bundled adapters, generic CLI wrappers, and integrations requiring custom plugins.
- Integration discovery reports registrations only, never claims that executables are installed or services reachable, and does not include credentials in its output.
