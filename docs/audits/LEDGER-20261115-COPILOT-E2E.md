# Evidence Ledger — Refatoracao Forense E2E Waesy Copilot

- **Data:** 2026-11-15
- **Spec:** `docs/specs/SPEC-20261115-COPILOT-FORENSIC-E2E-REFACTOR.md`
- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **Commit Base (HEAD):** `67125cb3b582a38424fd389741bcabde7ce83555`
- **Worktree Inicial:** Contem alteracoes preexistentes preservadas integralmente (incluindo `src/components/chat/ai-chat-shell.tsx` linhas `741` e `1051-1065`).

## 1. Preflight do Ambiente e Banco Remoto (Read-Only MCP `jfuebqmltksyznovhlwa`)
| Verificacao | Status Baseline | Evidencia Factual Observada |
|---|---|---|
| `check:schema` | PASS (Exit 0) | `migrations=619, tables_declared=825, functions_declared=276` |
| `check:bff` | PASS (Exit 0) | `Tables without local declaration: 0` (`681` refs BFF, `839` declaradas) |
| `check:tokens` | PASS (Exit 0) | `Tokens W3C DTCG: 173`, `Aliases Quebrados: 0`, `Ausentes em CSS: 0` |
| `check:types-ssot` | PASS (Exit 0) | `2818` arquivos inspecionados, `0` tipos/interfaces duplicados |
| `ai_artifacts_artifact_type_check` | GAP CONFIRMADO | Omite `creative_post`, `dashboard`, `map_view`, `carousel`, `motion_video`, `simlab_report`, `business_plan`, `web_app`, `schedule_plan` |
| `copilot_project_embeddings` / `copilot_semantic_memory` | GAP CONFIRMADO | Colunas `vector(1536)` validas, porem gateway sem branch `task === "embedding"` e `copilot-memory` usando SHA-256 falso |
| `ai_skills` | GAP CONFIRMADO | Sem colunas `store_id`, `allowed_tools`, `system_instructions`, `model_preference`; `ai_skills_icon_no_sparkles` ativo |
| `ai_memory_layers` RLS | GAP CONFIRMADO | Apenas `owner_user_id = auth.uid()`, sem acesso de staff (`is_store_staff(owner_store_id)`) para regras de marca/empresa |
| `api_key_pools` ativos | VERIFICADO | `gemini(1)`, `groq(3)`, `openrouter(1)`, `firecrawl(3)`, `steel(3)`, `datajud(1)`, `places_scraper(1)`, `resend(1)`; zero chaves `openai`/`anthropic` |
| `storage.buckets` | VERIFICADO | `store-assets` (`public: true`) existe; `copilot-uploads` nao existe |

## 2. Reproducao da Baseline (`task-193` + Testes de Regressao Pre-Fix)
Pendente consolidacao da saida completa de `task-193` (`typecheck`, `lint:design`, `vitest`) e execucao pre-fix de `src/services/copilot-forensic-e2e-v2.test.ts` antes das mutacoes de codigo.

## 3. Escopo Delimitado (Arquivos Permitidos)
Conforme Secao 2 de `docs/specs/SPEC-20261115-COPILOT-FORENSIC-E2E-REFACTOR.md`.

## 4. Log de Ondas e Provas (Atualizado por Onda)
- **Preflight Governance:** Spec criada, ledger inicializado sem mutacao previa de codigo fonte.
