import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import type { Request } from 'express';
import { AuthService } from './auth.service';

const PLACEHOLDER = 'not-configured';

function readGoogleConfig() {
  const clientID = (process.env.GOOGLE_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
  const callbackURL = (process.env.GOOGLE_CALLBACK_URL ?? '').trim();
  const missing = [
    !clientID && 'GOOGLE_CLIENT_ID',
    !clientSecret && 'GOOGLE_CLIENT_SECRET',
    !callbackURL && 'GOOGLE_CALLBACK_URL',
  ].filter(Boolean) as string[];
  return { clientID, clientSecret, callbackURL, missing };
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger('GoogleOAuth');
  private readonly configured: boolean;

  constructor(private readonly authService: AuthService) {
    const cfg = readGoogleConfig();
    // Never crash the whole API on missing Google config: construct with
    // placeholders and refuse the OAuth routes at request time instead.
    super({
      clientID: cfg.clientID || PLACEHOLDER,
      clientSecret: cfg.clientSecret || PLACEHOLDER,
      callbackURL: cfg.callbackURL || 'http://localhost/auth/google/callback',
      scope: ['openid', 'email', 'profile'],
      passReqToCallback: false,
    });
    this.configured = cfg.missing.length === 0;
    if (this.configured) {
      const cidTail =
        cfg.clientID.length > 10 ? cfg.clientID.slice(-10) : cfg.clientID;
      this.logger.log(
        `Strategy configured. callbackURL=${cfg.callbackURL} clientID=…${cidTail}`,
      );
    } else {
      this.logger.warn(
        `Google OAuth server flow disabled; missing env: ${cfg.missing.join(', ')}. ` +
          '/auth/google/oauth and /auth/google/callback will return 503.',
      );
    }
  }

  authenticate(req: Request, options?: any) {
    if (!this.configured) {
      return this.error(
        new ServiceUnavailableException(
          'Google sign-in is not configured on the server',
        ),
      );
    }
    return super.authenticate(req, options);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || null;
      if (!email)
        return done(new Error('Google profile has no email'), undefined);
      const result = await this.authService.oauthLogin(email, name);
      return done(null, result);
    } catch (e) {
      return done(e as Error, undefined);
    }
  }
}
