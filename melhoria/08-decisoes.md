# 08-DECISOES.md — Registro de Decisões, Alinhamento Normativo e Descarte de Preferências

**Fundamentação Teórica:** Conforme a Seção 1 e Seção 2 da SPEC-001, qualquer proposta de alteração que não aumente comprovadamente (a) a conclusão do usuário, (b) o retorno do dado gravado, (c) a redução de esforço ou (d) o retorno sobre valor coletado, é classificada como **preferência subjetiva** e descartada com registro sumário.

---

## 1. Decisões Arquiteturais Adotadas na Auditoria SPEC-001

| ID | Data | Contexto | Decisão Adotada | Fundamentação | Consequências |
| --- | --- | --- | --- | --- | --- |
| **DEC-001** | 2026-09-28 | Inventário determinístico de superfície do código | Uso de scripts estáticos Node.js (`scripts/audit-surface.mjs` e `scripts/audit-chain.mjs`) operando sobre o filesystem | A leitura integral por modelo de IA causaria alucinações de arquivos e estouro de contexto | 100% dos dados no `00-superficie.json` e `05-ledger.json` são factuais e auditáveis via script |
| **DEC-002** | 2026-09-28 | Separação mandatória entre diagnóstico e correção | Congelamento de alterações em código de produto durante a vigência da SPEC-001 | Regra 2 do protocolo: "Diagnóstico e correção são fases separadas; não corrige nada antes do ledger estar fechado" | Nenhuma regressão foi introduzida no repositório durante a auditoria; roadmap ficou ordenado por alavancagem |
| **DEC-003** | 2026-09-28 | Cálculo determinístico de prioridade de gaps | Aplicação estrita da fórmula: `Score = (Impacto * 3) + Severidade - Esforço` | Elimina vieses pessoais de desenvolvedores e agentes na escolha do que implementar | A Onda 1 atacou exclusivamente P0s transacionais (Checkout e PDV) em vez de melhorias cosméticas |

---

## 2. Alinhamento e Análise de Divergência com a SPEC-000

| Aspecto Analisado | SPEC-000 (Endurecimento de Design) | SPEC-001 (Motor de Melhoria Recursiva) | Divergência Detectada? | Resolução / Alinhamento |
| --- | --- | --- | --- | --- |
| **Constituição Visual** | Tokens DTCG em `tokens.json`, CSS canônico e regras DL-01 a DL-30 | Não altera regras visuais; audita conformidade na dimensão D10/D11 | Nenhuma | SPEC-001 consome os tokens e o linter estabelecidos pela SPEC-000 |
| **Contrato Operacional** | AGENTS.md com saída em schema, sem emojis, sem prolixidade | Mesmas regras estritas e proibição de conclusão motivacional | Nenhuma | Ambos operam sob o mesmo contrato de saída e severidades P0/P1 |
| **Escopo de Atuação** | Governança de design, layout, acessibilidade e temas | Auditoria da cadeia transacional (Tabela -> BFF -> Hook -> UI -> Rota) | Nenhuma | Perfeita complementaridade horizontal e vertical |

---

## 3. Registro de Preferências Descartadas (Não Aumentam os 4 Critérios)

| Proposta Avaliada | Motivo do Descarte | Critério Faltante (a, b, c, d) | Decisão |
| --- | --- | --- | --- |
| **Substituição de biblioteca de ícones** (Lucide por Phosphor ou Heroicons em certas telas) | Mudança estética sem impacto na taxa de conclusão ou legibilidade dos controles | Nenhum dos 4 critérios atendido | **DESCARTADO**: Manter Lucide padronizado |
| **Redesenho de layouts de telas que já passam no design lint** | Mudança cosmética redundante sem quebra de round-trip ou ganho ergonômico | Nenhum dos 4 critérios atendido | **DESCARTADO**: Proibido alterar sem quebra factual |
| **Inclusão de animações decorativas em cards estáticos** | Não reduz esforço cognitivo e pode aumentar tempo de carregamento e violar prefers-reduced-motion | Não aumenta conclusão nem reduz esforço | **DESCARTADO**: Proibido aplicar animação decorativa |
| **Criação de novos temas experimentais além dos 10 canônicos** | Os 10 temas da Fábrica de Temas já atendem plenamente à taxonomia e identidade do produto | Não há demanda empírica nos 4 critérios | **DESCARTADO**: Manter a paleta canônica consolidada |
