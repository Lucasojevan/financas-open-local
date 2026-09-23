import { BadRequestException, Body, Controller, Headers, HttpCode, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { PluggyService } from './pluggy.service.js';

@Controller('webhooks/pluggy')
export class PluggyWebhookController {
  constructor(private readonly pluggy: PluggyService) {}
  @Post()
  @HttpCode(202)
  async receive(@Headers('x-pluggy-webhook-secret') secret: string | undefined, @Body() event: { event?: string; eventId?: string; itemId?: string }) {
    const expected = process.env.PLUGGY_WEBHOOK_SECRET;
    if (!expected) throw new ServiceUnavailableException('Webhook não configurado.');
    const supplied = Buffer.from(secret ?? '');
    const configured = Buffer.from(expected);
    if (supplied.length !== configured.length || !timingSafeEqual(supplied, configured)) throw new UnauthorizedException('Assinatura inválida.');
    const allowed = new Set(['item/created', 'item/updated', 'item/error', 'item/deleted']);
    if (!event?.eventId || event.eventId.length > 255 || !event.itemId || event.itemId.length > 255 || !event.event || !allowed.has(event.event)) throw new BadRequestException('Evento inválido.');
    await this.pluggy.enqueue(event.eventId, event.event, event.itemId);
    return { received: true };
  }
}
