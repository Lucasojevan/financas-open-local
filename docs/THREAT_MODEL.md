# Threat model

## Ativos

- credenciais locais e hashes de senha;
- cookie de sessão e consentimentos Pluggy;
- saldos, transações, faturas, contas a pagar e categorias;
- `CLIENT_ID`, `CLIENT_SECRET`, segredo do webhook e credenciais PostgreSQL.

## Fronteiras de confiança

```text
Navegador -> Next.js (porta 127.0.0.1:3000) -> NestJS -> PostgreSQL
                                                |
                                                +-> API Pluggy
Pluggy -> webhook HTTPS -> NestJS -> fila persistida
```

O navegador nunca recebe credenciais Pluggy permanentes. PostgreSQL e NestJS não publicam portas no host.

## Ameaças e controles

| Ameaça | Controle implementado | Risco residual |
| --- | --- | --- |
| Força bruta e enumeração | Argon2id, resposta genérica, verificação falsa de custo equivalente, rate limit | IP compartilhado e ataque local |
| Roubo/fixação de sessão | 256 bits aleatórios, somente hash no banco, HttpOnly, SameSite Strict, Secure em HTTPS, expiração | malware com acesso ao navegador |
| CSRF | SameSite Strict e validação obrigatória de `Origin` em mutações | extensões maliciosas locais |
| IDOR | todas as consultas mutáveis filtram por `userId` | regressão futura sem teste dedicado |
| Webhook forjado | segredo obrigatório, comparação em tempo constante, eventos permitidos, fila idempotente | segredo comprometido |
| XSS/clickjacking | React, CSP, frame-ancestors, X-Frame-Options, no HTML bruto | CSP ainda permite inline do Next.js |
| SQL injection | Prisma e validação Zod/class-validator | SQL bruto futuro |
| Vazamento de segredo | `.gitignore`, `.dockerignore`, CI, documentação e GitHub push protection | segredo já copiado fora do projeto |
| Escalada no container | usuário não-root, `read_only`, `cap_drop: ALL`, `no-new-privileges`, redes separadas | vulnerabilidade do runtime/kernel |
| Dependência vulnerável | lockfile, Dependabot, CodeQL e CI | janela entre divulgação e atualização |
| Dados em trânsito | HTTPS obrigatório fora de localhost | localhost continua HTTP por desenho |

## Decisões operacionais

- GitHub deve ser **privado** enquanto houver risco de histórico com segredos.
- Nunca versionar `.env`, dumps, backups, capturas ou respostas da Pluggy.
- O webhook permanece indisponível quando `PLUGGY_WEBHOOK_SECRET` está vazio.
- Para exposição fora de localhost, usar TLS válido e proxy reverso; nunca publicar PostgreSQL ou a API diretamente.
