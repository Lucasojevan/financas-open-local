import { BadGatewayException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { PluggyClient } from 'pluggy-sdk';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PluggyService implements OnModuleInit, OnModuleDestroy {
  private client?: PluggyClient;
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;
  private syncing = new Set<string>();
  constructor(private readonly db: PrismaService) {}
  config() {
    return { provider: 'pluggy', configured: Boolean(process.env.CLIENT_ID && process.env.CLIENT_SECRET), sandbox: process.env.PLUGGY_SANDBOX !== 'false', webhookConfigured: Boolean(process.env.PLUGGY_WEBHOOK_SECRET), mode: 'local' };
  }
  private sdk() {
    if (!this.config().configured) throw new ServiceUnavailableException('Configure CLIENT_ID e CLIENT_SECRET no .env do backend.');
    return this.client ??= new PluggyClient({ clientId: process.env.CLIENT_ID!, clientSecret: process.env.CLIENT_SECRET! });
  }
  async token(userId: string, itemId?: string) {
    if (itemId && !await this.db.providerConnection.findFirst({ where: { userId, itemId, status: { not: 'DISCONNECTED' } } })) throw new NotFoundException();
    try { return await this.sdk().createConnectToken(itemId, { clientUserId: userId, avoidDuplicates: true }); }
    catch (error) { if (error instanceof ServiceUnavailableException) throw error; throw new BadGatewayException('Não foi possível gerar o token. Verifique as credenciais e o acesso à Pluggy.'); }
  }
  async attach(userId: string, itemId: string) {
    const item = await this.sdk().fetchItem(itemId);
    if (item.clientUserId !== userId) throw new ForbiddenException('Esta conexão não pertence ao usuário autenticado.');
    const existing = await this.db.providerConnection.findUnique({ where: { itemId } });
    if (existing && existing.userId !== userId) throw new ForbiddenException();
    const row = await this.db.providerConnection.upsert({ where: { itemId }, create: { itemId, userId, name: item.connector.name, status: item.status, sandbox: item.connector.isSandbox }, update: { status: item.status, error: null } });
    await this.enqueue(`attach:${itemId}:${Date.now()}`, 'item/updated', itemId);
    return row;
  }
  async requestSync(userId: string, id: string) {
    const row = await this.db.providerConnection.findFirst({ where: { id, userId, status: { not: 'DISCONNECTED' } } });
    if (!row) throw new NotFoundException();
    await this.enqueue(`manual:${row.itemId}:${Math.floor(Date.now()/30000)}`, 'item/updated', row.itemId);
    return { queued: true };
  }
  async requestSyncAll(userId: string) {
    const connections = await this.db.providerConnection.findMany({
      where: { userId, status: { not: 'DISCONNECTED' } },
      select: { id: true, itemId: true },
    });
    for (const connection of connections) {
      await this.enqueue(`manual:${connection.itemId}:${Math.floor(Date.now() / 30000)}`, 'item/updated', connection.itemId);
      await this.db.providerConnection.update({ where: { id: connection.id }, data: { status: 'SYNCING', error: null } });
    }
    return { queued: connections.length };
  }
  async disconnect(userId: string, id: string) {
    const row = await this.db.providerConnection.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException();
    if (this.syncing.has(row.itemId)) throw new ConflictException('Aguarde a sincronização terminar e tente novamente.');
    if (row.status !== 'DISCONNECTED') {
      try { await this.sdk().deleteItem(row.itemId); }
      catch (e) { if ((e as { response?: { statusCode?: number } }).response?.statusCode !== 404) throw new BadGatewayException('Não foi possível desconectar no provedor. Tente novamente.'); }
    }
    await this.db.$transaction(async (tx) => {
      const accounts = await tx.account.findMany({ where: { userId, connectionId: id }, select: { id: true } });
      const accountIds = accounts.map((account) => account.id);
      const transactions = await tx.transaction.findMany({ where: { accountId: { in: accountIds } }, select: { id: true, categories: { select: { categoryId: true, source: true, isManual: true } } } });
      const transactionIds = transactions.map((transaction) => transaction.id);
      const categoryIds = [...new Set(transactions.flatMap((transaction) => transaction.categories.filter((category) => category.source === 'pluggy' && !category.isManual).map((category) => category.categoryId)))];
      const cards = await tx.card.findMany({ where: { accountId: { in: accountIds } }, select: { id: true } });
      const cardIds = cards.map((card) => card.id);
      const invoices = await tx.cardInvoice.findMany({ where: { cardId: { in: cardIds } }, select: { id: true } });
      const invoiceIds = invoices.map((invoice) => invoice.id);

      await tx.cardInvoiceItem.deleteMany({ where: { OR: [{ transactionId: { in: transactionIds } }, { invoiceId: { in: invoiceIds } }] } });
      await tx.transaction.deleteMany({ where: { id: { in: transactionIds } } });
      await tx.cardInvoice.deleteMany({ where: { id: { in: invoiceIds } } });
      await tx.card.deleteMany({ where: { id: { in: cardIds } } });
      await tx.account.deleteMany({ where: { id: { in: accountIds } } });
      await tx.webhookJob.deleteMany({ where: { itemId: row.itemId } });
      await tx.providerConnection.delete({ where: { id } });
      if (categoryIds.length) await tx.category.deleteMany({ where: { id: { in: categoryIds }, userId, transactions: { none: {} }, isSystem: false } });
    });
    return { ok: true };
  }
  async enqueue(eventId: string, event: string, itemId: string) {
    // Acknowledge only after the durable insert. No API calls in the webhook path.
    await this.db.webhookJob.upsert({ where: { eventId }, create: { eventId, event, itemId }, update: {} });
  }
  onModuleInit() {
    this.timer = setInterval(() => { void this.work().catch(() => undefined); }, 2000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async work() {
    if (this.processing || !this.config().configured) return;
    this.processing = true;
    try {
      const now = new Date();
      const job = await this.db.webhookJob.findFirst({ where: { status: { in: ['PENDING','RUNNING'] }, availableAt: { lte: now } }, orderBy: { createdAt: 'asc' } });
      if (!job) return;
      // Lease permits recovery after process termination; supported deployment has one backend.
      const claimed = await this.db.webhookJob.updateMany({ where: { id: job.id, availableAt: { lte: now }, status: { in: ['PENDING','RUNNING'] } }, data: { status: 'RUNNING', attempts: { increment: 1 }, availableAt: new Date(Date.now()+30*60*1000) } });
      if (!claimed.count) return;
      try {
        let connection = await this.db.providerConnection.findUnique({ where: { itemId: job.itemId } });
        if (!connection && job.event !== 'item/deleted') {
          const item = await this.sdk().fetchItem(job.itemId);
          const user = item.clientUserId ? await this.db.user.findUnique({ where: { id: item.clientUserId } }) : null;
          if (!user) throw new ForbiddenException();
          await this.attach(user.id, job.itemId);
          connection = await this.db.providerConnection.findUnique({ where: { itemId: job.itemId } });
        }
        if (connection && connection.status !== 'DISCONNECTED') {
          if (job.event === 'item/deleted') await this.db.providerConnection.update({ where: { id: connection.id }, data: { status: 'DISCONNECTED' } });
          else await this.sync(connection.id);
        }
        await this.db.webhookJob.update({ where: { id: job.id }, data: { status: 'DONE' } });
      } catch {
        await this.db.webhookJob.update({ where: { id: job.id }, data: { status: job.attempts >= 4 ? 'FAILED' : 'PENDING', availableAt: new Date(Date.now() + Math.min(300, 15 * 2**job.attempts)*1000) } });
      }
    } finally { this.processing = false; }
  }
  async sync(id: string) {
    const connection = await this.db.providerConnection.findUniqueOrThrow({ where: { id } });
    if (this.syncing.has(connection.itemId)) throw new ConflictException('Sincronização em andamento.');
    this.syncing.add(connection.itemId);
    try {
      const sdk = this.sdk();
      const item = await sdk.fetchItem(connection.itemId);
      if (item.clientUserId !== connection.userId) throw new ForbiddenException();
      if (item.status !== 'UPDATED') {
        await this.db.providerConnection.update({ where: { id }, data: { status: item.status, error: ['UPDATING','MERGING'].includes(item.status) ? 'A instituição ainda está preparando os dados.' : 'Abra a conexão para verificar a autorização no banco.' } });
        if (['UPDATING','MERGING'].includes(item.status)) throw new ServiceUnavailableException();
        return;
      }
      await this.db.providerConnection.update({ where: { id }, data: { status: 'SYNCING', error: null } });
      const institution = await this.db.institution.upsert({ where: { code: `pluggy:${item.connector.id}` }, create: { code: `pluggy:${item.connector.id}`, name: item.connector.name, kind: 'PLUGGY', enabled: true }, update: {} });
      const accounts = await sdk.fetchAccounts(item.id);
      for (const remote of accounts.results) {
        const externalId = `${connection.userId}:${remote.id}`;
        const fields = { displayName: remote.name.slice(0,120), currency: remote.currencyCode, balance: remote.balance, source: 'pluggy', connectionId: id, maskedNumber: remote.number?.slice(-4) ?? null, lastSyncedAt: new Date() };
        const account = await this.db.account.upsert({ where: { institutionId_externalId: { institutionId: institution.id, externalId } }, create: { ...fields, userId: connection.userId, institutionId: institution.id, externalId, type: remote.type === 'CREDIT' ? 'OTHER' : 'CHECKING' }, update: fields });
        let cardId: string | undefined;
        if (remote.type === 'CREDIT') {
          const cardFields = { displayName: remote.name.slice(0,120), maskedNumber: remote.number?.slice(-4) ?? null, limitAmount: remote.creditData?.creditLimit ?? null, availableLimit: remote.creditData?.availableCreditLimit ?? null, dueDay: remote.creditData?.balanceDueDate ? new Date(remote.creditData.balanceDueDate).getUTCDate() : null, closeDay: remote.creditData?.balanceCloseDate ? new Date(remote.creditData.balanceCloseDate).getUTCDate() : null };
          const card = await this.db.card.upsert({ where: { accountId_externalId: { accountId: account.id, externalId: remote.id } }, create: { accountId: account.id, externalId: remote.id, ...cardFields }, update: cardFields });
          cardId = card.id;
          // Open Finance may expose the current balance before the bills endpoint.
          // Keep a stable synthetic invoice until Pluggy returns the official bill ID.
          if (remote.creditData?.balanceDueDate) {
            const dueDate = new Date(remote.creditData.balanceDueDate);
            const currentInvoiceId = `current:${remote.id}:${dueDate.toISOString().slice(0, 10)}`;
            const invoiceFields = {
              dueDate,
              amount: Math.abs(remote.balance),
              status: remote.balance === 0 ? 'PAID' : 'OPEN',
            };
            await this.db.cardInvoice.upsert({
              where: { cardId_externalId: { cardId, externalId: currentInvoiceId } },
              create: { cardId, externalId: currentInvoiceId, ...invoiceFields },
              update: invoiceFields,
            });
          }
          // Bills are not available for every connector. Only query when product is offered.
          if (item.connector.isOpenFinance) {
            let page = 1, totalPages = 1;
            do {
              const bills = await sdk.fetchCreditCardBills(remote.id, { page, pageSize: 500 });
              totalPages = bills.totalPages;
              for (const bill of bills.results) {
                const fields = { dueDate: new Date(bill.dueDate), amount: bill.totalAmount, status: bill.payments.reduce((n,p) => n+p.amount,0) >= bill.totalAmount ? 'PAID' : 'OPEN' };
                await this.db.cardInvoice.upsert({ where: { cardId_externalId: { cardId, externalId: bill.id } }, create: { cardId, externalId: bill.id, ...fields }, update: fields });
              }
            } while (++page <= totalPages);
          }
        }
        const transactions = await sdk.fetchAllTransactions(remote.id);
        for (const row of transactions) {
          const fields = { bookedAt: new Date(row.date), amount: Math.abs(row.amountInAccountCurrency ?? row.amount), currency: row.amountInAccountCurrency != null ? remote.currencyCode : row.currencyCode, type: row.type, description: row.description.slice(0,500), merchant: row.merchant?.name?.slice(0,255) ?? null, syncedAt: new Date(), deletedAt: null };
          const transaction = await this.db.transaction.upsert({ where: { accountId_externalId: { accountId: account.id, externalId: row.id } }, create: { ...fields, accountId: account.id, externalId: row.id, deduplicationKey: createHash('sha256').update(row.id).digest('hex'), source: 'pluggy' }, update: fields });
          if (row.category) {
            let category = await this.db.category.findFirst({ where: { userId: connection.userId, name: row.category.slice(0,80), deletedAt: null } });
            category ??= await this.db.category.create({ data: { userId: connection.userId, name: row.category.slice(0,80) } });
            const assigned = await this.db.transactionCategory.findUnique({ where: { transactionId: transaction.id } });
            if (!assigned?.isManual) await this.db.transactionCategory.upsert({ where: { transactionId: transaction.id }, create: { transactionId: transaction.id, categoryId: category.id, source: 'pluggy' }, update: { categoryId: category.id } });
          }
          if (cardId && row.creditCardMetadata?.billId) {
            const invoice = await this.db.cardInvoice.findUnique({ where: { cardId_externalId: { cardId, externalId: row.creditCardMetadata.billId } } });
            if (invoice) {
              await this.db.cardInvoiceItem.deleteMany({ where: { transactionId: transaction.id, invoiceId: { not: invoice.id } } });
              await this.db.cardInvoiceItem.upsert({ where: { invoiceId_transactionId: { invoiceId: invoice.id, transactionId: transaction.id } }, create: { invoiceId: invoice.id, transactionId: transaction.id }, update: {} });
            }
          }
        }
      }
      await this.db.providerConnection.update({ where: { id }, data: { status: 'UPDATED', lastSync: new Date(), error: null } });
    } catch (error) {
      await this.db.providerConnection.updateMany({ where: { id, status: 'SYNCING' }, data: { status: 'ERROR', error: 'Não foi possível concluir a sincronização. Os dados anteriores foram preservados. Tente novamente.' } });
      throw error;
    } finally { this.syncing.delete(connection.itemId); }
  }
}
