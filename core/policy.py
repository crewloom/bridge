#!/usr/bin/env python3
"""Rumuze Edit Security Policies & Execution Sandboxing.

Protects developer machines from unintended destructive commands, unauthorized
path escapes, sensitive credential leakage, and malicious prompt injections.
"""
import os
import re
from typing import List, Optional, Tuple

try:
    from core.prompt_guard import PromptInjectionGuard, InjectionResult
except ImportError:
    from prompt_guard import PromptInjectionGuard, InjectionResult

DEFAULT_DENY_PATTERNS = [
    r"\brm\s+-(?:rf?|fr?)\s+[/~]",               # rm -rf / or ~
    r"\bsudo\b",                                 # sudo elevation
    r"\bshutdown\b|\breboot\b",                  # system control
    r"\bmkfs\b|\bfdisk\b|\bdd\s+if=",            # disk formatting/overwriting
    r"\bchmod\s+-(?:R\s+)?777\s+[/~]",           # dangerous recursive root/home permissions
    r"\bcurl\b.*\|\s*(?:ba)?sh\b",               # piping untrusted remote scripts to shell
    r"\bwget\b.*\|\s*(?:ba)?sh\b",
    r"\b(?:id_rsa|id_ed25519|\.ppk|\.pem)\b",   # private ssh keys
    r"\.env(?:\.(?:production|prod))?\b",       # production secrets
    r"\bgit\s+(?:push\s+--force|reset\s+--hard)\b", # destructive git history overwriting
]


def normalize_path(path):
    return os.path.realpath(os.path.abspath(path))


def is_path_safe(path, target_dir):
    """Ensure path is within the allowed target directory boundaries."""
    if not path:
        return True
    try:
        real_target = normalize_path(target_dir)
        real_path = normalize_path(path)
        return real_path.startswith(real_target)
    except Exception:
        return False


class SecurityPolicy:
    def __init__(self, target_dir, custom_patterns=None):
        self.target_dir = normalize_path(target_dir)
        self.deny_patterns = list(DEFAULT_DENY_PATTERNS)
        if custom_patterns:
            self.deny_patterns.extend(custom_patterns)
        self._compiled = [re.compile(pat, re.IGNORECASE) for pat in self.deny_patterns]
        self.prompt_guard = PromptInjectionGuard()

    def check_command(self, command_str):
        """Check if command matches any forbidden patterns. Returns list of matched patterns."""
        if not command_str:
            return []
        hits = []
        for pat_str, pat_re in zip(self.deny_patterns, self._compiled):
            if pat_re.search(command_str):
                hits.append(pat_str)
        return hits

    def check_file_path(self, file_path):
        """Verify file operations remain within the project scope."""
        if not file_path:
            return True, "ok"
        # If relative path, join with target_dir
        if not os.path.isabs(file_path):
            file_path = os.path.join(self.target_dir, file_path)
        if not is_path_safe(file_path, self.target_dir):
            return False, f"Path escape attempt blocked: {file_path} is outside {self.target_dir}"
        return True, "ok"

    def check_prompt(self, text: str) -> Tuple[bool, str, float]:
        """Check text for prompt injection, jailbreaks, and delimiter escapes.

        Returns: (is_blocked: bool, reason: str, confidence: float)
        """
        result = self.prompt_guard.detect(text)
        return result.blocked, result.reason, result.confidence

    def sanitize_prompt(self, text: str) -> str:
        """Sanitize text by stripping zero-width characters and normalizing Unicode."""
        return self.prompt_guard.sanitize_text(text)

    def quarantine_untrusted_data(self, text: str, limit: int = 4000) -> Tuple[str, str]:
        """Isolate untrusted reports, logs, and external texts inside a secured envelope."""
        return self.prompt_guard.quarantine(text, limit=limit)
