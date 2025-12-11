import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {
    const clientID = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || '';

    // Validate required env configuration early to avoid vague "invalid_client" errors
    if (!clientID) {
      throw new Error(
        'GOOGLE_CLIENT_ID is not set. Please configure it in your environment and ensure it matches your Google Cloud OAuth client.'
      );
    }
    if (!clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_SECRET is not set. Please configure it in your environment and ensure it matches your Google Cloud OAuth client.'
      );
    }
    if (!callbackURL) {
      throw new Error(
        'GOOGLE_CALLBACK_URL is not set. Configure it in your environment and add the same value to Google Cloud Console as an Authorized redirect URI.'
      );
    }
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['openid', 'email', 'profile'],
      passReqToCallback: false,
    });

    // Safe startup log (no secrets)
    const cidTail = clientID.length > 10 ? clientID.slice(-10) : clientID;
    // eslint-disable-next-line no-console
    console.log(
      `[GoogleOAuth] Strategy configured. callbackURL=${callbackURL} clientID=…${cidTail}`,
    );
  }

  private async getCurrentStorage(userId: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const record = await this.storageService.getForUser(userId, year, month);
    // Initialize only if there's no record or payload is missing core fields.
    // Do not treat empty objects/arrays as a reason to overwrite existing user data.
    const noPayload = record?.payload == null || typeof record?.payload !== 'object';
    const payloadMissingCore = !noPayload && (
      typeof record?.payload?.habits === 'undefined' || typeof record?.payload?.data === 'undefined'
    );
    if (!record || noPayload || payloadMissingCore) {
      const defaultHabits = [
        { id: 1, name: 'Meditation', color: '#8ecae6' },
        { id: 2, name: 'Workout', color: '#219ebc' },
        { id: 3, name: 'Read 30 min', color: '#ffd166' },
        { id: 4, name: 'No sugar', color: '#06d6a0' },
      ];
      const initData: Record<number, Record<number, boolean>> = {} as any;
      defaultHabits.forEach((h) => (initData[h.id] = {}));
      const created = await this.storageService.upsertForUser(userId, {
        year,
        month,
        payload: { habits: defaultHabits, data: initData, chartType: 'line' },
      } as any);
      return { id: created.id, year: created.year, month: created.month, payload: created.payload };
    }
    return { id: record.id, year: record.year, month: record.month, payload: record.payload };
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || null;
      if (!email) return done(new Error('Google profile has no email'), undefined);

      const user = await this.usersService.upsertOAuthUser(email, name);
      const access_token = await this.jwtService.signAsync({ sub: user.id, email: user.email });
      const storage = await this.getCurrentStorage(user.id);
      return done(null, { user, access_token, storage });
    } catch (e) {
      return done(e as any, undefined);
    }
  }
}
