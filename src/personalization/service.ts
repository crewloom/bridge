/**
 * Owns the bridge's personalization repository: loads the store once, and exposes the narrow
 * operations the control room needs (list, activate, disable, resolve-for-task). All domain rules
 * come from `@crewloom/contracts`; this service only adapts them to the bridge lifecycle.
 */
import {
  PersonalizationRepository,
  activatePersonaInScope,
  disableVersion,
  resolveDefaultPersonalization,
  type DefaultPersonalization,
  type PersonaProfile,
} from '@crewloom/contracts';
import { createFsStorage } from './fs-storage.js';

export interface PersonalizationResult {
  readonly ok: boolean;
  readonly error?: string;
}

export class PersonalizationService {
  private readonly repo: PersonalizationRepository;

  constructor(stateDir: string) {
    this.repo = new PersonalizationRepository(createFsStorage(stateDir));
  }

  /** Loads the persisted state once. Called during room startup; the empty state applies until then. */
  async load(): Promise<void> {
    await this.repo.load();
  }

  listPersonas(): readonly PersonaProfile[] {
    return this.repo.state.personas;
  }

  /** The active persona for a new task, or null when personalization is off or nothing is active. */
  forNewTask(): DefaultPersonalization {
    return resolveDefaultPersonalization(this.repo.state, Date.now(), { projectId: null });
  }

  async activate(id: string, version: number): Promise<PersonalizationResult> {
    const result = await this.repo.commit((state) => activatePersonaInScope(state, id, version));
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  async disable(id: string, version: number): Promise<PersonalizationResult> {
    const result = await this.repo.commit((state) => disableVersion(state, 'persona', id, version));
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }
}
