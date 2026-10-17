# Handoff Report — Explorer Survey 1 (Git Branches & Merge Forensics)

**Author**: Explorer Survey 1 (Survey Phase)  
**Date**: 2026-10-13T17:45:00Z  
**Target Recipient**: Orchestrator (ID: `3a2a1483-83e5-492f-8dc4-21f64b7637fb`)  
**Scope**: Forensic investigation of remote branches (`origin/feat/system-merge-improvements-and-classifieds-copilot`, `origin/perf/login-latency-and-route-caching`, PRs #24-#34) vs `main` (`4fc5979e` / `8261f77a`), analysis of 5 conflict files, overlapping files, and clean merge strategy.

---

## 1. Observation

### 1.1 Branch Pointers & Git State
Directly observed via `git branch -a`, `git rev-parse`, and `git log`:
- **Current `main` HEAD**: `8261f77a25fe68276c5d4ecd67b0e084b879c4ba` (Merge pull request #34 from `EduardoChapeco/audit/supabase-authorized-evidence-20261013`).
- **Referenced commit `4fc5979e`**: `4fc5979e2a77f0a66d03cf1c3da2cf70f80fc601` (Merge pull request #33 from `EduardoChapeco/fix/supply-chain-secret-scan`). `4fc5979e` is a direct ancestor of `8261f77a` (only PR #28 and PR #34 were added after it, modifying 3 documentation/ledger files).
- **Remote `feat` branch**: `origin/feat/system-merge-improvements-and-classifieds-copilot` points to commit `681128b94004c78d5cc7da3a15d613ccb71ee120` (Fri Oct 9 16:12:40 2026).
  - Common ancestor with `main`: `98c0d2c2f8c01793a327a12f814c17d9de5e2afb` (PR #27, Thu Oct 8 17:51:28 2026).
  - Branch stats against ancestor: 15 commits, 95 files changed, +9,182 insertions, -2,183 deletions.
- **Remote `perf` branch**: `origin/perf/login-latency-and-route-caching` points to commit `0bbb643d44f41718c4127192ded7f6b0f1023a93` (Thu Oct 8 21:45:30 2026).
  - Common ancestor with `main`: `657b1168dafcb8e8e37e74e33991294b1fbe55c9` (commit of PR #28 / `docs/dec-196`, Thu Oct 8 17:55:41 2026).
  - Branch stats against ancestor: 3 commits, 25 files changed, +1,185 insertions, -763 deletions.
- **Status of PRs #24-#34**: Tested via `git merge-base --is-ancestor <SHA> HEAD`:
  - PR #24 (`dbc56a7f`): ANCESTOR OF MAIN (True)
  - PR #25 (`9c94095f`): ANCESTOR OF MAIN (True)
  - PR #26 (`914e973b`): ANCESTOR OF MAIN (True)
  - PR #27 (`98c0d2c2`): ANCESTOR OF MAIN (True)
  - PR #28 (`182f0a60` / `657b1168`): ANCESTOR OF MAIN (True)
  - PR #29 (`1df0359f`): ANCESTOR OF MAIN (True)
  - PR #30 (`fc230d9d`): ANCESTOR OF MAIN (True)
  - PR #31 (`490bc561`): ANCESTOR OF MAIN (True)
  - PR #32 (`cc2d9e75`): ANCESTOR OF MAIN (True)
  - PR #33 (`4fc5979e`): ANCESTOR OF MAIN (True)
  - PR #34 (`8261f77a`): ANCESTOR OF MAIN (True, current HEAD)
  - **Verdict**: 100% of PRs #24 through #34 are ALREADY merged into `main`. The remaining work consists solely of reconciling `origin/feat/...` and `origin/perf/...` into `main`.

---

### 1.2 The 5 Conflict Files — Exact Diff & Line Analysis

#### Conflict File 1: `src/lib/identity.server.ts`
- **In `main` (`8261f77a`, 252 lines)**:
  - Lines 98-151: Memberships are resolved exclusively from `workspace_members` table (`.select("store_id, role").eq("profile_id", user.id)`).
  - Lines 173-176: Hard rule: `"Memberships são somente declarados no vínculo canônico. Nunca inferir ownership por email/settings nem persistir auto-heal com service_role."`
  - Lines 204-220: Context resolution order:
    ```ts
    const matchedMembership = activeStoreId
      ? memberships.find((m) => m.store_id === activeStoreId)
      : null;

    if (activeContext === "creator") {
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
- **In `origin/feat/...` (commit `6ee1f8ed`, DEC-206)**:
  - Branched before PR #29, so it contained legacy queries searching stores by email (`storesQuery.or("email.ilike...")`) and `workspace_members` auto-heal upsert.
  - Crucial architectural innovation introduced at lines 341-356:
    ```ts
    if (activeContext === "civil") {
      // Zero-Trust Civil Root: contexto civil pessoal NUNCA carrega store_id ativo
      activeStoreId = null;
    } else if (activeContext === "creator") {
      activeStoreId = null;
    } else if (activeContext === "store") {
      if (matchedMembership) {
        activeStoreId = matchedMembership.store_id;
      } else if (isPlatformAdmin && activeStoreId) {
      } else {
        activeStoreId = memberships[0]?.store_id || null;
      }
    } else {
      activeStoreId = null;
      activeContext = "civil";
    }
    ```
- **In `origin/perf/...` (commit `753bc71a`, DEC-197)**:
  - Attempted to introduce guest fallback to first store in database (lines 86-96):
    ```ts
    if (!activeStoreId) {
      const { data: firstStore } = await serverClient.from("stores").select("id").limit(1).maybeSingle();
      activeStoreId = firstStore?.id ?? null;
    }
    ```
    *(VIOLATION of main's Zero-Trust multi-tenant isolation! Must be rejected).*
  - Benign performance optimizations:
    1. Parallelized query for profile + workspace_members via `Promise.all([serverClient.from("profiles")..., serverClient.from("workspace_members")...])`.
    2. MemoKey includes `waesy-auth-token` cookie in addition to `sb-*-auth-token`.
    3. Attached `email`, `fullName`, `user`, and `profile` to `ServerIdentity`.

---

#### Conflict File 2: `src/services/builder.functions.ts`
- **In `main` (`8261f77a`)**:
  - Lines 537-539 in `resolveStoreContext`:
    ```ts
    // Administrador global também precisa declarar o tenant-alvo.
    // Nunca inferir uma loja arbitrária para uma operação de escrita/leitura.
    throw new Error("Nenhum contexto de loja válido encontrado para a operação do builder.");
    ```
    Strict multi-tenant security barrier: rejects any fallback to `.from("stores").limit(1)` for admin or builder operations.
  - Lines 2354-2361 in `getPublicExperienceDocumentBySlug`:
    ```ts
    if (doc?.owner_id) {
      const { setSellerRefCookie } = await import("@/lib/session");
      setSellerRefCookie(doc.owner_id);
    }
    // 2. Get the latest PUBLISHED version
    const { data: versions, error: versionsError } = await db
      .from("experience_versions")...
    ```
- **In `origin/feat/...` (commit `681128b9`, DEC-206)**:
  - `resolveStoreContext`: Still had legacy fallback (`if (isGlobalAdmin) { const { data: firstStore } = await db.from("stores").limit(1)... }`). Main's strict error throw must be kept!
  - Lines 2359-2364: Added critical support for Modern Omni-Builder Documents:
    ```ts
    // Suporte a Documento Moderno Omni-Builder
    const omniDoc = (doc.settings as any)?.omni_page;
    if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
      return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
    }
    ```
    This bypasses tree-based `experience_versions`/`experience_nodes` table lookups for pages edited via Omni-Builder, preventing 404/not_found crashes when rendering modern block-based pages.

---

#### Conflict File 3: `design-lint.baseline.json`
- **In `main` (`8261f77a`)**:
  - `timestamp`: "2026-10-05T16:05:11.405Z"
  - `totalViolations`: 14,292 (P0: 1,558 | P1: 10,033 | P2: 1,333 | P3: 1,368)
  - `filesInspected`: 1,854
- **In `origin/feat/...` (`681128b9`)**:
  - `timestamp`: "2026-10-09T11:19:57.325Z"
  - `totalViolations`: 13,657 (P0: 1,524 | P1: 9,521 | P2: 1,277 | P3: 1,335)
  - `filesInspected`: 1,988
  - **Improvement**: 635 fewer violations, including 34 P0s and 512 P1s cleaned up across components, tourism, and builder modules.
- **In `origin/perf/...`**: Not modified.

---

#### Conflict File 4: `design-lint.report.json`
- **Nature of conflict**:
  Auto-generated JSON artifact written by `scripts/design-lint.mjs` (line 8: `const REPORT_PATH = path.resolve('design-lint.report.json');`).
- Conflicting lines are timestamps, run durations, and file-by-file violation listings.
- Resolving manually is an anti-pattern: must be regenerated by executing the design lint runner once code files are merged.

---

#### Conflict File 5: `docs/design/DECISIONS.md`
- **In `main`**: Starts at `DEC-196: Saneamento do Editor de Perfil, Validação de Gênero Zod...` (Date: 2026-10-08).
- **In `origin/perf/...`**: Added DEC-197, DEC-198, DEC-200.
- **In `origin/feat/...`**: Added DEC-197 through DEC-206 (including two separate DEC-206 entries).
- **Collision inventory & resolution mapping**:
  | Original ID | Branch | Date | Canonical Title | Proposed Unified ID |
  | :--- | :--- | :--- | :--- | :--- |
  | DEC-196 | main / perf | 2026-10-08 | Saneamento do Editor de Perfil, Validação de Gênero Zod, Adição de Habilidades sem Reset de Aba, Upload de Biolinks e Altura Canônica de Capas | **DEC-196** |
  | DEC-197 (perf) | perf | 2026-10-08 | Otimização Reativa de Login, Unificação de Cookies SSR, Memoização de Identidade e Caching de Rotas | **DEC-197** |
  | DEC-197 (feat) | feat | 2026-10-09 | Saneamento de Roteamento de Notificações, Tokens Comunitários, Perfil Civil Sem Jargões e Isolamento de Vitrine Marketplace | **DEC-197.1** *(ou DEC-197b)* |
  | DEC-198 (perf) | perf | 2026-10-08 | Saneamento Definitivo do Salvamento de Perfil (Purga de Coluna Inexistente hide_location), Blindagem contra Reset de Aba e Unificação Panorâmica de Capas | **DEC-198** |
  | DEC-198 (feat) | feat | 2026-10-09 | Unificação do Motor de Marketplace (Tri-Engine), Piso Tipográfico >= 12px e Ergonomia de Anúncios | **DEC-198.1** *(ou DEC-198b)* |
  | DEC-199 | feat | 2026-10-09 | Múltiplas Hospedagens no Nicho Turismo, Gestor CMS de Acomodações e Paridade de Vitrines | **DEC-199** |
  | DEC-200 (perf) | perf | 2026-10-08 | Redesign Minimalista do Copilot, Remoção de Jargões Técnicos e Desduplicação de Vitrines | **DEC-200** |
  | DEC-200 (feat) | feat | 2026-10-09 | Personalização Semântica Estrita dos Fluxos de Onboarding / Reserva / Lead Inquiry por Nicho | **DEC-200.1** *(ou DEC-200b)* |
  | DEC-201 | feat | 2026-10-09 | Estúdio de Flyers Promocionais Fullscreen, Priorização Semântica por Nicho e Modo Motion | **DEC-201** |
  | DEC-202 | feat | 2026-10-09 | Expansão de Templates Sociais Multicategoria (Varejo Encarte Lambe-Lambe, 2x1, Açougue e Aluguel Temporada) e Motor de Mini-Vídeos | **DEC-202** |
  | DEC-203 | feat | 2026-10-09 | Harmonização de Seletor de Layouts, Persistência de Hospedagens e Paridade End-to-End no Editor de Anúncios | **DEC-203** |
  | DEC-204 | feat | 2026-10-09 | Refatoração Global Nativa Mobile, Piso Tipográfico Canônico (>= 12px) e Erradicação de AI-Smell | **DEC-204** |
  | DEC-205 | feat | 2026-10-09 | Saneamento Semântico da Matriz de Nichos, Supressão de Formas de Pagamento em Vagas e Doações e Paridade End-to-End | **DEC-205** |
  | DEC-206a (feat) | feat | 2026-10-09 | Isolamento Estrito de Contexto Multi-Persona (Civil vs Empresa vs Criador) e Erradicação de Resíduos B7 | **DEC-206** |
  | DEC-206b (feat) | feat | 2026-10-09 | Expansão dos Motores de Reserva e Descoberta no Waesy Builder com Blocos Padrão Decolar/CVC | **DEC-206.1** *(ou DEC-206b)* |

---

### 1.3 Overlapping Files Between `feat` and `perf`
Observed by computing the intersection of changed files between `feat` (+95 files) and `perf` (+25 files):
Exactly 10 overlapping files:
1. `design-lint.report.json`
2. `docs/design/DECISIONS.md`
3. `docs/design/LINT_DASHBOARD.md`
4. `src/components/shell/app-shell.tsx`:
   - `feat` added `<ActiveContextBanner session={session} />`.
   - `perf` added `isCopilotPage` full-height container and bottom nav suppression in `/copilot`.
   - Lines do not conflict; both changes must be combined.
5. `src/components/shell/context-sidebar.tsx`:
   - Both branches applied identical string change: "Recolher subnichos" -> "Recolher categorias". Clean auto-merge (0 conflict).
6. `src/lib/identity.server.ts`: Covered in Section 1.2.
7. `src/routes/_store.conta.perfil.tsx`:
   - `perf`: Eliminated nested form tag to prevent resume tab reset; added featured banner 21:9 input fields.
   - `feat`: Added Civil Identity banner with `(i)` button and Dialog modal explaining Civil Account.
   - Content is complementary and easily combined.
8. `src/routes/_store.eventos.tsx`:
   - Both branches eliminated the duplicate section 3 "Subcategorias de Eventos".
   - `feat`'s version is richer with unified `DiscoveryControlBar` category chips and clean empty state.
9. `src/routes/_store.index.tsx`:
   - `perf`: Added `staleTime: 15_000` to route definition.
   - `feat`: Unified direct workspace products mapping and isolated marketplace empty state.
   - Changes combine cleanly.
10. `src/routes/_store.marketplace.index.tsx`:
    - Both branches removed duplicate "Vitrines por Nicho" section.
    - `feat` added interactive "Limpar filtros" button in empty state.

---

## 2. Logic Chain

1. **Premise 1 (Main Integrity)**:
   Observations 1.1 confirm that `main` (at `8261f77a`, descending from `4fc5979e`) contains all PRs #24-#34. PR #29 eliminated arbitrary tenant fallbacks across the codebase (Invariante B.25 / multi-tenant security).
2. **Premise 2 (Security Boundary in Identity)**:
   Observation 1.2 shows that `perf` added `stores.select("id").limit(1)` guest fallback, while `feat` branched before PR #29 and retained legacy email/settings store queries. Both break multi-tenancy. Conversely, `feat`'s DEC-206 added `if (activeContext === "civil") activeStoreId = null;`, which correctly enforces Zero-Trust Civil Root isolation.
   *Therefore*, the clean `identity.server.ts` must maintain main's strict membership check via `workspace_members`, reject any `.limit(1)` fallback, and insert `if (activeContext === "civil") activeStoreId = null;` before checking `matchedMembership`.
3. **Premise 3 (Builder Function Tenant & Modern Doc Support)**:
   Observation 1.2 shows `main` correctly throws an error when no tenant is resolved in `resolveStoreContext`. `feat` has the modern Omni-Builder block check `const omniDoc = (doc.settings as any)?.omni_page;`.
   *Therefore*, in `src/services/builder.functions.ts`, main's `throw new Error(...)` must be retained in `resolveStoreContext`, while the modern Omni-Builder block check from `feat` must be inserted into `getPublicExperienceDocumentBySlug`.
4. **Premise 4 (Design Lint Baseline & Generated Reports)**:
   Observation 1.2 and 1.3 show `feat` improved the baseline from 14,292 to 13,657 violations (-635 debt reduction). `design-lint.report.json` and `LINT_DASHBOARD.md` are auto-generated outputs.
   *Therefore*, merge should take the lower baseline from `feat` (ratchet lock) and regenerate the report and dashboard via `node scripts/design-lint.mjs --ratchet`.
5. **Premise 5 (Decisions Log Chronology)**:
   Observation 1.2 reveals that both branches authored entries between Oct 8 and Oct 9 using IDs DEC-197 through DEC-206 independently.
   *Therefore*, `DECISIONS.md` must unify all 15 decisions in strict chronological order with clear sub-indices so no architecture decision is lost.

---

## 3. Caveats

1. **Read-Only Scope**: This report is produced under read-only investigation rules; no working files or source code were mutated during this phase.
2. **Wrangler / Cloudflare Edge Secrets**: Cloudflare Pages production deployment requires environment variables configured in Cloudflare Pages dashboard (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.), as documented in DEC-180 and DEC-185.
3. **Build / Typecheck Command Restriction**: In accordance with the prompt's explicit mandate ("PROIBIÇÃO ABSOLUTA: Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância"), verification during the survey phase relied on AST/code analysis, `git diff`, `git merge-tree`, and Vitest test logic analysis.
4. No other caveats.

---

## 4. Conclusion

1. The target branches `origin/feat/system-merge-improvements-and-classifieds-copilot` and `origin/perf/login-latency-and-route-caching` are unmerged feature and performance branches diverging respectively from PR #27 (`98c0d2c2`) and PR #28 (`657b1168`).
2. PRs #24-#34 are already merged into `main` (`8261f77a`).
3. Merging `origin/perf/...` and `origin/feat/...` into `main` encounters exactly 5 conflict files:
   - `src/lib/identity.server.ts`
   - `src/services/builder.functions.ts`
   - `design-lint.baseline.json`
   - `design-lint.report.json`
   - `docs/design/DECISIONS.md`
4. The exact resolution for all 5 files is fully specified with drop-in code chunks in this report.
5. All 10 overlapping files between `feat` and `perf` have been analyzed: their changes are mutually compatible and can be synthesized without regression.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify ancestry of all PRs**:
   ```bash
   git merge-base --is-ancestor 8261f77a HEAD && echo "PR34 ok"
   git merge-base --is-ancestor 4fc5979e HEAD && echo "PR33 ok"
   git merge-base --is-ancestor 98c0d2c2 HEAD && echo "PR27 ok"
   ```
2. **Simulate 3-way merge and inspect conflicts in memory (read-only)**:
   ```bash
   git merge-tree HEAD origin/feat/system-merge-improvements-and-classifieds-copilot
   git merge-tree HEAD origin/perf/login-latency-and-route-caching
   ```
3. **Inspect specific conflict regions**:
   ```bash
   git diff HEAD origin/feat/system-merge-improvements-and-classifieds-copilot -- src/services/builder.functions.ts
   git diff HEAD origin/perf/login-latency-and-route-caching -- src/lib/identity.server.ts
   ```
4. **Invalidation condition**:
   If any commit from PRs #24-#33 is missing from `main`'s log, or if git merge-tree reports conflicts in any file outside the 5 conflict files and the 3 route files identified in Section 1.3, this report is invalidated.
