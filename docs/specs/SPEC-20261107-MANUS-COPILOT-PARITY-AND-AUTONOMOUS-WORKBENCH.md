# SPEC-20261107-MANUS-COPILOT-PARITY-AND-AUTONOMOUS-WORKBENCH

## 1. Metadados e Contexto
- **Identificador:** `SPEC-20261107-MANUS-COPILOT-PARITY-AND-AUTONOMOUS-WORKBENCH`
- **Data:** 2026-11-07
- **Autor:** Sistema de Agentes Antigravity
- **Status:** Aprovado para Execução
- **Objetivo:** Erradicação definitiva de mocks, regexes rígidas e passos simulados no Copilot, transformando-o em um ecossistema agêntico soberano estilo Manus/Claude com Tool Calling real (MCP), personas especialistas contextuais, workbench de artefatos interativos (Dashboards, Mapas georreferenciados, Gerador de Posts HTML2Img, Planilhas dinâmicas) e integração de telemetria de navegador/execução.

---

## 2. Requisitos em Sintaxe EARS

### EARS-01: Roteamento Agêntico Dinâmico com Function Calling (Zero Regex Bruta)
- **Quando** o usuário submeter qualquer prompt no chat do Copilot,
- **o sistema deve** submeter a mensagem ao modelo de linguagem unificado com as declarações de ferramentas (Tool/Function Calling) registradas no `MCP_TOOL_REGISTRY`,
- **em vez de** tentar classificar a intenção exclusivamente via `detectIntent` (regexes `text.includes`).

### EARS-02: Execução Real de Subagentes Especialistas (Zero Fake Steps)
- **Quando** uma tarefa demandar decomposição em subagentes (`@planner`, `@investigator`, `@harvester`, `@critic`, `@ads_performance`, `@sdr_hunter`, `@creative_studio`),
- **o sistema deve** executar invocações reais de LLM ou chamadas de ferramentas especializadas para cada papel,
- **em vez de** registrar steps com strings estáticas e contadores fictícios de tokens.

### EARS-03: Visualizador de Artefatos Vivos e Multimodais (Workbench Manus)
- **Quando** o Copilot produzir um artefato de dados ou visualização,
- **o sistema deve** renderizar o componente rico correspondente na área de trabalho:
  1. `dashboard`: Cards de KPI, indicadores e métricas financeiras/operacionais.
  2. `map_view`: Mapa interativo georreferenciado com marcadores e detalhes de contato.
  3. `creative_post`: Renderizador de criativos e posts de redes sociais com personalização de cores, fontes e proporções (1:1, 4:5, 9:16).
  4. `data_grid`: Tabela interativa com pesquisa, ordenação e exportação.
  5. `document` / `presentation`: Editor visual de documentos e slides.

### EARS-04: Telemetria Real do Navegador e Ferramentas (Zero Fictional Docker Steps)
- **Quando** o drawer do computador/navegador (`ManusComputerDrawer`) for acionado,
- **o sistema deve** exibir a telemetria real das execuções de scraper, web tasks (Steel.dev / Playwright VPN) e chamadas de MCP,
- **em vez de** exibir o array estático `DEFAULT_STEPS` com comandos fictícios de SSH/Docker.

### EARS-05: Governança de Quotas e Tarifação Transparente (Token Tollbooth)
- **Quando** uma tarefa de alto custo for solicitada (mineração em lote de CNPJs, automação de navegador headless, geração em massa de criativos),
- **o sistema deve** validar o saldo de tokens da loja via `token-tollbooth.server.ts` e registrar o débito na tabela `customer_token_ledger`, bloqueando execuções abusivas de usuários sem saldo.

---

## 3. Matriz de Componentes e Escopo Atômico

| Componente | Caminho do Arquivo | Natureza da Alteração |
| :--- | :--- | :--- |
| **BFF Conversacional** | `src/services/ai-conversations.functions.ts` | Conexão do Tool Calling real com o registro MCP e roteamento de personas. |
| **Orquestrador Autônomo** | `src/services/autonomous-copilot-orchestrator.ts` | Substituição de mocks estáticos por agentes executáveis reais e enriquecedores. |
| **Drawer do Computador** | `src/components/chat/manus-computer-drawer.tsx` | Conexão com os passos reais de telemetria da thread em vez de mock estático. |
| **Painel de Artefatos** | `src/components/chat/copilot-artifact-panel.tsx` | Adição dos renderizadores de Dashboard, Mapa Interativo e Criativos Sociais. |
| **Tipos de Artefato** | `src/types/chat.ts` | Extensão da união `ChatArtifactType` para suportar `dashboard`, `map_view`, `creative_post`. |

---

## 4. Critérios de Aceite e Verificação
1. Zero ocorrências de subagentes emitindo passos com strings hardcoded e contadores falsos de tokens.
2. `manus-computer-drawer.tsx` consumindo dados dinâmicos da execução da thread.
3. `copilot-artifact-panel.tsx` suportando e renderizando `dashboard`, `map_view`, `creative_post`, `spreadsheet` e `document`.
4. Roteamento do Copilot permitindo respostas qualificadas para Ads, Prospecção BDR e Descoberta Local.
5. Aprovação no typecheck e build de produção sem regressões.
