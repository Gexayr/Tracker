import { Logger } from '@nestjs/common';

const FALLBACK_SECRET = 'dev_secret_change_me';
const KNOWN_DEFAULTS = new Set([
  FALLBACK_SECRET,
  'change_this_in_prod',
  'changeme',
  'secret',
]);

let cached: string | undefined;

/**
 * Single source of truth for the JWT signing secret (used by JwtModule and
 * JwtStrategy). Logs a loud warning when it is missing or a known default.
 */
export function getJwtSecret(): string {
  if (cached !== undefined) return cached;
  const fromEnv = (process.env.JWT_SECRET ?? '').trim();
  const logger = new Logger('JwtSecret');
  if (!fromEnv) {
    logger.error(
      '!!! JWT_SECRET is not set. Falling back to an insecure built-in secret. ' +
        'Anyone can forge tokens. Set JWT_SECRET in the environment. !!!',
    );
    cached = FALLBACK_SECRET;
  } else {
    if (KNOWN_DEFAULTS.has(fromEnv)) {
      logger.error(
        '!!! JWT_SECRET is set to a well-known default value. Anyone can forge tokens. ' +
          'Set a long random JWT_SECRET. !!!',
      );
    } else if (fromEnv.length < 16) {
      logger.warn(
        'JWT_SECRET is shorter than 16 characters; use a longer random value.',
      );
    }
    cached = fromEnv;
  }
  return cached;
}
