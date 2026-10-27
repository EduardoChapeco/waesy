# 🏛️ Plano Mestre de Arquitetura: OpenAPI 3.1, WebMCP Seguro (AI-Guards), Blindagem Multi-Tenant & RLS Avançado

> **Homologado pelo Conselho Executivo de BigTech (Waesy Platform)**  
> **Personas:** CPO, Chief Software Architect, Staff Security Engineer (CISO), Principal Design Ops & Staff QA Gatekeeper.  
> **Objetivo:** Estabelecer a padronização definitiva de integrações públicas e privadas da Waesy através de especificação canônica OpenAPI 3.1, protocolo WebMCP com barreiras estritas de autorização (modelo Meta Ads / Stripe Scopes) para impedir invasões de IA entre lojas/contas, correção de vulnerabilidades de isolamento multi-tenant (`assertStoreAccess`) e blindagem de políticas RLS no PostgreSQL.

---

## 📑 Diagnóstico e Estado Atual

A auditoria forense realizada na infraestrutura e na base de código revelou:

1. **WebMCP Fragmentado & Vulnerável a Cross-Tenant**:
   - `/api/webmcp.json` anunciava um conjunto de ferramentas públicas, enquanto `src/services/mcp-server.functions.ts` executava outro conjunto (`simlab_run_survey`, `generate_marketing_post`, `analyze_competitor_dna`, `query_master_catalog`).
   - Em `mcp-server.functions.ts`, o `storeId` era recebido diretamente do payload do cliente sem validar se o chamador possui vínculo com a loja. Um agente malicioso poderia passar o UUID de outra empresa e disparar simulações ou inspecionar dados concorrentes.
   - Existiam mocks fictícios (`sku-1`, `sku-2`) em caso de falha de busca, violando a política de Zero Mocks.
2. **Ausência de Rota Oficial OpenAPI 3.1**:
   - Não havia endpoint `/api/openapi.json` para auto-descoberta e integração com Swagger, Postman, Zapier, n8n, Meta Ads CAPI e plataformas externas.
3. **Vulnerabilidade em `assertStoreAccess` (`src/lib/identity-core.ts`)**:
   - Quando `targetStoreId` era fornecido, a função atribuía o ID alvo à identidade mas validava a permissão apenas contra a `role` da loja padrão anterior, sem checar se o usuário era de fato membro da `targetStoreId`.
4. **Auditoria de Banco de Dados (422 Tabelas)**:
   - **Ponto Positivo:** 100% das 422 tabelas públicas do Supabase possuem `ROW LEVEL SECURITY` ativo (0 tabelas sem RLS).
   - **Vulnerabilidades Detectadas:** 3 políticas com permissões abertas para `{public}`:
     - `push_subscriptions` (`push_subscriptions_service_all` com comando `ALL` aberto para `{public}`).
     - `workspace_pro_waitlist` (`workspace_waitlist_all_policy` com comando `ALL` aberto para `{public}`).
     - `classified_delivery_dispatches` (`UPDATE` sem verificação estrita de token de despacho).

---

## 🛡️ Pilares da Implementação Proposta

### Pilar 1: Barreira de Segurança WebMCP (AI-Guards & Scopes)
Inspirado no modelo de segurança do **Meta Ads MCP** e **Stripe Restricted Keys**:
- **Classificação em Camadas de Acesso (Tiered Tools):**
  - **Tier 1 (Público / Read-Only):**
    - `search_catalog_products`: Busca no marketplace local. Retorna somente dados públicos (título, preço de venda em reais, imagem, loja). Jamais expõe margens, custos de aquisição ou dados privados.
    - `get_store_directory_info`: Informações públicas de lojas e contatos comerciais.
    - `check_delivery_coverage`: Validação de entrega por CEP e cálculo de frete.
    - `get_google_shopping_feed` & `get_meta_catalog_feed`: Feeds de sindicação de produtos.
  - **Tier 2 (Privado / Lojista Autorizado - Tenant Boundary Guard):**
    - `simlab_run_survey`: Requer escopo `analytics:read` e verificação de que o chamador é `owner`, `admin` ou `manager` da loja alvo.
    - `generate_marketing_post`: Requer escopo `marketing:write` e validação estrita de loja.
    - `analyze_competitor_dna`: Requer escopo `analytics:read` e validação estrita de loja.
    - `update_product_stock`: Requer escopo `catalog:write` e validação de loja.
- **Barreira Anti-Invasão de Lojas (Cross-Tenant Barrier):**
  - O `store_id` NUNCA é aceito cegamente do prompt ou do argumento da IA.
  - O backend obtém a identidade autenticada (`getServerIdentity`) ou valida a API Key/Token da requisição. Se a loja solicitada pela IA não constar na lista de permissões autorizadas daquela credencial, a execução é abortada imediatamente com `403 Forbidden: Cross-tenant access denied`.
- **Zero Mocks & Validação Zod Rígida:**
  - Remoção dos fallbacks fictícios. Retorno de coleções vazias legítimas (`[]`) e mensagens diagnósticas formais.
  - Validação estrita de tipos e sanitização de queries contra SQL/Prompt Injection.
- **Trilha de Auditoria & Telemetria:**
  - Registro de cada invocação de ferramenta MCP em log de auditoria (`tool_name`, `caller_id`, `store_id`, `status`, `duration_ms`).

### Pilar 2: Especificação Canônica OpenAPI 3.1 (`/api/openapi.json`)
- Criação de rota server-side `/api/openapi.json` compatível com OpenAPI 3.1.0 e JSON Schema 2020-12.
- Definição formal dos endpoints:
  - `/api/webmcp.json` & `/api/mcp/v1/tools/call` (WebMCP)
  - `/api/search` (Catálogo e Marketplace)
  - `/api/store/info` (Diretório)
  - `/api/shipping/calculate` (Logística e Entregas)
  - `/api/webhooks/marketplaces`, `/api/webhooks/pix`, `/api/webhooks/shipment` (Webhooks)
  - `/api/feed/xml` e `/api/feed/meta.csv` (Feeds DPA e Google Merchant)
  - `/api/security-telemetry` (Sentinela de Segurança)
- Esquemas de autenticação padronizados:
  - `BearerAuth` (Supabase JWT de sessão).
  - `ApiKeyAuth` (Chave de API restrita por escopo via cabeçalho `X-API-Key` ou `Authorization: Bearer <key>`).

### Pilar 3: Correção Cirúrgica de Isolamento Multi-Tenant (`assertStoreAccess`)
- Atualizar `assertStoreAccess` em `src/lib/identity-core.ts`:
  - Se `targetStoreId` for especificado e o usuário não for `platform_admin` ou `master`, a função deve OBRIGATORIAMENTE validar:
    ```ts
    const targetMembership = identity.memberships.find(m => m.store_id === targetStoreId);
    if (!targetMembership || !allowedRoles.includes(targetMembership.role)) {
      throw new Error(`Unauthorized: No authorized role in store ${targetStoreId}`);
    }
    ```
  - Isso erradica qualquer possibilidade de escalada de privilégio cruzada entre empresas.

### Pilar 4: Blindagem das Políticas RLS no PostgreSQL (Supabase)
- Aplicar script DDL corretivo no banco de dados:
  1. **`push_subscriptions`**: Revogar a política permissiva `push_subscriptions_service_all` para o role `public`. Criar política restrita onde `public` pode apenas fazer `INSERT` do seu endpoint, e `SELECT/UPDATE/DELETE` apenas pelo dono autenticado ou por `service_role`.
  2. **`workspace_pro_waitlist`**: Revogar `workspace_waitlist_all_policy` com `ALL` aberto. Permitir `INSERT` público (inscrição na fila) e restringir `SELECT`, `UPDATE` e `DELETE` apenas para `platform_admin` e `service_role`.
  3. **`classified_delivery_dispatches`**: Restringir o `UPDATE` para exigir correspondência exata do token de despacho ativo e não expirado.

### Pilar 5: Harmonização do Modelo de Dados e Contratos de API
- Verificação e consolidação dos padrões:
  - Identificadores: sempre UUID v4.
  - Valores monetários: sempre centavos de Real inteiros (`price_cents`).
  - Nomenclatura no banco: `snake_case`; nas interfaces TypeScript: `camelCase`.
  - Configurações dinâmicas e nichos: persistidos de forma segura em colunas `settings JSONB`.

---

## 📁 Arquivos Afetados

### [NOVO]
- [src/routes/api.openapi[.]json.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/api.openapi[.]json.ts): Rota geradora da especificação OpenAPI 3.1.0 completa.
- [src/routes/api.mcp.v1.tools.call.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/api.mcp.v1.tools.call.ts): Endpoint HTTP REST para despacho direto e seguro de chamadas de ferramentas WebMCP.

### [MODIFICAR]
- [src/lib/identity-core.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/lib/identity-core.ts): Blindagem do `assertStoreAccess` contra escalada multi-tenant.
- [src/services/mcp-server.functions.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/mcp-server.functions.ts): Implementação do AI-Guard, barreiras de escopo, remoção de mocks e validação multi-tenant em nível de sessão.
- [src/routes/api.webmcp[.]json.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/api.webmcp[.]json.ts): Sincronização do manifesto com as ferramentas canônicas e declaração de escopos/segurança.
- [scripts/apply-rls-hardening.cjs](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/scripts/apply-rls-hardening.cjs): Script de migração para blindar as 3 políticas RLS abertas identificadas na auditoria.

---

## 🔬 Plano de Verificação

### 1. Auditoria e Execução de RLS no PostgreSQL
- Executar o script de hardening de RLS conectando via pooler seguro.
- Re-executar o auditor de segurança para comprovar que ZERO políticas contêm escrita ou deleção pública irrestrita.

### 2. Testes de Isolamento Multi-Tenant (Anti-Invasão de Lojas)
- Testar chamada à ferramenta MCP passando `storeId` de uma loja que o usuário autenticado NÃO pertence -> Verificar que o sistema retorna `403 Forbidden` e bloqueia a ação.
- Testar chamada com loja legítima -> Verificar execução normal com dados reais (sem mocks).

### 3. Validação da Especificação OpenAPI 3.1
- Fazer requisição HTTP interna para `/api/openapi.json` e verificar conformidade estrutural do JSON gerado.

### 4. Compilação TypeScript e Build de Produção
- Executar `node --max-old-space-size=6144 ./node_modules/typescript/bin/tsc --noEmit` -> Garantir 0 erros.
- Executar `cmd.exe /c "npm run build"` -> Garantir compilação de produção com Exit Code 0.
