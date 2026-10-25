import type { SkillInfo } from './skills-catalog.js';

export interface BotCommand {
  command: string;
  description: string;
}

const MAX_COMMANDS = 80;

/** Built-in commands followed by one command per skill, up to the channel's command limit. */
export function buildBotCommands(skills: SkillInfo[]): BotCommand[] {
  const standardCommands: BotCommand[] = [
    { command: 'pinpoint_go', description: '🚀 Run Pinpoint Ops test, commit, deploy & report' },
    { command: 'plan', description: '📐 Architecture, planning & design agent' },
    { command: 'build', description: '🤖 Primary autonomous code builder agent' },
    { command: 'review', description: '🔍 Code review & security gate agent' },
    { command: 'claude', description: '🧠 Switch to Claude 3.5 Sonnet' },
    { command: 'gemini', description: '🧠 Switch to Gemini 2.0 Flash' },
    { command: 'mentions', description: '⚡ Mentions & Instant Shortcuts Hub (@)' },
    { command: 'frontend', description: '🎨 Vue 3 / Inertia / Admin-Vue design laws' },
    { command: 'erp_debug', description: '💼 ERP double-entry & ledger diagnostics' },
    { command: 'financial_expert', description: '💰 CFO accounting, treasury & close' },
    { command: 'query_performance', description: '⚡ SQL query performance & index audit' },
    { command: 'security_audit', description: '🛡️ Security & permissions inspection' },
    { command: 'git_hygiene', description: '🌿 Branch safety & exact staging' },
    { command: 'code_health', description: '🩺 Speed, memory, queues & runtime health' },
    { command: 'status', description: '📊 Mission control status & active workspace' },
    { command: 'diff', description: '📝 View pending git diff changes' },
    { command: 'new', description: '✨ Start fresh mission session' },
    { command: 'stop', description: '⏹️ Abort currently running task' },
    { command: 'skills', description: '🧰 Browse all 58 agent skills with pagination' },
    { command: 'models', description: '🤖 AI models & context window inspection' },
    { command: 'help', description: '⚡ Commands and operational help' },
  ];

  const known = new Set(standardCommands.map((c) => c.command));
  for (const sk of skills) {
    if (standardCommands.length >= MAX_COMMANDS) break;
    const cmdName = sk.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 32);
    if (!known.has(cmdName) && cmdName.length > 0) {
      known.add(cmdName);
      standardCommands.push({
        command: cmdName,
        description: sk.description ? sk.description.slice(0, 100) : `🧰 Run ${sk.name} skill`,
      });
    }
  }
  return standardCommands;
}
