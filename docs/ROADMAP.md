# Roadmap por gates

## Fase 1 — fundação (iniciada)

- [x] monorepo, Docker Compose e rede privada;
- [x] Prisma/PostgreSQL e modelo inicial;
- [x] backend NestJS e frontend Next.js;
- [x] fundação de autenticação local;
- [x] documentação técnica e pesquisa inicial;
- [x] migration inicial gerada;
- [ ] seed do usuário/categorias;
- [ ] guard de sessão aplicado a rotas privadas;
- [ ] telas de setup, login e logout.

## Fase 2 — produto local

- transações, categorias e correção manual;
- dashboard, gráficos e filtros;
- gastos, contas, cartões, conexões e configurações;
- regras locais de categorização, sem IA externa.

## Fase 3 — integração simulada

- `MockOpenFinanceProvider` determinístico;
- sync jobs, paginação, retry/backoff e status;
- deduplicação e idempotência;
- testes unitários, integração e segurança da base.

## Fase 4 — Open Finance real

- gate regulatório/contratual;
- consentimento oficial e callback seguro;
- adapter de receptor habilitado/Santander;
- tokens criptografados e revogação real.

## Fase 5 — Pamcard

- nova pesquisa oficial;
- implementar apenas com API/integração autorizada e documentada;
- caso contrário, manter adapter desabilitado.

## Fase 6 — hardening

- backup criptografado e restauração;
- exclusão total com confirmação forte;
- auditoria completa, rotação de secrets e security tests;
- runbooks de recuperação e troubleshooting.
