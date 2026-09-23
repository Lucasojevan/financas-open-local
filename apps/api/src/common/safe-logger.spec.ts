import { describe, expect, it } from 'vitest';
import { redact } from './safe-logger.js';

describe('redact', () => {
  it('remove segredos inclusive em objetos aninhados', () => {
    expect(redact({ event: 'sync', authorization: 'Bearer secret', nested: { refreshToken: 'secret', count: 2 } }))
      .toEqual({ event: 'sync', authorization: '[REDACTED]', nested: { refreshToken: '[REDACTED]', count: 2 } });
  });
});
