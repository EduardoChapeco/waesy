# AUDITORIA_AGENTS_SKILLS_R58.md — Auditoria e Poda Canônica de Meta-Trabalho (R58)

**Data:** 2026-10-02  
**Referência:** Plano 4 (Operação Verdade Única) — Bloco 9 (R58)  
**Objetivo:** Auditar os 44 skills, 8 agentes e 6 workflows de `.agents/`, categorizando entre ferramentas de **Impacto Real no Produto** vs **Meta-Trabalho Burocrático**, podando e desativando sobrecargas cognitivas que não alteram a experiência do usuário final.

---

## 1. Inventário Geral

| Categoria | Total Encontrado | Impacto Direto em Produto | Meta-Trabalho / Burocracia |
| :--- | :--- | :--- | :--- |
| **Skills** | 44 | 23 (52%) | 21 (48%) |
| **Agentes** | 8 | 7 (88%) | 1 (12%) |
| **Workflows** | 6 | 5 (83%) | 1 (17%) |
| **Total** | 58 | 35 (60%) | 23 (40%) |

---

## 2. Taxonomia e Separação Estrita

### 2.1 Skills de Impacto Direto no Produto (Preservadas e Ativas)
Estas skills operam diretamente no código, banco de dados, regras de negócio ou interface entregue:
1. `dynamic-surge-pricing`: Motor de precificação dinâmica, chuva e tarifas urbanas.
2. `apple-design`: Regras de ergonomia, touch targets >= 44px e glassmorphism refinado.
3. `anti-ai-design`: Erradicação de jargões de IA, títulos prolixos e ruídos visuais.
4. `design-ops`: Primitivas do design system e governança visual.
5. `niche-matrix`: Matriz de arquétipos, nichos e campos dinâmicos.
6. `asset-pipeline`: Otimização e prevenção de CLS em imagens e mídias.
7. `api-pool-manager`: Cofre seguro de chaves de IA e proxies.
8. `supabase`: Conexões, SSR e chamadas de infraestrutura.
9. `supabase-postgres-best-practices`: Índices, RLS, types seguros e boas práticas Postgres.
10. `web-performance`: Core Web Vitals e orçamentos de carregamento.
11. `accessibility`: Acessibilidade web geral.
12. `accessibility-floor`: Piso mecânico WCAG 2.2 AA.
13. `color-and-contrast`: Verificação APCA/WCAG de contraste tonal.
14. `typography-scale`: Escala tipográfica modular e limites de entrelinha.
15. `spacing-and-grid`: Grade rígida de 4px/8px e eliminação de valores mágicos.
16. `motion-and-feedback`: Física de movimento, microinterações e `motion-reduce`.
17. `layout-adaptivity`: Bifurcação Compact (<600px), Medium e Expanded (>=840px).
18. `component-api`: Contratos de componentes e matriz dos 4 estados.
19. `content-density`: Concisão textual e rótulos curtos.
20. `design-lint`: Verificador determinístico DL-01 a DL-30.
21. `security-guard`: RLS Deny-by-default, isolamento multi-tenant e validação Zod.
22. `state-sanitizer`: Limpeza de cookies e separação de contexto multi-tenant.
23. `storage-audit`: Políticas de bucket e detecção de arquivos órfãos.

### 2.2 Skills Podadas / Marcadas como Meta-Trabalho (Despriorizadas)
Estas skills tratam de processos internos de conversa, planejamento de sprints ou simulação de personas, sem produzir código ou experiência tangível para o cliente:
1. `pm`: Simulação de persona de Product Manager em chat (puro meta-trabalho conversacional).
2. `decompose-prd`: Quebra teórica de PRDs em DAGs de tickets (burocracia de processo).
3. `prompt-optimizer`: Re-escrita de prompts em sintaxe EARS (meta-ferramenta de engenharia de prompt).
4. `token-economy`: Conselhos teóricos sobre contagem de tokens.
5. `bigtech-board`: Reuniões simuladas de comitê de diretoria (meta-trabalho puro).
6. `break-triage`: Classificação taxonômica teórica de defeitos.
7. `deploy-verifier`: Checklists manuais redundantes com o CI canônico.
8. `design-auditor`: Redundante com `design-lint.mjs` automatizado.
9. `fallback-sweeper`: Absorvido pela varredura contínua do CI.
10. `file-manager`: Funções genéricas de arquivo já nativas do IDE.
11. `flow-tracer`: Protocolo documental absorvido pelos testes E2E.
12. `gap-hunter`: Checklists teóricos redundantes.
13. `guard-install`: Regras defensivas absorvidas por `security-guard`.
14. `log-forensics`: Leitura forense de logs sob demanda.
15. `proof-verifier`: Redundante com `npm run check:canonical`.
16. `recursive-audit`: Protocolo de processo integrado no fluxo de trabalho.
17. `recursive-fix`: Redundante com o ciclo de implementação.
18. `recursive-repair`: Redundante com testes automatizados.
19. `theme-factory`: Geração de temas para artefatos/slides descartáveis.
20. `ux-research-synthesis`: Síntese de entrevistas qualitativas teóricas.
21. `design-foundations`: Absorvido por `design-ops` e componentes canônicos.

---

## 3. Decisão de Governança
- **Critério de Poda:** Toda skill, agente ou workflow cujo produto de saída seja apenas *documento sobre documento* ou *conversa sobre planejamento* é formalmente classificado como **Meta-Trabalho**.
- **Ação:** O pipeline de entrega e CI prioriza 100% as skills de produto (Grupo 2.1). O agente nunca deve substituir a entrega de código funcional, correções de RLS ou layouts responsivos por simulações conversacionais de personas (`pm`, `bigtech-board`).
- **Conformidade R58:** Inventário e poda formalmente registrados com evidência tabular.
