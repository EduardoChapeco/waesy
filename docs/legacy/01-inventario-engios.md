# 01-inventario-engios.md — Inventário Exaustivo: ENGIOS (engiosai)

- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\ENGIOS`
- **Último Commit:** `2d0bca1` (Eduardo, 29/03/2026: `fix: inject vercel preset to handle serverless 500 exceptions`)
- **Stack Base:** Remix Run v2 (`@remix-run/node`, `@remix-run/react`), Vite, UnoCSS, Electron, Cloudflare Worker.

---

## A) Banco de Dados (Supabase PostgreSQL)
Mapeamento extraído de `supabase/migrations/`:

| Tabela | Colunas Chave / Tipos | Índices / Constraints | RLS / Políticas | Qualidade | Risco |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `engios_workspaces` | `id (uuid pk)`, `name (text)`, `slug (text unique)`, `settings (jsonb)`, `created_at` | `idx_workspaces_slug` | RLS ativo por tenant | Boa | Baixo |
| `engios_company_memory` | `id (uuid pk)`, `workspace_id (uuid)`, `category (text)`, `key (text)`, `content (text)` | `uq_workspace_key (workspace_id, key)` | Isolado por workspace | Ótima | Baixo |
| `engios_brand_kits` | `id (uuid pk)`, `workspace_id (uuid)`, `colors (jsonb)`, `typography (jsonb)`, `voice (jsonb)` | `uq_brand_workspace` | Isolado por workspace | Ótima | Baixo |
| `engios_campaigns` | `id (uuid pk)`, `workspace_id (uuid)`, `title (text)`, `status (text)`, `briefing (jsonb)` | FK `workspace_id` | Isolado por workspace | Boa | Baixo |
| `engios_editorial_calendar` | `id (uuid pk)`, `workspace_id (uuid)`, `scheduled_date (date)`, `content (jsonb)` | `idx_calendar_date` | Isolado por workspace | Boa | Médio |
| `squad_executions` | `id (uuid pk)`, `workspace_id (uuid)`, `squad_id (text)`, `status (text)`, `logs (jsonb)` | FK `workspace_id` | Isolado por workspace | Ótima | Médio |
| `squad_agent_runs` | `id (uuid pk)`, `execution_id (uuid)`, `agent_name (text)`, `output (jsonb)`, `tokens_used (int)` | FK `execution_id` | Cascata de deleção | Ótima | Baixo |
| `squad_checkpoints` | `id (uuid pk)`, `execution_id (uuid)`, `step (int)`, `approval_status (text)` | FK `execution_id` | HITL (Human-in-the-loop) | Ótima | Baixo |
| `engios_squad_blueprints` | `id (uuid pk)`, `name (text)`, `blueprint (jsonb)`, `version (int)` | Único por nome/versão | Catálogo do sistema | Boa | Baixo |
| `api_keys_vault` | `id (uuid pk)`, `workspace_id (uuid)`, `service (text)`, `encrypted_key (text)` | Criptografia simétrica | RLS restrito a admin | Frágil | Alto (migrar para segredos do Waesy) |

---

## B) Backend (Remix Actions & API Endpoints)
Mapeamento extraído de `app/routes/api.*.ts`:

1. `api.extract-brand.ts` (linhas 1-169):
   - **O que faz:** Faz fetch em URL pública, extrai `theme-color`, varre frequências de códigos HEX inline, mapeia Google Fonts e `font-family`, extrai `h1`/`h2`/meta-description e aciona LLM para deduzir DNA completo.
   - **Dependências:** Fetch nativo com timeout de 8s, parser regex.
   - **Qualidade:** Ótima. Risco: Baixo.
2. `api.openbox.intelligence.ts` (linhas 1-95):
   - **O que faz:** Integração com APIs abertas do IBGE (SIDRA) para extrair PIB per capita municipal e população oficial do Censo 2022.
   - **Dependências:** `app/lib/modules/openbox/ibge-api.ts`.
   - **Qualidade:** Ótima (dados oficiais sem alucinação). Risco: Baixo.
3. `api.brand-memory-get.ts` & `api.brand-memory-update.ts`:
   - **O que faz:** CRUD atômico de fragmentos de memória corporativa da empresa (`engios_company_memory`).
   - **Qualidade:** Boa. Risco: Baixo.
4. `api.squad.run.ts`, `api.squad.status.ts`, `api.squad.checkpoint.approve.ts`:
   - **O que faz:** Motor de execução assíncrona multi-agente com paradas para aprovação humana (Human-in-the-loop).
   - **Qualidade:** Ótima. Risco: Médio.

---

## C) Inteligência Artificial (Prompts, Squads & Agentes)
Mapeamento extraído de `app/lib/squads/agents/`:

1. `sherlock.agent.ts` (linhas 1-61):
   - **Papel:** Especialista em OSINT, Social Listening e Auditoria Competitiva.
   - **Invariante:** Proibição explícita de alucinar métricas econômicas; consome estritamente JSON do OpenBox IBGE.
   - **Qualidade:** Ótima. Risco: Baixo.
2. `brand.agent.ts` (linhas 1-146):
   - **Papel:** "Bia Brand Kit" — consultora de branding de elite (Kapferer, Aaker, Brand Sprint).
   - **Fases:** Brand Discovery -> Brand Strategy (Arquétipos Junguianos) -> Brand Kit Visual -> Voice Guidelines -> Brandbook.
   - **Qualidade:** Ótima. Risco: Baixo.
3. `marketing.agent.ts` & `conteudo.agent.ts`:
   - **Papel:** Copywriting e orquestração de campanhas multicanais orientadas a frameworks (AIDA, PAS).
   - **Qualidade:** Boa. Risco: Baixo.
4. `runtime.server.ts` (`app/lib/squads/core/`):
   - **Papel:** Orquestrador sequencial e paralelo de agentes com injeção de contexto compartilhado.
   - **Qualidade:** Ótima. Risco: Médio.

---

## D) Extração
1. `app/routes/api.extract-brand.ts`: Extrator determinístico de DNA cromático e tipográfico de sites externos.
2. `app/lib/modules/openbox/market-analyzer.ts`: Extrator de indicadores socioeconômicos reais do IBGE (PIB municipal, População).

---

## E) Metodologias e Matrizes
Mapeamento extraído de `app/lib/squads/core/frameworks.ts` (linhas 8-68):
- **AIDA:** Atenção (Hook), Interesse (Diferencial), Desejo (Benefícios/Prova), Ação (CTA).
- **PAS:** Problema (Dor), Agitação (Consequências), Solução (Resgate).
- **StoryBrand 7-Part:** Personagem, Problema, Guia, Plano, Chamada à Ação, Sucesso, Fracasso evitado.
- **SWOT Analysis:** Forças, Fraquezas, Oportunidades, Ameaças (aplicado pelo Sherlock).
- **Estratégia do Oceano Azul:** Matriz de 4 Ações (Eliminar, Reduzir, Elevar, Criar).
- **5 Forças de Porter:** Entrantes, Fornecedores, Compradores, Substitutos, Rivalidade.
- **AARRR (Pirate Metrics):** Aquisição, Ativação, Retenção, Receita, Recomendação.
- **Jobs To Be Done (JTBD):** Contratação de soluções por dores reais.

---

## F) Frontend
- `app/components/chat/BrandMemoryPanel.client.tsx`: Painel lateral de visualização e edição de DNA de marca.
- `app/components/squad/SquadPanel.tsx` & `AgentDesk.tsx`: Monitor visual de agentes executando tarefas em tempo real.
- `app/components/squad-monitor/SquadThinkingIndicator.tsx`: Indicador de raciocínio encadeado.
- `app/routes/brand-kit.tsx`: Interface de customização de paleta, fontes e logos.

---

## G) Utilitários e Libs
- `app/lib/common/prompt-library.ts`: Biblioteca de prompts reutilizáveis por nicho.
- `app/lib/hooks/usePromptEnhancer.ts`: Otimizador de instruções baseado em contexto prévio.
- `app/lib/modules/openbox/ibge-api.ts`: Cliente HTTP para endpoints do IBGE SIDRA.

---

## H) Testes e Documentação
- `audit/`: Registros de auditoria de consistência do ecossistema Engios.
- `ENGIOS_AI_ANALYSIS.md`: Análise de convergência de agentes.
