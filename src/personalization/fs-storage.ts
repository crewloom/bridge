/**
 * Filesystem-backed `PersonalizationStorage` for the bridge. Personalization state lives in the
 * bridge's global state directory as `personalization.json`, with unreadable payloads preserved
 * under `personalization-recovery/` (the contracts' recovery contract).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PersonalizationStorage } from '@crewloom/contracts';

const MAIN_FILE = 'personalization.json';
const RECOVERY_DIR = 'personalization-recovery';

export function createFsStorage(stateDir: string): PersonalizationStorage {
  const mainPath = path.join(stateDir, MAIN_FILE);
  const recoveryDir = path.join(stateDir, RECOVERY_DIR);

  return {
    async read(): Promise<string | null> {
      try {
        return fs.readFileSync(mainPath, 'utf-8');
      } catch {
        return null;
      }
    },
    async write(text: string): Promise<void> {
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(mainPath, text, { encoding: 'utf-8', mode: 0o600 });
    },
    async preserveUnreadable(raw: string): Promise<void> {
      fs.mkdirSync(recoveryDir, { recursive: true });
      fs.writeFileSync(path.join(recoveryDir, `recovery-${Date.now()}.json`), raw, { encoding: 'utf-8', mode: 0o600 });
    },
    async countRecovery(): Promise<number> {
      try {
        return fs.readdirSync(recoveryDir).length;
      } catch {
        return 0;
      }
    },
    async purgeRecovery(): Promise<number> {
      try {
        const names = fs.readdirSync(recoveryDir);
        for (const name of names) fs.unlinkSync(path.join(recoveryDir, name));
        return names.length;
      } catch {
        return 0;
      }
    },
  };
}
