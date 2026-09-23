# Finanças Open Local

Dashboard financeiro local com integração Pluggy Open Finance. Reúne contas, cartões, faturas, transações, categorias, gráficos e contas a pagar em uma interface responsiva.

## Segurança por padrão

- somente o frontend é publicado, em `127.0.0.1:3000`;
- PostgreSQL e API ficam em redes Docker privadas;
- credenciais Pluggy permanecem exclusivamente no backend;
- senha local protegida com Argon2id;
- sessão opaca de 256 bits, persistida somente como SHA-256;
- cookie `HttpOnly`, `SameSite=Strict` e `Secure` em HTTPS;
- mutações exigem origem permitida;
- webhook exige segredo, comparação em tempo constante e evento permitido;
- containers da aplicação usam usuário sem root, filesystem somente leitura, capabilities removidas e `no-new-privileges`;
- CSP, anti-framing, `nosniff`, HSTS e política de referência;
- CI, CodeQL e Dependabot configurados para GitHub.

Consulte o [índice da documentação](docs/README.md), a [visão geral do produto](docs/PRODUCT.md), [Segurança](docs/SECURITY.md), [Threat model](docs/THREAT_MODEL.md) e [Operação segura](docs/OPERATIONS.md).

## Requisitos

- Docker Desktop/Engine com Docker Compose v2;
- aplicação Pluggy e suas credenciais.

## Configuração

```powershell
Copy-Item .env.example .env
```

Edite `.env` e substitua todos os placeholders. Use valores diferentes para cada segredo. Não envie `.env`, dumps, backups ou respostas da Pluggy ao GitHub.

Variáveis essenciais:

```env
POSTGRES_DB=financas
POSTGRES_USER=financas
POSTGRES_PASSWORD=gere-uma-senha-longa
DATABASE_URL=postgresql://financas:mesma-senha@postgres:5432/financas?schema=public
APP_ORIGIN=http://localhost:3000
NODE_ENV=production
SESSION_COOKIE_NAME=financas_session
SESSION_TTL_HOURS=12
TOKEN_ENCRYPTION_KEY=gere-32-bytes-em-base64
OPEN_FINANCE_PROVIDER=pluggy
CLIENT_ID=seu-client-id
CLIENT_SECRET=seu-client-secret
PLUGGY_SANDBOX=true
PLUGGY_WEBHOOK_SECRET=gere-um-segredo-longo
```

## Executar

```powershell
docker compose config --quiet
docker compose up -d --build --wait
```

Abra [http://localhost:3000](http://localhost:3000). Na primeira utilização, crie o usuário local. O banco e a API não devem aparecer com portas publicadas em `docker compose ps`.

Para acompanhar:

```powershell
docker compose ps
docker compose logs --tail 100 backend frontend
```

Para parar sem apagar dados:

```powershell
docker compose down
```

`docker compose down -v` apaga permanentemente o banco.

## Integração Pluggy

A tela **Conexões** cria um Connect Token no backend e abre o widget oficial. Após o consentimento, a API importa contas, cartões, faturas e transações. O botão **Atualizar tudo** solicita sincronização de todas as conexões ativas.

Para webhooks, configure uma URL HTTPS pública terminando em `/api/webhooks/pluggy` e envie `X-Pluggy-Webhook-Secret` com o mesmo valor do `.env`. Sem esse segredo, o endpoint recusa chamadas.

## Funcionalidades

- dashboard com saldo e fluxo mensal real;
- filtros por período, conta, cartão, categoria e tipo;
- cartões e faturas detalhados;
- contas a pagar parceladas com vencimento e data de pagamento;
- contas, cartões, categorias e lançamentos manuais;
- estados de autorização e sincronização Pluggy;
- limpeza dos dados da instituição ao desconectar.

## Desenvolvimento

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @financas/api prisma:generate
pnpm lint
pnpm test
pnpm build
```

## Estrutura

```text
apps/web                 Next.js e proxy same-origin /api
apps/api                 NestJS, Prisma, autenticação e integração Pluggy
apps/api/prisma          schema e migrações PostgreSQL
packages/domain          tipos compartilhados
docs                     arquitetura, segurança e operação
.github/workflows        CI e análise CodeQL
```

## Publicação no GitHub

Use um repositório privado. Antes do primeiro push:

```powershell
git status --ignored
git ls-files | Select-String -Pattern '(^|\\)\.env($|\.)'
```

O segundo comando não deve listar `.env`; apenas `.env.example` é permitido. Depois ative proteção da branch `main`, Dependabot, secret scanning e push protection.
