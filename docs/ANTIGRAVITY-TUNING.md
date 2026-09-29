# ANTIGRAVITY-TUNING.md — Diretrizes de Otimização e Potencialização do IDE Antigravity

Este documento estabelece o protocolo de sintonia fina para a operação do assistente Antigravity no repositório Waesy.

---

## H.1 Hierarquia de Instruções e Precedência Canônica
Em qualquer cenário de divergência ou ambiguidade, a hierarquia de autoridade opera na seguinte ordem estrita:
```
[ Nível 1 (Máxima Autoridade) ]  Spec Ativa da Tarefa (docs/specs/SPEC-XXX.md)
              ▲
              │ (vence)
[ Nível 2 (Contrato do Projeto) ]  Regras do Repositório (AGENTS.md, DESIGN.md)
              ▲
              │ (vence)
[ Nível 3 (Instruções Globais) ]  Customizações Globais do IDE (~/.gemini/config)
```
**Regra de Conflito Inviolável:** O projeto e a spec sempre vencem as instruções globais do IDE. Em caso de choque, o agente deve registrar a divergência em `docs/design/DECISIONS.md` e prosseguir conforme o contrato do projeto.

---

## H.2 Economia e Eficiência Extrema de Contexto
1. **Memória Persistida em Disco:** O histórico volátil do chat não é meio de armazenamento. Todo estado, progresso e decisões são salvos em arquivos Markdown (`docs/design/`, `auditoria/`).
2. **Uma Tarefa por Sessão:** Cada ciclo de execução aborda exatamente um escopo delimitado.
3. **Leitura Cirúrgica por Janela:** Proibido carregar arquivos gigantes na íntegra. Utilizar sempre `view_file` com parâmetros `StartLine` e `EndLine` delimitados.
4. **Handoff Curto:** Todo encerramento de fase gera um handoff de no máximo 12 linhas em `docs/design/DECISIONS.md`.
5. **Zero Metaprosa:** O agente responde estritamente no schema exigido (tabelas, diffs ou relatório de 6 linhas), sem saudações ou explicações redundantes sobre o que vai fazer.

---

## H.3 Evidência Obrigatória por Tipo de Tarefa
Nenhuma entrega é considerada válida sem comprovação mecânica:
- **Tarefas de Código / Lógica:** `npm run typecheck` com Exit Code 0.
- **Tarefas de Infra / Build:** `npm run build` gerando assets e `dist/_worker.js` com Exit Code 0.
- **Tarefas Visuais / Design:** `node scripts/design-lint.mjs --changed` com 0 violações P0 e 0 violações P1.
- **Evidência Visual:** Captura ou inspeção declarada nos três viewports canônicos: Mobile (390px), Tablet (768px) e Desktop (1280px).

---

## H.4 Orçamento e Limites Operacionais por Tarefa
- **Teto de Arquivos Lidos:** No máximo 15 arquivos por sessão atômica de trabalho.
- **Teto de Iterações:** No máximo 25 passos por ciclo.
- **Regra de Fatiamento:** Ao atingir o orçamento sem conclusão, a tarefa deve ser imediatamente fatiada em sub-tarefas com registro em disco, nunca estendida de forma descontrolada.

---

## H.5 Definição de Pronto (DoD) e Bloqueado (DoB)
- **Definição de Pronto:**
  1. Spec técnica em `docs/specs/` cumprida.
  2. Tipagem e compilação limpas (Exit Code 0).
  3. Lint visual aprovado sem P0 e sem P1.
  4. Handoff de 12 linhas registrado em `docs/design/DECISIONS.md`.
- **Definição de Bloqueado:**
  1. Achado de escopo divergente que exija refatorar mais de 2 arquivos estruturais não previstos.
  2. Conflito insanável entre duas regras ativas.
  3. Falha de segurança crítica (P0) em autenticação ou dados multi-tenant.
  - Ação: Interromper execução, emitir relatório do bloqueio e devolver a decisão ao humano.

---

## H.6 Livraria de Prompts Versionada
Prompts padronizados residem em `docs/prompts/`, catalogados com nome e gatilho de execução:
- `audit-visual.prompt.md`: Gatilho para varredura de deriva visual.
- `component-spec.prompt.md`: Gatilho para criação de novos componentes.
- `refactor-a11y.prompt.md`: Gatilho para fechamento de acessibilidade WCAG 2.2 AA.

---

## H.7 Automação de Design Gate
O script `scripts/design-lint.mjs` é o gatekeeper inviolável do pipeline. Ele aborta automaticamente com Exit Code 1 se houver qualquer ocorrência de `!important`, falta de foco visível, contraste inferior ao piso ou alvos de toque menores que 44px. Proibido qualquer bypass ou postergação de defeitos P0/P1.

---

## H.8 Modo de Revisão e Comprovação Visual
Toda entrega de interface requer validação comparativa antes e depois nos viewports de 390px (mobile) e 1280px (desktop). Sem a evidência estrutural correspondente nos dois viewports, a entrega é tecnicamente inexistente.
