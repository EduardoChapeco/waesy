---
name: ux-research-synthesis
description: "Synthesize user research data into actionable insights: distill interview transcripts, survey results, usability test notes, support tickets, and NPS responses into patterns, user segments, and prioritized next steps."
---

# UX Research Synthesis — Protocolo Científico de Insights de Usuário

> **Missão:** Transformar dados qualitativos e quantitativos brutos (transcrições de entrevistas, resultados de surveys, gravações de testes de usabilidade, tickets de suporte e feedback NPS/CSAT) em padrões acionáveis, segmentações comportamentais e recomendações de produto fundamentadas em evidências empíricas, separando rigorosamente **fatos observáveis** de **interpretações**.

---

## ⚡ Invocação e Uso

```bash
/ux-research-synthesis $ARGUMENTS
```

Sintetize dados de pesquisa de usuários em insights acionáveis. Consulte a habilidade de síntese de pesquisa de usuários para obter métodos de pesquisa, guias de entrevista e estruturas de análise.

---

## 📥 1. Fontes de Dados Aceitas (Inputs)

1. **Transcrições e Anotações de Entrevistas em Profundidade:** Falas literais de usuários, pausas, frustrações e motivações.
2. **Resultados de Pesquisas Quantitativas (Surveys / CSV):** Distribuição percentual, rankings e respostas abertas.
3. **Notas e Gravações de Testes de Usabilidade:** Tarefas executadas, tempos de conclusão, cliques errados e taxas de abandono.
4. **Tickets de Suporte & Chamados Operacionais:** Dores recorrentes, erros de interface e solicitações frequentes.
5. **Avaliações & Respostas NPS / CSAT / App Store:** Sentimento do cliente e causas raízes de detratores.

---

## 🔬 2. Princípios Científicos Inegociáveis de Pesquisa

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Separe Observação de Interpretação                                  │
│    - Observação (Fato): "6 de 8 usuários tentaram clicar no banner."   │
│    - Interpretação (Hipótese): "O banner parece um botão clicável."    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Quantifique Sempre a Prevalência                                    │
│    - Proibido usar "a maioria" ou "alguns usuários".                   │
│    - Obrigatório usar números absolutos: "7 de 10 participantes (70%)".│
├────────────────────────────────────────────────────────────────────────┤
│ 3. Citações Diretas Obrigatórias (Voice of Customer)                   │
│    - Cada tema deve conter falas reais literais: "[Citação]" — P[X].   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Triangulação de Dados (Qualitativo + Quantitativo + Telemetria)     │
│    - Correlacione o que o usuário DIZ com o que os dados de uso MOSTRAM│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📑 3. Estrutura Canônica do Relatório de Síntese

```markdown
## Research Synthesis: [Nome do Estudo]
**Method:** [Entrevistas / Survey / Teste de Usabilidade] | **Participants:** [N participantes]
**Date:** [Período] | **Researcher:** [Nome / Agente]

### Executive Summary
[3 a 4 frases sintetizando os achados mais críticos e o impacto no roadmap]

### Key Themes

#### Theme 1: [Nome do Tema]
**Prevalence:** [X de Y participantes / %]
**Summary:** [Do que se trata este padrão comportamental]
**Supporting Evidence:**
- "[Citação literal]" — P1
- "[Citação literal]" — P4
**Implication:** [O que isso significa concretamente para o produto]

#### Theme 2: [Nome do Tema]
...

### Insights ➔ Opportunities

| Insight (O que descobrimos) | Opportunity (O que podemos construir) | Impact | Effort |
| --- | --- | --- | --- |
| 7 de 10 lojistas não entendem o cálculo de taxa no PDV | Exibir breakdown visual antes da confirmação | High | Low |
| Usuários móveis abandonam o checkout no endereço | Autocompletar endereço via CEP em 1 toque | High | Med |

### User Segments Identified
| Segmento | Características & Comportamento | Necessidades Críticas | Tamanho Estimado |
| --- | --- | --- | --- |
| Lojista Tradicional | Opera no balcão físico, pouca afinidade digital | Teclado numérico grande, botão físico | ~45% |
| Criador Digital | Vende infoprodutos e ingressos pelo celular | Checkout ultrarrápido, biolinks | ~35% |
| Operador Enterprise | Múltiplas filiais, controle de caixa rigoroso | Relatórios analíticos, permissões granulares | ~20% |

### Recommendations
1. **[Alta Prioridade]** — [Ação específica, fundamentada nos temas com maior impacto]
2. **[Média Prioridade]** — [Melhoria de usabilidade ou refinamento de interface]
3. **[Baixa Prioridade]** — [Ajuste cosmético ou otimização secundária]

### Questions for Further Research
- [Lacunas que ainda não foram respondidas e exigem novo teste ou survey]

### Methodology Notes
[Tamanho da amostra, critérios de recrutamento, limitações e potenciais vieses]
```

---

## 🔗 4. Integração com Conectores da Plataforma

1. **Feedback do Usuário Conectado:**
   - Extrair chamados do suporte e respostas de NPS para cruzar com entrevistas.
2. **Product Analytics Conectado (Mixpanel / GA / PostHog):**
   - Validar achados qualitativos com funis de conversão reais e heatmaps.
3. **Base de Conhecimento Conectada:**
   - Arquivar a síntese na categoria de Pesquisas de Usuários (`knowledge-base.md`) para consultas futuras do Conselho.

---

## 📚 Biblioteca de Referências Técnicas da Skill

- [`references/qualitative-coding.md`](references/qualitative-coding.md): Codificação temática indutiva/dedutiva e diagramas de afinidade.
- [`references/interview-protocols.md`](references/interview-protocols.md): Roteiros de entrevista, perguntas neutras e técnicas de aprofundamento.
- [`references/usability-testing-analysis.md`](references/usability-testing-analysis.md): Métricas de teste de usabilidade (SUS, taxa de sucesso, severidade Nielsen).
- [`references/nps-csat-quant-synthesis.md`](references/nps-csat-quant-synthesis.md): Cálculo de NPS, análise de sentimento e agrupamento de respostas abertas.
- [`references/triangulation-methods.md`](references/triangulation-methods.md): Métodos de triangulação entre falas, pesquisas e telemetria.
- [`references/synthesis-templates.md`](references/synthesis-templates.md): Modelos executivos prontos para apresentação para diretoria e times de produto.
