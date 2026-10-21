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
  'opencode/minimax-m3.1-flash-free': {
    id: 'opencode/minimax-m3.1-flash-free',
    name: 'MiniMax M3.1 Flash',
    provider: 'MiniMax',
    contextWindow: '1M',
    tag: 'Ultra-Long 1M Context & Fast Execution',
    tier: 'free',
  },
  'opencode/beam-free': {
    id: 'opencode/beam-free',
    name: 'Beam Free',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'Lightweight Fast Automation',
    tier: 'free',
  },
  'opencode/big-pickle': {
    id: 'opencode/big-pickle',
    name: 'Big Pickle',
    provider: 'OpenCode Free',
    contextWindow: '128k',
    tag: 'High-Capacity Free Model',
    tier: 'free',
  },
  'opencode/nemotron-3.5-lightning-free': {
    id: 'opencode/nemotron-3.5-lightning-free',
    name: 'Nemotron 3.5 Lightning',
    provider: 'NVIDIA',
    contextWindow: '128k',
    tag: 'NVIDIA Lightning Inference',
    tier: 'free',
  },
  'opencode/nemotron-3.5-super-vl-free': {
    id: 'opencode/nemotron-3.5-super-vl-free',
    name: 'Nemotron 3.5 Super VL',
    provider: 'NVIDIA',
    contextWindow: '128k',
    tag: 'NVIDIA Vision-Language Model',
    tier: 'free',
  },
  'opencode/longcat-2.5-preview-free': {
    id: 'opencode/longcat-2.5-preview-free',
    name: 'LongCat 2.5 Preview',
    provider: 'Meituan',
    contextWindow: '1M',
    tag: '1M Tokens Long-Context Reasoning',
    tier: 'free',
  },
  'deepseek/deepseek-flash': {
    id: 'deepseek/deepseek-flash',
    name: 'DeepSeek Flash',
    provider: 'DeepSeek',
    contextWindow: '128k',
    tag: 'Ultra-Fast Architecture & Coding',
    tier: 'standard',
  },
  'deepseek/deepseek-v4-pro': {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek v4 Pro',
    provider: 'DeepSeek',
    contextWindow: '128k',
    tag: 'Advanced SOTA Code Synthesis',
    tier: 'flagship',
  },
  'gemini-2.0-flash-exp': {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash Exp',
    provider: 'Google',
    contextWindow: '1M',
    tag: 'Next-Gen 1M Multimodal & Speed',
    tier: 'flagship',
  },
  'gemini-2.0-flash-thinking-exp': {
    id: 'gemini-2.0-flash-thinking-exp',
    name: 'Gemini 2.0 Flash Thinking',
    provider: 'Google',
    contextWindow: '1M',
    tag: 'Deep Reasoning 1M Context Window',
    tier: 'flagship',
  },
  'claude-3-7-sonnet': {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    contextWindow: '200k',
    tag: 'Hybrid Thinking & Agentic Coding',
    tier: 'flagship',
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
  if (!modelId) return 'Default Model';
  // Strip trailing :free or -free
  const clean = modelId.replace(/:free$/i, '').replace(/-free$/i, '');
  // Strip provider prefix if present
  const parts = clean.split('/');
  const base = parts[parts.length - 1] || clean;
  return base
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower === 'minimax') return 'MiniMax';
      if (lower === 'deepseek') return 'DeepSeek';
      if (['gpt', 'glm', 'cot', 'ai', 'vl', 'r1', 'v3', 'v4', 'm3.1', 'm3'].includes(lower)) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

/**
 * Resilient, universal metadata resolver with smart context window extraction
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

  // 2. Normalized lowercase & stripped match
  const lower = modelId.toLowerCase().replace(/:free$/i, '');
  for (const [key, meta] of Object.entries(KNOWN_MODELS)) {
    const normKey = key.toLowerCase();
    if (lower === normKey || lower.endsWith(`/${normKey}`) || normKey.endsWith(`/${lower}`)) {
      return { ...meta, id: modelId };
    }
  }

  // 3. Dynamic token pattern extraction from model name/ID (e.g. "2m", "1m", "200k", "128k", "64k")
  const tokenMatch = lower.match(/(?:^|[^a-z0-9])(\d+)(k|m)(?:$|[^a-z0-9])/i);
  let detectedContext: string | undefined;
  if (tokenMatch && tokenMatch[1] && tokenMatch[2]) {
    const num = tokenMatch[1];
    const unit = tokenMatch[2].toUpperCase();
    detectedContext = `${num}${unit === 'M' ? 'M' : 'k'}`;
  }

  // 4. Heuristic pattern matching based on provider/family
  if (lower.includes('gemini-1.5-pro') || lower.includes('gemini-2.0-pro') || lower.includes('gemini-2.5-pro')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Google',
      contextWindow: detectedContext || '2M',
      tag: 'Ultra-Long 2M Tokens Repo Context',
      tier: 'flagship',
    };
  }
  if (lower.includes('gemini')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Google',
      contextWindow: detectedContext || '1M',
      tag: '1M Tokens Multimodal & Speed',
      tier: 'standard',
    };
  }
  if (lower.includes('minimax') || lower.includes('m3.1')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'MiniMax',
      contextWindow: detectedContext || '1M',
      tag: 'Ultra-Long 1M Context Window',
      tier: 'free',
    };
  }
  if (lower.includes('longcat')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Meituan',
      contextWindow: detectedContext || '1M',
      tag: '1M Long Context Reasoning',
      tier: 'free',
    };
  }
  if (lower.includes('claude') || lower.includes('sonnet') || lower.includes('haiku') || lower.includes('opus')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Anthropic',
      contextWindow: detectedContext || '200k',
      tag: 'SOTA Coding & Tool Use',
      tier: 'flagship',
    };
  }
  if (lower.includes('o3')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'OpenAI',
      contextWindow: detectedContext || '200k',
      tag: 'Advanced Math & Code',
      tier: 'flagship',
    };
  }
  if (lower.includes('o1') || lower.includes('gpt-4')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'OpenAI',
      contextWindow: detectedContext || '128k',
      tag: 'Omni Reasoning & Logic',
      tier: 'flagship',
    };
  }
  if (lower.includes('deepseek-r1') || lower.includes('reasoner')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'DeepSeek',
      contextWindow: detectedContext || '128k',
      tag: 'Deep Reasoning CoT',
      tier: 'flagship',
    };
  }
  if (lower.includes('deepseek')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'DeepSeek',
      contextWindow: detectedContext || '128k',
      tag: 'High-Speed Coding & Logic',
      tier: 'flagship',
    };
  }
  if (lower.includes('qwen')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Alibaba',
      contextWindow: detectedContext || '128k',
      tag: 'Open-Weights Coding Champion',
      tier: 'standard',
    };
  }
  if (lower.includes('glm')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Zhipu AI',
      contextWindow: detectedContext || '128k',
      tag: 'High Concurrency Coding',
      tier: 'free',
    };
  }
  if (lower.includes('nemotron')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'NVIDIA',
      contextWindow: detectedContext || '128k',
      tag: 'NVIDIA Hardware Accelerated',
      tier: 'free',
    };
  }
  if (lower.includes('codestral') || lower.includes('mistral')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Mistral AI',
      contextWindow: detectedContext || (lower.includes('codestral') ? '256k' : '128k'),
      tag: 'Fast Code Generation',
      tier: 'standard',
    };
  }
  if (lower.includes('llama')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'Meta',
      contextWindow: detectedContext || '128k',
      tag: 'Open-Source Architecture',
      tier: 'standard',
    };
  }
  if (lower.includes('free') || lower.includes('space-bunny') || lower.includes('beam') || lower.includes('mimo')) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: 'OpenCode Free',
      contextWindow: detectedContext || '128k',
      tag: 'Community Free Model',
      tier: 'free',
    };
  }

  // 5. Safe fallback
  return {
    id: modelId,
    name: formatModelName(modelId),
    provider: 'AI Provider',
    contextWindow: detectedContext || '128k',
    tag: 'General Intelligence',
  };
}

/**
 * Standard complete pool of models to offer when engine doesn't report its own
 */
export function getStandardModelCatalog(): string[] {
  return Object.keys(KNOWN_MODELS);
}
