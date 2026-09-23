# Visão geral do produto

## Finanças Open Local

O Finanças Open Local é uma aplicação de gestão financeira pessoal executada localmente. O projeto reúne informações de contas, cartões, faturas, transações, categorias e compromissos financeiros em uma interface única, com foco em clareza, privacidade e controle dos dados.

## Objetivos

- facilitar a visualização da situação financeira atual;
- reunir dados financeiros manuais e sincronizados;
- ajudar no acompanhamento de gastos, receitas, faturas e vencimentos;
- permitir análises por período, conta, cartão e categoria;
- manter credenciais e informações financeiras protegidas no ambiente local.

## Funcionalidades

### Dashboard

O painel principal apresenta saldo consolidado, entradas, saídas, evolução financeira e distribuição de gastos. O botão **Atualizar tudo** solicita uma nova sincronização das conexões e recalcula os indicadores exibidos.

### Contas e cartões

O usuário pode consultar contas bancárias e cartões separadamente, além de cadastrar registros manuais. Cartões possuem limite, fechamento, vencimento e faturas detalhadas quando essas informações estão disponíveis.

### Transações e categorias

As movimentações podem ser filtradas por período, conta, cartão, categoria e tipo. Também é possível criar lançamentos manuais e organizar despesas e receitas em categorias.

### Contas a pagar

O controle de contas a pagar registra descrição, valor, vencimento, quantidade de parcelas e data de pagamento. O histórico permite acompanhar compromissos pendentes e quitados.

### Open Finance

A integração com a Pluggy permite conectar instituições mediante consentimento do usuário. O fluxo importa os dados disponibilizados pela instituição e apresenta estados claros durante todo o processo:

- aguardando autorização;
- sincronizando;
- atualizado;
- erro de conexão ou sincronização.

Ao desconectar uma instituição, os dados vinculados a ela são removidos da aplicação. Credenciais do provedor permanecem somente no backend e nunca são enviadas ao navegador.

## Experiência de uso

A interface foi planejada para desktop e dispositivos móveis. Formulários apresentam validação e mensagens de retorno, enquanto avisos de sucesso ou erro aparecem como notificações no canto superior da tela. Estados vazios orientam o usuário quando ainda não existem contas, cartões, transações ou conexões.

## Arquitetura resumida

```text
Navegador -> Next.js -> NestJS -> PostgreSQL
                         |
                         +-> Pluggy Open Finance
```

- **Next.js:** interface, navegação, filtros, formulários e gráficos;
- **NestJS:** regras de negócio, autenticação e integração com o provedor;
- **Prisma e PostgreSQL:** persistência e relacionamento dos dados;
- **Docker Compose:** execução isolada e reproduzível dos serviços.

Para detalhes técnicos, consulte [Arquitetura](ARCHITECTURE.md). Para configuração e uso no Docker, consulte [Operação segura](OPERATIONS.md). As decisões de proteção de dados estão documentadas em [Segurança](SECURITY.md) e [Modelo de ameaças](THREAT_MODEL.md).
