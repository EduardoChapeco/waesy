# 00-projetos.md — Descoberta Territorial Completa dos Projetos Legados

## 1. Visão Geral da Descoberta
Mapeamento realizado em 30 de Setembro de 2026 nos diretórios locais (`c:\Users\Excelência Tour SMO\Documents\projetos-referencias`, `D:\`) e na conta GitHub oficial (`github.com/EduardoChapeco`).

| Projeto Legado | Origem / Caminho | Stack / Versão | ORM / Banco | Estado Operacional | Último Commit / Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ENGIOS** | `projetos-referencias/ENGIOS` | Remix v2 + Vite + UnoCSS/Tailwind (v0.1.0) | Supabase PostgreSQL (7 migrations) | Funcional / Referência Squads | `2d0bca1` (29/03/2026) |
| **simwork** (com SimLab) | `projetos-referencias/simwork` | Vite + React 18 + Remotion + Python FastAPI | Supabase (55 migrations) + Qdrant | Funcional / Motor de Simulação | `739961c` (08/04/2026) |
| **brand-builder-ai** | `projetos-referencias/brand-builder-ai` | Vite + React 18 + Remotion + Deno Edge Fn | Supabase (48 migrations, 50+ Edge Fn) | Funcional / Motor de Extração | `f04288d` (04/04/2026) |
| **persona-nexus** | `projetos-referencias/persona-nexus` | Vite + React + Radix UI (`event-ios`) | Supabase (149 migrations) | Legado / Referência Marketing | `fffcf7f` (17/03/2026) |
| **wider-669929d7** | `projetos-referencias/wider-669929d7` | Vite + React + TanStack (`waesy-platform` v4.8) | Supabase (823 migrations) | Legado Imenso / Matrizes & ERP | `feba063` (24/03/2026) |
| **cloudblock** | `projetos-referencias/cloudblock` | Vite + React + DND-Kit | Supabase (23 migrations) | Estável / Canvas Blocos | `0e40b08` (26/05/2026) |
| **studiomachine / machine** | `projetos-referencias/studiomachine` | Vite + React + `@google/genai` | Sem banco relacional (Client SDK) | Experimental / Viral Engine | `3cfba8c` (05/03/2026) |
| **lean-canvas-creator** | `github.com/EduardoChapeco/lean-canvas-creator` | Vite + React + Lovable Slides | Supabase (4 migrations) | Funcional / Apresentação | `main` branch |

---

## 2. Detalhamento por Projeto

### 2.1. ENGIOS (`engiosai`)
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\ENGIOS`
- **Stack:** Remix Run (`@remix-run/node`, `@remix-run/react`), Vite, UnoCSS, Electron, Cloudflare Worker (`wrangler.toml`).
- **Dependências de IA:** `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/deepseek`, `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/amazon-bedrock`, `@openrouter/ai-sdk-provider`, `ollama-ai-provider`.
- **Destaques:**
  1. `app/lib/squads/core/frameworks.ts`: Estruturação de frameworks estratégicos (AIDA, PAS, StoryBrand, SWOT, Oceano Azul, 5 Forças de Porter, AARRR, Jobs To Be Done).
  2. `app/lib/squads/agents/`: 11 agentes de squad (`sherlock.agent.ts`, `brand.agent.ts`, `marketing.agent.ts`, `conteudo.agent.ts`, `arquitetura.agent.ts`, `backend.agent.ts`, `frontend.agent.ts`, `crm.agent.ts`, `dados.agent.ts`, `deploy.agent.ts`, `qa.agent.ts`).
  3. `app/lib/modules/openbox/market-analyzer.ts`: Motor de coleta de dados socioeconômicos reais do IBGE (PIB municipal e População via API SIDRA).
  4. `app/components/chat/BrandMemoryPanel.client.tsx`: Painel de sincronização de memória e DNA da marca.

### 2.2. simwork & SimLab
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\simwork`
- **Stack:** Frontend React + TypeScript + Tailwind CSS; Backend Python 3.11 (`simlab/`) com FastAPI, Celery, Pydantic e Qdrant.
- **Destaques:**
  1. `simlab/simlab/personas/seed_personas.json`: 10+ perfis sociodemográficos brasileiros hipercalibrados (ex.: "Vera, 52 anos, Comerciante em Chapecó-SC", "Carla, 32 anos, Mãe Classe Média em Porto Alegre-RS", "Rodrigo, 42 anos, Gestor Analítico em Curitiba-PR").
  2. `simlab/simlab/prompts/`: Avaliadores sintéticos com saída JSON estrita (`validate_content.txt`, `validate_journey.txt`, `validate_character.txt`, `validate_trend.txt`, `insight_synthesizer.txt`).
  3. `src/hooks/useBrandKit.ts` e `src/pages/BrandKitPage.tsx`: Gestão completa de identidade com serialização plana e persistência JSONB (`colors`, `fonts`, `logos`, `voice`).

### 2.3. brand-builder-ai
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\brand-builder-ai`
- **Stack:** Vite + React + Supabase com 50+ Edge Functions Deno.
- **Destaques:**
  1. `supabase/functions/extract-brand-identity/index.ts`: "The Identity Engineer" — deduz arquétipos Junguianos, pilares de conteúdo, padrões de ganchos (hooks) e tom de voz expandido.
  2. `supabase/functions/extract-product-colors/index.ts`: Normalizador de paleta cromática e inferência semântica de categoria de produto.
  3. `supabase/functions/landing-analyze-url/index.ts`: Decomposição de landing pages externas em seções estruturadas (Hero, Features, Prova Social, CTA).
  4. `supabase/functions/_shared/postgen.ts`: Integração com Firecrawl (`scrapeDomWithFirecrawl`) para extração de Markdown/HTML limpo de qualquer URL, e captura de tela responsiva multi-dispositivo (`capturePageVisual` via Steel / ScreenshotAPI).

### 2.4. wider-669929d7
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\wider-669929d7`
- **Stack:** Base histórica ampla da plataforma Wider (823 migrations).
- **Destaques:**
  1. `supabase/brain-functions/ai-orchestrator/index.ts`: Orquestrador com seleção de modelo por perfil de custo/latência (`selectOptimalProvider`), fallback automático e contabilização em ledger (`billing_usage`).
  2. Módulos de Análise Estratégica (SWOT, Posicionamento Competitivo, Riscos e Mitigações).
  3. Gestor de Auditoria e Onboarding Studio.
