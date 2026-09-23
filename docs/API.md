# Referência da API

A API NestJS é acessada pelo frontend por meio do proxy same-origin `/api`. No ambiente Docker, ela não publica uma porta diretamente no host.

## Autenticação

A aplicação usa uma sessão em cookie `HttpOnly`. Com exceção do primeiro acesso, login, health check e webhook, as rotas exigem uma sessão válida.

| Método | Rota | Finalidade |
|---|---|---|
| `POST` | `/api/auth/setup` | Criar o primeiro usuário local |
| `POST` | `/api/auth/login` | Autenticar e criar uma sessão |
| `POST` | `/api/auth/logout` | Encerrar a sessão atual |
| `GET` | `/api/auth/status` | Consultar se o primeiro acesso já foi configurado |
| `GET` | `/api/auth/me` | Retornar o usuário autenticado |
| `POST` | `/api/auth/password` | Alterar a senha e invalidar sessões anteriores |

A senha deve possuir pelo menos 12 caracteres. Mutações são validadas contra a origem configurada em `APP_ORIGIN`.

## Dados financeiros

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/api/finance` | Obter o snapshot usado pelo dashboard |
| `POST` / `PATCH` | `/api/finance/accounts[/:id]` | Criar ou editar uma conta manual |
| `POST` / `PATCH` | `/api/finance/cards[/:id]` | Criar ou editar um cartão manual |
| `POST` / `PATCH` | `/api/finance/categories[/:id]` | Criar ou editar uma categoria |
| `POST` / `PATCH` | `/api/finance/transactions[/:id]` | Criar ou editar uma transação manual |
| `POST` | `/api/finance/payables` | Criar uma conta a pagar e suas parcelas |
| `PATCH` | `/api/finance/payables/installments/:id` | Atualizar o pagamento de uma parcela |
| `DELETE` | `/api/finance/:kind/:id` | Excluir um registro manual compatível |

Os corpos são validados no backend. IDs em rotas parametrizadas devem ser UUIDs válidos.

## Conexões Pluggy

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/api/connections/config` | Informar se a integração está configurada e se usa sandbox |
| `POST` | `/api/connections/pluggy/token` | Criar um Connect Token para o usuário autenticado |
| `POST` | `/api/connections/pluggy/item` | Associar um Item autorizado e iniciar sua importação |
| `POST` | `/api/connections/sync-all` | Solicitar atualização de todas as conexões ativas |
| `POST` | `/api/connections/:id/sync` | Solicitar atualização de uma conexão |
| `DELETE` | `/api/connections/:id` | Desconectar e remover dados importados da instituição |

`CLIENT_ID` e `CLIENT_SECRET` são lidos exclusivamente pelo backend. O navegador recebe somente o Connect Token temporário.

## Webhook

`POST /api/webhooks/pluggy` aceita os eventos `item/created`, `item/updated`, `item/error` e `item/deleted`. A chamada deve enviar `X-Pluggy-Webhook-Secret` com o segredo configurado no backend. Eventos válidos retornam `202 Accepted` e entram na fila persistida para processamento.

## Saúde

`GET /api/health` é usado pelo health check do container para confirmar que a API está disponível.

Esta referência descreve a superfície atual da aplicação. Ela não substitui validação, autorização ou controle de acesso no backend.
