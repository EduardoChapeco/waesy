# SPEC-PROPOSAL-STUDIO-CANVAS-V1 — Refatoração Canônica dos Templates de Proposta, Isolamento Cromático do Canvas e Editor Visual Completo

## 1. Contexto e Problema
No módulo de Propostas de Turismo (`/workspace/turismo/propostas/$id` e `/_store/proposta/$token`), os 6 templates visuais (`TemplateEditorialFlat`, `TemplateDarkPremium`, `TemplateExecutivo`, `TemplateLandscape`, `TemplateVerticalPremium`, `TemplateGroupCatalog`) e o frame do canvas (`StudioFrame`, `ProposalCanvasRenderer`) apresentavam falhas visuais e estruturais:
1. **Vazamento de Dark Mode e Regras Globais do Workspace (`#workspace-main-content`) sobre o Canvas:** As regras CSS de `#workspace-main-content` forçavam `.bg-card` para `var(--card)` (`#161618` no modo escuro) e `border-color: transparent` dentro do `#proposal-canvas`, enquanto textos nos templates usavam `text-slate-900` (`#0f172a`) ou `text-foreground`, gerando texto preto sobre fundo preto (ilegível) e cartões brancos (`bg-slate-50`) contrastando de forma abrupta com fundos escuros.
2. **Cores Estranhas / Neon e Inconsistência Temática:** Uso de cores arbitrárias como `#38bdf8` (ciano neon), `#FFFBEB`, `bg-warning/10`, `bg-blue-50`, `bg-orange-50`, `bg-red-600`, além de concatenação inválida de CSS variable com sufixo hexadecimal (`var(--brand-primary, #1E3A5F)26`).
3. **Ausência de Cor de Fundo Própria e Editável no Canvas/Frame:** O canvas não possuía paleta de superfície padrão por template nem controles no editor para personalizar a cor de fundo do canvas, a cor primária de destaque, a tipografia e a visibilidade das seções, além de exportar PNG com `backgroundColor: null` (transparente).
4. **Lacunas de Builder/Editor e Dados:** Abas cortadas na barra horizontal (`Serviços`, `Inclusões`, `Preço` ocultas), ausência de edição de dados do consultor/agência, e seções omitidas em templates específicos (`flights` ausente em `TemplateVerticalPremium`, `includes`/`excludes` ausente em `TemplateExecutivo`, detalhes de `hotels`/`flights`/`transfers` ausentes em `TemplateGroupCatalog`).

## 2. Requisitos em Sintaxe EARS

### R1 — Isolamento Cromático e Superfície Sólida do Canvas
- **WHEN** o `ProposalCanvasRenderer` ou `StudioFrame` renderizar qualquer um dos 6 templates de proposta dentro do Workspace (Light ou Dark Mode) ou na rota pública `/_store/proposta/$token`, **THE SYSTEM SHALL** isolar o elemento `[data-proposal-canvas]` das regras globais de `#workspace-main-content` e aplicar uma cor de fundo sólida determinística (`canvasBgColor`), nunca transparente.
- **WHERE** o usuário não tiver definido uma cor de fundo customizada para a proposta, **THE SYSTEM SHALL** adotar a cor de fundo padrão canônica do modelo selecionado (`#FFFFFF` para `editorial-flat` e `executivo-b2b`, `#0B0F19` para `dark-premium`, `#0F172A` para `landscape-presentation`, `#F8FAFC` para `vertical-premium` e `group-catalog`).
- **WHEN** o usuário selecionar ou editar a cor de fundo do canvas (`canvas_bg_color`) ou a cor de destaque da marca (`canvas_brand_color`) no `StudioSidebarEditor`, **THE SYSTEM SHALL** recalcular automaticamente os tokens de contraste (`--proposal-ink`, `--proposal-ink-muted`, `--proposal-surface-card`, `--proposal-surface-subtle`, `--proposal-border`, `--proposal-brand-fg`) via luminância relativa WCAG 2.2 AA/AAA.

### R2 — Padronização Visual dos 6 Templates (Zero Neon / Alta Legibilidade)
- **WHILE** qualquer template de proposta estiver ativo em qualquer formato (`a4-portrait`, `a4-landscape`, `story-916`, `presentation-169`, `letter-portrait`), **THE SYSTEM SHALL** renderizar todas as seções com dados preenchidos (Capa, Resumo Executivo, Voos, Hotéis, Roteiro Dia a Dia, Traslados, Passeios, Inclusões/Exclusões, Condições/Campos Extras, Investimento e Rodapé do Consultor) usando exclusivamente a paleta semântica derivada do template e da proposta, sem cores neon ou textos sem contraste.

### R3 — Controles Completos do Builder (`StudioSidebarEditor`) e Exportação PNG/PDF
- **WHEN** o usuário abrir o `StudioSidebarEditor`, **THE SYSTEM SHALL** exibir todas as 9 abas visíveis em grade compacta sem corte horizontal, prover controles de cor de fundo do canvas, cor da marca, tipografia, visibilidade de seções e dados do consultor, e preservar a cor de fundo sólida na exportação PNG e PDF (`pdf-export.ts`).

## 3. Escopo Atômico Autorizado
- `src/styles.css`
- `src/lib/tourism/proposal-theme-palettes.ts` (novo utilitário puro de paletas, luminância e tokens por template)
- `src/components/tourism/studio/studio-frame.tsx`
- `src/components/tourism/studio/proposal-canvas-renderer.tsx`
- `src/components/tourism/studio/studio-sidebar-editor.tsx`
- `src/components/tourism/proposals/templates/index.ts`
- `src/components/tourism/proposals/templates/blocks/UI.tsx`
- `src/components/tourism/proposals/templates/TemplateEditorialFlat.tsx`
- `src/components/tourism/proposals/templates/TemplateDarkPremium.tsx`
- `src/components/tourism/proposals/templates/TemplateExecutivo.tsx`
- `src/components/tourism/proposals/templates/TemplateLandscape.tsx`
- `src/components/tourism/proposals/templates/TemplateVerticalPremium.tsx`
- `src/components/tourism/proposals/templates/TemplateGroupCatalog.tsx`
- `src/lib/pdf-export.ts`
- `src/services/travel-proposal.functions.ts`
- `src/lib/tourism/proposal-theme-palettes.test.ts` (novo teste unitário)
- `docs/design/DECISIONS.md`
