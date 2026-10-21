/**
 * Models Menu View Builder
 * Responsible for rendering model catalog cards and building paginated inline keyboard markup.
 */
import { resolveModelMetadata } from '../../domain/model-catalog.js';
import { escapeHtml } from '../../telegram/telegram-client.js';
import { t } from '../../i18n/index.js';
import type { InlineKeyboardButton } from '../../domain/types.js';

export interface ModelsMenuViewOptions {
  allModels: string[];
  favoriteModels?: string[];
  pool?: string[];
  currentModel: string;
  page: number;
  pageSize?: number;
  totalPages?: number;
  language: 'en' | 'ar';
}

export interface ModelsMenuViewResult {
  cardText: string;
  text: string;
  rows: InlineKeyboardButton[][];
}

export function buildModelsMenuView(options: ModelsMenuViewOptions): ModelsMenuViewResult {
  const { allModels, favoriteModels = [], currentModel, page, language } = options;
  const pageSize = options.pageSize ?? 6;

  const rest = allModels.filter((m) => !favoriteModels.includes(m));
  const totalPages = options.totalPages ?? (Math.ceil(rest.length / pageSize) || 1);
  const pool = options.pool ?? (page === 0 ? favoriteModels : rest.slice((page - 1) * pageSize, page * pageSize));

  const rows: InlineKeyboardButton[][] = pool.map((m) => {
    const meta = resolveModelMetadata(m);
    const isCurrent = m === currentModel;
    const cleanName = meta.name.length > 20 ? meta.name.slice(0, 18) + '…' : meta.name;
    const globalIdx = allModels.indexOf(m);
    return [
      {
        text: `${isCurrent ? '● ' : ''}${cleanName} · ${meta.contextWindow}`,
        callback_data: `md:${globalIdx >= 0 ? globalIdx : 0}`,
      },
    ];
  });

  if (page === 0) {
    if (rest.length > 0) {
      rows.push([{ text: t('btn_all_models', language), callback_data: 'pg:1' }]);
    }
    rows.push([{ text: t('btn_back', language), callback_data: 'menu:home' }]);
  } else {
    const pagRow: InlineKeyboardButton[] = [
      { text: t('btn_favorites', language), callback_data: 'pg:0' },
    ];
    if (rest.length > page * pageSize) {
      pagRow.push({ text: t('btn_next', language), callback_data: `pg:${page + 1}` });
    }
    rows.push(pagRow);
    rows.push([{ text: t('btn_back', language), callback_data: 'menu:md' }]);
  }

  const curMeta = resolveModelMetadata(currentModel);
  let cardText = language === 'ar'
    ? `🤖 <b>نماذج الذكاء الاصطناعي ومساحة السياق</b> ${page > 0 ? `(صفحة ${page} من ${totalPages})` : '(المفضلة)'}\nالنموذج النشط: <b>${escapeHtml(curMeta.name)}</b> (<code>${escapeHtml(curMeta.contextWindow)}</code>)\n\n`
    : `🤖 <b>AI Models & Context Windows</b> ${page > 0 ? `(Page ${page} of ${totalPages})` : '(Favorites)'}\nActive: <b>${escapeHtml(curMeta.name)}</b> (<code>${escapeHtml(curMeta.contextWindow)}</code>)\n\n`;

  for (const m of pool) {
    const meta = resolveModelMetadata(m);
    const isCurrent = m === currentModel;
    cardText += `${isCurrent ? '●' : '•'} <b>${escapeHtml(meta.name)}</b> (<code>${escapeHtml(meta.provider)}</code>)\n`;
    cardText += `  <code>السياق: ${escapeHtml(meta.contextWindow)} | ${escapeHtml(meta.tag)}</code>\n`;
  }

  cardText += language === 'ar'
    ? `\n<i>اضغط على أي نموذج أدناه للتبديل إليه فوراً:</i>`
    : `\n<i>Tap any model below to activate immediately:</i>`;

  const trimmed = cardText.trim();
  return { cardText: trimmed, text: trimmed, rows };
}
