function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const isLocalContext =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (isLocalContext) {
    return 'http://localhost:3000';
  }

  return window.location.origin.replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();
