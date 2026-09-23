# Roadmap

Este documento registra o estado atual e as próximas melhorias do Finanças Open Local. Itens concluídos descrevem funcionalidades presentes no código; itens planejados ainda não devem ser tratados como disponíveis.

## Concluído

### Fundação

- [x] monorepo com frontend Next.js, backend NestJS e tipos compartilhados;
- [x] PostgreSQL com Prisma e migrações;
- [x] Docker Compose com rede privada e health checks;
- [x] autenticação local, primeiro acesso, login, logout e alteração de senha;
- [x] sessão protegida e guard aplicado às rotas privadas.

### Gestão financeira

- [x] dashboard com saldo, entradas, saídas e resultado mensal;
- [x] gráficos de evolução e gastos por categoria;
- [x] contas, cartões, categorias e transações manuais;
- [x] filtros por período, conta, cartão, categoria e tipo;
- [x] cartões e faturas detalhados;
- [x] contas a pagar com parcelas, vencimentos e pagamentos;
- [x] notificações de erro e estados vazios na interface.

### Pluggy Open Finance

- [x] Connect Token criado somente no backend;
- [x] widget de consentimento no frontend;
- [x] associação de Item ao usuário;
- [x] importação de contas, cartões, faturas e transações;
- [x] sincronização individual e atualização de todas as conexões;
- [x] estados de autorização, sincronização, atualização e erro;
- [x] desconexão com remoção dos dados importados;
- [x] webhook autenticado e fila persistida de eventos.

### Segurança e operação

- [x] containers sem root, filesystem somente leitura e capabilities removidas;
- [x] API e PostgreSQL sem portas públicas no host;
- [x] credenciais do provedor restritas ao backend;
- [x] documentação de segurança, ameaças e operação;
- [x] CI, CodeQL e Dependabot configurados.

## Próximas melhorias

### Confiabilidade

- [ ] ampliar testes de integração do fluxo completo de sincronização;
- [ ] implementar política explícita de retry com backoff para limites e indisponibilidade da Pluggy;
- [ ] adicionar histórico operacional dos jobs sem armazenar payload financeiro bruto;
- [ ] criar rotina guiada de diagnóstico e recuperação.

### Dados e privacidade

- [ ] backup criptografado com fluxo de restauração validado;
- [ ] política configurável de retenção de dados;
- [ ] exclusão total da conta local com confirmação forte;
- [ ] auditoria adicional para ações administrativas e rotação de segredos.

### Produto

- [ ] regras locais configuráveis de categorização;
- [ ] exportação de relatórios em formatos abertos;
- [ ] melhorias de acessibilidade verificadas por testes automatizados;
- [ ] novos provedores somente após validação técnica, contratual e de segurança.
