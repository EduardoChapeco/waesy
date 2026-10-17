# Handoff Report — Explorer M1.2 (Identity & Builder Forensic Specification)

**Author**: Explorer 2 (Milestone 1 — Reconciliação Forense e Unificação de Branches Remotas)  
**Date**: 2026-10-13T17:55:00Z  
**Target Recipient**: Orchestrator (ID: `3a2a1483-83e5-492f-8dc4-21f64b7637fb`)  
**Scope**: In-depth forensic specification and verbatim drop-in code chunks for the two backend conflict files:
1. `src/lib/identity.server.ts`
2. `src/services/builder.functions.ts`

---

## 1. Observation

### 1.1 Direct File Observations: `src/lib/identity.server.ts`

Direct inspection of `src/lib/identity.server.ts` across `main` (`8261f77a`), `origin/feat/system-merge-improvements-and-classifieds-copilot` (`681128b9`), and `origin/perf/login-latency-and-route-caching` (`0bbb643d`):

1. **In `main` (`8261f77a`, 252 lines total)**:
   - **MemoKey resolution (lines 25–37)**:
     ```ts
     function resolveMemoKey(): string {
       try {
         const raw = getRequestHeader("cookie") || "";
         const host = getRequestHeader("host") || "unknown-host";
         const sb =
           raw.match(new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g"))?.join("&") ||
           "guest";
         const ctx = raw.match(/waesy_[^;]+/g)?.join("&") || "";
         return `${host}|${sb}|${ctx}`;
       } catch {
         return "unscoped";
       }
     }
     ```
     Tested strictly by `src/lib/identity.server.security.test.ts:14-17` (`expect(source).toContain('const host = getRequestHeader("host") || "unknown-host"')` and `expect(source).toContain("return `${host}|${sb}|${ctx}`")`).
   - **Memberships & role resolution (lines 98–175)**:
     Executes queries sequentially: first `workspace_members` (`.eq("profile_id", user.id)`), then `stores` (`.in("id", storeIds)`), then `profiles` (`.eq("id", user.id).maybeSingle()`).
   - **Security Invariant (lines 173–176)**:
     ```ts
     // ── Passo 3: Memberships são somente declarados no vínculo canônico.
     // Nunca inferir ownership por email/settings nem persistir auto-heal com service_role.
     // Usuários sem workspace_members permanecem no contexto civil e precisam passar
     // por onboarding/convite explícito antes de acessar superfícies de loja.
     ```
   - **Context resolution order (lines 204–221)**:
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
     **Defect observed**: If a user is intentionally in Civil context (`waesy_active_context=civil`), but a store cookie or subdomain is present and matches a membership, `else if (matchedMembership)` evaluates to `true` before `activeContext === "civil"`, erroneously resetting `activeContext = "store"`.

2. **In `origin/feat/...` (DEC-206)**:
   - Lines 341–356 introduced the Zero-Trust Civil Root check:
     ```ts
     if (activeContext === "civil") {
       // Zero-Trust Civil Root: contexto civil pessoal NUNCA carrega store_id ativo
       activeStoreId = null;
     }
     ```
   - Defect in `feat`: Branched before PR #29, so it contained legacy fallback queries searching stores by email (`storesQuery.or("email.ilike...")`) and `workspace_members` auto-heal upsert. These violate `main`'s multi-tenancy rules and must be completely rejected.

3. **In `origin/perf/...` (DEC-197)**:
   - Lines 86–92 attempted to guess the first store for guest users:
     ```ts
     if (!activeStoreId) {
       const { data: firstStore } = await serverClient.from("stores").select("id").limit(1).maybeSingle();
       activeStoreId = firstStore?.id ?? null;
     }
     ```
     Tested strictly as a violation by `src/lib/identity.server.security.test.ts:8-12` (`expect(source).not.toContain('.from("stores").select("id").limit(1)')`). Must be completely rejected.
   - Benign performance improvements:
     1. Parallelized query for `profiles` + `workspace_members` via `Promise.all`:
        ```ts
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
        ```
     2. Cookie memoization: supports `waesy-auth-token` in addition to `sb-*-auth-token`.
     3. Populated `email` and `fullName` on `resolvedIdentity`.

---

### 1.2 Direct File Observations: `src/services/builder.functions.ts`

Direct inspection of `src/services/builder.functions.ts` across `main` (`8261f77a`), `origin/feat/...`, and `origin/perf/...`:

1. **`resolveStoreContext` (lines 496–540 in `main`)**:
   - `main` lines 532–540:
     ```ts
     // 3. Fallback para store_id ativo na identidade
     if (identity.store_id) {
       return identity.store_id;
     }

     // Administrador global também precisa declarar o tenant-alvo.
     // Nunca inferir uma loja arbitrária para uma operação de escrita/leitura.
     throw new Error("Nenhum contexto de loja válido encontrado para a operação do builder.");
     ```
   - Verified by test `src/services/builder-phase1.test.ts:54-63`:
     ```ts
     it("resolveStoreContext deve rejeitar platform_admin sem tenant-alvo", async () => {
       const adminIdentity = { id: "user-admin", role: "platform_admin", store_id: null, memberships: [] };
       await expect(resolveStoreContext(adminIdentity)).rejects.toThrow("Nenhum contexto de loja válido");
     });
     ```
   - Both `origin/feat` and `origin/perf` contained the legacy guessing fallback:
     ```ts
     if (isGlobalAdmin) {
       const db = getServerClient();
       const { data: firstStore } = await db.from("stores").select("id").limit(1).maybeSingle();
       if (firstStore?.id) return firstStore.id;
     }
     ```
     This fallback breaks test line 62 and violates multi-tenant security. `main`'s strict throw is 100% correct and must be kept.

2. **`getPublicExperienceDocumentBySlug` (lines 2354–2361 in `main`)**:
   - `main` currently queries `experience_versions` and `experience_nodes`:
     ```ts
     // Affiliate Tracking Injection
     if (doc?.owner_id) {
       const { setSellerRefCookie } = await import("@/lib/session");
       setSellerRefCookie(doc.owner_id);
     }

     // 2. Get the latest PUBLISHED version
     const { data: versions, error: versionsError } = await db
       .from("experience_versions")
       .select("*")
       .eq("document_id", doc.id)
       .eq("status", "published")
       .order("created_at", { ascending: false })
       .limit(1);
     ```
   - In `origin/feat/...` (DEC-206):
     Added support for modern Omni-Builder block-based documents:
     ```ts
     // Suporte a Documento Moderno Omni-Builder
     const omniDoc = (doc.settings as any)?.omni_page;
     if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
       return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
     }
     ```
     Because Omni-Builder pages store blocks directly in `doc.settings.omni_page.blocks` rather than creating separate rows in `experience_versions` and `experience_nodes`, querying `experience_versions` yields `not_found`. This block check allows Omni-Builder storefronts and landing pages to render immediately.

---

## 2. Logic Chain

1. **Step 1 — Zero-Trust Civil Root (DEC-206)**:
   - *Observation*: In `main`, when a user selects Civil context (`activeContext === "civil"`), if `activeStoreId` exists in cookies/subdomain and matches a membership, `else if (matchedMembership)` matches first and sets `activeContext = "store"`.
   - *Inference*: To enforce Zero-Trust Civil Root isolation, the check `if (activeContext === "civil") activeStoreId = null;` must be placed at the very top of context resolution before `matchedMembership` evaluation.
   - *Conclusion*: Incorporating `if (activeContext === "civil") activeStoreId = null;` guarantees that civil persona never carries an active store tenant.

2. **Step 2 — Anti-Guessing Multi-Tenant Isolation**:
   - *Observation*: `perf` attempted `.from("stores").select("id").limit(1)` in `identity.server.ts`, and both `feat` and `perf` attempted it in `builder.functions.ts:resolveStoreContext`. Both violate security tests (`identity.server.security.test.ts:8-12` and `builder-phase1.test.ts:54-63`).
   - *Inference*: Any `.limit(1)` store guessing breaches multi-tenant isolation, allowing cross-tenant data leaks and broken permissions.
   - *Conclusion*: Retain `main`'s strict prohibition of `.limit(1)` across both files.

3. **Step 3 — Benign Parallelization & Auth Token Memoization**:
   - *Observation*: In `main`, `profiles` and `workspace_members` are queried sequentially, incurring two roundtrips. In `perf`, they are fetched in parallel with `Promise.all`, reducing latency by ~50%. In addition, `perf` matches `waesy-auth-token` in cookies.
   - *Inference*: Parallelizing the read of `profiles` and `workspace_members` does not alter permissions or data structures. Retaining `host` in `return `${host}|${sb}|${ctx}`` maintains compatibility with `identity.server.security.test.ts:16`.
   - *Conclusion*: Incorporate `Promise.all` parallelization and `waesy-auth-token` into `identity.server.ts`.

4. **Step 4 — Omni-Builder Document Hydration**:
   - *Observation*: Modern pages created with Omni-Builder store their JSON block layout in `doc.settings.omni_page.blocks` without `experience_nodes` table entries. Currently, `getPublicExperienceDocumentBySlug` returns `status: "not_found"` when `experience_versions` is empty.
   - *Inference*: Inserting `const omniDoc = (doc.settings as any)?.omni_page; if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };` directly resolves this 404 condition.
   - *Conclusion*: Insert the Omni-Builder block check directly after affiliate cookie tracking in `getPublicExperienceDocumentBySlug`.

---

## 3. Caveats

1. **Read-Only Investigation**: In compliance with the Explorer archetype, this report does not directly modify source files in `src/`. Exact replacement files and diff patches have been created in the explorer folder (`.agents/teamwork/teamwork_preview_explorer_m1_r8_2/`).
2. **Build & Typecheck Prohibition**: In accordance with user rules ("PROIBIÇÃO ABSOLUTA: Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância"), verification was performed using targeted Vitest runs on specific test files and AST/regex inspection.
3. No other caveats.

---

## 4. Conclusion & Verbatim Drop-In Specifications

### 4.1 Specification for `src/lib/identity.server.ts`

**Full Proposed File**: Available at `.agents/teamwork/teamwork_preview_explorer_m1_r8_2/proposed_identity.server.ts`.

#### Chunk 1: MemoKey Resolution with `waesy-auth-token` and `host` (Lines 25–37)

```ts
// BEFORE (main lines 25-37):
function resolveMemoKey(): string {
  try {
    const raw = getRequestHeader("cookie") || "";
    const host = getRequestHeader("host") || "unknown-host";
    const sb =
      raw.match(new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g"))?.join("&") ||
      "guest";
    const ctx = raw.match(/waesy_[^;]+/g)?.join("&") || "";
    return `${host}|${sb}|${ctx}`;
  } catch {
    return "unscoped";
  }
}

// AFTER (Drop-in):
function resolveMemoKey(): string {
  try {
    const raw = getRequestHeader("cookie") || "";
    const host = getRequestHeader("host") || "unknown-host";
    const sbPattern = new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g");
    const sb = [
      ...(raw.match(/waesy-auth-token[^;]*/g) || []),
      ...(raw.match(sbPattern) || []),
    ].join("&") || "guest";
    const ctx = raw.match(/waesy_[^;]+/g)?.join("&") || "";
    return `${host}|${sb}|${ctx}`;
  } catch {
    return "unscoped";
  }
}
```

#### Chunk 2: Parallel Fetch of Profile & Workspace Members (Lines 98–172)

```ts
// BEFORE (main lines 98-165):
  // ── Passo 1: Buscar memberships via workspace_members (única fonte canônica)
  try {
    const { data: memberRows, error: wmErr } = await serverClient
      .from("workspace_members")
      .select("store_id, role")
      .eq("profile_id", user.id);

    if (wmErr) {
      console.warn("[identity.server] Erro ao buscar workspace_members:", wmErr.message);
    }

    if (memberRows && memberRows.length > 0) {
      const storeIds = Array.from(new Set(memberRows.map((m: any) => m.store_id).filter(Boolean)));
      if (storeIds.length > 0) {
        const { data: storesList, error: storesErr } = await serverClient
          .from("stores")
          .select(
            "id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url",
          )
          .in("id", storeIds);

        if (storesErr) {
          console.warn("[identity.server] Erro ao buscar stores por ID:", storesErr.message);
        }

        const storeMap = new Map((storesList || []).map((s: any) => [s.id, s]));
        const uniqueMembershipMap = new Map<string, any>();

        memberRows.forEach((m: any) => {
          if (storeMap.has(m.store_id) && !uniqueMembershipMap.has(m.store_id)) {
            const s = storeMap.get(m.store_id)!;
            const settings = (s.settings as Record<string, any>) || {};
            uniqueMembershipMap.set(m.store_id, {
              store_id: s.id,
              role: m.role || "owner",
              name: s.name || "Minha Empresa",
              slug: s.slug || "loja",
              logo_url: s.logo_url || settings.logoUrl || settings.logo_url || null,
              segment: settings.segment || settings.type || settings.niche || null,
              type: settings.type || settings.segment || null,
              category: settings.category || settings.segment || null,
              city: s.city || null,
              state: s.state || null,
              settings: settings,
            });
          }
        });

        memberships = Array.from(uniqueMembershipMap.values());
      }
    }
  } catch (e) {
    console.warn("[identity.server] Erro ao buscar memberships:", e);
  }

  // ── Passo 2: Verificar role do perfil
  let userProfileRole = "customer";
  try {
    const { data: p } = await serverClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    userProfileRole = p?.role || "customer";
  } catch (err) {
    console.error("[identity.server] Falha ao verificar role no banco:", err);
  }

// AFTER (Drop-in with Promise.all):
  // ── Passo 1: Busca em paralelo de Perfil completo e Vínculos canônicos (1 roundtrip)
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
    if (wmRes?.error) {
      console.warn("[identity.server] Erro ao buscar workspace_members:", wmRes.error.message);
    }
  } catch (err) {
    console.warn("[identity.server] Erro ao buscar perfil ou workspace_members:", err);
  }

  if (memberRows && memberRows.length > 0) {
    const storeIds = Array.from(new Set(memberRows.map((m: any) => m.store_id).filter(Boolean)));
    if (storeIds.length > 0) {
      try {
        const { data: storesList, error: storesErr } = await serverClient
          .from("stores")
          .select(
            "id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url",
          )
          .in("id", storeIds);

        if (storesErr) {
          console.warn("[identity.server] Erro ao buscar stores por ID:", storesErr.message);
        }

        const storeMap = new Map((storesList || []).map((s: any) => [s.id, s]));
        const uniqueMembershipMap = new Map<string, any>();

        memberRows.forEach((m: any) => {
          if (storeMap.has(m.store_id) && !uniqueMembershipMap.has(m.store_id)) {
            const s = storeMap.get(m.store_id)!;
            const settings = (s.settings as Record<string, any>) || {};
            uniqueMembershipMap.set(m.store_id, {
              store_id: s.id,
              role: m.role || "owner",
              name: s.name || "Minha Empresa",
              slug: s.slug || "loja",
              logo_url: s.logo_url || settings.logoUrl || settings.logo_url || null,
              segment: settings.segment || settings.type || settings.niche || null,
              type: settings.type || settings.segment || null,
              category: settings.category || settings.segment || null,
              city: s.city || null,
              state: s.state || null,
              settings: settings,
            });
          }
        });

        memberships = Array.from(uniqueMembershipMap.values());
      } catch (e) {
        console.warn("[identity.server] Erro ao montar memberships de lojas:", e);
      }
    }
  }
```

#### Chunk 3: Context Resolution with DEC-206 Zero-Trust Civil Root & Identity Extension (Lines 204–240)

```ts
// BEFORE (main lines 204-240):
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

  const currentMembership = activeStoreId
    ? memberships.find((m) => m.store_id === activeStoreId)
    : null;
  const storeRole = (currentMembership?.role as any) || "customer";
  const finalRole = isPlatformAdmin ? "platform_admin" : storeRole;

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
  };

// AFTER (Drop-in with DEC-206 Civil Root isolation and email/fullName):
  const matchedMembership = activeStoreId
    ? memberships.find((m) => m.store_id === activeStoreId)
    : null;

  if (activeContext === "civil") {
    // Zero-Trust Civil Root (DEC-206): contexto civil pessoal NUNCA carrega store_id ativo
    activeStoreId = null;
  } else if (activeContext === "creator") {
    // Contexto de Criador: opera com personas de conteúdo e afiliação sem tenant de loja
    activeStoreId = null;
  } else if (activeContext === "store") {
    if (matchedMembership) {
      activeStoreId = matchedMembership.store_id;
    } else if (isPlatformAdmin && activeStoreId) {
      // Admin master com permissão de impersonação/acesso à loja ativa
    } else {
      activeStoreId = memberships[0]?.store_id || null;
    }
  } else if (matchedMembership) {
    activeStoreId = matchedMembership.store_id;
    activeContext = "store";
  } else if (isPlatformAdmin && activeStoreId) {
    activeContext = "store";
  } else {
    activeStoreId = null;
    activeContext = "civil";
  }

  const currentMembership = activeStoreId
    ? memberships.find((m) => m.store_id === activeStoreId)
    : null;
  const storeRole = (currentMembership?.role as any) || "customer";
  const finalRole = isPlatformAdmin ? "platform_admin" : storeRole;

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
    fullName:
      userProfile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Membro Waesy",
  };
```

---

### 4.2 Specification for `src/services/builder.functions.ts`

**Patch File**: Available at `.agents/teamwork/teamwork_preview_explorer_m1_r8_2/proposed_builder.functions.patch`.

#### Chunk 1: `resolveStoreContext` (Lines 496–540) — RETAIN MAIN AS IS

Retain `main`'s strict implementation verbatim:
```ts
export async function resolveStoreContext(
  identity: {
    id: string | null;
    role?: string;
    store_id?: string | null;
    memberships?: Array<{ store_id: string }>;
  },
  targetStoreId?: string | null,
  documentId?: string | null,
): Promise<string> {
  const isGlobalAdmin = identity.role === "platform_admin" || identity.role === "master";

  // 1. Se targetStoreId foi passado explicitamente
  if (targetStoreId) {
    if (isGlobalAdmin) return targetStoreId;
    if (identity.store_id === targetStoreId) return targetStoreId;
    if (identity.memberships?.some((m) => m.store_id === targetStoreId)) return targetStoreId;
  }

  // 2. Se documentId foi fornecido, resolve do documento no banco
  if (documentId) {
    const db = getServerClient();
    const { data: doc } = await db
      .from("experience_documents")
      .select("store_id")
      .eq("id", documentId)
      .maybeSingle();

    if (doc?.store_id) {
      if (isGlobalAdmin) return doc.store_id;
      if (identity.store_id === doc.store_id) return doc.store_id;
      if (identity.memberships?.some((m) => m.store_id === doc.store_id)) return doc.store_id;
      throw new Error("Acesso negado ao documento desta loja.");
    }
  }

  // 3. Fallback para store_id ativo na identidade
  if (identity.store_id) {
    return identity.store_id;
  }

  // Administrador global também precisa declarar o tenant-alvo.
  // Nunca inferir uma loja arbitrária para uma operação de escrita/leitura.
  throw new Error("Nenhum contexto de loja válido encontrado para a operação do builder.");
}
```

#### Chunk 2: `getPublicExperienceDocumentBySlug` (Lines 2354–2364) — INSERT OMNI-BUILDER BLOCK CHECK

```ts
// BEFORE (main lines 2354-2361):
      // Affiliate Tracking Injection
      if (doc?.owner_id) {
        const { setSellerRefCookie } = await import("@/lib/session");
        setSellerRefCookie(doc.owner_id);
      }

      // 2. Get the latest PUBLISHED version
      const { data: versions, error: versionsError } = await db
        .from("experience_versions")
        .select("*")
        .eq("document_id", doc.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1);

// AFTER (Drop-in insertion):
      // Affiliate Tracking Injection
      if (doc?.owner_id) {
        const { setSellerRefCookie } = await import("@/lib/session");
        setSellerRefCookie(doc.owner_id);
      }

      // Suporte a Documento Moderno Omni-Builder
      const omniDoc = (doc.settings as any)?.omni_page;
      if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
        return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
      }

      // 2. Get the latest PUBLISHED version
      const { data: versions, error: versionsError } = await db
        .from("experience_versions")
        .select("*")
        .eq("document_id", doc.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1);
```

---

## 5. Verification Method

To independently verify all findings and test suites:

1. **Verify Security Invariants for `identity.server.ts`**:
   ```powershell
   cmd.exe /c npx.cmd vitest run src/lib/identity.server.security.test.ts
   ```
   Must pass 2/2 tests:
   - `não atribui a primeira loja do banco a visitantes sem tenant`
   - `inclui o host na chave do cache de identidade`

2. **Verify Multi-Tenant Invariants for `builder.functions.ts`**:
   ```powershell
   cmd.exe /c npx.cmd vitest run src/services/builder-phase1.test.ts
   ```
   Must pass 6/6 tests, notably:
   - `resolveStoreContext deve rejeitar platform_admin sem tenant-alvo`

3. **Verify Builder Functions Baseline**:
   ```powershell
   cmd.exe /c npx.cmd vitest run src/services/builder.functions.test.ts
   ```
   Must pass 8/8 tests.

4. **Invalidation Conditions**:
   - If `source.includes('.from("stores").select("id").limit(1)')` returns `true` in `identity.server.ts`, this specification is invalidated.
   - If `resolveStoreContext` returns a guessed store for `platform_admin` without a target tenant, this specification is invalidated.
   - If `getPublicExperienceDocumentBySlug` returns `status: "not_found"` for documents containing `doc.settings.omni_page.blocks`, this specification is invalidated.
