import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class OriginMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method)) return next();
    // Server-to-server endpoint authenticates its own secret header.
    if (req.path === '/webhooks/pluggy') return next();
    const allowed = new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000').origin;
    const origin = req.get('origin');
    const localAlias = allowed === 'http://localhost:3000' && origin === 'http://127.0.0.1:3000';
    if (!origin || (origin !== allowed && !localAlias)) throw new ForbiddenException('Origem não permitida');
    next();
  }
}
