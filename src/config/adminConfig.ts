/**
 * Master Admin Secret PIN Configuration
 * Hardcoded centrally in code so it can only be modified directly inside the codebase.
 */
export const ADMIN_SECRET_PIN = '2508';

/**
 * Checks if the provided input matches the secret admin PIN (with or without @ prefix)
 */
export function isMasterAdminPin(input: string): boolean {
  if (!input) return false;
  const clean = input.trim();
  return clean === ADMIN_SECRET_PIN || clean === `@${ADMIN_SECRET_PIN}`;
}
