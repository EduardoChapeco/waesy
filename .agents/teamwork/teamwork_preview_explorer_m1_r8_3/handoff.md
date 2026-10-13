# Handoff Report — Explorer 3 (Milestone 1: Forensic Reconciliation & Remote Branch Synthesis)

**Author**: Explorer 3 (Milestone 1 — Reconciliação Forense e Unificação de Branches Remotas)  
**Date**: 2026-10-13T17:55:00Z  
**Target Recipient**: Orchestrator (ID: `3a2a1483-83e5-492f-8dc4-21f64b7637fb`) & Worker M1  
**Scope**: Deep-dive and deterministic recipe specification for:
1. `docs/design/DECISIONS.md`: unified chronological sequence from DEC-196 through DEC-206.1 without collision or omission.
2. `design-lint.baseline.json`: verification of adopting `feat`'s lower baseline (13,657 violations vs 14,292, -635 technical debt reduction).
3. The 10 overlapping files between `feat` and `perf`: exact synthesis recipes preserving all features and optimizations.

---

## 1. Observation

### 1.1 Branch Pointers & Reconciliation Surface
Directly observed via git tooling:
- **`main` (HEAD)**: `8261f77a25fe68276c5d4ecd67b0e084b879c4ba` (Merge pull request #34). All PRs #24 through #34 are verified ancestors of `main`.
- **`origin/feat/system-merge-improvements-and-classifieds-copilot`**: Commit `681128b94004c78d5cc7da3a15d613ccb71ee120` (+9,182 insertions, -2,183 deletions across 95 files).
- **`origin/perf/login-latency-and-route-caching`**: Commit `0bbb643d44f41718c4127192ded7f6b0f1023a93` (+1,185 insertions, -763 deletions across 25 files).
- **Surface of Intersection**: Exactly 10 files were touched by both `origin/feat/...` and `origin/perf/...`:
  1. `design-lint.report.json`
  2. `docs/design/DECISIONS.md`
  3. `docs/design/LINT_DASHBOARD.md`
  4. `src/components/shell/app-shell.tsx`
  5. `src/components/shell/context-sidebar.tsx`
  6. `src/lib/identity.server.ts`
  7. `src/routes/_store.conta.perfil.tsx`
  8. `src/routes/_store.eventos.tsx`
  9. `src/routes/_store.index.tsx`
  10. `src/routes/_store.marketplace.index.tsx`

---

### 1.2 `docs/design/DECISIONS.md` Forensic Analysis & Numbering Collisions
In `main`, the file starts with:
- `DEC-196: Saneamento do Editor de Perfil, Validação de Gênero Zod, Adição de Habilidades sem Reset de Aba, Upload de Biolinks e Altura Canônica de Capas` (Data: 2026-10-08).

In `origin/perf/...`, three decisions were added:
- `DEC-197`: Otimização Reativa de Login, Unificação de Cookies SSR, Memoização de Identidade e Caching de Rotas (Data: 2026-10-08).
- `DEC-198`: Saneamento Definitivo do Salvamento de Perfil (Purga de Coluna Inexistente hide_location), Blindagem contra Reset de Aba e Unificação Panorâmica de Capas (Data: 2026-10-08).
- `DEC-200`: Redesign Minimalista do Copilot, Remoção de Jargões Técnicos e Desduplicação de Vitrines (Data: 2026-10-08).

In `origin/feat/...`, eleven decisions were added between commits `17beb1db` and `681128b9`:
- `DEC-197`: Saneamento de Roteamento de Notificações, Tokens Comunitários, Perfil Civil Sem Jargões e Isolamento de Vitrine Marketplace (Data: 2026-10-09).
- `DEC-198`: Unificação do Motor de Marketplace (Tri-Engine), Piso Tipográfico >= 12px e Ergonomia de Anúncios (Data: 2026-10-09).
- `DEC-199`: Múltiplas Hospedagens no Nicho Turismo, Gestor CMS de Acomodações e Paridade de Vitrines (Data: 2026-10-09).
- `DEC-200`: Personalização Semântica Estrita dos Fluxos de Onboarding / Reserva / Lead Inquiry por Nicho (Data: 2026-10-09).
- `DEC-201`: Estúdio de Flyers Promocionais Fullscreen, Priorização Semântica por Nicho e Modo Motion (Data: 2026-10-09).
- `DEC-202`: Expansão de Templates Sociais Multicategoria (Varejo Encarte Lambe-Lambe, 2x1, Açougue e Aluguel Temporada) e Motor de Mini-Vídeos (Data: 2026-10-09).
- `DEC-203`: Harmonização de Seletor de Layouts, Persistência de Hospedagens e Paridade End-to-End no Editor de Anúncios (Data: 2026-10-09).
- `DEC-204`: Refatoração Global Nativa Mobile, Piso Tipográfico Canônico (>= 12px) e Erradicação de AI-Smell (Data: 2026-10-09).
- `DEC-205`: Saneamento Semântico da Matriz de Nichos, Supressão de Formas de Pagamento em Vagas e Doações e Paridade End-to-End (Data: 2026-10-09).
- `DEC-206` (commit `6ee1f8ed`): Isolamento Estrito de Contexto Multi-Persona (Civil vs Empresa vs Criador) e Erradicação de Resíduos B7 (Data: 2026-10-09).
- `DEC-206` (commit `681128b9`): Expansão dos Motores de Reserva e Descoberta no Waesy Builder com Blocos Padrão Decolar/CVC (Data: 2026-10-09).

**Collision Inventory**:
- 4 collisions detected: DEC-197 (perf vs feat), DEC-198 (perf vs feat), DEC-200 (perf vs feat), and DEC-206 (duplicate within feat).

---

### 1.3 `design-lint.baseline.json` Verification
Inspected via direct JSON parsing on both `main` and `origin/feat/...`:
```json
// main (timestamp: 2026-10-05T16:05:11.405Z)
{
  "totalViolations": 14292,
  "filesInspected": 1854,
  "bySeverity": { "P0": 1558, "P1": 10033, "P2": 1333, "P3": 1368 }
}

// origin/feat/... (timestamp: 2026-10-09T11:19:57.325Z)
{
  "totalViolations": 13657,
  "filesInspected": 1988,
  "bySeverity": { "P0": 1524, "P1": 9521, "P2": 1277, "P3": 1335 }
}
```
**Delta**:
- `totalViolations`: **-635** (13,657 vs 14,292)
- `P0` (Bloqueia Entrega): **-34** (1,524 vs 1,558)
- `P1` (Bloqueia Merge): **-512** (9,521 vs 10,033)
- `P2` (Fila de Correção): **-56** (1,277 vs 1,333)
- `P3` (Polimento): **-33** (1,335 vs 1,368)
- `filesInspected`: +134 (1,988 vs 1,854)

`origin/perf/...` did not modify `design-lint.baseline.json`.

---

### 1.4 Detailed Observation of the 10 Overlapping Files

1. **`design-lint.report.json`**:
   Auto-generated output file from `node scripts/design-lint.mjs`. Conflicted purely by timestamps and individual line counters. Regenerated mechanically after code synthesis.

2. **`docs/design/DECISIONS.md`**:
   Covered in Section 1.2. 15 distinct entries spanning Oct 8 to Oct 9 requiring unified chronological ordering.

3. **`docs/design/LINT_DASHBOARD.md`**:
   Auto-generated markdown table written by `scripts/design-lint.mjs` line 1124 (`generateDashboard`). Synchronized automatically upon running the linter.

4. **`src/components/shell/app-shell.tsx`**:
   - `origin/perf/...` lines 272, 279, 310-322, 337: added `const isCopilotPage = location.pathname.startsWith("/copilot");`, suppresses mobile bottom nav on `/copilot`, sets `p-0 m-0 overflow-hidden` container.
   - `origin/feat/...` lines 14, 298: imported and inserted `<ActiveContextBanner session={session} />` to visually signal non-civil persona context.
   - **Intersection verdict**: Orthogonal lines; 0 conflicting AST nodes.

5. **`src/components/shell/context-sidebar.tsx`**:
   - Both branches modified line 186-187 identically: replaced `"Recolher subnichos" : "Expandir subnichos"` with `"Recolher categorias" : "Expandir categorias"`.
   - **Intersection verdict**: Identical diff; 0 conflict.

6. **`src/lib/identity.server.ts`**:
   - `main`: strictly derives memberships from `workspace_members`; no arbitrary `.limit(1)` store guessing; throws error for unknown tenants.
   - `origin/perf/...`: introduced guest fallback `.from("stores").select("id").limit(1)` (VIOLATION of multi-tenancy!); also optimized memoization key with `waesy-auth-token` cookie and attached `email`, `fullName` to `ServerIdentity`.
   - `origin/feat/...`: introduced Zero-Trust Civil Root check: `if (activeContext === "civil") activeStoreId = null;`.
   - **Intersection verdict**: Keep main's strict membership check, reject `perf`'s `.limit(1)` fallback, adopt `perf`'s `resolveMemoKey` cookies and `ServerIdentity` metadata, and insert `feat`'s `if (activeContext === "civil") activeStoreId = null;`.

7. **`src/routes/_store.conta.perfil.tsx`**:
   - `origin/perf/...`: removed outer `<form>` tag to prevent accidental submit on Enter when adding skills; added `featuredBannerUrl` and `featuredBannerLink` input fields in the Links tab (21:9 image upload).
   - `origin/feat/...`: replaced the "Perfil Pessoal" banner with the humanized "Conta Civil" banner + `(i)` button and explanatory Dialog modal.
   - **Intersection verdict**: Non-overlapping sections; form wrapping, banner, links tab inputs, and modals combine cleanly.

8. **`src/routes/_store.eventos.tsx`**:
   - `origin/perf/...`: eliminated duplicate section 3 ("Subcategorias de Eventos") and streamlined categories.
   - `origin/feat/...`: eliminated duplicate section 3, converted category buttons to `DiscoveryControlBar` with `eventCategories` memo (including event counters per category), and updated empty state with a clean "Limpar filtros" button.
   - **Intersection verdict**: `feat` is a superset of `perf`'s changes.

9. **`src/routes/_store.index.tsx`**:
   - `origin/perf/...`: added `staleTime: 15_000` to `createFileRoute("/_store/")`.
   - `origin/feat/...`: unified direct workspace products mapping (`directWorkspaceProducts`), updated product links to `/produto/${slug || id}`, isolated marketplace product grid and clean empty state when `activeCategory === "marketplace"`, and restricted `ProceduralInfiniteFeed` to `activeCategory === "todos"`.
   - **Intersection verdict**: `feat` provides the functional and design fixes; adding `staleTime: 15_000` from `perf` produces the complete union.

10. **`src/routes/_store.marketplace.index.tsx`**:
    - `origin/perf/...`: removed redundant section 4 ("Vitrines por Nicho" with 14 subnichos).
    - `origin/feat/...`: removed redundant section 4, simplified heading to active niche label, and added interactive "Limpar filtros" buttons with 44px touch targets in both feed and grid empty states.
    - **Intersection verdict**: `feat` is a complete superset of `perf`'s changes.

---

## 2. Logic Chain

1. **Chronological Decision Integrity**:
   - *Observation 1.2* reveals that both `perf` and `feat` independently authored decisions numbered DEC-197, DEC-198, DEC-200, and `feat` authored two separate DEC-206 entries.
   - `perf` entries are dated 2026-10-08; `feat` entries are dated 2026-10-09.
   - *Therefore*, maintaining chronological order requires mapping `perf`'s entries as DEC-197, DEC-198, DEC-200, and assigning sub-indices `.1` to `feat`'s colliding entries (`DEC-197.1`, `DEC-198.1`, `DEC-200.1`, `DEC-206.1`). This retains all 15 architectural records without losing a single line of rationale or context.

2. **Baseline Ratchet Enforcement**:
   - *Observation 1.3* proves that `origin/feat/...` lowered the baseline by 635 violations (-34 P0, -512 P1) while inspecting 134 more files.
   - In `scripts/design-lint.mjs:1051-1078`, `evaluateRatchet` compares the current scan against `baselineData.totalViolations`, `baselineData.bySeverity.P0`, and `baselineData.bySeverity.P1`.
   - Adopting `feat`'s baseline (`13,657` violations) lowers the ceiling permanently in accordance with the AGENTS.md ratchet principle, preventing any future regression back to `14,292`.

3. **Non-Destructive Overlap Synthesis**:
   - *Observation 1.4* proves that every code conflict across the 10 overlapping files has a clear architectural resolution:
     - Shell container (`app-shell.tsx`): `ActiveContextBanner` lives at shell top; `isCopilotPage` styling applies to the main container and suppresses bottom nav. Both work simultaneously.
     - Profile editor (`_store.conta.perfil.tsx`): The removal of `<form>` prevents skill reset; the addition of `featuredBannerUrl` enriches the Links tab; the `Conta Civil` banner and info modal educate the user. All three improvements belong in the final file.
     - Eventos & Marketplace: `feat`'s files are strict supersets of `perf`'s simplifications, with higher accessibility compliance (44px touch targets on "Limpar filtros").
     - Identity (`identity.server.ts`): Main's strict security boundary must be kept (rejecting `stores.limit(1)` fallback), combined with `feat`'s Zero-Trust Civil Root (`if (activeContext === "civil") activeStoreId = null;`) and `perf`'s cookie memoization.

---

## 3. Caveats

1. **Read-Only Scope**: This report is produced strictly under Explorer read-only rules. No source files outside the agent's folder were modified.
2. **Typecheck & Build Command Prohibition**: Per explicit instructions ("PROIBIÇÃO ABSOLUTA: Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância"), all verifications were conducted via AST analysis, git diffs, JSON schema validation, and targeted script inspection.
3. No other caveats.

---

## 4. Conclusion & Deterministic Worker Recipes

### 4.1 Master Mapping for `docs/design/DECISIONS.md` (DEC-196 through DEC-206.1)

The Worker must insert the following 15 decisions in `docs/design/DECISIONS.md` directly below the document title:

| Unified ID | Branch Source | Date | Title |
| :--- | :--- | :--- | :--- |
| **DEC-206.1** | `feat` (`681128b9`) | 2026-10-09 | Expansão dos Motores de Reserva e Descoberta no Waesy Builder com Blocos Padrão Decolar/CVC |
| **DEC-206** | `feat` (`6ee1f8ed`) | 2026-10-09 | Isolamento Estrito de Contexto Multi-Persona (Civil vs Empresa vs Criador) e Erradicação de Resíduos B7 |
| **DEC-205** | `feat` (`e6f817d6`) | 2026-10-09 | Saneamento Semântico da Matriz de Nichos, Supressão de Formas de Pagamento em Vagas e Doações e Paridade End-to-End |
| **DEC-204** | `feat` (`6e1a791a`) | 2026-10-09 | Refatoração Global Nativa Mobile, Piso Tipográfico Canônico (>= 12px) e Erradicação de AI-Smell |
| **DEC-203** | `feat` (`31c0a5f3`) | 2026-10-09 | Harmonização de Seletor de Layouts, Persistência de Hospedagens e Paridade End-to-End no Editor de Anúncios |
| **DEC-202** | `feat` (`f71eb2ec`) | 2026-10-09 | Expansão de Templates Sociais Multicategoria (Varejo Encarte Lambe-Lambe, 2x1, Açougue e Aluguel Temporada) e Motor de Mini-Vídeos |
| **DEC-201** | `feat` (`d5aa8d8f`) | 2026-10-09 | Estúdio de Flyers Promocionais Fullscreen, Priorização Semântica por Nicho e Modo Motion |
| **DEC-200.1** | `feat` (`ad0f42fc`) | 2026-10-09 | Personalização Semântica Estrita dos Fluxos de Onboarding / Reserva / Lead Inquiry por Nicho |
| **DEC-200** | `perf` (`0bbb643d`) | 2026-10-08 | Redesign Minimalista do Copilot, Remoção de Jargões Técnicos e Desduplicação de Vitrines |
| **DEC-199** | `feat` (`f677046d`) | 2026-10-09 | Múltiplas Hospedagens no Nicho Turismo, Gestor CMS de Acomodações e Paridade de Vitrines |
| **DEC-198.1** | `feat` (`5f322bbe`) | 2026-10-09 | Unificação do Motor de Marketplace (Tri-Engine), Piso Tipográfico >= 12px e Ergonomia de Anúncios |
| **DEC-198** | `perf` (`11ef5afa`) | 2026-10-08 | Saneamento Definitivo do Salvamento de Perfil (Purga de Coluna Inexistente hide_location), Blindagem contra Reset de Aba e Unificação Panorâmica de Capas |
| **DEC-197.1** | `feat` (`17beb1db`) | 2026-10-09 | Saneamento de Roteamento de Notificações, Tokens Comunitários, Perfil Civil Sem Jargões e Isolamento de Vitrine Marketplace |
| **DEC-197** | `perf` (`753bc71a`) | 2026-10-08 | Otimização Reativa de Login, Unificação de Cookies SSR, Memoização de Identidade e Caching de Rotas |
| **DEC-196** | `main` (`657b1168`) | 2026-10-08 | Saneamento do Editor de Perfil, Validação de Gênero Zod, Adição de Habilidades sem Reset de Aba, Upload de Biolinks e Altura Canônica de Capas |

#### Full Unified Text for DEC-196 through DEC-206.1
```markdown
## DEC-206.1: Expansão dos Motores de Reserva e Descoberta no Waesy Builder com Blocos Padrão Decolar/CVC
- **Data:** 2026-10-09
- **Contexto:** Necessidade de modernizar e resgatar a capacidade profunda do Waesy Builder para negócios de Turismo e Agências de Viagens, substituindo páginas institucionais estáticas por um ecossistema completo de reservas e descoberta no padrão BigTech (Decolar e CVC), conforme referências visuais submetidas pelo usuário.
- **Decisão:** (1) **Novas Seções Dinâmicas:** Desenvolvidos 5 novos componentes modulares em `src/components/commerce/dynamic-sections/`: `<DynamicBookingHeroSection>` (Motor de busca com abas para Pacotes, Hospedagens, Voos, Carros, controle de origem/destino e micro-cards de benefícios), `<CategoryIconGridSection>` (Bento Grid de atalhos e serviços com badges promocionais), `<DynamicProductCarouselSection>` (Carrossel snap scroll com cards verticais de alta conversão, badges de dias/noites, economia real e parcelamento), `<TravelProductDetailSection>` (Layout 70/30 com top trip summary, galeria masonry, lista de comodidades com ícones e sticky sidebar de cotação/reserva) e `<CustomerTravelPortalSection>` (Portal B2C do viajante com visualização de vouchers, bilhetes em formato de cartão e download direto); (2) **Integração no Experience Renderer:** Registrados os 5 novos tipos e aliases de renderização em `experience-renderer.tsx` para suporte dinâmico no storefront; (3) **Schemas & Manifestos do Builder:** Adicionados tipos a `builder-types.ts`, schemas Zod e inspectores com propriedades editáveis em `builder-registry.ts`; (4) **Templates e Catálogo:** Inseridos templates pré-configurados em `section-templates.ts`, adicionados atalhos no `builder-add-panel-3col.tsx` e mapeados no `src/components/builder/registry.ts` para paridade total com o OmniEditor; (5) **Acessibilidade e Tokens:** Conformidade rigorosa com piso de toque 44px (`h-11 min-h-11`), anéis `:focus-visible` e tokens semânticos de cores e tipografia (WCAG 2.2 AA).
- **Fundamentação:** AGENTS.md B.1, B.4, B.5, B.8, B.9, B.11, B.20, B.22, B.28; WCAG 2.2 AA.
- **Consequências:** O Waesy Builder agora permite que qualquer agência de turismo crie um mini-portal estilo Decolar/CVC completo, 100% dinâmico, conectado aos dados do catálogo e com área de vouchers integrada.

## DEC-206: Isolamento Estrito de Contexto Multi-Persona (Civil vs Empresa vs Criador) e Erradicação de Resíduos B7
- **Data:** 2026-10-09
- **Contexto:** Relato de quebra de experiência em que usuário civil visualizou indicação de perfil de Criador (`Criador: @044ddf71-5509-41b6-9dbe-fd53435374a5`) no drawer de conta sem ter selecionado essa persona intencionalmente. Investigação revelou três fatores: (1) gravação de UUID cru em vez de `@handle` legível no cookie `waesy_active_creator`; (2) persistência indeterminada de cookies entre navegações na vitrine pública sem auto-sanitização defensiva; (3) ausência de barreira visual e funcional no retorno do `/workspace` para o marketplace público, mantendo o contexto de empresa ativo silenciosamente.
- **Decisão Adotada:**
  1. **Zero-Trust Civil Root:** O servidor (`identity.server.ts`) respeita expressamente `waesy_active_context=civil` anulando qualquer `activeStoreId`, impedindo que associações de tenant vazem para o comprador civil.
  2. **Auto-Heal & Higienização Anti-Fantasma:** Implementado no `utility-cluster.tsx` e `context-banner.tsx`: se `activeContext === "creator"` mas o usuário não possui perfis de criador cadastrados, o sistema reseta imediatamente para `civil` limpando cookies concorrentes. Se contiver UUID, resolve atomicamente para o `@handle` humano e atualiza o cookie.
  3. **Banner Global de Contexto Ativo (`ActiveContextBanner`):** Componente canônico integrado no `AppShell` que avisa quando o usuário estiver navegando no marketplace sob identidade corporativa ou de criador, com botão tátil de 1 clique para retornar ao perfil civil.
  4. **Bifurcação Estrita do Drawer de Conta:** O menu de conta adapta 100% de seus links à persona ativa (`civil`: compras, ingressos, anúncios civis, favoritos; `creator`: vitrine, comissões, afiliados, métricas; `store`: workspace, produtos, pedidos, caixa), eliminando confusão de atuação.
  5. **Barreira de Transição do Workspace:** Conexão do modal de confirmação de alternância de identidade em todos os links de retorno do Workspace para o Super App / Conta Pessoal, com expiração atômica dos cookies de tenant (`max-age=0`) e reset para `civil`.
- **Fundamentação:** AGENTS.md B.1, B.5, B.9; SKILL `state-sanitizer`; padrão de identidade de BigTech (Meta Business / Instagram Pages); WCAG 2.2 AA.
- **Consequências:** Navegação pública do comprador é protegida; criadores e empresas operam em silos consistentes; UUIDs nunca mais são expostos como handles na interface; alternância de identidade exige consentimento explícito e provê feedback imediato ao usuário.

## DEC-205: Saneamento Semântico da Matriz de Nichos, Supressão de Formas de Pagamento em Vagas e Doações e Paridade End-to-End
- **Data:** 2026-10-09
- **Contexto:** Identificou-se que a criação de anúncios do nicho de recrutamento/vagas de emprego (`tipo=vaga` / `job`) exibia e permitia a seleção de "Formas de Pagamento Aceitas" (Pix, Cartão de Crédito, Parcelamento, Boleto, etc.), além de solicitar "Modalidade de Preço" genérica com permuta/troca de bens. Isso ocorria porque: (1) O estado `acceptsPix` era inicializado incondicionalmente como `true` no editor; (2) O prefill de sessionStorage persistido podia vazar atributos de produtos anteriores para novas criações de vaga; (3) A função de extração de métodos de pagamento em `semantics.ts` (`getClassifiedPaymentMethods`) não verificava se o nicho era `job` ou `donation`, fazendo com que as páginas de detalhes desktop e mobile renderizassem a aba e badges de "Pagamento & Financiamento" para vagas e doações solidárias gratuitas.
- **Decisão:** (1) **Supressão Semântica no Editor:** Em `_store.conta.classificados.novo.tsx`, as seções de "Condições Comerciais" e "Formas de Pagamento" são completamente omitidas quando o nicho for `job` ou `donation`; (2) **Sanitização de Payload e Fallbacks:** Injetados métodos vazios e desabilitada a aceitação de Pix/Cartão para vagas; (3) **Supressão nas Páginas Públicas:** `getClassifiedPaymentMethods` retorna array vazio para os nichos `job` e `donation`, e os componentes `editorial-showcase-view.tsx`, `classified-detail-desktop.tsx` e `classified-detail-mobile.tsx` suprimem as abas de pagamento para esses tipos de anúncio; (4) **Validação Rigorosa:** Verificação sem regressões via `npm.cmd run typecheck` com Exit Code 0.
- **Fundamentação:** AGENTS.md B.1, B.4, B.5, B.8, B.9, B.11; WCAG 2.2 AA.
- **Consequências:** Anúncios de vagas e doações solidárias limpos, profissionais e condizentes com sua natureza, sem solicitar ou apresentar métodos de pagamento descabidos.

## DEC-204: Refatoração Global Nativa Mobile, Piso Tipográfico Canônico (>= 12px) e Erradicação de AI-Smell
- **Data:** 2026-10-09
- **Contexto:** Auditoria de usabilidade móvel identificou desvios em relação às diretrizes Apple HIG e regras B.8/DL-02 do repositório: (1) Textos em tamanho microscópico arbitrários (`text-[10px]`, `text-[11px]`) em cards, badges e rodapés de anúncios; (2) Botões com textos excessivamente prolixos e conversacionais ("Clique aqui para conversar com nosso assistente virtual"), caracterizando o padrão depreciado "AI Smell"; (3) Margens e dead space desnecessários no terço inferior mobile prejudicando a ergonomia com uma mão.
- **Decisão:** (1) **Piso Tipográfico 12px (`text-xs` / `text-sm`):** Purgadas 100% das microclasses arbitrárias no catálogo de classificados e vitrines, promovendo textos informativos para `text-xs` (12px) e títulos para `text-sm` (14px); (2) **Erradicação de AI-Smell:** Botões de ação refatorados para rótulos diretos e humanos ("Conversar", "Ver Oferta", "Reservar", "Enviar Proposta"), eliminando caixas explicativas prolixas e banners de boas-vindas redundantes; (3) **Ajuste Ergonômico de Dock Mobile:** Barra de navegação inferior e sticky CTAs alinhados ao piso canônico de 44px (`h-11 min-h-11`), com espaçamento `pb-safe` e feedback tátil ativo.
- **Fundamentação:** AGENTS.md B.1, B.4, B.5, B.8, B.11; .agents/skills/anti-ai-design/SKILL.md; WCAG 2.2 AA.
- **Consequências:** Interface mais silenciosa, humana e direta, alinhada aos padrões de produto Apple HIG, Stripe e Linear, com navegação mobile nítida e sem dead space.

## DEC-203: Harmonização de Seletor de Layouts, Persistência de Hospedagens e Paridade End-to-End no Editor de Anúncios
- **Data:** 2026-10-09
- **Contexto:** Identificou-se que a seleção de modelos visuais (templates) em `_store.conta.classificados.novo.tsx` não refletia fielmente nas prévias do anúncio: a rota pública (`_store.classificados.$id.tsx`) forçava a visualização editorial para turismo mesmo quando outro template era selecionado; os dados de hospedagem (`travelLodgings`) não eram persistidos no payload de submissão nem restaurados na edição; e os previews ao vivo (Step 5 e painel lateral desktop) não compartilhavam os mesmos critérios de despacho e seletores diretos de layout.
- **Decisão:** (1) **Despacho Fiel de Templates em Rota Pública e Previews:** Em `_store.classificados.$id.tsx`, o despacho agora respeita estritamente o layout escolhido (`attributes.template_style`), caindo para editorial em turismo somente quando nenhum estilo for especificado; (2) **Sincronização Reativa por Nicho:** `novo.tsx` define dinamicamente o template inicial (`automotivo`, `imobiliario`, `resort_hotel`, `servicos_agenda`, `conveniencia`, `standard`) respeitando o nicho ativo e restaurando templates pré-existentes na edição; (3) **Controles de Seleção nos Previews:** Inserido seletor rápido no topo do Step 5 e no cabeçalho do painel lateral direito desktop, permitindo alternar e conferir a renderização em tempo real; (4) **Persistência Completa de Hospedagens:** `travelLodgings` agora é persistido em `attributes.lodgings` e `attributes.hotels`, hidratado na edição de anúncios e compatibilizado com `hotel_name`, `hotel_stars`, etc.; (5) **Validação Rigorosa:** `npm.cmd run typecheck` finalizado com Exit Code 0 e zero erros de compilação.
- **Fundamentação:** AGENTS.md B.1, B.4, B.5, B.9, B.11, B.22, B.28; WCAG 2.2 AA.
- **Consequências:** Paridade 1:1 absoluta entre a escolha do anunciante, a prévia do editor em tempo real e a renderização do anúncio publicado.

## DEC-202: Expansão de Templates Sociais Multicategoria (Varejo Encarte Lambe-Lambe, 2x1, Açougue e Aluguel Temporada) e Motor de Mini-Vídeos
- **Data:** 2026-10-09
- **Contexto:** Demandou-se ampliação da biblioteca de templates do estúdio para cobrir formatos culturais e comerciais indispensáveis: (1) Encartes de supermercado lambe-lambe com explosão splash amarela/vermelha de preços; (2) Tabloides 2x1 com desconto online em ciano internacional; (3) Açougue e churrasco estilo tabloide de carnes El Zonda; (4) Aluguel de temporada e pousada estilo americano clássico em creme e verde com grid 4 fotos; (5) Exportação de mini-vídeos animados graváveis para Reels/Stories (MP4/WebM).
- **Decisão:** (1) **Templates Especializados de Alta Conversão:** Criados `RetailSupermarketClassicFlyer`, `RetailSupermarket2x1Promo`, `RetailSupermarketMeatPromo` e `RealEstateSeasonRentalGrid`, todos integrados ao catálogo dinâmico de templates (`registry.ts`); (2) **Engine de Mini-Vídeos no Navegador via MediaRecorder:** Implementada a função `handleDownloadVideo` capturando o canvas com stream de 30 FPS, efeito de zoom cinematográfico (Ken Burns), fade in inicial e barra de progresso em vídeo MP4/WebM nativo de 3 segundos diretamente no dispositivo do cliente, sem requisições pesadas a servidores externos; (3) **Validação Rigorosa:** Verificação de design lint sem regressões em todos os arquivos modificados e `npm run typecheck` finalizado com Exit Code 0.
- **Fundamentação:** AGENTS.md B.1, B.4, B.6, B.8, B.9, B.11, B.22, B.28; WCAG 2.2 AA.
- **Consequências:** Estúdio de criação agora atende supermercados, atacados, padarias, açougues, imóveis de temporada e turismo, permitindo download instantâneo de imagens Ultra HD e vídeos animados.

## DEC-201: Estúdio de Flyers Promocionais Fullscreen, Priorização Semântica por Nicho e Modo Motion
- **Data:** 2026-10-09
- **Contexto:** Identificou-se que a engine geradora de flyers e stories promocionais (`TravelPromoFlyerModal`) sofria de compressão visual extrema no desktop (espremida em um container modal centralizado de 512px por conflito com o primitivo `DialogContent`), além de carregar inicialmente templates de imóveis ("Fachada Dominante", "Agendar Visita") em anúncios de Turismo (excursões, viagens rodoviárias e pacotes), quebrando a usabilidade do anunciante e impedindo a visualização da arte na proporção 9:16 Ultra HD.
- **Decisão:** (1) **Desacoplamento de Tamanho Canônico no Primitivo Dialog:** Introduzida variante `size="screen"` em `src/components/ui/dialog.tsx`, permitindo renderização verdadeiramente edge-to-edge estilo Apple Studio / Canva sem colisão de centralização desktop; (2) **Auto-Binding e Priorização Estrita por Nicho:** Prop `niche` propagada a partir das vitrines (`editorial-showcase-view.tsx`), garantindo que templates nativos do nicho (Turismo: "Curvatura Orgânica", "Boarding Pass", "Full-Bleed Nature & Glass", "Clássico Waesy") e CTAs pertinentes ("Garantir Vaga", "Reservar Pacote") apareçam selecionados e no topo da lista; (3) **Modo Motion de Pré-Visualização Dinâmica:** Adicionado botão alternador no cabeçalho do estúdio e animação fluida CSS nativa em `TravelPromoArtboard`, preservando exportação ultra HD estática para PNG em resolução 1080x1920 sem travas ou conflitos de dependências externas; (4) **Validação Automatizada:** `npm.cmd run typecheck` finalizado com Exit Code 0 e zero erros de tipo.
- **Fundamentação:** AGENTS.md B.1, B.4, B.6, B.8, B.9, B.11, B.22, B.28; WCAG 2.2 AA.
- **Consequências:** Estúdio de criação de stories e flyers 100% responsivo, respirável, sem distorção ou compressão de tela, com templates e CTAs perfeitamente sincronizados com o anúncio aberto.

## DEC-200.1: Personalização Semântica Estrita dos Fluxos de Onboarding / Reserva / Lead Inquiry por Nicho
- **Data:** 2026-10-09
- **Contexto:** Identificou-se que o formulário de manifesto de interesse / lead inquiry (`LeadFormModal`) exibia perguntas genéricas herdadas de modelos automotivos ("Possui item ou veículo para entrada / permuta?", "Qual seu prazo para fechar negócio?") em anúncios de Turismo (excursões, roteiros, pacotes) e outros nichos que não possuem permuta de bens, quebrando completamente a experiência do usuário e gerando estranheza cognitiva.
- **Decisão:** (1) **Motor Semântico Centralizado de Qualificação:** Criada a função canônica `getNicheDefaultInquiryConfig(nicheId, options)` em `src/lib/classifieds/semantics.ts`, fornecendo perguntas, títulos e subtítulos estritamente customizados para cada nicho (Turismo, Hospedagem, Imóveis Venda, Imóveis Locação, Veículos, Serviços, Equipamentos, Gastronomia, Vagas de Emprego, Doações Solidárias, Negócios & M&A e Desapegos em geral); (2) **Sanitização Defensiva no Modal:** `LeadFormModal` agora recebe `nicheId` e, caso detecte perguntas genéricas vazadas sobre veículos/permuta em nichos incompatíveis (como Turismo ou Gastronomia), substitui automaticamente pelas perguntas canônicas de alta conversão pertinentes àquele nicho; (3) **CMS e Formulário de Anúncios:** `_store.conta.classificados.novo.tsx` inicializa perguntas e títulos diretamente a partir de `getNicheDefaultInquiryConfig`, adicionando botão tátil "Padrão do Nicho" para restauração rápida; (4) **Validação Automatizada:** `npm.cmd run typecheck` com Exit Code 0 e catraca do design lint aprovada com redução de 54 violações.
- **Fundamentação:** AGENTS.md B.1, B.4, B.5, B.8, B.11, B.22, B.28; WCAG 2.2 AA.
- **Consequências:** Formulários de propostas e reservas em anúncios comerciais com linguagem perfeitamente adaptada a cada vertical de negócio.

## DEC-200: Redesign Minimalista do Copilot, Remoção de Jargões Técnicos e Desduplicação de Vitrines
- **Data:** 2026-10-08
- **Contexto:** Módulo Waesy Copilot apresentava input deslocado fora do fold, renderização com markdown cru (`** **`), trilha de tarefas prolixa e quebra 404 em artefatos turísticos ao redirecionar para rota de CMS inexistente. Telas públicas de Marketplace e Eventos apresentavam seções duplicadas de categorias ("Vitrines por Nicho" / "14 subnichos ativos") e textos explicativos redundantes.
- **Decisão adotada:**
  1. Criação do componente canônico `CopilotMessageRenderer` com suporte rico a markdown (bold, italic, listas, tabelas, sublinhado, marca-texto `.copilot-highlight` e lousa interativa/quadro digital `BlackboardBlock`).
  2. Redesign ultra-minimalista da trilha de execução `AIActivityTrail` (micro-pílula compacta durante execução e linha discreta com contagem de etapas e tempo ao concluir).
  3. Prevenção de 404 em artefatos turísticos: substituição de redirect para `/workspace/cms/paginas` por modal nativo in-place `Dialog` em `ChatArtifactCard` e renderizador de itinerário em `AIChatShell`.
  4. Fixação do compositor de chat no rodapé sem rolagem da página inteira no `app-shell` e no drawer `WaesyCopilotDrawer`.
  5. Desduplicação e higienização visual: remoção da seção duplicada de categorias em `_store.marketplace.index.tsx` e `_store.eventos.tsx`, eliminação de textos técnicos ("Vitrines por Nicho", "14 subnichos ativos", "0 produtos") e subtítulo prolixo em `_store.classificados.index.tsx`.
- **Fundamentação:** AGENTS.md B.1 a B.12, B.6, B.8 (proibição de textos explicativos redundantes), piso WCAG 2.2 AA.
- **Consequências:** Interface silenciosa, limpa e responsiva; zero quebras 404 em artefatos; renderização visual elegante e unificada.

## DEC-199: Múltiplas Hospedagens no Nicho Turismo, Gestor CMS de Acomodações e Paridade de Vitrines
- **Data:** 2026-10-09
- **Contexto:** Identificou-se que a aba "Hospedagem & Resort" nas páginas públicas de anúncio (`editorial-showcase-view.tsx`, `classified-detail-desktop.tsx` e `classified-detail-mobile.tsx`) não dispunha de cartões ricos e individualizados quando o pacote envolvia hotéis combinados, e o formulário de criação/edição (`_store.conta.classificados.novo.tsx`) não possuía seção estruturada para cadastrar acomodações no nicho Turismo (`viagem`), impossibilitando aos anunciantes detalhar nome, tipo (resort, hotel, pousada, flat, hostel), estrelas, regime de alimentação, horários de check-in/out, voucher e descrição de lazer.
- **Decisão:** (1) **Modelo Canônico de Dados:** Introduzida a interface `TravelLodging` e persistência polimórfica em `attrs.lodgings`, mantendo retrocompatibilidade com campos legados (`attrs.hotel_name`, `attrs.hotel_stars`, etc.); (2) **Formulário CMS Especializado:** Inserida seção 2.5 no formulário com capacidade de adicionar, editar e remover múltiplas hospedagens, com seletores de tipo, regime de alimentação, estrelas, horários de check-in/out, vouchers e descrição da estrutura; (3) **Renderização Rica e Sem Emojis:** Cartões dedicados em `editorial-showcase-view.tsx`, `classified-detail-desktop.tsx` e `classified-detail-mobile.tsx`, com tipografia legível (`text-xs`/`text-sm`), badges de regime e estrelas sem caracteres emoji (DL-23), alvos de toque canônicos (`h-11 min-h-11`), anéis `:focus-visible` e aderência estrita à grade de 4px; (4) **Validação Automatizada:** `npm.cmd run typecheck` com Exit Code 0 e catraca do design lint aprovada com redução de 54 violações.
- **Fundamentação:** AGENTS.md B.1, B.4, B.6, B.8, B.9, B.11, B.22, B.28; WCAG 2.2 AA.
- **Consequências:** Experiência completa e detalhada para contratação de pacotes turísticos e viagens com múltiplas estadias.

## DEC-198.1: Unificação do Motor de Marketplace (Tri-Engine), Piso Tipográfico >= 12px e Ergonomia de Anúncios
- **Data:** 2026-10-09
- **Contexto:** A vitrine pública de marketplace da home (`_store.index.tsx`) e a busca geral (`_store.explorar.tsx`) apresentavam inconsistências onde produtos cadastrados em lojas locais não eram renderizados quando a categoria "Marketplace" era selecionada, além de microfontes arbitrárias (`text-[9px]`, `text-[10px]`) e duplicidade de campos de parcelamento no formulário de classificados.
- **Decisão:** (1) **Isolamento Tri-Engine do Marketplace:** Inclusão de produtos via `listUnifiedListings({ origin: "workspace" })` combinados com `marketplaceFeed` nas rotas `_store.index.tsx` e `_store.explorar.tsx`. Redirecionamento correto de cliques para a rota `/produto/${item.slug || item.id}` e isolamento estrito da visualização no explorador e na homepage sem vazar estabelecimentos genéricos; (2) **Piso Tipográfico 12px:** Conversão sistemática de micro-classes arbitrárias em componentes de classificados para tokens semânticos `text-xs` e `text-sm`, respeitando estritamente a grade modular de 4px e o design lint; (3) **Ergonomia e Saneamento do Formulário de Anúncios:** Removidas duplicidades de parcelamento e opções de pagamento, corrigidos estados de teste/recorrência e conformidade tipográfica sem erros de compilação; (4) **Validação Automatizada:** 100% de compilação limpa em `npm.cmd run typecheck` e aprovação na catraca de lint visual `node scripts/design-lint.mjs --ratchet` (com redução líquida de 54 violações visuais).
- **Fundamentação:** AGENTS.md B.1, B.4, B.6, B.8, B.9, B.11, B.22, B.25, B.28; WCAG 2.2 AA.
- **Consequências:** Zero erros de tipo, catraca de design lint verde, produtos do marketplace 100% acessíveis e visíveis diretamente nos trilhos e no explorador com tipografia nítida e legível.

## DEC-198: Saneamento Definitivo do Salvamento de Perfil (Purga de Coluna Inexistente hide_location), Blindagem contra Reset de Aba e Unificação Panorâmica de Capas
- **Data:** 2026-10-08
- **Contexto:** Chamado do usuário: (1) "Editar o perfil não salva / Não estou conseguindo salvar nada": Investigação no log e banco revelou que `_updateProfile` tentava gravar a coluna inexistente `hide_location` na tabela `profiles` (coluna pertence exclusivamente a `classifieds`), fazendo o Postgres abortar o upsert com erro `column "hide_location" does not exist`, além da chamada indiscriminada da RPC `claim_handle_atomic` mesmo sem alteração de username; (2) Ao tentar adicionar habilidades em currículo, a tela recarregava e mudava para a primeira aba de perfil ("Identidade"), causado por uma tag `<form>` externa envolvendo todas as abas em `_store.conta.perfil.tsx`; (3) Capas e cabeçalhos de empresas (`canonical-store-profile-view.tsx`) e locais (`_store.places.$placeSlug.tsx`) divergiam do padrão panorâmico canônico de 3 blocos (Foto/Avatar 1:1 squircle + Capa 21:9 com scroll interno + Card de Stats nivelado no final `h-20 sm:h-28 md:h-32`); (4) Necessidade de garantia de upload resiliente com fallback para `cms-media` caso buckets específicos falhem.
- **Decisão:**
  1. **Purga de Coluna Inexistente e Handle Resiliente (`auth.functions.ts`):** Removida a atribuição de `hide_location` ao payload de `profiles`. Adicionada verificação prévia de alteração de handle (`isHandleDifferent`), invocando `claim_handle_atomic` somente quando o username de fato mudou, com tratamento defensivo não-bloqueante para dados cadastrais.
  2. **Eliminação do Form Pai Global (`_store.conta.perfil.tsx`):** Substituída a tag externa `<form onSubmit={handleSubmit}>` por `<div className="space-y-6">`, convertendo botões de salvar para `type="button"` com `onClick={handleSubmit}`, blindando a tela contra submissões e recarregamentos acidentais durante a edição de currículo ou biolinks.
  3. **Fallback Resiliente de Storage (`storage.functions.ts`):** Adicionado fallback automático para o bucket `cms-media` caso o bucket `banners`, `covers` ou `avatars` apresente falha de provisionamento ou RLS no Supabase.
  4. **Padronização Panorâmica Canônica de Capas (`canonical-store-profile-view.tsx` & `_store.places.$placeSlug.tsx`):** Unificada a arquitetura visual dos 3 blocos em empresas (Foto 1:1 + Capa 21:9 com scroll + Card de Stats `h-14 sm:h-20 md:h-28 lg:h-32` nivelado na mesma linha) e locais (Foto 1:1 + Capa 21:9 `h-20 sm:h-28 md:h-32` com botão Compartilhar integrado).
- **Validação:** Typecheck com Exit Code 0 (0 erros TS), Design Lint com 0 novas violações (catraca ativa com redução de 585 violações de débito), compilação do build de produção e sentinela client-leak 100% aprovados.

## DEC-197.1: Saneamento de Roteamento de Notificações, Tokens Comunitários, Perfil Civil Sem Jargões e Isolamento de Vitrine Marketplace
- **Data:** 2026-10-09
- **Contexto:** Auditoria de integridade após relatos de falhas em produção: (1) Notificações de novos leads direcionando para rota inexistente 404 (`/_store/conta/negociacoes` em vez de `/conta/negociacoes`), decorrente de acoplamento do prefixo de layout interno da árvore TanStack Router em BFFs e componentes; (2) Página de indicação (`_store.convite.tsx`) com poluição visual de badges e misturando conceitos de "pontos" / "pts" com a economia canônica de Tokens, além de códigos gerados com prefixo depreciado "WIDER"; (3) Cabeçalho da Conta Civil (`_store.conta.perfil.tsx`) com linguagem robotizada de "Root Transacional", sem affordance de entendimento para o usuário leigo; (4) Filtro de Marketplace na vitrine da homepage (`_store.index.tsx`) exibindo diretório e classificados em vez de apenas produtos homologados de empresas parceiras, e feed infinito procedural injetando rails não relacionados quando filtrado por categoria.
- **Decisão:** (1) **Normalização Canônica de Rotas de Notificação:** Purgados prefixos `/_store/conta/...` em `notifications.functions.ts` e `company-mvp.functions.ts` para `/conta/negociacoes`, `/conta/pedidos`, `/conta/agendamentos` e `/conta/cursos`. Adicionada sanitização defensiva `item.linkUrl.replace(/^\/_store\//, "/")` em `notifications-popover.tsx` e `_store.conta.notificacoes.tsx`. (2) **Padronização da Economia de Tokens & Códigos Waesy:** Unificada a nomenclatura de "pontos" para "Tokens" em `_store.convite.tsx` e `invite.functions.ts`. Removido prefixo legado "WIDER-" com substituição transparente para "WAESY-". Reduzida a poluição visual removendo badges concorrentes desnecessárias. (3) **Humanização da Conta Civil & Affordance Educativa:** Substituído o badge robótico "Root Transacional" e fundo com tint decorativo por superfície neutra Apple HIG (`bg-muted/30 border border-border/60`), adicionando gatilho tátil `(i)` com altura mínima de 44px e modal explicativo sobre o papel legal e seguro da Conta Civil e sua integração com perfis de empresas e classificados. (4) **Isolamento Estrito da Vitrine de Marketplace:** Na homepage (`_store.index.tsx`), a categoria `marketplace` agora isola estritamente ofertas e produtos de empresas, com empty state limpo quando não houver produtos, e o `ProceduralInfiniteFeed` foi restrito à visão global (`activeCategory === "todos"`).
- **Fundamentação:** AGENTS.md B.1, B.4, B.6, B.8, B.9, B.11, B.22, B.26; Invariantes M01 e M08; WCAG 2.2 AA.
- **Consequências:** Zero erros de navegação em notificações, vitrine de marketplace honesta e focada em produtos de empresas, unificação da moeda digital da plataforma em Tokens e perfil civil compreensível e acessível.

## DEC-197: Otimização Reativa de Login, Unificação de Cookies SSR, Memoização de Identidade e Caching de Rotas
- **Data:** 2026-10-08
- **Contexto:** Relato de lentidão crítica após o login: o sistema demorava para transitar para o estado logado e carregar as informações do usuário. Identificou-se: (1) Incompatibilidade de cookies entre `supabase.ts` (`storageKey: 'waesy-auth-token'`) e `supabase-ssr.server.ts` (esperava `sb-*-auth-token`), impedindo sincronização imediata da sessão entre browser e worker; (2) `_store.entrar.tsx` utilizava `window.location.replace` e `window.location.href`, forçando o descarte completo do DOM e o download de 490+ chunks JS do Cloudflare; (3) Cascata de até 6 roundtrips sequenciais de banco por request em `getServerIdentity()` e `getUserSession()`; (4) `defaultStaleTime: 0` no TanStack Router causava invalidação agressiva e waterfalls de requisições de loaders a cada clique.
- **Decisão:**
  1. **Unificação e Compatibilidade de Cookies (`supabase-ssr.server.ts` & `identity.server.ts`):** Unificado o `storageKey` do SSR para `waesy-auth-token`, mantendo fallback retrocompatível para cookies legados `sb-*-auth-token`.
  2. **Transição Reativa SPA (`_store.entrar.tsx`):** Substituídos os hard-reloads por `await router.invalidate()` seguido de `navigate({ to: destination, replace: true })`, garantindo que a reatividade do TanStack Router atualize os estados de autenticação em memória instantaneamente.
  3. **Memoização e Paralelização (`identity.server.ts` & `auth.functions.ts`):** Paralelizada a consulta de perfis e workspace members em 1 roundtrip único, atachado o perfil e usuário à `ServerIdentity`, e refatorado `getUserSession` para consumir a identidade memoizada em 0ms.
  4. **StaleTime de Rotas (`router.tsx`, `_store.tsx`, `_store.index.tsx`):** Configurado `defaultStaleTime: 10_000` globalmente no router e `staleTime: 15_000` nas rotas principais da vitrine, eliminando refetches em cascata durante navegação normal.
- **Validação:** Typecheck com Exit Code 0, Design Lint com 0 novas violações (catraca respeitada), e build de produção aprovado com sucesso.

## DEC-196: Saneamento do Editor de Perfil, Validação de Gênero Zod, Adição de Habilidades sem Reset de Aba, Upload de Biolinks e Altura Canônica de Capas
- **Data:** 2026-10-08
- **Contexto:** Relato de quebras críticas em `/conta/perfil`: (1) Salvamento de perfil falhava com erro de validação Zod (`Invalid enum value. Expected 'feminino' | 'masculino' | 'outro' | 'prefiro_nao_dizer', received 'not_informed'`) devido à divergência de enum entre o formulário e `auth.functions.ts`; (2) Ao clicar em "+ Adicionar" na seção de habilidades em currículo, a página resetava para a aba inicial de identidade porque o botão disparava o submit do `<form>` pai devido a uma tag `<form>` aninhada e falta de `type="button"`; (3) A aba Links havia regredido para input simples de texto sem botão de upload para o bucket Supabase; (4) Capas de empresas e no editor de perfil de usuário estavam desproporcionais/gigantes ao lado do avatar (utilizando `aspect-[21/9]` solto em container flexível de 800px+ gerando altura de mais de 300px); (5) Presença de termos técnicos e jargões na UI como "Documento Soberano", "Nome Completo (Civil)" e "Conta Civil".
- **Decisão:** 
  1. **Tolerância e Pré-processamento no Zod (`auth.functions.ts`):** Adicionado `z.preprocess` no schema de perfil aceitando variações em português, inglês e vazias (`female` -> `feminino`, `male` -> `masculino`, `not_informed` -> `prefiro_nao_dizer`), e Select alinhado com valores canônicos.
  2. **Eliminação de Form Aninhado (`professional-resume-editor.tsx`):** Removida a tag `<form>` interna de adicionar habilidade, substituindo por `<div>`, input com interceptação de Enter e botão explícito `type="button"` com `e.preventDefault()`, preservando a aba ativa.
  3. **Restauração de Upload de Banners de Biolink (`storage.functions.ts` & `_store.conta.perfil.tsx`):** Adicionado `target: "biolink_banner"` em `uploadProfileMediaDirect` com upload direto para o bucket `banners`, preview da miniatura e botões de envio/remoção na aba Links.
  4. **Padronização Vertical Canônica de Capas:** Alinhada a altura do container de capa ao lado do avatar em `h-20 sm:h-28 md:h-32` com `object-cover` no editor de usuário (`_store.conta.perfil.tsx`), na página de empresas (`canonical-store-profile-view.tsx`) e no criador (`creator-profile-sheet-editor.tsx`), mantendo nivelamento horizontal idêntico ao perfil público de membro.
  5. **Purificação de Nomenclatura Comercial:** Removido o badge "Documento Soberano", substituído "Nome Completo (Civil)" por "Nome Completo" e "Conta Civil" por "Perfil Pessoal (Titular da Conta)".
- **Validação:** Typecheck com Exit Code 0, Design Lint com redução de 590 violações, testes Vitest verdes, build de produção aprovado, PR #27 criado e squash-merged na `main`, e deploy ativo no Cloudflare Pages (`https://usewaesy.pages.dev`).
```

---

### 4.2 Exact Recipes for the 10 Overlapping Files

#### Recipe 1: `src/components/shell/app-shell.tsx`
**Action**: Synthesize imports and JSX elements.
1. Add import:
   ```ts
   import { ActiveContextBanner } from "./context-banner";
   ```
2. Add copilot detection:
   ```ts
   const isCopilotPage = location.pathname.startsWith("/copilot");
   ```
3. Update `shouldRenderGlobalNativeMobileHeader`:
   ```ts
   const shouldRenderGlobalNativeMobileHeader =
     isCleanMobileAppPage &&
     !isProfilePage &&
     !isFormPage &&
     !isDetailPage &&
     !hasCustomPageMobileHeader &&
     !isCopilotPage;
   ```
4. Insert `<ActiveContextBanner>` directly above the main body flex container:
   ```tsx
   {/* ── Banner Global de Contexto Não-Civil (Aviso de Identidade Ativa) ── */}
   <ActiveContextBanner session={session} />
   ```
5. Update `<main>` classes:
   ```tsx
   <main
     ref={mainRef}
     className={`main-container-query flex-1 flex flex-col min-w-0 h-full w-full max-w-full ${
       isCopilotPage
         ? "p-0 m-0 overflow-hidden"
         : isFeedPage || isCleanMobileAppPage
         ? "overflow-y-auto no-scrollbar overflow-x-hidden px-4 sm:px-6 md:px-8 pt-0 md:pt-3 pb-24 md:pb-8"
         : isFormPage
         ? "overflow-y-auto no-scrollbar overflow-x-hidden px-4 sm:px-6 md:px-8 pt-0 md:pt-4 pb-20 md:pb-8"
         : isDetailPage
         ? "overflow-y-auto no-scrollbar overflow-x-hidden px-4 sm:px-6 md:px-8 py-0 md:py-3 pb-20 md:pb-8"
         : "overflow-y-auto no-scrollbar overflow-x-hidden px-4 sm:px-6 md:px-8 pt-0 md:pt-3 pb-24 md:pb-8"
     }`}
   >
     <div className={`w-full mx-auto flex flex-col items-stretch min-w-0 flex-1 ${
       isCopilotPage
         ? "size-full max-w-none overflow-hidden"
         : isFeedPage
         ? "max-w-2xl"
         : isFormPage 
         ? "max-w-7xl" 
         : isDetailPage 
         ? "max-w-6xl" 
         : "max-w-7xl"
     }`}>
   ```
6. Update MobileNav rendering:
   ```tsx
   {isCompact && !isDetailPage && !isCopilotPage && <MobileNav session={session} userRole={session?.role} />}
   ```

---

#### Recipe 2: `src/components/shell/context-sidebar.tsx`
**Action**: Clean string replacement at lines 186-187:
```tsx
title={isMarketplacesOpen ? "Recolher categorias" : "Expandir categorias"}
aria-label={isMarketplacesOpen ? "Recolher categorias" : "Expandir categorias"}
```

---

#### Recipe 3: `src/lib/identity.server.ts`
**Action**:
1. In `resolveMemoKey()`, incorporate `waesy-auth-token`:
   ```ts
   function resolveMemoKey(): string {
     try {
       const raw = getRequestHeader("cookie") || "";
       const host = getRequestHeader("host") || "unknown-host";
       const sbPattern = new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g");
       const authCookies = [
         ...(raw.match(/waesy-auth-token[^;]*/g) || []),
         ...(raw.match(sbPattern) || []),
       ].join("&") || "guest";
       const ctx = (raw.match(/waesy_[^;]+/g) || []).join("&");
       return `${host}|${authCookies}|${ctx}`;
     } catch {
       return "unscoped";
     }
   }
   ```
2. Reject `stores.select("id").limit(1)` fallback. Keep guest identity strictly:
   ```ts
   if (!user) {
     const guestIdentity: ServerIdentity = {
       id: null,
       role: "customer",
       store_id: null,
       isPlatformAdmin: false,
       isCivilContext: true,
       activeContext: "civil",
       memberships: [],
     };
     return guestIdentity;
   }
   ```
3. Query `workspace_members` via `Promise.all` with `profiles` to attach metadata:
   ```ts
   let userProfile: any = null;
   let userProfileRole = "customer";
   let memberRows: any[] = [];

   try {
     const [profileRes, wmRes] = await Promise.all([
       serverClient
         .from("profiles")
         .select("id, full_name, username, avatar_url, role, phone, cpf")
         .eq("id", user.id)
         .maybeSingle(),
       serverClient
         .from("workspace_members")
         .select("store_id, role")
         .eq("profile_id", user.id),
     ]);

     userProfile = profileRes?.data || null;
     userProfileRole = userProfile?.role || "customer";
     memberRows = wmRes?.data || [];
   } catch (err) {
     console.warn("[identity.server] Erro ao buscar perfil ou workspace_members:", err);
   }
   ```
4. In context resolution, insert Zero-Trust Civil Root check (DEC-206) before checking `matchedMembership`:
   ```ts
   if (activeContext === "civil") {
     // Zero-Trust Civil Root: contexto civil pessoal NUNCA carrega store_id ativo
     activeStoreId = null;
   } else if (activeContext === "creator") {
     activeStoreId = null;
   } else if (matchedMembership) {
     activeStoreId = matchedMembership.store_id;
     activeContext = "store";
   } else if (isPlatformAdmin && activeStoreId) {
     activeContext = "store";
   } else if (activeContext === "store") {
     activeStoreId = memberships[0]?.store_id || null;
   } else {
     activeStoreId = null;
     activeContext = activeContext || "civil";
   }
   ```
5. Attach metadata to `resolvedIdentity`:
   ```ts
   const resolvedIdentity: ServerIdentity = {
     id: user.id,
     userId: user.id,
     role: finalRole,
     store_id: activeStoreId,
     storeId: activeStoreId,
     isPlatformAdmin,
     isCivilContext: activeStoreId === null || activeContext === "civil",
     activeContext: activeContext || (activeStoreId ? "store" : "civil"),
     memberships,
     email: user.email,
     fullName: userProfile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Membro Waesy",
   };
   ```

---

#### Recipe 4: `src/routes/_store.conta.perfil.tsx`
**Action**:
1. Imports:
   ```ts
   import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
   import { ImageUpload } from "@/components/ui/image-upload";
   import { User, Camera, ExternalLink, Loader2, Image as ImageIcon, Trash2, Check, Briefcase, Link as LinkIcon, ShieldCheck, Eye, EyeOff, Building2, ShieldAlert, Phone, Calendar, Lock, Plus, Info, Sparkles } from "lucide-react";
   ```
2. State & Handlers:
   ```ts
   const [showCivilInfo, setShowCivilInfo] = useState(false);
   ```
   Add to `formData`:
   ```ts
   featuredBannerUrl: profile?.featured_banner_url || profile?.featuredBannerUrl || "",
   featuredBannerLink: profile?.featured_banner_link || profile?.featuredBannerLink || "",
   ```
   Add to `handleSubmit` payload:
   ```ts
   featuredBannerUrl: formData.featuredBannerUrl?.trim() || undefined,
   featuredBannerLink: formData.featuredBannerLink?.trim() || undefined,
   ```
3. Section 2: Adopt humanized "Conta Civil" banner with `(i)` button:
   ```tsx
   <div className="rounded-lg border border-border/60 bg-muted/30 p-4 sm:p-5 flex items-start justify-between gap-4 text-xs text-foreground">
     <div className="flex items-start gap-3 min-w-0">
       <div className="size-9 rounded-lg bg-card border border-border/50 text-foreground flex items-center justify-center shrink-0 mt-0.5">
         <ShieldCheck className="size-5 text-primary" />
       </div>
       <div className="space-y-1 min-w-0">
         <div className="flex items-center gap-2">
           <h3 className="font-bold text-foreground text-sm">Conta Civil</h3>
           <Badge variant="secondary" className="text-[10px] font-medium text-muted-foreground">
             Perfil Oficial
           </Badge>
         </div>
         <p className="text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
           Sua identidade pessoal para compras na loja, reservas, contratos e pedidos na comunidade.
         </p>
       </div>
     </div>
     <button
       type="button"
       onClick={() => setShowCivilInfo(true)}
       aria-label="Entender a Conta Civil"
       className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
     >
       <Info className="size-5" />
     </button>
   </div>
   ```
4. Section 3: Replace `<form onSubmit={handleSubmit}>` with `<div className="space-y-6">` and change submit buttons to `type="button" onClick={handleSubmit}`.
5. Links Tab: Insert the Mini-Banner 21:9 block right above the preview card.
6. Bottom: Render the `Dialog` for Civil Info alongside the image cropper.

---

#### Recipe 5: `src/routes/_store.eventos.tsx`
**Action**: Take `origin/feat/...`'s version in full.
- Unifies categories into `DiscoveryControlBar` with `eventCategories` memo and subcategory count badges.
- Eliminates duplicate section 3.
- Uses accessible "Limpar filtros" button in empty state.

---

#### Recipe 6: `src/routes/_store.index.tsx`
**Action**: Take `origin/feat/...`'s version and apply `staleTime: 15_000` from `perf`.
```ts
export const Route = createFileRoute("/_store/")({
  staleTime: 15_000,
  head: () => ({ ... }),
  loader: async () => { ... },
});
```
This retains:
- Direct workspace products mapping and isolated marketplace catalog view.
- Isolated empty state for `activeCategory === "marketplace"`.
- Restriction of `ProceduralInfiniteFeed` to `activeCategory === "todos"`.
- Fast SPA route caching (`staleTime: 15_000`).

---

#### Recipe 7: `src/routes/_store.marketplace.index.tsx`
**Action**: Take `origin/feat/...`'s version in full.
- Eliminates duplicate "Vitrines por Nicho" section.
- Simplifies header to dynamic active niche label.
- Renders 44px accessible "Limpar filtros" button in empty state.

---

#### Recipe 8: `src/services/builder.functions.ts`
**Action**:
1. In `resolveStoreContext` (lines 537-539):
   Keep main's strict security barrier:
   ```ts
   throw new Error("Nenhum contexto de loja válido encontrado para a operação do builder.");
   ```
2. In `getPublicExperienceDocumentBySlug`:
   Insert Omni-Builder block check right after affiliate tracking cookie:
   ```ts
   // Suporte a Documento Moderno Omni-Builder
   const omniDoc = (doc.settings as any)?.omni_page;
   if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
     return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
   }
   ```

---

#### Recipe 9: `design-lint.baseline.json`
**Action**: Replace `design-lint.baseline.json` with the file from `origin/feat/system-merge-improvements-and-classifieds-copilot` (`681128b9`).
- Locks in reduction of 635 violations (13,657 vs 14,292).
- Locks in reduction of 34 P0s and 512 P1s.

---

#### Recipe 10: `design-lint.report.json` & `docs/design/LINT_DASHBOARD.md`
**Action**: Once all code files and baseline are updated, execute:
```bash
node scripts/design-lint.mjs --ratchet
```
This automatically and deterministically generates `design-lint.report.json` and updates `docs/design/LINT_DASHBOARD.md` to reflect the clean merge state.

---

## 5. Verification Method

To verify this report:

1. **Verify Git Commits & Content**:
   ```bash
   git show origin/feat/system-merge-improvements-and-classifieds-copilot:design-lint.baseline.json
   git show origin/perf/login-latency-and-route-caching:src/components/shell/app-shell.tsx
   git show origin/feat/system-merge-improvements-and-classifieds-copilot:src/components/shell/app-shell.tsx
   ```
2. **Verify DECISIONS Sequence**:
   Check that all 15 DEC entries (DEC-196 to DEC-206.1) exist in strict reverse chronological order without duplicate headers.
3. **Verify Baseline Numbers**:
   ```bash
   node -e "const b = require('./design-lint.baseline.json'); console.assert(b.totalViolations === 13657);"
   ```
4. **Invalidation Condition**:
   If any file outside the 5 conflict files and the 10 overlapping files presents divergent changes between `feat` and `perf`, or if the design-lint baseline is found to increase violations above 13,657, this report is invalidated.
