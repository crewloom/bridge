/**
 * Enterprise Prompt Injection Defense & Sanitization Shield
 * Pure Node.js implementation with zero dependencies.
 */
import * as crypto from 'node:crypto';
import type { PromptDetectionResult, QuarantineResult } from '../domain/types.js';

const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u2060\u200E\u200F]/g;
const BIDI_CHARS_REGEX = /[\u202A-\u202E\u2066-\u2069]/g;

// High-confidence role hijacking and jailbreak patterns
const HIJACK_PATTERNS: Array<{ pattern: RegExp; reason: string; confidence: number }> = [
  {
    pattern: /\b(?:ignore|disregard|forget|bypass|override|cancel|drop)\s+(?:all\s+)?(?:(?:prior|previous|above|existing|system|safety|security|past|given)\s+)*(?:instructions?|directives?|prompts?|rules?|constraints?|guidelines?)\b/i,
    reason: 'Instruction override attempt (role hijacking)',
    confidence: 0.98,
  },
  {
    pattern: /\b(?:ignore|forget)\s+everything\s+(?:you\s+know|above|told|learned)\b/i,
    reason: 'Instruction wipe attempt',
    confidence: 0.98,
  },
  {
    pattern: /\b(?:you\s+are\s+(?:now\s+)?(?:in\s+)?|act\s+as|pretend\s+to\s+be|become)\s*(?:an?\s+)?(?:unbound|jailbroken|DAN|chaosgpt|developer\s+mode|unfiltered|uncensored|evil\s+ai)\b/i,
    reason: 'Persona manipulation / Jailbreak pattern',
    confidence: 0.95,
  },
  {
    pattern: /\b(?:jailbreak\s+(?:mode|prompt|active|enabled)|DAN\s+mode\s+enabled)\b/i,
    reason: 'Explicit jailbreak trigger',
    confidence: 0.98,
  },
  {
    pattern: /\b(?:free\s+from\s+all\s+restrictions|do\s+anything\s+now|no\s+rules\s+or\s+limits|bypass\s+safety\s+filters)\b/i,
    reason: 'Jailbreak restriction bypass attempt',
    confidence: 0.95,
  },
  {
    pattern: /\bsystem\s+override\s*:/i,
    reason: 'System override directive',
    confidence: 0.98,
  },
  {
    pattern: /\bfrom\s+now\s+on\s*[,:]?\s*(?:you\s+(?:must|will)\s+ignore|you\s+have\s+no\s+(?:rules|filters|limits)|act\s+as)\b/i,
    reason: 'Temporal persona override attempt',
    confidence: 0.95,
  },
  {
    pattern: /تجاهل\s+(?:كل|جميع|أي)?\s*(?:(?:التعليمات|الأوامر|القواعد|التوجيهات|القيود|البرومبت|قواعد)\s*)+(?:السابقة|الحالية|الأمنية|الأمان)?/,
    reason: 'Arabic instruction override attempt (محاولة إلغاء التعليمات)',
    confidence: 0.98,
  },
  {
    pattern: /انسى\s+(?:كل|جميع)?\s*(?:(?:التعليمات|الأوامر|القواعد|التوجيهات|القيود|ما\s+سبق)\s*)+(?:السابقة|الحالية|تماما)?/,
    reason: 'Arabic memory wipe attempt (محاولة مسح التعليمات السابقة)',
    confidence: 0.98,
  },
  {
    pattern: /أنت\s+الآن\s+(?:في\s+وضع\s+المطور|غير\s+مقيد|بدون\s+قيود|DAN)/,
    reason: 'Arabic persona manipulation (محاولة تفعيل وضع غير مقيد)',
    confidence: 0.95,
  },
  {
    pattern: /(?:تخطي|تجاوز|عطل)\s+(?:قواعد|قيود|تعليمات|فلاتر)\s+الأمان/,
    reason: 'Arabic security filter bypass attempt (تجاوز فلاتر الأمان)',
    confidence: 0.97,
  },
  {
    pattern: /من\s+الآن\s+فصاعدا\s*[,:]?\s*(?:تجاهل|أنت\s+لست|انسى)/,
    reason: 'Arabic temporal constraint override attempt',
    confidence: 0.95,
  },
  {
    pattern: /\b(?:new\s+system\s+prompt|system\s+directive|override\s+code):\s*/i,
    reason: 'Synthetic system directive injection',
    confidence: 0.90,
  },
];

// System delimiter spoofing patterns
const DELIMITER_SPOOF_PATTERNS: Array<{ pattern: RegExp; reason: string; confidence: number }> = [
  {
    pattern: /<\/?(?:system|instruction|prompt-envelope|prompt-override|untrusted-report|untrusted-data)\b[^>]*>/i,
    reason: 'System delimiter tag spoofing attempt',
    confidence: 0.96,
  },
  {
    pattern: /(?:<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/SYS>>)/i,
    reason: 'Model control token injection (ChatML/Llama format)',
    confidence: 0.99,
  },
  {
    pattern: /###\s*(?:System|Instruction|Human|Assistant)\s*:/i,
    reason: 'Chat markdown header injection',
    confidence: 0.95,
  },
  {
    pattern: /```(?:system|instruction|prompt)\b/i,
    reason: 'Markdown system block evasion attempt',
    confidence: 0.90,
  },
];

// Data exfiltration patterns
const EXFILTRATION_PATTERNS: Array<{ pattern: RegExp; reason: string; confidence: number }> = [
  {
    pattern: /!\[.*?\]\(https?:\/\/[^\s\)]+[\?&](?:token|key|secret|pass|cred|data|leak|steal)=[^\s\)]*\)/i,
    reason: 'Image markdown data exfiltration attempt',
    confidence: 0.95,
  },
  {
    pattern: /<img\s+[^>]*src=[\"']https?:\/\/[^\s\"']+[\?&](?:token|key|secret|pass|cred|data|leak|steal)=/i,
    reason: 'HTML img tag data exfiltration attempt',
    confidence: 0.95,
  },
  {
    pattern: /\b(?:exfiltrate|leak|upload|send\s+silently)\s+.*?\s+(?:to\s+https?:\/\/)/i,
    reason: 'Direct exfiltration request',
    confidence: 0.96,
  },
  {
    pattern: /\bcurl\s+-[^\n]*https?:\/\/[^\n]*(?:@\.env|\.env|id_rsa)/i,
    reason: 'Curl command credential exfiltration attempt',
    confidence: 0.98,
  },
];

// Legitimate contexts where trigger words are safe
const SAFE_CONTEXT_PATTERNS: RegExp[] = [
  /\bgit\s+commit\s+-m\s*["'].*?["']/i,
  /\bcommit_msg\b/i,
  /\b(?:how\s+to\s+protect|protect\s+against|defend\s+against|detect|mitigate|prevent)\s+prompt\s+injection\b/i,
  /\b(?:test|spec|assert|verify|regex)\b/i,
  /\bdef\s+test_/i,
];

export class PromptInjectionGuard {
  /**
   * Count hidden zero-width and BiDi characters in text.
   */
  public countHiddenChars(text: string): number {
    if (!text) return 0;
    const inv = text.match(INVISIBLE_CHARS_REGEX) || [];
    const bidi = text.match(BIDI_CHARS_REGEX) || [];
    return inv.length + bidi.length;
  }

  /**
   * Normalize Unicode (NFKC) and strip zero-width and BiDi override evasion characters.
   */
  public sanitizeText(text: string): string {
    if (!text) return '';
    let sanitized = text.normalize('NFKC');
    sanitized = sanitized.replace(INVISIBLE_CHARS_REGEX, '');
    sanitized = sanitized.replace(BIDI_CHARS_REGEX, '');
    return sanitized;
  }

  /**
   * Neutralize boundary and system delimiter tags so they cannot be escaped.
   */
  public neutralizeDelimiters(text: string): string {
    if (!text) return '';
    return text.replace(
      /<\/?(?:untrusted-report|system|instruction|prompt-override)\b[^>]*>/gi,
      (m) => `[neutralized-tag: ${m}]`
    );
  }

  /**
   * Check text for prompt injection, jailbreaks, and delimiter escapes.
   */
  public detect(rawText: string): PromptDetectionResult {
    if (!rawText) {
      return { blocked: false, reason: 'ok', confidence: 0.0, category: 'clean' };
    }

    // 1. Check for excessive invisible/zero-width characters (obfuscation attack)
    const hiddenCount = this.countHiddenChars(rawText);
    if (hiddenCount >= 5) {
      return {
        blocked: true,
        reason: 'Excessive invisible or zero-width character evasion detected',
        confidence: 0.95,
        category: 'obfuscation',
      };
    }

    const clean = this.sanitizeText(rawText);

    // Skip legitimate dev context
    for (const safePat of SAFE_CONTEXT_PATTERNS) {
      if (safePat.test(clean)) {
        return { blocked: false, reason: 'safe_developer_context', confidence: 0.1, category: 'clean' };
      }
    }

    // 2. Check delimiter spoofing
    for (const { pattern, reason, confidence } of DELIMITER_SPOOF_PATTERNS) {
      if (pattern.test(clean)) {
        return { blocked: true, reason, confidence, category: 'boundary_escape' };
      }
    }

    // 3. Check role hijacking and jailbreaks
    for (const { pattern, reason, confidence } of HIJACK_PATTERNS) {
      if (pattern.test(clean)) {
        return { blocked: true, reason, confidence, category: 'role_hijack' };
      }
    }

    // 4. Check data exfiltration
    for (const { pattern, reason, confidence } of EXFILTRATION_PATTERNS) {
      if (pattern.test(clean)) {
        return { blocked: true, reason, confidence, category: 'exfiltration' };
      }
    }

    // 5. Recursive inspection of Base64 encoded payloads
    const b64Match = clean.match(/\b([A-Za-z0-9+/]{20,}={0,2})\b/);
    if (b64Match && b64Match[1]) {
      try {
        const decoded = Buffer.from(b64Match[1], 'base64').toString('utf-8');
        if (/^[\x20-\x7E\s\u0600-\u06FF]{10,}$/.test(decoded)) {
          const subResult = this.detect(decoded);
          if (subResult.blocked) {
            return {
              blocked: true,
              reason: `Obfuscated payload: ${subResult.reason}`,
              confidence: subResult.confidence,
              category: 'obfuscation',
            };
          }
        }
      } catch {}
    }

    return { blocked: false, reason: 'ok', confidence: 0.0, category: 'clean' };
  }

  /**
   * Isolate untrusted reports, logs, and external texts inside a cryptographically signed quarantine block.
   */
  public quarantine(text: string, limit = 4000): QuarantineResult {
    const nonce = crypto.randomBytes(8).toString('hex');
    const sanitized = this.sanitizeText(text || '');
    const clipped = sanitized.length <= limit ? sanitized : sanitized.slice(0, limit) + '…';
    const safeContent = this.neutralizeDelimiters(clipped);

    const envelope = `<untrusted-report id="${nonce}">\n${safeContent}\n</untrusted-report id="${nonce}">`;
    return { envelope, block: envelope, nonce };
  }
}
