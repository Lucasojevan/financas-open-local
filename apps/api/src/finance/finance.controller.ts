import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type UserRequest } from '../auth/session.guard.js';
import { FinanceService } from './finance.service.js';
@Controller('finance')
@UseGuards(SessionGuard)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}
  @Get() snapshot(@Req() req: UserRequest) { return this.service.snapshot(req.userId); }
  @Post('accounts') account(@Req() req: UserRequest, @Body() body: unknown) { return this.service.account(req.userId, body); }
  @Patch('accounts/:id') editAccount(@Req() req: UserRequest, @Body() body: unknown, @Param('id', ParseUUIDPipe) id: string) { return this.service.account(req.userId, body, id); }
  @Post('cards') card(@Req() req: UserRequest, @Body() body: unknown) { return this.service.card(req.userId, body); }
  @Patch('cards/:id') editCard(@Req() req: UserRequest, @Body() body: unknown, @Param('id', ParseUUIDPipe) id: string) { return this.service.card(req.userId, body, id); }
  @Post('categories') category(@Req() req: UserRequest, @Body() body: unknown) { return this.service.category(req.userId, body); }
  @Patch('categories/:id') editCategory(@Req() req: UserRequest, @Body() body: unknown, @Param('id', ParseUUIDPipe) id: string) { return this.service.category(req.userId, body, id); }
  @Post('transactions') transaction(@Req() req: UserRequest, @Body() body: unknown) { return this.service.transaction(req.userId, body); }
  @Patch('transactions/:id') editTransaction(@Req() req: UserRequest, @Body() body: unknown, @Param('id', ParseUUIDPipe) id: string) { return this.service.transaction(req.userId, body, id); }
  @Post('payables') payable(@Req() req: UserRequest, @Body() body: unknown) { return this.service.payable(req.userId, body); }
  @Patch('payables/installments/:id') payment(@Req() req: UserRequest, @Body() body: unknown, @Param('id', ParseUUIDPipe) id: string) { return this.service.payment(req.userId, id, body); }
  @Delete(':kind/:id') remove(@Req() req: UserRequest, @Param('kind') kind: string, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(req.userId, kind, id); }
}
