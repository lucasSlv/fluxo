# Fluxo

[![CI](https://github.com/lucasSlv/fluxo/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasSlv/fluxo/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-black.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![MongoDB](https://img.shields.io/badge/MongoDB-8-green)

**Gestão financeira pessoal completa** — receitas, despesas, contas, cartões de crédito, dívidas, limites de gastos,
recorrências, objetivos, caixinhas, calendário e relatórios com insights automáticos, em uma interface minimalista
inspirada em dashboards SaaS premium.

Não é um protótipo: todos os dados são persistidos no MongoDB, com autenticação real, regras de negócio no servidor,
validação em todas as entradas e testes automatizados dos fluxos financeiros.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Início rápido com Docker](#início-rápido-com-docker)
- [Desenvolvimento local](#desenvolvimento-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Regras de contabilização](#regras-de-contabilização)
- [Segurança](#segurança)
- [Testes](#testes)
- [API (Route Handlers)](#api-route-handlers)
- [Decisões de produto](#decisões-de-produto)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Funcionalidades

| Módulo | O que oferece |
|---|---|
| **Dashboard** | Saldo disponível e previsto, receitas, despesas e resultado do período (com comparação ao período anterior), % da renda comprometida, dívidas e faturas em aberto, total em caixinhas, patrimônio líquido, evolução do saldo em 12 meses, receitas × despesas, despesas por categoria e % da renda, evolução dos gastos, próximos vencimentos (com botão Pagar/Receber), contas atrasadas, alertas de limite, recorrências, parcelas futuras, objetivos e insights. Filtro por **mês, ano ou período personalizado**. |
| **Movimentações** | Receitas, despesas e transferências com descrição, valor, categoria/subcategoria, data, vencimento, conta, forma de pagamento, status (pendente/pago, atraso calculado), natureza (fixa/variável), observações e **anexos** (PDF/imagens). Listagem paginada agrupada por dia, abas (receitas, despesas, transferências, a pagar/receber, atrasadas), busca, filtros por período, categoria, conta, cartão, status, natureza e faixa de valor, ordenação por data/valor, exportação CSV e **histórico de alterações** por movimentação. |
| **Contas e carteiras** | Conta corrente, poupança, dinheiro, carteira digital e investimentos; saldo inicial, saldo calculado, transferências entre contas, **extrato** por período com saldo acumulado, arquivamento preservando histórico. |
| **Categorias** | Categorias padrão criadas no cadastro, categorias personalizadas com ícone e cor, subcategorias (1 nível), arquivamento automático quando já há uso. |
| **Limites mensais** | Limite por categoria **independente para cada mês**, gasto atual (somando subcategorias e compras no cartão), disponível, barras de progresso e alertas configuráveis em 50/75/90/100%. Cópia dos limites do mês anterior. |
| **Recorrências** | Semanal, mensal, trimestral, semestral e anual; dia de vencimento, data inicial/final, conta, pausar/retomar/cancelar. Cada ocorrência é uma movimentação própria: pagar, alterar só uma, alterar todas as próximas, cancelar uma, histórico de pagamentos. Geração **idempotente**. |
| **Cartões de crédito** | Limite total e disponível, dia de fechamento e vencimento, cor. Compras à vista ou **parceladas**, faturas abertas/fechadas/vencidas/pagas derivadas automaticamente, pagamento (total ou parcial) e estorno de fatura, parcelas futuras. |
| **Dívidas** | Empréstimos, financiamentos, compras parceladas, dívidas pessoais e acordos; valor total, pago, saldo devedor, parcelas, juros, parcelas já pagas antes do cadastro, pagamento de parcelas, **amortização extra** (reduz prazo), atrasos, previsão de quitação e comprometimento mensal. |
| **Objetivos** | Valor desejado e acumulado, datas, prioridade, categoria, status, barra/anel de progresso, aporte mensal necessário e **previsão de conclusão baseada no ritmo real de aportes**. Pode ser vinculado a uma caixinha ou receber aportes manuais. |
| **Caixinhas** | Reservas independentes com meta, depósitos e resgates a partir de contas, histórico e estorno. Movimentações de caixinha **não contam como receita/despesa**. |
| **Calendário** | Grade mensal (lista no mobile) com contas a vencer, pagas e atrasadas, receitas previstas e recebidas, faturas, parcelas de cartão, parcelas de dívida e recorrências, com cores e legenda por tipo/status. |
| **Relatórios** | Resultado financeiro, taxa de economia, evolução patrimonial, maiores e menores gastos, comparativo mensal por categoria, fixos × variáveis, recorrentes, gastos extraordinários, previsão dos próximos 3 meses, comprometimento da renda, dívidas e projeção de quitação, evolução dos objetivos e **inteligência financeira**. Exportação **CSV** (movimentações e resumo) e **PDF** (impressão otimizada). |
| **Configurações** | Dados pessoais, alteração de senha (encerra as outras sessões), moeda (BRL padrão), formato de data, fuso horário, limiares de alerta, antecedência de avisos de vencimento e gerenciamento de sessões ativas. |

Interface responsiva (desktop e mobile, com navegação inferior e botão rápido de "nova movimentação"), botão global de
nova movimentação, busca no topo e contador de alertas.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions, Route Handlers, Proxy) |
| UI | **React 19**, **TypeScript**, **Tailwind CSS 4**, lucide-react, Recharts |
| Banco | **MongoDB** com **Mongoose 9** (GridFS para anexos) |
| Validação | **Zod 4** (no servidor, para toda entrada) |
| Autenticação | E-mail + senha, **Argon2id** (`@node-rs/argon2`), sessões persistidas no MongoDB |
| Testes | **Vitest** + **mongodb-memory-server** |

---

## Início rápido com Docker

A forma mais simples de usar: só precisa do [Docker](https://docs.docker.com/get-docker/) (com Compose).

```bash
git clone https://github.com/lucasSlv/fluxo.git
cd fluxo
docker compose up -d --build
```

Acesse <http://localhost:3000>, crie sua conta em **/register** e cadastre suas contas com o saldo atual.

O `docker-compose.yml` sobe dois serviços:

| Serviço | Imagem | Porta | Observação |
|---|---|---|---|
| `mongo` | `mongo:8` | `27017` | dados persistidos no volume `mongo-data` |
| `app` | build do `Dockerfile` | `3000` | sobe só depois do Mongo ficar saudável; healthcheck em `/api/health` |

Comandos úteis:

```bash
docker compose logs -f app                       # logs (JSON estruturado)
docker compose down                              # para os serviços (mantém os dados)
docker compose down -v                           # para e APAGA os dados
docker compose up -d --build                     # atualiza após um git pull
APP_PORT=8080 MONGO_PORT=27018 docker compose up -d   # outras portas, se 3000/27017 estiverem ocupadas
```

> **HTTPS / produção:** o compose define `COOKIE_SECURE=false` para funcionar em `http://localhost`. Ao publicar
> atrás de HTTPS (proxy reverso como Caddy, Nginx ou Traefik), defina `COOKIE_SECURE=true` e não exponha a porta
> do MongoDB.

### Só a imagem

```bash
docker build -t fluxo .
docker run -p 3000:3000 -e MONGODB_URI="mongodb+srv://usuario:senha@cluster/fluxo" fluxo
```

A imagem usa o build *standalone* do Next.js sobre `node:24-alpine`, roda como usuário sem privilégios e não inclui
código de testes nem dependências de desenvolvimento.

---

## Desenvolvimento local

### Pré-requisitos

- Node.js **20.9+** (o projeto usa Node 24)
- MongoDB 6+ — via Docker, instalação local, MongoDB Atlas ou o script `db:local` (sem Docker)

### Passo a passo

```bash
git clone https://github.com/lucasSlv/fluxo.git
cd fluxo
npm install
cp .env.example .env.local

# MongoDB — escolha uma opção:
docker compose up -d mongo     # só o banco, via Docker
npm run db:local               # sem Docker: mongod local persistido em ./.mongo-data

npm run dev                    # http://localhost:3000
```

Cada usuário começa sem dados: cadastre contas (com saldo inicial) e registre movimentações. Categorias padrão são
criadas automaticamente no cadastro.

### Dados de demonstração (opcional)

```bash
npm run seed:demo
```

Cria **somente** o usuário `demo@fluxo.test` (senha `demo12345`) com ~6 meses de histórico: salário e contas
recorrentes, despesas variáveis, cartão com compras parceladas e faturas pagas, financiamento, caixinhas, objetivos e
limites. O seed usa os mesmos services da aplicação (as regras de negócio são aplicadas) e, ao rodar de novo, recria
apenas esse usuário. Por ter senha pública, ele é **bloqueado quando `NODE_ENV=production`**.

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (desenvolvimento) ou configure no seu provedor/compose. Só **`MONGODB_URI`** é
obrigatória — não há chaves secretas a gerar: as sessões ficam no próprio banco.

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `MONGODB_URI` | **sim** | — | String de conexão. Ex.: `mongodb://127.0.0.1:27017/fluxo` ou `mongodb+srv://usuario:senha@cluster.xxxxx.mongodb.net/fluxo` |
| `SESSION_TTL_HOURS` | não | `12` | Duração da sessão em horas |
| `LOG_LEVEL` | não | `info` | `debug`, `info`, `warn` ou `error` |
| `COOKIE_SECURE` | não | `true` em produção | `false` só para rodar o build de produção via HTTP (ex.: compose local) |
| `ALLOW_DEMO_SEED` | não | — | `true` libera o `seed:demo` com `NODE_ENV=production` (não recomendado) |
| `APP_PORT` / `MONGO_PORT` | não | `3000` / `27017` | Portas publicadas pelo `docker-compose.yml` |

`NODE_ENV` é definido automaticamente pelo Next.js (`next build`/`next start`) e pela imagem Docker.

**MongoDB Atlas:** crie um cluster, um usuário de banco e libere em *Network Access* o IP de onde a aplicação roda.
Inclua o nome do banco no caminho da URI (`/fluxo`).

---

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes unitários e de integração (usa MongoDB em memória, nunca o seu banco) |
| `npm run test:watch` | Testes em modo observação |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run db:local` | MongoDB local sem Docker |
| `npm run seed:demo` | Usuário de demonstração |
| `docker compose up -d --build` | Aplicação completa em containers |

---

## Arquitetura

```
src/
├── app/
│   ├── (auth)/            login e cadastro
│   ├── (app)/             área autenticada (uma pasta por módulo; _components = client components da página)
│   └── api/               exportações CSV e anexos
├── components/
│   ├── ui/                primitivos (Button, Card, Field, Modal, MoneyInput, Progress, Badge…)
│   ├── layout/            sidebar, topbar, navegação mobile, modal global de nova movimentação
│   ├── dashboard/         gráficos e ilustrações do dashboard
│   ├── reports/           gráficos dos relatórios
│   └── finance/           componentes de domínio (formulário de movimentação, filtros de período…)
├── modules/<domínio>/     schemas.ts (Zod) · service.ts (regras + persistência) · actions.ts (Server Actions) · rules.ts (regras puras)
│   └── ledger/            regras de contabilização compartilhadas
├── models/                schemas Mongoose e índices
├── lib/                   conexão, erros, logger, dinheiro, datas, período, constantes
├── hooks/                 useAction (execução de Server Actions com feedback)
└── proxy.ts               checagem otimista de sessão
```

**Princípios**

- **Camadas separadas**: páginas apenas orquestram; regras de negócio ficam em `modules/*/service.ts`; regras puras
  (testáveis sem banco) em `rules.ts`; componentes nunca acessam models diretamente.
- **Isolamento por usuário**: todo service recebe `userId` (resolvido da sessão, nunca do payload) e o inclui em
  todas as queries; toda referência vinda do cliente (conta, categoria, cartão…) é verificada com `assertOwned`.
- **Server Actions padronizadas**: `authedAction` resolve o usuário, renova a sessão quando necessário, valida com Zod
  e devolve um `ActionResult` serializável (`{ ok, data }` ou `{ ok: false, code, error, fieldErrors }`).
- **Erros padronizados** (`AppError` com códigos `VALIDATION`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`,
  `RATE_LIMITED`…) e **logs estruturados** em JSON.
- **Renderização dinâmica**: todos os dados são por usuário, então as páginas são renderizadas por requisição.

Detalhes adicionais em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Modelo de dados

| Coleção | Campos principais | Índices relevantes |
|---|---|---|
| `users` | name, email, passwordHash, preferences (moeda, formato de data, fuso, limiares, antecedência) | email único |
| `sessions` | userId, tokenHash, expiresAt, userAgent, ip, lastUsedAt | tokenHash único, **TTL** em expiresAt |
| `ratelimits` | key, count, expiresAt | key único, TTL |
| `accounts` | name, type, institution, initialBalance, color, archived | (userId, archived, name) |
| `categories` | name, kind, icon, color, parentId, system, archived | único parcial (userId, kind, parentId, name) |
| `budgets` | categoryId, month (`YYYY-MM`), limit | único (userId, month, categoryId) |
| `transactions` | kind, description, amount, date, dueDate, paidAt, status, categoryId, accountId, toAccountId, creditCardId, invoiceMonth, savingsBoxId, debtId, recurrenceId, occurrenceDate, overridden, installment, paymentMethod, nature, notes, attachments | por usuário+data, tipo/status, conta, categoria, vencimento, cartão+fatura; **único parcial (recurrenceId, occurrenceDate)**; texto em description |
| `recurrences` | kind, description, amount, categoryId, accountId, frequency, startDate, endDate, dueDay, status, generatedUntil | (userId, status) |
| `creditcards` | name, institution, limit, closingDay, dueDay, color, defaultAccountId | (userId, archived) |
| `debts` | name, creditor, kind, totalAmount, installmentsCount, installmentAmount, paidBefore, interestRate, contractDate, firstDueDate, accountId, status | (userId, status) |
| `savingsboxes` | name, target, color, icon | (userId, archived) |
| `goals` | name, description, target, startDate, targetDate, priority, category, status, savingsBoxId, contributions[] | (userId, status) |
| `auditlogs` | entity, entityId, action, before, after | (userId, entity, entityId, createdAt) |
| `attachments.*` (GridFS) | arquivo + metadata (userId, transactionId) | — |

Todos os documentos de domínio possuem `userId`.

---

## Regras de contabilização

Todo dinheiro que se move é um documento em `transactions`, discriminado por `kind`. Dashboard, relatórios, extratos e
insights usam as **mesmas funções** de `src/modules/ledger`.

| kind | Efeito no saldo da conta | Receita/despesa? |
|---|---|---|
| `income` | + conta (quando paga) | Receita |
| `expense` (conta) | − conta (quando paga) | Despesa |
| `expense` (cartão) | nenhum — vira obrigação na fatura | Despesa, na data da parcela |
| `transfer` | − origem, + destino | **Não** |
| `card_payment` | − conta, quita a fatura | **Não** (liquidação) |
| `savings_deposit` / `savings_withdrawal` | − / + conta, + / − caixinha | **Não** |

- **Valores em centavos inteiros** — nada de ponto flutuante; parcelamentos distribuem o resto do arredondamento na
  1ª parcela, e a soma sempre bate com o total.
- **Previsto × realizado**: `pending` é previsto, `paid` é realizado, `cancelled` é ignorado. **Atrasado** é derivado
  (`pending` com vencimento anterior a hoje), nunca gravado.
- **Cartão sem dupla contagem**: a compra é a despesa; o pagamento da fatura só liquida a obrigação. Faturas são
  derivadas de compras e pagamentos (sem estado duplicado). Compras no dia do fechamento ou depois caem na fatura
  seguinte.
- **Saldo da conta** = saldo inicial + efeitos das transações pagas.
  **Saldo previsto** = saldo atual + receitas pendentes − despesas pendentes (de conta) até o fim do período.
  **Patrimônio** = contas + caixinhas − faturas em aberto − saldo devedor das dívidas.
- **Recorrências idempotentes**: as datas são geradas por uma função pura e determinística e gravadas com upsert
  `$setOnInsert` sobre um índice único `(recurrenceId, occurrenceDate)`. Reprocessar (inclusive em paralelo) nunca
  duplica; ocorrências canceladas ou editadas individualmente nunca são recriadas ou sobrescritas. "Alterar todas as
  próximas" afeta apenas ocorrências futuras, pendentes e não editadas.
- **Exclusões consistentes**: ocorrência de recorrência é cancelada (não apagada); parcela de cartão exclui a compra
  inteira; parcelas de dívida são geridas pela dívida; contas/categorias/cartões com histórico são arquivados.
- **Datas e fusos**: datas de calendário são "date-only" (meia-noite UTC do dia); "hoje" é calculado no fuso do
  usuário (padrão `America/Sao_Paulo`). Somar meses respeita o fim do mês (31/01 + 1 mês = 28/02).
- **Histórico**: criações, edições, mudanças de status e exclusões relevantes ficam em `auditlogs` e aparecem na
  página de detalhe da movimentação.

---

## Segurança

- Senhas com **Argon2id** (parâmetros OWASP); mensagem de login genérica e tempo de resposta equalizado quando o
  e-mail não existe.
- Sessão: token aleatório de 32 bytes em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção. No banco fica
  apenas o **SHA-256** do token, com expiração de **12 horas** e índice TTL.
- **Renovação segura**: após metade da vida útil, uma mutação rotaciona o token e invalida o anterior.
- Logout invalida a sessão no banco; é possível encerrar sessões individualmente ou todas as outras; trocar a senha
  encerra as demais sessões.
- **Rate limiting** persistido no MongoDB para login (por IP e por e-mail), cadastro e troca de senha.
- Proteção de rotas: `proxy.ts` faz a checagem otimista; a validação real acontece no servidor em toda página, Server
  Action e Route Handler.
- Validação com Zod no servidor para toda entrada; saldos e permissões **nunca** são calculados a partir de dados
  enviados pelo cliente.
- Anexos: tipos permitidos (PDF, PNG, JPG, WEBP), limite de 5 MB, nome sanitizado e acesso restrito ao dono.

---

## Testes

```bash
npm test
```

Os testes sobem um MongoDB em memória (replica set) — não é preciso ter Mongo instalado e o banco real nunca é usado.

- **Unitários**: dinheiro (parse, formatação, parcelamento), datas e fusos, períodos, efeitos no saldo, agenda de
  recorrências, faturas de cartão, limiares de orçamento, projeção de objetivos e insights.
- **Integração** (services + MongoDB): consistência entre a agregação e a regra pura de saldo, transferências e
  caixinhas fora de receitas/despesas, cartão sem dupla contagem e limite disponível, recorrências idempotentes
  (inclusive concorrência), edição de uma/todas as ocorrências e cancelamento, dívidas com amortização e quitação,
  limites com subcategorias e cartão, cadastro/login/rate limit/troca de senha e **isolamento entre usuários**.

---

## API (Route Handlers)

Exceto `/api/health`, todas exigem sessão (401 sem ela) e retornam erros com o status HTTP correspondente.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/export/transactions` | CSV das movimentações (aceita os mesmos filtros da listagem; `;` como separador, BOM UTF-8, decimais com vírgula) |
| `GET` | `/api/export/report` | CSV de resumo do período (`?month=`, `?year=` ou `?from=&to=`) |
| `POST` | `/api/transactions/:id/attachments` | Upload de comprovante (multipart, campo `file`) |
| `GET` | `/api/attachments/:fileId` | Download/visualização do comprovante |
| `GET` | `/api/health` | Saúde da aplicação e do MongoDB (**pública**, sem dados; usada pelo healthcheck) |

As demais operações são **Server Actions** em `src/modules/*/actions.ts`.

---

## Decisões de produto

- **Competência**: receitas e despesas são contabilizadas pela data da movimentação (no cartão, pela data de cada
  parcela), e não pela data do pagamento.
- **Compras no cartão** nascem como efetivadas (a obrigação existe) e consomem o limite até a fatura ser paga.
- **Parcelas de dívida** são despesas pendentes na categoria "Dívidas"; parcelas pagas antes do cadastro entram no
  valor pago sem alterar saldos de conta.
- **Listagem de movimentações**: sem filtros, mostra até o fim do mês atual; lançamentos futuros ficam em
  "A pagar/receber" ou via filtro de datas.
- **Insights** só aparecem com dados suficientes; durante um mês em andamento, comparações do tipo "gastou menos" são
  omitidas por serem enganosas.
- **Gastos extraordinários**: despesas avulsas (não recorrentes nem parceladas) de pelo menos 3× a mediana do período e
  no mínimo R$ 100.
- **PDF**: gerado pela impressão do navegador com folha de estilo própria (sidebar e controles ocultos).

---

## Deploy

**Com Docker (VPS, Railway, Render, Fly.io…)**

1. Use o `Dockerfile` do repositório (ou `docker compose up -d --build` em um servidor).
2. Defina `MONGODB_URI` apontando para um MongoDB com autenticação (ex.: Atlas).
3. Sirva via **HTTPS** com `COOKIE_SECURE=true` (padrão em produção).
4. Healthcheck: `GET /api/health` (200 quando o banco está acessível, 503 caso contrário).

**Sem Docker (Vercel ou Node)**

1. Defina `MONGODB_URI` nas variáveis de ambiente do provedor.
2. `npm run build && npm start` (na Vercel, o build é automático).

Os índices são criados pelo Mongoose na primeira conexão; em bases grandes, prefira criá-los antes do deploy.

---

## Roadmap

- Importação de extratos (OFX/CSV)
- Múltiplas moedas com conversão
- Notificações por e-mail de vencimentos
- Metas de orçamento sugeridas a partir do histórico
- Modo escuro

---

## Contribuindo

Contribuições são muito bem-vindas! Leia o [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de trabalho, as
convenções do código e como rodar os testes. Vulnerabilidades devem ser reportadas de forma privada, conforme o
[SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © lucasSlv
