# SPEC-STAFF-DIRECT-WORKSPACE-ACCESS — Acesso Direto de Funcionários ao Workspace Sem Conta Civil

## 1. Contexto e Problema
Lojistas e gestores que cadastram colaboradores no Workspace precisam que os funcionários entrem diretamente no painel operacional (`/workspace`) com suas respectivas funções (`seller`, `cashier`, `finance`, `stock`, `content`, `support`, `manager`, `admin`), sem necessidade de criar conta civil prévia, navegar pela vitrine civil ou depender exclusivamente de fluxo de recuperação de senha por e-mail.

### Falhas Raiz Identificadas na Auditoria E2E
1. **Criação e Edição de Membro sem Controle de Senha e sem Link Direto (`src/services/admin-team.functions.ts` & `src/routes/workspace.configuracoes.equipe.tsx`):**
   - `_inviteTeamMember` gerava senha aleatória descartada sem permitir que o gestor definisse a senha inicial ou redefinisse a senha na gaveta **Vínculos do Colaborador**.
   - A interface não exibia o link direto de acesso corporativo (`/painel?email=...&returnUrl=/workspace`) nem disparo rápido por WhatsApp.
2. **Queda Silenciosa em Contexto Civil (`src/lib/identity.server.ts` & `src/services/auth.functions.ts`):**
   - `getServerIdentity` inicializava `activeContext = "civil"` mesmo na ausência do cookie `waesy_active_context`, zerando `activeStoreId = null` no primeiro acesso sem cookie de tenant.
   - `getUserSession` priorizava `profile?.role` (cujo default no banco é `"customer"`) antes de `identity.role` (papel real em `workspace_members`).
3. **OAuth Callback e Guardas de Rota Incompletos (`src/routes/api.auth.callback.ts`, `src/routes/painel.tsx`, `src/routes/workspace.tsx`):**
   - O callback OAuth não inicializava os cookies de contexto corporativo (`waesy_active_context=store`, `waesy_active_tenant`) para membros de equipe.
   - As verificações `hasStore` em `/painel` e `/workspace` não listavam todos os cargos operacionais (`cashier`, `finance`, `stock`, `content`, `support`).
4. **Desconexão entre Cadastro de RH (`employees`) e Equipe do Painel (`workspace_members`):**
   - Colaboradores cadastrados em `/workspace/financeiro/funcionarios` com e-mail ficavam apenas na tabela contábil `employees` se não houvesse ponte automática para `workspace_members`.

## 2. Requisitos em Sintaxe EARS
- **EARS-01 (Provisionamento Direto e Senha Gerenciada):** QUANDO o gestor convidar um colaborador em `/workspace/configuracoes/equipe` ou editar seus vínculos informando uma senha de acesso (mínimo 6 caracteres), O SISTEMA DEVE provisionar ou atualizar a credencial no Supabase Auth com `email_confirm: true`, `approval_status: "approved"` em `profiles` e vínculo ativo em `workspace_members`.
- **EARS-02 (Link Direto e Compartilhamento Operacional):** ENQUANTO o gestor visualizar a lista de membros ou a gaveta **Vínculos do Colaborador**, O SISTEMA DEVE disponibilizar ações para copiar o link direto `/painel?email=<email>&returnUrl=/workspace` e enviar as instruções de acesso via WhatsApp.
- **EARS-03 (Pré-preenchimento no Portal Corporativo `/painel`):** QUANDO o funcionário acessar `/painel?email=<email>`, O SISTEMA DEVE pré-preencher o identificador de login na aba **Acessar Workspace** e conduzi-lo diretamente para `/workspace` após autenticação por senha ou Google OAuth.
- **EARS-04 (Resolução Determinística de Identidade Staff):** QUANDO um usuário autenticado possuir vínculo em `workspace_members` e não tiver selecionado explicitamente o contexto `"civil"` ou `"creator"`, O SISTEMA DEVE ativar o contexto `"store"`, preservar o `role` operacional da loja em `getUserSession` e admitir todos os cargos de `STAFF_MEMBER_ROLES` nas guardas de `/painel` e `/workspace`.
- **EARS-05 (Ponte RH ↔ Equipe):** QUANDO um colaborador for salvo em `upsertStoreEmployee` com e-mail válido, O SISTEMA DEVE garantir a sincronização opcional/automática do vínculo em `workspace_members` caso ainda não possua acesso ao painel.

## 3. Escopo de Arquivos Autorizados
- `src/services/admin-team.functions.ts`
- `src/lib/identity.server.ts`
- `src/services/auth.functions.ts`
- `src/routes/api.auth.callback.ts`
- `src/routes/painel.tsx`
- `src/routes/workspace.tsx`
- `src/routes/workspace.configuracoes.equipe.tsx`
- `src/services/hr.functions.ts`
- `src/services/__tests__/workspace-tenant-isolation-team.test.ts`

## 4. Invariantes e Critérios de Aceite
- Zero necessidade de conta civil para funcionários convidados.
- Isolamento multi-tenant preservado (`store_id` validado via `assertStoreAccess`).
- Controles interativos com altura mínima `h-11 min-h-11` no mobile e `:focus-visible:ring-2`.
- Aprovação em `npm run typecheck`, testes automatizados e `node scripts/design-lint.mjs --ratchet`.
