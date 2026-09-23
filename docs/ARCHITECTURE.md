# Arquitetura técnica

## Decisão central

O dashboard é local, mas o Open Finance real não pode ser tratado como uma conexão direta e informal do computador ao banco. A aplicação separa três fronteiras:

```text
Browser local -> Next.js -> NestJS -> PostgreSQL
                              |
                              +-> OpenFinanceProvider -> mock | provedor oficial futuro
```

No Docker, somente `127.0.0.1:3000` é publicado. Next.js encaminha `/api` ao NestJS pela rede interna. PostgreSQL não possui porta publicada.

## Módulos

- **Web:** interface, acessibilidade, filtros e gráficos. Não recebe segredos.
- **API:** autenticação, autorização, sincronização, categorização, auditoria e backup.
- **Domínio:** contratos e tipos independentes do provedor.
- **Persistência:** Prisma/PostgreSQL, constraints e índices.
- **Adapters:** `MockOpenFinanceProvider`; depois, adapter do provedor habilitado. Os nomes Santander/Pamcard não implicam integração disponível.

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

As duas chaves possuem constraints únicas. A função canônica e os testes entram na Fase 3.

## Sincronização planejada

`POST /sync` cria um job idempotente; `GET /sync/status` mostra a última execução; `GET /sync/history` lista execuções sem payload sensível. Cada job utiliza cursor/paginação, timeout, retry com jitter e backoff, limite máximo de tentativas e tratamento explícito de 429.

Webhooks só serão ativados se o provedor/documentação oficial os suportar. Um webhook real exige endpoint HTTPS acessível externamente; isso conflita com a premissa localhost e deverá ser isolado num relay/provedor oficial, nunca por port forwarding doméstico.

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
