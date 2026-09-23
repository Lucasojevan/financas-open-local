# Política de segurança

## Versões suportadas

Somente a versão mais recente da branch `main` recebe correções de segurança.

## Como reportar

Não abra uma issue pública com credenciais, dados financeiros ou detalhes exploráveis. Use **Security > Advisories > New draft security advisory** no GitHub do projeto. Inclua impacto, passos mínimos de reprodução e versão observada, removendo todos os dados pessoais.

## Segredos expostos

Se uma chave Pluggy, senha do PostgreSQL, cookie ou outro segredo for exposto:

1. revogue ou rotacione o segredo imediatamente;
2. encerre os containers;
3. invalide sessões e reconecte as instituições;
4. remova o segredo do histórico antes de publicar novamente;
5. revise os logs sem copiar payloads financeiros.

## Escopo

São relevantes falhas de autenticação, autorização entre usuários, vazamento de dados financeiros, CSRF, XSS, SSRF, injeção, exposição de segredos, bypass do webhook e execução fora do container.
