/**
 * Universal AI Model Metadata & Context Window Registry
 * Zero-dependency catalog and pattern-matching resolver supporting all major model families:
 * Anthropic Claude, OpenAI, Google Gemini, DeepSeek, Qwen, Meta Llama, and OpenCode Community.
 */

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  contextWindow: string; // e.g. "200k", "128k", "2M", "1M"
  tag: string;           // Brief capabilities summary
  tier?: 'flagship' | 'standard' | 'free';
}

export const KNOWN_MODELS: Record<string, ModelMetadata> = {
  // Anthropic
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet (v2)',
    provider: 'Anthropic',
    contextWindow: '200k',
    tag: 'Coding Champion & Tool Use',
    tier: 'flagship',
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: '200k',
    tag: 'Coding & Agentic Automation',
    tier: 'flagship',
  },
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: '200k',
    tag: 'Ultra-Fast & Smart',
    tier: 'standard',
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    contextWindow: '200k',
    tag: 'Deep Reasoning & Synthesis',
    tier: 'flagship',
  },

  // OpenAI
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'OpenAI',
    contextWindow: '128k',
    tag: 'Multimodal Flagship',
    tier: 'flagship',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextWindow: '128k',
    tag: 'High Speed & Efficiency',
    tier: 'standard',
  },
  'o1': {
    id: 'o1',
    name: 'OpenAI o1',
    provider: 'OpenAI',
    contextWindow: '128k',
    tag: 'Deep CoT Reflection & Logic',
    tier: 'flagship',
  },
  'o1-mini': {
    id: 'o1-mini',
    name: 'OpenAI o1-mini',
    provider: 'OpenAI',
    contextWindow: '128k',
    tag: 'Math & STEM Reasoning',
    tier: 'standard',
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'OpenAI',
    contextWindow: '200k',
    tag: 'High-Performance Math & Code',
    tier: 'flagship',
  },

  // Google Gemini
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    contextWindow: '2M',
    tag: 'Massive 2M Tokens Repo Context',
    tier: 'flagship',
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    contextWindow: '1M',
    tag: 'Fast 1M Window & Multimodal',
    tier: 'standard',
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    contextWindow: '1M',
    tag: 'Next-Gen Realtime Multimodal',
    tier: 'flagship',
  },

  // DeepSeek
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextWindow: '128k',
    tag: 'SOTA Coding & Architecture',
    tier: 'flagship',
  },
  'deepseek-reasoner': {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    contextWindow: '128k',
    tag: 'Open CoT Reasoning Engine',
    tier: 'flagship',
  },

  // OpenCode Community Free Models
  'opencode/deepseek-v4.1-flash-free': {
    id: 'opencode/deepseek-v4.1-flash-free',
    name: 'DeepSeek v4.1 Flash',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'Fast Free Coding Agent',
    tier: 'free',
  },
  'opencode/space-bunny-free': {
    id: 'opencode/space-bunny-free',
    name: 'Space Bunny Free',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'Community Automation Agent',
    tier: 'free',
  },
  'opencode/glm-5.3-flash-free': {
    id: 'opencode/glm-5.3-flash-free',
    name: 'GLM 5.3 Flash Free',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'High Concurrency Coding',
    tier: 'free',
  },
  'opencode/nemotron-3-ultra-free': {
    id: 'opencode/nemotron-3-ultra-free',
    name: 'Nemotron 3 Ultra Free',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'NVIDIA Hardware Accelerated',
    tier: 'free',
  },
  'opencode/mimo-v2.6-flash-free': {
    id: 'opencode/mimo-v2.6-flash-free',
    name: 'Mimo v2.6 Flash Free',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'Lightweight Quick Edits',
    tier: 'free',
  },
  'opencode/longcat-2.5-preview-free': {
    id: 'opencode/longcat-2.5-preview-free',
    name: 'LongCat 2.5 Preview',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'Long Context Free Preview',
    tier: 'free',
  },

  // Open Weights
  'qwen2.5-coder-32b': {
    id: 'qwen2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'Alibaba',
    contextWindow: '128k',
    tag: 'Open-Weights Coding Champion',
    tier: 'flagship',
  },
};

/**
 * Clean and format model ID into human-readable label
 */
export function formatModelName(modelId: string): string {
  const parts = modelId.split('/');
  const base = parts[parts.length - 1] || modelId;
  return base
    .replace(/-free$/i, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Resilient, universal metadata resolver
 */
export function resolveModelMetadata(modelId: string): ModelMetadata {
  if (!modelId) {
    return {
      id: 'default',
      name: 'Default Model',
      provider: 'Default',
      contextWindow: '128k',
      tag: 'Default Engine Model',
    };
  }

  // 1. Direct match in dictionary
  if (KNOWN_MODELS[modelId]) {
    return KNOWN_MODELS[modelId];
  }

  // 2. Normalized lowercase match
  const lower = modelId.toLowerCase();
  for (const [key, meta] of Object.entries(KNOWN_MODELS)) {
    if (lower === key.toLowerCase() || lower.endsWith(`/${key.toLowerCase()}`)) {
      return { ...meta, id: modelId };
    }
  }

  // 3. Heuristic pattern matching based on provider/family
  if (lower.includes('gemini-1.5-pro') || lower.includes('gemini-2.0-pro')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Google',
      contextWindow: '2M',
      tag: 'Ultra-Long Context (2M)',
      tier: 'flagship',
    };
  }
  if (lower.includes('gemini')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Google',
      contextWindow: '1M',
      tag: '1M Tokens Multimodal',
      tier: 'standard',
    };
  }
  if (lower.includes('claude-3-5') || lower.includes('sonnet') || lower.includes('haiku') || lower.includes('opus')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Anthropic',
      contextWindow: '200k',
      tag: 'SOTA Coding & Tool Use',
      tier: 'flagship',
    };
  }
  if (lower.includes('deepseek-r1') || lower.includes('reasoner')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'DeepSeek',
      contextWindow: '128k',
      tag: 'Deep Reasoning CoT',
      tier: 'flagship',
    };
  }
  if (lower.includes('deepseek')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'DeepSeek',
      contextWindow: '128k',
      tag: 'High-Speed Coding & Logic',
      tier: 'flagship',
    };
  }
  if (lower.includes('o3')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'OpenAI',
      contextWindow: '200k',
      tag: 'Advanced Math & Code',
      tier: 'flagship',
    };
  }
  if (lower.includes('o1') || lower.includes('gpt-4')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'OpenAI',
      contextWindow: '128k',
      tag: 'Omni Reasoning & Logic',
      tier: 'flagship',
    };
  }
  if (lower.includes('qwen') || lower.includes('llama') || lower.includes('mistral')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Open Weights',
      contextWindow: '128k',
      tag: 'Open-Source Architecture',
      tier: 'standard',
    };
  }
  if (lower.includes('free') || lower.includes('space-bunny') || lower.includes('longcat') || lower.includes('mimo')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'OpenCode Free',
      contextWindow: '128k',
      tag: 'Community Free Model',
      tier: 'free',
    };
  }

  // 4. Safe fallback
  return {
    id: modelId,
    name: formatModelName(modelId),
    provider: 'AI Provider',
    contextWindow: '128k',
    tag: 'General Intelligence',
  };
}

/**
 * Standard complete pool of models to offer when engine doesn't report its own
 */
export function getStandardModelCatalog(): string[] {
  return Object.keys(KNOWN_MODELS);
}
