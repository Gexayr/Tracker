import {
  Injectable,
  NotFoundException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { SafeUser, toSafeUser, UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClientId = (process.env.GOOGLE_CLIENT_ID ?? '').trim();
  private readonly googleClient = new OAuth2Client(
    this.googleClientId || undefined,
  );

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  private async buildAuthResponse(user: SafeUser) {
    const access_token = await this.signToken(user.id, user.email);
    const storage = await this.storageService.ensureCurrentMonth(user.id);
    return { user, access_token, storage };
  }

  async register(input: {
    email: string;
    password: string;
    name?: string | null;
  }) {
    const user = await this.usersService.create({
      email: input.email,
      password: input.password,
      name: input.name ?? null,
    });
    return this.buildAuthResponse(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.passwordHash) {
      // Account was created via Google sign-in and has no password.
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please continue with Google.',
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.buildAuthResponse(toSafeUser(user));
  }

  async getProfile(userId: number, email: string) {
    const user = await this.usersService.findById(userId);
    // Keep the old shape working even if the row is somehow gone.
    if (!user)
      return { userId, email, name: null, locale: null, hasPassword: false };
    return {
      userId: user.id,
      email: user.email,
      name: user.name ?? null,
      locale: user.locale ?? null,
      hasPassword: !!user.passwordHash,
    };
  }

  async updateProfile(
    userId: number,
    email: string,
    patch: { locale?: string },
  ) {
    const updated = await this.usersService.updatePreferences(userId, patch);
    if (!updated) throw new NotFoundException('User not found');
    return this.getProfile(userId, email);
  }

  async signToken(sub: number, email: string) {
    return this.jwtService.signAsync({ sub, email });
  }

  /**
   * Permanently deletes the account and every month of habit data with it
   * (cascades via the DB foreign key — see `UsersService.deleteById`). A
   * password account must confirm with its current password first, since
   * this is irreversible; a Google-only account has nothing to check it
   * against, so the caller's JWT is treated as sufficient proof.
   */
  async deleteAccount(userId: number, password?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.passwordHash) {
      if (!password) {
        throw new UnauthorizedException(
          'Enter your password to delete your account',
        );
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Incorrect password');
    }
    await this.usersService.deleteById(userId);
  }

  /** Shared by POST /auth/google and the passport server-side OAuth callback. */
  async oauthLogin(email: string, name?: string | null) {
    const user = await this.usersService.upsertOAuthUser(email, name ?? null);
    return this.buildAuthResponse(user);
  }

  async googleLogin(idToken: string) {
    if (!this.googleClientId) {
      this.logger.error(
        'POST /auth/google called but GOOGLE_CLIENT_ID is not configured',
      );
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on the server',
      );
    }
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch (e) {
      this.logger.warn(
        `Google ID token verification failed: ${(e as Error)?.message ?? e}`,
      );
      throw new UnauthorizedException('Invalid Google token');
    }
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google account email is not verified');
    }
    return this.oauthLogin(payload.email, payload.name ?? null);
  }
}
