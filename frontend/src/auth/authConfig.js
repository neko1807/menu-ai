export const AUTH_TOKEN_KEY = 'menu-ai-auth-token';

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    if (configuredUrl) {
      return configuredUrl.replace(/\/$/, '');
    }
    return 'http://localhost:3000';
  }

  return window.location.origin.replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
