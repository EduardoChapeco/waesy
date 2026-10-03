# Project: Waesy Ecosystem E2E Forensic Audit & Refactoring

## Architecture
- **Client & Routing**: TanStack Router (`src/routes/`) com 393 rotas ativas, segregadas por prefixo (`workspace.*`, `_store.*`, `admin-master.*`, `api.*`, `viajante.*`).
- **BFF (Server Functions)**: TanStack Start `createServerFn()` em `src/services/*.functions.ts`, consumindo `src/lib/server-access.ts` e utilitários SSR.
- **Database & Storage**: PostgreSQL gerenciado via Supabase (`jfuebqmltksyznovhlwa`) com 536 tabelas em schema `public`, políticas RLS e 13 buckets de storage.
- **Identidade & Isolamento**: Sessão SSR via `@supabase/ssr`, `getServerIdentity()`, `assertStoreAccess()`, isolamento civil vs lojista vs criador vs admin.
- **Design System**: Apple HIG no Mobile (<640px) com touch targets >= 44px (`h-11`) e barras inferiores fixas (`pb-safe`) vs Bento Grid de 12 colunas (`grid-cols-12`) no Desktop (>=1024px).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | RLS & View Security Invoker | Blindar 6 views SECURITY DEFINER com `security_invoker = true` e auditar 28 tabelas deny-by-default | M1 | Survey 1 (Explorer 1) |
| 2 | Storage Policy Lockdown | Revogar políticas `Universal Media *` que concedem ALL a `{public}` em 9 buckets | M1 | Survey 1 (Explorer 1) |
| 3 | Bucket Normalization | Criar bucket `covers`, normalizar alias `classifieds` e isolar documentos confidenciais de classificados | M1 | Survey 1 (Explorer 1) |
| 4 | Triple Media Governance UI | Adicionar input de URL externa ao `MediaUploader` e `ImageUpload` (Bucket + Paste Ctrl+V + URL) | M1 | Survey 1 (Explorer 1) |
| 5 | Mock & Unsplash Purge | Substituir `placehold.co` por empty state SVG honesto e expurgar integração Unsplash do Turismo Studio | M1 | Survey 1 (Explorer 1) |
| 6 | BFF Multi-Tenant Isolation | Corrigir bypass de tenant em exclusão/atualização por ID em `admin-catalog`, `service-orders`, `events` | M2 | Survey 2 (Explorer 2) |
| 7 | IDOR Elimination | Passar `data.storeId` para `assertStoreAccess` em `billing.functions.ts` | M2 | Survey 2 (Explorer 2) |
| 8 | Public Endpoint Protection | Adicionar autenticação a `executeHardRefresh` e `recordOrderMicroFee` | M2 | Survey 2 (Explorer 2) |
| 9 | Fiscal Closed Allowlist | Ocultar `cost_cents`, `margin_percent`, `fiscal_profile` e notas fiscais de DTOs públicos | M2 | Survey 2 (Explorer 2) |
| 10 | BOM Automatic Deduction | Normalizar dedução de BOM no PDV via variant_id e garantir idempotência na baixa de peças de OS | M2 | Survey 2 (Explorer 2) |
| 11 | AI Quick Onboarding Persistence | Verificar atomicidade e consistência da persistência em 7 tabelas do onboarding | M2 | Survey 2 (Explorer 2) |
| 12 | 15 Niches & 4 Macro-Archetypes | Garantir que todas as 393 rotas dos 15 nichos operem sem erro e com regras de negócio corretas | M3 | Survey 3 (Explorer 3) |
| 13 | Mobile HIG Ergonomics | Garantir touch targets >= 44px (`h-11`), barras inferiores `pb-safe`, gavetas `100dvh` | M4 | Survey 3 (Explorer 3) |
| 14 | Desktop Bento Grid 12-Col | Garantir painéis e vitrines em Bento Grid de 12 colunas com proporção áurea | M4 | Survey 3 (Explorer 3) |
| 15 | Regra B.8 Conformance | Eliminar títulos compostos (>6 palavras), zero cards conversacionais de AI-smell, zero emojis | M4 | Survey 3 (Explorer 3) |
| 16 | Edge ASN & Cloudflare Telemetry | Extrair `cf-connecting-asn` em `network-telemetry.server.ts` e persistir `ip_address` em `pwa_telemetry` | M5 | Survey 1 (Explorer 1) |
| 17 | Design-Lint & Verification | Executar `node scripts/design-lint.mjs`, Vitest focado e documentar em `DECISIONS.md` | M6 | Survey 3 (Explorer 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Storage Governance, Media Triad, Mock & Unsplash Purge | RLS Storage, views security_invoker, covers bucket, uploaders com URL, remoção de placehold.co e Unsplash | none | DONE |
| 2 | M2: BFF Multi-Tenant Protection, Fiscal Allowlist & BOM | Proteção de tenant em server functions, IDOR fix, blindagem de dados fiscais, dedução BOM e idempotência de OS | none | COMPLETED |
| 3 | M3: 15 Niches & 4 Macro-Archetypes Route Hardening | Verificação funcional das 393 rotas nos 4 macro-arquétipos (carrinho, specs allowlist, agendamento, vitrine) | M1, M2 | COMPLETED |
| 4 | M4: Platform Differentiation: Mobile HIG vs Bento & Regra B.8 | Touch targets >=44px, bottom bars, 12-col Bento, correção de 3 títulos compostos e sanitização B.8 | M3 | COMPLETED |
| 5 | M5: Edge Telemetry Cloudflare Pages & Anti-Spam | ASN em network-telemetry, IP em pwa_telemetry, verificação de anti-flooding e fingerprint | M2 | COMPLETED |
| 6 | M6: Design-Lint, Vitest & Final Quality Gate | node scripts/design-lint.mjs, testes Vitest focados, zero typecheck/build, registro em DECISIONS.md | M1, M2, M3, M4, M5 | COMPLETED |

## Interface Contracts
### Public Listing DTO ↔ Client
- `UnifiedListing` DTO: Proibido expor `cost_cents`, `margin_percent`, `markup_percent`, `fiscal_profile`.
- `sanitizePublicProductAttributes`: Permite apenas chaves de especificações aprovadas (`PUBLIC_SPEC_ALLOWLIST`).

### Media Uploader Components ↔ Storage
- `MediaUploader` e `ImageUpload`: Devem oferecer 3 canais unificados:
  1. `file`: Upload direto para bucket Supabase autenticado.
  2. `url`: Inserção e validação de URL externa HTTPS.
  3. `paste`: Captura nativa de imagem da área de transferência (Ctrl+V clipboard listener).

### BOM Consumption Contract (PDV & OS)
- Insumo identificado preferencialmente por `variant_id` UUID canônico.
- Movimentação de estoque registrada em `stock_movements` com `movement_type: "sale"`, `reference_type: "bom_consumption"` ou `"service_order"`.
- Idempotência: Operação não pode executar baixa repetida para a mesma OS já concluída.

## Code Layout
- `src/components/ui/`: Componentes atômicos de interface (`media-uploader.tsx`, `image-upload.tsx`, etc.).
- `src/services/`: Server Functions BFF (`*.functions.ts`).
- `src/lib/`: Utilitários puros, schemas, resolução de identidade (`identity-core.ts`, `network-telemetry.server.ts`).
- `src/routes/`: Definições de rota TanStack Router.
- `docs/design/DECISIONS.md`: Registro formal de decisões arquiteturais.
