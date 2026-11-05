# Contribuindo com o Fluxo

Obrigado pelo interesse! Contribuições de todos os tamanhos são bem-vindas: correções, testes, documentação,
melhorias de UX e novas funcionalidades.

## Fluxo de trabalho

1. Abra (ou comente) uma **issue** descrevendo o problema ou a proposta — para mudanças grandes, alinhe a ideia antes.
2. Faça um **fork** e crie um branch a partir de `main` (`feat/importacao-ofx`, `fix/saldo-transferencia`…).
3. Desenvolva com testes, rode as verificações e abra um **Pull Request** preenchendo o template.

## Ambiente

```bash
npm install
cp .env.example .env.local
docker compose up -d mongo     # ou: npm run db:local
npm run dev
npm run seed:demo              # opcional: usuário demo@fluxo.test / demo12345
```

Antes do PR:

```bash
npm run typecheck && npm run lint && npm test
```

O CI roda as mesmas verificações, além do `next build` e do build da imagem Docker.

## Convenções do código

- **Camadas**: páginas em `src/app` só orquestram. Regras de negócio e persistência ficam em
  `src/modules/<domínio>/service.ts`; regras puras (sem banco) em `rules.ts`; validação em `schemas.ts` (Zod);
  Server Actions em `actions.ts`, sempre via `authedAction`.
- **Regras financeiras** (o que é receita, despesa, efeito em saldo) vivem em `src/modules/ledger`. Dashboard,
  relatórios e extratos devem reutilizá-las — nunca recalcular por conta própria.
- **Dinheiro em centavos inteiros** (`number` inteiro). Formate apenas na exibição (`formatMoney`).
- **Datas de calendário são date-only** (meia-noite UTC). Use os helpers de `src/lib/dates.ts`; "hoje" depende do
  fuso do usuário.
- **Isolamento por usuário**: toda query inclui `userId`; ids vindos do cliente passam por `assertOwned`.
- **Client Components** não podem importar `models/` nem `mongoose`. Enumerações compartilhadas ficam em
  `src/lib/constants.ts`.
- **Textos da interface em português (pt-BR)**; identificadores de código em inglês.
- Siga o estilo visual existente (componentes de `src/components/ui`).

## Testes

- Regras puras: `tests/unit`.
- Fluxos com banco: `tests/integration` (MongoDB em memória, criado automaticamente — não precisa de Mongo instalado).
- Toda regra financeira nova ou corrigida deve vir com teste que demonstre o comportamento.

## Commits

Mensagens curtas e descritivas, de preferência no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
(`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).

## Segurança

Vulnerabilidades devem ser reportadas de forma privada — veja [SECURITY.md](SECURITY.md).
