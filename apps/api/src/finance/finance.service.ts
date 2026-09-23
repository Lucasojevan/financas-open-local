import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { accountInput, cardInput, categoryInput, parse, payableInput, paymentInput, transactionInput } from './validation.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private readonly db: PrismaService) {}
  async snapshot(userId: string) {
    // Builds anteriores permitiam criar uma massa de demonstração. Ela nunca deve
    // aparecer junto aos dados financeiros reais, então é removida na primeira leitura.
    await this.clearDemo(userId);
    await this.clearDisconnected(userId);
    const [accounts, categories, transactions, connections, payables] = await Promise.all([
      this.db.account.findMany({ where: { userId, deletedAt: null }, include: { institution: true, cards: { where: { deletedAt: null }, include: { invoices: { orderBy: { dueDate: 'desc' } } } } }, orderBy: { createdAt: 'asc' } }),
      this.db.category.findMany({ where: { userId, deletedAt: null }, orderBy: { name: 'asc' } }),
      this.db.transaction.findMany({ where: { account: { userId, deletedAt: null }, deletedAt: null }, include: { categories: true }, orderBy: { bookedAt: 'desc' } }),
      this.db.providerConnection.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.db.payable.findMany({ where: { userId }, include: { category: true, installments: { orderBy: { number: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { accounts, categories, transactions, connections, payables };
  }
  async ownAccount(userId: string, id: string) {
    const account = await this.db.account.findFirst({ where: { id, userId, deletedAt: null } });
    if (!account) throw new NotFoundException('Conta não encontrada.');
    return account;
  }
  async institution(name: string, source = 'manual') {
    const code = `${source}:${createHash('sha256').update(name.toLowerCase()).digest('hex').slice(0,32)}`;
    return this.db.institution.upsert({ where: { code }, create: { code, name, kind: 'MANUAL', enabled: true }, update: {} });
  }
  async account(userId: string, body: unknown, id?: string) {
    const data = parse(accountInput, body);
    const institution = await this.institution(data.institution);
    if (id) {
      const old = await this.ownAccount(userId, id);
      if (old.source === 'pluggy') throw new BadRequestException('Contas conectadas são atualizadas pelo provedor.');
      return this.db.account.update({ where: { id }, data: { displayName: data.name, institutionId: institution.id, balance: data.balance, type: data.type } });
    }
    return this.db.account.create({ data: { userId, institutionId: institution.id, externalId: randomUUID(), displayName: data.name, balance: data.balance, type: data.type } });
  }
  async card(userId: string, body: unknown, id?: string) {
    const data = parse(cardInput, body);
    const institution = await this.institution(data.institution);
    const fields = { displayName: data.name, maskedNumber: data.lastFour, limitAmount: data.limit, dueDay: data.dueDay, closeDay: data.closeDay };
    if (id) {
      const old = await this.db.card.findFirst({ where: { id, account: { userId, deletedAt: null }, deletedAt: null }, include: { account: true } });
      if (!old) throw new NotFoundException('Cartão não encontrado.');
      if (old.account.source === 'pluggy') throw new BadRequestException('Cartões conectados são atualizados pelo provedor.');
      return this.db.card.update({ where: { id }, data: { ...fields, account: { update: { displayName: data.name, institutionId: institution.id } } } });
    }
    return this.db.account.create({ data: { userId, institutionId: institution.id, externalId: randomUUID(), displayName: data.name, type: 'OTHER', balance: 0, cards: { create: { ...fields, externalId: randomUUID() } } } });
  }
  async category(userId: string, body: unknown, id?: string) {
    const data = parse(categoryInput, body);
    if (id && !await this.db.category.findFirst({ where: { id, userId, deletedAt: null } })) throw new NotFoundException();
    if (await this.db.category.findFirst({ where: { userId, deletedAt: null, name: { equals: data.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) } })) throw new ConflictException('Já existe uma categoria com esse nome.');
    return id ? this.db.category.update({ where: { id }, data }) : this.db.category.create({ data: { ...data, userId } });
  }
  async transaction(userId: string, body: unknown, id?: string) {
    const data = parse(transactionInput, body);
    const account = await this.ownAccount(userId, data.accountId);
    if (data.categoryId && !await this.db.category.findFirst({ where: { id: data.categoryId, userId, deletedAt: null } })) throw new BadRequestException('Categoria inválida.');
    let old: Prisma.TransactionGetPayload<Record<string, never>> | null = null;
    if (id) {
      old = await this.db.transaction.findFirst({ where: { id, account: { userId }, deletedAt: null } });
      if (!old) throw new NotFoundException();
      if (old.source === 'pluggy' && (old.accountId !== data.accountId || Number(old.amount) !== data.amount || old.type !== data.type || old.bookedAt.toISOString().slice(0,10) !== data.date || old.description !== data.description)) throw new BadRequestException('Em lançamentos conectados, altere somente a categoria.');
    } else if (account.source === 'pluggy') throw new BadRequestException('Escolha uma conta manual para novos lançamentos.');
    const fields = { description: data.description, accountId: data.accountId, amount: data.amount, type: data.type, bookedAt: new Date(`${data.date}T12:00:00Z`) };
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = id ? await tx.transaction.update({ where: { id }, data: old?.source === 'pluggy' ? {} : fields }) : await tx.transaction.create({ data: { ...fields, source: 'manual', deduplicationKey: createHash('sha256').update(randomUUID()).digest('hex') } });
      await tx.transactionCategory.deleteMany({ where: { transactionId: row.id } });
      if (data.categoryId) await tx.transactionCategory.create({ data: { transactionId: row.id, categoryId: data.categoryId, source: 'manual', isManual: true } });
      return row;
    });
  }
  async remove(userId: string, kind: string, id: string) {
    if (kind === 'transactions') {
      const row = await this.db.transaction.findFirst({ where: { id, account: { userId }, deletedAt: null } });
      if (!row) throw new NotFoundException();
      if (row.source === 'pluggy') throw new BadRequestException('Lançamentos do banco não podem ser excluídos manualmente.');
      await this.db.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
    } else if (kind === 'categories') {
      if (!await this.db.category.findFirst({ where: { id, userId, deletedAt: null } })) throw new NotFoundException();
      if (await this.db.transactionCategory.count({ where: { categoryId: id, transaction: { deletedAt: null } } })) throw new ConflictException('Reclassifique os lançamentos antes de excluir esta categoria.');
      await this.db.category.update({ where: { id }, data: { deletedAt: new Date() } });
    } else if (kind === 'accounts') {
      const row = await this.ownAccount(userId, id);
      if (row.source === 'pluggy') throw new BadRequestException('Desconecte a instituição na página Conexões.');
      if (await this.db.transaction.count({ where: { accountId: id, deletedAt: null } })) throw new ConflictException('Exclua os lançamentos desta conta antes de removê-la.');
      await this.db.account.update({ where: { id }, data: { deletedAt: new Date() } });
    } else if (kind === 'payables') {
      if (!await this.db.payable.findFirst({ where: { id, userId } })) throw new NotFoundException('Conta a pagar não encontrada.');
      await this.db.payable.delete({ where: { id } });
    } else throw new NotFoundException();
    return { ok: true };
  }
  async payable(userId: string, body: unknown) {
    const data = parse(payableInput, body);
    if (data.categoryId && !await this.db.category.findFirst({ where: { id: data.categoryId, userId, deletedAt: null } })) throw new BadRequestException('Categoria inválida.');
    const firstDueDate = new Date(`${data.firstDueDate}T12:00:00Z`);
    const cents = Math.round(data.totalAmount * 100);
    const baseCents = Math.floor(cents / data.installmentCount);
    const remainder = cents - baseCents * data.installmentCount;
    const installments = Array.from({ length: data.installmentCount }, (_, index) => ({
      number: index + 1,
      dueDate: this.nextDueDate(firstDueDate, data.frequency, index),
      amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
    }));
    return this.db.payable.create({ data: { userId, categoryId: data.categoryId ?? null, title: data.title, payee: data.payee || null, totalAmount: data.totalAmount, installmentCount: data.installmentCount, frequency: data.frequency, notes: data.notes || null, installments: { create: installments } }, include: { category: true, installments: { orderBy: { number: 'asc' } } } });
  }
  async payment(userId: string, installmentId: string, body: unknown) {
    const data = parse(paymentInput, body);
    const installment = await this.db.payableInstallment.findFirst({ where: { id: installmentId, payable: { userId } } });
    if (!installment) throw new NotFoundException('Parcela não encontrada.');
    return this.db.payableInstallment.update({ where: { id: installmentId }, data: data.paid ? { status: 'PAID', paidAt: new Date(`${data.paidAt}T12:00:00Z`) } : { status: 'PENDING', paidAt: null } });
  }
  private nextDueDate(first: Date, frequency: string, index: number) {
    const date = new Date(first);
    if (frequency === 'WEEKLY') date.setUTCDate(date.getUTCDate() + index * 7);
    else if (frequency === 'YEARLY') date.setUTCFullYear(date.getUTCFullYear() + index);
    else { const monthSteps: Record<string, number> = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3 }; date.setUTCMonth(date.getUTCMonth() + index * (monthSteps[frequency] ?? 1)); }
    return date;
  }
  private async clearDemo(userId: string) {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const where = { account: { userId, source: 'demo' } };
      const demoAssignments = await tx.transactionCategory.findMany({ where: { transaction: where }, select: { categoryId: true } });
      const demoCategoryIds = [...new Set(demoAssignments.map((row: { categoryId: string }) => row.categoryId))];
      await tx.cardInvoiceItem.deleteMany({ where: { transaction: where } });
      await tx.transaction.deleteMany({ where });
      await tx.cardInvoice.deleteMany({ where: { card: { account: { userId, source: 'demo' } } } });
      await tx.card.deleteMany({ where: { account: { userId, source: 'demo' } } });
      await tx.account.deleteMany({ where: { userId, source: 'demo' } });
      if (demoCategoryIds.length) await tx.category.deleteMany({ where: { id: { in: demoCategoryIds }, userId, transactions: { none: {} } } });
      return { ok: true };
    });
  }
  private async clearDisconnected(userId: string) {
    const stale = await this.db.providerConnection.findMany({ where: { userId, status: 'DISCONNECTED' }, select: { id: true, itemId: true } });
    for (const connection of stale) {
      await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
        const accounts = await tx.account.findMany({ where: { userId, connectionId: connection.id }, select: { id: true } });
        const accountIds = accounts.map((account: { id: string }) => account.id);
        const transactions = await tx.transaction.findMany({ where: { accountId: { in: accountIds } }, select: { id: true, categories: { select: { categoryId: true, source: true, isManual: true } } } });
        const transactionIds = transactions.map((transaction: { id: string }) => transaction.id);
        const categoryIds = [...new Set(transactions.flatMap((transaction: { categories: Array<{ categoryId: string; source: string; isManual: boolean }> }) => transaction.categories.filter((category) => category.source === 'pluggy' && !category.isManual).map((category) => category.categoryId)))];
        const cards = await tx.card.findMany({ where: { accountId: { in: accountIds } }, select: { id: true } });
        const cardIds = cards.map((card: { id: string }) => card.id);
        const invoices = await tx.cardInvoice.findMany({ where: { cardId: { in: cardIds } }, select: { id: true } });
        const invoiceIds = invoices.map((invoice: { id: string }) => invoice.id);
        await tx.cardInvoiceItem.deleteMany({ where: { OR: [{ transactionId: { in: transactionIds } }, { invoiceId: { in: invoiceIds } }] } });
        await tx.transaction.deleteMany({ where: { id: { in: transactionIds } } });
        await tx.cardInvoice.deleteMany({ where: { id: { in: invoiceIds } } });
        await tx.card.deleteMany({ where: { id: { in: cardIds } } });
        await tx.account.deleteMany({ where: { id: { in: accountIds } } });
        await tx.webhookJob.deleteMany({ where: { itemId: connection.itemId } });
        await tx.providerConnection.delete({ where: { id: connection.id } });
        if (categoryIds.length) await tx.category.deleteMany({ where: { id: { in: categoryIds }, userId, transactions: { none: {} }, isSystem: false } });
      });
    }
  }
}
