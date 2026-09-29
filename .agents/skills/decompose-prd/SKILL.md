---
name: decompose-prd
description: "Expert PRD decomposition engine. Takes any Product Requirements Document and decomposes it into a hierarchical DAG of Epics → Features → Tasks with dependency graphs, AI-executable task specs, and optional Notion integration. Handles PRDs in ALL formats (PDF, DOCX, Markdown, Notion, HTML, pasted text). Triggers for: 'decompose this PRD', 'break down this spec', 'create tasks from PRD', 'PRD to epics', 'plan this feature', 'decompose requirements', 'create implementation plan from spec', 'turn this PRD into tickets', 'PRD to Jira/Notion tasks', or any request to convert product requirements into actionable engineering work. Also triggers when user uploads/pastes a PRD and asks for implementation planning, task breakdown, sprint planning, or work decomposition."
---

# Decompose PRD — Expert Requirements Decomposition & DAG Engine

> **Missão:** Decompor qualquer Documento de Requisitos de Produto (PRD) em um Grafo Acíclico Direcionado (DAG) hierárquico estritamente **MECE (Mutuamente Exclusivo, Coletivamente Exaustivo)** em 3 níveis: **Épicos (3-7) ➔ Funcionalidades (2-5) ➔ Tarefas Executáveis por IA (2-7)**, eliminando ambiguidades e viabilizando execução paralela sem atritos.

---

## 🏛️ Filosofia Central & Pilares de Engenharia

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Compreenda Antes de Decompor                                        │
│    - Leitura integral do PRD; mapear intenção, stakeholders e gaps.    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Decomposição Problema-Primeiro (Jobs-to-be-Done)                    │
│    - Funcionalidades existem para resolver dores reais de usuários.    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Especificação de Tarefas Executáveis por IA                         │
│    - Tarefas auto-contidas (2000-4000 tokens) sem perguntas pendentes. │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Planejamento Consciente de Dependências (DAG & Caminho Crítico)     │
│    - Grafos acíclicos com camadas de execução paralela (Layer 0..N).   │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Profundidade Máxima de 3 Níveis                                     │
│    - Épicos ➔ Funcionalidades ➔ Tarefas (zero subtarefas / sem ruído). │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Esclarecimento Ativo sobre Suposição (AskUserQuestion)              │
│    - Não adivinhe ambiguidades de escopo, técnica ou prioridade.       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Fluxo de Trabalho em 6 Fases

### Fase 1: Ingestão & Normalização Multiformato
- **Formatos Aceitos:** Markdown, Texto Colado, PDF (com OCR se necessário), DOCX, HTML, Links do Notion.
- **Objeto PRD Normalizado:**
```typescript
interface NormalizedPrd {
  title: string;
  sections: Record<string, string>;
  requirements: Array<{ id: string; text: string; section: string }>;
  metrics: string[];
  constraints: { technical: string[]; temporal: string[]; budget: string[] };
  timeline: { phases: string[]; milestones: string[]; deadlines: string[] };
  stakeholders: string[];
  openQuestions: string[];
  metadata: { sourceFormat: string; processedAt: string; estimatedScope: string };
}
```

### Fase 2: Análise Profunda & Classificação de Domínio
- **Inferência de Requisitos Implícitos:** Segurança (RLS, RBAC), Performance (latência, índices), Acessibilidade (WCAG 2.2 AA) e Confiabilidade (ACID, idempotência).
- **Classificação Técnica:** Frontend, Backend/BFF, Banco de Dados, Infraestrutura, Segurança, Integrações.
- **Mapeamento para JTBD (Jobs-to-be-Done):** Agrupamento por problema que resolve.

### Fase 2.5: Clarificação de Ambiguidades (Condicional)
Se houver 3 ou mais ambiguidades críticas, acione a ferramenta `ask_question`:
- **Ambiguidade de Escopo:** Limites entre MVP e Fase 2.
- **Ambiguidade Técnica:** Escolha arquitetural (ex: WebSockets vs Polling vs SSE).
- **Ambiguidade de Prioridade:** Critérios MoSCoW conflitantes.
- **Ambiguidade de Dependência:** Ordem de pré-requisitos entre módulos.

### Fase 3: Decomposição Hierárquica MECE (3 Níveis)
1. **Nível 1: Épicos (3 a 7 por PRD):**
   - Capacidade central do usuário ou subsistema de infraestrutura.
   - Mutuamente exclusivo e coletivamente exaustivo.
2. **Nível 2: Funcionalidades (2 a 5 por Épico):**
   - Incremento entregável e demonstrável de valor.
   - Critérios de aceitação no formato formal `Given/When/Then`.
3. **Nível 3: Tarefas Executáveis por IA (2 a 7 por Funcionalidade):**
   - **Granularidade:** Concluível por um agente em 1 sessão (~2000-4000 tokens de saída).
   - **Contratos Claros:** Entradas exatas (schemas/arquivos), Saídas exatas (caminho do arquivo e testes).
   - **Condições de Contorno:** Casos de borda e tratamento de erro explícitos.
   - **Rastreabilidade Bidirecional:** Tarefa ➔ Funcionalidade ➔ Épico ➔ Requisito do PRD.

### Fase 4: Construção do Grafo de Dependências (DAG)
- **Topological Sorting:** Verificação estrita de que o grafo é acíclico ($O(V+E)$).
- **Camadas de Execução Paralela:**
  - *Layer 0:* Sem dependências (pode iniciar em paralelo no instante zero).
  - *Layer 1:* Depende apenas de tarefas do Layer 0.
  - *Layer N:* Depende de tarefas de camadas anteriores.
- **Caminho Crítico:** O caminho mais longo sequencial que dita o tempo mínimo total de entrega.
- **Diagrama Mermaid:** Geração automática do grafo para inspeção visual rápida.

### Fase 5: Formatos de Exportação
- **Opção A (Markdown / Padrão):** Dossiê completo com resumo executivo, especificações detalhadas, Mermaid DAG e Matriz de Rastreabilidade.
- **Opção B (JSON Estruturado):** Export legível por máquina para integração com Jira, Linear, Asana e CI/CD.
- **Opção C (Notion Database):** Esquema relacional com tabelas conectadas de Épicos, Funcionalidades e Tarefas.

### Fase 6: Validação Final & Portão de Qualidade
- **Cobertura 100%:** Todo requisito do PRD rastreado até pelo menos 1 tarefa.
- **Zero Órfãos:** Nenhuma tarefa sem funcionalidade; nenhuma funcionalidade sem épico.
- **Integridade do DAG:** 0 dependências circulares e 0 referências fantasmas.
- **Calibragem de Escopo:** Estimativa total alinhada ao prazo da sprint.

---

## 📚 Biblioteca de Referências Técnicas da Skill

- [`references/ingestion-pipeline.md`](references/ingestion-pipeline.md): Pipeline de extração para PDF, DOCX, Markdown, Notion e HTML.
- [`references/decomposition-engine.md`](references/decomposition-engine.md): Algoritmos MECE, taxonomia de domínios e agrupamento por JTBD.
- [`references/dependency-graphs.md`](references/dependency-graphs.md): Algoritmos de DAG, ordenação topológica, camadas e caminho crítico.
- [`references/task-specifications.md`](references/task-specifications.md): Contratos de interface, padrão Given/When/Then e estimativa de tokens.
- [`references/clarification.md`](references/clarification.md): Árvore de decisão para perguntas de esclarecimento ao usuário.
- [`references/notion-integration.md`](references/notion-integration.md): Esquemas de banco de dados e propriedades relacionais no Notion.
- [`references/context-management.md`](references/context-management.md): Gestão de PRDs gigantes (>50 páginas), chunking e memória de contexto.
- [`references/industry-patterns.md`](references/industry-patterns.md): Padrões de decomposição em E-commerce, Fintech, Logística, Turismo e CRM.
- [`references/traceability.md`](references/traceability.md): Matriz bidirecional de rastreabilidade e análise de impacto.

---

## 📋 Modelos Canônicos (Templates)

- [`templates/epic-template.md`](templates/epic-template.md): Estrutura padrão de Épico.
- [`templates/feature-template.md`](templates/feature-template.md): Estrutura de Funcionalidade com Given/When/Then.
- [`templates/task-template.md`](templates/task-template.md): Especificação de Tarefa executável por IA.
- [`templates/dependency-graph.md`](templates/dependency-graph.md): Modelos Mermaid de visualização DAG.
- [`templates/notion-schema.md`](templates/notion-schema.md): Esquema de propriedades de banco de dados no Notion.
- [`templates/traceability-matrix.md`](templates/traceability-matrix.md): Matriz de Rastreabilidade Requisito ➔ Tarefa.
- [`templates/clarification-form.md`](templates/clarification-form.md): Formulário de esclarecimento de ambiguidades.

---

## 🚫 Antipadrões a Evitar

| Antipadrão | Risco / Dano | Padrão BigTech Correto |
| --- | --- | --- |
| **Listas simples (Flat To-Dos)** | Oculta dependências e impede paralelismo. | DAG hierárquico em 3 níveis com camadas. |
| **Tarefas sem critérios de aceitação** | Escopo infinito e ausência de definição de pronto. | Critérios rigorosos no formato `Given/When/Then`. |
| **Adivinhar requisitos ambíguos** | Retrabalho massivo e desperdício de tokens. | Parar e formular `ask_question` explícito. |
| **Super-decomposição (>50 tarefas)** | Sobrecarga de gestão e alta taxa de erro. | 3-7 Épicos, 2-5 Features, 2-7 Tarefas por Feature. |
| **Épico "Miscelânea / Outros"** | Ambiguidade e falta de dono de domínio. | Cada épico representa uma capacidade técnica clara. |
