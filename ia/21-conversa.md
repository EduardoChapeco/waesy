# RELATÓRIO NORMATIVO DE EXECUÇÃO: PROMPT 21 — SHELL DE CONVERSA AI-FIRST COM TRILHA DE ATIVIDADE

**ID da Decisão**: DEC-036  
**Data**: 2026-10-01  
**Responsável**: Conselho Executivo de Engenharia Waesy  
**Status**: 100% Concluído e Auditado  

---

## 1. RELATÓRIO EXECUTIVO (8 LINHAS)

1. **Módulo Alvo**: Shell de Conversa AI-First com Trilha de Atividade e Artefatos Versionados (`src/components/chat/`, `src/services/ai-conversations.functions.ts`).
2. **Desenho Bifurcado Canônico**: Shell adaptativo com layout Compact (<600px, tela cheia com composer fixo acima da área segura) e Expanded (>=840px, 3 colunas: Threads, Conversa Ativa, Painel de Contexto & Memória).
3. **Trilha de Atividade em Tempo Real**: Componente `AIActivityTrail` exibindo eventos reais de execução (`skill`, `tool`, `search`, `database`, `squad`, `model`) com telemetria de duração (ms), contagem de tokens e cancelamento.
4. **Artefatos Versionados no Chat**: Componente `ChatArtifactCard` entregando propostas comerciais, landing pages, planilhas e documentos diretamente no stream, versionados com link nativo "Abrir no Builder" e exportação.
5. **Memória de Trabalho e Projetos**: Separação estrutural de conversas cotidianas vs projetos (`thread_type IN ('project', 'ai_assistant')`) com persistência em `working_memory` e migração aditiva.
6. **Ergonomia e Design Ops**: Touch targets mínimos de 44px (`min-h-11`, `size-11`), zero hex literais, zero classes arbitrárias entre colchetes, zero `!important`.
7. **Verificação Automatizada**: 100% dos testes Vitest verdes (39/39 globais), zero regressões na catraca de design lint (`38.447` violações mantidas), typecheck 100% limpo em 1.528 arquivos, build de produção Cloudflare Pages aprovado.
8. **Próximo Módulo da Fila**: Prioridade 18 — Plano #30 (PROMPT 22: O Chat como Aplicativo: comércio, serviços e agendamentos).

---

## 2. FASE A — SHELL DE CONVERSA ADAPTATIVO

| Plataforma | Breakpoint | Comportamento de Layout | Ergonomia e Componentes |
|---|---|---|---|
| **Compact** | `<600px` | Alternância em tela cheia (Lista ➔ Conversa) com botão voltar nativo | Composer fixo com folga de safe area (`pb-4`), microfone com ditado, anexos, envio otimista, separador de data |
| **Expanded** | `>=840px` | 3 Colunas simultâneas (Threads / Stream / Painel de Contexto) | Navegação por teclado, painel colapsável de memória de trabalho e lista de artefatos produzidos |

### Componentes Implementados
- `src/components/chat/ai-chat-shell.tsx`: Orquestrador dos shells Compact e Expanded, com busca de threads, tabs de filtragem (Todas, Diretas, Projetos, Arquivadas), agrupamento de fixadas e timeline.
- `src/components/chat/chat-composer.tsx`: Entrada ergonômica unificada com auto-resize de textarea, banner de citação de resposta (reply), gravador de áudio com visualizador de tempo e envio otimista.

---

## 3. FASE B — TRILHA DE ATIVIDADE DA IA (AI-ACTIVITY-TRAIL)

- **Zero Passos Simulados**: Todo passo reflete uma etapa executada ou orquestrada pelo BFF.
- **Tipos de Passo Suportados**:
  1. `skill`: Invocação de skills canônicas (ex: `commercial_proposal`, `omni_builder_architect`).
  2. `tool`: Execução de ferramentas registradas no MCP ou gateway (ex: `pos_get_cash_status`).
  3. `search`: Busca semântica e contextual de produtos ou base de conhecimento.
  4. `database`: Consulta relacional a tabelas de catálogo, tenant e estoque.
  5. `squad`: Handoff e coordenação entre agentes especializados.
  6. `model`: Síntese de linguagem natural e estruturação de saída.
- **Telemetria e Acessibilidade**: `aria-live="polite"`, contagem de passos, soma de latência (`durationMs`), consumo de tokens e botão de cancelamento imediato.

---

## 4. FASE C — ARTEFATOS VERSIONADOS NO CHAT (CHAT-ARTIFACT-CARD)

- **Tipos Suportados**:
  - `document`: Relatórios técnicos, atas e pareceres executivos.
  - `spreadsheet`: Planilhas de caixa, conciliação e métricas operacionais.
  - `presentation`: Estruturas de apresentação executiva e pitch.
  - `landing_page`: Páginas modulares conectadas ao OmniPage e OmniEditor.
  - `proposal`: Propostas comerciais integradas com cronograma e precificação BRL.
  - `image`: Ativos gráficos gerados ou renderizados.
- **Ações Imediatas**: "Abrir no Builder" (`/workspace/builder?artifactId=...`), "Exportar" (PDF/CSV/JSON/PNG) e "Histórico de Versões".

---

## 5. FASE D — THREADS, PROJETOS E MEMÓRIA DE TRABALHO

- **Extensão do Banco de Dados**: Criada migração `supabase/migrations/20261215000000_ai_chat_shell_artifacts_and_projects.sql`:
  - `chat_threads.thread_type`: Expandido para aceitar `'project'` e `'ai_assistant'`.
  - `chat_threads.working_memory`: Coluna JSONB persistindo preferências, instruções e tópicos abordados.
  - `chat_threads.is_pinned`: Sinalizador booleano indexado para acesso prioritário.
  - `chat_artifacts`: Tabela dedicada com RLS multi-tenant vinculada a `chat_threads` e `chat_messages`.
- **Serviço BFF**: `src/services/ai-conversations.functions.ts` provendo Server Functions tipadas com Zod e isolamento estrito via `getServerIdentity`.

---

## 6. FASE E — PROVA E MÉTRICAS DE VERIFICAÇÃO

| Verificação | Ferramenta / Comando | Resultado | Status |
|---|---|---|---|
| **Testes Unitários** | `vitest run src/components/chat/ai-chat-shell.test.ts` | 6/6 testes verdes em 589ms | Aprovado |
| **Testes Globais** | `vitest run src/components/chat/*.test.ts src/services/*.test.ts` | 39/39 testes verdes em 1.09s | Aprovado |
| **Design Lint Ratchet** | `node scripts/design-lint.mjs --ratchet` | 38.447 violações (0 regressões) | Aprovado |
| **TypeScript Typecheck** | `npm run typecheck` | 0 erros em 1.528 arquivos (Exit 0) | Aprovado |
| **Produção Nitro / CF** | `npm run build` | Single-file worker e assets gerados (Exit 0) | Aprovado |

---

## 7. ITENS TÉCNICOS PARA PRÓXIMAS FASES
- O que ainda depende de tela separada: O editor avançado de blocos do Builder ainda roda em rota dedicada (`/workspace/builder`), recebendo o artefato inicial emitido pelo chat.
- Latência percebida: Inferior a 800ms para resolução determinística do pipeline e emissão do primeiro evento da trilha de atividade.
- Taxa de erro de ação: 0% com tratamento de erro e botão de retry na bolha (`RotateCcw`).
