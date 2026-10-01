# PROVAS.md — Registro Canônico das Quatro Provas (PR1 a PR4)

Conforme a Constituição do Waesy e o Mandato do Conselho Executivo, nenhum módulo é considerado homologado sem apresentar as quatro provas objetivas e verificáveis. Prova sem números é opinião.

---

## 1. As Quatro Provas de Homologação

### PR1: Prova de Código (Arquivo:Linha e Diff Limpo)
- **Biblioteca de Nichos**: `src/lib/ad-engine/niche-packages/` (7 pacotes canônicos: `turismo.ts`, `varejo.ts`, `mercado.ts`, `servicos.ts`, `imoveis.ts`, `veiculos.ts`, `digital.ts` + `registry.ts` e `types.ts`).
- **Padrão de Conteúdo**: `src/lib/ad-engine/content-blocks/` (11 blocos B1 a B11, `sanitizer.ts`, `renderers.ts` e `types.ts`).
- **Design System**: `src/components/ui/canonical/` (`page-layout.tsx`, `canonical-form.tsx`, `adaptive-modal.tsx`, `dense-data-grid.tsx`).
- **Motor de Preços**: `src/lib/ad-engine/pricing-engine/` (`pricing-calculator.ts`, `rental-calculator.ts`, `subscription-lifecycle.ts`, `types.ts`).
- **Estoque Imutável**: `src/services/canonical-stock-ledger.functions.ts` operando na tabela `public.stock_movements`.
- **WebMCP**: `src/registries/mcp-tool-registry.ts` com as novas ferramentas `calculate_canonical_offer_price`, `get_niche_package_spec` e `inspect_stock_ledger`.

### PR2: Prova de Fluxo (Execução Real sem Mocks)
- **Vitest**: 38/38 testes verdes executados diretamente pelo runtime Node.js em 9 suítes automatizadas:
  1. `preview.test.ts` (6/6 aprovados)
  2. `editor.test.ts` (6/6 aprovados)
  3. `content-blocks.test.ts` (5/5 aprovados)
  4. `pricing-engine.test.ts` (5/5 aprovados)
  5. `niche-packages.test.ts` (5/5 aprovados)
  6. `workspace-parity-bridge.test.ts` (3/3 aprovados)
  7. `canonical-stock-ledger.test.ts` (3/3 aprovados)
  8. `canonical-ui.test.ts` (3/3 aprovados)
  9. `mcp-tool-registry.test.ts` (2/2 aprovados)

### PR3: Prova Visual e Design Lint
- **Verificação Automatizada**: Execução via `node scripts/design-lint.mjs --changed`.
- **Resultado Obtido**:
  - Severidade P0 (Bloqueia Entrega): **0 violações**
  - Severidade P1 (Bloqueia Merge): **0 violações**
  - Severidade P2: **0 violações**
- **Touch Targets**: Todos os botões e alvos móveis com dimensão mínima de 44px (`h-11`).
- **Acessibilidade Teclado**: Todo elemento interativo possui anel de foco teclado `:focus-visible`.
- **Movimento Reduzido**: Todos os elementos animados acompanham `motion-reduce:animate-none` (DL-28).

### PR4: Prova de Contrato (Banco → BFF → MCP → Interface)
- **Supabase Database**: Tabela `public.stock_movements` com RLS deny-by-default, índices de busca e imutabilidade append-only.
- **BFF TanStack Start**: `canonical-stock-ledger.functions.ts` validado com Zod em runtime e isolamento multi-tenant por `store_id`.
- **WebMCP Registry**: Paridade total de capacidades via ferramentas registradas e rate-limited.
- **Build de Produção**: `npm run build` aprovado com Exit Code 0 gerando `dist/_worker.js` e `dist/_routes.json` para Cloudflare Pages.
