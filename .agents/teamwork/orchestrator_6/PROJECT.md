# Project: Telemetria 360º & Governança Master

## Architecture
- **Camada de Persistência (Supabase)**: Migração cronológica `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql`. Tabelas: `user_form_submissions_log`, `user_cart_telemetry`, `employee_tenant_audit_logs`, `customer_store_affinity`. Índices b-tree para buscas por usuário, loja e data. Políticas RLS Deny-by-Default com acesso total para `platform_admin` e acesso contextual para `auth.uid()` e lojistas associados.
- **Camada BFF (Server Functions)**: `src/services/admin-360-governance.functions.ts`. Ingestão segura de telemetria com Web Crypto SHA-256 e IP/VPN detection. 8 funções autorizadas por SSR (`getServerIdentity`, `requirePlatformAdmin` autônomo, `getServerClient` service-role). Paridade com Invariante B.25 (100% dos parâmetros desestruturados).
- **Master Admin 360º UI**: `src/routes/admin-master.usuarios.tsx`. Dossiê 360º com 7 abas operacionais ativas (`SheetPage size="wide"`): Geral & Acessos, Documentos & KYC, Formulários & Cadastros, Telemetria & Navegação, E-Commerce & Carrinhos, Mobilidade & GPS, Ações como Operador. Botões funcionais para redefinir senha, magic link, bloqueio, transferência e KYC instantâneo. Alvos táteis >= 44px (`h-11 min-h-11`), `:focus-visible:ring-2 focus-visible:ring-primary`, 0 violações de design lint.
- **Visão do Consumidor "Minha Atividade"**: `src/routes/_store.conta.atividade.tsx`. Interface civil no padrão Apple Privacy / Google My Activity com agrupamento cronológico, filtros por categoria, 4 estados (dados, skeleton, empty, error), `NativeBackButton` e integração no menu `_store.conta.index.tsx`.
- **Garantia de Qualidade & Deploy**: Testes unitários com Vitest em `src/services/admin-360-governance.functions.test.ts`, catraca `node scripts/design-lint.mjs --ratchet` sem regressões, `npm run build` limpo e deploy no Cloudflare Pages com validação HTTP.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Form Submissions Log Table | Tabela `user_form_submissions_log` com rota, payload, IP, VPN, user_id e RLS | M1 | Survey DB |
| 2 | Cart Telemetry Table | Tabela `user_cart_telemetry` com eventos de carrinho, checkout abandonado e RLS | M1 | Survey DB |
| 3 | Staff Audit Log Table | Tabela `employee_tenant_audit_logs` vinculando CPF civil a ações corporativas | M1 | Survey DB |
| 4 | Store Affinity Table | Tabela `customer_store_affinity` com agregação por loja e cliente (UNIQUE) | M1 | Survey DB |
| 5 | Master 360 Aggregator BFF | `getUserFull360Activity` com certificação SHA-256 de 7 dimensões | M2 | Survey BFF |
| 6 | Admin Password Reset BFF | `adminForceSetUserPassword` via Supabase Auth Admin | M2 | Survey BFF |
| 7 | Store Ownership Transfer BFF | `adminTransferStoreOwnership` transferindo lojas e gerando recibo | M2 | Survey BFF |
| 8 | User Access Toggle BFF | `adminToggleUserAccess` bloqueando/desbloqueando contas com motivo | M2 | Survey BFF |
| 9 | Telemetry Ingestion BFFs | `recordFormSubmissionAudit`, `recordCartTelemetryEvent`, `recordStaffActionLog` | M2 | Survey BFF |
| 10 | Civil Activity History BFF | `getMyActivityHistory` para auto-consulta do cliente civil com anonimização | M2 | Survey BFF |
| 11 | Master Admin Dossier 7 Tabs | `src/routes/admin-master.usuarios.tsx` com 7 abas operacionais completas | M3 | Survey UI |
| 12 | Master Admin Actions & KYC | Controles imediatos de senha, magic link, bloqueio, transferência e KYC instantâneo | M3 | Survey UI |
| 13 | Master Admin Design Lint Fix | Purga de débito legado (`size-3.5`, `text-[10px]`, `text-amber-600`, touch targets < 44px) | M3 | Survey UI |
| 14 | Civil "Minha Atividade" Route | `src/routes/_store.conta.atividade.tsx` no padrão Apple/Google My Activity | M4 | Survey UI |
| 15 | Account Hub Navigation Link | Link de Atividade integrado em `ACCOUNT_GROUPS` em `_store.conta.index.tsx` | M4 | Survey UI |
| 16 | BFF Unit Tests Suite | `src/services/admin-360-governance.functions.test.ts` cobrindo 100% das 8 funções e Invariante B.25 | M5 | Survey BFF |
| 17 | Design Lint Ratchet Validation | Execução do ratchet comprovando 0 novas violações P0/P1 | M5 | Survey UI |
| 18 | Production Build & Deploy | `npm run build`, deploy Cloudflare Pages e smoke test HTTP | M5 | Survey UI |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Supabase Telemetry Migration | `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql` | none | DONE |
| 2 | M2: BFF Server Functions | `src/services/admin-360-governance.functions.ts` | M1 | PLANNED |
| 3 | M3: Master Admin 360º Dossiê UI | `src/routes/admin-master.usuarios.tsx` (7 abas operacionais + ações) | M2 | PLANNED |
| 4 | M4: Civil My Activity Route | `src/routes/_store.conta.atividade.tsx` + `_store.conta.index.tsx` | M2 | PLANNED |
| 5 | M5: Tests, Ratchet, Build & Deploy | Vitest suite, design-lint ratchet, build e deploy Cloudflare Pages | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Database ↔ BFF (`supabase/migrations/` ↔ `admin-360-governance.functions.ts`)
- `user_form_submissions_log`: `{ id: uuid, user_id: uuid, form_type: text, route_path: text, payload: jsonb, client_ip: text, is_vpn: boolean, user_agent: text, created_at: timestamptz }`
- `user_cart_telemetry`: `{ id: uuid, user_id: uuid, session_id: text, store_id: uuid, product_id: uuid, event_type: text, quantity: integer, metadata: jsonb, client_ip: text, created_at: timestamptz }`
- `employee_tenant_audit_logs`: `{ id: uuid, user_id: uuid, store_id: uuid, module: text, action: text, details: jsonb, client_ip: text, created_at: timestamptz }`
- `customer_store_affinity`: `{ id: uuid, customer_id: uuid, store_id: uuid, visits_count: integer, cart_additions_count: integer, orders_count: integer, total_spent_cents: bigint, affinity_level: text, last_interaction_at: timestamptz }`

### BFF ↔ Master Admin UI (`admin-360-governance.functions.ts` ↔ `admin-master.usuarios.tsx`)
- `getUserFull360Activity({ data: { userId: string } })` -> `{ dossier: User360Dossier, sha256_certified: string, generated_at: string }`
- `adminForceSetUserPassword({ data: { userId: string, newPassword: string } })` -> `{ success: boolean, message: string }`
- `adminTransferStoreOwnership({ data: { storeId: string, currentOwnerId: string, newOwnerId: string, transferReason: string } })` -> `{ success: boolean, receipt: object }`
- `adminToggleUserAccess({ data: { userId: string, block: boolean, reason?: string } })` -> `{ success: boolean, status: string }`

### BFF ↔ Civil UI (`admin-360-governance.functions.ts` ↔ `_store.conta.atividade.tsx`)
- `getMyActivityHistory({ data: { category?: string, limit?: number, cursor?: string } })` -> `{ items: ActivityItem[], categories: string[] }`

## Code Layout
- `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql`: SQL DDL e RLS policies.
- `src/services/admin-360-governance.functions.ts`: Camada BFF Server Functions.
- `src/services/admin-360-governance.functions.test.ts`: Suíte de testes unitários Vitest.
- `src/routes/admin-master.usuarios.tsx`: Painel Master Admin com Dossiê 360º em 7 abas.
- `src/routes/_store.conta.atividade.tsx`: Tela civil Minha Atividade.
- `src/routes/_store.conta.index.tsx`: Menu de navegação da conta.
