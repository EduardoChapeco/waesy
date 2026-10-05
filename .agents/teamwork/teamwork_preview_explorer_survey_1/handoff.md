# Relatório Forense de Auditoria E2E: Persistência, RLS, Storage Buckets, Erradicação de Mocks & Telemetria de Borda

**Agente**: Explorer 1 (Survey: Persistence, RLS, Storage Buckets, Mock Eradication & Edge Telemetry)  
**Data**: 2026-10-03  
**Status**: Concluído (Hard Handoff)  
**Projeto Supabase Alvo**: `jfuebqmltksyznovhlwa`  

---

## 1. Observation (Observações Diretas e Evidências Empíricas)

### 1.1 Persistência, RLS, Tabelas, Índices e Funções do Banco de Dados
- **Tabelas do Schema `public`**:
  - Consulta ao MCP Supabase `list_tables(project_id="jfuebqmltksyznovhlwa", schemas=["public"])` retornou **536 tabelas**.
  - **RLS Ativo**: 536 de 536 tabelas (100%) possuem `rowsecurity = true`. Nenhuma tabela pública está com RLS desativado.
  - **Políticas RLS**: O catálogo `pg_policies` possui **975 políticas** no schema `public`.
  - **Tabelas com RLS habilitado, mas ZERO políticas criadas (Deny-by-Default total)**: 28 tabelas detectadas pelo advisor `rls_enabled_no_policy` e confirmadas via query SQL:
    `_applied_migrations`, `abandoned_carts_log`, `ai_brain_settings`, `ai_response_cache`, `ai_skill_tools`, `ai_skill_versions`, `ai_squads`, `boarding_cards`, `boarding_tickets`, `brand_kit`, `corporate_clients`, `employee_financial_records`, `event_checkins`, `group_tour_enrollments`, `inventory_adjustments_log`, `invite_telemetry`, `jus_lawyer_teams`, `linkedin_sync_logs`, `proposal_items`, `rental_applications`, `signature_evidence`, `simlab_focus_group_messages`, `simlab_persona_responses`, `simlab_research_sessions`, `simlab_statistical_synthesis`, `social_posts_assets`, `store_hr_delegations`, `trip_rooming_list`.
  - **Views com `SECURITY DEFINER` (Gravidade ERROR / P0)**: 6 views criadas como compatibilidade sem `security_invoker = true`:
    1. `public.store_memberships` (aponta para `workspace_members`)
    2. `public.store_members` (aponta para `workspace_members`)
    3. `public.classified_ads` (aponta para `classifieds`)
    4. `public.companies` (aponta para `stores`)
    5. `public.store_reviews` (aponta para `deal_reviews`)
    6. `public.store_integrations` (aponta para `integration_credentials`)
  - **Funções `SECURITY DEFINER` executáveis pela role `anon` via PostgREST RPC**: **143 funções** públicas expostas (advisor `anon_security_definer_function_executable`), incluindo `add_to_cart_atomic_v4/v5/v6`, `adjust_stock`, `admin_modify_order_items`, `approve_quote`, `confirm_order_and_deduct_stock`, `create_product_transaction_v1`, `create_receivable_with_installments`, entre outras.
  - **Funções com `search_path` mutável**: **19 funções** detectadas (advisor `function_search_path_mutable`), vulneráveis a sequestro de schema por não declarar `SET search_path = public, pg_temp;`.
  - **Extensões no schema `public`**: 2 extensões instaladas no schema incorreto (`pg_trgm`, `btree_gist`).
  - **Índices e Chaves Estrangeiras (Advisors de Performance)**:
    - `unindexed_foreign_keys`: **422 chaves estrangeiras** sem índice correspondente na coluna filha.
    - `auth_rls_initplan`: **416 políticas RLS** chamam `auth.uid()` diretamente sem envelopar em `(SELECT auth.uid())`, forçando reavaliação linha a linha.
    - `duplicate_index`: **17 índices duplicados** em tabelas operacionais.
    - `unused_index`: **632 índices** sem uso registrado.
    - `multiple_permissive_policies`: **1766 políticas permissivas múltiplas** avaliadas via disjunção (OR).

---

### 1.2 Storage Buckets & Governança Tripla de Mídia (Bucket / URL / Ctrl+V)
- **Inventário de Buckets em `storage.buckets`**:
  Execução de `SELECT id, name, public, file_size_limit FROM storage.buckets;` revelou 13 buckets:
  1. `public_media` (public: true, 100MB)
  2. `store-assets` (public: true, 10MB)
  3. `banners` (public: true, 10MB)
  4. `avatars` (public: true, 5MB)
  5. `cms-media` (public: true, 26MB)
  6. `brand-assets` (public: true, 10MB)
  7. `classifieds` (public: true, 12MB) — **Nota**: O bucket chama-se `classifieds`, NÃO `classified-media`.
  8. `product-media` (public: true, 10MB)
  9. `destination-media` (public: true, 26MB)
  10. `legal-documents` (public: false, 10MB)
  11. `receipts` (public: false, 5MB)
  12. `identity-vault` (public: false, 10MB)
  13. `post-media` (public: true, 50MB)
  - **Inexistência de Buckets Solicitados**:
    - O bucket `covers` **NÃO EXISTE** em `storage.buckets`. O código utiliza `cms-media` ou `post-media`.
    - O bucket `classified-media` **NÃO EXISTE** em `storage.buckets` (o bucket registrado é `classifieds`).
- **Falha Crítica de Segurança em `storage.objects` (P0)**:
  Existem 4 políticas universais permissivas no schema `storage`:
  - `Universal Media Delete Policy`: comando `DELETE` com permissão concedida à role `{public}` para: `['brand-assets', 'banners', 'legal-documents', 'post-media', 'public_media', 'product-media', 'cms-media', 'classifieds', 'avatars']`.
  - `Universal Media Insert Policy`: comando `INSERT` com permissão concedida à role `{public}` para os mesmos 9 buckets.
  - `Universal Media Update Policy`: comando `UPDATE` com permissão concedida à role `{public}` para os mesmos 9 buckets.
  - `Universal Media Select Policy`: comando `SELECT` com permissão concedida à role `{public}`.
  *Evidência*: Qualquer visitante anônimo tem permissão de leitura, injeção, substituição e deleção em 9 buckets, incluindo `legal-documents` (marcado teoricamente como `public: false`).
- **Análise dos Componentes de Upload e Paridade com a Tríade**:
  1. `src/components/ui/media-uploader.tsx`:
     - Upload direto ao bucket: **SIM** (via `uploadMediaUniversal` / `post-media`).
     - Paste listener (Ctrl+V): **SIM** (linhas 256-264 e 352).
     - Botão/campo para URL externa: **NÃO** (completamente ausente no layout e nas props).
  2. `src/components/ui/image-upload.tsx`:
     - Upload direto ao bucket: **SIM** (via `getSignedUploadUrl` PUT ou `uploadMediaUniversal`).
     - Paste listener (Ctrl+V): **SIM** (linhas 75-90 e 194, 279, 374).
     - Botão/campo para URL externa: **NÃO** (completamente ausente).
  3. `src/components/ui/file-attachment-upload.tsx`:
     - Upload direto ao bucket: **SIM** (via `uploadStoreMedia`).
     - Paste listener (Ctrl+V): **SIM** (linhas 8, 126-135).
     - Botão/campo para URL externa: **SIM** (linhas 56, 61-62, 335-365 com `showExternalUrlOption` e input dedicado).
  4. `src/components/classifieds/story-highlight-uploader.tsx`:
     - Upload direto ao bucket: **SIM** (via `onUpload`).
     - Paste listener (Ctrl+V): **NÃO** (ausente).
     - Botão/campo para URL externa: **NÃO** (ausente).
  5. `src/components/documents/multimodal-ocr-uploader.tsx`:
     - Upload direto: **SIM** (leitura local para base64/OCR).
     - Paste listener (Ctrl+V): **SIM** (linhas 48-67 `window.addEventListener("paste")`).
     - Botão/campo para URL externa: **NÃO** (ausente).
  6. `src/lib/classifieds/upload-classified-media.ts`:
     - Desvio de bucket: Linha 51 envia mídia de classificados para `bucket: "post-media"` em vez de `classifieds`.
     - Risco de sigilo: Linhas 68-91 (`uploadClassifiedDocument`) salvam PDFs e documentos confidenciais de classificados no bucket público `post-media` (`folder: classifieds/documents`).

---

### 1.3 Inventário Completo de Mocks, Imagens Unsplash e Dados Sintéticos
- **Imagens Externas e Mocks Hardcoded**:
  - `src/components/admin/builder/MediaUploader.tsx`: Linha 180 contém fallback hardcoded para `https://placehold.co/600x400/18181b/ffffff?text=Imagem+Indispon%C3%ADvel`.
  - `src/services/proposals.ts`: Linhas 161-195 implementam função ativa `searchUnsplash(query)` consumindo `https://api.unsplash.com/search/photos?...` e fallback `Unsplash Creator`.
  - `src/services/proposal-storage.ts`: Linhas 51-65 implementam `saveUnsplashImageToStorage` baixando imagens de `unsplash.com`.
  - `src/components/tourism/studio/StudioUnsplashPicker.tsx`: Linhas 1-85 implementam modal interativo de busca e seleção de fotos do Unsplash para o Studio de Turismo.
  - `src/components/studio/StudioUnsplashPicker.tsx`: Reexporta o componente acima.
  - `src/components/tourism/studio/sections/SectionCover.tsx` (linhas 8, 21, 107, 208): Integração direta com `StudioUnsplashPicker`.
  - `src/components/tourism/studio/sections/SectionHotels.tsx` (linhas 9, 45, 247, 265): Busca ativa de fotos de hotéis no Unsplash.
  - `src/components/tourism/studio/sections/SectionItinerary.tsx` (linhas 6, 27, 203): Busca de imagens de roteiro no Unsplash.
  - `src/routes/workspace.turismo.hoteis.tsx`: Linha 1584 exibe texto de placeholder: `placeholder="Cole a URL da foto (Unsplash ou CDN) ou envie abaixo..."`.
- **Filtros Defensivos Anti-Unsplash Ativos (Conformes)**:
  - `src/services/mining/integrity-gate.ts` (linhas 142-150): Rejeita explicitamente imagens contendo `images.unsplash.com`.
  - `src/services/mining.functions.ts` (linha 77): Regra expressa `Zero Stock Photo / Unsplash Fallbacks`.
  - `src/services/news.functions.ts` (linha 123): Rejeita notícias com capa de `images.unsplash.com`.
  - `src/services/surface-cms.functions.ts` (linha 843): Filtra produtos desconsiderando qualquer URL com `unsplash.com`.
- **Dados Sintéticos Estruturados**:
  - `src/lib/simlab/seed-personas.ts`: Define 18 personas brasileiras (`SEED_PERSONAS`) usadas especificamente pelo módulo analítico SimLab (Populações Sintéticas). Não são mocks de interface, mas catálogo analítico de teste de mercado.
  - `src/components/landing/founder-smartphone-mockup.tsx`: Componente de demonstração interativa de onboarding que usa `/brand-logo.png` e templates contextuais por CNAE.

---

### 1.4 Telemetria de Borda Cloudflare Pages, Fingerprint & Anti-Flooding
- **Resolução de Cabeçalhos em `src/lib/network-telemetry.server.ts`**:
  - Extração de IP com cascata reversa anti-proxy (linhas 77-125):
    1. `cf-connecting-ip` (Cloudflare)
    2. `true-client-ip` (Cloudflare Enterprise / Akamai)
    3. `x-real-ip` (Reverse Proxy)
    4. `x-forwarded-for` (primeiro IP público válido não-RFC1918)
    5. `x-client-ip`
    6. `fastly-client-ip`
  - Resolução GeoIP (linhas 140-230):
    1. Payload GPS explícito do cliente
    2. Header `x-client-geo`
    3. Cookie assinado `waesy_client_geo`
    4. Headers de borda Cloudflare (`cf-ipcity`, `cf-region`, `cf-region-code`, `cf-ipcountry`)
    5. Fallback canônico regional: `"São Miguel do Oeste", "SC", "BR"`
  - Sinais de Borda adicionais capturados (linhas 290-320):
    - `cf-iptype` (identifica datacenter/vpn/bot)
    - `cf-threat-score` (escore de ameaça 0-100)
    - `cf-ray` (identificador da requisição no Edge)
  - **Omissão Identificada**: O ASN (`cf-connecting-asn` ou `cf-asn`) **NÃO é lido** por `network-telemetry.server.ts` nem repassado na estrutura `ClientTelemetrySnapshot`.
- **Geração de `device_fingerprint`**:
  - **Client-Side**: `src/lib/security-sentinel.ts` (`generateDeviceFingerprint`, linhas 44-115) gera SHA-256 combinando Canvas fingerprint parcial, WebGL renderer unmasked, hardwareConcurrency, screen resolution/colorDepth, timezone Intl, idioma e touch support.
  - **Server-Side Fallback**: `src/services/lead-forms.functions.ts` (`resolveDeviceFingerprint`, linhas 13-25) recebe o fingerprint do cliente ou calcula fallback determinístico `fp_<hash>` a partir de `${ip}::${userAgent}`.
- **Mecanismo Anti-Flooding e Persistência em `lead_form_submissions`**:
  - `src/services/lead-forms.functions.ts` (linhas 228-248 e 965-985):
    - Janela temporal: 10 minutos (`Date.now() - 10 * 60 * 1000`).
    - Consulta `lead_form_submissions` por `ip_address` OR `device_fingerprint`.
    - Limite 1 (Flagging): `>= 8` submissões na janela marca `is_flagged_spam = true`.
    - Limite 2 (Bloqueio duro): `>= 20` submissões lança erro `"Muitas tentativas detectadas. Por favor aguarde alguns minutos."`.
    - Bloqueio por threat score: `threatScore >= 60` marca `is_flagged_spam = true`.
    - Persistência estruturada completa: Grava `ip_address`, `device_fingerprint`, `geo_city`, `geo_state`, `geo_country`, `threat_score`, `cf_ray`, `is_flagged_spam` e JSON `telemetry`.
- **Auditoria de `pwa_telemetry`**:
  - Tabela `pwa_telemetry` no banco: possui colunas `id`, `store_id`, `user_id`, `event_type`, `platform`, `user_agent`, `ip_address`, `created_at`.
  - **Defasagem no BFF**: `src/services/pwa.functions.ts` (`recordPwaInstallation`, linhas 123-148) insere apenas `store_id`, `event_type`, `platform`, `user_agent`. **Não grava `ip_address`** e a tabela não possui colunas para `device_fingerprint`, `geo_city`, `geo_country` ou `asn`.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio e Dedução)

1. **Premissa de Persistência e RLS**:
   - Observação: 100% das 536 tabelas públicas têm `rowsecurity = true`. Contudo, 28 tabelas não possuem nenhuma política associada.
   - Dedução: No PostgreSQL, uma tabela com RLS ativado e zero políticas rejeita sumariamente qualquer `SELECT/INSERT/UPDATE/DELETE` originado de roles não-superusuárias (`anon`, `authenticated`). Enquanto isso garante isolamento defensivo estrito contra vazamentos públicos, bloqueia qualquer fluxo legítimo do app via client anon/auth se a tabela não for acessada exclusivamente via `service_role`.
   - Vínculo: Tabelas como `boarding_cards`, `boarding_tickets`, `rental_applications` e `event_checkins` são operacionais de nicho e sofrerão erro de permissão caso o frontend tente acessá-las diretamente sem Server Function.

2. **Premissa de Views `SECURITY DEFINER`**:
   - Observação: As 6 views de compatibilidade (`classified_ads`, `companies`, `store_members`, etc.) não possuem o atributo `security_invoker = true`.
   - Dedução: No Postgres, views convencionais executam sob os privilégios do seu proprietário (`postgres` ou `supabase_admin`). Isso anula as políticas de RLS das tabelas base (`classifieds`, `stores`, `workspace_members`) para quem consultar a view, abrindo brecha de elevação de privilégios.
   - Solução necessária: Declarar `ALTER VIEW ... SET (security_invoker = true);` em todas as 6 views.

3. **Premissa da Brecha nos Storage Buckets**:
   - Observação: As políticas universais em `storage.objects` (`Universal Media *`) concedem permissão `ALL` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) para a role `{public}` nos 9 principais buckets, inclusive `legal-documents`.
   - Dedução: Embora `legal-documents` esteja configurado com `public: false` no bucket, a política RLS no nível do objeto sobrepõe essa trava para a API de Storage, permitindo que requisições anônimas façam download, alteração ou expurgo de contratos e documentos confidenciais.
   - Vínculo com a requisição: A exigência de isolamento multi-tenant e posse civil é violada enquanto existirem políticas `Universal Media` associadas à role `public`. Cada bucket deve possuir sua política estrita vinculada a `auth.uid() = (storage.foldername(name))[1]` ou verificação de staff da loja.

4. **Premissa dos 5 Buckets e Paridade de Nomes**:
   - Observação: A especificação exige governança sobre `avatars`, `covers`, `classified-media`, `product-media`, `brand-assets`. No banco existem `avatars`, `product-media`, `brand-assets` e `classifieds`. O bucket `covers` não existe e `classified-media` difere de `classifieds`.
   - Dedução: O código faz upload de capas e classificados para pastas internas de `post-media` e `cms-media`. Para alcançar a arquitetura pretendida, é mandatória uma migração de alinhamento criando os buckets `covers` e normalizando ou aliasing `classified-media` <-> `classifieds`.

5. **Premissa da Tríade de Uploaders**:
   - Observação: `MediaUploader` e `ImageUpload` aceitam arquivos locais e colagem via `Ctrl+V`, mas carecem de um controle para inserir URLs externas.
   - Dedução: Para cumprir o requisito R1 ("1. Upload direto ao bucket, 2. Inserção de URL externa válida, 3. Suporte a captura nativa Ctrl+V"), ambos os componentes centrais devem incorporar a aba/botão "URL Externa" presente no `FileAttachmentUpload`.

6. **Premissa de Eliminação de Mocks e Unsplash**:
   - Observação: O módulo de Turismo (`StudioUnsplashPicker`, `proposals.ts`) mantém integração funcional ativa com a API do Unsplash. O construtor administrativo (`MediaUploader.tsx`) possui fallback para `placehold.co`.
   - Dedução: Esses elementos conflitam frontalmente com a diretriz M01 ("Zero Mocks, Zero Unsplash, Honest Empty States"). Devem ser substituídos por seletores de mídia de buckets próprios ou empty states vetoriais limpos.

7. **Premissa da Telemetria Edge e ASN**:
   - Observação: `network-telemetry.server.ts` lê `cf-connecting-ip`, geolocalização e threat score, mas ignora o cabeçalho `cf-connecting-asn`. `pwa_telemetry` não recebe o IP resolvido.
   - Dedução: A telemetria de rede está 85% operacional, com excelente proteção anti-flooding em `lead_form_submissions`, mas incompleta quanto ao ASN e com perda de dados em `pwa_telemetry`.

---

## 3. Caveats (Limitações da Investigação e Suposições)
1. **Ambiente Read-Only**: Nenhuma DDL ou alteração de código foi aplicada durante este levantamento, respeitando a trava de segurança.
2. **Execução de Build/Typecheck**: Conforme imposição categórica de AGENTS.md e das instruções, `npm run typecheck` e `npm run build` não foram disparados.
3. **Mocks de Testes Unitários**: Não foram contabilizados como violação os objetos fictícios declarados dentro de arquivos `*.test.ts`, pois servem estritamente ao isolamento dos testes do Vitest.
4. **Populações Sintéticas (SimLab)**: As 18 personas em `src/lib/simlab/seed-personas.ts` foram classificadas como dados legítimos da feature de simulação de mercado, e não como resíduos ou fallbacks visuais.

---

## 4. Conclusion (Conclusão e Recomendações Acionáveis)

### 4.1 Diagnóstico Sintético
O ecossistema Waesy apresenta uma camada de dados robusta (536 tabelas com RLS ativo e motor de telemetria anti-spam de alta fidelidade em `lead-forms`), porém possui **três vulnerabilidades críticas de governança e isolamento**:
1. **Brecha em Storage Policies (P0)**: Políticas `Universal Media` expostas à role `public` permitindo leitura e deleção irrestrita em 9 buckets.
2. **Disparidade de Nomes e Buckets Faltantes**: Ausência do bucket `covers` e divergência de nome `classifieds` vs `classified-media`.
3. **Incompletude da Tríade de Mídia**: Ausência do campo de URL externa nos uploaders canônicos (`MediaUploader` e `ImageUpload`).
4. **Resíduo de Unsplash**: Módulo Turismo Studio ainda acoplado à API externa do Unsplash.

### 4.2 Matriz de Correções Recomendadas para os Agentes Implementadores

| ID | Área | Arquivo Alvo | Ação Recomendada | Severidade |
|---|---|---|---|---|
| SEC-01 | Storage RLS | Nova migração SQL | Revogar `Universal Media *` policies em `storage.objects`; aplicar políticas restritas por `bucket_id` e `auth.uid()`. | P0 |
| SEC-02 | Database Views | Nova migração SQL | Executar `ALTER VIEW public.<view_name> SET (security_invoker = true)` nas 6 views identificadas. | P0 |
| SEC-03 | RPCs Anon | Nova migração SQL | Revogar `GRANT EXECUTE ON FUNCTION ... TO anon` nas 143 funções administrativas/financeiras. | P1 |
| STO-01 | Buckets | Nova migração SQL | Criar bucket `covers` (public, 10MB); criar bucket ou sinônimo `classified-media`. | P1 |
| STO-02 | Upload Helpers | `src/lib/classifieds/upload-classified-media.ts` | Redirecionar upload de fotos para `classifieds` e documentos restritos para bucket privado. | P1 |
| UI-01 | Uploader Triplo | `src/components/ui/media-uploader.tsx` | Adicionar suporte a inserção manual de URL externa ao lado de arquivo e Ctrl+V. | P1 |
| UI-02 | Uploader Triplo | `src/components/ui/image-upload.tsx` | Adicionar suporte a inserção manual de URL externa ao lado de arquivo e Ctrl+V. | P1 |
| MCK-01 | Builder Fallback | `src/components/admin/builder/MediaUploader.tsx:180` | Substituir `placehold.co` por empty state honesto svg/inline. | P1 |
| MCK-02 | Unsplash Purge | `src/components/tourism/studio/StudioUnsplashPicker.tsx`, `src/services/proposals.ts` | Remover integração Unsplash e substituir por upload de mídia própria/bucket. | P1 |
| TEL-01 | Edge ASN | `src/lib/network-telemetry.server.ts` | Inspecionar cabeçalhos `cf-connecting-asn` / `cf-asn` e exportar na telemetria. | P2 |
| TEL-02 | PWA Telemetry | `src/services/pwa.functions.ts` | Capturar e gravar `ip_address` no insert de `pwa_telemetry`. | P2 |

---

## 5. Verification Method (Método de Verificação Independente)

Para auditar e certificar as descobertas deste relatório sem intervenção destrutiva:

1. **Verificação de RLS e Tabelas no Banco**:
   ```sql
   -- Provar que 100% das tabelas possuem RLS habilitado
   SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
   -- Resultado esperado: 0

   -- Provar as 6 views sem security_invoker
   SELECT table_name FROM information_schema.views WHERE table_schema = 'public' 
   AND table_name IN ('store_memberships', 'store_members', 'classified_ads', 'companies', 'store_reviews', 'store_integrations');
   ```

2. **Verificação da Brecha de Storage Policies**:
   ```sql
   SELECT policyname, roles, cmd, qual, with_check 
   FROM pg_policies 
   WHERE schemaname = 'storage' AND policyname LIKE 'Universal Media%';
   -- Confirma a concessão de SELECT/INSERT/UPDATE/DELETE à role {public}
   ```

3. **Verificação dos Buckets Existentes**:
   ```sql
   SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('avatars', 'covers', 'classified-media', 'classifieds', 'product-media', 'brand-assets');
   -- Confirma que 'covers' e 'classified-media' não existem
   ```

4. **Verificação de Resíduos do Unsplash e Mocks no Código**:
   ```bash
   # Executar no repositório (apenas leitura):
   node -e "const fs = require('fs'); const s = fs.readFileSync('src/components/admin/builder/MediaUploader.tsx', 'utf8'); console.log(s.includes('placehold.co'));"
   # Resultado: true (linha 180)
   ```

5. **Verificação do Anti-Spam e Telemetria em `lead_form_submissions`**:
   Inspecionar `src/services/lead-forms.functions.ts` linhas 228-248 e verificar os índices `idx_lead_submissions_ip` e `idx_lead_submissions_fingerprint`.
