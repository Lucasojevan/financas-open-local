'use client';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, WalletCards, X } from 'lucide-react';

type Data = {
  accounts: Array<{ id: string; displayName: string; source?: string; type?: string }>;
  categories: Array<{ id: string; name: string }>;
};

export function FinanceActions({ data, onSaved }: { data: Data; onSaved: () => void | Promise<void> }) {
  const [kind, setKind] = useState('');
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const manualAccounts = useMemo(() => data.accounts.filter((account) => account.source !== 'pluggy' && account.type !== 'OTHER'), [data.accounts]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function open(nextKind: string) {
    setToast(null);
    setKind(nextKind);
  }

  function validate(form: HTMLFormElement, body: Record<string, FormDataEntryValue>) {
    const required = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[required]')];
    const missing = required.find((field) => !String(body[field.name] || '').trim());
    if (missing) {
      missing.focus();
      return `Preencha o campo “${missing.closest('label')?.childNodes[0]?.textContent?.trim() || missing.name}”.`;
    }
    if (kind === 'transactions' && !manualAccounts.length) return 'Crie uma conta manual antes de adicionar um lançamento. As movimentações Open Finance são importadas automaticamente.';
    if (kind === 'transactions' && Number(body.amount) <= 0) return 'Informe um valor maior que zero.';
    if (kind === 'cards' && !/^\d{4}$/.test(String(body.lastFour))) return 'Informe exatamente os quatro últimos dígitos do cartão.';
    return '';
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const validationError = validate(form, body);
    if (validationError) { setToast({ type: 'error', message: validationError }); return; }
    setBusy(true); setToast(null);
    try {
      const response = await fetch(`/api/finance/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Não foi possível salvar.');
      setKind('');
      setToast({ type: 'success', message: 'Salvo com sucesso.' });
      await onSaved();
    } catch (cause) {
      setToast({ type: 'error', message: cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.' });
    } finally { setBusy(false); }
  }

  return <>
    {toast && <div className={`toast ${toast.type}`} role="alert"><span className="toastIcon">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle2 />}</span><div><b>{toast.type === 'error' ? 'Não foi possível concluir' : 'Tudo certo'}</b><p>{toast.message}</p></div><button aria-label="Fechar aviso" onClick={() => setToast(null)}><X /></button><i /></div>}
    <button className="fab" onClick={() => open('transactions')}><Plus size={18} /> Adicionar</button>
    {kind && <div className="modalBackdrop" onMouseDown={() => setKind('')}><div className="modal" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span className="eyebrow">NOVO REGISTRO</span><h3>{kind === 'transactions' ? 'Novo lançamento' : kind === 'accounts' ? 'Nova conta' : kind === 'cards' ? 'Novo cartão' : 'Nova categoria'}</h3></div><button aria-label="Fechar" onClick={() => setKind('')}><X /></button></header>
      <div className="actionTabs">{([['transactions', 'Lançamento'], ['accounts', 'Conta'], ['cards', 'Cartão'], ['categories', 'Categoria']] as const).map(([id, label]) => <button type="button" className={kind === id ? 'active' : ''} onClick={() => open(id)} key={id}>{label}</button>)}</div>
      <form onSubmit={submit} className="financeForm" noValidate>
        {kind === 'transactions' && <>
          {!manualAccounts.length && <div className="formNotice"><WalletCards /><div><b>Nenhuma conta manual</b><p>Transações da Pluggy são importadas automaticamente. Para lançar algo manualmente, crie uma conta manual.</p></div><button type="button" onClick={() => open('accounts')}>Criar conta</button></div>}
          <label>Descrição<input name="description" required minLength={2} placeholder="Ex.: Mercado" /></label>
          <div className="formGrid"><label>Valor<input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" /></label><label>Tipo<select name="type"><option value="DEBIT">Saída</option><option value="CREDIT">Entrada</option></select></label></div>
          <label>Data<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Conta manual<select name="accountId" required defaultValue=""><option value="" disabled>Selecione uma conta</option>{manualAccounts.map((account) => <option value={account.id} key={account.id}>{account.displayName}</option>)}</select></label>
          <label>Categoria<select name="categoryId"><option value="">Sem categoria</option>{data.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        </>}
        {kind === 'accounts' && <><label>Nome da conta<input name="name" required placeholder="Ex.: Carteira pessoal" /></label><label>Instituição<input name="institution" required placeholder="Ex.: Conta manual" /></label><label>Saldo atual<input name="balance" type="number" step="0.01" required placeholder="0,00" /></label><label>Tipo<select name="type"><option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="PAYMENT">Conta de pagamento</option></select></label></>}
        {kind === 'cards' && <><label>Nome do cartão<input name="name" required /></label><label>Instituição<input name="institution" required /></label><label>Últimos quatro dígitos<input name="lastFour" inputMode="numeric" maxLength={4} required /></label><label>Limite<input name="limit" type="number" step="0.01" min="0" required /></label><div className="formGrid"><label>Fechamento<input name="closeDay" type="number" min="1" max="28" required /></label><label>Vencimento<input name="dueDay" type="number" min="1" max="28" required /></label></div></>}
        {kind === 'categories' && <><label>Nome<input name="name" required /></label><label>Orçamento mensal<input name="budget" type="number" min="0" step="0.01" required placeholder="0,00" /></label></>}
        <button className="primary full" disabled={busy || (kind === 'transactions' && !manualAccounts.length)}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </form>
    </div></div>}
  </>;
}
