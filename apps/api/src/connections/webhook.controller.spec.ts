import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PluggyWebhookController } from './webhook.controller.js';

describe('PluggyWebhookController', () => {
  const previous = process.env.PLUGGY_WEBHOOK_SECRET;
  afterEach(() => {
    if (previous === undefined) delete process.env.PLUGGY_WEBHOOK_SECRET;
    else process.env.PLUGGY_WEBHOOK_SECRET = previous;
  });

  it('recusa webhook quando o segredo não está configurado', async () => {
    delete process.env.PLUGGY_WEBHOOK_SECRET;
    const controller = new PluggyWebhookController({ enqueue: vi.fn() } as never);
    await expect(controller.receive(undefined, {})).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('recusa segredo incorreto e evento desconhecido', async () => {
    process.env.PLUGGY_WEBHOOK_SECRET = 'segredo-com-mais-de-16';
    const controller = new PluggyWebhookController({ enqueue: vi.fn() } as never);
    await expect(controller.receive('incorreto', {})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.receive(process.env.PLUGGY_WEBHOOK_SECRET, { event: 'unknown', eventId: '1', itemId: '2' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enfileira apenas evento autenticado e permitido', async () => {
    process.env.PLUGGY_WEBHOOK_SECRET = 'segredo-com-mais-de-16';
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const controller = new PluggyWebhookController({ enqueue } as never);
    await expect(controller.receive(process.env.PLUGGY_WEBHOOK_SECRET, { event: 'item/updated', eventId: 'evt', itemId: 'item' })).resolves.toEqual({ received: true });
    expect(enqueue).toHaveBeenCalledWith('evt', 'item/updated', 'item');
  });
});
