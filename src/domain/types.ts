/**
 * AgentGram Domain Types & Data Contracts
 * Strict types for configuration, security, Telegram Bot API, and OpenCode events.
 */

export type ExecutionMode = 'read' | 'build' | 'auto';

export type PermissionDecision = 'allow' | 'reject' | 'ask';

export interface AgentgramConfig {
  botToken: string;
  allowedChatId: string;
  targetDir: string;
  defaultAgent: string;
  defaultModel: string;
  favoriteModels: string[];
  dailyLimit: number;
  runTimeout: number;
  language: 'en' | 'ar';
  denyPatterns: string[];
  allowedPaths: string[];
  channel?: string;
  engine?: string;
  workspaces: string[];
  extra: Record<string, unknown>;
}

export type PromptCategory =
  | 'role_hijack'
  | 'boundary_escape'
  | 'exfiltration'
  | 'obfuscation'
  | 'clean';

export interface PromptDetectionResult {
  blocked: boolean;
  reason: string;
  confidence: number;
  category?: PromptCategory;
}

export interface QuarantineResult {
  envelope: string;
  block: string;
  nonce: string;
}

export interface PathCheckResult {
  ok: boolean;
  reason: string;
}

export interface ServiceStatus {
  installed: boolean;
  running: boolean;
  system: string;
  path?: string | undefined;
}

// Telegram Bot API Models
export interface InlineKeyboardButton {
  text: string;
  callback_data?: string | undefined;
  url?: string | undefined;
  switch_inline_query_current_chat?: string | undefined;
  switch_inline_query?: string | undefined;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  reply_to_message?: TelegramMessage;
}

export interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  chat_type?: string;
}

export interface TelegramInlineQueryResultArticle {
  type: 'article';
  id: string;
  title: string;
  description?: string;
  input_message_content: {
    message_text: string;
    parse_mode?: 'HTML' | 'Markdown' | undefined;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
  inline_query?: TelegramInlineQuery;
}

// OpenCode Engine Models
export interface OpenCodeToolCall {
  id: string;
  tool: string;
  call_id?: string;
  status: 'running' | 'done' | 'error';
  args?: Record<string, unknown>;
  output?: string;
  title?: string;
}

export interface OpenCodeRun {
  sessionId: string;
  agent: string;
  model: string;
  mode: ExecutionMode;
  startedAt: number;
  userMsgId?: number | undefined;
  userMessages: Set<string>;
  text: Record<string, string>;
  textOrder: string[];
  msgOfPart: Record<string, number>;
  tools: Record<string, OpenCodeToolCall>;
  toolOrder: string[];
  files: Set<string>;
  cmds: number;
  busy: boolean;
  done: boolean;
  error?: string | null | undefined;
  currentCommand?: string | undefined;
  recentOutput?: string | undefined;
  lastResultOutput?: string | undefined;
}

export interface OpenCodePermissionRequest {
  id: string;
  permission: string;
  patterns?: string[];
  metadata?: {
    command?: string;
    filepath?: string;
    [key: string]: unknown;
  };
}

export interface OpenCodeQuestionOption {
  label: string;
  description?: string;
}

export interface OpenCodeQuestionRequest {
  id: string;
  question: string;
  header?: string;
  options: OpenCodeQuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}
