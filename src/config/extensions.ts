import type { CliEngineProfile } from '../domain/types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseCliEngines(value: unknown): Record<string, CliEngineProfile> {
  if (!isRecord(value)) throw new Error('cliEngines must be an object.');
  const profiles: Record<string, CliEngineProfile> = Object.create(null);
  for (const [name, profile] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9_-]*$/.test(name) || name === 'opencode') {
      throw new Error('CLI engine names must be lowercase identifiers other than opencode.');
    }
    if (!isRecord(profile) || typeof profile.command !== 'string' || !profile.command.trim()) {
      throw new Error(`CLI engine ${name} requires an executable command.`);
    }
    if (profile.args !== undefined && !isStringArray(profile.args)) {
      throw new Error(`CLI engine ${name}: args must be an array of strings.`);
    }
    if (!isStringArray(profile.promptArgs) || !profile.promptArgs.some((arg) => arg.includes('{prompt}'))) {
      throw new Error(`CLI engine ${name}: promptArgs must contain {prompt}.`);
    }
    profiles[name] = {
      command: profile.command.trim(),
      ...(profile.args === undefined ? {} : { args: [...profile.args] }),
      promptArgs: [...profile.promptArgs],
    };
  }
  return profiles;
}

export function parsePlugins(value: unknown): string[] {
  if (!isStringArray(value) || value.some((item) => !item.trim())) {
    throw new Error('plugins must be an array of non-empty local module paths.');
  }
  return [...new Set(value.map((item) => item.trim()))];
}
