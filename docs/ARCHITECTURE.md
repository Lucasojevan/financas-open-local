# Arquitetura técnica

## Decisão central

O dashboard é local, mas o Open Finance real não pode ser tratado como uma conexão direta e informal do computador ao banco. A aplicação separa três fronteiras:

```text
Browser local -> Next.js -> NestJS -> PostgreSQL
                              |
                              +-> Pluggy API
Pluggy -> webhook HTTPS -> NestJS -> fila persistida -> sincronização
```

No Docker, somente `127.0.0.1:3000` é publicado. Next.js encaminha `/api` ao NestJS pela rede interna. PostgreSQL não possui porta publicada.

## Módulos

- **Web:** interface, acessibilidade, filtros e gráficos. Não recebe segredos.
- **API:** autenticação, autorização, sincronização, categorização, auditoria e backup.
- **Domínio:** contratos e tipos independentes do provedor.
- **Persistência:** Prisma/PostgreSQL, constraints e índices.
- **Integração:** `PluggyService` cria Connect Tokens, associa Items, importa dados, solicita atualizações e processa eventos recebidos pelo webhook.

## Modelo de dados

As tabelas pedidas estão representadas como modelos Prisma: `users`, `accounts`, `institutions`, `consents`, `transactions`, `transaction_categories`, `categories`, `cards`, `card_invoices`, `sync_jobs`, `sync_logs` e `audit_logs`. Também existem `sessions`, `categorization_rules` e `card_invoice_items`.

Pontos importantes:

- UUIDs em todas as entidades;
- `created_at` e `updated_at` onde aplicável;
- soft delete em dados editáveis/históricos;
- FKs e exclusões em cascata apenas para relações efêmeras/associativas;
- `Decimal(19,4)` para valores; nunca `float`;
- índices por proprietário, data, status e execução;
- cartão sempre mascarado; não há CVV nem PAN completo.

## Idempotência e deduplicação

A ordem prevista é:

1. validar e normalizar a resposta do adapter;
2. usar `(account_id, external_id)` quando a fonte garantir estabilidade;
3. calcular `deduplication_key = SHA-256(provider + account + bookedAt + amount + type + normalizedDescription + merchant)` como fallback;
4. executar `upsert` dentro de transação do banco;
5. manter categoria manual existente;
6. registrar métricas sem payload financeiro bruto.

As duas chaves possuem constraints únicas. Essa estratégia deve permanecer coberta por testes sempre que o formato de importação for alterado.

## Sincronização

Após a autorização no widget, o frontend envia o `itemId` ao backend. O backend associa o Item ao usuário, importa contas, cartões, faturas e transações e atualiza o estado da conexão. A atualização pode ser solicitada para uma conexão ou para todas as conexões ativas.

O webhook valida um segredo compartilhado em tempo constante, aceita somente eventos conhecidos, devolve `202 Accepted` e registra o evento em uma fila persistida. O processamento pesado ocorre fora da resposta HTTP. Como o webhook precisa ser acessível pela Pluggy, ele exige uma URL HTTPS pública; não exponha o dashboard, PostgreSQL ou a API inteira por port forwarding doméstico.

## Autenticação local

- setup permitido somente se não existir usuário;
- senha mínima de 12 caracteres e hash Argon2id (64 MiB, 3 iterações, paralelismo 1);
- token de sessão aleatório de 256 bits;
- somente SHA-256 do token no banco;
- cookie `HttpOnly`, `SameSite=Strict`; `Secure` em HTTPS;
- validação de `Origin` nas mutações;
- rate limiting global inicial, com política mais rígida de login a concluir.

## Decisões pendentes

- fornecedor receptor/aggregator oficialmente compatível e seus termos;
- necessidade de callback público HTTPS para consentimento;
- suporte de cartão/fatura por instituição;
- retenção local após revogação;
- formato e KDF do backup criptografado (planejado: Argon2id + AES-256-GCM ou XChaCha20-Poly1305 por biblioteca madura).
