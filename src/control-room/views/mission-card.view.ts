/**
 * Mission Card View Builder
 * Responsible for rendering the live interactive mission control card.
 */
import * as path from 'node:path';
import { resolveModelMetadata } from '../../domain/model-catalog.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import type { OpenCodeRun } from '../../domain/types.js';

export function renderMissionCard(options: {
  run: OpenCodeRun | null;
  currentModel: string;
  engineName: string;
  channelName: string;
  targetDir: string;
}): string {
  const { run, currentModel, engineName, channelName, targetDir } = options;
  if (!run) return '⚡ <b>AgentGram Mission Control</b>\nStatus: Idle';

  const elapsed = Math.round((Date.now() - run.startedAt) / 1000);
  const statusIcon = run.done ? '🏁' : run.busy ? '🟢' : '⏸';
  const statusText = run.done ? 'Finished' : run.busy ? 'Executing' : 'Waiting';
  const curMeta = resolveModelMetadata(currentModel);

  let card = `
⚡ <b>AgentGram · Live Mission Control</b>
Model: 🤖 <b>${escapeHtml(curMeta.name)}</b> (<code>${escapeHtml(curMeta.contextWindow)}</code>)
Agent: 🧠 <code>${escapeHtml(run.agent)}</code> (${escapeHtml(engineName)}) | Mode: 🔒 <b>${run.mode}</b>
Channel: 📡 <b>${escapeHtml(channelName)}</b>
Status: ${statusIcon} <b>${statusText}</b> · ⏳ ${elapsed}s
Commands: ⚙️ ${run.cmds} · Files: 📝 ${run.files.size}
Workspace: 📁 <code>${escapeHtml(path.basename(targetDir))}</code>
`.trim();

  if (run.prompt) {
    card += `\n\n📝 <b>Prompt:</b>\n<code>${escapeHtml(run.prompt.slice(0, 150))}</code>`;
  }

  if (run.currentCommand && run.busy) {
    card += `\n\n⚙️ <b>Active Action:</b>\n<code>${escapeHtml(run.currentCommand.slice(0, 120))}</code>`;
  }

  if (run.recentOutput && run.busy) {
    card += `\n\n📋 <b>Live Stream:</b>\n<pre><code>${escapeHtml(run.recentOutput.slice(-300))}</code></pre>`;
  }

  return card;
}
