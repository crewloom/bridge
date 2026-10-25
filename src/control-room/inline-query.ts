import type { TelegramInlineQueryResultArticle } from '../domain/types.js';
import { resolveModelMetadata } from '../domain/model-catalog.js';
import type { SkillInfo } from './skills-catalog.js';

const MAX_RESULTS = 50;

/** Matches agents, models and skills against the typed query, in that priority order. */
export function buildInlineQueryResults(
  rawQuery: string,
  skills: SkillInfo[],
  models: string[]
): TelegramInlineQueryResultArticle[] {
  const query = rawQuery.trim().toLowerCase();
  const agents = ['build', 'plan', 'review'];

  const results: TelegramInlineQueryResultArticle[] = [];

  // 1. Core Agents first
  for (const ag of agents) {
    if (!query || ag.includes(query)) {
      results.push({
        type: 'article',
        id: `ag_${ag}`,
        title: `🤖 @${ag}`,
        description: `Switch active agent to ${ag} mode`,
        input_message_content: {
          message_text: `@${ag}`,
        },
      });
    }
  }

  // 2. Starred Models
  for (const mId of models) {
    const meta = resolveModelMetadata(mId);
    if (
      !query ||
      mId.toLowerCase().includes(query) ||
      meta.name.toLowerCase().includes(query) ||
      meta.provider.toLowerCase().includes(query)
    ) {
      results.push({
        type: 'article',
        id: `md_${mId}`,
        title: `🧠 @${meta.name} (${meta.contextWindow})`,
        description: `${meta.provider} · ${meta.tag}`,
        input_message_content: {
          message_text: `@${mId}`,
        },
      });
      if (results.length >= 15) break;
    }
  }

  // 3. Governed Skills
  for (const sk of skills) {
    const skClean = sk.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (
      !query ||
      sk.name.toLowerCase().includes(query) ||
      skClean.includes(query) ||
      (sk.description && sk.description.toLowerCase().includes(query))
    ) {
      results.push({
        type: 'article',
        id: `sk_${skClean}`,
        title: `🧰 @${sk.name}`,
        description: sk.description ? sk.description.slice(0, 80) : `Run ${sk.name} skill`,
        input_message_content: {
          message_text: `/${skClean}`,
        },
      });
      if (results.length >= MAX_RESULTS) break;
    }
  }

  return results.slice(0, MAX_RESULTS);
}
