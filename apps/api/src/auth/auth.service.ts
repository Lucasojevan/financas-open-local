import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash(randomBytes(32), { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
  constructor(private readonly prisma: PrismaService) {}

  async setup(email: string, password: string): Promise<void> {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(732910)`;
      if (await tx.user.count()) throw new ConflictException('Configuração inicial já concluída');
      await tx.user.create({ data: { email: email.toLowerCase(), passwordHash } });
    });
  }

  async login(email: string, password: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const valid = await argon2.verify(user?.passwordHash ?? await this.dummyHash, password);
    if (!user || user.deletedAt || !valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const hours = Number(process.env.SESSION_TTL_HOURS ?? 12);
    const expiresAt = new Date(Date.now() + hours * 3_600_000);
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, { userId: user.id, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }] } }),
      this.prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entityType: 'session' } });
    return { token, expiresAt };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.session.deleteMany({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });
  }
  async status() { return { configured: (await this.prisma.user.count()) > 0 }; }
  async me(userId: string) { return this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, id: true } }); }
  async changePassword(userId: string, current: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!await argon2.verify(user.passwordHash, current)) throw new UnauthorizedException('Senha atual incorreta.');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }), this.prisma.session.deleteMany({ where: { userId } })]);
    return { ok: true };
  }
}
