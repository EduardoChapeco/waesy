# Evidence Ledger — Auditoria Forense End-to-End & Reconciliação Planejado × Executado (`2026-11-15`)

## 1. Preflight & Identificação do Ambiente
- **Repositório:** `EduardoChapeco/waesy`
- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **Base Commit (`HEAD`):** `67125cb3b582a38424fd389741bcabde7ce83555`
- **Projeto Supabase:** `jfuebqmltksyznovhlwa` (625 migrações remotas sincronizadas = 625 migrações locais; última versão: `20270519000000`)
- **Inventário Estrutural:** `506` rotas (`src/routes`), `312` módulos BFF (`src/services/*.functions.ts`), `425` módulos `src/lib`, `1049` componentes (`src/components`), `625` migrações SQL (`supabase/migrations`).

## 2. Verificação Direta no Banco de Produção (`jfuebqmltksyznovhlwa`)
- **Paridade de Migrações (`supabase_migrations.schema_migrations`):** `625` aplicadas (`20270515000000`, `20270516000000`, `20270517000000`, `20270518000000`, `20270519000000` presentes).
- **Cobertura RLS (`pg_class` / `pg_policy`):** `0` tabelas sem RLS (`tables_without_rls = 0`) e `0` tabelas com RLS sem política (`rls_tables_without_policies = 0`).
- **Storage (`storage.buckets`):** Bucket `legal-documents` ativo (`public: false`, `file_size_limit: 20971520`).
- **Isolamento Multi-Tenant (`public.workspace_members`):** Apenas 3 registros ativos, todos pertencentes ao proprietário legítimo `Eduardo Antônio Ramos` (`2ea9f0aa-8b04-4086-9e1d-e23105560302`, `role = 'owner'`, `contract_type = 'clt'`) para os tenants `Foodman` (`32233049-07c6-49bf-a053-989824fef385`), `Waesy` (`5108ce27-2df1-4ce2-89f2-681fea6dba95`) e `Excelência Tour São Miguel do Oeste` (`c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7`).
- **Semente Sintética Expurgada (`public.marketplace_external_orders`):** Registro órfão `id = '6378f58d-759d-4803-af3e-b14917c2d47a'` (`external_order_id = 'TEST-731612'`, `platform = 'mercadolivre'`, `buyer_email = 'cliente.teste@mercadolivre.com'`) removido via SQL e bloqueado por filtro de vertical em `src/routes/workspace.pedidos.expedicao.tsx`.

## 3. Matriz de Findings Fechados nesta Onda
- **F-01 (`SEV-0` — Bloqueio Total de Emissão e Assinatura de Contratos por Gate `assertUserKycVerified` sem Registro em `kyc_verifications`):**
  - *Causa Raiz:* `createContract` (`src/services/contracts.functions.ts:137`) e `signContractEnvelope` (`src/services/contracts.functions.ts:684`) exigiam `assertUserKycVerified(identity.id)` consultando `public.kyc_verifications` (que possui `0` linhas em produção `jfuebqmltksyznovhlwa`), bloqueando 100% dos proprietários/membros de criar contratos e 100% dos usuários autenticados de assinar contratos.
  - *Correção:* Remoção do gate artificial `assertUserKycVerified` em `createContract` (que já valida `requireStaff()` e `store_id`) e em `signContractEnvelope` (que valida token criptográfico, expiração e RPC transacional `finalize_contract_signature`), adicionando enforcement server-side de `require_facial_biometrics`.
  - *Prova:* `src/services/contracts-vault-lifecycle.test.ts`.
- **F-02 (`SEV-1` — Endpoint Inexistente `/api/upload-media` e Falso Positivo de Selfie Biométrica em `/assinar/$token`):**
  - *Causa Raiz:* `uploadSelfie` em `src/routes/assinar.$token.tsx:124-137` fazia `POST /api/upload-media` (rota inexistente) e, nos blocos `else` e `catch`, marcava `setSelfieUploaded(true)` e exibia `toast.success("Selfie capturada com sucesso!")` sem enviar `facialBiometricsHash` ao BFF.
  - *Correção:* Cálculo criptográfico real de SHA-256 (`crypto.subtle.digest("SHA-256", buffer)`) sobre o buffer da captura facial em `src/routes/assinar.$token.tsx`, envio de `facialBiometricsHash` para `signContractEnvelope`, bloqueio de assinatura quando `envelope.require_facial_biometrics` está ativo sem hash válido e erro honesto em caso de falha.
  - *Prova:* `src/services/contracts-vault-lifecycle.test.ts`.
- **F-03 (`SEV-1` — Crash `Invariant failed` em `/workspace/pedidos` e `/workspace/pdv/comandas`):**
  - *Causa Raiz:* `KDSPage` (`src/routes/workspace.pedidos.gestor.tsx`) e `TableReservationsPage` (`src/routes/workspace.reservas.tsx`) invocavam `Route.useLoaderData()` diretamente ao serem renderizados como componentes filhos embutidos fora de suas rotas próprias, além de `KDSPage` sequestrar a viewport com `fixed inset-0 z-50 h-screen`.
  - *Correção:* Separação entre wrappers de rota (`GestorRoutePage`, `ReservationsRoutePage`) e componentes exportados orientados a props (`KDSPage` com `embedded`, `TableReservationsPage`).
  - *Prova:* `src/routes/__tests__/pedidos-invariant-regression.test.tsx` (`3 passed`).
- **F-04 (`SEV-1` — Mascaramento Silencioso de Falhas de Loader em `/workspace/contratos` e `/workspace/configuracoes/equipe`):**
  - *Causa Raiz:* `.catch(() => [])` convertia falhas de BFF/rede em arrays vazios e alimentava `initialData: []` no React Query, impedindo a exibição de `<ErrorState>`.
  - *Correção:* Propagação explícita de `loadError` nos loaders de `src/routes/workspace.contratos.index.tsx` e `src/routes/workspace.configuracoes.equipe.tsx`, renderizando `<ErrorState>` quando `loadError` está presente.
  - *Prova:* `src/services/contracts-vault-lifecycle.test.ts`.
- **F-05 (`SEV-1` — Pedido Sintético `#TEST-731612` Exposto em Workspace de Gastronomia/Delivery):**
  - *Causa Raiz:* Registro de teste `TEST-731612` (`mercadolivre`) persistido em `public.marketplace_external_orders` na loja `Foodman` e ausência de filtro por vertical quando `channelFilter === "all"` em `src/routes/workspace.pedidos.expedicao.tsx`.
  - *Correção:* Deleção do registro sintético `6378f58d-759d-4803-af3e-b14917c2d47a` no banco remoto e filtragem por canais de alimentação (`visibleExternalOrders`) quando `isFoodVertical && channelFilter === "all"`.
  - *Prova:* `src/services/__tests__/food-delivery-and-dispatch.test.ts` + query SQL em `jfuebqmltksyznovhlwa`.
- **F-06 (`SEV-1` — Drift na RPC `close_cash_register` e `<img>` Órfão em `BiolinkProfileSection`):**
  - *Causa Raiz:* Migração `20270519000000_fix_close_cash_register_rpc.sql` presente localmente mas pendente de registro/aplicação no projeto remoto `jfuebqmltksyznovhlwa`; `BiolinkProfileSection` (`src/components/commerce/dynamic-sections/biolink-sections.tsx:27`) renderizava `<img src="">` quando `avatarUrl` estava vazio (`AGENTS.md` B.27/B.30).
  - *Correção:* Aplicação da migração `20270519000000` em `jfuebqmltksyznovhlwa` (`625/625` migrações sincronizadas) e fallback para inicial quando `avatarUrl` está vazio em `BiolinkProfileSection`.
  - *Prova:* `node scripts/audit/validate-migration-inventory.mjs` + `src/components/builder/vitrine-blocks.test.tsx` (`9 passed`, `0` stderr warnings).
- **F-07 (`SEV-1` — Estouro do Orçamento de 25.00 MiB do Worker SSR Cloudflare Pages em `dist/_worker.js`):**
  - *Causa Raiz:* O bundle SSR (`dist/_worker.js/index.js`) atingiu `25.10 MB` (`26,317,721` bytes, `103 KB` acima do limite de `25.00 MB` do Cloudflare Pages) devido à inclusão dos pesos proibidos `duotone`, `light` e `thin` nos `240` mapas de ícones `@phosphor-icons/react` (`410 KB`) e de editores pesados de cliente no grafo SSR.
  - *Correção:* Podados os pesos proibidos (`duotone`, `light`, `thin`) dos mapas de ícones Phosphor no empacotador SSR (`scripts/wrap-worker.js`) e registrados `contract-workspace-studio`, `unified-proposal-workspace`, `proposal-canvas-renderer` e `contract-markdown-renderer` em `SSR_CLIENT_ONLY_COMPONENTS` (`vite.config.ts` e `src/lib/server-client-noop-shim.ts`), reduzindo `dist/_worker.js` para `24.70 MB`.
  - *Prova:* `npm.cmd run check:route-budget` (`PASS`, `< 25.00 MB`).
- **F-08 (`SEV-2` — Shell de 3 Regiões em `/workspace/contratos/$id/editor`, Auto-Assinatura Imediata ao Selar, Neutralidade de Categoria e Persistência de Filtros após `F5`):**
  - *Causa Raiz:* `isContractEditor` em `src/routes/workspace.tsx` removia o `<WorkspaceShell>` (Coluna 1 Rail) em `/workspace/contratos/$id/editor`; `CATEGORY_OPTIONS` exibia `"Turismo e Pacotes"` fora do nicho de turismo; e `workspace.contratos.index.tsx` não persistia `?tab=&folderId=` na URL nem exibia permanentemente a aba `Cancelados`.
  - *Correção:* Removido `isContractEditor` de `isImmersiveEditor` em `src/routes/workspace.tsx` (integrando `/workspace/contratos/$id/editor` ao `<WorkspaceShell>` de 3 regiões); ativada abertura automática do modal de assinatura em 1 clique após `sealAndIssueContract` quando o criador logado é signatário; filtrada `tourism_package` fora de workspaces de turismo em `contract-workspace-studio.tsx`; e sincronizados `?tab=&folderId=` na URL em `workspace.contratos.index.tsx`.
- **F-09 (`SEV-2` — Erradicação de Banners e Badges Explicativos de `RLS` / `Zero-Trust` na Interface do Lojista):**
  - *Causa Raiz:* Textos de arquitetura interna expostos ao usuário final em `src/components/admin/orders/picking-wizard.tsx` (`"protegida via RLS/RPC"`), `src/components/chat/copilot-connectors-center.tsx` (`"Zero-Trust Vault"` / `"AES-256"`) e `src/components/admin/builder/OmniAppMarketModal.tsx` (`"integridade RLS"`).
  - *Correção:* Substituídos por instruções operacionais humanas diretas (`AGENTS.md` B.8).
- **Rollout em Produção Cloudflare Pages (`usewaesy`):**
  - *Deploy:* `npx.cmd wrangler pages deploy dist --project-name usewaesy --branch main --no-bundle` -> `Exit Code 0` (`https://0741e2ce.usewaesy.pages.dev` / `https://waesy.com.br`, `1167` arquivos, `dist/_worker.js = 24.68 MB`).
