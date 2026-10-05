# DECISION_LOG.md — Registro Canônico de Decisões Arquiteturais

## DEC-175: Indexação Contextual por Cidade & Paridade Canônica de Conteúdo Minerado
- **Data:** 2026-10-04
- **Contexto:** Necessidade de unificar os módulos cívicos (notícias, vagas, eventos, diretório) para responderem ao contexto geográfico ativo do usuário (`resolveActiveCity`), garantindo que conteúdo minerado tenha exatamente o mesmo layout e campos que conteúdos publicados por pessoas civis.
- **Decisão:** 
  1. Criação das colunas `city` e `state` na tabela `news_articles` com migração retroativa.
  2. Implementação do motor `event-harvester.ts` com Schema.org.
  3. Promoção automática de artigos com score >= 70 diretamente para `news_articles`.
  4. Filtros contextuais integrados nos BFFs `news.functions.ts`, `jobs.functions.ts`, `directory.functions.ts` e `events.functions.ts`.
- **Consequências:** Zero mocks, paridade total de design e filtragem automática de acordo com a cidade selecionada pelo usuário.

## DEC-176: Formalização do Sistema All-in-One e Arquitetura de 4 Camadas
- **Data:** 2026-10-04
- **Contexto:** Auditoria mestre do ecossistema Waesy em 40 ondas recursivas conforme Super Prompt Mestre.
- **Decisão:** Formalização da separação em 4 camadas (Engines Mecânicas, Banco de Dados, Model Gateway e Agentes/Copilot), com contrato de 13 fases para o chat e catálogo completo de skills.
- **Consequências:** Prevenção permanente contra duplicações, regressões de chat ou substituições desnecessárias de bibliotecas.

## DEC-177: Fechamento do Marco 3 — Despacho MCP Terminal, Recorte Municipal do Copilot e Testes Não Tautológicos
- **Data:** 2026-10-04
- **Contexto:** Resiliência e determinismo no ciclo de vida conversacional do Copilot.
- **Decisão:**
  1. Despacho MCP terminal (`VALIDATING -> COMPLETED` ou `FAILED_RETRYABLE`), eliminando fall-throughs em cadeias heurísticas.
  2. Precedência de cidade: prompt explícito > `resolveActiveCity()` / `data.city` > indefinida. Domínios com escopo de cidade sem localidade transitam `UNDERSTANDING -> NEEDS_CLARIFICATION`.
  3. `sendAiMessageSchema` com `city` opcional e contexto com `threadId`.
  4. Suíte `copilot-pipeline-boundaries.test.ts` (7 casos reais) cobrindo fronteiras de I/O.
- **Consequências:** FSM 100% determinística com isolamento de falhas de terceiros e 0 quebras em rotas de UI.

## DEC-178: Marco 4 — Resolução Geográfica Dinâmica de UF (geo-resolver.ts) e Consolidação de Motores de Mineração
- **Data:** 2026-10-04
- **Contexto:** Erradicação de fallbacks cegos de BBOX ou UF ("SC" / "Chapecó") em harvesters e no orquestrador.
- **Decisão:**
  1. Criação de `src/lib/mining/geo-resolver.ts` com `resolveCityAndState` e `normalizeStateUf`, cobrindo 5.570 municípios do Brasil.
  2. `places-harvester.ts` saneado com BBOX Overpass isolado por município (retorna `[]` imediatamente se não catalogado, sem vazar Chapecó) e UF dinâmico.
  3. Orquestrador autônomo e harvesters de 8 verticais sem forçar "SC" para municípios de outros estados.
  4. Suíte `m4-challenger-empirical.test.ts` (18 testes) e expansão em `industrial-crawlers.test.ts` (15 testes).
- **Consequências:** Mineração e colheita operando em escala nacional com integridade territorial (Invariantes M01 e M04).

## DEC-179: Homologação e Fechamento Integrado dos 4 Pilares de Engenharia (R1 a R4) e Auditoria de Vitória
- **Data:** 2026-10-04
- **Contexto:** Validação integral e homologação dos 5 Marcos (M1 a M5) e 4 Pilares (R1 a R4).
- **Decisão:** Homologação técnica definitiva após verificação empírica: 82/82 testes verdes nas suítes principais (118 testes totais com suítes auxiliares), Catraca de CI do Design Lint aprovada com 0 regressões contra baseline congelada de 15.417 violações, e certificação independente de vitória pelo Victory Auditor (`VICTORY CONFIRMED`).
- **Consequências:** Plataforma all-in-one Waesy consolidada, estável, resiliente e em prontidão operacional.
