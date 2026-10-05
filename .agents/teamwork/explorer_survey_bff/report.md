# Relatório Forense: Camada BFF, Server Functions & Governança 360º

- **Data da Auditoria:** 2026-10-05
- **Agente Auditor:** Explorer 2 (BFF Server Functions & Services Survey)
- **Escopo:** `src/services/`, `src/lib/`, contratos Zod, autenticação SSR, hashing SHA-256, telemetria de rede e testes Vitest
- **Alvo Principal:** Especificação e desenho arquitetural de `src/services/admin-360-governance.functions.ts` e suíte de testes `admin-360-governance.functions.test.ts` (Requisito R2 do Master Prompt)

---

## 1. Sumário Executivo & Contexto Arquitetural

O ecossistema Waesy utiliza uma arquitetura baseada em **TanStack Start + Vinxi + Cloudflare Pages/Workers**, com persistência no **Supabase Postgres** (`jfuebqmltksyznovhlwa`).
A camada BFF é composta estritamente por **Server Functions** (`createServerFn`) isoladas em arquivos `src/services/*.functions.ts`. 

Para implementar o **Requisito R2 (Camada BFF e Ingestores de Telemetria 360º)**, este levantamento forense analisou exaustivamente as convenções do repositório, identificando:
1. Como o contexto de autenticação e permissões administrativas é derivado sem quebras de SSR ou acoplamento a lojas inexistentes;
2. Como a Invariante B.25 (integridade de parâmetros Zod) é rigidamente aplicada;
3. O padrão canônico de certificação imutável com hashes SHA-256 via Web Crypto API nativa;
4. As funções existentes de gestão de usuários no `src/services/master.functions.ts` e rotas correlatas;
5. O padrão de testes unitários com Vitest para funções de servidor desacopladas de rede real.

---

## 2. Auditoria de Autenticação, Identidade & Clientes Supabase

### 2.1 Resolução de Identidade: `getServerIdentity`
- **Arquivo Canônico:** `src/lib/server-access.ts` (exportação segura para bundles de rotas) delegando para `src/lib/identity.server.ts`.
- **Mecanismo:**
  1. Invoca `getSSRClient().auth.getUser()` inspecionando cookies via `@tanstack/start-server-core` / `vinxi/http`.
  2. Caso o usuário esteja autenticado, busca memberships em `public.workspace_members` e lê o papel em `public.profiles`.
  3. Resolve o contexto ativo (`civil`, `store`, `creator`) via cookie `waesy_active_context`.
  4. Retorna a interface `ServerIdentity`:
     ```typescript
     export interface ServerIdentity {
       id: string | null;
       userId: string | null;
       role: Role | string;
       store_id: string | null;
       storeId: string | null;
       isPlatformAdmin: boolean;
       isCivilContext: boolean;
       activeContext: string;
       memberships: StoreMembership[];
     }
     ```

### 2.2 Análise Crítica dos Guardas de Admin: `requirePlatformAdmin`
- **Problema Detectado em `src/lib/auth-guards.server.ts`:**
  A função `requireRole` (invocada por `requirePlatformAdmin` em `auth-guards.server.ts:28-30`) contém uma trava que exige `identity.store_id`:
  ```typescript
  if (!identity.store_id) {
    throw new Error("Forbidden: No active store context associated with this identity.");
  }
  ```
  **Consequência:** Um Master Admin operando em contexto global de plataforma (sem nenhuma loja selecionada) sofreria um `throw Forbidden` se utilizasse o guarda de loja.
- **Padrão Canônico Estabelecido:**
  Nos módulos administrativos de plataforma (`master.functions.ts:12-52`, `curadoria.functions.ts:9-35`, `growth-targets.functions.ts:9-35` e `legal.functions.ts:9-35`), existe um guarda especializado e resiliente:
  ```typescript
  async function requirePlatformAdmin() {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado. Por favor, faça login.");
    if (identity.role === "platform_admin" || identity.isPlatformAdmin) return identity;

    const db = getServerClient();
    const { data: p } = await db.from("profiles").select("role").eq("id", identity.id).maybeSingle();
    if (p?.role === "platform_admin") return { ...identity, role: "platform_admin" };

    const { data: userData } = await db.auth.admin.getUserById(identity.id).catch(() => ({ data: { user: null } }));
    const email = userData?.user?.email?.toLowerCase();
    const MASTER_EMAILS = [
      "contato@usewaesy.com", "admin@usewaesy.com", "meuwaesy@gmail.com",
      "meuwider@gmail.com", "excelenciatour.smo@gmail.com", "admin@jah.com"
    ];
    if (email && MASTER_EMAILS.includes(email)) {
      try { await db.from("profiles").update({ role: "platform_admin" }).eq("id", identity.id); } catch {}
      return { ...identity, role: "platform_admin" };
    }
    throw new Error("Acesso negado. Apenas administradores globais master podem realizar esta ação.");
  }
  ```
- **Diretriz para `admin-360-governance.functions.ts`:** Adotar este mesmo padrão de guarda global independente de `store_id`.

### 2.3 Clientes Supabase: `getServerClient` vs `getSSRClient`
- **`getServerClient()` (`src/lib/supabase.ts:140-161`):**
  - Utiliza `SUPABASE_SERVICE_ROLE_KEY`.
  - Bypassa políticas RLS no Postgres (opera com privilégios de superusuário).
  - Disponibiliza o namespace de administração de autenticação: `db.auth.admin` (`getUserById`, `updateUserById`, `deleteUser`, `createUser`, `listUsers`).
  - **Uso estrito:** Ações administrativas Master, ingestão de auditoria forense e operações de sistema.
- **`getSSRClient()` (`src/lib/supabase-ssr.server.ts`):**
  - Utiliza `VITE_SUPABASE_ANON_KEY` + cookies de sessão do usuário.
  - Respeita RLS. Usado para identificar o usuário civil e sessões do cliente.

---

## 3. Conformidade com Invariante B.25 & Validações Zod

A regra **B.25 do AGENTS.md** impõe:
> "Toda função BFF (`*.functions.ts`) que recebe payload tipado via Zod DEVE desestruturar 100% dos parâmetros utilizados no escopo da função ou referenciar o objeto raiz de dados, incluindo tratamento defensivo para valores opcionais/nulos, acompanhada de testes unitários que exercitem branches com parâmetros presentes e ausentes."

### 3.1 Padrão de Definição em TanStack Start
```typescript
export const recordCartTelemetryEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid("ID da loja inválido"),
      productId: z.string().uuid().optional().nullable(),
      action: z.enum(["add", "remove", "update_quantity", "abandon", "checkout_start"]),
      quantity: z.number().int().min(1).optional().default(1),
      metadata: z.record(z.any()).optional().default({}),
    })
  )
  .handler(async ({ data }) => {
    // Desestruturação completa e defensiva
    const { storeId, productId, action, quantity, metadata } = data;
    const safeQuantity = quantity ?? 1;
    const safeMetadata = metadata ?? {};
    const safeProductId = productId ?? null;
    // ...
  });
```

### 3.2 Regras de Tratamento Defensivo
1. Todos os campos com `.optional()` ou `.nullable()` devem possuir coalesce seguro (`?? null` ou `?? fallback`).
2. Proibido acessar propriedades indefinidas de segundo nível sem optional chaining (`payload?.customer?.email`).
3. Payloads com strings livres devem aplicar `.trim()` e sanitização contra injeção.

---

## 4. Padrões de Criptografia & Hashing SHA-256

### 4.1 Evidências Encontradas no Repositório
No codebase existem dois padrões de hashing SHA-256:
1. `crypto.createHash("sha256")` via `node:crypto` (utilizado em utilitários puramente node e scripts de mineração: `crypto-vault.server.ts:41`, `url-canonicalizer.ts:85`).
2. `globalThis.crypto.subtle.digest("SHA-256", buffer)` via **Web Crypto API** (utilizado em server functions de contratos e auditoria: `master.functions.ts:857-863`, `contracts.functions.ts:286`, `travel-contract.functions.ts:386`, `security.functions.ts`).

### 4.2 Por Que Web Crypto API é a Solução Canônica
1. O runtime de deploy de produção é o **Cloudflare Pages / Workers**. A Web Crypto API (`crypto.subtle`) é nativa e de altíssima performance no motor V8 dos Workers, sem overhead de emulação de módulos do Node.js.
2. É 100% suportada no Node.js 18+ (onde o Vitest roda os testes).
3. Função canônica reutilizável:
   ```typescript
   export async function generateSha256Digest(content: unknown): Promise<string> {
     const str = typeof content === "string" ? content : JSON.stringify(content);
     const msgBuffer = new TextEncoder().encode(str);
     const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", msgBuffer);
     return Array.from(new Uint8Array(hashBuffer))
       .map((b) => b.toString(16).padStart(2, "0"))
       .join("");
   }
   ```

---

## 5. Mapeamento de Funções Existentes de Gestão de Usuários & Auditoria

| Função Existente | Arquivo de Origem | Linhas | Finalidade |
|---|---|---|---|
| `listAllUsers` | `src/services/master.functions.ts` | 548–610 | Lista perfis e anexa sanções ativas (`user_moderation_sanctions`) |
| `applyUserSanction` | `src/services/master.functions.ts` | 612–666 | Aplica advertência, mute, bloqueio de anúncios ou ban permanente |
| `revokeUserSanction` | `src/services/master.functions.ts` | 668–681 | Revoga sanção disciplinar |
| `adminUpdateUserRole` | `src/services/master.functions.ts` | 683–722 | Altera nível do perfil (`profiles.role`) |
| `listKycVerifications` | `src/services/master.functions.ts` | 728–777 | Lista verificações de documentos e biometria |
| `reviewKycVerification` | `src/services/master.functions.ts` | 779–821 | Aprova ou rejeita verificação facial/documental |
| `getUser360Dossier` | `src/services/master.functions.ts` | 827–868 | Dossiê judicial resumido (pedidos, corridas, agendamentos, termos, eventos) com SHA-256 |
| `adminTriggerPasswordReset` | `src/services/master.functions.ts` | 874–887 | Dispara Magic Link de redefinição por e-mail |
| `triggerCivilIdentityRippleCascade` | `src/services/deep-core.functions.ts` | 82–130 | Executa RPC Postgres `execute_civil_identity_ripple_cascade` |
| `getUserSecurityAuditLogs` | `src/services/auth.functions.ts` | 979–997 | Histórico de sessões do usuário em `session_audit_logs` |
| `getUserRegisteredDevices` | `src/services/auth.functions.ts` | 1002–1019 | Lista aparelhos cadastrados em `device_registry` |

### 5.1 O Que Falta e Foi Solicitado para R2
1. `getUserFull360Activity`: Um dossiê completo integrando as **7 dimensões operacionais** (Geral, KYC, Formulários, Telemetria/Navegação, E-Commerce, Mobilidade, Ações de Operador).
2. `adminForceSetUserPassword`: Redefinição forçada e imediata de senha pelo Master Admin via `db.auth.admin.updateUserById(userId, { password })`.
3. `adminTransferStoreOwnership`: Transferência de titularidade de empresas (`workspace_members` + `stores.settings`) com recibo forense criptográfico.
4. `adminToggleUserAccess`: Bloqueio/desbloqueio instantâneo de contas com registro auditado.
5. Ingestores de telemetria perimetral: `recordFormSubmissionAudit`, `recordCartTelemetryEvent`, `recordStaffActionLog`.
6. Visão do consumidor: `getMyActivityHistory` para a rota `/_store/conta/atividade`.

---

## 6. Especificação Arquitetural de `admin-360-governance.functions.ts`

### 6.1 Contratos Zod & Funções a Serem Criadas

```typescript
// 1. Dossiê 360º Completo
export const getUserFull360Activity = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().uuid("ID de usuário inválido") }))
  .handler(async ({ data: { userId } }) => { ... });

// 2. Redefinição Forçada de Senha (Auth Admin)
export const adminForceSetUserPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid("ID de usuário inválido"),
      newPassword: z.string().min(8, "A senha deve conter no mínimo 8 caracteres"),
    })
  )
  .handler(async ({ data: { userId, newPassword } }) => { ... });

// 3. Transferência de Titularidade de Loja com Recibo Forense
export const adminTransferStoreOwnership = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid("ID da loja inválido"),
      newOwnerUserId: z.string().uuid("ID do novo titular inválido"),
      reason: z.string().min(5, "Motivo obrigatório para auditoria societária"),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data: { storeId, newOwnerUserId, reason, notes } }) => { ... });

// 4. Bloqueio / Desbloqueio Imediato de Acesso
export const adminToggleUserAccess = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid("ID de usuário inválido"),
      blocked: z.boolean(),
      reason: z.string().min(3, "Justificativa obrigatória"),
    })
  )
  .handler(async ({ data: { userId, blocked, reason } }) => { ... });

// 5. Ingestão de Telemetria de Formulários
export const recordFormSubmissionAudit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      route: z.string().min(1),
      formType: z.string().min(1),
      payload: z.record(z.any()),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      isVpn: z.boolean().optional(),
    })
  )
  .handler(async ({ data: { route, formType, payload, ip, userAgent, isVpn } }) => { ... });

// 6. Ingestão de Telemetria de Carrinho & Afinidade
export const recordCartTelemetryEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid("ID da loja inválido"),
      productId: z.string().uuid().optional().nullable(),
      action: z.enum(["add", "remove", "update_quantity", "abandon", "checkout_start"]),
      quantity: z.number().int().min(1).optional().default(1),
      metadata: z.record(z.any()).optional().default({}),
    })
  )
  .handler(async ({ data: { storeId, productId, action, quantity, metadata } }) => { ... });

// 7. Auditoria de Ações Corporativas de Funcionários
export const recordStaffActionLog = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid("ID da loja inválido"),
      module: z.string().min(1),
      action: z.string().min(1),
      details: z.record(z.any()).optional().default({}),
    })
  )
  .handler(async ({ data: { storeId, module, action, details } }) => { ... });

// 8. Visão do Cliente: Minha Atividade
export const getMyActivityHistory = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        limit: z.number().int().min(1).max(100).optional().default(50),
        type: z.enum(["all", "forms", "cart", "mobility", "orders"]).optional().default("all"),
      })
      .optional()
  )
  .handler(async ({ data }) => { ... });
```

### 6.2 Estrutura do Dossiê 360º em 7 Dimensões
No handler de `getUserFull360Activity`, as seguintes queries são executadas em paralelo via `Promise.all`:
1. **Dimensão 1 — Geral & Acessos:** `profiles`, `workspace_members(store_id, role, stores(id, name, slug))`, `user_moderation_sanctions`.
2. **Dimensão 2 — Documentos & KYC:** `identity_kyc_verifications` (RG, CNH, biometria facial, status e pareceres).
3. **Dimensão 3 — Formulários & Cadastros:** `user_form_submissions_log` (propostas, orçamentos, candidaturas, suporte).
4. **Dimensão 4 — Telemetria & Navegação:** `session_audit_logs`, `device_registry`, `pwa_telemetry`.
5. **Dimensão 5 — E-Commerce & Carrinhos:** `user_cart_telemetry`, `orders` (varejo/produtos), `customer_store_affinity`.
6. **Dimensão 6 — Mobilidade & GPS:** `orders` (`origin_type = 'mobility'`), `customer_debt_ledger`.
7. **Dimensão 7 — Ações como Operador:** `employee_tenant_audit_logs` (onde `user_id = targetUserId`, refletindo atuações corporativas do operador).

O snapshot agregado de todas as 7 dimensões é serializado e processado via `globalThis.crypto.subtle.digest("SHA-256")`, produzindo um carimbo digital `sha256_certification`.

---

## 7. Padrões de Testes com Vitest (`admin-360-governance.functions.test.ts`)

### 7.1 Setup do Teste
Para exercitar as funções sem dependência de banco de dados ou rede viva:
1. **Mock de `createServerFn` do TanStack Start:**
   Executa o validator Zod e repassa para o handler exatamente como em produção.
2. **Mock de `@/lib/server-access`:**
   Alterna facilmente entre identidade Master (`role: 'platform_admin'`) e identidade de cliente civil (`role: 'customer'`).
3. **Mock de `@/lib/supabase`:**
   Implementa builder encadeável (`select`, `eq`, `order`, `limit`, `insert`, `update`, `single`, `maybeSingle`) e mock de `db.auth.admin.updateUserById`.
4. **Mock de `@/lib/network-telemetry.server` e `@tanstack/start-server-core`:**
   Garante retorno previsível de IPs e headers.

### 7.2 Matriz de Casos de Teste Essenciais
- **TC-01:** `getUserFull360Activity` agrega as 7 dimensões com sucesso e emite hash SHA-256 de 64 caracteres hexadecimais.
- **TC-02:** `getUserFull360Activity` rejeita chamadas de usuários sem privilégio `platform_admin`.
- **TC-03:** `adminForceSetUserPassword` aciona `db.auth.admin.updateUserById` e insere evento em `forensic_audit_events`.
- **TC-04:** `adminForceSetUserPassword` rejeita senhas com menos de 8 caracteres (validação Zod).
- **TC-05:** `adminTransferStoreOwnership` atualiza `workspace_members`, atualiza settings da loja e gera recibo forense com checksum SHA-256.
- **TC-06:** `adminToggleUserAccess` bloqueia conta (role suspended) e registra auditoria.
- **TC-07:** `recordFormSubmissionAudit` higieniza payload e grava dados com parâmetros opcionais presentes e ausentes (Invariante B.25).
- **TC-08:** `recordCartTelemetryEvent` registra evento no carrinho e atualiza afinidade cliente-loja com parâmetros opcionais (Invariante B.25).
- **TC-09:** `recordStaffActionLog` exige usuário autenticado e registra ação corporativa no tenant.
- **TC-10:** `getMyActivityHistory` retorna apenas eventos pertencentes ao usuário civil autenticado.

---

## 8. Tabela Síntese de Arquivos & Artefatos

| Arquivo | Estado Atual | Papel / Função |
|---|---|---|
| `src/services/admin-360-governance.functions.ts` | **A criar** | Camada BFF contendo os 8 endpoints do Requisito R2 |
| `src/services/admin-360-governance.functions.test.ts` | **A criar** | Suíte de testes unitários Vitest com cobertura das 7 funções e Invariante B.25 |
| `src/services/master.functions.ts` | **Existente** | Referência de guardas de plataforma, gestão de usuários e KYC |
| `src/lib/server-access.ts` | **Existente** | Hub cliente-seguro de exportação de identidade SSR |
| `src/lib/network-telemetry.server.ts` | **Existente** | Extração de IP real, detecção de VPN/datacenter e User-Agent |
| `src/routes/admin-master.usuarios.tsx` | **Existente** | Painel do Master Admin a ser expandido para 7 abas operacionais (R3) |
| `src/routes/_store.conta.atividade.tsx` | **A criar** | Tela de transparência do cliente civil (R4) |
