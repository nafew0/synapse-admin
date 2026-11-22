export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:3080';
}

/** Server-to-server API URL. Falls back to getApiBaseUrl() if API_SERVER_URL is not set. */
export function getServerApiUrl(): string {
  if (typeof process !== 'undefined' && process.env?.API_SERVER_URL) {
    return process.env.API_SERVER_URL;
  }
  return getApiBaseUrl();
}

const DEFAULT_BDREN_ADMIN_URL = 'https://bdren.ai/admin';

/** Where institutions and invitations are managed. Read at request time, so it follows the deployment env. */
export function getBdrenAdminUrl(): string {
  const configured = typeof process !== 'undefined' ? process.env?.BDREN_ADMIN_URL?.trim() : '';
  return configured || DEFAULT_BDREN_ADMIN_URL;
}
