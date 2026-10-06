# Auditoria consolidada — estado live 2026-10-06

**Papel:** revisor principal do Waesy  
**Escopo:** consolidação dos resultados estruturados de `live-2026-10-06-01-plan` a `live-2026-10-06-05-infra`.  
**Natureza:** diagnóstico para implementação posterior. **Nenhum item abaixo é marcado como corrigido.**

## Critério de consolidação

- Foram mantidos somente achados com evidência em código, migração, política, rota, comando executado ou teste explicitamente descrito.
- Duplicatas foram agrupadas por causa-raiz; quando o mesmo defeito aparece em várias superfícies, as superfícies permanecem listadas na mesma linha.
- Testes unitários, mocks, `npm run audit:buttons`, build e typecheck não são tratados como prova de autorização, RLS, gateway, storage, worker ou E2E real.
- Uma declaração `COMPLETED` só é considerada sustentada quando há implementação observável no caminho de produção correspondente.
- A ordem abaixo é de contenção de risco: P0 primeiro, depois P1, e P2 somente após os bloqueadores de segurança/integridade.

## Resumo executivo

Há **bloqueadores P0 de integridade transacional, autorização, privacidade/storage, exposição de segredos, abuso de IA e gate visual**. Os riscos mais graves permitem aceitar preço/estoque do cliente, operar mutações sem posse verificável, expor downloads/documentos, enviar IA sem autenticação/quota, criar uploads públicos arbitrários e devolver/guardar segredos de tenant de forma insegura.

Os principais sinais de contradição são: DTOs de marketplace com fatos sintéticos apesar da promessa de dados persistentes; tokens aceitos sem reconciliação server-side apesar da promessa antifraude; mutações e downloads privilegiados sem autorização de objeto; o gate de design reportado como concluído embora falhe; e Sparkles ainda presente em produção e seeds apesar da regra declarada de proibição.

## Matriz de execução ordenada

| Ordem | Severidade | Correção de execução | Evidência consolidada | Critério mínimo de aceite |
|---:|:---:|---|---|---|
| 1 | **P0** | **Fechar checkout no servidor e torná-lo atômico.** Buscar produto/variante por ID e `store_id`, conferir status, preço, pertencimento à loja, frete e estoque; calcular subtotal/frete no servidor; reservar estoque atomicamente; usar idempotência dedicada; inserir pedido, itens e reserva em uma transação e só emitir evento após commit. | `src/services/marketplace-checkout.functions.ts:54-70,171-216,220-270`; o schema aceita `priceCents`, título, loja, frete e opção do cliente, e a falha de `order_items` é apenas `console.warn`. | Testes de divergência de preço/loja/estoque/frete, replay, falha de itens e concorrência; nenhum pedido sem itens ou reserva inconsistente.
|
| 2 | **P0** | **Impor autorização de objeto/tenant em listings.** Exigir sessão, membership/ownership e papel adequado para criar, publicar, moderar, expirar e transicionar; remover UUID/actor fallback e aprovação automática; proteger jobs com segredo/assinatura; atualizar por predicado de posse/status e verificar row count. | `src/services/unified-listing.functions.ts:160-247,358-493,395-575`; `src/lib/supabase.ts:140-160` usa `service_role`, bypassando RLS nos handlers. | Usuário sem sessão, sem posse, de outro tenant e papel insuficiente recebe 401/403; transição concorrente ou fora do status permitido não altera linhas.
|
| 3 | **P0** | **Proteger downloads digitais e remover fallback público.** Exigir autenticação, vínculo a deal/assinatura paga, status e limite; aplicar validade/contagem em RPC atômica; manter bucket privado e emitir somente signed URL curta; nunca usar `getPublicUrl` em erro. | `src/services/classifieds.functions.ts:1271-1315` consulta com UUID/service role sem identidade, pagamento, limite ou validade e retorna URL pública em erro. | Sem autorização não há URL; limite e expiração são aplicados atomicamente; qualquer falha retorna erro fechado, nunca URL pública.
|
| 4 | **P0** | **Unificar e fechar uploads.** Eliminar `uploadMediaUniversal` como caminho arbitrário; usar enum de buckets, namespace derivado de identidade/tenant, MIME e bytes validados no servidor, bucket previamente provisionado e private-by-default; signed URLs para leitura. Criar caminho exclusivo para `legal-documents`; corrigir também `receipts` públicos e policies sem namespace. | `src/services/storage.functions.ts:189-249,392-452`; `src/lib/classifieds/upload-classified-media.ts:63-103`; `20260926000000_telemetry_ledger_cashback_contracts.sql:68-94`; policy final `20261231000000...:110-129`. | Dois tenants não conseguem gravar/ler o namespace um do outro; documentos e receipts não têm URL pública; MIME/tamanho inválidos são rejeitados antes do upload.
|
| 5 | **P0** | **Autenticar e limitar o stream de IA.** Exigir sessão e tenant/role em `POST /api/ai/stream`, aplicar rate limit por usuário/IP, quota/budget diário e limite server-side de tokens/custo; rejeitar anônimo antes de despachar a provider. | `src/routes/api.ai.stream.ts:16-65` não chama identidade/autorização/rate limit e passa `authContext: {}`; `src/services/ai-core-gateway.functions.ts:926-985` despacha providers reais. | 401 para anônimo, 403 para tenant/papel inválido, 429 para limite e nenhum custo/provider call antes dos gates.
|
| 6 | **P0** | **Eliminar armazenamento inseguro de chaves.** `saveSimLabApiKey` deve exigir admin/plataforma e usar cifragem real; `tenant_ai_providers.api_key` deve migrar para vault/AES-GCM ou `secret_id`, nunca retornar em `select(*)`; remover fallback mestre conhecido de `crypto-vault.server.ts`, exigir `VAULT_MASTER_KEY` e rotacionar legados. | `src/services/api-orchestrator.functions.ts:108-165,202-218,436-482` usa base64 e não exige admin; `20260902250000_tenant_ai_providers.sql:5-18`; `src/services/ai-providers.functions.ts:81-110,142-193`; `src/lib/crypto-vault.server.ts:27-41`. | Nenhum segredo sai em DTO/log/query; ausência da chave mestra falha fechado; gravação exige papel e os registros legados foram identificados/rotacionados.
|
| 7 | **P0** | **Corrigir o gate visual P0 antes de declarar conformidade.** Resolver as três regressões acima do baseline e tratar o bloco `prefers-reduced-motion` com exceção estreita, expirada e acessível ou equivalente sem `!important`; repetir o gate. | `npm run lint:design` falhou com 14.288 violações, 1.561 P0 contra baseline 1.558, DL-04 7 contra 3 e styles 13 contra 9; `src/styles.css:1149-1152`. | `npm run lint:design` passa ou a exceção formal é validada pelo gate e documentada com escopo/expiração.
|
| 8 | **P1** | **Remover fatos sintéticos dos DTOs de marketplace/ofertas.** Usar fontes canônicas para rating, reviews, distância, abertura, entrega, estoque, unidade e validade; propagar `null`/“não informado” quando a fonte não existir; não chamar oferta/loja de verificada sem evidência. | `src/services/marketplace.functions.ts:267-279,317-349,469-522` fixa `4.9`, `120`, `1.2`, `true`, `Disponível`, `un` e `ends_at=""`; `src/routes/_store.ofertas.tsx:59-67,93-127,217-220` exibe os DTOs e converte estoque ausente para `true`. | Teste do mapper falha se esses literais reaparecerem; ausência de estoque/reviews não vira disponibilidade/verificação.
|
| 9 | **P1** | **Fechar todos os webhooks de recarga de tokens com reconciliação.** Remover caminho duplicado ou exigir HMAC/segredo por gateway, timestamp e replay protection; buscar evento/pagamento confirmado por ID; derivar pacote, preço e tokens server-side; rejeitar divergências antes do RPC. Aplicar o mesmo ao PIX, que hoje só autentica o corpo. | `src/services/tokens.functions.ts:977-1002` aceita `signature` opcional e não a verifica; `src/routes/api.webhooks.pix.ts:21-60` aceita tokens/valor/pacote de body/metadata; `20260827240000_token_perf_indexes_and_webhook_outbox.sql:32-40,53-134` deduplica mas não reconcilia. | Assinatura ausente/inválida, replay, pagamento não confirmado e divergência de pacote/valor/tokens são rejeitados; crédito ocorre uma única vez após confirmação canônica.
|
| 10 | **P1** | **Restaurar vínculo vendedor–classificado em propostas/reservas.** Exigir `classifiedId`, carregar com lock, validar `seller/author`, status, preço e datas, impedir auto-compra, usar idempotência e concluir deal/anúncio em transação; não engolir falha de update. | `src/services/deals.functions.ts:6-60,201-218` aceita `classifiedId` opcional e `sellerId` independente, grava estados diretos e engole erro. | Não é possível reservar anúncio de outro vendedor, anúncio inativo/expirado ou a si próprio; qualquer falha faz rollback.
|
| 11 | **P1** | **Reduzir DTO público de classificados a allowlist pública.** Filtrar status/expiração antes do enriquecimento e separar DTO público de owner/admin; remover telefone, `settings`, `pix_key`, instruções internas e demais campos não públicos. | `src/services/classifieds.functions.ts:275-282,345-401,425-487` usa `select(*)` via service role e enriquece perfis/stores; a sanitização não é allowlist. | Visitante recebe somente campos documentados e publicáveis; testes verificam ausência de telefone, Pix, settings e estados não publicados.
|
| 12 | **P1** | **Restringir view e consultas públicas por estado e validade.** `unified_listings_view` deve ter versão pública com status/moderação/expiração permitidos ou ser substituída por RPC autorizada; todas as consultas públicas devem exigir `expires_at IS NULL OR expires_at > now()` e deve existir scheduler comprovável para expiração. | `20261221000000_unified_listings_canonical_engine.sql:16-64` faz `UNION ALL` sem filtros; `getPublicClassifieds` e `listUnifiedListings` filtram apenas `active`; não foi encontrado scheduler de produção da RPC de expiração. | Anúncio expirado, moderado ou não publicável não entra no feed/view pública; teste de integração cobre `active` vencido.
|
| 13 | **P1** | **Preservar linhagem até o CTA.** Tornar `origin` obrigatório, rejeitar/telemetriar origem diferente de `workspace` na rota Marketplace e separar card/rota/CTA para classified; não permitir que classified caia em `/produto/$slug`/`addToCart`. | `src/routes/_store.marketplace.index.tsx:184-205,217-249` descarta `origin`; `src/components/commerce/offer-card.tsx:93-98,219-222` sempre usa produto e `addToCart({productId:id})`. | Teste real de loader→card→CTA verifica origem, destino e ação; classified nunca é tratado como produto.
|
| 14 | **P1** | **Fechar superfície WhatsApp.** Substituir âncora direta por `ProtectedContactButton`/`trackAndOpenWhatsApp`; somente liberar com `authorized=true` e lead persistido. Em erro do RPC, retornar falha, não `success:true`/código aleatório. Proteger webhook com HMAC do corpo bruto, deduplicar `msg.id`, retornar 5xx/DLQ se persistência falhar e remover INSERT público/RPC sem rate limit/nonce. | `src/components/commerce/dynamic-sections/store-contact.tsx:97-101,158-165`; `src/services/whatsapp-leads.functions.ts:114-123,182-229`; `src/routes/api.webhooks.whatsapp.ts:70-145,146-224`; `20260817160000_whatsapp_lead_intelligence_telemetry.sql:37-43,67-130`. | Todo contato gera lead persistido ou não abre; webhook inválido recebe 401/403, falha de persistência não confirma 200 e replay não duplica.
|
| 15 | **P1** | **Corrigir MagicAI: conclusão, isolamento e autorização de jobs.** Sem `storeId`, retornar preview/incompleto; exigir persistência transacional antes de `completed`; filtrar `ai_async_jobs` por identidade/tenant/role; impedir que cliente altere status/result/payload/custo/progresso. | `src/services/magic-onboarding.functions.ts:151-161,227-235,241-259`; `20261206000000_v142...sql:156-161` permite `FOR ALL` do próprio usuário. | Não há “Configuração concluída” sem store persistida; usuário não lê/altera job alheio nem forja `completed`.
|
| 16 | **P1** | **Implementar execução assíncrona durável e outbox.** Criar worker com claim/lease, retries idempotentes, execução provider, `result/error/finished_at`, telemetria e DLQ; substituir `Map` em memória por outbox persistida na mesma transação do domínio; restringir updates de jobs ao worker/RPC. | `src/services/ai-core-gateway.functions.ts:533-594` apenas cria `queued`; não há consumidor; `src/lib/queue/domain-event-queue.ts:43-92` usa `new Map()`; `src/services/domain-events.functions.ts:90-125`; migration de jobs `:107-125`. | Job percorre `queued→processing→completed/failed` após restart; outbox sobrevive cold start/escala e não duplica eventos.
|
| 17 | **P1** | **Fazer a matriz de roteamento de IA ser fonte efetiva.** Ou ler/validar `ai_task_routing_rules` no gateway e aplicar cascade/limites, ou remover painel/tabela; cobrir alteração da regra até provider despachado. | `20261206000000_v142...sql:72-105` semeia regras, mas `src/services/ai-core-gateway.functions.ts:158-216,597-607` usa `CANONICAL_TASK_ROUTES` hardcoded. | Uma mudança autorizada na regra altera de fato o provider/modelo/cascade usados.
|
| 18 | **P1** | **Proteger teste de conexão de segredos.** Exigir sessão, role/ownership, buscar somente segredo do tenant, não aceitar chave arbitrária do chamador e aplicar rate limit, budget e auditoria. | `src/services/secret-vault.functions.ts:288-326,351-365,409-426` chama helper/provider sem identidade/role/limite e aceita `secretKey` opcional. | Chamadas anônimas/fora do tenant são bloqueadas; não há oracle/custo ilimitado nem chave arbitrária em request.
|
| 19 | **P1** | **Completar validação de uploads e receipts nos caminhos paralelos.** Centralizar MIME/extensão/bytes em `uploadPostMedia`, `uploadAdminMedia`, `uploadBrandAsset` e `uploadProfileMediaDirect`; revisar `receipts` para private/owner relation. | `src/services/storage.functions.ts:255-315,322-386,460-619` não chama `validateMimeType` nem impõe bytes; migration de receipts cria `public=true`. | Todos os handlers aplicam os mesmos limites por categoria e os testes de dois usuários comprovam isolamento.
|
| 20 | **P1** | **Corrigir governança do AI Layout Generator.** Não apresentá-lo como IA de produção enquanto usa palavras-chave/copy hardcoded sem provider/persistência; conectar a execução server-side real com validação/persistência ou retirar do caminho produtivo. | `src/services/ai-builder-generator.ts:13-191`; callers encontrados apenas em `ai-builder-phase8.test.ts`. | UI/status refletem execução real, erro real e resultado persistido, ou o recurso é explicitamente tratado como não disponível.
|
| 21 | **P1** | **Remover Sparkle/Sparkles das superfícies de produção.** Trocar no SDR e Copilot por ícone neutro; remover import residual do Marketplace; adicionar lint/CI que bloqueie `Sparkle`/`Sparkles` nas superfícies aplicáveis. | `src/components/commerce/product-ai-sdr-chat.tsx:5,199,208,275`; `src/components/shell/context-sidebar.tsx:21,50,139-260`; `src/routes/_store.marketplace.index.tsx:23`. | Guard de CI falha para qualquer ocorrência proibida; produção não importa nem renderiza esses ícones.
|
| 22 | **P2** | **Eliminar fallback de loja fictícia no público.** Sem binding persistente, renderizar `unconfigured/error` e bloquear publicação; manter fixture somente no preview do editor. | `src/components/commerce/experience-renderer.tsx:641-673` cria `Nossa Loja`/`loja`. | Rota pública nunca mostra identidade fictícia sem binding real.
|
| 23 | **P2** | **Corrigir Sparkles em schema, seeds e CMS.** Trocar default de `public.ai_skills.icon`, migrar existentes, adicionar allowlist/check; corrigir seed da Squad de Marketing e hotpage `beleza-sem-hora`; validar no serviço CMS. | `20261207000000...:17`; `20261214000000...:172-185`; `20260815120000...:203-212`. | Migrações/seed idempotentes e catálogo/renderização sem valor proibido.
|
| 24 | **P2** | **Preservar erro/degraded na home e no webhook inbound.** Não converter falha de banco em `[]`; exibir retry/estado degradado com correlation ID. Para WhatsApp inbound, persistir via outbox idempotente e só responder 200 após confirmação. | `src/routes/_store.index.tsx:147-161,181-198`; `src/routes/api.webhooks.whatsapp.ts:105-145`. | Falha operacional é distinguível de conjunto vazio e a Meta recebe retry quando persistência não confirma.
|
| 25 | **P2** | **Substituir teste de isolamento baseado em mocks por integração/E2E.** Manter unit test da transformação, mas executar rotas, banco/migrations, status/tenant/origem e destino do CTA reais. | `src/routes/__tests__/_store.marketplace.index.test.ts:5-21,42-105` usa `MockUnifiedListing`/dados locais e não importa Route, Supabase ou HTTP. | Pelo menos um teste contra backend real prova isolamento, autorização, status e CTA.
|
## Bloqueadores operacionais de validação

1. **Banco não pôde ser validado pelo script de buckets:** `timeout 20s node scripts/check-storage-buckets.mjs` falhou com `PostgresError password authentication failed` (código `28P01`). Isso impede declarar o estado runtime dos buckets; não é evidência de que estejam corretos.
2. **Typecheck não é um gate confiável neste conjunto de auditorias:** há um relatório que registra `npm run typecheck` sem erros, mas outros registram timeout superior a 120/180s ou OOM de `tsc`. O estado atual deve ser reproduzido em ambiente estável antes de declarar verde.
3. **Ausência de E2E/integration para vários controles:** os testes focados passaram, porém os próprios auditores registram mocks/unit tests e ausência de prova de RLS, storage, gateway, worker ou HTTP real.

## Contradições identificadas

1. **Dados persistentes do marketplace vs DTO sintético:** a afirmação de que o feed/ofertas usa somente fatos comerciais persistidos é incompatível com `marketplace.functions.ts`, que fixa rating, reviews, distância, abertura, entrega e estoque; o filtro de desconto real não torna os demais campos reais.
2. **“Ofertas verificadas/disponíveis” vs ausência de fonte:** `/ofertas` exibe os DTOs sintéticos e transforma estoque desconhecido em `true`; a UI não pode sustentar verificação/disponibilidade por esses dados.
3. **Recarga server-side/antifraude vs webhook não autenticado/reconciliado:** `processTokenRechargeWebhook` aceita assinatura opcional não verificada e o caminho PIX aceita valor/pacote/tokens do body/metadata; idempotência sozinha não é antifraude.
4. **Autorização server-side de listings vs handlers privilegiados sem objeto/tenant:** `publish`, `transition`, moderação e auto-expiração não têm os guards declarados, enquanto `service_role` bypassa RLS.
5. **Checkout determinístico/isolado vs autoridade do cliente:** preço, título, store, frete e opção de frete vêm do chamador; não há busca de variante, conferência de estoque/loja ou transação completa.
6. **Download pago e privado vs URL pública em fallback:** o caminho de signed URL não verifica identidade, compra, limite ou validade e retorna `getPublicUrl` em erro.
7. **DTO público seguro vs `select(*)` privilegiado:** o retorno de classificados inclui, conforme evidência, telefone, `pix_key`, instruções e settings; a sanitização parcial não equivale a allowlist pública.
8. **Linhagem Marketplace/Classificados preservada vs origem descartada:** a rota carrega `origin=workspace`, mas o mapeamento para `OfferCard` o perde e o card sempre usa rota/CTA de produto.
9. **View canônica segura para descoberta vs `UNION ALL` sem filtro:** a view não restringe status, moderação ou expiração; as consultas públicas filtram `active`, mas não a validade temporal.
10. **Gate Apple HIG/design concluído vs gate vermelho:** `npm run lint:design` registrou 14.288 violações e regressões P0/DL-04/styles acima do baseline.
11. **Sparkles proibido vs código de produção:** o ícone é importado/renderizado no SDR, na sidebar Copilot e permanece como import residual no Marketplace.
12. **Sparkles proibido vs dados executáveis persistentes:** schema de AI skills, seed de squad e hotpage CMS gravam `Sparkles`.
13. **Todo contato WhatsApp protegido vs bypass direto:** `store-contact.tsx` monta `wa.me` diretamente sem gate/lead; o gate canônico existe, mas não cobre essa superfície.
14. **Lead persistido em sucesso vs fallback fabricado:** falhas de RPC retornam `success:true`, código aleatório e/ou autorização positiva sem linha confirmada.
15. **Webhook WhatsApp autenticado e confiável vs ausência de HMAC/confirmação:** o POST processa JSON sem `X-Hub-Signature-256` e responde sucesso mesmo com falha de gravação.
16. **Uploads reais isolados/protegidos vs universal arbitrário:** o handler aceita bucket/folder livres, usa service role, cria bucket público e retorna URL pública; policies finais também não restringem namespace a tenant.
17. **MagicAI “configuração concluída” vs persistência condicional:** sem `storeId`, o pipeline não persiste e ainda retorna `success:true` exibido como concluído.
18. **Jobs assíncronos concluídos vs apenas `queued`:** o gateway insere jobs, mas não foi encontrado worker que faça claim, execute, grave resultado ou conclua/falhe.
19. **Matriz dinâmica de roteamento vs constante hardcoded:** regras em `ai_task_routing_rules` não são lidas pelo gateway; alterações no painel não mudam o provider real.
20. **Segredos server-side vs base64/plaintext/exposição:** API keys são codificadas com base64 ou armazenadas em `api_key`, e o fallback mestre é literal/conhecido; isso contradiz cifragem e isolamento declarados.
21. **Typecheck verde vs execução inconclusiva:** um documento registra sucesso, enquanto outros registram timeout ou OOM; portanto não há evidência consistente de um gate verde no estado auditado.

## Evidências positivas preservadas (não anulam os blockers)

- A home chama Marketplace e Classificados separadamente; `/marketplace` usa `origin=workspace` e não agrega classificados por esse caminho.
- O builder possui persistência real em `experience_versions`/`experience_nodes`; o problema específico é o fallback público sem binding.
- O bucket `classifieds` existe em migração e é usado pelo serviço; isso não torna seguros os handlers universais nem os documentos legais.
- O sitemap consulta páginas, produtos, classificados, turismo, empregos, notícias e lojas publicados/ativos.
- `npm run audit:buttons` encontrou 1.024 arquivos/6.145 controles e zero achados estáticos P0/P1/P2; isso não substitui E2E.
- A rota PIX verifica HMAC do corpo bruto e retorna 401 para assinatura inválida; ainda falta a reconciliação de pagamento/pacote/valor/tokens.
- Há caminho melhor de upload (`getSignedUploadUrl`) com enum, MIME, identidade e rate limit, mas ele não cobre os handlers universais/direct.
- O gateway/integrações e testes focados demonstram chamadas reais em alguns caminhos, mas os resultados não provam autorização, isolamento, worker ou persistência de produção.
