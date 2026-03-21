const rawAuthMode = (import.meta.env.VITE_AUTH_MODE || 'api_key').toLowerCase();

export const AUTH_MODE = rawAuthMode === 'jwt' ? 'jwt' : 'api_key';
export const IS_API_KEY_AUTH = AUTH_MODE === 'api_key';

export const API_KEY_HEADER = import.meta.env.VITE_API_KEY_HEADER || 'X-API-Key';
export const API_KEY_PREFIX = import.meta.env.VITE_API_KEY_PREFIX || '';

export function formatApiKeyHeaderValue(apiKey: string): string {
  if (!API_KEY_PREFIX) return apiKey;
  return `${API_KEY_PREFIX} ${apiKey}`;
}

