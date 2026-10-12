import {
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * AuthGuard('google') that maps passport/OAuth errors (bad or reused `code`,
 * token exchange failures) to 401 instead of a generic 500.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleOAuthGuard.name);

  handleRequest<TUser = any>(err: unknown, user: TUser): TUser {
    if (err instanceof HttpException) throw err;
    if (err || !user) {
      if (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        this.logger.warn(`Google OAuth failed: ${msg}`);
      }
      throw new UnauthorizedException('Google sign-in failed');
    }
    return user;
  }
}
