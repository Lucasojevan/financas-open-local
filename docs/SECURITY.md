# Segurança e privacidade

## Escopo

A aplicação foi endurecida para uso pessoal local. Ela não deve ser exposta diretamente à internet. Para acesso remoto, use HTTPS válido, autenticação adicional e revisão de infraestrutura.

## Controles implementados

- Argon2id com 64 MiB, três iterações e paralelismo 1;
- resposta de login uniforme e custo equivalente quando o usuário não existe;
- rate limiting global, além de limites mais restritos para setup e login;
- token de sessão aleatório com 256 bits e somente hash SHA-256 no banco;
- cookie `HttpOnly`, `SameSite=Strict`, prioridade alta e `Secure` sob HTTPS;
- expiração, logout, remoção de sessões antigas e invalidação total ao trocar senha;
- autorização por `userId` em recursos financeiros;
- CSRF mitigado por SameSite e verificação obrigatória de `Origin`;
- validação com class-validator e Zod, limites de tamanho e Prisma parametrizado;
- webhook desabilitado sem segredo, comparação em tempo constante, allowlist de eventos e fila idempotente;
- credenciais Pluggy somente no backend;
- headers de segurança no NestJS e Next.js, CSP e bloqueio de frames;
- respostas da API marcadas `no-store`;
- backend e PostgreSQL sem portas no host;
- containers sem root, com filesystem somente leitura e privilégios reduzidos;
- redaction de chaves sensíveis em estruturas destinadas a logs;
- CI, CodeQL, Dependabot, `.gitignore` e `.dockerignore`.

## Limitações conhecidas

- o CSP do Next.js ainda requer `unsafe-inline`; migrar para nonces antes de exposição pública;
- não há MFA para o login local;
- dados no volume PostgreSQL não são criptografados pela aplicação; use criptografia de disco do sistema operacional;
- backups criptografados ainda dependem do operador;
- segurança do host, Docker Desktop, navegador e conta Pluggy permanece fora do processo da aplicação.

## Dados proibidos

Nunca registre ou versione senha bancária, PIN, OTP/MFA, CVV, PAN completo, cookie, token, `CLIENT_SECRET`, dumps, backups ou payloads financeiros brutos.

## Referências

O desenho segue as recomendações OWASP para autenticação, sessões, CSRF e APIs REST. Veja também [Threat model](THREAT_MODEL.md), [Operação](OPERATIONS.md) e a política [SECURITY.md](../SECURITY.md).
