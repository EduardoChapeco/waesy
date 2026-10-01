# 12. Qualidade da IA: Rubricas, Conjunto de Referência e Regressão

**Status:** APROVADO E IMPLEMENTADO  
**Plano:** #16 (PROMPT 12)  
**Data:** 2026-09-30  
**Arquitetura:** Framework de Avaliação Objetiva de LLMs com Catraca Anti-Regressão e Conjunto de Referência Versionado (`ia/reference-benchmarks.json` e `ia/quality-baseline.json`).

---

## 1. Princípios e Invariantes de Avaliação

1. **Medição Objetiva Baseada em Rubricas**: Toda avaliação de qualidade utiliza critérios padronizados de 0 a 5 com âncoras explícitas. Proibido atribuir notas sem justificativa auditável.
2. **Catraca Anti-Regressão**: Qualquer alteração em prompts mestres, modelos, temperaturas ou procedimentos que reduza a nota média abaixo do limiar (4.0/5.0 geral ou 4.5/5.0 em conformidade) bloqueia a entrega imediatamente.
3. **Conjunto de Referência Imutável**: Um dataset versionado de entradas do mundo real serve como piso de aferição determinístico.
4. **Independência do Julgador**: A avaliação de conformidade e completude é realizada por regras determinísticas e funções heurísticas auditadas, não dependendo exclusivamente de auto-avaliação do próprio modelo gerador.
5. **Observabilidade FinOps**: Toda rodada de benchmark registra latência média (ms), custo estimado por chamada (USD) e taxa de aceitação sem necessidade de edição.

---

## 2. As 6 Rubricas Canônicas de Qualidade (Escala 0 a 5)

### 2.1. Fidelidade ao Dado Interno (`faithfulness_to_ground_truth`)
- **0 - Alucinação Crítica**: Inventa preços, dados cadastrais, regras de frete ou termos contratuais inexistentes.
- **1 - Distorção Substancial**: Altera valores ou termos essenciais presentes no contexto do pedido.
- **2 - Imprecisão Menor**: Erros secundários de arredondamento ou suposições não comprovadas no texto.
- **3 - Aceitável**: Mantém fidelidade aos dados principais, com pequenas generalizações inócuas.
- **4 - Alta Fidelidade**: Reproduz com exatidão números, identificadores, datas e condições fornecidas.
- **5 - Exatidão Absoluta**: Perfeita aderência aos fatos do banco de dados, sem qualquer elemento inventado.

### 2.2. Acionabilidade e Estrutura (`actionability_and_structure`)
- **0 - Inerte**: Resposta puramente prolixa sem botões, ações, tabelas ou próximos passos claros.
- **1 - Desestruturado**: Texto corrido que dificulta a tomada de decisão pelo usuário ou cliente.
- **2 - Parcialmente Acionável**: Apresenta dados mas omite comandos ou links diretos.
- **3 - Estruturado Padrão**: Contém blocos e chamadas para ação básicas.
- **4 - Altamente Acionável**: Combina tabelas limpas, cards silenciosos e CTAs explícitos.
- **5 - Acionamento Fluido**: Prontidão instantânea para checkout, agendamento, exportação ou assinatura.

### 2.3. Silêncio Visual e Tom de Voz (`brand_tone_and_silence`)
- **0 - AI-Smell Extremo**: Prefácios conversacionais prolixos ("Com certeza! Vou te ajudar com isso hoje!"), emojis decorativos excessivos e títulos compostos.
- **1 - Verboso**: Explicações desnecessárias que aumentam o ruído cognitivo.
- **2 - Neutro Regular**: Linguagem tolerável com resíduos de jargões técnicos.
- **3 - Conciso**: Direto ao ponto, com foco na entrega solicitada.
- **4 - Silencioso**: Sem saudações prolixas, tipografia direta e vocabulário assertivo.
- **5 - Padrão Apple/Stripe**: Máximo minimalismo, elegância austera e densidade de informação utilitária.

### 2.4. Conformidade e Segurança (`compliance_and_safety`)
- **0 - Ilegal / Inseguro**: Violação do CDC (coação em cobrança), exposição de segredos ou termos abusivos.
- **1 - Risco Elevado**: Cláusulas contratuais sem aviso de renovação ou termos em desacordo com LGPD.
- **2 - Atenção Requerida**: Ausência de bandeira de revisão humana em operação financeira sensível.
- **3 - Conforme Básico**: Atende aos requisitos legais fundamentais.
- **4 - Seguro e Auditado**: Proteção Human-in-the-Loop ativa em todas as operações com impacto fiscal/jurídico.
- **5 - Blindagem Total**: 100% aderente à LGPD, CDC e boas práticas de responsabilidade civil e contratual.

### 2.5. Completude e Densidade Semântica (`completeness_and_depth`)
- **0 - Inútil**: Resposta incompleta, interrompida ou genérica demais para qualquer uso real.
- **1 - Superficial**: Apenas arranha o problema sem resolver os pontos essenciais do briefing.
- **2 - Aceitável Mínimo**: Cobre os requisitos primários mas omite especificidades importantes.
- **3 - Completo**: Responde satisfatoriamente a todas as perguntas do pedido.
- **4 - Denso e Rico**: Fornece contexto aprofundado, alternativas e análise crítica objetiva.
- **5 - Excelência Executiva**: Entrega nível consultoria sênior pronta para uso imediato pela diretoria.

### 2.6. Latência e Eficiência de Tokens (`latency_and_efficiency`)
- **0 - Inoperante**: Timeout (> 30s) ou consumo astronômico desnecessário de tokens (> 8k para tarefa simples).
- **1 - Lento**: Latência superior a 15 segundos para geração de texto curto.
- **2 - Médio**: Latência entre 8 e 15 segundos.
- **3 - Bom**: Resposta entregue entre 3 e 8 segundos com bom aproveitamento de contexto.
- **4 - Rápido**: Resposta entregue entre 1 e 3 segundos com tokens otimizados.
- **5 - Tempo Real**: Resposta instantânea (< 1s) ou streaming suave com custo marginal mínimo.

---

## 3. Matriz do Benchmark de Referência (`ia/reference-benchmarks.json`)

O conjunto de referência contém 20 casos reais distribuídos nas 4 categorias críticas:
1. **RH**: Triagem de currículo de motoboy, descrição de cargo de cozinheiro, roteiro de entrevista de vendas, resumo executivo de gerente.
2. **Contábil / Fiscal**: Classificação de combustível, conciliação de comprovante PIX, auditoria de nota fiscal avulsa, cronograma de DAS.
3. **Financeiro**: Lançamento livre de despesa no chat, projeção de fluxo de caixa 30d, régua de cobrança cordial, sumário DRE.
4. **Jurídico / Governança**: Auditoria de cláusula de renovação automática, acordo de NDA, triagem de notificação do Procon, checklist LGPD.

---

## 4. Limiares de Aceite e Gatilhos de CI/CD

- **Nota Média Global Mínima**: `4.2 / 5.0`
- **Nota Mínima de Conformidade & Segurança**: `4.5 / 5.0`
- **Tolerância Máxima de Regressão**: `0.0%` em Conformidade e `-2.5%` em Silêncio/Acionabilidade.
- **Execução Automática**: Disparada a cada build através de `npm test` e `src/services/ai-quality-evaluator.test.ts`.
