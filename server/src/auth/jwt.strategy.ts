import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from './jwt-secret';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: { sub: number; email: string; iat?: number }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    if (user.sessionsValidAfter) {
      // iat has 1s resolution; compare at that resolution so a token issued in
      // the same request that revoked the old ones stays valid.
      const cutoff = Math.floor(user.sessionsValidAfter.getTime() / 1000);
      if ((payload.iat ?? 0) < cutoff) throw new UnauthorizedException();
    }
    // Attach to request.user
    return { sub: payload.sub, email: payload.email };
  }
}
