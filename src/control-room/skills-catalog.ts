import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface SkillInfo {
  id: string;
  name: string;
  description?: string | undefined;
  origin?: string | undefined;
  originLabel?: string | undefined;
}

interface ProbeLocation {
  dir: string;
  origin: string;
  originLabel: string;
}

/**
 * Builds candidate directories to probe for skills across all installed agents.
 * Reads in-place with zero file copying, keeping each agent's native directory untouched.
 */
function buildProbeLocations(targetDir: string): ProbeLocation[] {
  const home = os.homedir();
  const probes: ProbeLocation[] = [
    // 1. Crewloom Core & workspace primary skills
    { dir: path.join(targetDir, '.agents', 'skills'), origin: 'crewloom', originLabel: 'Crewloom Core' },
    { dir: path.join(targetDir, 'core', '.agents', 'skills'), origin: 'crewloom', originLabel: 'Crewloom Core' },
    { dir: path.join(targetDir, '..', 'core', '.agents', 'skills'), origin: 'crewloom', originLabel: 'Crewloom Core' },
    { dir: path.join(targetDir, 'docs', 'ai', 'skills'), origin: 'crewloom', originLabel: 'Docs AI' },

    // 2. Claude Code (project-local then global)
    { dir: path.join(targetDir, '.claude', 'skills'), origin: 'claude', originLabel: 'Claude Code' },
    { dir: path.join(home, '.claude', 'skills'), origin: 'claude', originLabel: 'Claude Code' },

    // 3. Antigravity (Gemini)
    { dir: path.join(home, '.gemini', 'config', 'skills'), origin: 'antigravity', originLabel: 'Antigravity' },
    { dir: path.join(home, '.gemini', 'antigravity', 'builtin', 'skills'), origin: 'antigravity', originLabel: 'Antigravity (builtin)' },
    { dir: path.join(targetDir, '.gemini', 'skills'), origin: 'antigravity', originLabel: 'Antigravity' },

    // 4. i-agent
    { dir: path.join(targetDir, '.agent', 'skills'), origin: 'i-agent', originLabel: 'i-agent' },

    // 5. OpenCode
    { dir: path.join(home, '.opencode', 'skills'), origin: 'opencode', originLabel: 'OpenCode' },
    { dir: path.join(home, '.config', 'opencode', 'skills'), origin: 'opencode', originLabel: 'OpenCode' },
  ];

  // 6. Codex cached plugin skills
  const codexPlugins = path.join(home, '.codex', 'plugins', 'cache');
  if (fs.existsSync(codexPlugins)) {
    try {
      const sources = fs.readdirSync(codexPlugins);
      for (const src of sources) {
        const srcPath = path.join(codexPlugins, src);
        if (!fs.statSync(srcPath).isDirectory()) continue;
        for (const plugin of fs.readdirSync(srcPath)) {
          const pluginPath = path.join(srcPath, plugin);
          if (!fs.statSync(pluginPath).isDirectory()) continue;
          for (const ver of fs.readdirSync(pluginPath)) {
            const verSkills = path.join(pluginPath, ver, 'skills');
            if (fs.existsSync(verSkills)) {
              probes.push({ dir: verSkills, origin: 'codex', originLabel: `Codex (${plugin})` });
            }
          }
        }
      }
    } catch {}
  }

  return probes;
}

/** Skill folders found under the workspace and external agents. Sorted by name. */
export function getAvailableSkills(targetDir: string): SkillInfo[] {
  const probes = buildProbeLocations(targetDir);
  const map = new Map<string, SkillInfo>();

  for (const probe of probes) {
    if (!fs.existsSync(probe.dir)) continue;
    try {
      const items = fs.readdirSync(probe.dir, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() && !item.isSymbolicLink()) continue;
        if (item.name.startsWith('.')) continue;

        const raw = item.name;
        const clean = raw.replace(/^\d+-/, '');

        // First probe wins (preserves precedence: Crewloom Core > Claude > Antigravity > Codex)
        if (!map.has(clean)) {
          let desc: string | undefined;
          const skillMd = path.join(probe.dir, raw, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            try {
              const head = fs.readFileSync(skillMd, 'utf-8').slice(0, 600);
              const m = head.match(/description:\s*["']?([^"'\n\r]+)/i);
              if (m && m[1]) {
                desc = m[1].replace(/^[>"\s]+|[<"\s]+$/g, '').trim();
              }
            } catch {}
          }

          map.set(clean, {
            id: clean,
            name: clean,
            description: desc,
            origin: probe.origin,
            originLabel: probe.originLabel,
          });
        }
      }
    } catch {}
  }

  const defaults = [
    'frontend',
    'query-performance',
    'erp-debug',
    'security-audit',
    'git-hygiene',
    'financial-expert',
    'rveta-core',
    'laravel-architecture',
  ];
  defaults.forEach((d) => {
    if (!map.has(d)) {
      map.set(d, { id: d, name: d, origin: 'crewloom', originLabel: 'Crewloom Core' });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
