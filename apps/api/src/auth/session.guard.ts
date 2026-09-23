import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

export type UserRequest = Request & { userId: string };
export function sessionToken(req: Request): string | undefined {
  const name = process.env.SESSION_COOKIE_NAME ?? 'financas_session';
  return req.headers.cookie?.split(';').map(p => p.trim()).find(p => p.startsWith(`${name}=`))?.slice(name.length + 1);
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<UserRequest>();
    const token = sessionToken(req);
    if (!token) throw new UnauthorizedException('Entre para continuar.');
    const session = await this.prisma.session.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.user.deletedAt) throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    req.userId = session.userId;
    return true;
  }
}
