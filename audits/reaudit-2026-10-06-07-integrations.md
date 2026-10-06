# Reauditoria 2026-10-06/07 — Integrações, Storage e Onboarding

**Projeto:** `/home/ubuntu/waesy-audit`  
**Escopo exclusivo:** providers, chaves e credenciais, uploads/Storage, OCR e artefatos, onboarding, BrandKit, webhooks e sincronizações externas.  
**Data da inspeção:** 2026-10-06  
**Método:** leitura de código-fonte, migrations e testes existentes; execução do conjunto focalizado de testes. Nenhum código de aplicação foi alterado nesta etapa.

## 1. Resumo executivo

O domínio tem boas intenções e alguns controles reais — por exemplo, `assertSafeUrl`, HMAC com janela de replay em `verifyWebhookSignature`, RLS declarada para várias tabelas e um transactional inbox para alguns fluxos. Porém, há uma diferença material entre esses contratos e os caminhos efetivamente expostos pelo BFF:

1. **Funções server-side usam `service_role`, que bypassa RLS, sem repetir ownership em vários fluxos de onboarding.** Um usuário autenticado pode fornecer `store_id`/`session_id` de outra loja em operações de leitura, OCR, aprovação, importação e geração de vitrine.
2. **O caminho `uploadStoreMedia` aceita bucket arbitrário e continua após falha de identidade**, possibilitando upload anônimo via `service_role` e criação automática de buckets públicos. A policy de INSERT de mídia pública também não exige prefixo/tenant.
3. **Há múltiplos repositórios de segredos com contratos incompatíveis:** JSONB em claro, `TEXT` rotulado como “encriptado” mas sem enforcement, base64 reversível em pools, tokens OAuth em claro e uma leitura de `tenant_ai_providers.api_key` que não descriptografa o payload.
4. **WhatsApp e Meta Ads aceitam POST sem assinatura criptográfica.** Replays e eventos forjados podem criar leads/chat, alterar campanhas e inflar métricas. O shipment tem HMAC, mas seu fallback de idempotência usa `Date.now()`.
5. **O onboarding multimodal não chama a camada canônica de `document_artifacts` e, no caminho analisado, não envia os bytes/imagens ao provider:** ele coloca URLs de imagem em texto do prompt. O produto promete OCR visual rastreável, mas a trilha efetiva é uma sessão JSON com URLs externas.
6. **Defaults heurísticos são persistidos como dados de negócio/branding** e `directory_listings.is_verified=true`; o BrandKit tem duas fontes de verdade (`brand_kits` e `brand_dna_profiles`) e um GET cria perfil sintético.

**Severidade agregada:** crítica. Recomenda-se bloquear os caminhos P0 antes de declarar isolamento multi-tenant, OCR E2E ou webhooks externos “reais” concluídos.

## 2. Evidências positivas e limites da auditoria

### Controles que existem no código

- `src/services/onboarding-pipeline.server.ts:180-216` bloqueia protocolos não HTTP(S), localhost, redes privadas e endpoint de metadata; os testes `src/services/onboarding-pipeline.test.ts:11-40` cobrem esses casos.
- `src/lib/webhook-signature.ts:24-54` exige segredo, timestamp, janela de 300 s e HMAC SHA-256 com comparação timing-safe. `src/lib/webhook-signature.test.ts:16-35` cobre segredo ausente, assinatura válida, adulteração e replay.
- `supabase/migrations/20270107000000_document_artifacts_ocr_provenance.sql:5-79` define artefato, status de extração, hash, provenance, links polimórficos e RLS por loja.
- `supabase/migrations/20261231000000_storage_rls_lockdown_views_security_invoker.sql:89-225` declara leitura pública apenas para buckets de mídia e restringe UPDATE/DELETE por owner/prefixo/workspace; para buckets privados há policies separadas nas linhas 231 em diante.
- `supabase/migrations/20261119000000_oauth_nexus_and_gmb_sync.sql:32-69` declara RLS de OAuth por workspace e bypass explícito para `service_role`.

### Limites observados

- Os testes focais foram executados: **9 arquivos, 56 testes, todos passaram**. Eles são majoritariamente unitários, usam mocks/fakes e não comprovam RLS efetiva, Storage remoto, assinatura de cada endpoint, transação ou concorrência. O próprio `audits/E2E_ONBOARDING_CHAT_COMMERCE_AUDIT_2026-10-06.md:46-59` registra que banco remoto, RLS efetiva, Storage e o vínculo do motor de artefatos ao onboarding não foram validados.
- Não foram feitas alterações em código de aplicação, migrations ou testes.

## 3. Achados detalhados

### INT-01 — P0/Crítico: onboarding server-side aceita `store_id`/`session_id` de outro tenant

**Fatos observados**

- `src/lib/supabase.ts:129-161` documenta e implementa `getServerClient()` com `SUPABASE_SERVICE_ROLE_KEY`; a linha 153 confirma que a chave **bypassa RLS**.
- `src/services/multimodal-onboarding.functions.ts:24-63`: `createOnboardingSession` escolhe `data.store_id || identity.store_id`, mas não chama `assertStoreAccess`/`assertOwnerAccess` antes de inserir.
- `:65-84`: `getOnboardingSession` busca por `session_id` apenas; não carrega identidade nem valida que a sessão pertence à loja do usuário.
- `:169-237`: `parseMenuImagesMultimodal` busca/atualiza sessão por ID sem ownership.
- `:244-326`: `approveOnboardingProducts` permite que `session.store_id` substitua `identity.store_id`; não verifica membership e insere produtos nesse `store_id`.
- `:369-434` e `:440-495`: `importMasterCatalogProduct` e `importProductsTraditional` aceitam `data.store_id` arbitrário e o usam como destino sem `assertStoreAccess`.
- `:634-655`: `generateStorefrontFromOnboarding` aceita `session_id` e `store_id` independentes, deriva somente `data.store_id || identity.store_id`; `executeGenerateStorefrontFromOnboarding` (`:501-631`) não verifica que a sessão e a loja informada coincidem.
- A RLS declarada para `multimodal_onboarding_sessions` em `supabase/migrations/20260911000000_squads_agentic_multimodal_master_catalog.sql:318-325` não mitiga chamadas que usam o cliente `service_role`.

**Risco**

Um usuário autenticado que obtenha/enumere UUIDs pode ler o conteúdo de uma sessão, processar OCR de outra loja, inserir produtos no catálogo de outro tenant e publicar/alterar a vitrine de outra loja. Mesmo sem leitura de UUID, aceitar IDs de destino no cliente quebra a garantia de isolamento e permite corrupção dirigida de dados.

**Dependências**

`getServerClient`/`service_role`, `identity-core`/`server-access`, RLS do Supabase e todas as telas de revisão/importação. A policy só é efetiva quando o caminho usa anon/authenticated client ou quando a própria função impõe a autorização.

**Correção concreta**

Criar helper único `assertOnboardingSessionAccess(identity, sessionId, requestedStoreId, allowedRoles)` que: (a) exige identidade autenticada; (b) resolve a loja somente no servidor; (c) consulta a sessão e verifica `session.store_id === identity.store_id`/membership; (d) rejeita `data.store_id` diferente, em vez de aceitá-lo; (e) usa a mesma transação/RPC para sessão + produtos + status. Aplicar a todas as funções acima, incluindo `getOnboardingSession`, OCR, aprovação, importações e builder. Adicionar testes com Tenant A tentando `session_id/store_id` de Tenant B usando mock que simule `service_role`; o teste atual de RLS (`rls-cross-tenant-isolation.test.ts`) valida apenas helpers/memória, não esses handlers.

---

### INT-02 — P0/Crítico: upload arbitrário/anônimo em `uploadStoreMedia` e policy de INSERT sem tenant

**Fatos observados**

- `src/services/storage.functions.ts:217-280`: o validator define `bucket: z.string().default("cms-media")`, sem enum/allow-list. O handler captura falha de `getServerIdentity()` e substitui por `{ id: null, store_id: null }` (`:230-232`), em vez de rejeitar a chamada.
- O mesmo caminho deriva `folder` como `identity.store_id || identity.id || "general"` (`:234-237`), faz upload com `getServerClient()` (`:234`) e, em bucket inexistente, cria o bucket com `public: true` (`:250-263`). Assim, o caller controla o nome de bucket e o endpoint continua operacional sem autenticação efetiva.
- `src/services/storage.functions.ts:245-275` retorna `getPublicUrl` para qualquer bucket escolhido; não há ownership de loja, associação a `document_artifacts`, validação de extensão segura ou enforcement do limite depois do auto-heal.
- `getSignedUploadUrl` (`:54-150`) restringe o bucket por enum, mas inclui buckets sensíveis (`payment-proofs`, `rma-proofs`, `legal-documents`, `receipts`, `identity-vault`) e auto-cria bucket quando ausente (`:100-123`). O handler exige alguma identidade (`:88-92`), mas não exige role apropriada por bucket nem grava artefato canônico.
- A policy `media_authenticated_insert` em `supabase/migrations/20261231000000_storage_rls_lockdown_views_security_invoker.sql:110-129` só verifica que o `bucket_id` pertence à lista pública; não verifica `owner`, prefixo de loja ou membership no path. O UPDATE/DELETE tem checks de path nas linhas 131-225, mas INSERT não.
- `uploadPostMedia` (`:285-328`) exige identidade, mas não valida `fileType` com `validateMimeType`, não aplica limite de bytes e confia no `contentType` recebido.

**Risco**

Upload anônimo ou cross-tenant em Storage público, abuso de quota e persistência de conteúdo com MIME declarado pelo atacante. O auto-heal pode transformar um typo/controlador de bucket em um bucket público novo. Em mídia de loja, o atacante pode criar objetos em `general`/bucket escolhido e receber URL pública.

**Dependências**

Supabase Storage service role, policies de `storage.objects`, buckets criados pelas migrations e componentes que chamam `uploadStoreMedia`, `uploadMediaUniversal`, `MediaUploader` e formulários de criação de loja.

**Correção concreta**

Remover o fallback permissivo de identidade: falha de autenticação deve ser 401. Trocar `bucket: string` por enum central compartilhado e separar buckets públicos/privados; proibir auto-criação em request de usuário (criar buckets somente via migration/deploy). Exigir `assertStoreAccess` e mapear cada bucket a uma capability/role. Para INSERT, exigir path canônico `store_id/user_id` e validar membership no Storage policy ou emitir signed upload apenas de servidor após autorização. Validar tamanho/MIME e bytes decodificados em todos os endpoints. Registrar cada upload em `document_artifacts` quando for documento/OCR, com hash e path canônico.

---

### INT-03 — P0/Crítico: cofre de chaves fragmentado, tokens em claro/base64 e BYOK que não descriptografa

**Fatos observados**

- `supabase/migrations/20260731131900_fase5_growth_integrations.sql:5-23` define `integration_credentials.token_payload JSONB` como armazenamento direto de chaves/secrets. A própria migration diz que a proteção real ficaria nas server functions, mas há policy `FOR ALL` para owner/admin; não há coluna criptografada nem `REVOKE SELECT`.
- `supabase/migrations/20260902250000_tenant_ai_providers.sql:5-17` define `tenant_ai_providers.api_key TEXT NOT NULL`; a policy em `:22-36` permite `FOR ALL` a qualquer workspace member.
- `supabase/migrations/20270106000000_live_p0_security_hardening.sql:4-8` somente adiciona COMMENT dizendo que `api_key` é AES-256-GCM e que legados precisam de rotação; não altera tipo, constraint, RPC ou dados. Portanto o comentário não prova cifragem efetiva.
- `src/services/api-orchestrator.functions.ts:123-140` e `:446-454` salvam `api_key_pools.encrypted_key` como `Buffer.from(rawKey).toString("base64")`; base64 é codificação reversível, não criptografia. `:363-374` decodifica base64 diretamente.
- `src/services/secret-vault.functions.ts:193-225` lê `tenant_ai_providers.api_key` e retorna `tenantKey.api_key.trim()` sem `decryptSecret`. Se a linha contém o AES envelope descrito pela migration, o provider recebe o ciphertext como chave; se contém plaintext legado, ele é usado diretamente.
- `src/services/secret-vault.functions.ts:231-274` ainda extrai valores diretamente de `integration_credentials.token_payload` (`api_key`, `secret_key`, `token`, `access_token`), reforçando o caminho em claro.
- `src/services/api-orchestrator.functions.ts:380-402` inclui `VITE_*_API_KEY` como fallback server-side. Mesmo quando isso não vaza para o bundle, o prefixo aumenta o risco operacional de uma chave pública ser usada como segredo.

**Risco**

Exposição de credenciais a usuários autorizados via consulta direta, comprometimento de banco/backup e falhas silenciosas de BYOK. A ausência de uma representação única também permite que uma integração funcione com uma tabela e falhe com outra, ou que fallback de pool envie ciphertext/base64 inválido ao provider.

**Dependências**

`secret_vault`, `tenant_ai_providers`, `integration_credentials`, `api_key_pools`, `oauth_integrations`, APIs externas e policies/RPCs de Supabase.

**Correção concreta**

Escolher um único vault server-only com envelope AES-256-GCM (ou KMS), `key_version`, `ciphertext`, nonce/tag e status de rotação. Migrar/rotacionar todas as linhas de `integration_credentials`, `tenant_ai_providers` e `api_key_pools`; nunca “descriptografar” base64 como legado sem marcar e bloquear uso. Remover SELECT/ALL direto a segredos para usuários; expor somente DTO mascarado e RPC BFF que resolve por tenant/role. Fazer `getActiveSecretForProvider` chamar `decryptSecret` também para `tenant_ai_providers`, com falha fechada para ciphertext inválido. Retirar `VITE_*` dos fallbacks de segredo. Incluir teste que salva uma chave, confirma que DB não contém plaintext, confirma decrypt exatamente uma vez e rejeita legacy não rotacionado.

---

### INT-04 — P0/Alto: tokens OAuth e contas de ads mantêm cópias em `TEXT` sem enforcement criptográfico

**Fatos observados**

- `supabase/migrations/20261119000000_oauth_nexus_and_gmb_sync.sql:7-25` cria `oauth_integrations.access_token TEXT NOT NULL` e `refresh_token TEXT`; os comentários dizem “encriptado pelo backend”, mas não há cipher column, trigger, check ou RPC de escrita.
- A mesma migration permite `service_role` total (`:64-69`) e não institui camada de decrypt/rotate.
- `supabase/migrations/20261210000000_v142_omni_marketing_engine_and_invoice_ledger.sql:112-121` adiciona `oauth_access_token` e `oauth_refresh_token` diretamente em `store_ad_accounts`, também sem enforcement criptográfico.
- `oauth_integrations` e `store_ad_accounts` coexistem com `integration_credentials`; o código de integrações tem mais de um caminho de token, o que dificulta revogação, rotação e auditoria completa.

**Risco**

Access/refresh tokens de GMB, Meta/TikTok/Stripe podem estar em claro em tabela, backup, logs de dump ou respostas administrativas; revogar em um repositório pode deixar uma cópia ativa em outro.

**Dependências**

OAuth Nexus/GMB, ad sync, webhooks Meta, workers de sincronização e migrações históricas.

**Correção concreta**

Migrar os campos para referências ao vault canônico (`secret_id`/envelope), rotacionar tokens depois da migração, remover/limpar cópias de `TEXT` e impedir novas escritas por trigger/RPC. Armazenar somente metadados não secretos (`account_id`, scopes, expires_at, last_synced_at). Implementar revoke/delete atômico em todos os repositórios e teste de busca que garanta exatamente uma fonte de token por `(store_id, provider, account_id)`.

---

### INT-05 — P0/Alto: WhatsApp Cloud e Meta Ads POST sem assinatura; replay e spam de mutação

**Fatos observados — WhatsApp**

- `src/routes/api.webhooks.whatsapp.ts:70-88` faz `request.json()` diretamente e não lê/verifica `X-Hub-Signature-256`, raw body ou timestamp.
- O endpoint mapeia `phone_number_id` a uma loja consultando `integration_credentials` (`:88-103`) e depois cria/atualiza leads e threads (`:105-211`). `msg.id` é apenas salvo em payload (`:201-205`); não há inbox/idempotency check antes de inserir nota/mensagem.
- O GET de handshake (`:40-51`) varre e compara `token_payload` de todas as lojas, em claro conforme INT-03.

**Fatos observados — Meta Ads**

- `src/routes/api.webhooks.meta-ads.ts:8-24` tem fallback previsível `"waesy_meta_ads_verify"` quando `META_WEBHOOK_VERIFY_TOKEN` não existe.
- O POST (`:26-79`) não verifica assinatura da Meta nem segredo por conta; registra o evento após um SELECT de existência (`:41-55`), sem constraint/insert atômico para impedir corrida.
- A busca de campanha em `:57-62` monta filtro `.or(...)` com `externalCampaignId` vindo do payload sem validação de formato/escape; usar igualdade separada e valores tipados é mais seguro.
- O handler atualiza campanha e soma impressões/cliques (`:81-142`) com dados não autenticados; replays podem inflar contadores.

**Fatos observados — shipment**

- `src/routes/api.webhooks.shipment.ts:11-18` usa corretamente `verifyWebhookSignature`.
- Porém, `:38-40` cria fallback de idempotency `${order_id/tracking_code}-${status}-${Date.now()}`; um replay sem `idempotency_key` ou `id` sempre produz uma chave nova.

**Risco**

Qualquer terceiro pode forjar eventos WhatsApp e Meta para gerar leads, mensagens internas, alterações de status e métricas; replays podem duplicar chat e contadores. O fluxo shipment parece protegido apenas quando o provedor envia assinatura e uma chave estável.

**Dependências**

Meta Graph/WhatsApp Cloud, `integration_credentials`, `marketplace_webhook_events`, `ad_campaigns`, `ad_events`, `chat_threads`, `chat_messages` e RPC de shipment.

**Correção concreta**

Para cada endpoint: ler raw body, validar assinatura específica do provedor com segredo por conta/loja, limitar tamanho e falhar fechado se segredo não existir. Persistir inbox com unique `(provider, account_id, event_id)` via INSERT/RPC atômico antes de qualquer side effect; marcar processed/failed. Para WhatsApp, deduplicar por `msg.id`; para Meta, aceitar somente IDs/assinaturas válidos e aplicar deltas idempotentes em uma RPC. Remover fallback de verify token previsível. No shipment, rejeitar eventos sem idempotency key estável (não usar relógio como identidade).

---

### INT-06 — P1/Alto: “OCR multimodal” do onboarding não passa pelo artefato canônico e não envia imagens ao provider

**Fatos observados**

- `supabase/migrations/20270107000000_document_artifacts_ocr_provenance.sql:5-31` define `document_artifacts` como fonte canônica, com `bucket_id`, `storage_path`, SHA-256, engine/version, status, texto, structured data, confidence e provenance; `:98-101` afirma que URL pública não é fonte de verdade.
- `src/services/multimodal-onboarding.functions.ts:24-53` guarda em `multimodal_onboarding_sessions.input_sources` somente `image_urls`/`external_links`.
- `:94-166` cria `extractMenuWithRealAI(imageUrls, textHint)`. O prompt imprime as URLs como texto (`:121-124`), mas a chamada `executeUnifiedAiCall` (`:127-132`) não preenche `images`, `fileBase64` ou arquivo; portanto não há evidência no caminho de que o provider recebeu bytes da imagem.
- `:214-226` grava apenas `extracted_products`, categorias e perfil JSON na sessão. Não cria `document_artifacts`, `document_artifact_links`, hash, provenance ou registro de objeto Storage.
- O relatório anterior `audits/E2E_ONBOARDING_CHAT_COMMERCE_AUDIT_2026-10-06.md:56-59` já registra que o motor de artefatos ainda não foi chamado pelo onboarding.

**Risco**

O sistema pode reportar “OCR visual” sem processar a imagem, depender de URL externa expirada/privada e perder a relação auditável entre original, engine e extração. Não há revisão/reprocessamento confiável nem prova de qual arquivo gerou cada produto.

**Dependências**

Upload Storage, `document_artifacts`, `multimodal_onboarding_sessions`, providers Gemini/OpenAI/OpenRouter e UI de revisão.

**Correção concreta**

Ao receber upload, criar `document_artifact` com path privado, hash e status; passar bytes/URL assinada curta ao OCR provider, explicitamente via `images`/`fileBase64`; persistir engine/model/version, confidence, raw/extracted result e provenance. Criar `document_artifact_links` para a sessão e produtos aprovados. Não aceitar URLs externas como fonte única; se crawler externo for permitido, baixar para bucket controlado após SSRF/size/MIME checks. O estado da sessão deve referenciar IDs de artefatos, não apenas URLs.

---

### INT-07 — P1/Alto: defaults heurísticos e “verificado” são persistidos como fatos de onboarding

**Fatos observados**

- `src/services/onboarding-pipeline.server.ts:526-539` usa fallback de domínio, paleta, tipografia, estilo e confidence quando a resposta não fornece dados.
- `:595-609` usa defaults de tom, arquétipo, regras, palavras e pilares quando o provider não retorna campos.
- `:719-772` preenche Business Model, SWOT e sete pecados com strings genéricas se o modelo não entregar dados; `:813-823` cria concorrente “Comércio Local Tradicional” e oportunidades genéricas na ausência de evidência.
- `:915-942` consolida esses resultados; `:950-1168` persiste em `stores`, `brand_kits`, `brand_dna_profiles`, `briefings`, produtos e `directory_listings`. A linha `:1163` fixa `is_verified: true` no listing.
- O teste `src/services/onboarding-e2e-verification.test.ts:171-291` comprova somente que produtos “Filé Mignon”/“Iscas de Tilápia” não entram em um cenário; ele injeta `executeUnifiedAiCall` mockado (`:255-276`) e não verifica ausência de defaults genéricos, provenance ou estado `unconfirmed`.

**Risco**

Brand DNA, SWOT, concorrentes, BMC, produtos sugeridos e listing podem parecer fatos confirmados quando são defaults/inferências. `is_verified=true` aumenta o impacto porque apresenta dados ao público como verificados.

**Dependências**

Providers/fallback chain, tabelas de branding, directory público e testes “anti-mock”.

**Correção concreta**

Separar campos `observed`, `inferred` e `default`; cada valor sem evidência deve carregar `confidence`, `evidence_refs` e `needs_review=true`. Defaults visuais podem existir apenas como estado de UI, não como fato persistido. Bloquear criação automática de produtos a partir de defaults, escrever `directory_listings.is_verified=false` até aprovação humana/critério verificável e incluir teste sem provider que confirme zero alegações factuais persistidas.

---

### INT-08 — P1/Médio: BrandKit tem duas fontes de verdade e GET cria conteúdo sintético

**Fatos observados**

- `supabase/migrations/20260907200000_bigtech_schema_harmonization_and_hardening.sql:81-116` cria `brand_kits` com colunas simples e policy própria.
- `src/services/onboarding-pipeline.server.ts:997-1025` grava `brand_kits` durante persistência do onboarding.
- Contudo, `src/services/brand-kit.functions.ts:129-191` `getStoreBrandKit` lê somente `brand_dna_profiles`, não `brand_kits`; `saveStoreBrandKit` também upserta somente `brand_dna_profiles` (`:289-326`). A tela `workspace.marketing.brand-kit.tsx:12-15` usa essas funções.
- Se não existe perfil, um GET cria linha em `brand_dna_profiles` (`brand-kit.functions.ts:194-214`) e retorna SWOT/voz/pilares sintéticos (`:216-240`). Abrir a página altera o banco e pode mascarar ausência de dados.

**Risco**

Edição no workspace e resultado do pipeline podem divergir; consumers diferentes leem marcas diferentes. A abertura de tela grava defaults como se fossem perfil real, dificultando distinguir configuração humana, extração e fallback.

**Dependências**

`brand_kits`, `brand_dna_profiles`, onboarding pipeline, tela BrandKit e consumers públicos de branding.

**Correção concreta**

Escolher uma tabela canônica ou criar uma view/RPC versionada com migração/backfill explícito. Guardar `source`, `edited_by_human`, `evidence_refs` e versionamento. Fazer GET ser read-only; defaults devem existir apenas no DTO da UI até o usuário salvar. Adicionar teste que pipeline -> tela -> save preserva todos os campos e que não há escrita em GET.

---

### INT-09 — P1/Médio: sincronização/inbox externa não é uniformemente atômica nem escopada

**Fatos observados**

- `src/services/marketplace-webhooks.functions.ts:352-455` faz SELECT de evento existente (`:360-375`) e depois INSERT (`:378-391`) em operações separadas; sem constraint/UPSERT atômico, duas entregas simultâneas podem passar pelo SELECT.
- `syncOrderToMaster` (`:101-122`, `:150-213`) procura pedido por texto `notes` e cria ordem/itens/baixa de estoque em vários writes; não há uma RPC única que garanta ordem, itens, estoque e ledger em uma transação.
- Vários processadores aceitam `storeId` do payload ou `payload.store_id` (`:510-523`, `:643-649`) e rodam com `getServerClient` service role; a prova de assinatura/ownership não está no handler comum.
- A suíte `omni-integration-compliance.test.ts:62-116` testa duplicata com mock, HMAC em função local e janela numérica; não testa corrida de INSERT, assinatura do endpoint por provedor ou transaction rollback.

**Risco**

Replays concorrentes podem duplicar pedidos, eventos e métricas; falha intermediária pode deixar estoque, caixa e order master divergentes. Se o chamador alcançar o handler com `storeId` forjado, o service role amplifica o dano.

**Dependências**

`marketplace_webhook_events`, `orders`, `order_items`, `stock_movements`, caixa, NFe, conectores externos e workers de retry.

**Correção concreta**

Criar unique constraints por `(platform, account_id, event_id)` e RPC `ingest_external_event` que faz claim atômico, valida connector/tenant e executa side effects numa transação/outbox. Resolver `store_id` por credencial/account mapping, nunca por campo livre do payload. Para pedidos, usar `(store_id, platform, external_order_id)` como chave canônica e uma RPC transacional para order/items/stock/ledger, com retry seguro.

## 4. Matriz de prioridade

| ID | Severidade | Área | Ação mínima antes de produção |
|---|---|---|---|
| INT-01 | P0 | Onboarding/RLS | Ownership server-side para todo `store_id`, `session_id` e builder; testes cross-tenant com service role |
| INT-02 | P0 | Storage/upload | Rejeitar anônimo, enum de bucket, sem auto-heal por request, path/policy por tenant |
| INT-03 | P0 | Chaves/providers | Vault único, rotação de plaintext/base64, decrypt correto de tenant keys, sem SELECT de segredos |
| INT-04 | P0 | OAuth/ads | Migrar access/refresh tokens de `TEXT` para vault e remover cópias |
| INT-05 | P0 | Webhooks | HMAC por endpoint/account, raw body, inbox atômico, dedup de WhatsApp/Meta, sem segredo default |
| INT-06 | P1 | OCR/artefatos | Upload privado + `document_artifacts` + bytes reais no provider + provenance |
| INT-07 | P1 | Truthfulness | Defaults não factuais fora do banco ou marcados como inference/review; `is_verified=false` |
| INT-08 | P1 | BrandKit | Fonte canônica única e GET read-only |
| INT-09 | P1 | Sync | RPC/outbox transacional e resolução de tenant por credencial |

## 5. Conclusão

**Fato:** os testes focais passam e alguns helpers de segurança existem.  
**Fato:** isso não comprova isolamento, confidencialidade de segredos, OCR real, ingestão autenticada ou sincronização atômica nos caminhos atuais.  
**Hipótese operacional a confirmar em ambiente remoto:** a exploração concreta depende de deployment com `SUPABASE_SERVICE_ROLE_KEY`, buckets e policies exatamente como nas migrations; o código, entretanto, já contém as pré-condições suficientes para os riscos descritos.

A próxima etapa recomendada é um hardening P0 com testes de integração contra Supabase efêmero/real: dois tenants, usuário anônimo, uploads em cada bucket, rotação de todos os tipos de chave, POSTs com/sem HMAC, replays concorrentes e uma sessão OCR ligada a objeto Storage e `document_artifacts`. Até essa prova, não declarar o domínio como E2E concluído.
