export const THROTTLE_TTL_MS = 60_000;
export const DEFAULT_THROTTLE_LIMIT = 300;
export const AUTH_THROTTLE_LIMIT = 10;
export const THROTTLE_MESSAGE =
  'Too many attempts. Please try again in a minute.';

/** Stricter per-IP limit for credential endpoints (login/register/google). */
export const AUTH_THROTTLE = {
  default: { limit: AUTH_THROTTLE_LIMIT, ttl: THROTTLE_TTL_MS },
};
