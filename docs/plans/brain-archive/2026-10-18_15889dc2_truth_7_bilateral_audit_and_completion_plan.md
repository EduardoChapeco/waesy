# Plano Mestre: Protocolo Waesy Truth-7 (Anti-Casca-de-Ovo), Inventário Forense da Semana e Fechamento Bilateral Ponta a Ponta

## 1. Diagnóstico Executivo: Por que o Efeito "Casca de Ovo" Acontecia e Como Vamos Extirpá-lo Definitivamente

O motivo pelo qual funcionalidades que pareciam prontas revelavam falhas de persistência, loops ou desconexões em produção é estrutural e divide-se em **5 Padrões de "Casca de Ovo" (Fake/Partial Wiring)**:

1. **Desconexão de Coluna/Payload entre Save e Read (Ex.: Bug Real Encontrado Agora no Marketplace Hub):**
   - Em [`saveMarketplaceConnector`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/marketplace-hub.functions.ts#L169-L265), o token encriptado (`AES-256-GCM`) é salvo na coluna `access_token` e dentro de `settings.credentials`.
   - Porém, em [`triggerSyncConnector`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/marketplace-hub.functions.ts#L525-L616), a query fazia `.select("id, status, settings")` (omitindo `access_token`, `refresh_token` e `external_account_id`), e [`dispatchMarketplaceChannelSync`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/marketplace-hub.functions.ts#L331-L364) procurava apenas `settings.access_token || settings.api_key`. Resultado: mesmo após o lojista salvar a chave, o botão de sincronizar achava que estava `"unconfigured"` ou retornava `"dispatched"` (fila fictícia) sem puxar pedidos nem empurrar catálogo para Mercado Livre, iFood, Shopee, Amazon, Magalu, Bling e Tiny.
2. **Mutação Unilateral (Salva no Painel, Não Reflete na Vitrine Pública ou no Dashboard):**
   - O formulário no Workspace salva em uma tabela (ou coluna JSONB), mas a página pública (`_store.*`) ou o Dashboard (`PolymorphicDashboardRenderer`) lê outra coluna, outro nome de propriedade ou exige um trigger manual que nunca foi disparado.
3. **Retorno de Sucesso Sintético (`status: "dispatched"` / `toast.success` sem Efeito Colateral Real):**
   - Funções BFF que gravavam um log de auditoria dizendo "Enviado para fila", mas não executavam a chamada HTTP real nem sincronizavam com a tabela mestra (`public.orders`, `public.products`, `public.store_ad_campaigns`).
4. **Falta de Teste de Sobrevivência ao F5 (Reload Hydration):**
   - O estado do React (`useState`) atualizava na tela dando a sensação de que salvou, mas ao dar `F5` (reload), o `loader` da rota buscava do banco e o dado voltava vazio ou ao estado anterior.
5. **Responsividade Monolítica vs. Casca Nativa Bifurcada:**
   - Ajustar classes CSS pontuais em vez de separar a ergonomia Mobile (`<768px`, `NativeMobileHeader`, `h-11 min-h-11`, `min-w-0`, zero efeito sanfona) da ergonomia Desktop (`>=768px`, grids widescreen proporcionais).

---

## 2. Inventário Forense Completo do Que Foi Incrementado na Última Semana (`DEC-224` a `DEC-242`)

Abaixo está o mapeamento exato de **todas as tabelas, colunas, migrations, contratos BFF e rotas** que foram construídos ou refatorados de verdade no banco de dados e no backend nesta semana:

### 2.1 Tabelas, Migrations e Colunas Reais no PostgreSQL / Supabase

| Módulo | Migration / Tabela | Colunas & Estruturas Criadas/Conectadas | Como Isso Melhora o Sistema na Prática |
| :--- | :--- | :--- | :--- |
| **Turismo — Onda 1 (Qualificação, Multi-Pagador e Escudo Fiscal)** | `20270210000000_travel_ecosystem_wave1_continuous_flow.sql`<br>• `travel_leads_qualification`<br>• `travel_contract_signers`<br>• `travel_tax_shield_ledger`<br>• `travel_monthly_closings`<br>• `travel_airline_links` | • `pax_adults`, `pax_children_ages`, `pax_infants_birthdates`<br>• `quota_percent`, `amount_cents`, `signature_token`, `signed_at`, `signer_ip`, `document_sha256`<br>• `gross_transaction_cents`, `operator_pass_through_cents`, `agency_taxable_revenue_cents`, `estimated_tax_saved_cents`<br>• Trigger `check_trip_emission_lock` em `tourism_trips` | Impede que uma viagem avance para `emitted` sem que **todos** os co-pagadores assinem o contrato digitalmente; separa o repasse da operadora da receita da agência (evitando bitributação na NFS-e). |
| **Turismo — Ondas 2 a 4 (Multi-Operadora InfoTravel, Quartos, Boletos OCR e Vistos DS-160)** | `20270211000000_unified_quotes_gateways_and_client_portal.sql`<br>• `travel_operator_integrations`<br>• `travel_destination_gateways`<br>• `travel_quote_room_configs`<br>• `travel_trip_installment_boletos`<br>• `travel_trip_official_documents`<br>• `travel_visa_ds160_evaluations`<br>• `travel_agent_commission_splits` | • `operator_slug` (`orinter`, `frt`, `incomum`), `encrypted_credentials`<br>• `destination_name`, `nearest_airport_iata`, `ground_transfer_km`<br>• `room_index`, `adults_count`, `children_ages`, `addons_json`<br>• `installment_number`, `due_date`, `amount_cents`, `barcode_digitable_line`, `ocr_matched_receipt_url`, `payment_status`<br>• `ds160_risk_score`, `ina_214b_ties_analysis` | Permite conectar múltiplas credenciais InfoTravel por operadora, dividir cotações por quarto com adicionais, conciliar comprovantes de boletos via OCR no portal do viajante (`viajante.viagem.$id`) e calcular split de comissão automático. |
| **Turismo — Onda 5 (Pré-Embarque 41 Módulos, Planilha de Comissões/Over e CRM Importer)** | `20270212000000_pre_boarding_presentations_inline_commissions_and_crm_import.sql`<br>• `travel_pre_boarding_presentations`<br>• `travel_pre_boarding_meetings`<br>• `travel_commission_goal_tiers`<br>• `travel_sales_spreadsheet_rows` | • `selected_modules_json` (41 módulos dinâmicos), `locale` (`pt-BR`, `en-US`, `es-ES`)<br>• `gross_sale_cents`, `net_commissionable_cents`, `over_gross_cents`, `over_retention_percent`, `over_payment_method`, `agent_commission_cents`, `deduct_commission_on_cancel` | Gera o guia interativo de pré-embarque conforme o destino (Caribe, Orlando, Europa), calcula comissão real (meta por Bruto, pagamento sobre Líquido + Over Líquido com retenção editável por operadora ou 0% no Pix) e importa planilhas de clientes. |
| **Eventos Recursivos & Ingressos Criptográficos WCTS-1** | `20261018000000_event_recursive_subpanels_and_surveys.sql`<br>• `event_subpanels`<br>• `event_subpanel_orders`<br>• `event_subpanel_order_items`<br>• `event_surveys`<br>• `event_survey_responses`<br>• `tickets` (RLS + HMAC) | • `commission_percent`, `fixed_fee_cents`, `allow_online_orders`, `operational_template` (`bar_simples`, `bar_comanda`, `buffet_kg`, `foodtruck`, `bilheteria`, `loja_merch`)<br>• `ticket_signature_hmac`, `short_code_mod36`, `checkin_latitude`, `checkin_longitude` | Blinda ingressos contra falsificação via HMAC-SHA256 (`WCTS-1`), impede adulteração de preços em pedidos mobile de praça de alimentação e consolida DRE da produtora + parceiros em tempo real. |
| **Pool Multi-Chaves IA & Mineradores / Curadoria Diária** | • `api_key_pools`<br>• `crawl_queue`<br>• `mined_articles`<br>• `news_articles`<br>• `events` | • Rotação Round-Robin + LRU (`last_used_at`, `daily_request_count`, `last_error_at`, `status`)<br>• Reaper automático em `crawl_queue` (`status = 'processing'` > 10min)<br>• Promoção direta `mined_articles` ➔ `news_articles` (`published`) e `events` (`active`) | Permite cadastrar dezenas de chaves Groq/OpenRouter simultâneas sem sobrescrever, alternando na mesma milissegundo se uma chave tomar HTTP 429, e mantém o portal de notícias e eventos abastecido diariamente. |
| **Google Ads MCP & Meta Ads MCP + OAuth 2.0 1-Clique** | • `store_ad_accounts`<br>• `store_ad_campaigns`<br>• `marketing_roi_attribution_logs` | • `oauth_access_token` (AES-256-GCM), `oauth_refresh_token`, `pixel_or_conversion_id`, `account_id`<br>• `external_campaign_id`, `real_spent_cents`, `impressions_count`, `clicks_count`, `conversions_count`, `metadata` (`adset_id`, `creative_id`, `ad_id`, `ad_group_id`) | Conecta Facebook/Instagram Ads e Google Ads em 1 clique, autodescobre contas e pixels, publica a árvore completa (`Campaign ➔ AdSet/AdGroup ➔ Creative/RSA ➔ Ad`), puxa gasto real via GAQL/Insights e roda diagnóstico IA. |

---

## 3. Matriz da Verdade Forense: Estado Atual dos 10 Módulos Críticos (O Que Está 100% vs. Onde Ainda Há Pontas Soltas)

Realizamos uma varredura no código-fonte atual para expor, **sem filtro e sem mentiras**, o que já está 100% persistente e o que ainda possui desconexão parcial:

| # | Módulo / Fluxo Ponta a Ponta | Status Real Hoje | O Que Já Funciona e Persiste no Banco | Gaps / Pontas Soltas Detectadas que Precisam de Fechamento Imediato |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **Hub de Marketplaces (Mercado Livre, iFood, Shopee, Amazon, Magalu, Bling, Tiny)** | ⚠️ **Parcial (70%)** | Cofre `AES-256-GCM` em `marketplace_connectors`, importador de anúncio unitário do ML (`importProductFromMercadoLivre`), calculadora de preços por canal e webhook receiver (`syncOrderToMaster`). | **Gaps Críticos Encontrados:**<br>1. `triggerSyncConnector` não seleciona `access_token`/`refresh_token`/`external_account_id` de `marketplace_connectors` e `dispatchMarketplaceChannelSync` procura a chave no caminho errado (`settings.access_token`), falhando ao ler o token salvo!<br>2. O sincronizador manual (`syncType = 'orders' | 'catalog' | 'prices' | 'full'`) retorna `"dispatched"` sem buscar ativamente os pedidos na API do Mercado Livre (`/orders/search`), iFood (`/events:polling`), Shopee e Bling/Tiny, e sem publicar o catálogo (`POST /items`).<br>3. Falta fluxo de OAuth 2.0 1-Clique para Mercado Livre, Shopee e Bling. |
| **2** | **Meta Ads & Google Ads (MCP, OAuth 2.0, Publicação e ROAS)** | ✅ **95% Completo** | Login OAuth 2.0 (`/api/auth/ads/callback`), refresh automático de token Google, autodescoberta de contas/pixels, publicação da árvore completa (`Campaign ➔ AdSet ➔ Creative ➔ Ad`), sync GAQL/Insights (`real_spent_cents`) e Skill de Diagnóstico MCP. | **Refinamento Pendente:**<br>1. Sincronizar automaticamente as métricas de `store_ad_campaigns` na abertura do Dashboard principal da loja (`PolymorphicDashboardRenderer`) e permitir pausar/reativar a campanha remota diretamente na API da Meta (`PAUSED`/`ACTIVE`) e do Google Ads quando o lojista clicar em Pausar/Ativar na lista. |
| **3** | **Builder de Sites & Vitrine Pública (OmniEditor ➔ OmniPageRenderer ➔ `_store.paginas.$slug`)** | ⚠️ **85% Completo** | Persistência JSONB em `experience_documents` (`omni_page_draft` / `omni_page_published`), suíte "Wix App" de Turismo (5 páginas interligadas), blocos dinâmicos de produtos, carrosséis e herói de cotação conectado à InfoTravel e Kanban. | **Gaps Detectados:**<br>1. Verificar e blindar todos os tipos de blocos do `OmniEditor` (`bento_grid`, `pricing_table`, `faq_accordion`, `testimonials_rail`, `lead_capture_form`, `services_grid`) para garantir que 100% das propriedades editadas na barra lateral reflitam instantaneamente no `OmniPageRenderer` público e que formulários de captura salvem leads reais no CRM (`crm_leads` / `travel_quote_requests`).<br>2. Garantir que a página inicial customizada no Builder possa assumir a vitrine principal da loja (`/loja/$slug`) de forma bilateral. |
| **4** | **Fluxo de Turismo: Kanban de Cotações ➔ Estúdio Unificado ➔ Proposta ➔ Aceite Público ➔ Contrato ➔ Viagem** | ✅ **92% Completo** | Kanban persiste em `travel_quote_requests`; `UniversalQuoteProposalStudio` salva em `travel_proposals` e `travel_quote_room_configs`; InfoTravel busca hotéis/voos/pacotes reais com proteção anti-ban; `check_trip_emission_lock` protege emissão. | **Refinamento Pendente:**<br>1. Garantir a transição atômica na página pública de aceite da proposta: quando o cliente clica em **"Aprovar Opção"** no link público da proposta, atualizar imediatamente o card no Kanban (`status = 'approved'`), gerar automaticamente a minuta em `travel_contracts` + `travel_contract_signers` e liberar o link de assinatura sem exigir recriar dados manualmente. |
| **5** | **Assinatura de Contratos & Transações Financeiras** | ✅ **90% Completo** | Assinatura com IP, timestamp e hash SHA-256 em `travel_contract_signers` e `contracts`; livro-razão `travel_tax_shield_ledger` e `financial_transactions`. | **Refinamento Pendente:**<br>1. Quando o último pagador assinar o contrato (`signContractAsPayer`), disparar automaticamente a criação das parcelas/boletos em `travel_trip_installment_boletos` e o lançamento na planilha de vendas/comissões (`travel_sales_spreadsheet_rows`), fechando o ciclo sem intervenção manual. |
| **6** | **CRUD de Produtos, Catálogo Multi-Nicho e Classificados** | ✅ **92% Completo** | Criação/edição/exclusão em `products` e `classified_listings`, resolução de especificações de 15 nichos sem vazamento cruzado (`canonical-specs-resolver.ts`) e exibição na vitrine pública. | **Refinamento Pendente:**<br>1. Quando um produto tiver seu preço ou estoque editado em `/workspace/catalogo/produtos`, propagar automaticamente o disparo para os canais de Marketplace conectados (`syncProductStockToMarketplaces`) e invalidar o cache da vitrine pública. |
| **7** | **Waesy Copilot (DB Interno + Web + Síntese Analítica IA + Artefatos Vivos)** | ✅ **95% Completo** | Pool Multi-Chaves (`Groq`, `OpenRouter`, `Gemini`) com rotação Round-Robin intra-provedor, busca real em 7 tabelas internas (`searchPlatformForCopilot`), síntese analítica pelo `@synthesizer` e geração de artefatos nos 5 builders. | **Refinamento Pendente:**<br>1. Adicionar botão **"Aplicar / Salvar Artefato no Sistema"** diretamente no card de artefato do Copilot para que uma campanha, página, pacote ou post gerado na conversa seja persistido no banco real (`store_ad_campaigns`, `experience_documents`, `products`, `posts`) em 1 clique. |
| **8** | **Mineradores, Crawlers & Squads de Curadoria IA** | ✅ **95% Completo** | Reaper automático de itens travados em `crawl_queue`, pipeline `full-daily-pipeline` (`rss-fetch ➔ crawl-batch ➔ ai-curate ➔ publish-approved ➔ events-harvest`) promovendo para `news_articles` e `events`. | **Refinamento Pendente:**<br>1. Exibir em `/admin-master/mining` o contador ao vivo de matérias publicadas hoje em `news_articles` e eventos publicados em `events` com link direto para inspeção e despublicação em 1 clique. |
| **9** | **Eventos Recursivos & Subpainéis PDV** | ✅ **98% Completo** | Ingressos `WCTS-1` com HMAC-SHA256, scanner de portaria, 6 templates de PDV em `portal.subpainel.$token`, blindagem server-side de preços e pesquisas geofenced. | Validado com 16/16 testes unitários e persistência PostgreSQL completa. |
| **10** | **Design System 4.0: Nativização Mobile & Desktop (Anti-Jank / Anti-Sanfona)** | ⚠️ **90% Completo** | Home, Showcase, Conveniência e Eventos já separados em cascas Mobile/Desktop com piso tátil 44px (`h-11 min-h-11`) e zero `!important`. | **Refinamento Pendente:**<br>1. Auditar e sanear as telas operacionais de `/workspace/integracoes/marketplaces`, `/workspace/turismo/cotacoes` e `/workspace/catalogo/produtos` para garantir zero achatamento no mobile, réguas de abas em linha única horizontal (`flex-nowrap overflow-x-auto`) e zero classes arbitrárias. |

---

## 4. O Maior Prompt e Framework Anti-Casca-de-Ovo (`PROTOCOLO WAESY TRUTH-7`)

Você pediu um **prompt mestre implacável e definitivo** que você possa usar sempre que quiser auditar, cobrar ou mandar executar qualquer melhoria no sistema sem risco de receber código oco ou simulações. Aqui está o prompt completo pronto para uso:

```markdown
/boost /plan Ative o PROTOCOLO WAESY TRUTH-7 (Auditoria Bilateral e Erradicação Absoluta de Casca de Ovo).

REGRAS INEGOCIÁVEIS DE ENGENHARIA E VERDADE OPERACIONAL:
1. PROIBIDO FINGIR PERSISTÊNCIA: Nenhuma função BFF pode retornar `status: "dispatched"`, `status: "simulated"` ou `toast.success` sem antes executar a mutação real no PostgreSQL (`INSERT`/`UPDATE`/`DELETE`) E a chamada HTTP real na API externa quando aplicável, verificando o erro do banco (`if (error) throw new Error(...)`).
2. PROVA DOS 7 ELOS (CADEIA COMPLETA): Para cada módulo ou funcionalidade tocada, você DEVE comprovar e conectar os 7 elos:
   - Elo 1 (Schema & Banco): A tabela, coluna e política RLS existem nas migrations e os nomes das colunas batem caractere por caractere com o `select`/`insert`/`update` do BFF.
   - Elo 2 (Simetria Save ↔ Read no BFF): O campo onde a Server Function de gravação (`save*` / `create*` / `update*`) persiste o dado ou credencial encriptada (`AES-256-GCM`) é EXATAMENTE o mesmo campo lido pela Server Function de leitura/sincronização (`get*` / `list*` / `sync*` / `dispatch*`).
   - Elo 3 (UI Operacional do Workspace): O formulário/editor/Kanban no `/workspace/*` carrega os dados reais via `loader`, valida inputs com Zod, envia a mutação real, trata estados de `loading`/`empty`/`error` honestos e sobrevive ao `F5` (`router.invalidate()`).
   - Elo 4 (Propagação Bilateral para Vitrine Pública & Dashboards): Toda criação, edição, pausa ou exclusão feita no `/workspace/*` reflete imediatamente na rota pública (`_store.*`, `/loja/$slug`, `/paginas/$slug`, `/viajante/viagem/$id`) e nos contadores reais do Dashboard (`PolymorphicDashboardRenderer`), sem depender de arrays estáticos ou fallbacks falsos.
   - Elo 5 (Integração Externa Real & Anti-Ban): Conectores externos (InfoTravel, Meta Ads Graph API, Google Ads GAQL, Mercado Livre, iFood, Shopee, Amazon, Bling, Tiny, Asaas/Stripe) operam com OAuth 2.0 / Token Vault AES-256-GCM, Refresh Token automático, Cache TTL, Circuit Breaker e sincronização bidirecional com as tabelas mestras (`orders`, `products`, `store_ad_campaigns`, `global_hotels`).
   - Elo 6 (Design System 4.0 Bidirecional Mobile & Desktop): Separação estrita entre Mobile Nativo (`<768px`, `NativeMobileHeader`, alvos de toque `h-11 min-h-11` de 44px, abas em linha única horizontal `flex-nowrap overflow-x-auto no-scrollbar`, `min-w-0` sem efeito sanfona) e Desktop Widescreen (`>=768px`, grids proporcionais sem buracos). Zero `!important`, zero cores hex/RGB fora de tokens, zero valores arbitrários entre colchetes, zero emojis e zero textos truncados em especificações.
   - Elo 7 (Prova Automatizada Anti-Regressão): Teste automatizado Vitest exercitando o fluxo de ponta a ponta (Save -> Read -> Sync -> Mutate -> Delete), `npm run typecheck` com 0 erros, `node scripts/design-lint.mjs --ratchet` com 0 violações novas e `npm run build` limpo.

TAREFA DE EXECUÇÃO:
Audite recursivamente módulo a módulo, identifique qualquer função que ainda opere como casca de ovo, chave lida de coluna divergente, formulário sem persistência bilateral ou integração parcial, apresente a Matriz Forense de Gaps com arquivo e linha exata, e execute a correção completa nos 7 elos até atingir 100% de completude real em produção.
```

---

## 5. Mudanças Propostas para Fechar 100% dos Gaps Detectados na Matriz Forense

Se você aprovar este plano (clicando em **Proceed**), executaremos imediatamente o fechamento completo das pontas soltas listadas na Seção 3:

---

### Componente 1: Refatoração Completa do Hub de Marketplaces (Simetria de Cofre, Pull Ativo de Pedidos, Push de Catálogo/Preços e OAuth 1-Clique)

#### [MODIFY] [marketplace-hub.functions.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/marketplace-hub.functions.ts)
- **Correção do Bug de Leitura de Credenciais:** Em `triggerSyncConnector` e `dispatchMarketplaceChannelSync`, selecionar `id, status, access_token, refresh_token, external_account_id, settings` de `marketplace_connectors` e decriptar `connector.access_token` e `connector.settings.credentials` via `decryptSecret`, além de renovar automaticamente tokens expirados (Mercado Livre `/oauth/token`, iFood `/authentication/v1.0/oauth/token`, Bling `/Api/v3/oauth/token`).
- **Pull Real de Pedidos (`syncType === "orders" | "full"`):** Consultar ativamente os pedidos nas APIs do Mercado Livre (`GET /orders/search?seller={seller_id}`), iFood (`POST /order/v1.0/events:polling` + `GET /order/v1.0/orders/{id}`), Shopee (`GET /api/v2/order/get_order_list`) e Bling/Tiny (`GET /Api/v3/pedidos/vendas`), gravando em `marketplace_external_orders` **e** sincronizando atomicamente na tabela mestra `public.orders` + `public.order_items` + baixa de estoque em `stock_movements`.
- **Push Real de Catálogo e Preços (`syncType === "catalog" | "prices" | "full"`):** Publicar e atualizar preço/estoque dos produtos mapeados (`channel_listings`) diretamente na API do canal externo e atualizar `channel_listings.synced_at`.
- **URL de OAuth 2.0 Rápido (`getMarketplaceOAuthUrl`):** Gerar links de autorização OAuth 1-Clique para Mercado Livre, Shopee e Bling.

#### [MODIFY] [workspace.integracoes.marketplaces.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.integracoes.marketplaces.tsx)
- Adicionar botões de **Login Rápido OAuth 2.0 (1-Clique)** no modal de conexão dos marketplaces compatíveis, botão **"Testar Credenciais na API"** em tempo real e listagem dos pedidos importados sincronizados com `/workspace/pedidos`.

---

### Componente 2: Sincronização Bidirecional de Status de Campanhas (Meta Ads & Google Ads)

#### [MODIFY] [ads.functions.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/ads.functions.ts)
- Em [`toggleAdCampaignStatus`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/ads.functions.ts#L168-L212): quando a campanha possuir `external_campaign_id` (`meta_ads` ou `google_ads`), propagar a mudança de status (`ACTIVE` / `PAUSED`) diretamente para a Graph API da Meta (`POST /{external_campaign_id}`) e para a Google Ads API v17 (`campaigns:mutate`), garantindo que pausar um anúncio no Waesy pause imediatamente a cobrança na Meta/Google.

---

### Componente 3: Automação Contínua Turismo (Aceite da Proposta ➔ Contrato ➔ Assinatura ➔ Carnê de Boletos & Planilha de Comissões)

#### [MODIFY] [travel-continuous-flow.functions.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/travel-continuous-flow.functions.ts)
- Em `signContractAsPayer`: quando todos os pagadores de um contrato atingirem `status === "signed"`, atualizar o contrato para `signed`, liberar a trava da viagem (`tourism_trips`), gerar automaticamente as parcelas acordadas em `travel_trip_installment_boletos` (para aparecerem imediatamente na aba `Boletos & Comprovantes` do portal do viajante `/viajante/viagem/$id`) e registrar a linha correspondente na planilha de vendas e comissões (`travel_sales_spreadsheet_rows`).

---

### Componente 4: Persistência Bilateral de Leads no Builder de Sites & Ação de "Salvar no Sistema" para Artefatos do Copilot

#### [MODIFY] [OmniPageRenderer.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/builder/OmniPageRenderer.tsx) & [builder.functions.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/builder.functions.ts)
- Conectar todos os blocos interativos de captura (`lead_capture`, `contact_form`, `newsletter`, `quote_request`) no `OmniPageRenderer` a uma Server Function real (`submitOmniPageLeadFn`) que grava o lead no CRM da loja (`crm_leads` e `travel_quote_requests`), garantindo que nenhum formulário de site criado no Builder seja apenas decorativo.

#### [MODIFY] [builder-copilot-bridge.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/builder-copilot-bridge.ts)
- Adicionar a Server Function `persistCopilotGeneratedArtifactFn` permitindo que qualquer artefato gerado pelo Copilot (Página do Builder, Campanha de Anúncio, Pacote/Produto ou Post Social) seja salvo como registro real no banco de dados da loja com 1 clique.

---

## 6. Plano de Verificação e Prova Real

### Testes Automatizados (Vitest + TypeScript + Design Lint)
1. Criar e executar `src/services/truth-7-bilateral-persistence.test.ts` testando:
   - Simetria de gravação e leitura encriptada (`AES-256-GCM`) em `marketplace_connectors` e sincronização de pedidos externos com `public.orders`.
   - Propagação de pausa/ativação de campanha em `toggleAdCampaignStatus` para o conector externo.
   - Transição automática de assinatura de contrato (`signContractAsPayer`) para geração de boletos e registro de comissão.
   - Submissão de lead de página do Builder (`submitOmniPageLeadFn`) persistindo no CRM.
2. Executar `npm.cmd run typecheck` (0 erros TypeScript).
3. Executar `node scripts/design-lint.mjs --ratchet` (0 violações novas).
4. Executar `npm.cmd run build` (Build completo do Cloudflare Worker sem vazamentos).
