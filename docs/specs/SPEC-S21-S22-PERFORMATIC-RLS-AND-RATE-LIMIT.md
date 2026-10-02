# SPEC-S21-S22: RLS Performático, Rate Limit, Idempotência e Desacoplamento Assíncrono

## 1. Identificação e Metadados
- **Fases**: S21 (RLS performático com medição do custo por linha) e S22 (Rate limit, idempotência e desacoplamento assíncrono para filas/webhooks).
- **Plano**: Plano 5 — Estrutura, Escala e Operação BigTech (Bloco C: Rotas e Performance).
- **Responsáveis**: BigTech Engineering Board (CISO & Supabase Master, Chief Software Architect, Staff QA).
- **Data**: 2026-10-02.
- **Invariantes**: M01, M02, M08, M09, M13, M14.
- **Severidade**: P0 (Segurança, Performance de Banco e Integridade Transacional).

---

## 2. Requisitos em Sintaxe EARS

- **[EARS-1] (Ubíquo - RLS InitPlan)**: O sistema DEVE avaliar todas as funções de autenticação e contexto de sessão (`auth.uid()`, `current_setting()`) dentro de subconsultas escalares `(SELECT auth.uid())` nas políticas RLS, garantindo que o PostgreSQL execute o predicado uma única vez por consulta (InitPlan em O(1)) em vez de reavaliar por linha escaneada (O(N)).
- **[EARS-2] (Ubíquo - Security Invoker Views)**: As views públicas e materializadas do banco de dados DEVEM ser declaradas com `security_invoker = true`, assegurando que o contexto de segurança e as políticas RLS do chamador sejam estritamente respeitados sem elevação de privilégios indevida (`security_definer`).
- **[EARS-3] (Condicional - Políticas Permissivas Redundantes)**: Quando uma tabela possuir múltiplas políticas permissivas com escopos sobrepostos ou redundantes (ex: `orders`, `profiles`, `classifieds`, `notifications`), o sistema DEVE consolidar essas políticas em regras unificadas e indexadas para minimizar o tempo de planejamento (`Planning Time`) do otimizador de consultas.
- **[EARS-4] (Comportamento Indesejado - Enumeração de Usuários e Flood de Auth)**: Quando qualquer cliente invocar `checkIdentifierExists` ou endpoints de autenticação, o sistema DEVE impor restrição de taxa por endereço IP (`enforceRateLimit(ip, 'auth_login' | 'auth_check')`), bloqueando tentativas de enumeração em lote de CPFs, telefones ou e-mails.
- **[EARS-5] (Event-Driven - Mutação Financeira e de Pedidos com Idempotência)**: Quando uma mutação financeira ou de pedido for submetida (`processCheckout`, `generateBoleto`, `generatePixManual`), o sistema DEVE exigir ou derivar uma chave de idempotência determinística e única, rejeitando execuções duplicadas e devolvendo o resultado consolidado sem gerar transações em duplicidade no banco.
- **[EARS-6] (State-Driven - Fila Assíncrona e Outbox de Eventos)**: Quando eventos de domínio forem disparados (`order.created`, `financial.paid`, `reservation.confirmed`), o sistema DEVE registrá-los em uma fila transacional estruturada com máquina de estados (`pending` -> `processing` -> `delivered` | `dead_letter`), suportando tentativas de reenvio com backoff exponencial e persistência auditável.

---

## 3. Arquitetura das Camadas

### Camada 1: Database (Supabase PostgreSQL)
- **Migração `20261002000002_s21_performatic_rls.sql`**:
  1. Alteração de views: `v_verified_marketplace_stores` e `unified_listings_view` configuradas com `security_invoker = true`.
  2. Reestruturação das políticas RLS em:
     - `orders`: Consolidação das políticas em `orders_select_canonical`, `orders_insert_canonical`, `orders_update_canonical`, eliminando `auth.uid() = customer_id` solto e subconsultas sem InitPlan.
     - `order_items`: Otimização com `(SELECT auth.uid())` e eliminação de subquery redundante.
     - `products`: Otimização com `(SELECT auth.uid())` em `products_staff_read` e `products_write_store`.
     - `classifieds`: Remoção de `classifieds_auth_all` (vulnerabilidade crítica) e consolidação em leitura pública / gestão por autor ou staff com `(SELECT auth.uid())`.
     - `profiles`: Remoção de políticas duplicadas (9 políticas reduzidas para regras canônicas de leitura pública sanitizada, escrita própria e administração).
     - `notifications`: Remoção de duplicatas `notifications_self_read` e consolidação em `(SELECT auth.uid())`.
     - `cart_items`: Remoção de subquery redundante `cart_items_via_cart` e consolidação em `cart_items_own`.
     - `workspace_members`: Otimização de subconsultas com `(SELECT auth.uid())`.

### Camada 2: BFF & Serviços (`src/services/` e `src/lib/`)
- **`src/lib/rate-limiter.ts`**:
  - Nova política: `auth_check_identifier` (30 req/min por IP) para proteger contra brute-force / enumeração.
  - Nova política: `payment_mutation` (10 req/min por usuário/IP) para boletos e pagamentos manuais.
- **`src/services/auth.functions.ts`**:
  - Proteção em `checkIdentifierExists` via `enforceRateLimit(clientIp, "auth_check_identifier")`.
- **`src/services/payment.functions.ts`**:
  - Proteção em `generateBoleto` e `generatePixManual` via rate limit e suporte a `idempotency_key` determinístico.
- **`src/lib/idempotency/idempotency-guard.ts`**:
  - Módulo puro para validação, armazenamento efêmero / persistente e verificação de chaves de idempotência.
- **`src/lib/queue/domain-event-queue.ts`**:
  - Motor de fila assíncrona outbox com retries determinísticos, estados canônicos e dead-letter queue.
- **`src/services/domain-events.functions.ts`**:
  - Integração com a fila outbox assíncrona para entrega resiliente.

---

## 4. Evidências de Aceite
1. Execução de `EXPLAIN (ANALYZE, BUFFERS)` nas tabelas centrais demonstrando redução drástica no tempo de planejamento e escaneamento.
2. 0 erros de segurança nas views auditadas pelo linter Supabase (`security_definer_view: 0`).
3. Redução substancial nos avisos de `auth_rls_initplan` e `multiple_permissive_policies`.
4. Testes unitários de regressão para `idempotency-guard` e `domain-event-queue` 100% verdes.
5. `npm run check:canonical` com 9/9 gates aprovados.
6. `npm run build` gerando worker de produção com Exit Code 0.
