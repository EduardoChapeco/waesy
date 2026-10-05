# Handoff Report — Explorer Survey BFF: Server Functions & Services

## 1. Observation
1. **Identidade e Guardas de Servidor:**
   - Em `src/lib/server-access.ts:34-37`, `getServerIdentity()` importa dinamicamente `src/lib/identity.server.ts` e retorna `{ id, userId, role, store_id, isPlatformAdmin, memberships }`.
   - Em `src/lib/auth-guards.server.ts:28-30`, `requireRole` exige explicitamente `identity.store_id`:
     ```typescript
     if (!identity.store_id) {
       throw new Error("Forbidden: No active store context associated with this identity.");
     }
     ```
     Isso bloqueia ações globais de Master Admin caso invocadas sem uma loja ativa.
   - Em contrapartida, em `src/services/master.functions.ts:12-52`, `curadoria.functions.ts:9-35` e `legal.functions.ts:9-35`, funções master usam um guarda customizado que valida `identity.role === 'platform_admin'`, consulta `profiles.role` e faz fallback para `MASTER_EMAILS` via `db.auth.admin.getUserById(identity.id)`.
2. **Clientes Supabase:**
   - Em `src/lib/supabase.ts:140-161`, `getServerClient()` utiliza `SUPABASE_SERVICE_ROLE_KEY` (service-role key), bypassando RLS e expondo `db.auth.admin` (`getUserById`, `updateUserById`, `createUser`, `deleteUser`).
   - Em `src/lib/supabase-ssr.server.ts:22-61`, `getSSRClient()` usa `VITE_SUPABASE_ANON_KEY` e lê cookies da requisição HTTP via `@tanstack/start-server-core`.
3. **Padrões de Hashing SHA-256:**
   - Em `src/services/master.functions.ts:857-863`, `contracts.functions.ts:281-290` e `travel-contract.functions.ts:386`, utiliza-se a Web Crypto API nativa:
     ```typescript
     const msgBuffer = new TextEncoder().encode(jsonStr);
     const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", msgBuffer);
     const sha256 = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
     ```
   - Esse formato possui compatibilidade nativa de runtime no Cloudflare Pages/Workers sem requerer polyfills de `node:crypto`.
4. **Telemetria de Rede e Detecção de VPN/IP:**
   - Em `src/lib/network-telemetry.server.ts:79-127` e `294-329`, `getRealClientIP` extrai o IP real inspecionando `cf-connecting-ip`, `true-client-ip`, `x-real-ip` e `x-forwarded-for`.
   - A função `captureRequestTelemetry` detecta VPN/datacenter avaliando `cf-iptype` e ASN (`amazon`, `google`, `digitalocean`, `hetzner`, `microsoft`, etc.).
5. **Estado de Gestão de Usuários no Código:**
   - Em `src/services/master.functions.ts:548-887`, residem `listAllUsers`, `applyUserSanction`, `revokeUserSanction`, `adminUpdateUserRole`, `listKycVerifications`, `reviewKycVerification`, `getUser360Dossier` e `adminTriggerPasswordReset`.
   - A rota `src/routes/admin-master.usuarios.tsx:5` importa diretamente essas funções de `master.functions.ts`.
   - Não existe ainda o arquivo `src/services/admin-360-governance.functions.ts` nem sua suíte de testes.
6. **Padrão de Testes Unitários Vitest:**
   - Em `src/services/crm.functions.test.ts:9-20`, `workspace-dashboard.functions.test.ts:9-19` e `setup.ts`, `@tanstack/react-start` é mockado para executar `.validator(schema)` com `.safeParse(args.data)` e chamar o handler com `{ data: validated }`.
   - `createFluentBuilder` mocka encadeamentos do Supabase (`select`, `eq`, `order`, `limit`, `single`, `maybeSingle`).

---

## 2. Logic Chain
1. *A partir de (1) e (2):* Para que o futuro `src/services/admin-360-governance.functions.ts` execute operações globais (como trocar senha de qualquer usuário ou transferir lojas) sem falhar por falta de loja selecionada, ele deve usar `getServerClient()` (service-role) e o guarda autônomo `requirePlatformAdmin` observado em `master.functions.ts:12-52`.
2. *A partir de (3):* Para garantir certificação do dossiê 360º compatível com Cloudflare Pages e testes Vitest, deve-se adotar `globalThis.crypto.subtle.digest("SHA-256", ...)`.
3. *A partir de (4):* Os ingestores `recordFormSubmissionAudit`, `recordCartTelemetryEvent` e `recordStaffActionLog` devem utilizar `getRealClientIP` e `captureRequestTelemetry` de `src/lib/network-telemetry.server.ts`.
4. *A partir de (5):* O módulo `admin-360-governance.functions.ts` deve ser criado como fonte única de verdade para as 8 funções demandadas em R2, desacoplando `admin-master.usuarios.tsx` de chamadas genéricas e permitindo que o front-end consuma as 7 abas com dados estruturados.
5. *A partir de (6) e Invariante B.25:* A suíte de testes `admin-360-governance.functions.test.ts` deve mockar `createServerFn`, `getServerIdentity` e `getServerClient`, exercitando explicitamente parâmetros presentes e ausentes para todas as funções tipadas.

---

## 3. Caveats
- No teste unitário, a Web Crypto API (`crypto.subtle`) é nativa no Node 18+ mas requer que o payload seja serializado em `Uint8Array`.
- A transferência de titularidade de lojas (`adminTransferStoreOwnership`) atualiza `workspace_members` e `stores.settings`; a criação da tabela de migration em R1 fornecerá também as tabelas `user_form_submissions_log`, `user_cart_telemetry`, `employee_tenant_audit_logs` e `customer_store_affinity`.

---

## 4. Conclusion
O desenho arquitetural para o Requisito R2 está completamente delineado, documentado e validado contra as invariantes B.1 a B.25 do repositório.
O relatório completo com todas as assinaturas de funções Zod, fluxos de persistência e matriz de testes unitários foi entregue em `.agents/teamwork/explorer_survey_bff/report.md`.

---

## 5. Verification Method
1. Inspecionar o relatório técnico gerado:
   - `view_file` em `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_bff\report.md`.
2. Inspecionar os guardas e funções citadas:
   - `src/services/master.functions.ts` (linhas 12–52 e 827–868).
   - `src/lib/network-telemetry.server.ts` (linhas 79–127).
   - `src/services/crm.functions.test.ts` (linhas 9–20).
3. Testes unitários de exemplo já existentes no repositório podem ser executados com:
   - `npx vitest run src/services/crm.functions.test.ts`
