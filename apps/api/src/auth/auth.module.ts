import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionGuard } from './session.guard.js';

@Module({ controllers: [AuthController], providers: [AuthService, PrismaService, SessionGuard] })
export class AuthModule {}
