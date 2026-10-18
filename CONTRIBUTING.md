# Contributing to Rumuze Edit

First off, thank you for considering contributing to **Rumuze Edit**! 🎉

We welcome contributions of all kinds: bug fixes, new features, documentation enhancements, translations, and feedback.

---

## 🏛️ Core Architectural Principles

Before writing code, please keep our core invariants in mind:

1. **Zero External Dependencies for Node.js:**  
   The `bin/rumuze-edit.js` CLI must run with standard `node:*` built-ins. Do NOT add third-party npm packages to `dependencies`. Fast execution and zero bloat are top priorities.
2. **Standard Library Only for Python (`stdlib`):**  
   The `core/` Python daemon must run with standard Python 3.9+ libraries (`urllib`, `json`, `subprocess`, `threading`, etc.). Do NOT require users to `pip install` packages.
3. **Security First:**  
   Never bypass the permission gating system or sandbox policies. Any file edits or shell executions must go through the user's explicit Telegram approval buttons.
4. **Clean Code & Diffs:**  
   Keep pull requests small, focused, and well-tested.

---

## 🛠️ Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rumuze/rumuze-edit.git
   cd rumuze-edit
   ```

2. **Run tests:**
   ```bash
   python3 -m unittest discover -s tests -v
   ```

3. **Test the CLI runner:**
   ```bash
   node bin/rumuze-edit.js --help
   ```

4. **Link CLI globally for local testing:**
   ```bash
   npm link
   rumuze-edit --version
   ```

---

## 🧪 Testing Guidelines

* Every bug fix must include a test proving the issue was resolved.
* Every new feature or security pattern must include unit tests in `tests/`.
* Verify that syntax compilation succeeds on all core files:
  ```bash
  python3 -m py_compile core/*.py
  ```

---

## 🚀 Submitting a Pull Request

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feature/my-cool-feature
   ```
2. Commit your changes using semantic commit messages:
   - `feat: add model alias support`
   - `fix: prevent timeout on slow SSE event streams`
   - `docs: update telegram pairing guide`
3. Push to your fork and submit a Pull Request targeting `main`.
4. Ensure CI tests pass.
