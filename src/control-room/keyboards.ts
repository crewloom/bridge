import type { ChannelKeyboard } from '../channels/channel.interface.js';
import type { InlineKeyboardButton, InlineKeyboardMarkup } from '../domain/types.js';
import { stripHtml } from '../telegram/telegram-client.js';
import { t } from '../i18n/index.js';

type Language = 'en' | 'ar';

/** Normalizes button labels and exposes both the channel-neutral and Telegram keyboard shapes. */
export function wrapKeyboard(rows: InlineKeyboardButton[][]): ChannelKeyboard & InlineKeyboardMarkup {
  const cleanRows = rows.map((r) =>
    r.map((btn) => ({
      text: stripHtml(btn.text).replace(/^[⚡\s]+/, '').trim(),
      callback_data: btn.callback_data,
      url: btn.url,
      switch_inline_query_current_chat: btn.switch_inline_query_current_chat,
      switch_inline_query: btn.switch_inline_query,
    }))
  );

  return {
    rows: cleanRows.map((r) =>
      r.map((btn) => ({
        text: btn.text,
        callbackData: btn.callback_data,
        callback_data: btn.callback_data,
        url: btn.url,
        switchInlineQueryCurrentChat: btn.switch_inline_query_current_chat,
      }))
    ),
    inline_keyboard: cleanRows,
  } as ChannelKeyboard & InlineKeyboardMarkup;
}

/** The 5-row interactive home keyboard with all 14 buttons. */
export function buildMainKeyboard(language: Language): ChannelKeyboard & InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = [
    [
      { text: t('btn_agents', language), callback_data: 'menu:ag' },
      { text: t('btn_models', language), callback_data: 'menu:md' },
      { text: t('btn_mode', language), callback_data: 'menu:mo' },
    ],
    [
      { text: t('btn_sessions', language), callback_data: 'menu:se' },
      { text: t('btn_new', language), callback_data: 'new' },
      { text: t('btn_stop', language), callback_data: 'stop' },
    ],
    [
      { text: t('btn_status', language), callback_data: 'st' },
      { text: t('btn_workspaces', language), callback_data: 'menu:ws' },
      { text: t('btn_diff', language), callback_data: 'diff' },
    ],
    [
      { text: t('btn_skills', language), callback_data: 'menu:sk' },
      { text: t('btn_usage', language), callback_data: 'us' },
      { text: t('btn_language', language), callback_data: 'menu:lg' },
    ],
    [
      { text: t('btn_handoff', language), callback_data: 'ho' },
      { text: t('btn_help', language), callback_data: 'hp' },
      { text: language === 'ar' ? '⚡ المنشن (@)' : '⚡ Mentions (@)', callback_data: 'mention:hub' },
    ],
  ];

  return wrapKeyboard(rows);
}
