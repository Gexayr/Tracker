import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  private async getCurrentStorage(userId: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const record = await this.storageService.getForUser(userId, year, month);

    // Initialize only when there is no record or payload is missing.
    // Do NOT overwrite when payload exists but is an empty object/array — that might be a legitimate saved state.
    const noPayload = record?.payload == null || typeof record?.payload !== 'object';
    const payloadMissingCore = !noPayload && (
      typeof record?.payload?.habits === 'undefined' || typeof record?.payload?.data === 'undefined'
    );
    if (!record || noPayload || payloadMissingCore) {
      // Auto-create default info for new/empty users
      const defaultHabits = [
        { id: 1, name: 'Meditation', color: '#8ecae6' },
        { id: 2, name: 'Workout', color: '#219ebc' },
        { id: 3, name: 'Read 30 min', color: '#ffd166' },
        { id: 4, name: 'No sugar', color: '#06d6a0' },
      ];
      const initData: Record<number, Record<number, boolean>> = {} as any;
      defaultHabits.forEach(h => (initData[h.id] = {}));
      const created = await this.storageService.upsertForUser(userId, {
        year,
        month,
        payload: { habits: defaultHabits, data: initData, chartType: 'line' },
      } as any);
      return { id: created.id, year: created.year, month: created.month, payload: created.payload };
    }
    return { id: record.id, year: record.year, month: record.month, payload: record.payload };
  }

  async register(input: { email: string; password: string; name?: string | null }) {
    const user = await this.usersService.create({
      email: input.email,
      password: input.password,
      name: input.name ?? null,
    });
    const token = await this.signToken(user.id, user.email);
    const storage = await this.getCurrentStorage(user.id);
    return { user, access_token: token, storage };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const { passwordHash: _, ...safe } = user as any;
    const token = await this.signToken(user.id, user.email);
    const storage = await this.getCurrentStorage(user.id);
    return { user: safe, access_token: token, storage };
  }

  async signToken(sub: number, email: string) {
    const payload = { sub, email };
    return await this.jwtService.signAsync(payload);
  }

  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }
    const email = payload.email;
    const name = payload.name ?? null;
    const user = await this.usersService.upsertOAuthUser(email, name);
    const token = await this.signToken(user.id, user.email);
    const storage = await this.getCurrentStorage(user.id);
    return { user, access_token: token, storage };
  }
}
