import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
}
export const money = z.coerce.number().finite().min(-999999999).max(999999999).transform(n => Math.round(n * 100) / 100);
export const accountInput = z.object({ name: z.string().trim().min(2).max(120), institution: z.string().trim().min(2).max(120), balance: money, type: z.enum(['CHECKING', 'SAVINGS', 'PAYMENT', 'OTHER']).default('CHECKING') });
export const cardInput = z.object({ name: z.string().trim().min(2).max(120), institution: z.string().trim().min(2).max(120), lastFour: z.string().regex(/^\d{4}$/), limit: money.refine(n => n >= 0), dueDay: z.coerce.number().int().min(1).max(28), closeDay: z.coerce.number().int().min(1).max(28) });
export const transactionInput = z.object({ description: z.string().trim().min(2).max(500), accountId: z.string().uuid(), categoryId: z.string().uuid().nullable(), amount: money.refine(n => n > 0, 'Informe um valor maior que zero.'), type: z.enum(['CREDIT','DEBIT']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s), 'Data inválida.') });
export const categoryInput = z.object({ name: z.string().trim().min(2).max(80), budget: money.refine(n => n >= 0) });
export const payableInput = z.object({ title: z.string().trim().min(2).max(160), payee: z.string().trim().max(160).optional().default(''), totalAmount: money.refine(n => n > 0), installmentCount: z.coerce.number().int().min(1).max(360), firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)), 'Data inválida.'), frequency: z.enum(['WEEKLY','MONTHLY','BIMONTHLY','QUARTERLY','YEARLY']).default('MONTHLY'), categoryId: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().optional()), notes: z.string().trim().max(1000).optional().default('') });
export const paymentInput = z.object({ paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)), 'Data inválida.'), paid: z.boolean().default(true) });
