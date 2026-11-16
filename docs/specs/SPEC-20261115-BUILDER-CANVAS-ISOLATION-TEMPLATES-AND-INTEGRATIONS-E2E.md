# SPEC-20261115-BUILDER-CANVAS-ISOLATION-TEMPLATES-AND-INTEGRATIONS-E2E

**Status:** APROVADA
**Data:** 2026-11-15
**Escopo:** Isolamento CSS/Dark-Mode de Frame e Canvas Visual, Controle Minimalista em Editores/Builders, Saneamento Completo de Templates Omni/Studio, Polimento E2E do Copilot e Auditoria Transversal de Integracoes (MCP, Marketplaces e Conectores).

---

## 1. Requisitos em Sintaxe EARS

### 1.1 Isolamento Total de Tema e Modo Escuro em Frames de Edicao e Paginas Publicadas
- **REQ-CANVAS-01 (Isolamento de Tokens Semanticos):** Quando `shouldApplyCustomDocumentTheme(theme)` for verdadeiro em `getDocumentThemeCanvasStyle` (`src/lib/builder/block-data-resolver.ts`), o sistema DEVE computar e sobrescrever na raiz do canvas todas as variaveis semanticas consumidas pelos blocos (`--background`, `--color-background`, `--canvas`, `--color-canvas`, `--foreground`, `--color-foreground`, `--surface`, `--surface-card`, `--surface-raised`, `--surface-subtle`, `--surface-muted`, `--card`, `--color-card`, `--card-bg`, `--card-foreground`, `--color-card-foreground`, `--popover`, `--color-popover`, `--popover-foreground`, `--color-popover-foreground`, `--primary`, `--color-primary`, `--primary-foreground`, `--color-primary-foreground`, `--secondary`, `--color-secondary`, `--secondary-foreground`, `--color-secondary-foreground`, `--accent`, `--color-accent`, `--accent-foreground`, `--color-accent-foreground`, `--muted`, `--color-muted`, `--muted-foreground`, `--color-muted-foreground`, `--text-primary`, `--color-text-primary`, `--text-secondary`, `--text-tertiary`, `--border`, `--color-border`, `--border-subtle`, `--border-default`, `--border-strong`, `--input`, `--input-bg`, `--ring`) alem de `colorScheme` coerente com a luminancia do fundo (`light` ou `dark`).
- **REQ-CANVAS-02 (Contraste Dinamico WCAG em Superficies Customizadas):** Quando o usuario definir cores customizadas (como fundo amarelo `#facc15` ou cor primaria clara), o sistema DEVE calcular `--primary-foreground` e superficies derivadas por contraste de luminancia relativa WCAG, impedindo texto branco ilegivel sobre botoes ou fundos claros e bloqueando heranca do tema do painel hospedeiro Waesy.
- **REQ-CANVAS-03 (Blindagem contra `.dark` do Sistema Hospedeiro):** Enquanto o documento editado ou pagina publica aplicar tema proprio (`data-builder-canvas-isolated="true"`), a variante `@custom-variant dark` em `src/styles.css` NAO DEVE casar descendentes dentro do contêiner isolado, impedindo que `dark:*` do shell administrativo vaze sobre sites claros ou coloridos em preview/publicacao.
- **REQ-CANVAS-04 (Paridade Unificada entre Shell e Rota Publica):** O isolamento via `getDocumentThemeCanvasStyle` e `data-builder-canvas-isolated` DEVE operar de forma identica no `BuilderViewportFrame` (desktop), viewport mobile do `OmniEditor`, `BuilderCanvas` (`desktop`, `mobile` e `story` no Studio Builder), `OmniPageRenderer` e `_store.paginas.$slug` (envolvendo tambem o rodape e superficie raiz).

### 1.2 Controles Minimalistas em Editores e Builders
- **REQ-EDITOR-01 (Higiene Visual e Densidade):** Em todas as superficies dos editores (`OmniEditor`, `BuilderTopBar`, `BuilderDockedRail`, `UniversalBlockInspector` e editores verticais irmaos), os controles de acao DEVEM respeitar altura tatil minima `h-11 min-h-11` em alvos interativos aplicaveis, foco visivel `:focus-visible`, zero valores arbitrarios entre colchetes, espacamento em grade de 4px e no maximo uma acao primaria (`variant="default"`) por barra ou painel.

### 1.3 Templates Omni e Studio 100% Funcionais
- **REQ-TEMPLATE-01 (Integridade de CTAs e Formularios em Templates):** Todo template em `src/lib/builder/omni-templates.ts` e `src/lib/builder/studio-pilot-templates.ts` DEVE possuir `ctaHref` valido em todos os planos de tabelas de preco, configuracao valida de captura em `contact_form_direct` (`whatsappNumber` ou modo formulario CRM explicito aceito por `ContactFormDirect` e `studio-template-audit.ts`) e tema proprio declarado via `resolveTemplateTheme`.
- **REQ-TEMPLATE-02 (Aprovacao Integrada de Auditoria):** Ao executar `npm.cmd run audit:studio-templates`, nenhum template publicado DEVE encerrar com status `FAIL`.

### 1.4 Continuidade Copilot E2E (Manus Parity & UI Limpa)
- **REQ-COPILOT-01 (Cobertura Completa do Painel de Artefatos):** Quando uma execucao ReAct produzir artefatos dos tipos `image`, `video`, `motion_video`, `web_app`, `simlab_report`, `business_plan`, `carousel` ou `schedule_plan`, o `CopilotArtifactPanel` (`src/components/chat/copilot-artifact-panel.tsx`) DEVE exibir rotulo legivel em portugues e renderizar visualizacao segura direta sem depender exclusivamente de fallback textual generico.
- **REQ-COPILOT-02 (Continuidade de Fluxo E2E):** A arquitetura de streaming SSE, validacao de rotas internas, habilidades (`CopilotSkillsCenter`), conectores (`CopilotConnectorsCenter`) e sandbox/browser drawer (`ManusComputerDrawer`) DEVE operar sem dependencias circulares, tipos duplicados ou contratos BFF quebrados.

### 1.5 Auditoria e Sincronizacao End-to-End de MCP, Marketplaces e Integracoes Externas
- **REQ-INT-01 (Zero-Trust e Escopo Multi-Tenant):** Todo endpoint publico/webhook (`api.webhooks.marketplaces.ts`, `api.auth.marketplace.callback.ts`, `api.mcp.v1.tools.call.ts`) e toda server function (`mcp-server.functions.ts`, `mcp-connectors.functions.ts`, `marketplace-hub.functions.ts`, `marketplace-webhooks.functions.ts`, `integrations.functions.ts`, `ai-connectors-vault.functions.ts`) DEVE validar autenticacao/assinatura, pertencimento de tenant/store e criptografia de credenciais de ponta a ponta.
- **REQ-INT-02 (Sincronizacao Real UI <-> BFF):** Telas de integracao (`workspace.integracoes.marketplaces.tsx`, `workspace.configuracoes.integracoes.tsx`, `admin-master.integracoes.tsx`) DEVEM estar conectadas as respectivas server functions sem botoes mortos ou desvios de contrato Zod.

---

## 2. Invariantes e Evidencias de Aceite

1. Zero violações no `node scripts/design-lint.mjs --ratchet` (P0=0, P1=0, total=0).
2. `npm.cmd run check:schema`, `check:bff`, `check:tokens`, `check:types-ssot`, `check:cycles`, `audit:buttons`, `audit:studio-templates`, `typecheck`, `npm.cmd test`, `npm.cmd run build` e `check:route-budget` com Exit Code 0 apos a edicao final.
3. Testes de regressao especificos validando: isolamento de tema amarelo `#facc15` e contraste automatico, cobertura de templates sem falhas e integridade dos contratos MCP/Marketplaces/Integracoes/Copilot.
4. Registro formal de decisoes em `docs/design/DECISIONS.md` e trilha de evidencias em `docs/audits/LEDGER-20261115-COPILOT-E2E.md`.
