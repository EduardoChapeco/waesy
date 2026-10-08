# SPEC-MASTER: Arquitetura, Engenharia Reversa e Plano Mestre de Implementação do Waesy Autonomous Copilot Engine

**Código da Especificação:** `SPEC-MASTER-COPILOT-AUTONOMOUS-ENGINE`
**Data:** 2026-10-07
**Status:** Aprovado para Execução
**Alvo:** Integração do Motor de Agentes Autônomos (Estilo Manus 2.0 / OpenDevin / SWE-agent / Browser-Use) ao Copilot Waesy

---

## 1. Engenharia Reversa dos 4 Pilares de Referência

Para elevar o Copilot do Waesy ao patamar de plataformas autônomas de ponta (como Manus AI), decompomos os mecanismos centrais de 4 referências mundiais de código aberto:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   WAESY AUTONOMOUS COPILOT ENGINE                      │
├─────────────────────┬───────────────────┬──────────────────────────────┤
│    OPENMANUS        │    OPENDEVIN      │     SWE-AGENT / BROWSER-USE  │
│  (Planner-Actor)    │ (Event-Driven UI) │    (ACI & Visual Extraction) │
├─────────────────────┼───────────────────┼──────────────────────────────┤
│ • DAG de Subtarefas │ • Timeline SSE    │ • Janelas cirúrgicas de arq. │
│ • Spawner Paralelo  │ • Drawer expansível│ • Scraping semântico DOM     │
│ • Parada Crítica P0 │ • Visualizador    │ • Validação com testes/lint  │
│ • Auto-Revisão      │   de Artefatos    │ • Zero alucinação/fakes      │
└─────────────────────┴───────────────────┴──────────────────────────────┘
```

### 1.1 OpenManus (O Cérebro Coordenador & Spawner de Subagentes)
- **Mecanismo:** O agente não tenta resolver prompts longos em um único turno de LLM. Ele atua como um `MetaPlanner` que divide o objetivo em um DAG (Grafo Acíclico Dirigido) de tarefas independentes.
- **Spawner Paralelo:** Dispara subagentes especializados que atuam em paralelo sobre repositórios ou domínios distintos (ex: Subagente 1 audita viagens, Subagente 2 audita banco de dados, Subagente 3 minera dados de CNPJ).
- **Auto-Revisão (Critic):** Um sintetizador recebe as evidências brutas de cada subagente, filtra contradições e valida se os critérios de aceite foram cumpridos antes de responder.
- **Protocolo de Parada Humana (Human-in-the-Loop):** Ao detectar violação de segurança P0 (ex: bypass de RLS, risco multi-tenant, alteração destrutiva em lote), o agente pausa e solicita autorização explícita do usuário.

### 1.2 OpenDevin / All-Hands AI (A Experiência do Usuário & Timeline de Eventos)
- **Mecanismo:** Abandona o formato de chat conversacional passivo. Opera uma máquina de estados finitos (FSM) orientada a eventos.
- **Trilha de Atividades em Tempo Real:** Cada ação do agente (pensando, lendo arquivo, executando comando, minerando, gerando artefato) emite eventos estruturados via Server-Sent Events (SSE) ou polling reativo.
- **Superfície de Duplo Painel:** Um painel exibe a timeline de raciocínio e execução técnica dos subagentes; o outro exibe o produto de trabalho vivo (Artefato, Planilha, Documento, Rascunho de Campanha, Mapa).

### 1.3 SWE-agent (A Interface Agente-Computador - ACI)
- **Mecanismo:** Interage com sistemas e código através de ferramentas projetadas para não sobrecarregar a janela de contexto.
- **Visualização Delimitada:** Leitura cirúrgica de arquivos com `start_line` e `end_line` (em vez de carregar arquivos gigantes na memória).
- **Gatilho de Verificação:** Nenhuma tarefa é declarada pronta sem passar por validação determinística de tipo (`typecheck`), testes automatizados e compilação limpa.

### 1.4 Browser-Use (Navegação Web, Crawling & Mineração Multimodal)
- **Mecanismo:** Agente visual e semântico capaz de extrair estruturas de dados da web sem depender de mocks.
- **Extração com Fallback Resiliente:** Em caso de bloqueio ou erro, reporta com honestidade o status do conector em vez de injetar notícias ou produtos fictícios na aplicação.

---

## 2. Auditoria e Inventário do que Já Existe no Waesy (Zero Duplicação)

Antes de qualquer nova linha de código, o sistema DEVE reutilizar e respeitar a base existente:

| Ativo Existente | Localização no Repositório | Papel Canônico | Ação de Evolução |
|---|---|---|---|
| **AI Pool & Provedores** | `src/services/ai-pool.ts` | Fachada de LLMs (OpenRouter, Groq, DeepSeek) | Manter como canal exclusivo de inferência |
| **Cofre de Segredos** | `src/services/secret-vault.functions.ts` | Gestão de chaves API encriptadas por tenant | Utilizar para credenciais de mineradores |
| **Copilot Orchestrator** | `src/services/autonomous-copilot-orchestrator.ts` | Orquestrador em 5 elos com hash SHA-256 | Evoluir de fila linear para Spawner de Subagentes |
| **Persistência de Execução** | `src/services/copilot-execution-persistence.ts` | Tabelas `copilot_executions`, `copilot_steps` | Adicionar suporte a `parent_task_id` (subagentes) |
| **FSM & Tipos** | `src/types/copilot-fsm.ts`, `src/types/chat.ts` | Estados da FSM e contratos de artefatos | Integrar status `awaiting_human_approval` |
| **Drawer do Copilot** | `src/components/chat/waesy-copilot-drawer.tsx` | Interface do usuário em Sheet/Drawer | Adicionar dropzone de arquivos e abas de subagentes |
| **Trilha de Atividades** | `src/components/chat/ai-activity-trail.tsx` | Renderizador visual de passos em tempo real | Exibir agrupamento por subagente concorrente |
| **Artefatos Vivos** | `src/components/chat/chat-artifact-card.tsx` | Cards visuais de planilhas e relatórios | Suportar visualização expandida de documentos |
| **Mineradores Nativos** | `src/services/mining/` (`places`, `cnpj`, `datajud`, `news`) | Workers de extração real | Integrar como ferramentas invocáveis pelos subagentes |

---

## 3. Arquitetura Alvo: Waesy Autonomous Copilot Pro

```
                  ┌──────────────────────────────────────────────┐
                  │          USUÁRIO NO DRAWER COPILOT           │
                  │   (Prompt + Upload de Arquivos PDF/Planilha) │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │           ORQUESTRADOR MASTER FSM            │
                  │     Decomposição MECE em Subtarefas DAG      │
                  └───────┬───────────────┬───────────────┬──────┘
                          │               │               │
        ┌─────────────────▼──┐   ┌────────▼─────────┐   ┌─▼──────────────────┐
        │ SUBAGENTE 1: MINER │   │ SUBAGENTE 2: JUS │   │ SUBAGENTE 3: CODE  │
        │ Places / CNPJ / Web│   │ Processos/DataJud│   │ Schemas / DB / UI  │
        └─────────────────┬──┘   └────────┬─────────┘   └─┬──────────────────┘
                          │               │               │
                          └───────────────┼───────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │             CRITIC & SINTETIZADOR            │
                  │  Auto-revisão, validação de schema e prova   │
                  └───────────────────────┬──────────────────────┘
                                          │
                  ┌───────────────────────┴──────────────────────┐
                  │                                              │
                  ▼                                              ▼
        [FLUXO NORMAL: 100% SEGURO]                   [RISCO CRÍTICO P0 / RLS]
        • Emissão de Artefato Vivo                     • Pausa obrigatória da FSM
        • Persistência no Banco                        • Banner de Confirmação Humana
        • Renderização no Drawer                       • "Autorizar nova microfase?"
```

### 3.1 Camada 1: Drawer Expandível com Upload Multimodal
- **Design System:** Rigorosamente alinhado a `docs/design/DESIGN.md`, Apple HIG e Linear. Sem cores literais, usando tokens semânticos (`bg-surface-elevated`, `border-border-subtle`).
- **Upload de Arquivos:** Área de dropzone acessível no rodapé do drawer, permitindo anexar PDFs, imagens de notas fiscais, planilhas CSV/XLSX.
- **Armazenamento Seguro:** Persistência no bucket Supabase Storage com chave isolada por tenant (`tenants/${tenantId}/copilot-uploads/`).
- **Extração Inicial:** Processamento seguro de texto/conteúdo antes do envio ao Planner.

### 3.2 Camada 2: Planner, Spawner e Execução Concorrente
- O `autonomous-copilot-orchestrator.ts` recebe a meta e:
  1. Cria um registro pai em `copilot_executions`.
  2. Cria *N* registros filhos em `copilot_execution_steps` com papéis atribuídos:
     - `@planner`: Traça o mapa de dependências.
     - `@investigator`: Varre código, banco ou web.
     - `@harvester`: Dispara mineradores nativos de dados reais.
     - `@critic`: Revisa conformidade contra dados fictícios ou quebras de contrato.
  3. Dispara a execução concorrente via `Promise.allSettled` ou fila assíncrona.

### 3.3 Camada 3: Barreira Anti-Fakes e Honestidade Estrutural
- **Regra Rígida:** Se um minerador ou consulta externa falhar ou se a credencial não estiver no cofre (`secret-vault`), o subagente DEVE emitir status de falha honesta (`status: "failed"`, `error: "Credencial não configurada no cofre"`).
- **Proibição Absoluta:** É expressamente proibido retornar arrays estáticos de clientes, cotações fictícias ou links mortos para "simular sucesso".

### 3.4 Camada 4: Ponto de Decisão Humana (Human Checkpoint)
- Caso qualquer subagente identifique uma alteração estrutural, risco de quebra de contrato de banco ou ambiguidade em regras multi-tenant:
  1. O estado da FSM transiciona para `AWAITING_HUMAN_APPROVAL`.
  2. O drawer exibe um card de decisão com contexto, evidência do risco e opções claras:
     - `[Autorizar Microfase]`
     - `[Cancelar e Manter Escopo Original]`
  3. Nenhuma mutação de banco de dados é realizada até a confirmação explícita.

---

## 4. Plano de Fases de Implementação

| Fase | Foco Técnico | Arquivos Impactados | Critério de Aceite |
|---|---|---|---|
| **Fase 1** | **Auditoria e Saneamento da Infra Atual** | `services/copilot-*`, `services/ai-pool.ts` | 0 erros de tipo, schemas de banco de `copilot` mapeados 1:1 sem campos fantasmas |
| **Fase 2** | **Upgrade da FSM & Spawner de Subagentes** | `types/copilot-fsm.ts`, `services/autonomous-copilot-orchestrator.ts` | FSM suporta subtarefas paralelas e estado `awaiting_approval` |
| **Fase 3** | **Upload Multimodal no Drawer** | `components/chat/waesy-copilot-drawer.tsx`, `components/chat/file-dropzone.tsx` | Drag & drop de arquivos com upload seguro para Storage e leitura de texto |
| **Fase 4** | **Timeline e Visualizador de Artefatos Vivos** | `components/chat/ai-activity-trail.tsx`, `components/chat/chat-artifact-card.tsx` | Exibição de subagentes concorrentes em cards limpos com design Apple/Linear |
| **Fase 5** | **Conexão dos Mineradores Reais ao Pool** | `services/mining/`, `services/secret-vault.functions.ts` | Zero dados fakes; ferramentas reportam erros honestos ou dados reais persistidos |
| **Fase 6** | **Gates de Verificação e Build Limpo** | Todo o repositório | `typecheck`, testes unitários e `build` passam com Exit Code 0 |
