# Relatório de Investigação & Especificação Técnica: Storage RLS Lockdown, Views Security Invoker & Bucket Normalization

**Agente**: Explorer M1_1 (Storage RLS & Views Security)  
**Data**: 2026-10-03  
**Status**: Concluído (Hard Handoff)  
**Diretório de Trabalho**: `.agents/teamwork/teamwork_preview_explorer_m1_1`  
**Parent Orchestrator**: `c9b7f840-de13-40ec-9aef-bf41b37256c2`  

---

## 1. Observation (Observações Diretas e Evidências Empíricas)

### 1.1 Brecha Crítica em `storage.objects` (Políticas Universais Permissivas)
- **Consulta Realizada**: `SELECT policyname, tablename, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage';` no banco `jfuebqmltksyznovhlwa`.
- **Resultado Constatado**:
  Quatro políticas denominadas `Universal Media *` outorgam privilégios irrestritos à role `{public}`:
  1. `Universal Media Select Policy`: `cmd = SELECT`, `roles = {public}`, `qual = (bucket_id = ANY (ARRAY['brand-assets'::text, 'banners'::text, 'legal-documents'::text, 'post-media'::text, 'public_media'::text, 'product-media'::text, 'cms-media'::text, 'classifieds'::text, 'avatars'::text]))`
  2. `Universal Media Insert Policy`: `cmd = INSERT`, `roles = {public}`, `with_check = (bucket_id = ANY (ARRAY['brand-assets'::text, 'banners'::text, 'legal-documents'::text, 'post-media'::text, 'public_media'::text, 'product-media'::text, 'cms-media'::text, 'classifieds'::text, 'avatars'::text]))`
  3. `Universal Media Update Policy`: `cmd = UPDATE`, `roles = {public}`, `qual = (bucket_id = ANY (ARRAY['brand-assets'::text, 'banners'::text, 'legal-documents'::text, 'post-media'::text, 'public_media'::text, 'product-media'::text, 'cms-media'::text, 'classifieds'::text, 'avatars'::text]))`
  4. `Universal Media Delete Policy`: `cmd = DELETE`, `roles = {public}`, `qual = (bucket_id = ANY (ARRAY['brand-assets'::text, 'banners'::text, 'legal-documents'::text, 'post-media'::text, 'public_media'::text, 'product-media'::text, 'cms-media'::text, 'classifieds'::text, 'avatars'::text]))`
- **Origem no Código**: `supabase/migrations/20260822000000_platform_brand_assets_and_root_store.sql` (linhas 73-136) criou essas 4 políticas sem cláusula `TO authenticated` e incluindo indevidamente `'legal-documents'`.
- **Falhas Adicionais em Políticas Legadas**:
  - `Users can read own receipts`: possui disjunção permissiva `OR (auth.uid() IS NOT NULL)`, permitindo que **qualquer** usuário logado leia os recibos fiscais de **qualquer** outro usuário ou loja.
  - `Users can upload own receipts`: possui a mesma cláusula `OR (auth.uid() IS NOT NULL)`.
  - Duplicatas em `product-media`: `Leitura pública de mídia de produtos` e `Public can view product media`.

### 1.2 Auditoria das Views em `public` (Bypass de RLS por Falta de `security_invoker`)
- **Consulta Realizada**:
  ```sql
  SELECT table_name, reloptions 
  FROM information_schema.views v
  JOIN pg_class c ON c.relname = v.table_name AND c.relnamespace = 'public'::regnamespace
  WHERE v.table_schema = 'public';
  ```
- **Resultado Constatado**:
  Existem 15 views no schema `public`. Exatamente **6 views** possuem `reloptions = null` (executam sob privilégios do proprietário da view, ignorando as políticas RLS das tabelas base):
  1. `public.store_memberships` (base: `workspace_members`)
  2. `public.store_members` (base: `workspace_members`)
  3. `public.classified_ads` (base: `classifieds`)
  4. `public.companies` (base: `stores`)
  5. `public.store_reviews` (base: `deal_reviews`)
  6. `public.store_integrations` (base: `integration_credentials`)
  As outras 9 views (`produtos_evento`, `v_verified_marketplace_stores`, `indexed_businesses`, `indexed_jobs`, `indexed_events`, `indexed_products`, `vw_catalog_option_groups`, `eventos_tarefas_view`, `unified_listings_view`) já possuem `reloptions = ['security_invoker=true']`.
- **Risco Imediato**: Consultas a `store_integrations` ou `store_members` a partir do cliente bypassam o isolamento multi-tenant de `integration_credentials` e `workspace_members`.

### 1.3 Inventário de Storage Buckets e Ausência de `covers`
- **Consulta Realizada**: `SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id;`
- **Resultado Constatado**: 13 buckets cadastrados:
  - Públicos: `avatars` (5MB), `banners` (10MB), `brand-assets` (10MB), `classifieds` (12MB), `cms-media` (26MB), `destination-media` (26MB), `post-media` (50MB), `product-media` (10MB), `public_media` (100MB), `store-assets` (10MB).
  - Privados: `identity-vault` (10MB), `legal-documents` (10MB), `receipts` (5MB).
  - **Inexistentes**:
    - O bucket `covers` **não existe** em `storage.buckets`.
    - O bucket `classified-media` **não existe** em `storage.buckets` (o bucket registrado chama-se `classifieds`).

### 1.4 Vazamento de Sigilo em `src/lib/classifieds/upload-classified-media.ts`
- **Inspeção do Código**:
  - Linha 51 (`uploadClassifiedMedia`): Envia fotos para `bucket: "post-media"` com pasta `classifieds/${folder}` em vez de utilizar o bucket canônico `classifieds`.
  - Linha 89 (`uploadClassifiedDocument`): Envia documentos confidenciais de transações de classificados (DREs, balanços, contratos com termo de sigilo conforme `_store.conta.classificados.novo.tsx:6940`) para o bucket público `post-media` (`folder: classifieds/${folder}`) e expõe a `publicUrl`.
- **Inspeção de `src/services/storage.functions.ts`**:
  - Linhas 43-60: Validador Zod `bucket: z.enum([...])` em `getSignedUploadUrl` não inclui `"covers"` nem `"classified-media"`.
  - Linha 541: `uploadProfileMediaDirect` hardcoda `bucket = "post-media"` mesmo quando o alvo é `target === "avatar"` ou `target === "cover"`.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio)

1. **Da Brecha de RLS à Exposição Global**:
   - As 4 políticas `Universal Media *` utilizam `FOR ALL / SELECT / INSERT / UPDATE / DELETE` associadas à role `public`.
   - Como `legal-documents` está no array da política, a flag `public = false` no bucket é ineficaz: qualquer requisição HTTP não autenticada enviada ao endpoint `/storage/v1/object/legal-documents/...` é autorizada pelo Postgres, permitindo exfiltração, exclusão arbitrária e adulteração de documentos contratuais.
   - Revogar essas 4 políticas e as políticas legadas defeituosas é condição sine qua non para restabelecer a postura *Deny-by-Default*.

2. **Da Ausência de `security_invoker` à Quebra de Isolamento Multi-Tenant**:
   - Views sem `security_invoker = true` rodam como o criador da view (`postgres`/`supabase_admin`).
   - Embora `integration_credentials` possua política RLS exigindo `has_workspace_role(store_id, ARRAY['owner', 'admin'])`, uma consulta direta a `public.store_integrations` ignora a política e retorna segredos de API de todas as empresas cadastradas.
   - Declarar `ALTER VIEW ... SET (security_invoker = true);` nas 6 views fecha o vetor de bypass sem quebrar queries legítimas de membros autorizados.

3. **Da Normalização de Buckets ao Fim de Erros em Runtime**:
   - `covers` é exigido formalmente pela especificação canônica (`marca/05-buckets.md` e `ORIGINAL_REQUEST.md` R1), mas sua ausência provocava fallback forçado para `cms-media` ou `post-media`.
   - `classified-media` é referenciado em documentações e especificações, enquanto o banco possui `classifieds`. Criar o bucket `covers` e cadastrar `classified-media` (como espelho de `classifieds`) garante conformidade total e tolerância a falhas.
   - Adicionar `"covers"` e `"classified-media"` ao enum Zod em `storage.functions.ts` previne rejeições de validação no BFF.

4. **Do Roteamento de Mídia Classificada ao Isolamento de Sigilo**:
   - Fotos de anúncios de classificados pertencem semanticamente ao bucket `classifieds` (público, 12MB).
   - Documentos de due diligence de compra e venda de empresas (DRE, balanços, inventário) pertencem ao bucket `legal-documents` (privado, 10MB) com acesso protegido por autenticação e assinatura de sigilo.
   - A alteração em `src/lib/classifieds/upload-classified-media.ts` resolve o desvio para `post-media` e isola os documentos confidenciais.

---

## 3. Caveats (Limitações da Investigação e Suposições)

1. **Modo Read-Only Respeitado**: Nenhuma alteração foi gravada nos arquivos de código ou aplicada no banco durante a exploração. Todas as recomendações abaixo estão prontas para execução imediata pelos agentes implementadores.
2. **Proibição Absoluta de Build/Typecheck**: Conforme mandato rigoroso, `npm run typecheck` e `npm run build` não foram disparados.
3. **Compatibilidade com `service_role`**: As Server Functions que utilizam `getServerClient()` (chave `service_role`) possuem o atributo PostgreSQL `BYPASSRLS`. A revogação e o endurecimento das políticas afetam estritamente requisições client-side (`anon` e `authenticated`), garantindo que rotas administrativas do servidor continuem operando perfeitamente.
4. **Downloads de Arquivos em Buckets Privados**: Clientes que necessitam fazer download de arquivos em `legal-documents` ou `receipts` devem solicitar URLs assinadas temporárias (`supabase.storage.from('legal-documents').createSignedUrl(path, 3600)`) via Server Function autenticada, nunca via URL estática pública.

---

## 4. Conclusion & Concrete Implementation Specifications

### 4.1 Especificação da Migração SQL Canônica
Criar o arquivo `supabase/migrations/20261231000000_storage_rls_lockdown_views_security_invoker.sql` contendo rigorosamente o script abaixo:

```sql
-- ==============================================================================
-- Migration: 20261231000000_storage_rls_lockdown_views_security_invoker.sql
-- Description:
--   1. Hardening das 6 views SECURITY DEFINER com (security_invoker = true).
--   2. Criação do bucket 'covers' e alinhamento de 'classified-media'.
--   3. Revogação de 'Universal Media *' e políticas legadas em storage.objects.
--   4. Implementação de RLS estrito: leitura pública em buckets de mídia,
--      escrita autenticada e isolamento absoluto de buckets privados.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- FASE 1: HARDENING DAS 6 VIEWS COM (security_invoker = true)
-- ------------------------------------------------------------------------------
ALTER VIEW public.store_memberships SET (security_invoker = true);
ALTER VIEW public.store_members SET (security_invoker = true);
ALTER VIEW public.classified_ads SET (security_invoker = true);
ALTER VIEW public.companies SET (security_invoker = true);
ALTER VIEW public.store_reviews SET (security_invoker = true);
ALTER VIEW public.store_integrations SET (security_invoker = true);

-- ------------------------------------------------------------------------------
-- FASE 2: CRIAÇÃO E ALINHAMENTO DE BUCKETS DE STORAGE
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'classified-media',
  'classified-media',
  true,
  12582912, -- 12 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 12582912,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[];

-- Garantir flags de privacidade e limites em buckets sigilosos
UPDATE storage.buckets
SET public = false, file_size_limit = 10485760
WHERE id = 'legal-documents';

UPDATE storage.buckets
SET public = false, file_size_limit = 5242880
WHERE id = 'receipts';

UPDATE storage.buckets
SET public = false, file_size_limit = 10485760
WHERE id = 'identity-vault';

-- ------------------------------------------------------------------------------
-- FASE 3: EXPURGO DAS POLÍTICAS "Universal Media *" E POLÍTICAS DEFEITUOSAS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Universal Media Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "Universal Media Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "Universal Media Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "Universal Media Delete Policy" ON storage.objects;

-- Revogar políticas redundantes ou com vazamento (OR auth.uid() IS NOT NULL)
DROP POLICY IF EXISTS "Public can view product media" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de mídia de produtos" ON storage.objects;
DROP POLICY IF EXISTS "cms_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Customers can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Customers can upload receipts" ON storage.objects;

-- ------------------------------------------------------------------------------
-- FASE 4: POLÍTICAS DE STORAGE RLS CANÔNICAS (PÚBLICAS & AUTENTICADAS)
-- ------------------------------------------------------------------------------

-- 4.1 LEITURA PÚBLICA (Apenas buckets estáticos abertos)
CREATE POLICY "media_public_read"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

-- 4.2 UPLOAD DE MÍDIA PÚBLICA (Exclusivo para usuários autenticados)
CREATE POLICY "media_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

-- 4.3 ATUALIZAÇÃO DE MÍDIA PÚBLICA (Apenas proprietário, membros do workspace ou admin)
CREATE POLICY "media_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
)
WITH CHECK (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

-- 4.4 EXCLUSÃO DE MÍDIA PÚBLICA (Apenas proprietário, membros do workspace ou admin)
CREATE POLICY "media_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- ------------------------------------------------------------------------------
-- FASE 5: BLINDAGEM DE BUCKETS PRIVADOS E SIGILOSOS
-- ------------------------------------------------------------------------------

-- 5.1 LEGAL-DOCUMENTS: Leitura restrita ao titular, loja vinculada ou admin
CREATE POLICY "legal_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'legal-documents'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- 5.2 LEGAL-DOCUMENTS: Upload restrito ao titular ou workspace member
CREATE POLICY "legal_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents'
  AND (
    owner = (SELECT auth.uid())
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- 5.3 LEGAL-DOCUMENTS: Exclusão restrita à administração da plataforma (audit trail)
CREATE POLICY "legal_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'legal-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('platform_admin', 'owner')
  )
);

-- 5.4 RECEIPTS: Leitura por comprador/titular, loja emissora ou admin/financeiro
CREATE POLICY "receipts_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('platform_admin', 'admin', 'manager', 'finance', 'owner')
    )
  )
);

-- 5.5 RECEIPTS: Upload por usuário autenticado em seu namespace
CREATE POLICY "receipts_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    owner = (SELECT auth.uid())
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('platform_admin', 'admin', 'manager', 'finance', 'owner')
    )
  )
);

-- 5.6 IDENTITY-VAULT: Leitura exclusivamente pelo titular ou auditor master
CREATE POLICY "identity_vault_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-vault'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('platform_admin', 'admin')
    )
  )
);

-- 5.7 IDENTITY-VAULT: Upload exclusivo para a pasta do próprio usuário autenticado
CREATE POLICY "identity_vault_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-vault'
  AND (
    (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR owner = (SELECT auth.uid())
  )
);

COMMIT;
```

---

### 4.2 Especificação de Alteração de Código

#### 1. `src/lib/classifieds/upload-classified-media.ts`
Redirecionar fotos de classificados para o bucket canônico `classifieds` e documentos de transação para o bucket privado `legal-documents`:

```diff
--- a/src/lib/classifieds/upload-classified-media.ts
+++ b/src/lib/classifieds/upload-classified-media.ts
@@ -6,7 +6,7 @@ import { uploadMediaUniversal } from "@/services/storage.functions";
  * uploadClassifiedMedia
  * Realiza a compressão client-side de uma imagem e envia via Server Function
- * para o Supabase Storage (bucket 'post-media', pasta 'classifieds/{folder}'),
+ * para o Supabase Storage (bucket 'classifieds', pasta 'classifieds/{folder}'),
  * retornando a URL pública definitiva e permanente (sem URLs temporárias 'blob:').
  */
 export async function uploadClassifiedMedia(
@@ -48,7 +48,7 @@ export async function uploadClassifiedMedia(
       base64Data,
       fileName: cleanName,
       fileType: fileToUpload.type || "image/jpeg",
-      bucket: "post-media",
+      bucket: "classifieds",
       folder: `classifieds/${folder}`,
     },
   });
@@ -64,7 +64,7 @@ export async function uploadClassifiedMedia(
 /**
  * uploadClassifiedDocument
  * Envia documentos restritos e sigilosos (PDF, XLSX, DOCX, CSV) via Server Function
- * para o Supabase Storage (bucket 'post-media', pasta 'classifieds/documents').
+ * para o Supabase Storage isolado (bucket privado 'legal-documents', pasta 'classifieds/documents').
  */
 export async function uploadClassifiedDocument(
   file: File,
@@ -86,7 +86,7 @@ export async function uploadClassifiedDocument(
       base64Data,
       fileName: cleanName,
       fileType: file.type || "application/pdf",
-      bucket: "post-media",
+      bucket: "legal-documents",
       folder: `classifieds/${folder}`,
     },
   });
```

#### 2. `src/services/storage.functions.ts`
Incluir `"covers"` e `"classified-media"` no enum de validação do BFF e canalizar capas e avatares para seus respectivos buckets canônicos:

```diff
--- a/src/services/storage.functions.ts
+++ b/src/services/storage.functions.ts
@@ -46,6 +46,8 @@ export const getSignedUploadUrl = createServerFn({ method: "POST" })
        "payment-proofs",
        "rma-proofs",
        "classifieds",
+       "classified-media",
+       "covers",
        "avatars",
        "banners",
        "post-media",
@@ -538,7 +540,12 @@ export const uploadProfileMediaDirect = createServerFn({ method: "POST" })
        if (!identity.id) throw new Error("Faça login para atualizar a mídia do seu perfil.");
 
        const supabase = getServerClient();
-       const bucket = "post-media";
+       const bucket =
+         target === "avatar" || target === "creator_avatar"
+           ? "avatars"
+           : target === "cover" || target === "creator_cover"
+           ? "covers"
+           : "post-media";
        const ext = fileName.split(".").pop() || "png";
        const uniqueName = `profiles/${identity.id}/${target}_${Date.now()}.${ext}`;
```

---

## 5. Verification Method (Método de Verificação Independente)

Após a aplicação da migração e do código pelo implementador, executar as seguintes verificações:

1. **Verificação das Views com `security_invoker = true`**:
   ```sql
   SELECT table_name, reloptions 
   FROM information_schema.views v
   JOIN pg_class c ON c.relname = v.table_name AND c.relnamespace = 'public'::regnamespace
   WHERE v.table_schema = 'public'
     AND v.table_name IN ('store_memberships', 'store_members', 'classified_ads', 'companies', 'store_reviews', 'store_integrations');
   ```
   *Critério de Sucesso*: Todas as 6 views retornam `reloptions = ['security_invoker=true']`.

2. **Verificação da Criação e Status dos Buckets**:
   ```sql
   SELECT id, public, file_size_limit 
   FROM storage.buckets 
   WHERE id IN ('covers', 'classified-media', 'legal-documents', 'receipts', 'identity-vault');
   ```
   *Critério de Sucesso*: `covers` existe com `public: true`; `classified-media` existe com `public: true`; `legal-documents`, `receipts` e `identity-vault` possuem `public: false`.

3. **Verificação de Extinção das Políticas `Universal Media *`**:
   ```sql
   SELECT count(*) 
   FROM pg_policies 
   WHERE schemaname = 'storage' AND policyname LIKE 'Universal Media%';
   ```
   *Critério de Sucesso*: Retorno exato de `0`.

4. **Verificação das Novas Políticas Restritas de Storage**:
   ```sql
   SELECT policyname, roles, cmd 
   FROM pg_policies 
   WHERE schemaname = 'storage' AND tablename = 'objects'
   ORDER BY policyname;
   ```
   *Critério de Sucesso*: `media_public_read` é a única com `roles = {public}`; todas as demais (`media_authenticated_*`, `legal_documents_*`, `receipts_*`, `identity_vault_*`) possuem `roles = {authenticated}`.

5. **Verificação da Ausência de `post-media` em Documentos de Classificados**:
   Executar inspeção sintática em `src/lib/classifieds/upload-classified-media.ts`:
   - `uploadClassifiedMedia` referencia `bucket: "classifieds"`.
   - `uploadClassifiedDocument` referencia `bucket: "legal-documents"`.
