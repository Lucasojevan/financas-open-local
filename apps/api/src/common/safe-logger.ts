const SENSITIVE_KEYS = /authorization|cookie|token|secret|password|pin|cvv|client_secret/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redact(item)]),
    );
  }
  return value;
}
