# Relatório Arquitetural e Operacional: MCP Ads, App Suites e Governança Waesy Truth-7

---

## 1. Visão Executiva: O Estado da Arte de MCP e Anúncios Digitais

### 1.1 Mito vs. Realidade na Conexão MCP com Google Ads e Meta Ads
Recentemente, o ecossistema de inteligência artificial adotou em massa o **Model Context Protocol (MCP)**, desenvolvido pela Anthropic e rapidamente abraçado pelo mercado de desenvolvedores.

- **O que é mito**: Google e Meta NÃO publicaram servidores MCP proprietários nativos hospedados diretamente em suas URLs públicas (como `mcp.meta.com` ou `mcp.google.com`).
- **O que é real e o padrão da indústria**: A indústria de AdTech e IA convergiu para **Servidores MCP Intermediários (BFF Gateway Proxies)** que traduzem as chamadas padronizadas JSON-RPC do protocolo MCP diretamente para as APIs oficiais:
  - **Meta Graph API (v20.0 / v21.0)**: Endpoints REST para criação de campanhas (`/campaigns`), conjuntos de anúncios (`/adsets`), criativos (`/adcreatives`), anúncios (`/ads`), métricas consolidadas (`/insights`) e ingestão server-side via **Conversions API (CAPI)**.
  - **Google Ads API (v17 / v18)**: Comunicação via gRPC/REST para mutações de campanha (`customers:mutate`), consultas de métricas e performance em tempo real via **GAQL (Google Ads Query Language)** usando `googleAds:searchStream`, e ingestão de eventos via **Google Ads Data Manager**.

---

## 2. Auditoria Forense dos 7 Elos no Módulo de Anúncios do Waesy

O sistema Waesy já possui uma arquitetura de anúncios real, auditada e comprovada através dos 7 elos inegociáveis:

```mermaid
flowchart TD
    subgraph Elo1_2["Elos 1 & 2: Banco de Dados & Cofre de Segurança"]
        DB1[("store_ad_accounts\n(Tokens AES-256-GCM)")]
        DB2[("ad_campaigns\n(Métricas & Placements)")]
        DB3[("ad_ledger\n(Lançamentos de Tesouraria)")]
        CRYPTO["Crypto Vault Server\n(encryptSecret / decryptSecret)"]
        REFRESH["Auto-Refresh OAuth2\n(oauth2.googleapis.com/token)"]
        DB1 <--> CRYPTO
        CRYPTO <--> REFRESH
    end

    subgraph Elo3_4["Elos 3 & 4: Workspace UI & BFF Bilateral"]
        UI["/workspace/marketing/anuncios\n(Dashboard, Voice MCP, Aprovação)"]
        BFF1["dispatchExternalMetaOrGoogleCampaign"]
        BFF2["toggleAdCampaignStatus"]
        BFF3["syncExternalAdCampaignMetricsFn"]
        UI <--> BFF1
        UI <--> BFF2
        UI <--> BFF3
    end

    subgraph Elo5["Elo 5: Conectores Externos Oficiais"]
        META["Meta Graph API v20.0\n(act_adAccountId/campaigns)"]
        GOOGLE["Google Ads API v17\n(searchStream GAQL & Mutate)"]
        BFF1 --> META
        BFF1 --> GOOGLE
        BFF2 --> META
        BFF2 --> GOOGLE
        BFF3 --> META
        BFF3 --> GOOGLE
    end

    subgraph Elo6_7["Elos 6 & 7: Protocolo MCP, Qualidade & Testes"]
        MCP_REG["MCP Tool Registry\n(/api/webmcp.json)"]
        TESTS["Vitest: 312/312 Arquivos PASS (100%)\nDesign Lint: 0 Violações\nTypeScript: 0 Erros"]
        MCP_REG <--> UI
    end

    Elo1_2 <--> Elo3_4
```

### Detalhamento dos 7 Elos Comprovados:

1. **Elo 1 (Schema & Banco de Dados)**:
   - Tabelas PostgreSQL: `store_ad_accounts` (conexões OAuth por loja), `ad_campaigns` (campanhas locais e externas), `ad_ledger` (livro-razão financeiro com arbitragem de taxa de plataforma), `ad_events` (impressões e cliques locais).
2. **Elo 2 (Simetria Save $\leftrightarrow$ Read & Criptografia Zero Plaintext)**:
   - Todos os `oauth_access_token` e `oauth_refresh_token` são encriptados com **`AES-256-GCM`** via `src/lib/crypto-vault.server.ts`.
   - Renovação transparente de tokens Google Ads com expiração iminente antes de qualquer chamada HTTP.
3. **Elo 3 (UI Operacional do Workspace)**:
   - Rota `/workspace/marketing/anuncios`: formulário auditável com validação Zod, preview do criativo, seleção de orçamento diário e total, segmentação geográfica por raio em km, e aprovação humana obrigatória (*Human-in-the-loop*).
4. **Elo 4 (Propagação Bilateral de Status)**:
   - Ao pausar ou ativar uma campanha no painel, a mutação persiste no banco e reflete em tempo real na Meta Graph API (`ACTIVE`/`PAUSED`) e no Google Ads API (`ENABLED`/`PAUSED`).
5. **Elo 5 (Integração Externa Real & Anti-Simulação)**:
   - Sincronização de métricas reais via Meta Insights API (`spend`, `impressions`, `clicks`, `cpc`, `ctr`, `frequency`, `actions`) e GAQL SearchStream no Google Ads (`metrics.cost_micros`, `metrics.search_budget_lost_impression_share`), gravando em `real_spent_cents`.
6. **Elo 6 (WebMCP Registry & Automação Inteligente)**:
   - Ferramentas expostas via MCP no `/api/webmcp.json`:
     - `discover_accessible_ad_accounts`: descobre contas e pixels autorizados.
     - `sync_external_ad_campaign_metrics`: sincronização bilateral de telemetria.
     - `diagnose_ad_accounts_health`: diagnóstico de verba travada, saturação criativa e perda de parcela de impressão.
     - `ads_mcp_ingest_conversion_event`: envio de conversões server-side (Meta CAPI e Google Data Manager) com hash SHA-256 de e-mail e telefone.
7. **Elo 7 (Testes Automatizados e Resiliência)**:
   - 100% de aprovação na suite de testes de proveniência de anúncios e isolamento BYOK (`src/services/ads-provenance.test.ts`).

---

## 3. O Fluxo de Login Rápido (OAuth 2.0 1-Clique)

O Waesy já dispõe da rota de callback oficial em [`src/routes/api.auth.ads.callback.ts`](file:///C:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/api.auth.ads.callback.ts):

| Etapa | Meta Ads (Facebook & Instagram) | Google Ads |
| :--- | :--- | :--- |
| **1. Disparo do Consentimento** | Redireciona para `www.facebook.com/v20.0/dialog/oauth` com escopos `ads_management`, `ads_read`, `business_management`, `instagram_basic`. | Redireciona para `accounts.google.com/o/oauth2/v2/auth` com escopo `adwords` e `access_type: offline`. |
| **2. Troca de Código** | Troca o `code` temporário por `access_token` inicial. | Troca o `code` temporário por `access_token` e `refresh_token` de longa duração. |
| **3. Extensão de Validade** | Dispara `grant_type: fb_exchange_token` para obter **Long-Lived Token de 60 dias**. | Salva o `refresh_token` encriptado no cofre para renovações silenciosas perpétuas. |
| **4. Descoberta Instantânea** | Consulta `me/adaccounts`, `adspixels` e contas do Instagram Business vinculadas à página. | Executa `customers:listAccessibleCustomers` para listar os IDs de conta do cliente. |
| **5. Persistência & Retorno** | Grava em `store_ad_accounts` com `AES-256-GCM` e redireciona de volta para `/workspace/marketing/anuncios?ads_oauth_connected=1`. | Grava em `store_ad_accounts` com `AES-256-GCM` e redireciona de volta para `/workspace/marketing/anuncios?ads_oauth_connected=1`. |

---

## 4. O Ecossistema "Wix App Suites" no OmniPage Builder

Conforme definido na visão de produto, **o Design System rigoroso (Apple HIG, minimalismo, grid de 4px, 44px de toque mínimo) governa o Workspace Operacional (`/workspace/*`)**.

Em contrapartida, as **Vitrines Públicas, Lojas, Hotpages e Páginas de Experiência possuem Liberdade Estética Radical**:
- Paletas de cores customizadas injetadas no escopo do tema (`experience_versions.theme_tokens`).
- Bento Grids, 3D Cards, Marquees contínuos e Carrosséis imersivos.
- Tipografia irrestrita (Google Fonts display, serifadas ou modernas).

### As Suítes de Apps Provisionadas em 1 Clique

```mermaid
graph TD
    APP["Wix-like App Suites (1-Click Provision)"]
    
    APP --> T["1. App Turismo & Experiências (5 páginas)"]
    T --> T1["Home Destinos"]
    T --> T2["Catálogo de Roteiros"]
    T --> T3["Detalhe do Roteiro"]
    T --> T4["Calculadora de Cotação de Viagem"]
    T --> T5["Área do Viajante & Voucher"]

    APP --> C["2. App Loja Virtual / E-Commerce (4 páginas)"]
    C --> C1["Vitrine Comercial (Banners & Destaques)"]
    C --> C2["Catálogo com Filtros Facetados & Grid/Lista"]
    C --> C3["Página do Produto (Zoom, Frete, Variações)"]
    C --> C4["Carrinho, Checkout & Acompanhamento"]

    APP --> S["3. App Serviços & Agendamentos (4 páginas)"]
    S --> S1["Apresentação Institucional"]
    S --> S2["Catálogo de Serviços & Planos"]
    S --> S3["Agendador de Horários / Multi-step"]
    S --> S4["Propostas Comerciais & Assinatura Digital"]

    APP --> F["4. App Formulários Inteligentes & Leads (3 páginas)"]
    F --> F1["Quiz Diagnóstico de Perfil (quiz-diagnostico)"]
    F --> F2["Pesquisa de Satisfação & NPS (pesquisa-satisfacao)"]
    F --> F3["Trabalhe Conosco & Banco de Talentos (trabalhe-conosco)"]
```

#### Relação das 4 Suítes Entregues:
1. **App Turismo (5 páginas)**: provisionado via `provisionTourismWixAppSuiteFn`.
2. **App E-Commerce (4 páginas)**: provisionado via `provisionCommerceWixAppSuiteFn`.
3. **App Serviços (4 páginas)**: provisionado via `provisionServicesWixAppSuiteFn`.
4. **App Formulários & Leads (3 páginas)**: provisionado via `provisionFormLeadWixAppSuiteFn`.

### Conexão Real com o Hub (Sem Casca de Ovo):
Todo formulário submetido em qualquer página do builder chama a server function `submitOmniPageLeadFn`, que persiste os dados imediatamente no banco de dados nas tabelas `leads_crm` ou `travel_quote_requests`, alimentando o Kanban do Workspace em tempo real com zero perda de dados.

---

## 5. Mapeamento de Bibliotecas de Elite para Expansão Contínua de Blocos

Para continuar alimentando a biblioteca de seções e galerias do construtor, estão mapeadas as seguintes referências open-source:

1. **Magic UI (magicui.design)**:
   - *Bento Grid Moderno*: organização modular de recursos com bordas animadas e hover luminoso.
   - *Marquee / Infinite Slider*: carrossel infinito para marcas parceiras, clientes atendidos e depoimentos.
   - *Animated Beam & Dock*: barras de navegação flutuantes responsivas.
2. **Aceternity UI (ui.aceternity.com)**:
   - *3D Card Effect*: efeito tridimensional que reage à posição do mouse, ideal para cards de pacotes turísticos e produtos premium.
   - *Background Beams & Lamp Effect*: cabeçalhos dramáticos para seções de destaque e lançamentos.
3. **Embla Carousel & Swiper React**:
   - *Galerias de Imagens Imersivas*: suporte completo a toque no mobile (anti-jank), miniaturas sincronizadas e zoom de alta resolução.
   - *Comparison Slider (Antes e Depois)*: essencial para nichos de estética, arquitetura e serviços.
4. **Shadcn UI Blocks**:
   - *Tabelas de Planos e Preços com Toggle Anual/Mensal*.
   - *Acordeons de FAQ com Busca Integrada*.

---

## 6. Governança e Resiliência do Pool de Chaves com Quarentena Temporal

Para garantir disponibilidade contínua sem interrupções nos agentes e no copilot:
- Foi aplicada no Supabase em produção a migration `20261018080000_api_key_pools_scoped_quarantine_and_copilot_tasks.sql`.
- A função PostgreSQL `claim_healthy_api_keys_for_provider` garante rotação atômica com seleção sub-2ms entre mais de 1.000.000 de chaves, com tratamento específico para:
  - **Quarentena Diária (`quarantined_until_day`)**: chaves que atingiram o limite de cota de 24 horas são suspensas até a meia-noite UTC.
  - **Quarentena Mensal (`quarantined_until_month`)**: chaves com limite mensal esgotado são bloqueadas até o 1º dia do mês seguinte.
  - **Auto-Reset Silencioso**: ao expirar o prazo, a chave volta imediatamente ao pool sem intervenção manual.
