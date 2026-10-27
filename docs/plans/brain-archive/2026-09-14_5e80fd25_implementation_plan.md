# Plano Executivo: Auditoria Completa, Mapeamento Modular E2E, Governança Admin Master e Protocolo WebMCP / OpenAPI 3.1

## 🏛️ Visão Geral & Objetivos Estratégicos

O Conselho Executivo de BigTech (CPO, Chief Software Architect, Staff Security & Data Engineer, Principal Design Ops, Staff QA) elaborou este plano detalhado para:
1. **Auditoria & Mapeamento Modular Exaustivo:** Mapear todos os módulos, casos de uso, etapas, funções, schemas de banco e fluxos de ponta a ponta da Waesy (Workspace, Vitrines Públicas, Admin Master e APIs).
2. **Governança Unificada de Módulos no Admin Master:** Atualizar o catálogo de governança (`platform_modules_config` e `src/services/modules.functions.ts`) para que o Admin Master possa ativar/desativar em tempo real todos os módulos operacionais modernos (Hub de Marketplaces, WMS Expedição, Módulo Fiscal NF-e, PDV Caixa Rápido, JUS Contratos, PUDO Logística, Social Studio, SimLab Econometria, Squad AI e WebMCP Gateway).
3. **Padronização WebMCP & OpenAPI 3.1 para IAs Externas:** Expandir o manifesto WebMCP (`src/services/mcp-server.functions.ts`) e o contrato OpenAPI 3.1 (`src/routes/api.openapi[.]json.ts`) com esquemas Zod estritos para que LLMs e agentes autônomos externos (Claude, GPT, Gemini, Cursor) possam interagir de forma segura e contextual com a plataforma.
4. **Proteção Anti-Abuso & Rate Limiting Real:** Adicionar políticas de controle de tráfego em `src/lib/rate-limiter.ts` para chamadas de IA/MCP (`webmcp_tool_call`, `api_external_query`, `mcp_batch_execution`), com isolamento multi-tenant intransponível e restrição de cotas por Token/IP.
5. **Documentação de Engenharia Exaustiva:** Criar o compêndio canônico `docs/MODULES_CATALOG.md` com arquitetura, casos de uso, contratos BFF, eventos e integrações de cada módulo.

---

## 📋 Decomposição de Requisitos Anti-Esquecimento

- `[REQ-1] Mapeamento Modular Completo:` Inventário detalhado de todos os 22 módulos do ecossistema Waesy, cruzando Rotas ➔ BFF ➔ Tabelas Supabase ➔ UI.
- `[REQ-2] Governança Master Ativa/Desativa:` Inclusão de todos os módulos modernos na tabela `platform_modules_config` e no painel `/admin-master/modulos`, permitindo controle global em tempo real.
- `[REQ-3] Controle por Loja (Store Feature Flags):` Conectar a ativação de módulos da loja (`stores.enabled_modules`) com guardas operacionais no Workspace (`WorkspaceFeatureGuard`).
- `[REQ-4] Padronização WebMCP & OpenAPI 3.1:` Atualizar o manifesto MCP com as novas ferramentas corporativas (WMS, Fiscal, Pedidos, Marketplaces) e exportação em `api/openapi.json`.
- `[REQ-5] Proteção Anti-Abuso & Rate Limiting de IA:` Configurar barreiras ativas contra spam e abuso de requisições de agentes de IA em `src/lib/rate-limiter.ts` e `mcp-server.functions.ts`.
- `[REQ-6] Documentação Monumental Canônica:` Criação de `docs/MODULES_CATALOG.md` detalhando cada módulo, casos de uso, fluxo E2E e diagramas de integração.
- `[REQ-7] Validação em Runtime & Build:` Compilação sem erros (`npm.cmd run build`), validação no navegador real com gravação de vídeo e 0 erros de rota ou crash.

---

## 🔍 User Review Required

> [!IMPORTANT]
> **Governança de Módulos no Admin Master:** A inclusão de novos módulos operacionais (`fiscal_nfe`, `wms_expedicao`, `marketplaces_hub`, `pdv_pos`, etc.) em `platform_modules_config` permitirá ao Super Admin habilitar/desabilitar cada funcionalidade instantaneamente para toda a plataforma com um clique no `/admin-master/modulos`.
>
> **Limites de Chamada WebMCP:** Para evitar sobrecarga do banco de dados por agentes de IA externos em loop infinito, estabeleceremos cotas máximas padrão de 30 chamadas/minuto para ferramentas públicas e 120 chamadas/minuto para ferramentas autenticadas de staff, com lockout de segurança automático.

---

## 🛠️ Proposed Changes

### 1. Camada de Dados & Governança no Supabase Postgres

#### [MIGRATION] Migration para popular e atualizar `platform_modules_config`
- Adicionar os módulos operacionais modernos à tabela de governança:
  - `fiscal_nfe`: Módulo Fiscal, NF-e, NFC-e e SEFAZ.
  - `wms_expedicao`: WMS Expedição, Separação por Ondas & Bipagem Ótica.
  - `marketplaces_hub`: Hub Omnicanal (Mercado Livre, iFood, Shopee, Amazon).
  - `pdv_pos`: Frente de Caixa Rápido & Split de Balcão Térmico.
  - `kds_gastronomy`: KDS Cozinha & Monitor de Praças.
  - `juridico_contratos`: JUS Contratos & Assinaturas Digitais.
  - `logistica_pudo`: Pontos PUDO de Retirada & Gestão de Frotas.
  - `marketing_studio`: Social Studio & Exportação Vetorial PNG.
  - `crm_turismo`: Pipeline de Cotações & Propostas de Viagens.
  - `suporte_helpdesk`: Central de Chamados & Protocolos de Suporte.
  - `simlab_econometrics`: SimLab Econometria Preditiva & Censo IBGE 2022.
  - `squad_content`: Squad de Criação Editorial Multi-Agente (Aria, Bruno, Carla, Diego).
  - `webmcp_engine`: Gateway WebMCP para Agentes Externos de IA.

---

### 2. Camada de Governança & BFF (Server Functions)

#### [MODIFY] [modules.functions.ts](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/services/modules.functions.ts)
- Suportar categorias de módulos (`store_operation`, `public_discovery`, `enterprise_tools`, `ai_engine`).
- Função para consultar módulos ativos da loja específica com fallback defensivo.

#### [MODIFY] [admin-master.modulos.tsx](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/admin-master.modulos.tsx)
- Agrupar os módulos em abas ou seções claras: **Vitrines Públicas**, **Operação de Loja / Workspace**, **Inteligência & IA**.
- Filtros por categoria e busca em tempo real.

---

### 3. Camada de Protocolo WebMCP, OpenAPI 3.1 & Proteção Anti-Abuso

#### [MODIFY] [rate-limiter.ts](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/lib/rate-limiter.ts)
- Adicionar políticas específicas para chamadas de IA/MCP:
  - `webmcp_tool_call_public`: Janela de 1 min, máx 30 requisições por IP.
  - `webmcp_tool_call_staff`: Janela de 1 min, máx 120 requisições por Store/Token.
  - `webmcp_batch_dispatch`: Janela de 5 min, máx 10 lotes de simulação.
  - Bloqueio com lockout automático de 15 minutos para IAs que tentarem brute-force ou bypass de autorização.

#### [MODIFY] [mcp-server.functions.ts](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/services/mcp-server.functions.ts)
- Incorporar o `enforceRateLimit` com chaves de identificação (IP + Store ID + Auth Token).
- Adicionar as novas ferramentas WebMCP com Schemas Zod:
  - `wms_list_pending_orders`: Consulta pedidos prontos para separação.
  - `wms_create_picking_batch`: Criação de lote de picking via IA.
  - `fiscal_get_invoice_status`: Consulta de status de NF-e emitida.
  - `marketplaces_get_sync_health`: Diagnóstico de sincronização de estoques externos.
  - `pos_get_cash_status`: Leitura de estado de caixa da loja.

#### [MODIFY] [api.openapi[.]json.ts](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/api.openapi[.]json.ts)
- Atualizar a especificação OpenAPI 3.1 para incluir os novos paths do WebMCP e endpoints de integração de marketplaces e fiscal.

---

### 4. Camada de Documentação de Engenharia

#### [NEW] [MODULES_CATALOG.md](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/docs/MODULES_CATALOG.md)
- Documentação exaustiva de cada um dos módulos da plataforma Waesy:
  - Objetivo comercial e técnico.
  - Jornadas suportadas (Autor, Consumidor, Operador, Admin Master).
  - Rotas de UI e componentes canônicos.
  - Tabelas do Supabase e colunas vitais.
  - BFF Server Functions e contratos de entrada/saída.
  - Webhooks e integrações com terceiros.
  - Ferramentas WebMCP associadas.

---

## 🧪 Verification Plan

### Automated Tests & Compilação
- Executar `npm.cmd run build` para garantir Código 0 e validação completa de tipagem TypeScript e empacotamento do Nitro Cloudflare Pages.
- Executar scripts de auditoria de rotas e integridade sintática.

### Manual & Runtime Verification
- Testar no navegador real a página `/admin-master/modulos` para validar que todos os módulos novos aparecem, podem ser ligados/desligados e salvos no Supabase.
- Validar no navegador o endpoint `/api/openapi.json` e `/api/webmcp.json`.
- Testar a barreira de Rate Limiting simulando disparos repetidos.
- Gravar sessão interativa WebP no navegador comprovando a estabilidade e ausência de erros.
