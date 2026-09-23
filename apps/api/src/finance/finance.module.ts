import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionGuard } from '../auth/session.guard.js';
import { FinanceController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';
import { ConnectionsController } from '../connections/connections.controller.js';
import { PluggyService } from '../connections/pluggy.service.js';
import { PluggyWebhookController } from '../connections/webhook.controller.js';
@Module({ controllers: [FinanceController, ConnectionsController, PluggyWebhookController], providers: [PrismaService, SessionGuard, FinanceService, PluggyService] })
export class FinanceModule {}
