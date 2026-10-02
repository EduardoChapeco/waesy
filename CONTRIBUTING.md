# GUIA DE CONTRIBUICAO — REPOSITORIO WAESY

## 1. Contrato Operacional
Todas as contribuicoes no ecossistema Waesy devem respeitar o contrato estrito definido em `AGENTS.md` e a constituicao visual em `docs/design/DESIGN.md`.

---

## 2. Estrutura e Separacao de Camadas
- `src/components/`: Primitivas e blocos de interface reutilizaveis. Proibido declarar cores literais (`#hex`) ou regras brutas de persistencia.
- `src/services/`: Server Functions e integracoes BFF. Proibido manipular DOM ou importar componentes de visualizacao.
- `src/lib/`: Schemas Zod, validadores puros, formatadores e clientes de infraestrutura.
- `src/routes/`: Definicoes de rotas TanStack Router. Devem delegar queries e mutacoes as Server Functions em `src/services/`.

---

## 3. Os 5 Gates de Qualidade Obrigatorios
Antes de qualquer submissao de merge, a contribuicao deve atender aos seguintes criterios:

1. **Gate 1 — TypeScript Estrito:** Compilacao limpa sem erros (`tsc --noEmit`).
2. **Gate 2 — Design Lint:** Zero violacoes P0 (acessibilidade, especificidade) e P1 (tokens, touch targets) adicionadas (`node scripts/design-lint.mjs --ratchet`).
3. **Gate 3 — Testes Automatizados:** 100% dos testes verdes (`npm run test`).
4. **Gate 4 — Bundle de Producao:** Compilacao limpa gerando artefatos otimizados (`npm run build`).
5. **Gate 5 — Codigo Limpo:** Zero orfaos bloqueantes detectados (`node scripts/dead-code-detector.mjs`).

---

## 4. Padroes de Interface e Design System
- **Sem Mocks:** Proibido utilizar mocks, dados estaticos ficticios ou arrays simulados. Todo dado deve originar de tabelas reais do Supabase.
- **Grade Canônica de 4px:** Todos os espacamentos (`p-`, `m-`, `gap-`) devem ser multiplos inteiros de 4px.
- **Touch Targets Minimos:** Todo elemento interativo deve possuir tamanho minimo de 44x44px (`h-11`, `size-11`) em visualizacao movel.
- **Foco Acessivel:** Todo controle interativo deve declarar anel de foco explícito (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`).
- **Linguagem Direta:** Proibido titulos compostos ou com mais de 6 palavras, caixas explicativas redundantes ou texto explicativo obvio.

---

## 5. Fluxo de Trabalho e Commits
- Cada ciclo de mudanca deve possuir especificacao previa registrada em `docs/specs/SPEC-*.md`.
- Decisoes arquiteturais sao documentadas em `docs/design/DECISIONS.md` no formato padronizado `DEC-XXX`.
- Commits utilizam o formato Conventional Commits: `feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`, `security(...)`, `release(...)`.
