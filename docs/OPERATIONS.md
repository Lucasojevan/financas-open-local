# Operação segura

## Instalação

1. Copie `.env.example` para `.env`.
2. Gere valores independentes e aleatórios para PostgreSQL, chave de aplicação e webhook.
3. Preencha as credenciais Pluggy somente no `.env`.
4. Execute `docker compose config --quiet` antes do build.
5. Inicie com `docker compose up -d --build --wait`.

## Verificações

```powershell
docker compose ps
docker compose logs --tail 100 backend
docker compose exec backend node --version
```

Apenas `127.0.0.1:3000` deve estar publicado. Os containers `backend` e `frontend` executam como usuário sem privilégios, com capabilities removidas e filesystem somente leitura.

## Backup

O volume PostgreSQL contém dados financeiros. Não envie dumps para o GitHub. Armazene backups somente em mídia criptografada, valide a restauração periodicamente e destrua cópias antigas conforme sua política de retenção.

## Rotação

- **Pluggy:** crie novas credenciais, atualize `.env`, reconstrua o backend e revogue as antigas.
- **Webhook:** substitua `PLUGGY_WEBHOOK_SECRET` no `.env` e no painel Pluggy na mesma janela.
- **PostgreSQL:** faça backup, altere a senha no banco e atualize `POSTGRES_PASSWORD` e `DATABASE_URL`.
- **Sessões:** alterar a senha local invalida todas as sessões.

## GitHub

Publique como repositório privado. Ative branch protection para `main`, exija os checks **CI** e **CodeQL**, habilite Dependabot alerts, secret scanning e push protection. Nunca ignore um bloqueio de push protection sem investigar o arquivo e o histórico.
