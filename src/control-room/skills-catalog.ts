import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SkillInfo {
  id: string;
  name: string;
  description?: string | undefined;
}

/** Skill folders found under the workspace, or a fixed default list when none exist. Sorted by name. */
export function getAvailableSkills(targetDir: string): SkillInfo[] {
  const candidates = [
    path.join(targetDir, '.agents', 'skills'),
    path.join(targetDir, 'docs', 'ai', 'skills'),
    path.join(targetDir, '.gemini', 'skills'),
  ];

  const map = new Map<string, SkillInfo>();

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() && !item.isSymbolicLink()) continue;
        if (item.name.startsWith('.')) continue;

        const raw = item.name;
        const clean = raw.replace(/^\d+-/, '');

        if (!map.has(clean)) {
          let desc: string | undefined;
          const skillMd = path.join(dir, raw, 'SKILL.md');
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
          });
        }
      }
    } catch {}
  }

  if (map.size === 0) {
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
    defaults.forEach((d) => map.set(d, { id: d, name: d }));
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
