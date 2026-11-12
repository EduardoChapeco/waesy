# SPEC-20261112-COPILOT-WORKBENCH-MANUS-PARITY-PROJECT-HIERARCHY

## 1. Contexto e Motivação
A experiência do Waesy Copilot em `/workspace/copilot` apresentava quatro deficiências centrais identificadas visualmente e operacionalmente pelo usuário:
1. **Erro de Limite de Subrequests do Cloudflare Worker (Imagem 1):**
   - O runtime Cloudflare Worker falhava ao registrar o exchange com:
     `Falha ao finalizar exchange do Copilot: Error: Too many subrequests by single Worker invocation.`
   - Causa raiz: `shouldSearchPlatform` disparava buscas concorrentes em 10 tabelas Supabase (`products`, `stores`, `events`, `classifieds`, `tourism_trips`, `news_articles`, etc.) para qualquer prompt com 3 ou mais palavras, somado às chamadas de identidade, contexto semântico, rate limit, tollbooth de tokens e persistência atômica, excedendo o teto de 50 subrequests por invocação no plano Cloudflare Standard.
2. **Dados Sintéticos / Mocks Hardcoded nas Gavetas de Telemetria (Imagens 2 e 3):**
   - Na gaveta de tarefas em segundo plano (`CopilotBackgroundTasksDrawer`), as tarefas (`playwright_browser_agent` e `whatsapp_sdr_sync`) estavam declaradas como objetos literais estáticos no arquivo `src/routes/workspace.copilot.tsx` (linhas 602–623).
   - No drawer do computador (`ManusComputerDrawer`), comandos de terminal (`docker ps`), URL do navegador e diff de código (`config/whatsapp-governance.json`) vinham de `DEFAULT_STEPS`, exibindo dados falsos mesmo para conversas recém-criadas.
   - Os contadores na barra de topo (`2` em Segundo Plano e `3/3` no Computador) eram números estáticos de markup.
3. **Ausência de Hierarquia Estruturada de Trabalho (Pastas ➔ Projetos ➔ Conversas):**
   - O Copilot operava com uma lista plana de `ai_threads`.
   - O usuário necessita de segregação real:
     - **Pastas:** Agrupadores organizacionais por área/departamento (ex: Turismo, SAC WhatsApp, Financeiro, Marketing).
     - **Projetos:** Unidades isoladas com escopo próprio, histórico de execuções, timeline própria e **Base de Conhecimento (Context Files / RAG)**, onde arquivos (PDFs de pacotes, planilhas de tarifas, contratos) são indexados e embasam todas as respostas da IA naquele projeto.
     - **Conversas:** Sessões individuais dentro de projetos ou diretas na pasta.
4. **Desconexão Estética com o Shell (Sensação de "Widget Externo / Iframe"):**
   - A interface possuía múltiplos cabeçalhos sobrepostos, badges arbitrários (`Ambiente Seguro`, `Waesy 2.0 Lite`, `Orquestrador Multi-Agente`), botões flutuantes despadronizados e colunas desproporcionais, transmitindo a sensação de um componente colado dentro do Workspace em vez de uma ferramenta nativa.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Resolução de Subrequests e Governança de Rede (Event-Driven & State-Driven)
- **EARS-01:** O sistema DEVE declarar explicitamente `max_subrequests = 1000` em `wrangler.toml` sob a seção `[limits]`.
- **EARS-02:** QUANDO o usuário enviar uma mensagem no Copilot, a função `shouldSearchPlatform` DEVE ser acionada EXCLUSIVAMENTE se o prompt contiver termos explícitos de intenção local (`SEARCH_TERMS`), proibindo execuções cegas por contagem genérica de palavras (`length >= 3`).
- **EARS-03:** ENQUANTO uma busca interna for executada por `searchPlatformForCopilot`, o sistema DEVE limitar as consultas concorrentes a no máximo 4 tabelas prioritárias por inferência de nicho, mantendo as subrequests da chamada HTTP abaixo de 10.

### 2.2 Verdade Estrita nos Painéis de Telemetria (Ubiquitous & Anti-Fake)
- **EARS-04:** O sistema DEVE omitir completamente o array sintético `DEFAULT_STEPS` de `ManusComputerDrawer` e a lista estática de tarefas em `workspace.copilot.tsx`.
- **EARS-05:** SE a conversa ativa não possuir tarefas em segundo plano ou passos de execução de ferramentas, o sistema DEVE renderizar empty states honestos ("Nenhuma tarefa ativa" e "Nenhuma execução de ferramenta registrada para esta conversa").
- **EARS-06:** Os badges de contagem na barra de ferramentas superior DEVEM ser derivados dinamicamente do tamanho real dos vetores `computerSteps.length` e `backgroundTasks.length`, sendo ocultados quando o contador for zero.

### 2.3 Modelo Hierárquico: Pastas ➔ Projetos ➔ Conversas & Base de Conhecimento (State-Driven)
- **EARS-07:** O banco de dados DEVE fornecer as entidades relacionais:
  - `copilot_folders`: Pastas de agrupamento (`id`, `store_id`, `name`, `icon`, `color`, `created_at`).
  - `copilot_projects`: Projetos dedicados (`id`, `folder_id`, `store_id`, `title`, `description`, `system_instructions`, `settings`, `created_at`).
  - `copilot_project_files`: Base de conhecimento de contexto do projeto (`id`, `project_id`, `filename`, `file_url`, `file_type`, `file_size`, `extracted_text`, `status`).
  - `copilot_project_embeddings`: Vetores semânticos para RAG sobre os arquivos do projeto.
- **EARS-08:** QUANDO o usuário submeter um prompt dentro de um Projeto, o runtime de IA DEVE realizar busca vetorial nos arquivos da base de conhecimento daquele projeto específico e injetar os trechos relevantes em `<PROJECT_KNOWLEDGE_BASE>`, embasando as respostas da IA diretamente nas regras do negócio.
- **EARS-09:** Cada Projeto DEVE manter sua própria timeline cronológica de execuções, seus próprios artefatos e suas próprias tarefas em segundo plano, garantindo isolamento estrito entre departamentos.

### 2.4 Padronização Visual e Ergonomia Nativa (Padrão Linear / Apple / Manus)
- **EARS-10:** A interface de `/workspace/copilot` DEVE adotar layout em 3 colunas harmonizado com o Workspace:
  - **Coluna 1 (Navegação):** Árvore de Pastas, Projetos e Conversas com pesquisa unificada e ações rápidas.
  - **Coluna 2 (Fluxo de Trabalho):** Fluxo de conversa centralizado com largura máxima de leitura (`max-w-3xl`), bolhas de diálogo nativas sem caixas explicativas redundantes e barra de input integrada sem elevações flutuantes desnecessárias.
  - **Coluna 3 (Painel Lateral de Projeto):** Arquivos da base de conhecimento, tarefas ativas e artefatos gerados (dashboards, planilhas, mapas).
- **EARS-11:** Todos os controles interativos DEVEM cumprir a altura mínima de 44px (`h-11 min-h-11`), foco teclado visível (`:focus-visible:ring-2`) e zero novas violações no Design Lint.

---

## 3. Matriz de Arquivos do Módulo

| Arquivo | Responsabilidade | Status |
| :--- | :--- | :--- |
| `wrangler.toml` | Elevação de `max_subrequests = 1000` | Implementado |
| `src/services/copilot-internal-search.ts` | Otimização estrita de `shouldSearchPlatform` e limite de 4 tabelas | Implementado |
| `src/routes/workspace.copilot.tsx` | Purga de mocks estáticos e badges hardcoded de segundo plano | Implementado |
| `src/components/chat/manus-computer-drawer.tsx` | Remoção de `DEFAULT_STEPS` e introdução de empty state honesto | Implementado |
| `supabase/migrations/20270401000000_copilot_folders_projects_knowledge_base.sql` | Estrutura relacional de Pastas, Projetos e Arquivos de Contexto | Implementado |
| `src/services/copilot-projects.functions.ts` | Server functions de gestão de Pastas, Projetos e RAG de arquivos | Implementado |
| `src/components/chat/copilot-project-knowledge-panel.tsx` | Painel de upload e indexação de arquivos de contexto | Implementado |
| `src/services/api-orchestrator.functions.ts` | Carregamento em lote (`getBatchActiveKeysForProviders`) sem N+1 subrequests | Implementado |
| `src/services/ai-core-gateway.functions.ts` | Teto `MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS = 8` no loop de cascata | Implementado |
| `src/services/ai-conversations.functions.ts` | Injeção de `<PROJECT_KNOWLEDGE_BASE>` + vínculo `folder_id`/`project_id` em threads | Implementado |
| `src/components/chat/manus-task-telemetry-sheet.tsx` | Remoção de métricas sintéticas e cálculo real via `computeCopilotSessionTelemetry` | Implementado |
| `src/components/chat/ai-chat-shell.tsx` | Árvore Pastas ➔ Projetos ➔ Conversas + painel RAG e tasks reais | Implementado |
