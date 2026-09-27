import { resolveSyncHttpUrl } from './sync';

export type AiModelsResponse = {
  models: string[];
  default: string;
  configured: boolean;
};

/** Curated fallback when the server list is unreachable (offline rooms). */
export const FALLBACK_AI_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'o4-mini',
  'gpt-4.1-mini',
];

const MODELS_STORAGE_KEY = 'eunoia:ai-model';

export function loadPreferredModel(): string | null {
  try {
    const stored = window.localStorage.getItem(MODELS_STORAGE_KEY);
    return stored && stored.trim() ? stored : null;
  } catch {
    return null;
  }
}

export function storePreferredModel(model: string): void {
  try {
    window.localStorage.setItem(MODELS_STORAGE_KEY, model);
  } catch {
    // Preference persistence is best-effort.
  }
}

/**
 * Fetch the server-advertised model list (`GET /api/ai/models`). Falls back
 * to the curated list when offline or unconfigured — generation itself will
 * still 503 without `AI_API_KEY`, surfaced at generate time.
 */
export async function fetchAiModels(): Promise<AiModelsResponse> {
  const fallback: AiModelsResponse = {
    models: [...FALLBACK_AI_MODELS],
    default: FALLBACK_AI_MODELS[0],
    configured: false,
  };
  const baseUrl = resolveSyncHttpUrl();
  if (!baseUrl) return fallback;
  try {
    const response = await fetch(`${baseUrl}/api/ai/models`);
    if (!response.ok) return fallback;
    const body = (await response.json()) as Partial<AiModelsResponse>;
    if (!Array.isArray(body.models) || body.models.length === 0) {
      return fallback;
    }
    const models = body.models
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
      .slice(0, 32);
    if (models.length === 0) return fallback;
    const fallbackDefault =
      typeof body.default === 'string' && body.default.trim()
        ? body.default
        : models[0];
    return {
      models,
      default: fallbackDefault,
      configured: body.configured === true,
    };
  } catch {
    return fallback;
  }
}
