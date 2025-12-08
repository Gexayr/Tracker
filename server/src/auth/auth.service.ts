import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: { email: string; password: string; name?: string | null }) {
    const user = await this.usersService.create({
      email: input.email,
      password: input.password,
      name: input.name ?? null,
    });
    const token = await this.signToken(user.id, user.email);
    return { user, access_token: token };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const { passwordHash: _, ...safe } = user as any;
    const token = await this.signToken(user.id, user.email);
    return { user: safe, access_token: token };
  }

  async signToken(sub: number, email: string) {
    const payload = { sub, email };
    return await this.jwtService.signAsync(payload);
  }

  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
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
    return { user, access_token: token };
  }
}
