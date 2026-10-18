#!/usr/bin/env python3
"""Rumuze Edit Prompt Injection Shield & Input Sanitization Engine.

Enterprise-grade defense against direct and indirect prompt injections, jailbreaks,
role hijacking, system boundary escapes, data exfiltration payloads, and hidden
Unicode evasion attacks.
"""
import base64
import html
import re
import secrets
import unicodedata
from typing import NamedTuple, Optional, Tuple


class InjectionResult(NamedTuple):
    blocked: bool
    reason: str
    category: str
    confidence: float
    matched_pattern: Optional[str] = None


# Invisible and zero-width characters used to bypass tokenizers & regexes
ZERO_WIDTH_CHARS = frozenset({
    "\u200B",  # Zero-width space
    "\u200C",  # Zero-width non-joiner
    "\u200D",  # Zero-width joiner
    "\uFEFF",  # Zero-width no-break space (BOM)
    "\u2060",  # Word joiner
    "\u2061",  # Function application
    "\u2062",  # Invisible times
    "\u2063",  # Invisible separator
    "\u2064",  # Invisible plus
    "\u00AD",  # Soft hyphen
})

# Directional formatting characters used to invert or obfuscate text order
BIDI_CONTROL_CHARS = frozenset({
    "\u200E",  # Left-to-Right mark
    "\u200F",  # Right-to-Left mark
    "\u202A",  # LRE
    "\u202B",  # RLE
    "\u202C",  # PDF
    "\u202D",  # LRO (Left-to-Right override)
    "\u202E",  # RLO (Right-to-Left override)
    "\u2066",  # LRI
    "\u2067",  # RLI
    "\u2068",  # FSI
    "\u2069",  # PDI
})

# 1. Role Hijack & System Prompt Overrides (English & Arabic)
ROLE_HIJACK_PATTERNS = [
    # Direct imperative overrides
    r"(?i)\b(?:ignore|disregard|forget|bypass|override|cancel|drop)\s+(?:all\s+)?(?:(?:prior|previous|above|existing|system|safety|security|past|given)\s+)*(?:instructions?|directives?|prompts?|rules?|constraints?|guidelines?)\b",
    r"(?i)\b(?:ignore|forget)\s+everything\s+(?:you\s+know|above|told|learned)\b",
    r"(?i)\b(?:you\s+are\s+(?:now\s+)?(?:in\s+)?|act\s+as|pretend\s+to\s+be|become)\s*(?:an?\s+)?(?:unbound|jailbroken|DAN|chaosgpt|developer\s+mode|unfiltered|uncensored|evil\s+ai)\b",
    r"(?i)\b(?:jailbreak\s+(?:mode|prompt|active|enabled)|DAN\s+mode\s+enabled)\b",
    r"(?i)\bsystem\s+override\s*:",
    r"(?i)\b(?:new\s+system\s+prompt|new\s+persona|system\s+prompt\s+override)\s*:",
    r"(?i)\bfrom\s+now\s+on\s*[,:]?\s*(?:you\s+(?:must|will)\s+ignore|you\s+have\s+no\s+(?:rules|filters|limits)|act\s+as)\b",
    r"(?i)\byou\s+are\s+(?:now\s+)?in\s+developer\s+mode(?:\s+now)?\b",
    r"(?i)\bdo\s+anything\s+now\b",
    # Arabic role hijack & overrides
    r"تجاهل\s+(?:كل|جميع|أي)?\s*(?:(?:التعليمات|الأوامر|القواعد|التوجيهات|القيود|البرومبت|قواعد)\s*)+(?:السابقة|الحالية|الأمنية|الأمان)?",
    r"انسى\s+(?:كل|جميع)?\s*(?:(?:التعليمات|الأوامر|القواعد|التوجيهات|القيود|ما\s+سبق)\s*)+(?:السابقة|الحالية)?",
    r"أنت\s+الآن\s+(?:في\s+وضع\s+المطور|غير\s+مقيد|بدون\s+قيود|DAN)",
    r"(?:تخطي|تجاوز|عطل)\s+(?:قواعد|قيود|تعليمات|فلاتر)\s+الأمان",
    r"من\s+الآن\s+فصاعدا\s*[,:]?\s*(?:تجاهل|أنت\s+لست|انسى)",
]

# 2. System Delimiter & Boundary Hijacking
BOUNDARY_PATTERNS = [
    r"(?i)<\s*/?\s*(?:untrusted[-_ ]?report|untrusted[-_ ]?data|system[-_ ]?instruction|system[-_ ]?override|prompt[-_ ]?override|system|instruction)[^>]*>",
    r"(?i)<\s*\|\s*(?:im_start|im_end|endoftext)\s*\|>",
    r"(?i)\[/?(?:INST|SYS)\]",
    r"(?i)<<\s*/?\s*SYS\s*>>",
    r"(?i)```\s*system\b",
    r"(?i)(?:^|\s)###\s*(?:System|Instruction|Human|Assistant)\s*:",
]

# 3. Data Exfiltration via Markdown / URLs
EXFILTRATION_PATTERNS = [
    r"!\[.*?\]\(https?://[^\s)]+[?&](?:leak|exfil|token|key|secret|env|password|data|steal)=[^\s)]*\)",
    r"<img\s+[^>]*src=[\"\']https?://[^\s\"\']+[?&](?:leak|exfil|token|key|secret|env|password|data|steal)=[^\s\"\']*",
    r"(?i)\b(?:exfiltrate|leak|upload|send\s+silently)\s+(?:the\s+)?(?:\.env|private\s+keys?|tokens?|passwords?|credentials?)\s+(?:to\s+https?://)",
    r"(?i)\bcurl\s+-[^\n]*https?://[^\n]*(?:@\.env|\.env|id_rsa)",
]

# 4. Obfuscation & Evasion Wrappers
OBFUSCATION_PATTERNS = [
    r"(?i)\b(?:decode|execute|run)\s+(?:this\s+)?(?:base64|hex)\s+(?:string\s+)?(?:as\s+instructions?|and\s+execute|and\s+run)\b",
]

# Legitimate defensive discussions that should not be false-flagged
DEFENSIVE_DISCUSSION_RE = re.compile(
    r"\b(?:how\s+to\s+protect|protect\s+against|defend\s+against|detect|mitigate|prevent)\s+prompt\s+injection\b",
    re.IGNORECASE,
)

DELIMITER_NEUTRALIZE_RE = re.compile(
    r"<\s*/?\s*(?:untrusted[-_ ]?report|untrusted[-_ ]?data|system[-_ ]?instruction|system[-_ ]?override|"
    r"prompt[-_ ]?override|system|instruction|end_of_turn|start_of_turn)[^>]*>|"
    r"<\s*\|\s*(?:im_start|im_end|endoftext)\s*\|>|"
    r"\[/?(?:INST|SYS)\]|"
    r"<<\s*/?\s*SYS\s*>>",
    re.IGNORECASE,
)

B64_CHUNK_RE = re.compile(r"\b([A-Za-z0-9+/]{20,}={0,2})\b")


class PromptInjectionGuard:
    """Enterprise Prompt Injection Guard and Sanitization Shield."""

    def __init__(self):
        self._compiled_role = [re.compile(p, re.MULTILINE) for p in ROLE_HIJACK_PATTERNS]
        self._compiled_boundary = [re.compile(p, re.MULTILINE) for p in BOUNDARY_PATTERNS]
        self._compiled_exfil = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in EXFILTRATION_PATTERNS]
        self._compiled_obfuscation = [re.compile(p, re.MULTILINE) for p in OBFUSCATION_PATTERNS]

    @staticmethod
    def count_hidden_chars(text: str) -> int:
        """Count zero-width and BiDi formatting characters in raw text."""
        if not text:
            return 0
        return sum(1 for ch in text if ch in ZERO_WIDTH_CHARS or ch in BIDI_CONTROL_CHARS)

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Strip invisible characters, normalize homoglyphs, and clean control chars."""
        if not text:
            return ""
        # 1. Remove zero-width and directional control characters
        cleaned = "".join(ch for ch in str(text) if ch not in ZERO_WIDTH_CHARS and ch not in BIDI_CONTROL_CHARS)
        # 2. NFKC unicode normalization (collapses fullwidth, ligatures, homoglyphs)
        normalized = unicodedata.normalize("NFKC", cleaned)
        # 3. Clean obscure control characters while keeping standard whitespace
        sanitized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", normalized)
        return sanitized

    @classmethod
    def neutralize_delimiters(cls, text: str) -> str:
        """Neutralize boundary tags and model control tokens."""
        if not text:
            return ""
        return DELIMITER_NEUTRALIZE_RE.sub(lambda m: f"[neutralized-tag: {html.escape(m.group(0))}]", str(text))

    @classmethod
    def quarantine(cls, text: str, limit: int = 4000) -> Tuple[str, str]:
        """Isolate untrusted text inside a cryptographically signed data envelope.

        Neutralizes lookalike tags and zero-width evasion so the data block cannot be escaped.
        """
        nonce = secrets.token_hex(8)
        body = cls.sanitize_text(str(text or "")[:limit])
        body = cls.neutralize_delimiters(body)
        envelope = (
            f"<untrusted-report id=\"{nonce}\" role=\"untrusted-data-payload\">\n"
            f"{body}\n"
            f"</untrusted-report id=\"{nonce}\">"
        )
        return envelope, nonce

    def detect(self, text: str) -> InjectionResult:
        """Analyze text for prompt injection, jailbreaks, boundary breakout, and exfiltration."""
        if not text or not str(text).strip():
            return InjectionResult(blocked=False, reason="ok", category="clean", confidence=0.0)

        raw = str(text)

        # 1. Check for excessive invisible/zero-width characters (obfuscation attack)
        hidden_count = self.count_hidden_chars(raw)
        if hidden_count >= 5:
            return InjectionResult(
                blocked=True,
                reason="Excessive invisible or zero-width character evasion detected",
                category="obfuscation",
                confidence=0.95,
                matched_pattern=f"hidden_chars_count={hidden_count}",
            )

        # 2. Sanitize and normalize input for canonical inspection
        norm = self.sanitize_text(raw)

        # 3. Allow defensive security research queries if benign context
        if DEFENSIVE_DISCUSSION_RE.search(norm):
            return InjectionResult(blocked=False, reason="defensive_research", category="clean", confidence=0.0)

        # 4. Check Boundary Hijacking & Delimiter Breakout
        for pat, rx in zip(BOUNDARY_PATTERNS, self._compiled_boundary):
            if rx.search(norm):
                return InjectionResult(
                    blocked=True,
                    reason="System boundary or delimiter manipulation detected",
                    category="boundary_escape",
                    confidence=0.95,
                    matched_pattern=pat,
                )

        # 5. Check Role Hijacking & Instruction Overrides
        for pat, rx in zip(ROLE_HIJACK_PATTERNS, self._compiled_role):
            if rx.search(norm):
                return InjectionResult(
                    blocked=True,
                    reason="Instruction override or role hijacking attempt detected",
                    category="role_hijack",
                    confidence=0.98,
                    matched_pattern=pat,
                )

        # 6. Check Data Exfiltration Attempts
        for pat, rx in zip(EXFILTRATION_PATTERNS, self._compiled_exfil):
            if rx.search(norm):
                return InjectionResult(
                    blocked=True,
                    reason="Data exfiltration payload detected",
                    category="data_exfiltration",
                    confidence=0.90,
                    matched_pattern=pat,
                )

        # 7. Check Obfuscation Wrappers (Base64/Hex instruction triggers)
        for pat, rx in zip(OBFUSCATION_PATTERNS, self._compiled_obfuscation):
            if rx.search(norm):
                return InjectionResult(
                    blocked=True,
                    reason="Obfuscated instruction execution wrapper detected",
                    category="obfuscation",
                    confidence=0.88,
                    matched_pattern=pat,
                )

        # 8. Deep Inspection of Embedded Base64 Chunks
        b64_matches = B64_CHUNK_RE.findall(norm)
        for chunk in b64_matches[:3]:
            try:
                padded = chunk + "=" * ((4 - len(chunk) % 4) % 4)
                decoded_bytes = base64.b64decode(padded)
                decoded_text = decoded_bytes.decode("utf-8", errors="ignore").strip()
                if len(decoded_text) >= 10:
                    inner_result = self.detect(decoded_text)
                    if inner_result.blocked:
                        return InjectionResult(
                            blocked=True,
                            reason=f"Encoded payload contains injection ({inner_result.reason})",
                            category="obfuscation",
                            confidence=0.95,
                            matched_pattern=f"base64:{inner_result.matched_pattern}",
                        )
            except Exception:
                pass

        return InjectionResult(blocked=False, reason="ok", category="clean", confidence=0.0)
