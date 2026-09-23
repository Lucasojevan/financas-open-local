export type ProviderAccount = { externalId: string; name: string; type: string; currency: string };
export type ProviderTransaction = { externalId?: string; accountExternalId: string; bookedAt: string; amount: string; type: 'CREDIT' | 'DEBIT'; description: string; merchant?: string };
export type ProviderCard = { externalId: string; name: string; maskedNumber?: string };
export type ProviderInvoice = { externalId?: string; cardExternalId: string; dueDate: string; amount?: string };
export type ConsentStatus = 'PENDING' | 'AUTHORISED' | 'REVOKED' | 'EXPIRED' | 'ERROR';

export interface OpenFinanceProvider {
  connect(): Promise<void>;
  getAccounts(): Promise<ProviderAccount[]>;
  getTransactions(): Promise<ProviderTransaction[]>;
  getCards(): Promise<ProviderCard[]>;
  getInvoices(): Promise<ProviderInvoice[]>;
  getConsentStatus(): Promise<ConsentStatus>;
  revokeConsent(): Promise<void>;
}
