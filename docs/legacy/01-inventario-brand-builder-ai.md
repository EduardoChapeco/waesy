# 01-inventario-brand-builder-ai.md — Inventário Exaustivo: Brand Builder AI

- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\brand-builder-ai`
- **Último Commit:** `f04288d` (AI Builder, 04/04/2026: `fix(backend): update edge functions to use new SDD-1.0 canonical tables`)
- **Stack Base:** Vite + React 18 + Remotion + 69 Edge Functions Deno em Supabase.

---

## A) Banco de Dados (Supabase PostgreSQL)
Mapeamento extraído de `supabase/migrations/`:
- `landing_pages`: `id`, `workspace_id`, `name`, `source_type ('cloned'|'template')`, `source_url`, `screenshots_json`, `dom_content`, `sections_analysis`, `status`.
- `media_assets`: `id`, `workspace_id`, `module`, `asset_type`, `storage_path`, `public_url`, `metadata`.
- `brand_templates`: `id`, `workspace_id`, `category`, `template_dna`, `html_blueprint`.
- `agent_registry` & `agent_tasks`: Registro e filas de tarefas assíncronas.
- `workspace_api_keys`: Armazenamento de chaves (Groq, OpenRouter, Gemini, Firecrawl, Steel, ScreenshotAPI).

---

## B) Backend (Supabase Edge Functions)
Inventário das 69 Edge Functions (destaques críticos para nativização):

| Edge Function | O que faz | Dependências | Qualidade | Risco |
| :--- | :--- | :--- | :---: | :---: |
| `extract-brand-identity` | Transforma briefing raso em Brand DNA Junguiano denso (arquétipo, pilares de conteúdo, ganchos e tom expandido) | LLM Gateway | Ótima | Baixo |
| `extract-product-colors` | Normaliza paleta HEX (até 5 cores) e infere categoria semântica de produto | Parser puro | Ótima | Zero |
| `agent-scraper` | Dispara scraper em URL via Firecrawl com captura de tela full-page e upload em storage | Firecrawl API | Ótima | Baixo |
| `agent-vision-analyzer` | "The Visionary": Analisa screenshot via IA multimodal e deduz paleta, raio de borda, tipografia, composição e template HTML | Visão Multimodal | Ótima | Baixo |
| `landing-analyze-url` | Faz crawl completo de landing page (DOM + print) e decompõe em blocos estruturados | Firecrawl + Visão | Ótima | Baixo |
| `analyze-viral-content` | Analisa padrões de viralidade em vídeos e postagens | LLM Gateway | Boa | Baixo |
| `simlab-dispatch` | Distribui tarefas para agentes sintéticos do SimLab | Supabase DB | Boa | Baixo |

---

## C) Inteligência Artificial (Engenharia de Prompts)
1. **The Identity Engineer** (`extract-brand-identity/index.ts:30-51`):
   - Especialista em arquétipos de Carl Jung e estrategista de branding.
   - Deduz: `archetype`, `content_pillars`, `hook_patterns`, `emoji_usage`, `tone_of_voice_expanded`.
2. **The Visionary** (`agent-vision-analyzer/index.ts:30-65`):
   - Diretor de arte e psicanalista de cores.
   - Deduz: `color_mood`, `color_palette`, `typographic_scale`, `tone_of_voice`, `radius`, `shadow`, `composition_grid`.
3. **Landing Page Structural Decomposer** (`landing-analyze-url/index.ts:49-79`):
   - Decompõe qualquer página em `page_objective`, `sections` (ordem, headline, body_text, cta_text), `color_palette` e `typography_observations`.

---

## D) Extração
- `scrapeDomWithFirecrawl` (`_shared/postgen.ts:612-650`): Extrai Markdown e HTML limpos de qualquer URL via endpoint `/v1/scrape`.
- `capturePageVisual` (`_shared/postgen.ts:497-610`): Captura telas de desktop (1440x2200) e mobile (390x2200) via ScreenshotAPI ou Steel.
- `decodeDataUrl` & `uploadBytesToAsset` (`_shared/postgen.ts:652-709`): Pipeline de ingestão direta de buffers de mídia no Supabase Storage.

---

## E) Metodologias e Matrizes
- **Engenharia de DNA de Marca:** Modelo Junguiano aplicado a posicionamento comercial e personas de consumo.
- **Decomposição Estrutural de Oferta:** Mapeamento de hierarquia Hero -> Features -> Prova Social -> CTA.

---

## F) Frontend
- `src/pages/BrandKitPage.tsx`: Editor integrado com preview instantâneo.
- `src/pages/OnboardingPage.tsx`: Fluxo guiado de onboarding para criação de workspace.
- `src/components/shared/MediaUploader.tsx`: Componente de upload e gestão de ativos visuais.

---

## G) Utilitários e Libs
- `src/lib/platform/edge-functions.ts`: Invoker tipado de Edge Functions.
- `src/lib/promptStudio.ts`: Formatador de prompts para estúdios criativos.

---

## H) Testes e Documentação
- `docs/SIMWORK-CANONICAL-MASTER.md`: Mapeamento de contratos canônicos.
