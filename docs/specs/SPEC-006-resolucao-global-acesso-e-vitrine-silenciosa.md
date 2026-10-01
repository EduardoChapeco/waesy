# SPEC-006 — Resolução Global de Acesso ao Workspace, RBAC Store Owner e Vitrine Silenciosa

## 1. Metadados e Contexto
- **Data:** 2026-10-01
- **Autor:** Agente Engenheiro de Plataforma & Arquiteto de IA (Antigravity)
- **Status:** APROVADA
- **Escopo:** Desbloqueio universal de criação de empresas e acesso ao workspace, saneamento RBAC (`store_owner`), eliminação de ReferenceError do OmniEditor e simplificação da Vitrine Principal em cards silenciosos.
- **Invariantes:**
  - Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).
  - Zero regressões na catraca do Design Lint (`node scripts/design-lint.mjs --ratchet`).
  - Alvos de toque móveis >= 44px (`min-h-14` / `min-h-16`).
  - Silêncio visual absoluto: sem números decorativos, sem subtítulos prolixos, sem cores arbitrárias ou `!important`.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Requisitos Ubíquos (Sempre Ativos)
- **REQ-001 (Compatibilidade Canônica de RBAC):** O sistema deve reconhecer `store_owner` e `proprietario` como papéis válidos em `STAFF_ROLES`, `OWNER_ROLES` e `MANAGER_ROLES`, impedindo que usuários proprietários de loja recebam 403 Forbidden em funções de backend.
- **REQ-002 (Auto-Heal Resiliente de Tenancy):** Quando um usuário autenticado não possuir registros em `workspace_members`, o sistema deve buscar lojas associadas por e-mail ou `user_id`/`created_by` nos settings da loja, gravando automaticamente o vínculo em `workspace_members` via service_role.
- **REQ-003 (Acesso Direto ao Workspace):** O layout `/workspace` não deve bloquear o usuário caso ele possua `store_id` ativo na sessão, perfil com papel `store_owner`/`owner`, ou loja vinculada.

### 2.2 Requisitos Orientados a Eventos (When... Then...)
- **REQ-004 (Criação de Empresa no Modo Expresso):**
  - *When* o usuário submeter o cadastro rápido de empresa em `_store.criar-negocio.tsx` (`FastCompanyOnboarding`);
  - *Then* o sistema deve persistir a loja com o e-mail do usuário, associar o `user_id` nos settings, criar o registro em `workspace_members`, elevar o perfil para `store_owner` e redirecionar imediatamente para `/workspace`.
- **REQ-005 (Estabilidade do OmniEditor):**
  - *When* a rota do editor do builder (`/workspace/builder/$documentId/editor`) for carregada no navegador;
  - *Then* o bundle não deve lançar `ReferenceError: WIX_CATEGORY_CONFIG is not defined`, garantindo carregamento determinístico da página.
- **REQ-006 (Vitrine Principal Silenciosa):**
  - *When* o visitante acessar a página inicial (`_store.index.tsx`);
  - *Then* o seletor `VitrineEngineSelector` deve exibir três cards amplos, limpos e sem números ("Lugares", "Lojas", "Classificados"), com feedback de foco e seleção alinhados ao Design System.

---

## 3. Matriz de Rastreabilidade de Gaps

| GAP ID | Tipo | Arquivo Alvo | Ação de Resolução |
| --- | --- | --- | --- |
| `GAP-015` | Duplicata | `src/components/admin/classified-form.tsx` | Re-exportar componente canônico `ClassifiedForm` |
| `GAP-028` | Duplicata | `src/components/commerce/return-modal.tsx` | Delegar ao fluxo canônico `RmaWizard` |
| `GAP-029` | Limpeza | `src/components/commerce/slide-out-cart.tsx` | Eliminado em favor de `cart-sheet.tsx` |
| `GAP-062` - `GAP-071` | Primitivas | `src/components/ui/*.tsx` | Homologadas como primitivas canônicas Radix UI do Design System |
| `BUG-RBAC` | Bloqueio | `src/lib/identity-core.ts` | Inclusão de `store_owner` nas listas de permissão |
| `BUG-AUTOHEAL` | Tenancy | `src/lib/identity.server.ts` | Auto-heal por e-mail/user_id com persistência em banco |
| `BUG-OMNI` | Bundle | `src/components/builder/OmniEditor.tsx` | Remoção de re-export conflitante de `WIX_CATEGORY_CONFIG` |
| `UI-VITRINE` | Design | `src/components/commerce/vitrine-engine-selector.tsx` | Cards grandes, silenciosos e diretos sem subtítulos ou contadores |

---

## 4. Evidência Esperada
1. `npm run typecheck` Exit Code 0.
2. `node scripts/design-lint.mjs --ratchet` Exit Code 0.
3. Testes unitários do OmniBuilder verdes (16/16).
