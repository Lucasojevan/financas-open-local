import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type UserRequest } from '../auth/session.guard.js';
import { PluggyService } from './pluggy.service.js';

@Controller('connections')
@UseGuards(SessionGuard)
export class ConnectionsController {
  constructor(private readonly pluggy: PluggyService) {}
  @Get('config') config() { return this.pluggy.config(); }
  @Post('pluggy/token') token(@Req() req: UserRequest, @Body() body: { itemId?: string }) { return this.pluggy.token(req.userId, body?.itemId); }
  @Post('pluggy/item') item(@Req() req: UserRequest, @Body() body: { itemId?: string }) { if (!body?.itemId) throw new Error('itemId obrigatório'); return this.pluggy.attach(req.userId, body.itemId); }
  @Post('sync-all') syncAll(@Req() req: UserRequest) { return this.pluggy.requestSyncAll(req.userId); }
  @Post(':id/sync') sync(@Req() req: UserRequest, @Param('id', ParseUUIDPipe) id: string) { return this.pluggy.requestSync(req.userId, id); }
  @Delete(':id') disconnect(@Req() req: UserRequest, @Param('id', ParseUUIDPipe) id: string) { return this.pluggy.disconnect(req.userId, id); }
}
