import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { parse } from '../finance/validation.js';
import { SessionGuard, type UserRequest } from './session.guard.js';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, SetupDto } from './dto.js';

function cookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(';').map((part) => part.trim().split('=')).find(([key]) => key === name)?.[1];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('setup')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async setup(@Body() body: SetupDto): Promise<{ ok: true }> {
    await this.auth.setup(body.email, body.password);
    return { ok: true };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ ok: true }> {
    const session = await this.auth.login(body.email, body.password);
    res.cookie(process.env.SESSION_COOKIE_NAME ?? 'financas_session', session.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000').protocol === 'https:',
      priority: 'high',
      expires: session.expiresAt,
      path: '/',
    });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const name = process.env.SESSION_COOKIE_NAME ?? 'financas_session';
    await this.auth.logout(cookie(req, name));
    res.clearCookie(name, { httpOnly: true, sameSite: 'strict', path: '/' });
  }

  @Get('status')
  status() { return this.auth.status(); }
  @Get('me') @UseGuards(SessionGuard)
  me(@Req() req: UserRequest) { return this.auth.me(req.userId); }
  @Post('password') @UseGuards(SessionGuard)
  password(@Req() req: UserRequest, @Body() body: unknown) {
    const data = parse(z.object({ current: z.string().min(1).max(128), password: z.string().min(12).max(128) }), body);
    return this.auth.changePassword(req.userId, data.current, data.password);
  }
}
