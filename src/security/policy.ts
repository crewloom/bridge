/**
 * Security Policy & Zero-Trust Command / Path Governance
 * Pure Node.js implementation with zero external dependencies.
 */
import * as path from 'node:path';
import * as fs from 'node:fs';
import { PromptInjectionGuard } from './prompt-guard.js';
import type { PathCheckResult, PromptDetectionResult, QuarantineResult } from '../domain/types.js';

export const DEFAULT_DENY_PATTERNS: RegExp[] = [
  /\brm\s+-(?:rf?|fr?)\s+[/~]/i,             // Destructive host wiping: rm -rf / or ~
  /\bshutdown\b|\breboot\b/i,                // System power/reboot control
  /\bmkfs\b|\bfdisk\b|\bdd\s+if=/i,          // Raw disk formatting or overwriting
  /\bchmod\s+-(?:R\s+)?777\s+[/~]/i,         // Dangerous root/home open permissions
  /\bcurl\b.*\|\s*(?:ba)?sh\b/i,             // Piping uninspected remote script to shell
  /\bwget\b.*\|\s*(?:ba)?sh\b/i,             // Piping uninspected remote script to shell
  /\bgit\s+push\s+--force\b/i,               // Destructive remote force push
];

export function normalizePath(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync(resolved);
  } catch {
    // If the file does not exist, resolve its parent directory to handle /var -> /private/var symlinks
    const parent = path.dirname(resolved);
    try {
      const realParent = fs.realpathSync(parent);
      return path.join(realParent, path.basename(resolved));
    } catch {
      return resolved;
    }
  }
}

export function isPathSafe(targetPath: string, rootDir: string, allowedPaths: string[] = []): boolean {
  if (!targetPath) return true;
  try {
    const realRoot = normalizePath(rootDir);
    const realTarget = normalizePath(targetPath);

    // Within primary root directory
    if (realTarget.startsWith(realRoot)) {
      return true;
    }

    // Within explicitly permitted additional directory scopes
    for (const allowed of allowedPaths) {
      if (allowed && realTarget.startsWith(normalizePath(allowed))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export class SecurityPolicy {
  public readonly targetDir: string;
  public readonly allowedPaths: string[];
  public readonly denyPatterns: RegExp[];
  public readonly promptGuard: PromptInjectionGuard;

  constructor(targetDir: string, customPatterns?: string[], allowedPaths: string[] = []) {
    this.targetDir = normalizePath(targetDir);
    this.allowedPaths = allowedPaths.map(normalizePath);
    this.denyPatterns = [...DEFAULT_DENY_PATTERNS];

    if (customPatterns && customPatterns.length > 0) {
      for (const pat of customPatterns) {
        try {
          this.denyPatterns.push(new RegExp(pat, 'i'));
        } catch {
          // Ignore invalid regex
        }
      }
    }

    this.promptGuard = new PromptInjectionGuard();
  }

  /**
   * Check if a command matches any forbidden patterns. Returns list of matched regex sources.
   */
  public checkCommand(commandStr: string): string[] {
    if (!commandStr) return [];
    const hits: string[] = [];
    for (const pat of this.denyPatterns) {
      if (pat.test(commandStr)) {
        hits.push(pat.source);
      }
    }
    return hits;
  }

  /**
   * Verify file operations remain within the project scope or allowed path boundaries.
   */
  public checkFilePath(filePath: string): PathCheckResult {
    if (!filePath) return { ok: true, reason: 'ok' };

    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.targetDir, filePath);

    if (!isPathSafe(resolved, this.targetDir, this.allowedPaths)) {
      return {
        ok: false,
        reason: `Path escape attempt blocked: ${resolved} is outside allowed scopes`,
      };
    }

    return { ok: true, reason: 'ok' };
  }

  public checkPrompt(text: string): PromptDetectionResult {
    return this.promptGuard.detect(text);
  }

  public sanitizePrompt(text: string): string {
    return this.promptGuard.sanitizeText(text);
  }

  public quarantineUntrustedData(text: string, limit = 4000): QuarantineResult {
    return this.promptGuard.quarantine(text, limit);
  }
}
