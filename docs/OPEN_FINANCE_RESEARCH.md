# Pesquisa de integração Open Finance

Pesquisa realizada em **10 de setembro de 2026**. As versões e exigências devem ser revalidadas imediatamente antes da Fase 4.

## Resultado executivo

### Santander

O Santander mantém portal oficial de desenvolvedores e apresenta a API “Saldo e Extrato”, que consulta contas, saldos e transações do Santander e de instituições consentidas via Open Finance. Isso confirma a existência de oferta oficial, mas **não confirma acesso pessoal e irrestrito a produção**. A contratação, elegibilidade, credenciais, ambiente, certificados e termos precisam ser obtidos no próprio portal antes de codificar o adapter.

Fontes oficiais:

- https://developer.santander.com.br/api/visao-geral/contas-saldo-e-extrato-visao-geral
- https://developer.santander.com.br/api-library
- https://www.santander.com.br/blog/api-santander-open-finance

### Pamcard

Não foi localizada, nas páginas oficiais indexadas da Pamcard/Roadcard consultadas, documentação pública de API para extratos/transações nem uma integração Open Finance destinada a aplicações pessoais. Ausência em busca pública não prova inexistência; por isso o status correto é **não confirmado**, não “indisponível”.

Decisão: `PamcardProvider` será apenas um placeholder que falha fechado com mensagem de “integração não configurada”. Não haverá scraping, login automatizado, engenharia reversa nem coleta de senha. A avaliação será repetida com documentação oficial ou contato formal da instituição na Fase 5.

Fonte institucional consultada:

- https://pamcard.com.br/

## Requisitos do ecossistema

As especificações oficiais indicam uma API de consentimentos para dados cadastrais/transacionais, um perfil de segurança financeiro baseado em OAuth/OIDC/FAPI e cadastro/roles no Diretório. A certificação FAPI/DCR é obrigatória para quem atua como receptor de dados. O onboarding oficial de receptores exige habilitar o papel regulatório `DADOS` e cumprir reciprocidade.

Fontes oficiais:

- https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/155910145
- https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/1210548229
- https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/134283363/07.%2BCadastrando%2Breivindica%2Bes%2Bde%2Bautoridade
- https://github.com/OpenBanking-Brasil/specs-seguranca
- https://github.com/OpenBanking-Brasil/api-consents
- https://github.com/OpenBanking-Brasil/api-accounts
- https://github.com/OpenBanking-Brasil/api-credit-cards

## Respostas às nove perguntas obrigatórias

1. **Qual API?** Ainda não selecionada para produção. Candidata oficial: Saldo e Extrato do Santander ou um receptor de dados habilitado que exponha contas/transações. Os schemas regulatórios serão usados apenas após confirmação da versão vigente.
2. **Quem fornece?** Santander/fornecedor receptor contratado. O ecossistema e especificações são governados pelo Open Finance Brasil.
3. **Consentimento?** Iniciado pela receptora, com autenticação e autorização no canal oficial da transmissora; o app local não coleta credenciais bancárias.
4. **Dados?** Em princípio, contas, saldos e transações consentidas; cartões/faturas dependem da oferta e do escopo efetivamente autorizados.
5. **Credenciais?** A definir no onboarding oficial. É esperado que produção exija identidade de cliente, certificados e material criptográfico; nenhum valor será inventado.
6. **Onde ficam?** Somente no backend; variáveis/arquivos secretos locais, fora do Git e do banco. Tokens persistidos com criptografia autenticada.
7. **Requisitos de produção?** Habilitação/contrato do receptor, Diretório, certificações aplicáveis, mTLS/FAPI e validações do fornecedor — confirmar na contratação.
8. **O que precisa estar na internet?** Redirect URI/callback HTTPS e webhook, quando exigidos, precisam ser alcançáveis pelo provedor. O dashboard e o banco não precisam nem devem ser públicos.
9. **O que pode ficar em localhost?** UI, API de domínio, PostgreSQL, categorização, análises e backups. Se um callback público for obrigatório, usar componente mínimo e isolado operado por fornecedor autorizado; nunca expor o dashboard por port forwarding.

## Gate para implementar adapter real

O código real só começa quando houver, simultaneamente:

- documentação oficial atual e versão fixada;
- confirmação do papel legal/contratual do consumidor da API;
- sandbox e credenciais emitidas oficialmente;
- definição de redirect/callback e revogação;
- escopos mínimos aprovados;
- estratégia de certificados e rotação;
- threat model revisado;
- teste de consentimento sem captura de credenciais.
