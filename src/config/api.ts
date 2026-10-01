/**
 * Kiranape Central API Configuration
 * Production Backend: https://kiranape-store.onrender.com
 * Direct Store Owner Admin URL: https://kiranape-store.onrender.com/#admin
 */

export const API_BASE_URL = 'https://kiranape-store.onrender.com';

/**
 * Normalizes API endpoint paths with the production backend base URL.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
