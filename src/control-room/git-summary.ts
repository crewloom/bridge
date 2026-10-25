import * as child_process from 'node:child_process';

export interface GitSummary {
  branch: string;
  dirtyLines: string[];
  commits: string[];
}

function git(cwd: string, args: string[]): string | null {
  const res = child_process.spawnSync('git', args, { cwd, encoding: 'utf-8', timeout: 5000 });
  return res.status === 0 ? res.stdout : null;
}

/** Reads branch, dirty files and (optionally) recent commits. Missing git yields `unknown` and empty lists. */
export function readGitSummary(cwd: string, opts: { commitCount?: number } = {}): GitSummary {
  const summary: GitSummary = { branch: 'unknown', dirtyLines: [], commits: [] };
  const lines = (out: string) => out.trim().split('\n').filter(Boolean);
  try {
    const branch = git(cwd, ['branch', '--show-current']);
    if (branch !== null) summary.branch = branch.trim() || 'main';
    const status = git(cwd, ['status', '--porcelain']);
    if (status !== null) summary.dirtyLines = lines(status);
    if (opts.commitCount) {
      const log = git(cwd, ['log', `-${opts.commitCount}`, '--oneline']);
      if (log !== null) summary.commits = lines(log);
    }
  } catch {}
  return summary;
}

/** The current branch name, `unknown` when git is unavailable. */
export function readGitBranch(cwd: string): string {
  return readGitSummary(cwd).branch;
}
