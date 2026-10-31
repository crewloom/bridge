/**
 * Persona Menu View Builder
 * Lists the personas in the personalization store and lets the owner activate or disable one.
 */
import { escapeHtml } from '../../telegram/telegram-client.js';
import { t } from '../../i18n/index.js';
import type { InlineKeyboardButton } from '../../domain/types.js';
import type { PersonaProfile } from '@crewloom/contracts';

export interface PersonaMenuViewOptions {
  personas?: readonly PersonaProfile[];
  activeName: string | null;
  language: 'en' | 'ar';
}

export interface PersonaMenuViewResult {
  cardText: string;
  text: string;
  rows: InlineKeyboardButton[][];
}

export function buildPersonaMenuView(options: PersonaMenuViewOptions): PersonaMenuViewResult {
  const { activeName, language } = options;
  const personas = options.personas ?? [];

  const rows: InlineKeyboardButton[][] = [];
  let currentRow: InlineKeyboardButton[] = [];
  for (const persona of personas) {
    const isActive = persona.status === 'active';
    const label = `${isActive ? '● ' : ''}${persona.name} (v${persona.version})`;
    currentRow.push({
      text: `🧑 ${label}`,
      callback_data: isActive ? `pe:d:${persona.id}:${persona.version}` : `pe:a:${persona.id}:${persona.version}`,
    });
    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  rows.push([{ text: t('btn_back', language), callback_data: 'menu:home' }]);

  const header = language === 'ar'
    ? `🧑 <b>الشخصيات (Personas)</b>\nالنشطة: <b>${escapeHtml(activeName || 'بدون')}</b>\n\n`
    : `🧑 <b>Personas</b>\nActive: <b>${escapeHtml(activeName || 'None')}</b>\n\n`;

  let cardText = header;
  if (personas.length === 0) {
    cardText += language === 'ar'
      ? '<i>لا توجد شخصيات محفوظة بعد. أنشئ شخصية من تطبيق Crewloom Desktop ثم فعّلها هنا.</i>'
      : '<i>No personas saved yet. Create one in Crewloom Desktop, then activate it here.</i>';
  } else {
    for (const persona of personas) {
      const isActive = persona.status === 'active';
      const state = persona.status === 'active'
        ? (language === 'ar' ? 'نشطة' : 'active')
        : persona.status === 'disabled'
          ? (language === 'ar' ? 'معطّلة' : 'disabled')
          : (language === 'ar' ? 'مسودة' : 'draft');
      cardText += `${isActive ? '●' : '•'} <b>${escapeHtml(persona.name)}</b> <code>(v${persona.version} · ${state})</code>\n`;
      if (persona.tone.trim()) cardText += `  <code>${escapeHtml(persona.tone.trim().slice(0, 60))}</code>\n`;
    }
    cardText += language === 'ar'
      ? `\n<i>اضغط على شخصية لتفعيلها (أو إيقاف النشطة). تُحقن الشخصية النشطة في رسالة النظام قبل التنفيذ.</i>`
      : `\n<i>Tap a persona to activate it (or deactivate the active one). The active persona is injected into the system prompt before execution.</i>`;
  }

  const trimmed = cardText.trim();
  return { cardText: trimmed, text: trimmed, rows };
}
