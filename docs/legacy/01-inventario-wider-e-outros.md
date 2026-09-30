# 01-inventario-wider-e-outros.md — Inventário Exaustivo: Wider OS, Persona Nexus, Cloudblock e Studiomachine

## 1. Wider OS (`wider-669929d7` — `waesy-platform` v4.8)
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\wider-669929d7`
- **Último Commit:** `feba063` (Eduardo, 24/03/2026: `feat(employee): criar abas dashboard e settings para RH`)
- **Base de Dados:** 823 migrations em `supabase/migrations/` cobrindo comércio, serviços, financeiro, contábil, jurídico, turismo e RH.

### A) Destaques de Banco e Backend
- `supabase/brain-functions/ai-orchestrator/index.ts` (linhas 1-460):
  - Roteamento dinâmico de IA (`selectOptimalProvider`) entre modelos rápidos (`mode: 'fast'`) e profundos (`mode: 'deep'`).
  - Análise estratégica (SWOT, Posicionamento Competitivo, Riscos e Mitigações).
  - Tradução e sumarização com injeção de parâmetros contextuais.
  - Registro de telemetria de consumo em `billing_usage` com `tenant_id`, `resource_type: 'ai_tokens'`, `quantity`, latência em milissegundos e custo estimado.
- `supabase/brain-functions/gestor-assistant/`: Assistente de gestão operacional de loja.
- `supabase/brain-functions/wi-chat-core/`: Motor de conversação nativo com histórico persistido.

---

## 2. Persona Nexus (`persona-nexus` — `event-ios`)
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\persona-nexus`
- **Último Commit:** `fffcf7f` (Eduardo, 17/03/2026: `chore: sync modifications`)
- **Base de Dados:** 149 migrations em `supabase/migrations/`.

### A) Destaques de IA e Métricas
- `src/lib/ai-prompts.ts` (linhas 1-250):
  - `ATTENDANCE_PREDICTION`: Predição econométrica de comparecimento baseada em dados climáticos, histórico, dia da semana e capacidade, com intervalo de confiança.
  - `PRICING_OPTIMIZATION`: Precificação dinâmica e análise de elasticidade de demanda.
  - `CHURN_RISK_ANALYSIS`: Análise preditiva de retenção de clientes.
- `src/modules/marketing/components/MarketingAnalytics.tsx`: Painel de telemetria e ROI de campanhas.

---

## 3. Cloudblock (`cloudblock`)
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\cloudblock`
- **Último Commit:** `0e40b08` (gpt-engineer-app[bot], 26/05/2026)
- **Base de Dados:** 23 migrations.

### A) Destaques de Frontend
- `src/components/editor/DraggableCanvas.tsx` & `Canvas.tsx`:
  - Motor de edição visual arrastável baseado em `@dnd-kit/core` e `@dnd-kit/modifiers`.
  - Posicionamento em grade com snap to grid e reorganização fluida de blocos.

---

## 4. Studiomachine / Machine (`studiomachine`)
- **Caminho:** `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\studiomachine`
- **Último Commit:** `3cfba8c` (EduardoChapeco, 05/03/2026: `feat: Initialize project structure and types`)
- **Stack:** Vite + React + `@google/genai`.

### A) Destaques de IA
- `components/BrandEditor.tsx`: Editor em tempo real de arquétipos de marca e preenchimento de briefs criativos.
- Motor de prompts para conteúdo viral com ganchos emocionais.

---

## 5. Lean Canvas Creator (`github.com/EduardoChapeco/lean-canvas-creator`)
- **Origem:** Repositório oficial GitHub.
- **Stack:** Vite + React + Tailwind + Supabase.
- **Destaques:**
  - `src/components/editor/BlockRenderer.tsx` & `src/pages/Editor.tsx`: Construtor de lâminas e apresentações executivas.
  - Modelos de Business Model Canvas e Lean Canvas formatados para visualização de stakeholders.
