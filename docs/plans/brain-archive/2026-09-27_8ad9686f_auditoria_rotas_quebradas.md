# 🔍 AUDITORIA COMPLETA DE ROTAS QUEBRADAS — WAESY PLATFORM
> Status: Checkpoint 28 | Data: 2026-09-27 | Revisor: Conselho BigTech

---

## 🚨 PROBLEMA RAIZ IDENTIFICADO: "Falha Temporária de Conexão"

### URL Afetada
`https://waesy.com.br/classificados/e2db1110-ffb4-442b-94e8-7251176e5a3c`

### Diagnóstico Root Cause
O **`ClassifiedDetailError`** (`errorComponent`) está sendo disparado — isso significa que o loader da rota está **lançando exceção** (throw), não apenas retornando `{ status: "error" }`.

### Fluxo de Execução
```
1. _store.tsx loader (parent) → se falhar = WorkspaceErrorComponent
2. _store.classificados.$id.tsx loader (child) → se lançar = ClassifiedDetailError
   ↑ Este está sendo ativado
```

### Por que o loader lança se tem try/catch?
A investigação revelou que o loader HAS try/catch corretamente. O problema pode ser:
- **Build antigo** em produção (último commit `b1c6b67` mas deployment pode ter código anterior)
- **`_store.tsx` (parent)** loader com `getUserSession`, `getCart`, `getGlobalCarts`, `getActiveGlobalPopups`, `getPublicBrandSettings` — se um destes falhar, a rota filha recebe `errorComponent`

---

## 📊 INVENTÁRIO COMPLETO DE PROBLEMAS

### 🔴 SEV-1: Loaders sem try/catch (3 rotas críticas)
| Rota | Problema | Status |
|------|----------|--------|
| `home.tsx` | `loader` tem `throw` sem catch | 🔴 CRÍTICO |
| `workspace.curriculo.editor.tsx` | `loader` tem `throw` sem catch | 🔴 CRÍTICO |
| `workspace.turismo.propostas.novo.tsx` | `loader` tem `throw` sem catch | 🔴 CRÍTICO |

### 🟠 SEV-2: Services sem autenticação (93 arquivos)
**Os mais críticos (sem `authChecks` E sem `tryCatches`):**

| Serviço | Server Functions | Auth Checks | Criticidade |
|---------|-----------------|-------------|-------------|
| `notifications-push.functions.ts` | 4 | 0 | 🔴 |
| `portal-completo.functions.ts` | 6 | 0 | 🔴 |
| `product.functions.ts` | 2 | 0 | 🟠 |
| `promotions.functions.ts` | 4 | 0 | 🟠 |
| `pudo.functions.ts` | 6 | 0 | 🟠 |
| `quick-order.functions.ts` | 2 | 0 | 🟠 |
| `real-estate.functions.ts` | 4 | 0 | 🟠 |
| `search.functions.ts` | 4 | 0 | 🟠 |
| `seller.functions.ts` | 2 | 0 | 🟠 |
| `simlab.functions.ts` | 15 | 0 | 🟠 |
| `tag-audit.functions.ts` | 4 | 0 | 🟠 |
| `telemetry-affinity.functions.ts` | 5 | 0 | 🟠 |
| `timeline.functions.ts` | 2 | 0 | 🟠 |
| `tourism-airports.functions.ts` | 2 | 0 | 🟠 |
| `travel-ai-extractor.functions.ts` | 3 | 0 | 🟠 |

### 🟡 SEV-2: Mocks e dados fictícios detectados
| Serviço | Mocks |
|---------|-------|
| `tasks.functions.ts` | 6 |
| `payment.functions.ts` | 5 |
| `travel-lifecycle.functions.ts` | 5 |
| `studio.functions.ts` | 3 |
| `social.functions.ts` | 3 |
| `squad-content.functions.ts` | 3 |

### 🟠 SEV-1: Módulo Empregos (`_store.empregos.$id.tsx`)
- **Loader**: Tem try/catch ✅
- **Imports**: `getPublicJobById`, `applyToJob`, `getEmployerProfileInsights` — existem no BFF ✅
- **Problema provável**: `getEmployerProfileInsights` pode estar falhando silenciosamente
- **Status**: Investigação pendente via browser/logs

---

## 🗺️ MAPA DE ROTAS POR STATUS

### ✅ Rotas com Proteção Completa
- `_store.classificados.$id.tsx` — loader + errorComponent + try/catch
- `_store.empregos.$id.tsx` — loader + try/catch
- `_store.empregos.index.tsx` — data fetching com error handling

### ⚠️ Rotas Potencialmente Quebradas (mesmo padrão de erro)
Rotas que usam o mesmo parent `_store.tsx`:
- `_store.turismo.$id.tsx` — usa `getPublicTourismById`, `bookTourismExperience`
- `_store.noticias.$slug.tsx` — usa `getArticleDetail`, `recordAdTelemetry`  
- `_store.produto.$slug.tsx` — usa `getProductDetail`, `addToCart`, `getIdentity`
- `_store.membro.$id.tsx` — usa `getPublicMemberProfile`, `toggleUserFollow`
- `_store.publicacao.$id.tsx` — usa `getPostById`, `listPostComments`

---

## 🏗️ ANÁLISE DE INFRAESTRUTURA

### Env Vars — Status Cloudflare Pages (`usewaesy`)
| Variável | Status |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Encrypted Secret |
| `JWT_SECRET` | ✅ Encrypted Secret |
| `VITE_SUPABASE_URL` | ✅ Baked into bundle via wrap-worker.js |
| `VITE_SUPABASE_ANON_KEY` | ✅ Baked into bundle via wrap-worker.js |

### Schema DB — Tabelas Críticas
| Tabela | Existe | Observações |
|--------|--------|-------------|
| `classifieds` | ✅ | Falta colunas: `city`, `state`, `neighborhood`, `hide_location`, `contact_name` |
| `jobs` | ✅ | Schema OK |
| `profiles` | ✅ | Schema OK |
| `stores` | ✅ | Schema OK |
| `carts` | ✅ | Schema OK |
| `cart_items` | ✅ | Schema OK |
| `orders` | ✅ | Schema OK |
| `lead_forms` | ✅ | Schema OK |

### RLS Policies — `classifieds` (7 policies = CONFLITO POTENCIAL)
```sql
classifieds_select_public: qual = true (SELECT público)
classifieds_public_read: status IN (active, reserved, completed)
classifieds_public_select: status IN (active, published, featured) OR auth.uid() IS NOT NULL
Public can read active classifieds: status IN (active, published, reserved) OR author = uid()
classifieds_auth_all: auth.uid() IS NOT NULL (ALL)
classifieds_author_all: author = uid() (ALL)
classifieds_admin_all: workspace_members role check (ALL)
```
**Atenção**: 4 políticas SELECT sobrepostas. O `getServerClient()` (service_role) BYPASSA RLS — não deveria ser problema.

---

## 🔧 PLANO DE CORREÇÃO PRIORITÁRIA

### Fase 1 — IMEDIATO (Build + Deploy)
1. ✅ Build em progresso
2. Corrigir 3 loaders sem try/catch (home.tsx, curriculo.editor, turismo.propostas.novo)
3. Deploy para Cloudflare Pages

### Fase 2 — CURTO PRAZO
1. Adicionar colunas faltantes na tabela `classifieds`:
   - `city TEXT`, `state TEXT`, `neighborhood TEXT`, `hide_location BOOLEAN DEFAULT false`, `contact_name TEXT`
2. Consolidar as 7 políticas RLS da `classifieds` em 3 limpas
3. Investigar `getEmployerProfileInsights` no módulo Empregos

### Fase 3 — MÉDIO PRAZO
1. Auditar 93 services sem authChecks — adicionar validação de sessão
2. Eliminar mocks em tasks.functions, payment.functions, travel-lifecycle.functions
3. Resolver 361 potenciais import gaps (verificar se são aliases ou funções reais)

---

## 📋 PRÓXIMOS PASSOS IMEDIATOS

```bash
# 1. Aguardar build completar
npm run build

# 2. Deploy para Cloudflare Pages  
npx wrangler pages deploy dist --project-name usewaesy --branch main

# 3. Migration para colunas faltantes da classified
supabase migration new add_classified_missing_columns

# 4. Fix loaders sem try/catch
# → home.tsx, workspace.curriculo.editor.tsx, workspace.turismo.propostas.novo.tsx
```
