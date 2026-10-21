/**
 * Skills Menu View Builder
 * Responsible for rendering paginated skills cards and building selection buttons.
 */
import { escapeHtml } from '../../telegram/telegram-client.js';
import { t } from '../../i18n/index.js';
import type { InlineKeyboardButton } from '../../domain/types.js';

export interface SkillItem {
  id: string;
  name: string;
  description?: string | undefined;
}

export interface SkillsMenuViewOptions {
  skills?: SkillItem[];
  pool?: SkillItem[];
  activeSkill: string | null;
  page?: number;
  safePage?: number;
  pageSize?: number;
  totalPages?: number;
  totalSkills?: number;
  language: 'en' | 'ar';
}

export interface SkillsMenuViewResult {
  cardText: string;
  text: string;
  rows: InlineKeyboardButton[][];
}

export function buildSkillsMenuView(options: SkillsMenuViewOptions): SkillsMenuViewResult {
  const { activeSkill, language } = options;
  const pageSize = options.pageSize ?? 8;
  const allSkills = options.skills ?? [];
  const totalSkills = options.totalSkills ?? allSkills.length;
  const totalPages = options.totalPages ?? (Math.ceil(totalSkills / pageSize) || 1);
  const rawPage = options.page ?? options.safePage ?? 0;
  const safePage = Math.min(Math.max(0, rawPage), totalPages - 1);
  const pool = options.pool ?? allSkills.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const rows: InlineKeyboardButton[][] = [];
  let currentRow: InlineKeyboardButton[] = [];
  for (const sk of pool) {
    const isCurrent = sk.name === activeSkill;
    currentRow.push({
      text: `${isCurrent ? '● ' : ''}🧰 ${sk.name}`,
      callback_data: `sk:${sk.name}`,
    });
    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  // Pagination row
  const pagRow: InlineKeyboardButton[] = [];
  if (safePage > 0) {
    pagRow.push({ text: language === 'ar' ? '⬅️ السابق' : '⬅️ Prev', callback_data: `skpage:${safePage - 1}` });
  }
  if (safePage < totalPages - 1) {
    pagRow.push({ text: language === 'ar' ? '➡️ المزيد من المهارات' : '➡️ Next Skills', callback_data: `skpage:${safePage + 1}` });
  }
  if (pagRow.length > 0) {
    rows.push(pagRow);
  }

  // Dedicated back button row
  rows.push([{ text: t('btn_back', language), callback_data: 'menu:home' }]);

  let cardText = language === 'ar'
    ? `🧰 <b>مهارات وكلاء الذكاء الاصطناعي (Agent Skills)</b> (صفحة ${safePage + 1} من ${totalPages} · إجمالي ${totalSkills} مهارة)\nالمهارة المفعلة: <b>${escapeHtml(activeSkill || 'بدون (وكيل عام)')}</b>\n\n`
    : `🧰 <b>Available Agent Skills</b> (Page ${safePage + 1} of ${totalPages} · Total: ${totalSkills})\nActive: <b>${escapeHtml(activeSkill || 'None (Standard Agent)')}</b>\n\n`;

  for (const sk of pool) {
    const isCurrent = sk.name === activeSkill;
    const descSnippet = sk.description ? sk.description.slice(0, 60) + (sk.description.length > 60 ? '…' : '') : (language === 'ar' ? 'مهارة متخصصة' : 'Specialized skill');
    cardText += `${isCurrent ? '●' : '•'} <b>${escapeHtml(sk.name)}</b>\n`;
    cardText += `  <code>${escapeHtml(descSnippet)}</code>\n`;
  }

  cardText += language === 'ar'
    ? `\n<i>اختر المهارة لتوجيه الوكيل البرمجي للعمل بها فوراً:</i>`
    : `\n<i>Select a skill to prime the agent for execution:</i>`;

  const trimmed = cardText.trim();
  return { cardText: trimmed, text: trimmed, rows };
}
