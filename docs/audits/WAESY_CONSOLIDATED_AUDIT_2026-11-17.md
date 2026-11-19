# Auditoria Holística Consolidada, Confronto Ideal vs Real & Plano de Microfases — Waesy

**Data:** 2026-11-17  
**Branch / HEAD:** `release/prod-20261113-fullpage-chat-copilot` (`c0e1d351`)  
**Worktree:** `706` entradas modificadas/não-rastreadas (incluindo `12` migrations `20270523000000`..`20270604000000` ainda não rastreadas + `2` modificadas `20270330`/`20270417`)  
**Scope Rule:** Diagnóstico integral pré-mutação (`src/` e `supabase/` preservados intocados nesta etapa).

---

## 1. Reconstrução da Intenção do Produto (O que o Waesy Foi Projetado Para Ser)

Com base no contrato de arquitetura (`AGENTS.md`, `docs/design/DESIGN.md`, `DECISIONS.md` `DEC-393`..`DEC-511`, `SPEC-PROPOSAL-WEB-AND-STUDIO-E2E.md`, e nas últimas frentes executadas):

1. **Ecossistema Multi-Tenant Bilateral Zero-Trust:** Admin Master configura superfícies públicas (`marketplace_surfaces`, `marketplace_sections`, `home_page_sections`, `hotpages`, `banners`) e módulos; visitantes/civis veem exatamente o que foi publicado em `waesy.com.br` respeitando cidade, agendamento temporal e opt-out `waesy_marketplace_enabled = false`.
2. **Desacoplamento Waesy Pro (`/app/:slug`) vs Marketplace (`/conta`):** Cada empresa possui seu próprio PWA / App Oficial (`/app/:slug`) com Magic Link e Código de Cliente (`store_app_client_tokens`), isolado do marketplace genérico.
3. **Sistema Operacional de Carreira & Empregadores (Modelo InfoJobs/Glassdoor):** Candidatos editam currículo completo (`/conta/curriculo` e `/membro/$id`), empresas são autocompletadas por `store_id`, salários/motivos de saída/notas ficam confidenciais no PDF e alimentam a inteligência pública da empresa (`/empresa/$slug` e `/empregos/$id`).
4. **Cadeia Ponta a Ponta sem Fakes ou Silenciamentos:** Toda mutação persiste no Supabase com autoridade de preço server-side, uploads passam por buckets declarados no Postgres + Storage BFF allowlist + enquadramento canônico sem distorção, erros estruturais gravam contexto completo (`schema`, `table`, `column`, `contract`, `page_url`) em `system_error_logs`, e páginas operam sob UI silenciosa (hierarquia Apple/Linear, 1 casca por card, mobile >= 92% de área útil, alvos >= 44px).

---

## 2. Sinais e Checks Executados (Comportamento Real Observado)

| Verificação | Comando / Fonte | Resultado Observado | Observações / Ressalvas |
|---|---|---|---|
| Design Lint Ratchet | `node scripts/design-lint.mjs --ratchet` | **PASS (Exit 0)** — `0` violações reportadas em `2.353` arquivos | Usa catraca/supressões; não detecta containeritis comportamental, monólitos nem `.audit` literal colors (`C01=1315`, `C06=546` em `2026-11-17T13:24Z`). |
| Contrato BFF × Migrations | `node scripts/check-bff-table-contracts.mjs` | **PASS (Exit 0)** — `641` migrations, `847` tabelas regex, `690` refs BFF, `0` ausentes localmente | Não garante que as `12` migrations untracked (`20270523..20270604`) estejam aplicadas no remoto nem que `types.ts` esteja sincronizado. |
| Consolidação de Schema | `node scripts/check-schema-consolidation.mjs` | **PASS (Exit 0)** — `641` migrations, `833` tabelas únicas, `290` funções, versões únicas OK | Confirma unicidade local; não testa execução limpa no remoto nem Drift de `types.ts`. |
| Subações Silenciosas | `node scripts/audit-silent-subactions-and-dead-code.mjs` | **FAIL (Exit 1)** — `22` candidatos em `317` `.functions.ts` | Contém falsos-positivos heurísticos (ex.: `duplicateTravelProposal`), mas expôs stub real (`dispatchPixelConversionEvent`). |
| Forensic Repo Audit | `.audit/audit-report.json` / `.audit/BASELINE.md` (`2026-11-17`) | **OPEN DEBT** — `2.922` arquivos, `1.221.377` LOC, `18` checks avaliados (`6` OK, `12` abertos) | `C01(1315)`, `C06(546)`, `C07(47)`, `C08(10)`, `C09(9)`, `C18(143)`, `C22(22)`, `C23(10911)`, `C26(4)`, `C28(2)`, `C37(154)`, `C40(35)`. |
| TypeScript Check | `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` | **BLOQUEADO / TIMEOUT (>6m sem stdout)** neste ambiente Windows (`task-2897`) | Baseline oficial `.audit/tsc-baseline.txt` (`2026-11-17`) registra **20 erros TS em 12 arquivos**. |
| Runtime Live Browser (`dev`) | `vite dev` / Playwright / Browser Subagent | **NÃO EXECUTADO / BLOQUEADO** | `package.json:7` (`vite dev`) estourou heap de 2GB (`OOM`) após HTTP 500 `[SSR_CATASTROPHIC_ERROR]` em `/`; `playwright` não instalado (`False`); browser subagent em `429 RESOURCE_EXHAUSTED`. |

---

## 3. Matriz Consolidada: Ideal vs Real & Status por Camada

Legenda de classificação:
- **IMPLEMENTADO E CONECTADO (COM RISCO):** fluxo principal existe, porém com gaps/atrito pontual.
- **PARCIAL / DESCONECTADO:** frontend/BFF/DB existem em pedaços que não conversam ou usam contratos distintos.
- **IMPLEMENTADO MAS QUEBRADO / FALSO-POSITIVO:** UI/BFF compilam ou aparentam sucesso, mas não persistem, usam stub ou corrompem dado.
- **PLANEJADO NUNCA CONSTRUÍDO / DORMENTE:** módulos/specs inteiros sem chamadores ou Edge Functions inexistentes.

| Domínio | Estado Ideal | Estado Real Confirmado (`file:line`) | Classificação |
|---|---|---|---|
| **A. Edge Functions & IA Studio** | Edge Functions deployadas para brand/briefing IA | `src/services/studio.functions.ts:925` chama `sw-brand-generate` e `:1067` chama `sw-briefing-generate`; `supabase/functions/` contém apenas `_shared` e `infotravel-connector`. `refineSlideTextWithAI` (`:1800-1834`) cai em copy estática de fallback. | **PLANEJADO / QUEBRADO** |
| **B. Telemetria Pixel & Mutações UI** | CAPI/Meta real + reclamações/comunidades/vouchers persistidos no DB | `telemetry.functions.ts:230-278` (`dispatchPixelConversionEvent`) apenas faz `console.info` e retorna `{ success: true }`. UI fake com `setTimeout` + `toast` sem BFF em `reputation-complaint-modal.tsx:31-41`, `CommunityJoinSheet.tsx:56-63` e `customer-travel-portal.tsx:66-68`. | **FALSO-POSITIVO / STUB** |
| **C. Observabilidade de Erros & Loaders** | Todo erro estruturado (`schema`, `table`, `column`, `contract`, `page_url`) gravado em `system_error_logs` e exposto ao usuário/log | `logSystemError` duplicado entre `src/lib/logger.ts:33` e `src/services/telemetry.functions.ts:191`; apenas `99` usos frente a `2.553` Server Functions. `admin-logs.functions.ts:75-80` retorna `[]` em erro de DB; `admin-master.logs.tsx:17-27`, `_store.tsx:22-57` e `_store.index.tsx:94-116` engolem falhas com `.catch(() => [])`. | **PARCIAL / DESCONECTADO** |
| **D. Segurança BFF, SSRF & Preços** | Autenticação + `assertStoreAccess` + preço autoritativo no Postgres | `image-proxy.functions.ts:11-52` (`fetchImageAsBase64`) sem auth/anti-SSRF; `association.functions.ts:194-260` sem auth/`assertStoreAccess`; `promotions.functions.ts:30-32,108-113` sem `assertStoreAccess`; `pudo.functions.ts:96-112` vaza pacotes sem `.eq("store_id")`; `quick-order.functions.ts:151-198`, `classifieds-events.functions.ts:59,63,114` e `deals.functions.ts:54-77` confiam em preços/totais enviados pelo cliente (`quick-order` ainda cai no UUID `"00000000-0000-0000-0000-000000000002"`). `identity.server.ts:56-72` hardcoda 6 emails master. | **QUEBRADO (P0 SEGURANÇA)** |
| **E. DB, Migrations, RLS & `types.ts`** | Zero policies permissivas mutáveis, `types.ts` 100% sincronizado, `SECURITY DEFINER` blindado | `833` tabelas nas migrations vs `601` em `src/integrations/supabase/types.ts` (`~232` sem tipagem!). `116` policies mutáveis `USING(true)`/`WITH CHECK(true)` fora de `service_role` e `146` `SECURITY DEFINER` sem `SET search_path` no histórico; `20270404000000:372,445` isenta `'excelencia-tour%'` e libera `EXECUTE TO authenticated`; `20270601000000:57,396` não revoga `PUBLIC` nem checa `is_active`; `20270128000000:143-163` permite qualquer logado alterar `home-banners`/`home-categories`. `scripts/deploy-production-migrations.mjs:42-62` para em `20270418`. | **PARCIAL / RISCO P0** |
| **F. Storage Buckets, Crop & Upload** | Todos os forms usam upload autenticado em buckets existentes + crop 1:1 fiel ao container | `home-banners` (`5` usos em `admin-master.home-editor.tsx`) e `recipes` (`workspace.conteudo.receitas.tsx:568`) faltam em `ALLOWED_BFF_BUCKETS` (`storage.functions.ts:68-88`). `recipes`, `order-receipts`, `rma-proofs` não possuem `INSERT INTO storage.buckets` nas migrations. Segundo `MediaUploader` (`admin/builder/MediaUploader.tsx:10`) importa `UnsplashAssetPicker`. `crop-image.ts:32-35` converte `21:9` desktop para `1920x617` (`28:9`). Inputs de URL crua persistem em `customer-360-sidebar.tsx:1443,2538`, `UniversalDocumentStudio.tsx:1791`, `admin-master.usuarios.tsx:1460`, etc. | **QUEBRADO / INCONSISTENTE** |
| **G. Perfil Profissional & InfoJobs** | Fluxo único: editar experiências/salário/motivo/nota -> `employer_reviews` + perfil empresa + vagas | **Motor partido:** `getCompanyEmployerStats` (`social.functions.ts:1565` -> loja) lê `employer_reviews`, enquanto `getEmployerProfileInsights` (`jobs.functions.ts:725` -> vaga `/empregos/$id`) lê `job_applications` + `classified_applications`. `professional-resume-editor.tsx:1445-1446` **corrompe pretensão salarial em 100x** (divide por 100 na leitura, remove pontuação sem multiplicar por 100 ao salvar!). `saveUserResume` (`resumes.functions.ts:141-244`) não sincroniza `employer_reviews`; `social.functions.ts:1535,1552` ignora `revErr`. `canonical-store-profile-view.tsx:2300` renderiza `<Badge>` vazio quando `exit_reason` é nulo. | **PARCIAL / CORRUPÇÃO DE DADOS** |
| **H. CMS Bilateral & Waesy Pro (`/app/:slug`)** | CMS controla 100% da Home/Superfícies/Hotpages e `/app/:slug` opera isolado sem vazar Private SaaS | `hotpage.functions.ts:366-388` (`getHotpageBySlug`) ignora `isCampaignActive` e `city_filter`. `surface-cms.functions.ts:464-596` **vaza lojas com `waesy_marketplace_enabled = false`** para vitrines públicas, ignora tipos/fontes (`car_rentals`, `videos`, `hotpage`, `classifieds_spotlight`, `category`, `top_sellers`) no `getModularSurfaceFeed`, e injeta botões hardcoded (`:654-659`). `HomeMobileNativeApp.tsx:225,267` ressuscita arrays hardcoded se CMS estiver vazio. `branded-app.functions.ts:604` e `customer-portal.functions.ts:14` expõem `settings`/`pix_key`/`ai_knowledge_base` em client anon. `branded-app-shell.tsx:420` joga comprador do App para `/checkout` do Marketplace. Colisão `/c/$slug` (`_store.c.$slug.tsx`) vs `/c/$storeSlug` (`c.$storeSlug.tsx`). | **PARCIAL / VAZAMENTO MULTI-CONTEXTO** |
| **I. Classificados, Vertical Ad-Engine & Checkout** | Editor modular unificado + showcase por vertical + checkout consistente | `src/components/ad-engine/editor/unified-listing-editor.tsx` (`17` arquivos, `4.333` LOC) está **100% dormente (0 chamadores)** enquanto `_store.conta.classificados.novo.tsx` acumula `7.929` LOC. `_store.checkout.tsx` (`3.050` LOC) usa regex por nome de cidade/título (`:217,239`) como fallback de nicho e acopla App Pro ao Marketplace. | **DORMENTE / MONOLÍTICO** |
| **J. Design System 4.0, Rotas & "Silenciar Páginas"** | Primitivos únicos DS4, rotas limpas sem traps, mobile responsivo sem duplicação de DOM | `70+` arquivos `>1.500 LOC`; `49` Editores, `23` State/Empty, `20` Headers, `13` Shells, `1.138` `lucide-react` vs `165` `@phosphor-icons/react`; `20` rotas redirect-trap ativas na navegação (`workspace-navigation.ts`, `workspace-all-tools-dialog.tsx`); `97` rotas ausentes de `src/lib/routes.ts`; `155` tabelas sem card fallback no mobile, `225` duplicações DOM (`steps/100`), exports nomeados quebrando code-splitting (`_store.conta.atividade`, `_store.conta.ingressos`, `_store.conta.classificados.index`). | **PARCIAL / DÍVIDA ESTRUTURAL ALTA** |

---

## 4. Priorização de Gaps Silenciosos & Plano Sequencial em Microfases

> Critério de ordenação: (1) Integridade de Trabalho/Commits/Typecheck e Build -> (2) Segurança P0 & Autoridade Server-Side & RLS -> (3) Buckets, Observabilidade Real de Erros & Erradicação de Fakes/Stubs -> (4) InfoJobs / Salário 100x / Perfil -> (5) Bilateralidade CMS, Isolamento Waesy Pro (`/app/:slug`) & Remoção de Colisões -> (6) Refatoração de Monólitos, Code-Splitting, Ad-Engine & Silenciamento DS4 -> (7) Limpeza final & Verificação E2E + Browser.

- **M0 — Estabilização do Baseline, Typecheck e Trabalho Sujo (`release/prod-20261113-fullpage-chat-copilot`)**
  - Inventariar e organizar as `706` alterações pendentes e `12` migrations untracked (`20270523..20270604`), corrigir os `20` erros de `.audit/tsc-baseline.txt` (começando por `travel-proposal.functions.ts:1689` `normalizedTransfers`, `branded-app-workspace-editor.tsx:545`, `ChatQuickComposerModals.tsx:1002,1755`, `oportunidades.tsx`, `cotacoes.tsx`, `travel-lifecycle.functions.ts:3204`), adicionar `--max-old-space-size=6144` no script `"dev"` do `package.json`, aposentar `scripts/deploy-production-migrations.mjs` obsoleto e regenerar `src/integrations/supabase/types.ts` após alinhamento das migrations.
- **M1 — Blindagem P0 de Segurança BFF, Preços Autoritativos & SSRF**
  - Bloquear SSRF em `image-proxy.functions.ts` reutilizando `assertSafeExternalMediaUrl` + `getServerIdentity()`.
  - Adicionar `getServerIdentity()` + `assertStoreAccess` em `association.functions.ts` (`requestAssociationMembership`, `updateAssociationMembershipStatus`, etc.) e `promotions.functions.ts`.
  - Escopar `listStorePudoPackages` (`pudo.functions.ts`) obrigatoriamente por `store_id` do staff autenticado.
  - Recalcular preços/totais/descontos exclusivamente via catálogo DB no servidor em `quick-order.functions.ts` (remover UUID hardcoded `:143`), `classifieds-events.functions.ts`, e `deals.functions.ts` (`isDirectBooking`).
  - Remover exposição anônima de `settings`, `pix_key` e `ai_knowledge_base` em `branded-app.functions.ts:604` e `customer-portal.functions.ts:14`; remover email hardcoded fallback em `identity.server.ts:56-72`.
- **M2 — Hardening de Banco, RLS, `SECURITY DEFINER` e Buckets de Storage**
  - Criar migration única de hardening:
    - Corrigir `check_store_vertical_quota` (`20270404000000`: remover hardcode `'excelencia-tour%'`, validar permissão de tenant/`is_platform_admin()`).
    - Corrigir `deduplicate_and_link_lead_to_customer` (`20270601000000`: `REVOKE ALL FROM PUBLIC`, validar vínculo com tenant/staff) e exigir `wm.is_active = true` nas policies de `chat-media-private` e `recipes`.
    - Restringir `INSERT/UPDATE/DELETE` de `home-banners` e `home-categories` em `storage.objects` a `public.is_platform_admin()`.
    - Criar buckets faltantes (`recipes`, `order-receipts`, `rma-proofs`) com RLS estrita por tenant/usuário e sincronizar `ALLOWED_BFF_BUCKETS` + `getSignedUploadUrl` (`storage.functions.ts`) para incluir `home-banners`, `home-categories`, `recipes` e `copilot-uploads`.
    - Revisar/revogar as `116` policies mutáveis `USING(true)` históricas e aplicar `SET search_path = public, pg_temp` nas RPCs `SECURITY DEFINER` legadas.
- **M3 — Erradicação de Fakes/Stubs, Edge Functions & Observabilidade Única**
  - Substituir `dispatchPixelConversionEvent` (`telemetry.functions.ts:230-278`) por despacho real CAPI Meta (reaproveitando `pixels.functions.ts` / gravação em tabela de telemetria) e remover/implementar chamadas inexistentes `sw-brand-generate` / `sw-briefing-generate` (`studio.functions.ts:925,1067`) via `executeUnifiedAiCall`.
  - Conectar ou remover as 3 UIs simuladas (`reputation-complaint-modal.tsx`, `CommunityJoinSheet.tsx`, `customer-travel-portal.tsx`).
  - Unificar `logSystemError` em único módulo canônico (`src/lib/logger.ts`), remover `.catch(() => [])` silenciosos nos loaders críticos (`_store.tsx`, `_store.index.tsx`, `admin-master.logs.tsx`, `admin-logs.functions.ts`) com estado explícito de erro + log estruturado com `schema_name`, `table_name`, `column_name`, `contract_name` e `page_url`.
- **M4 — Pipeline Unificado de Mídia, Crop Zero-Drift & Troca de URLs Cruas por Storage Upload**
  - Eliminar a duplicata `src/components/admin/builder/MediaUploader.tsx` (remover `UnsplashAssetPicker`), padronizando no componente canônico `src/components/ui/media-uploader.tsx` + `ImageUpload`.
  - Corrigir `getCanonicalDimensions` (`src/lib/crop-image.ts:32-35`) separando exatamente `21:9` (`1920x823`) de `28:9` (`1920x617`).
  - Substituir inputs de URL crua de imagem/documento (`customer-360-sidebar.tsx`, `UniversalDocumentStudio.tsx`, `admin-master.usuarios.tsx`, `workspace.clientes.$id.tsx`, `admin-master.faturas.tsx`, `admin-master.home-editor.tsx`) por upload real para buckets + preview com aspect ratio travado.
- **M5 — Integridade Carreira & Empregadores (InfoJobs End-to-End)**
  - Corrigir imediatamente o bug de 100x em `professional-resume-editor.tsx:1445-1446` (`CurrencyField` ou parse monetário com centavos).
  - Unificar `employer_reviews` (`social.functions.ts`) + insights em `jobs.functions.ts:725` numa única camada SSOT de Reputação de Empregadores alimentada tanto pelo Currículo (`/conta/curriculo` via `saveUserResume` e `/membro/$id` via `updateMemberResumeData`) quanto pelas candidaturas; checar/logar `revErr` e remover `<Badge>` vazio em `canonical-store-profile-view.tsx:2300`.
- **M6 — Bilateralidade CMS, Isolamento Waesy Pro (`/app/:slug`) & Checkout por Contexto**
  - Aplicar filtro `waesy_marketplace_enabled !== false` e `publish_to_marketplace !== false` em `getModularSurfaceFeed` (`surface-cms.functions.ts:464-596`).
  - Implementar os handlers ausentes de seções CMS (`car_rentals`, `videos`, `classifieds_spotlight`, `single_store_spotlight`, `hotpage`, `category`, `top_sellers`) e remover botões fallback hardcoded.
  - Aplicar `isCampaignActive(data)` + `city_filter` em `getHotpageBySlug` (`hotpage.functions.ts:366-388`) e impedir que `HomeMobileNativeApp.tsx` ressuscite itens hardcoded quando seção CMS estiver desativada/vazia.
  - Desacoplar checkout do App Pro (`/app/$slug/checkout` ou contexto isolado em `_store.checkout` sem chrome do marketplace) e eliminar/redirecionar rota colidente legada `c.$storeSlug.tsx` mantendo `/c/$slug` apenas para Comunidades e `/app/$slug` como portal único da empresa.
- **M7 — Desacoplamento de Monólitos, Ad-Engine, Code-Splitting & "Silenciar Páginas" (DS4)**
  - Conectar ou aposentar definitivamente `ad-engine/` (`4.333` LOC sem chamadores) fatiando `_store.conta.classificados.novo.tsx` (`7.929` LOC).
  - Limpar as 20 rotas redirect-trap de `workspace-navigation.ts` e `workspace-all-tools-dialog.tsx`, sincronizar `src/lib/routes.ts`, corrigir exports `default` obrigatórios em rotas para code-splitting, consolidar superfícies duplicadas (`admin/product-editor/` -> `admin/catalog/product-editor/`, primitivos `components/design-system/` -> `design-system/`) e substituir tabelas brutas no mobile por cards responsivos conforme `DESIGN.md`.
- **M8 — Portão Final de Verificação E2E + Prova em Navegador Real**
  - Instalar `@playwright/test` / harness headless em dev ou executar smoke suite automatizada cobrindo rotas públicas, App Pro Magic Link (`/app/:slug`), InfoJobs round-trip, Admin CMS <-> Vitrine, console zero erros, 0 imagens `naturalWidth === 0`, e layout mobile/desktop sem overflow.
