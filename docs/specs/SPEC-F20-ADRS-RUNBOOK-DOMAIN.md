# SPEC-F20 — ADRs, Runbook de Operacao e Dicionario de Dominio

## 1. Identificacao e Metadados
- **ID:** SPEC-F20-ADRS-RUNBOOK-DOMAIN
- **Fase:** F20 (Plano de Estabilizacao E2E — Governanca e Infraestrutura CI)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `ROADMAP_VIVO.md`.

---

## 2. Contexto e Escopo Delimitado
Esta especificacao formaliza os requisitos para consolidar a governanca operacional e o alinhamento terminologico do ecossistema Waesy:
1. `docs/operacao/RUNBOOK.md`: Protocolos deterministicos de deploy, rollback, rotacao de segredos e triagem de incidentes (SEV-1 a SEV-3).
2. `docs/canonico/DICIONARIO_DOMINIO.md`: Glossario ubiquo definindo a soberania dos 4 pilares, entidades, maquinas de estado e politicas transacionais.
3. `CONTRIBUTING.md`: Guia normativo de desenvolvimento para operadores humanos e agentes autonomos.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL documentar procedimentos de rollback com tempo maximo de execucao inferior a 30 segundos na borda Cloudflare Pages.
- **EARS-U02:** O sistema SHALL estabelecer definicoes terminologicas homogeneas que proíbam ambiguidades entre estabelecimentos de Places, contas lojistas de Marketplace e perfis de Classificados.
- **EARS-U03:** O sistema SHALL consolidar os 5 gates bloqueantes de qualidade obrigatorios para qualquer alteracao na base de codigo.

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO um incidente SEV-1 for diagnosticado, O operador SHALL executar os passos de mitigacao e isolamento em menos de 15 minutos conforme a matriz do runbook.
- **EARS-E02:** QUANDO novos termos de dominio forem adicionados ao modelo de banco, O sistema SHALL atualizar o Dicionario Ubíquo na mesma transacao de documentacao.

---

## 4. Criterios de Aceite
- [x] `docs/operacao/RUNBOOK.md` criado com secoes de deploy, rollback, rotacao de chaves e incidentes.
- [x] `docs/canonico/DICIONARIO_DOMINIO.md` criado com detalhamento dos 4 pilares e invariantes.
- [x] `CONTRIBUTING.md` criado com as 5 gates de qualidade.
- [x] `DEC-146` registrado em `docs/design/DECISIONS.md`.
