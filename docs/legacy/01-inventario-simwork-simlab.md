# 01-inventario-simwork-simlab.md — Inventário Exaustivo: simwork & SimLab V2

- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\simwork`
- **Último Commit:** `739961c` (AI Builder, 08/04/2026: `chore: align rollout manifests with canonical runtime`)
- **Stack Base:** Vite + React 18 + TypeScript + Tailwind CSS; Backend Python 3.11 (`simlab/`) com FastAPI, Pydantic, Celery e Qdrant.

---

## A) Banco de Dados (Supabase PostgreSQL & Vector DB)
Mapeamento extraído de `schema.sql` e `supabase/migrations/`:

| Tabela | Colunas Chave / Tipos | Índices / Constraints | RLS / Políticas | Qualidade | Risco |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `simlab_runs` | `id (uuid pk)`, `workspace_id (uuid)`, `stimulus_type (text)`, `objective (text)`, `status (text)` | FK `workspace_id` | RLS ativo por workspace | Ótima | Baixo |
| `simlab_variants` | `id (uuid pk)`, `run_id (uuid)`, `label (text)`, `payload (jsonb)` | FK `run_id` | Cascata de deleção | Ótima | Baixo |
| `simlab_validations` | `id (uuid pk)`, `variant_id (uuid)`, `persona_id (text)`, `score (numeric)`, `verdict (text)`, `reaction (text)` | FK `variant_id`, idx `persona_id` | RLS ativo | Ótima | Baixo |
| `simlab_insights` | `id (uuid pk)`, `run_id (uuid)`, `verdict (text)`, `summary (text)`, `top_actions (jsonb)` | FK `run_id` | RLS ativo | Ótima | Baixo |
| `brand_kits` | `id (uuid pk)`, `workspace_id (uuid unique)`, `colors (jsonb)`, `fonts (jsonb)`, `logos (jsonb)`, `voice (jsonb)` | `uq_workspace_id` | RLS por workspace | Ótima | Baixo |
| `briefings` | `id (uuid pk)`, `workspace_id (uuid)`, `form_data (jsonb)`, `deep_dna (jsonb)` | FK `workspace_id` | RLS por workspace | Ótima | Baixo |
| `competitor_analyses_v2`| `id (uuid pk)`, `workspace_id (uuid)`, `competitor_name (text)`, `url (text)`, `swot (jsonb)` | FK `workspace_id` | RLS por workspace | Ótima | Baixo |
| `brand_characters` | `id (uuid pk)`, `workspace_id (uuid)`, `name (text)`, `archetype (text)`, `avatar_url (text)` | FK `workspace_id` | RLS por workspace | Boa | Baixo |
| `agent_registry` | `id (uuid pk)`, `slug (text unique)`, `name (text)`, `system_prompt (text)`, `capabilities (jsonb)` | `uq_agent_slug` | Catálogo público | Ótima | Baixo |
| `agent_tasks` | `id (uuid pk)`, `workspace_id (uuid)`, `agent_id (uuid)`, `status (text)`, `payload (jsonb)` | FK `workspace_id` | RLS por workspace | Boa | Baixo |

---

## B) Backend (FastAPI Python & Node/Edge Services)
1. `simlab/simlab/api/routes/simlab.py`:
   - Endpoints: `POST /api/v1/simlab/validate-content`, `POST /api/v1/simlab/validate-journey`, `POST /api/v1/simlab/validate-character`, `POST /api/v1/simlab/generate-persona`.
   - Motor: Validação de estímulos contra painel sintético com distribuição estatística.
   - Qualidade: Ótima. Risco: Baixo se nativizado para BFF Server Functions TypeScript no Waesy.
2. `src/lib/key-orchestrator.ts`:
   - Rotação resiliente de chaves de IA (Gemini, Groq, OpenRouter) com tolerância a HTTP 429 e rate-limiting.
   - Qualidade: Boa. Risco: Médio (Waesy já possui pool unificado de IA).
3. `src/lib/canvasEngine.ts` & `src/lib/promptStudio.ts`:
   - Motores de template e injeção contextual de prompts.
   - Qualidade: Boa. Risco: Baixo.

---

## C) Inteligência Artificial (Personas Sintéticas & Avaliadores)
1. `seed_personas.json` (`simlab/simlab/personas/`):
   - **Base de Calibração Sociodemográfica:** 10+ perfis representativos de classes A, B, C e D brasileiras.
   - **Exemplo Real:** `BR_F_52_INTERIOR_CONSERVADORA` ("Vera, 52 anos, Comerciante em Chapecó-SC, Classe C, Renda R$ 3.200, valores familiares, alta aversão ao risco, cinismo 9/10, sensibilidade extrema a prova social").
   - **Exemplo Executivo:** `BR_M_42_GESTOR_ANALITICO` ("Rodrigo, 42 anos, Gestor em Curitiba-PR, foco em ROI, ceticismo 10/10").
   - **Qualidade:** Excepcional (ouro puro para teste de ofertas antes de publicar). Risco: Zero.
2. Prompts Especializados (`simlab/simlab/prompts/`):
   - `validate_content.txt`: Avaliação cega de copy e oferta com nota (0-10), veredito (`approved`, `revise`, `blocked`), nível de interesse e citação espontânea.
   - `insight_synthesizer.txt`: Síntese de conselho executivo com recomendações acionáveis em pt-BR.
   - `persona_generation.txt`: Geração de personas específicas de nicho mantendo fidelidade paramétrica.
   - Qualidade: Ótima.

---

## D) Extração
- `src/lib/sites/`: Extratores de metadados e estrutura semântica de websites de concorrentes.
- Conectores para injeção de parâmetros sociodemográficos na simulação.

---

## E) Metodologias e Matrizes
- **Focus Group Sintético:** Simulação de painel de 4 a 8 personas simultâneas com reações independentes.
- **Auditoria de Concorrentes (`competitor_analyses_v2`):** Mapeamento de propostas de valor, canais e falhas.
- **Brand Kit Canônico:** Serialização plana bidirecional com banco (`colors`, `fonts`, `logos`, `voice`).

---

## F) Frontend
- `src/pages/BrandKitPage.tsx` (linhas 1-536): Interface completa de edição visual do Brand Kit com paleta de cores (primária, secundária, acento, fundos, textos, feedback), upload de logos e escala tipográfica.
- `src/pages/SimLabResearchPage.tsx`: Painel de execução de testes de mercado com visualização de avatares, probabilidades de conversão e objeções primárias.
- `src/pages/SimLabPersonaVersionsPage.tsx`: Gestão de calibração das personas.
- `src/hooks/useBrandKit.ts`: Hook canônico com auto-save debounce (1500ms) e controle de estado de loading/erro.

---

## G) Utilitários e Libs
- `src/lib/error-logger.ts`: Sistema de códigos padronizados de erro (`ERR_BRANDKIT_LOAD_001`, `ERR_BRANDKIT_SAVE_001`).
- `src/lib/siteDesignConstitution.ts`: Constituição de design para geração de páginas.

---

## H) Testes e Documentação
- `simlab/tests/test_personas.py`, `test_contracts.py`, `test_app.py`: Suíte de testes automatizados do motor Python.
- `docs/SIMWORK-CANONICAL-MASTER.md`: Especificação técnica detalhada das tabelas e contratos.
