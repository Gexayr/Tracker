import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import type { Response } from 'express';

class RegisterDto {
  email: string;
  password: string;
  name?: string | null;
}

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: any) {
    return { userId: req.user.sub, email: req.user.email };
  }

  @Post('google')
  google(@Body() body: { idToken: string }) {
    return this.authService.googleLogin(body.idToken);
  }

  // Server-side OAuth flow (Passport Google OAuth 2.0)
  // Step 1: Redirect user to Google consent screen
  @Get('google/oauth')
  @UseGuards(AuthGuard('google'))
  async googleOAuth() {
    // Guard handles redirect
    return;
  }

  // Step 2: Google redirects back to our callback URL
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleOAuthCallback(@Req() req: any, @Res() res: Response) {
    // google.strategy.ts sets req.user = { user, access_token, storage }
    const payload = req.user;

    // Optional: if FRONTEND_REDIRECT_URL is set, redirect to the frontend with token in the URL fragment
    const frontendRedirect = process.env.FRONTEND_REDIRECT_URL;
    if (frontendRedirect) {
      const url = new URL(frontendRedirect);
      // Put only the access token in the fragment; avoid leaking user/storage in query params
      url.hash = `access_token=${encodeURIComponent(payload?.access_token ?? '')}`;
      return res.redirect(url.toString());
    }

    // Otherwise, respond with JSON (useful for testing via curl/Postman)
    return res.json(payload);
  }
}
