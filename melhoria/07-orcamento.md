# 07-ORCAMENTO.md — Governança de Custos, Tetos e Fatiamento de Rodadas

**Fundamentação Teórica:** Conforme a Regra 10 do Protocolo Operacional da SPEC-001 e a Regra B.7 do AGENTS.md, a integridade do sistema depende do controle estrito do orçamento cognitivo e computacional. A persistência de estado deve ocorrer em disco, nunca dependendo da janela volátil de contexto.

---

## 1. Parâmetros Orçamentários por Rodada de Execução

| Recurso / Dimensão | Teto Limite por Sessão | Ação ao Atingir 80% do Teto | Ação ao Atingir 100% (Gatilho de Parada) |
| --- | --- | --- | --- |
| **Arquivos Estruturais Editados** | Máximo 2 arquivos simultâneos | Travar inclusão de novos arquivos | Interrupção imediata, fechamento de diff e handoff |
| **Chamadas de Ferramenta (Tool Calls)** | Máximo 25 chamadas por rodada | Finalizar etapa em andamento e preparar commit | Encerrar ciclo, consolidar `_estado.md` e devolver ao usuário |
| **Profundidade de Recursão** | 3 níveis (`Rota -> Componente -> Dados`) | Não descer ao 4º nível; registrar `UNKNOWN` | Registrar no ledger e seguir em frente |
| **Janela de Leitura de Arquivo** | Máximo 80 linhas por visualização cirúrgica | Proibido ler arquivos de mais de 100 linhas inteiros | Rejeitar leitura integral; usar `grep_search` |
| **Consumo de Contexto (Tokens)** | Fatiamento antes de atingir limite de compactação | Gerar artefato em disco | Salvar checkpoint e instruir continuação |

---

## 2. Regras de Fatiamento e Travas de Escopo

1. **Princípio do Fatiamento Obrigatório:**
   - Se uma tarefa demandar alterações em rotas de módulos distintos (ex: Checkout e PDV simultaneamente), a tarefa deve ser obrigatoriamente fatiada em 2 sessões separadas.
2. **Isolamento de Erros:**
   - Se um comando de build (`npm run typecheck` ou `npm run build`) acusar mais de 3 arquivos com erros de tipagem fora do escopo imediato, o agente deve acionar o Protocolo de Parada (Regra B.10) e reportar ao operador humano em vez de sair consertando dependências externas.
3. **Persistência de Memória em Disco:**
   - Todo progresso intermediário de auditoria deve ser persistido em `melhoria/` ou `docs/`. O chat serve unicamente para transmissão de relatórios em schema estrito.

---

## 3. Registro Real de Execução da Rodada Atual (Auditoria SPEC-001)

| Métrica | Planejado / Teto | Real Executado | Status |
| --- | --- | --- | --- |
| Módulos Auditados | Todos (Totalidade da Superfície) | 380 rotas, 573 componentes, 217 tabelas, 202 funções BFF | 100% de Cobertura |
| Scripts Criados / Executados | 3 scripts (`audit-surface`, `audit-chain`, `build-ledger`) | 3 scripts determinísticos | Concluído |
| Arquivos de Relatório Gerados | 10 entregáveis na pasta `melhoria/` | 10 entregáveis estruturados | Em fechamento |
| Erros de Compilação Introduzidos | 0 permitidos | 0 introduzidos (Fase de diagnóstico pura) | Aprovado |
