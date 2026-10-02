# SPEC-F23 — Auditoria de Seguranca Final e RLS Abrangente

## 1. Identificacao e Metadados
- **ID:** SPEC-F23-SECURITY-AUDIT
- **Fase:** F23 (Plano de Estabilizacao E2E — Governanca, RLS e Seguranca Server-Side)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board
- **SSOT Relacionados:** `AGENTS.md`, `.agents/skills/security-guard/SKILL.md`, `PROXIMOS_PLANOS_EXECUCAO.md`.

---

## 2. Contexto e Escopo Delimitado
Esta especificacao define os requisitos de auditoria deterministica e homologacao da blindagem de seguranca para a entrega da versao 2.0 da plataforma Waesy:
1. **Auditoria de RLS (PostgreSQL):** Confirmacao de 100% das tabelas em `public` com `rowsecurity = true` e revisao de politicas de escrita/leitura.
2. **Isolamento Multi-Tenant:** Validacao das Server Functions autenticadas atraves de `assertStoreAccess` e `getServerIdentity`.
3. **Prevecao de Injecao de Codigo/SQL:** Proibicao de concatenacao dinamica de strings em queries, com uso estrito do query builder parametrizado do Supabase.
4. **Rate Limiting em Rotas Criticas:** Protecao contra abusos e DoS em buscas universais, checkout e webhooks.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL manter `rowsecurity = true` em 100% das tabelas do schema `public`, sem nenhuma excecao.
- **EARS-U02:** O sistema SHALL rejeitar qualquer mutacao em carteiras (`user_token_wallets`, `store_token_wallets`) ou livro-razao originada diretamente de clientes nao-autorizados.
- **EARS-U03:** O sistema SHALL parametrizar todas as variaveis em consultas de persistencia, impedindo injeção SQL em toda a camada BFF.

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO um usuario requisitar dados de uma loja em rotas do Workspace Pro, O sistema SHALL validar seu vinculo atraves de `assertStoreAccess` antes de executar qualquer query.
- **EARS-E02:** QUANDO o volume de requisicoes na busca universal exceder o teto estipulado, O rate limiter SHALL responder HTTP 429 imediatamente.

---

## 4. Criterios de Aceite
- [x] Relatorio formal `docs/auditoria/AUDITORIA_SEGURANCA_F23.md` publicado.
- [x] 536/536 tabelas publicas auditadas e confirmadas com RLS ativo.
- [x] Zero tabelas desprotegidas no banco de producao.
- [x] `DEC-149` registrado em `docs/design/DECISIONS.md`.
