# SPEC-WAESY-CLOUD-SOVEREIGN-DB-ENGINE: Infraestrutura Soberana, "Waesy Cloud", Autovinculação de DB e BaaS Multi-Tenant

---

## 1. Visão Executiva e Desconstrução do Repositório Supabase

O repositório oficial [supabase/supabase](https://github.com/supabase/supabase) não é um monólito único, mas sim um ecossistema orquestrado de 11 microsserviços especializados de código aberto, unidos sob uma camada de API Gateway e contratos SQL/JWT consistentes.

A estratégia da plataforma **Waesy** consiste em internalizar e dominar completamente essa topologia sob a marca e tecnologia **Waesy Cloud** (ou **Waesy Core DB Engine**), permitindo três horizontes operacionais claros:
1. **Soberania de Infraestrutura Local/VPS:** Operar instâncias próprias de alta performance em servidores dedicados (ex: Hetzner, Oracle Cloud ou Bare-Metal) com custo fixo e zero dependência de planos pagos por volume do Supabase Cloud.
2. **Central de Integrações Master com "Autovincular DB":** Painel no Admin Master com handshake automático, detecção de instâncias locais/VPS, teste de integridade em 5 endpoints, geração/rotação de chaves JWT simétricas e alternância sem fricção entre Supabase Cloud e Waesy Cloud.
3. **Monetização e BaaS para Usuários Waesy (Waesy Cloud BaaS):** Oferta comercial estilo Supabase/Firebase onde lojistas, desenvolvedores e empresas parceiras do ecossistema Waesy contratam bancos de dados relacionais gerenciados, com chaves de API próprias, isolamento multi-tenant, storage compatível com S3 e backups automatizados.

```mermaid
flowchart TB
    subgraph WaesyClientLayer ["Clientes, Lojas & Desenvolvedores"]
        WaesyWeb["Waesy Web / PWA (Browser SSR)"]
        WaesyApp["Mobile App (Capacitor / React Native)"]
        TenantExternalApp["App / ERP Externo do Lojista"]
    end

    subgraph EdgeGateway ["Edge & Gateway Soberano (Waesy Cloud Gateway)"]
        CaddyGateway["Kong / Envoy / Caddy API Gateway (:8000 / :54321)"]
        WaesyRouter["JWT Router & Tenant Path Dispatcher"]
    end

    subgraph WaesyCloudServices ["Waesy Cloud Microservices (Docker Compose)"]
        PGPostgres["PostgreSQL 17 + Extensions\n(pgvector, pgjwt, pgcrypto, postgis, vault)"]
        PostgREST["PostgREST (:3000)\nREST API Automática com RLS"]
        GoTrueAuth["GoTrue / Supabase Auth (:9999)\nJWT, PKCE, OAuth, OTP"]
        StorageAPI["Storage API (:5000)\nS3 Wrapper + Metadados Postgres"]
        RealtimeWS["Realtime Elixir (:4000)\nWebSocket CDC, WAL & Broadcast"]
        Supavisor["Supavisor / PgBouncer (:5432 / :6543)\nConnection Pooler de Alta Densidade"]
        PgMeta["Postgres-Meta (:8080)\nIntrospecção de Schemas e DDL"]
        WaesyStudio["Waesy Cloud Studio (:3001)\nSQL Editor, Table Viewer & Logs"]
    end

    subgraph StorageBacking ["Camada de Persistência & Storage"]
        NVMeDisks["NVMe Local / Hetzner Block Storage"]
        S3Storage["MinIO Local / Cloudflare R2 S3 Backend"]
    end

    subgraph AdminMasterControl ["Painel Admin Master Waesy"]
        AdminMasterUI["Central de Integrações: Waesy Cloud"]
        AutoBindEngine["Motor de Autovinculação Zero-Touch"]
        VaultMaster["Cofre Criptográfico AES-256 (CryptoVault)"]
    end

    WaesyWeb --> CaddyGateway
    WaesyApp --> CaddyGateway
    TenantExternalApp --> CaddyGateway
    CaddyGateway --> WaesyRouter

    WaesyRouter -->|/rest/v1| PostgREST
    WaesyRouter -->|/auth/v1| GoTrueAuth
    WaesyRouter -->|/storage/v1| StorageAPI
    WaesyRouter -->|/realtime/v1| RealtimeWS
    WaesyRouter -->|/pg /studio| WaesyStudio

    PostgREST --> Supavisor
    GoTrueAuth --> Supavisor
    StorageAPI --> Supavisor
    StorageAPI --> S3Storage
    RealtimeWS --> PGPostgres
    Supavisor --> PGPostgres
    PGPostgres --> NVMeDisks
    PgMeta --> PGPostgres

    AdminMasterUI --> AutoBindEngine
    AutoBindEngine --> VaultMaster
    AutoBindEngine --> CaddyGateway
```

---

## 2. Anatomia Detalhada dos 11 Componentes do Supabase e Equivalência Waesy

| # | Componente Oficial | Repositório / Linguagem | Função no Ecossistema | Implementação Waesy Cloud |
|---|---|---|---|---|
| **1** | **PostgreSQL Core** | `supabase/postgres` (C / SQL) | Banco relacional ACID, RLS, WAL lógico e catalogação. | PostgreSQL 17 com compilação de extensões: `pgjwt`, `pgcrypto`, `pgvector`, `pg_stat_statements`, `pg_net`, `pg_cron`, `postgis` e `vault`. |
| **2** | **PostgREST** | `PostgREST/postgrest` (Haskell) | Converte o schema SQL diretamente em endpoints RESTful com cache de schema e permissões RLS. | Instância conteinerizada `postgrest/postgrest:v12.2.0`, operando em `PGRST_DB_SCHEMAS=public,storage,graphql_public`. |
| **3** | **GoTrue (Auth)** | `supabase/auth` (Go) | Gestão de identidade, emissão de JWT HS256/RS256, login social, refresh tokens e OTP. | Contêiner `supabase/gotrue:v2.158.0`, parametrizado com `JWT_SECRET`, e-mails transacionais e PKCE nativo. |
| **4** | **Storage API** | `supabase/storage-api` (TypeScript/Node) | API HTTP para upload, download e transformação de imagens com permissões no schema `storage`. | Contêiner `supabase/storage-api:v1.11.0` conectado ao MinIO local ou Cloudflare R2 com S3 compatibility. |
| **5** | **Realtime** | `supabase/realtime` (Elixir/Phoenix) | WebSocket multiplexado que escuta o WAL do Postgres e distribui broadcast, presence e CDC. | Contêiner `supabase/realtime:v2.30.23` lendo publication `supabase_realtime` via réplica lógica do Postgres. |
| **6** | **Kong / API Gateway** | `supabase/kong` (Lua/OpenResty) | Roteador de tráfego unificado na porta única (54321 ou 8000), validação de CORS e rate limiting. | Kong Gateway ou Caddy v2 com proxy reverso e terminação SSL automática por Let's Encrypt. |
| **7** | **Supavisor** | `supabase/supavisor` (Elixir) | Pooler de conexões moderno de alta escala (substituto do PgBouncer), modos Transaction e Session. | Contêiner `supabase/supavisor:v1.1.56` roteando portas 5432 (Session) e 6543 (Transaction). |
| **8** | **Postgres-Meta** | `supabase/postgres-meta` (Node.js) | Microserviço REST para listar tabelas, colunas, tipos, chaves estrangeiras e executar DDL. | Contêiner `supabase/postgres-meta:v0.84.1` consumido internamente pelo Waesy Studio. |
| **9** | **Supabase Studio** | `supabase/studio` (Next.js / React) | Dashboard visual com Table Editor, SQL Editor, RLS Visualizer, logs de queries e Storage explorer. | `supabase/studio:20241015-fae266f` com branding customizável Waesy ("Waesy Cloud Studio"). |
| **10** | **Edge Runtime** | `supabase/edge-runtime` (Rust / Deno) | Executor serverless de TypeScript/Wasm na borda para webhooks e funções assíncronas. | Edge Runtime v1.60+ ou TanStack Start Server Functions nativas no próprio processo BFF. |
| **11** | **Logflare / Vector** | `supabase/logflare` (Elixir / Vector) | Telemetria, agregação de logs do Postgres e métricas de tráfego em tempo real. | Agente Vector enviando métricas para tabela interna de telemetria e visualização no Admin Master. |

---

## 3. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- **EARS-U01:** O sistema Waesy Cloud DEVE manter 100% de compatibilidade semântica com os SDKs `@supabase/supabase-js` e `@supabase/ssr`, sem exigir qualquer modificação nos componentes de interface ou Server Functions existentes.
- **EARS-U02:** Toda credencial de acesso (`JWT_SECRET`, `SERVICE_ROLE_KEY`, `ANON_KEY`, `DB_PASSWORD`) armazenada no Admin Master DEVE ser criptografada via AES-256-GCM pelo `crypto-vault.server.ts` antes de persistir em disco.
- **EARS-U03:** O pool de conexões DEVE limitar o número de conexões diretas ao PostgreSQL para evitar esgotamento de memória (`connection starvation`), delegando conexões efêmeras ao Supavisor na porta 6543 em modo `transaction`.

### 3.2 Requisitos Orientados a Evento (When)
- **EARS-E01 (Autovinculação de DB):** QUANDO o administrador master clicar no botão "Autovincular Waesy Cloud", O SISTEMA DEVE disparar handshake HTTP para a instância local/VPS especificada, validar a resposta dos 5 microsserviços (`/rest/v1/`, `/auth/v1/health`, `/storage/v1/status`, `/realtime/v1/`, Postgres `SELECT 1`), gerar ou validar as chaves derivadas do `JWT_SECRET`, persistir a configuração no cofre e atualizar os ponteiros de conexão ativa sem necessidade de reiniciar a aplicação.
- **EARS-E02 (Provisionamento de Tenant BaaS):** QUANDO um lojista ou cliente assinar o pacote "Waesy Cloud BaaS", O SISTEMA DEVE criar atomicamente um schema dedicado `tenant_<store_id>`, provisionar um banco de dados isolado ou schema com RLS soberano, gerar um par único de chaves `anon` e `service_role` com claim `store_id` e exibir o painel de conexão no Workspace da loja.
- **EARS-E03 (Backup Automático):** QUANDO o agendador `pg_cron` ou cron job do sistema atingir o horário configurado (ex: 03:00 UTC), O SISTEMA DEVE gerar um snapshot consistente (`pg_dump -Fc`), encriptá-lo e sincronizá-lo para o bucket de backup configurado (Cloudflare R2 / Hetzner Storage Box).

### 3.3 Requisitos Orientados a Estado (While)
- **EARS-S01:** ENQUANTO o modo de conexão ativa estiver configurado como "Waesy Cloud Soberano", O SISTEMA DEVE redirecionar todas as chamadas do cliente SSR (`getServerClient()`) e browser (`getBrowserClient()`) para o endereço do gateway Waesy Cloud registrado no cofre.
- **EARS-S02:** ENQUANTO o tenant estiver com fatura em atraso além do período de carência (3 dias), O SISTEMA DEVE suspender o acesso às chaves de API externas do BaaS através de rejeição no Gateway (HTTP 402 Payment Required).

### 3.4 Requisitos de Comportamento Inesperado (If-Then)
- **EARS-X01:** SE a instância local do Waesy Cloud falhar no healthcheck ou estiver offline durante a autovinculação, ENTÃO o sistema DEVE abortar a troca de ponteiros, manter a conexão anterior ativa e exibir relatório visual detalhado indicando exatamente qual serviço falhou.
- **EARS-X02:** SE uma chave de API do tipo `service_role` for detectada em requisições de cliente browser não autenticadas, ENTÃO o gateway DEVE registrar alerta forense P0 e bloquear a transação imediatamente.

---

## 4. Arquitetura da "Central de Integrações > Banco de Dados & Waesy Cloud" no Admin Master

A interface será posicionada dentro de `src/routes/admin-master.integracoes.tsx` sob uma nova aba soberana: `"database"`.

### 4.1 Estrutura do Painel Master
1. **Cluster Switcher & Status da Conexão Ativa:**
   - Indicador visual em tempo real: `Supabase Cloud Oficial` vs `Waesy Cloud Soberano (Local/VPS)` vs `Custom Postgres`.
   - Latência medida em milissegundos (Ping RTT).
   - Versão do PostgreSQL e das extensões instaladas.
2. **Motor de Autovinculação Zero-Touch ("Autovincular DB"):**
   - Campo para informar o Host/URL do Waesy Cloud (ex: `http://localhost:54321` ou `https://db.waesy.internal`).
   - Botão primário com ícone de pulso: `"Autovincular Waesy Cloud"`.
   - Execução de checklist automático em 5 etapas com status tick/cross:
     - [x] Conectividade Postgres (TCP / SSL)
     - [x] PostgREST Engine (REST DDL)
     - [x] GoTrue Auth Engine (Health & JWT Validation)
     - [x] Storage API (Bucket Registry)
     - [x] Realtime Engine (WAL Publication)
3. **Gerenciador de Chaves e Criptografia do Cofre:**
   - Exibição mascarada de `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` e `DATABASE_URL`.
   - Utilitário integrado para **Gerar Tokens JWT Válidos** a partir de um `JWT_SECRET` fornecido, permitindo gerar `anon` e `service_role` com 1 clique usando o algoritmo HS256 com claims canônicos do Supabase:
     ```json
     {
       "role": "anon",
       "iss": "supabase",
       "iat": 1730000000,
       "exp": 2045620000
     }
     ```
4. **Catálogo de Migrations & Pré-Voo de Integridade:**
   - Exibe a lista de arquivos de migração em `supabase/migrations/` e checa se todas as migrações foram aplicadas na instância conectada.
   - Botão para sincronizar migrations faltantes com execução transacional segura.

---

## 5. Modelo de Negócio e Engenharia do BaaS Comercial ("Vender Serviço Estilo Supabase")

Para transformar o Waesy Cloud em um produto comercial escalável para lojistas, franquias e desenvolvedores externos, adotamos uma estratégia bifásica:

### 5.1 Nível A: BaaS Compartilhado de Alta Densidade (Multi-Tenant por Schema)
- **Público-Alvo:** Lojistas pequenos e médios, e-commerces, prestadores de serviço e apps parceiros.
- **Estrutura Técnica:**
  - Um cluster único PostgreSQL de alta performance com Supavisor.
  - Cada cliente recebe um schema dedicado (ex: `store_schema_a1b2c3d4`).
  - O PostgREST é exposto com roteamento dinâmico via cabeçalho `Accept-Profile: store_schema_a1b2c3d4` ou via subdomínio (`loja-x.db.waesy.com.br`).
  - Chaves de API geradas com a claim: `{"role": "authenticated", "store_id": "uuid", "app_metadata": {"schema": "store_schema_a1b2c3d4"}}`.
  - Custo de infraestrutura marginal próximo de zero por tenant.
- **Planos Comerciais:**
  - **Waesy Cloud Starter (Incluso no plano Pro):** Até 500 MB de banco, 2 GB de storage, 50.000 requisições/mês.
  - **Waesy Cloud Business (R$ 89/mês):** Até 5 GB de banco, 25 GB de storage, 500.000 requisições/mês, backups diários de 30 dias.

### 5.2 Nível B: Instância Dedicada Conteinerizada (BaaS Enterprise / Sovereign Node)
- **Público-Alvo:** Grandes redes, prefeituras, cooperativas de mobilidade urbana e clientes corporativos de turismo.
- **Estrutura Técnica:**
  - Provisionamento automatizado via API do Docker Engine / Portainer / Dokploy em VPS Hetzner ou Oracle Cloud.
  - Cada cliente ganha seu próprio contêiner Postgres dedicado com RAM/CPU isolados (ex: 2 vCPU, 4 GB RAM, 80 GB NVMe).
  - Subdomínio próprio: `https://cliente.db.waesy.com.br`.
  - Acesso direto via string de conexão Postgres (`postgresql://postgres:senha@cliente.db.waesy.com.br:5432/postgres`) para ferramentas como DBeaver, Prisma, pgAdmin e BI externos.
  - Acesso ao Waesy Cloud Studio white-label para visualização e edição direta de tabelas e SQL.
- **Planos Comerciais:**
  - **Waesy Cloud Dedicated Node (R$ 290 a R$ 690/mês):** 100% dos recursos dedicados, tráfego ilimitado, suporte a réplicas de leitura e SLA de 99.9%.

---

## 6. Schemas de Banco de Dados e DTOs

### 6.1 Tabela `waesy_cloud_clusters` (Gestão de Servidores e Instâncias)
```sql
CREATE TABLE IF NOT EXISTS public.waesy_cloud_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    cluster_type TEXT NOT NULL CHECK (cluster_type IN ('master_sovereign', 'local_dev', 'supabase_cloud', 'tenant_dedicated')),
    base_url TEXT NOT NULL,
    postgrest_url TEXT NOT NULL,
    auth_url TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    realtime_url TEXT NOT NULL,
    database_url_encrypted TEXT NOT NULL,
    jwt_secret_encrypted TEXT NOT NULL,
    anon_key_masked TEXT NOT NULL,
    service_role_key_masked TEXT NOT NULL,
    is_active_target BOOLEAN NOT NULL DEFAULT false,
    health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unreachable', 'unknown')),
    last_health_check_at TIMESTAMPTZ,
    ping_latency_ms INTEGER,
    installed_extensions JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.waesy_cloud_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform Admins gerenciam clusters Waesy Cloud"
    ON public.waesy_cloud_clusters
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'platform_admin'
        )
    );
```

### 6.2 Tabela `waesy_cloud_baas_subscriptions` (Subscrições Comerciais de Usuários)
```sql
CREATE TABLE IF NOT EXISTS public.waesy_cloud_baas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES public.waesy_cloud_clusters(id) ON DELETE RESTRICT,
    plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'business', 'enterprise_dedicated')),
    isolation_mode TEXT NOT NULL CHECK (isolation_mode IN ('shared_schema', 'dedicated_container')),
    assigned_schema TEXT,
    subdomain TEXT UNIQUE,
    monthly_price_cents INTEGER NOT NULL DEFAULT 0,
    storage_quota_mb INTEGER NOT NULL DEFAULT 2048,
    database_quota_mb INTEGER NOT NULL DEFAULT 512,
    api_anon_key_masked TEXT NOT NULL,
    api_service_key_masked TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'provisioning')),
    auto_backup_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.waesy_cloud_baas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lojistas visualizam sua própria subscrição BaaS"
    ON public.waesy_cloud_baas_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_memberships
            WHERE store_memberships.store_id = waesy_cloud_baas_subscriptions.store_id
              AND store_memberships.user_id = auth.uid()
        )
    );
```

---

## 7. `docker-compose.waesy-cloud.yml` Canônico para Servidor Próprio (Local/VPS)

```yaml
version: '3.8'

services:
  waesy-db:
    image: supabase/postgres:17.2.0.0
    container_name: waesy-cloud-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - waesy_db_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d/migrations:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  waesy-postgrest:
    image: postgrest/postgrest:v12.2.0
    container_name: waesy-cloud-postgrest
    restart: always
    depends_on:
      waesy-db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgresql://postgres:${POSTGRES_PASSWORD}@waesy-db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_BUILTIN_AUTH: "false"
    ports:
      - "3000:3000"

  waesy-auth:
    image: supabase/gotrue:v2.158.0
    container_name: waesy-cloud-auth
    restart: always
    depends_on:
      waesy-db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@waesy-db:5432/postgres
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_SITE_URL: ${SITE_URL}
    ports:
      - "9999:9999"

  waesy-storage:
    image: supabase/storage-api:v1.11.0
    container_name: waesy-cloud-storage
    restart: always
    depends_on:
      waesy-db:
        condition: service_healthy
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://waesy-postgrest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@waesy-db:5432/postgres
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
    volumes:
      - waesy_storage_data:/var/lib/storage
    ports:
      - "5000:5000"

  waesy-realtime:
    image: supabase/realtime:v2.30.23
    container_name: waesy-cloud-realtime
    restart: always
    depends_on:
      waesy-db:
        condition: service_healthy
    environment:
      PORT: 4000
      DB_HOST: waesy-db
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: postgres
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      REPLICATION_MODE: RLS
    ports:
      - "4000:4000"

  waesy-gateway:
    image: caddy:2.8-alpine
    container_name: waesy-cloud-gateway
    restart: always
    ports:
      - "54321:54321"
    volumes:
      - ./Caddyfile.waesy-cloud:/etc/caddy/Caddyfile:ro

volumes:
  waesy_db_data:
  waesy_storage_data:
```

---

## 8. Cronograma de Implementação e Etapas Práticas

- **Etapa 1: Infraestrutura & DTOs (Pronta na Spec):** Formalização do modelo de dados, contratos Zod e scripts Docker.
- **Etapa 2: BFF Server Functions (`waesy-cloud.functions.ts`):** Handshake de autovinculação, ping tester dos 5 serviços, gerador de chaves JWT a partir do secret e switcher de alvo no banco.
- **Etapa 3: UI no Admin Master (`admin-master.integracoes.tsx`):** Criação da aba `"database"`, card de status de conexão, modal de autovinculação e visualizador de métricas de latência.
- **Etapa 4: Provisionador BaaS Multi-Tenant:** Rota no Workspace para visualização das chaves do lojista e endpoint para criação automática de schemas isolados.
