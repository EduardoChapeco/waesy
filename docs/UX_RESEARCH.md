# Diretrizes de Pesquisa Empírica de UX & Pesquisa com Usuários (Waesy Platform)

> **Single Source of Truth (SSOT)** para síntese de dados de usuários, condução de entrevistas, testes de usabilidade e triangulação de evidências na plataforma Waesy.
> Referência técnica vinculante: `.agents/skills/ux-research-synthesis/SKILL.md`.

---

## 1. Princípios Científicos Inegociáveis

1. **Separação Rígida entre Observação e Interpretação:**
   - *Fato Observável:* Comportamento medido ou registrado sem julgamento prévio (ex: "8 de 10 participantes desistiram no campo de chave Pix").
   - *Interpretação:* Hipótese de causa levantada pelo time de design/produto (ex: "A ausência de instrução sobre o tipo de chave Pix gera insegurança").
2. **Quantificação Mandatória:**
   - É expressamente proibido usar qualificadores subjetivos como "a maioria", "muitos", "poucos" ou "usuários acharam".
   - Todo relatório deve quantificar a prevalência em números absolutos e percentuais: ex: "6 de 8 participantes (75%)".
3. **Citações Literais Obrigatórias:**
   - Nenhum tema pode ser validado sem conter a voz real do cliente: `"[Citação literal]" — Participante P[X]`.
4. **Triangulação Tripla:**
   - Qualitativo (Entrevistas/Gravações) + Quantitativo (NPS/Pesquisas) + Comportamental (Telemetria em Produção).

---

## 2. Escala de Severidade de Usabilidade (Nielsen)

| Nível | Classificação | Impacto no Usuário | SLA de Correção |
| --- | --- | --- | --- |
| **P0** | **Catastrófico** | Impede a conclusão da tarefa central (comprar, agendar, pagar). | Imediato / Bloqueia Release |
| **P1** | **Maior** | Causa severa frustração ou atraso substancial na jornada. | Próxima Sprint |
| **P2** | **Menor** | Fricção de usabilidade com contorno óbvio. | Backlog Priorizado |
| **P3** | **Cosmético** | Inconsistência puramente visual sem impacto funcional. | Oportunidade / Polish |

---

## 3. Matriz de Síntese Insights ➔ Oportunidades

Todo relatório de pesquisa deve concluir com a tabela de acionabilidade:
- **Insight:** O que aprendemos a partir da evidência primária.
- **Oportunidade:** O que a engenharia/design pode implementar para sanar a dor.
- **Impacto:** High / Med / Low.
- **Esforço:** High / Med / Low.

---

## 4. Conversão de Oportunidades em Requisitos EARS

Toda oportunidade de alta prioridade gerada pela pesquisa com usuários deve ser formalizada como um requisito normativo EARS:
- **Ubíquo:** `The system shall <action>` (invariante comprovado).
- **Orientado a Eventos:** `When <trigger>, the system shall <action>`.
- **Condicional / Defensivo:** `If <erro recorrente>, the system shall prevent <unwanted action> AND execute <recovery>`.
- **Rastreabilidade:** Cada especificação EARS deve referenciar o `ID` do Tema de pesquisa que a originou.
