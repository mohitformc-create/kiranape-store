/**
 * Kiranape Central API Configuration
 * Supports:
 * 1. Same-origin backend (AI Studio preview dev/prod, localhost, Render single-service)
 * 2. Dedicated remote Render backend when on custom domains
 */

const getInitialBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If the browser is running on the app's own web origin (including AI Studio preview domains .run.app, localhost, or onrender)
    // Same-origin relative calls (/api/...) always succeed directly on server.ts express endpoints without CORS or cold-start timeouts.
    return '';
  }
  return 'https://kiranape-store.onrender.com';
};

export const API_BASE_URL = getInitialBaseUrl();

/**
 * Normalizes API endpoint paths with the production backend base URL.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}


