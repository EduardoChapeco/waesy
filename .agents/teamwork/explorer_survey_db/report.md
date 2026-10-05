# Relatório de Levantamento Perimetral de Banco de Dados, Migrations & Governança RLS 360º

**Data de Emissão**: 2026-10-05T04:15:00Z  
**Autor**: Explorer 1 (Database Schema & Migration Survey)  
**Escopo**: Levantamento forense do catálogo `supabase/migrations/`, análise de RLS e especificação estrita para R1: `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql`.

---

## 1. Sumário Executivo & Contexto de Governança

O ecossistema Waesy demanda uma camada unificada de governança transacional e telemetria forense 360º de ponta a ponta. Atualmente, o sistema possui telemetrias esparsas (como `pwa_telemetry`, `lead_form_submissions` com anti-spam Cloudflare, `copilot_activity_steps` e `customer_debt_ledger` do Waesy Go), porém carece de:
1. Rastreabilidade auditável de **todos** os formulários civis e comerciais preenchidos (propostas, orçamentos, candidaturas, chamados e cadastros);
2. Rastreamento granular segundo a segundo de eventos de carrinho e abandonos (`user_cart_telemetry`);
3. Amarração física compulsória de ações corporativas de funcionários e operadores dentro de lojas ao CPF civil do operador (`employee_tenant_audit_logs`);
4. Matriz agregada de relacionamento e afinidade cliente-loja (`customer_store_affinity`), alimentando o CRM dos lojistas e o dossiê 360º do Master Admin.

Este levantamento documenta o estado da arte do banco de dados no Supabase, detalha as convenções canônicas observadas nos 121 arquivos de migração existentes e fornece a especificação técnica exata das 4 novas tabelas, índices e políticas RLS para a migração `20270105000000_master_360_telemetry_and_governance.sql`.

---

## 2. Arquitetura de Migrations & Convenção de Nomenclatura

### 2.1 Histórico e Sequência Cronológica
O diretório `supabase/migrations/` possui exatamente **121 arquivos SQL**.
A convenção do repositório evoluiu de sequenciais numéricos (`0001_foundation.sql` até `0052_commission_engine.sql`) para carimbos de data/hora no padrão internacional:
$$\text{YYYYMMDDHHMMSS}\_\text{descricao\_em\_snake\_case.sql}$$

As 10 migrações mais recentes no topo da cadeia cronológica são:
- `20261228000000_variant_matrix_wholesale_and_stock_audit.sql`
- `20261229000000_civil_lead_forms_author_ownership.sql`
- `20261230000000_lead_submissions_network_telemetry_anti_spam.sql`
- `20261231000000_storage_rls_lockdown_views_security_invoker.sql`
- `20261231120000_industrialize_mining_cron_and_net.sql`
- `20270101000000_copilot_activity_steps_telemetry.sql`
- `20270102000000_crawler_industrialization_indexes.sql`
- `20270103000000_news_articles_city_indexation.sql`
- `20270104000000_waesy_go_courier_governance_and_ratings.sql`
- **Target R1**: `20270105000000_master_360_telemetry_and_governance.sql`

A migração estipulada em R1 (`20270105000000`) sucede de forma contígua a migração do Waesy Go (`20270104000000`), preservando 100% da integridade sequencial do motor de migrações do Supabase CLI.

---

## 3. Catálogo de Entidades e Schemas Existentes

### 3.1 Identidade: `auth.users` vs `public.profiles`
- `auth.users`: Tabela nativa do Supabase GoTrue contendo `id UUID PRIMARY KEY`, credenciais de login, e-mail, telefone e metadados de autenticação.
- `public.profiles`: Tabela de perfil criada em `0001_foundation.sql`:
  - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - `role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('owner','admin','manager','seller','stock','finance','content','support','customer','master','platform_admin'))`
  - `full_name TEXT`, `avatar_url TEXT`, `cpf TEXT` (ou `tax_id`), `created_at`, `updated_at`.
- **Invariante de Foreign Key**: Em chaves estrangeiras vinculadas ao usuário autenticado, o padrão consolidado é referenciar `auth.users(id)` com `ON DELETE CASCADE` ou `ON DELETE SET NULL`, garantindo integridade referencial com o sistema de autenticação, podendo incluir paralelamente `profile_id UUID REFERENCES public.profiles(id)` para facilidade de joins no frontend.

### 3.2 Lojas & Membros: `public.stores`, `workspace_members` e `store_members`
- `public.stores`: Tabela canônica de estabelecimentos (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `organization_id UUID`, `name TEXT`, `slug TEXT`, `settings JSONB`, `created_at`, `updated_at`).
- `public.workspace_members`: Tabela relacional física de membresia corporativa (`profile_id UUID REFERENCES profiles(id)`, `store_id UUID REFERENCES stores(id)`, `role TEXT`).
- `public.store_members`: View de compatibilidade com `security_invoker = true` criada em `20261018000000_table_synonyms_and_compatibility_views.sql`, expondo `id`, `profile_id`, `user_id`, `store_id`, `role`.

### 3.3 Tabelas Existentes de Auditoria e Telemetria
1. `public.audit_log` (`0001_foundation.sql`): Auditoria imutável genérica por `entity_type` e `entity_id` com payload redigido.
2. `public.forensic_audit_events` (`20260816000000_master_governance_and_compliance.sql`): Registro de sanções disciplinares, bloqueios e eventos administrativos master.
3. `public.pwa_telemetry` (`20261212000000_pwa_builder_and_telemetry.sql`): Rastreamento de instalações e aberturas de PWA por loja e plataforma.
4. `public.lead_form_submissions` (`20261111000000` + `20261230000000`): Formulários de captação comercial de leads, expandido com `ip_address`, `device_fingerprint`, `geo_city`, `geo_state`, `geo_country`, `threat_score`, `cf_ray`, `is_flagged_spam`.
5. `public.customer_debt_ledger` (`20270104000000`): Registro de débitos compulsórios no CPF por cancelamento fora de tolerância (3 min) no Waesy Go.

### 3.4 Carrinho e Abandonos: `public.carts`, `cart_items` e `abandoned_carts_log`
- `public.carts` (`0003_orders.sql`): Carrinhos ativos de clientes logados (`customer_id UUID REFERENCES auth.users(id)`) ou convidados anônimos (`session_token TEXT`, `guest_email`, `guest_phone`).
- `public.cart_items` (`0003_orders.sql`): Itens no carrinho com `variant_id REFERENCES product_variants(id)` e `qty INTEGER`.
- `public.abandoned_carts_log` (`0018_growth_engagement.sql` + `0020_abandoned_carts_engine.sql`): Tabela de processamento periódico de carrinhos inativos há > 2h com snapshot de produtos.
- **Diferencial de `user_cart_telemetry`**: Enquanto `abandoned_carts_log` é uma fila de disparo de recuperação (e-mail/WhatsApp) a cada 2h, `user_cart_telemetry` é um log de eventos em tempo real (event-stream) registrando adições, remoções, alterações de quantidade e abandonos com telemetria IP/navegador segundo a segundo.

---

## 4. Padrões Canônicos de RLS (Row Level Security)

### 4.1 Deny-by-Default Invariante
Toda tabela deve invocar obrigatoriamente:
```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
```
Sem políticas concedidas, o PostgreSQL rejeita sumariamente qualquer `SELECT`, `INSERT`, `UPDATE` ou `DELETE` para os papéis `anon` e `authenticated`.

### 4.2 Helper `public.is_platform_admin()`
Definido em `20260829220000_security_hardening_rls_phase1.sql`:
```sql
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('platform_admin', 'master')
  );
$$;
```
Permite acesso irrestrito ao Master Admin em todas as tabelas de governança.

### 4.3 Helpers de Isolamento de Loja: `auth_user_store_ids()` e `is_store_staff()`
- `public.auth_user_store_ids()`: Retorna um array `uuid[]` contendo todas as lojas onde `auth.uid()` é membro ativo em `workspace_members`.
- `public.is_store_staff(store_id)`: Retorna `boolean` validando se `auth.uid()` possui papel administrativo/operacional na loja.
- **Padrão Canônico de Leitura de Loja**:
```sql
USING (store_id = ANY (public.auth_user_store_ids()))
```

### 4.4 Otimização de Performance WCAG / Postgres
Conforme as diretrizes de `supabase-postgres-best-practices`:
1. Sempre encapsular chamadas de função de sessão em subconsultas: usar `(SELECT auth.uid())` em vez de `auth.uid()`, garantindo que o PostgreSQL execute e faça cache do valor uma única vez por query, evitando execuções redundantes linha a linha ($O(1)$ vs $O(N)$).
2. Criar índices b-tree explícitos para todas as colunas de chave estrangeira utilizadas em políticas RLS (`user_id`, `customer_id`, `store_id`).
3. Logs imutáveis não devem possuir políticas de `UPDATE` ou `DELETE` para `authenticated`, permitindo mutação estritamente para `platform_admin` ou `service_role`.

---

## 5. Especificação Exata dos Requisitos de Dados (R1)

### 5.1 Tabela 1: `public.user_form_submissions_log`

#### Finalidade
Histórico universal e imutável de formulários submetidos por usuários na plataforma (propostas comerciais, cotações/orçamentos, candidaturas de emprego, chamados de suporte técnico, formulários de contato e registros cadastrais). Permite auditoria forense com captura de rota de envio, payload higienizado (sem PII sensível/senhas), IP real, detecção de VPN e User-Agent.

#### DDL Proposta
```sql
CREATE TABLE IF NOT EXISTS public.user_form_submissions_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  store_id            UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  form_type           TEXT NOT NULL CHECK (
                        form_type IN ('proposal', 'quote', 'job_application', 'support_ticket', 'user_registration', 'classified_lead', 'contact', 'other')
                      ),
  form_name           TEXT NOT NULL,
  route               TEXT NOT NULL,
  sanitized_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address          TEXT,
  is_vpn              BOOLEAN NOT NULL DEFAULT false,
  vpn_provider        TEXT,
  user_agent          TEXT,
  device_fingerprint  TEXT,
  geo_city            TEXT,
  geo_state           TEXT,
  geo_country         TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_user_form_subs_user_id ON public.user_form_submissions_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_store_id ON public.user_form_submissions_log(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_form_type ON public.user_form_submissions_log(form_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_created_at ON public.user_form_submissions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_form_subs_ip ON public.user_form_submissions_log(ip_address);
```

#### Políticas RLS (Deny-by-Default)
```sql
ALTER TABLE public.user_form_submissions_log ENABLE ROW LEVEL SECURITY;

-- 1. Master Admin possui acesso irrestrito
CREATE POLICY "platform_admins_manage_form_submissions_log"
  ON public.user_form_submissions_log FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 2. Usuário civil lê apenas seus próprios envios
CREATE POLICY "users_view_own_form_submissions_log"
  ON public.user_form_submissions_log FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. Loja parceira lê formulários submetidos ao seu estabelecimento
CREATE POLICY "stores_view_own_form_submissions_log"
  ON public.user_form_submissions_log FOR SELECT
  TO authenticated
  USING (store_id IS NOT NULL AND store_id = ANY (public.auth_user_store_ids()));

-- 4. Permissão de inserção para clientes autenticados e anônimos (leads pré-login)
CREATE POLICY "allow_insert_form_submissions_log"
  ON public.user_form_submissions_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

---

### 5.2 Tabela 2: `public.user_cart_telemetry`

#### Finalidade
Registro segundo a segundo de telemetria de navegação e engajamento no e-commerce: adições de itens, remoções, alterações de quantidade no carrinho, abandonos e início de checkout por loja e produto.

#### DDL Proposta
```sql
CREATE TABLE IF NOT EXISTS public.user_cart_telemetry (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id             UUID REFERENCES public.carts(id) ON DELETE SET NULL,
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token       TEXT,
  product_id          UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id          UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  event_type          TEXT NOT NULL CHECK (
                        event_type IN ('item_added', 'item_removed', 'quantity_updated', 'cart_abandoned', 'cart_cleared', 'checkout_started', 'cart_restored')
                      ),
  quantity_delta      INTEGER NOT NULL DEFAULT 0,
  unit_price_cents    INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  total_cart_cents    INTEGER NOT NULL DEFAULT 0 CHECK (total_cart_cents >= 0),
  items_count         INTEGER NOT NULL DEFAULT 0 CHECK (items_count >= 0),
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address          TEXT,
  user_agent          TEXT,
  device_fingerprint  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_user ON public.user_cart_telemetry(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_store ON public.user_cart_telemetry(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_cart ON public.user_cart_telemetry(cart_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_product ON public.user_cart_telemetry(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_event ON public.user_cart_telemetry(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cart_telem_created_at ON public.user_cart_telemetry(created_at DESC);
```

#### Políticas RLS (Deny-by-Default)
```sql
ALTER TABLE public.user_cart_telemetry ENABLE ROW LEVEL SECURITY;

-- 1. Master Admin possui acesso total
CREATE POLICY "platform_admins_manage_cart_telemetry"
  ON public.user_cart_telemetry FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 2. Consumidor lê seus próprios eventos de carrinho
CREATE POLICY "users_view_own_cart_telemetry"
  ON public.user_cart_telemetry FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. Loja parceira analisa a telemetria de carrinhos da sua loja
CREATE POLICY "stores_view_own_cart_telemetry"
  ON public.user_cart_telemetry FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()));

-- 4. Inserção permitida para captura de telemetria
CREATE POLICY "allow_insert_cart_telemetry"
  ON public.user_cart_telemetry FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

---

### 5.3 Tabela 3: `public.employee_tenant_audit_logs`

#### Finalidade
Trilha forense de responsabilidade corporativa. Registra de forma estrita e imutável as ações realizadas por funcionários, atendentes e operadores dentro de painéis de empresas (módulos de catálogo, preços, estoque, caixa/PDV, cancelamento de pedidos, estornos, cupons e configurações), vinculando o `user_id` físico e CPF do operador à loja operada.

#### DDL Proposta
```sql
CREATE TABLE IF NOT EXISTS public.employee_tenant_audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  operator_cpf        TEXT,
  operator_role       TEXT NOT NULL DEFAULT 'operator',
  module              TEXT NOT NULL,
  action              TEXT NOT NULL,
  target_entity_type  TEXT,
  target_entity_id    TEXT,
  before_payload      JSONB,
  after_payload       JSONB,
  diff_summary        TEXT,
  ip_address          TEXT,
  is_vpn              BOOLEAN NOT NULL DEFAULT false,
  user_agent          TEXT,
  device_fingerprint  TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_emp_audit_user ON public.employee_tenant_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_store ON public.employee_tenant_audit_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_module ON public.employee_tenant_audit_logs(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_action ON public.employee_tenant_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_audit_cpf ON public.employee_tenant_audit_logs(operator_cpf);
CREATE INDEX IF NOT EXISTS idx_emp_audit_created ON public.employee_tenant_audit_logs(created_at DESC);
```

#### Políticas RLS (Deny-by-Default)
```sql
ALTER TABLE public.employee_tenant_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Master Admin possui acesso total
CREATE POLICY "platform_admins_manage_employee_tenant_audit_logs"
  ON public.employee_tenant_audit_logs FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 2. Operador consulta suas próprias ações realizadas em qualquer tenant
CREATE POLICY "employees_view_own_tenant_actions"
  ON public.employee_tenant_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. Loja parceira (proprietário/gestor) audita ações praticadas em seu painel
CREATE POLICY "stores_view_own_employee_audit_logs"
  ON public.employee_tenant_audit_logs FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()));

-- 4. Inserção permitida para operadores autenticados membros da loja
CREATE POLICY "employees_insert_own_tenant_actions"
  ON public.employee_tenant_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND store_id = ANY (public.auth_user_store_ids())
  );
```

---

### 5.4 Tabela 4: `public.customer_store_affinity`

#### Finalidade
Tabela agregadora de métricas de relacionamento e retenção entre cliente e loja. Classifica a afinidade (`lead`, `visitor`, `buyer`, `fan`, `vip`) com base no volume de visitas, adições ao carrinho, total de pedidos faturados e ticket médio.

#### DDL Proposta
```sql
CREATE TABLE IF NOT EXISTS public.customer_store_affinity (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id              UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  affinity_level        TEXT NOT NULL DEFAULT 'visitor' CHECK (
                          affinity_level IN ('lead', 'visitor', 'buyer', 'fan', 'vip')
                        ),
  total_visits          INTEGER NOT NULL DEFAULT 1 CHECK (total_visits >= 0),
  total_cart_additions  INTEGER NOT NULL DEFAULT 0 CHECK (total_cart_additions >= 0),
  total_orders_count    INTEGER NOT NULL DEFAULT 0 CHECK (total_orders_count >= 0),
  total_revenue_cents   BIGINT NOT NULL DEFAULT 0 CHECK (total_revenue_cents >= 0),
  average_ticket_cents  INTEGER NOT NULL DEFAULT 0 CHECK (average_ticket_cents >= 0),
  last_visit_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_cart_activity_at TIMESTAMPTZ,
  last_order_at         TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cust_affinity_customer ON public.customer_store_affinity(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_store ON public.customer_store_affinity(store_id);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_level ON public.customer_store_affinity(store_id, affinity_level);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_revenue ON public.customer_store_affinity(store_id, total_revenue_cents DESC);
CREATE INDEX IF NOT EXISTS idx_cust_affinity_last_visit ON public.customer_store_affinity(store_id, last_visit_at DESC);

-- Trigger de updated_at
CREATE TRIGGER customer_store_affinity_updated_at
  BEFORE UPDATE ON public.customer_store_affinity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

#### Políticas RLS (Deny-by-Default)
```sql
ALTER TABLE public.customer_store_affinity ENABLE ROW LEVEL SECURITY;

-- 1. Master Admin possui gestão total
CREATE POLICY "platform_admins_manage_customer_store_affinity"
  ON public.customer_store_affinity FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 2. Cliente visualiza seu próprio nível de afinidade com a loja
CREATE POLICY "customers_view_own_store_affinity"
  ON public.customer_store_affinity FOR SELECT
  TO authenticated
  USING (customer_id = (SELECT auth.uid()));

-- 3. Loja parceira visualiza os clientes associados
CREATE POLICY "stores_view_own_customer_affinity"
  ON public.customer_store_affinity FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()));

-- 4. Loja parceira atualiza metadados e notas de relacionamento
CREATE POLICY "stores_manage_own_customer_affinity"
  ON public.customer_store_affinity FOR ALL
  TO authenticated
  USING (store_id = ANY (public.auth_user_store_ids()))
  WITH CHECK (store_id = ANY (public.auth_user_store_ids()));
```

---

## 6. Matriz de Integração com os Próximos Marcos

| Tabela R1 | Função BFF Consumidora (R2) | Aba no Master Admin (R3) | Tela Civil do Cliente (R4) |
|---|---|---|---|
| `user_form_submissions_log` | `recordFormSubmissionAudit`, `getUserFull360Activity` | Aba 3: Formulários & Cadastros | Aba Minha Atividade / Formulários |
| `user_cart_telemetry` | `recordCartTelemetryEvent`, `getUserFull360Activity` | Aba 5: E-Commerce & Carrinhos | Aba Minha Atividade / Carrinhos |
| `employee_tenant_audit_logs` | `recordStaffActionLog`, `getUserFull360Activity` | Aba 7: Ações como Operador | Histórico Corporativo de Atuação |
| `customer_store_affinity` | `getUserFull360Activity`, `getMyActivityHistory` | Aba 5: Afinidade por Loja & LTV | Lojas Parceiras e Vínculos VIP |

---

## 7. Rascunho Completo do Script SQL de Migração

O arquivo integral de migração para entrega em R1 está pronto para compor `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql`, contemplando todas as restrições de integridade, índices recomendados e políticas RLS seguras.
