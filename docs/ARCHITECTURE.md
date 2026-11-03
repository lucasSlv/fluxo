# Fluxo — Arquitetura

Aplicação de gestão financeira pessoal. Next.js 16 (App Router) + MongoDB/Mongoose.

## Camadas

```
app/            Rotas (páginas, layouts, route handlers). Só orquestra: lê a sessão, chama services, renderiza.
components/     UI. `ui/` (primitivos), `layout/` (shell), `finance/` e `dashboard/` (componentes de domínio).
modules/<dom>/  Domínio: `schemas.ts` (Zod), `service.ts` (regras de negócio + persistência), `actions.ts` (Server Actions).
modules/ledger/ Regras de contabilização compartilhadas por dashboard, relatórios, contas e insights.
models/         Schemas Mongoose + índices.
lib/            Infra: conexão, erros, logger, dinheiro, datas.
```

Regras:
- Componentes nunca acessam `models/` diretamente; passam por `modules/*/service.ts`.
- Todo service recebe `userId` como primeiro argumento e o inclui em **toda** query (isolamento por usuário).
- Server Actions validam entrada com Zod, resolvem o usuário pela sessão (nunca pelo payload) e retornam `ActionResult`.

## Autenticação

- Senha: Argon2id (`@node-rs/argon2`).
- Sessão: token aleatório de 32 bytes no cookie `fluxo_session` (httpOnly, sameSite=lax, secure em produção).
  No banco fica apenas o SHA-256 do token (`sessions.tokenHash`), com `expiresAt` = criação + 12h e índice TTL.
- Renovação: em mutações, se a sessão já passou de metade da vida, o token é rotacionado (novo token, sessão antiga apagada).
- Logout apaga a sessão; Configurações permite encerrar outras sessões.
- `proxy.ts` faz apenas a checagem otimista do cookie; a validação real ocorre no servidor (`requireUser`).
- Rate limit de login/cadastro persistido no MongoDB (coleção `rate_limits` com TTL).

## Dinheiro e datas

- Valores monetários sempre em **centavos inteiros** (`amount: number`, validado com `Number.isInteger`).
- Datas de calendário (data da movimentação, vencimento) são "date-only": gravadas como meia-noite UTC do dia.
  "Hoje" é calculado no fuso do usuário (padrão `America/Sao_Paulo`) e convertido para date-only.

## Modelo de dados

| Coleção | Principais campos |
|---|---|
| users | name, email (único), passwordHash, preferences {currency, dateFormat, timezone, alertThresholds} |
| sessions | userId, tokenHash (único), expiresAt (TTL), userAgent, ip, lastUsedAt |
| accounts | userId, name, type (checking/savings/cash/wallet/investment), initialBalance, color, archived |
| categories | userId, name, kind (income/expense), icon, color, parentId (subcategoria), archived |
| budgets | userId, categoryId, month `YYYY-MM`, limit — único por (user, categoria, mês) |
| transactions | ver abaixo |
| recurrences | userId, kind, description, amount, categoryId, accountId, frequency, startDate, endDate, dueDay, status |
| creditcards | userId, name, institution, limit, closingDay, dueDay, color |
| debts | userId, name, creditor, kind, totalAmount, installmentsCount, installmentAmount, interestRate, contractDate, firstDueDate, accountId |
| savingsboxes | userId, name, target, color |
| goals | userId, name, description, target, startDate, targetDate, priority, category, status, savingsBoxId?, contributions[] |
| auditlogs | userId, entity, entityId, action, before, after |
| attachments (GridFS) | comprovantes de movimentações |

### `transactions` — o livro-razão

Toda movimentação de dinheiro é um documento em `transactions`, discriminado por `kind`:

| kind | Efeito na conta | Conta como receita/despesa? |
|---|---|---|
| `income` | + accountId (quando `paid`) | Receita |
| `expense` com `accountId` | − accountId (quando `paid`) | Despesa |
| `expense` com `creditCardId` | nenhum (vira obrigação na fatura) | Despesa (competência = data da parcela) |
| `transfer` | − accountId, + toAccountId | Não |
| `card_payment` | − accountId, abate fatura do cartão | Não (liquidação) |
| `savings_deposit` | − accountId, + caixinha | Não |
| `savings_withdrawal` | + accountId, − caixinha | Não |

Status: `pending` (previsto), `paid` (efetivado), `cancelled`. "Atrasado" é **derivado**: `pending` com vencimento < hoje.
Assim a compra no cartão é a despesa; o pagamento da fatura é só liquidação — nunca há dupla contagem.

Idempotência: ocorrências de recorrência têm índice único parcial `(recurrenceId, occurrenceDate)` e são criadas
com upsert `$setOnInsert`; reprocessar nunca duplica. Parcelas de cartão/dívida compartilham `installment.groupId`.

### Saldos

- **Saldo da conta** = saldo inicial + efeitos de todas as transações `paid` daquela conta.
- **Saldo previsto** = saldo atual + receitas pendentes − despesas pendentes (de conta) até a data.
- **Patrimônio** = Σ contas + Σ caixinhas − fatura em aberto dos cartões − saldo devedor das dívidas.

Todos os indicadores usam as funções de `modules/ledger` — dashboard, relatórios e insights compartilham as mesmas regras.

## Ordem de implementação

1. Infra + autenticação
2. Contas → categorias → movimentações (núcleo do razão)
3. Dashboard
4. Orçamentos/limites, recorrências
5. Cartões, dívidas, caixinhas e objetivos
6. Relatórios, insights, calendário, configurações
