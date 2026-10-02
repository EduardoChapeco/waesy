# PROXIMOS_PLANOS_EXECUCAO.md — Protocolo Canônico de Execução Autônoma

> **Comando de Ativação Rápida:** Ao enviar para qualquer IA o comando `"leia os proximos planos"`, o agente deve carregar este documento imediatamente como Fonte Única de Instrução Operacional e executar sequencialmente as fases pendentes sem interrupção, sem mocks, sem fallbacks sintéticos e sem quebra de rotas de produção.

---

## 1. Contexto e Estado Atual do Sistema (SSOT)

| Parâmetro | Valor Canônico |
| :--- | :--- |
| **Projeto** | Waesy (Plataforma BigTech Multitenant de Comércio, Serviços e Gestão Local) |
| **Estado Atual** | 22 de 48 fases concluídas e homologadas (**45.8% de Plano 5**) |
| **Última Decisão Homologada** | `DEC-111` (Fases S21 e S22 — RLS performático InitPlan, Rate Limit, Idempotência e Outbox DLQ) |
| **Compilação TypeScript** | `npm run typecheck` com **0 erros** (Exit Code 0) |
| **Suíte de Testes Unitários** | 157 arquivos de teste, **1.039 testes verdes** (Vitest) |
| **Catraca de Design Lint** | 0 violações P0/P1 nos arquivos modificados, baseline decrescente contínua |
| **Runtime de Produção** | Cloudflare Pages / Workers com bundle dentro do orçamento (< 25 MB) |
| **Banco de Dados** | Supabase PostgreSQL com RLS deny-by-default em 100% das tabelas |

---

## 2. As Quatro Leis Invioláveis do Repositório (AGENTS.md)

1. **Zero Mocks e Zero Dados Sintéticos:** Todo dado consumido pela interface provém de queries reais no Supabase via Server Functions (`src/services/`). Se o dado não existe, renderiza-se honestamente o estado vazio (`<EmptyState />`) ou esqueleto de carregamento (`<Skeleton />`).
2. **Separação Rígida de Camadas:**
   - `src/components/`: Primitivas de UI. Proibido declarar cores literais (`#hex`, `rgb`), estilos inline ou regras de negócio.
   - `src/services/`: BFF Server Functions (`createServerFn`). Proibido manipular DOM ou importar componentes visuais.
   - `src/lib/`: Utilitários puros, schemas Zod e clientes de infraestrutura.
   - `src/routes/`: Rotas TanStack Router com loaders e ações conectadas exclusivamente via BFF.
3. **Blindagem de Segurança e RLS:**
   - Toda tabela possui RLS habilitado com políticas restritivas por tenant (`store_id`, `profile_id`).
   - Views utilizam `security_invoker = true`.
   - Subconsultas escalares `(SELECT auth.uid())` para otimização de `InitPlan`.
4. **Preservação Absoluta de Produção:** Nenhuma rota existente (`workspace`, `_store`, `admin-master`) pode sofrer quebra de contrato, remoção de recurso ou regressão visual durante qualquer refatoração.

---

## 3. Roteiro Sequencial das Fases Pendentes (S23 a S48)

### Bloco D — Design System como Fonte Única (Fases S23 a S31) — IMEDIATO

#### Fase S23: Auditoria de Tokens e Consolidação na Fonte Única
- **Objetivo:** Garantir paridade 100% estrita entre `docs/design/tokens.json` (W3C DTCG), `src/styles.css` e `@theme inline` do Tailwind v4.
- **Ações:**
  1. Auditar e sincronizar as três camadas: Primitivos (`neutral`, `red`, etc.) -> Semânticos (`surface-canvas`, `text-primary`, `border-default`, `feedback-*`) -> Componente (`button-primary-bg`, `card-radius`, etc.).
  2. Implementar/atualizar `scripts/token-sync.mjs` para validar e exportar as variáveis bidirecionais.
  3. Eliminar qualquer descompasso entre tokens de design e variáveis consumidas pelos componentes canônicos.

#### Fase S24: Showcase Interno com Renderização Completa e Matriz de 4 Estados
- **Objetivo:** Criar e disponibilizar rota canônica de showcase visual (`workspace.design-system` ou catálogo unificado).
- **Ações:**
  1. Renderizar todas as famílias de primitivas visuais: Botões, Inputs, Cards, Badges, Tabelas, Dialogs, Sheets, Tabs, Selects, Switches, Checkboxes.
  2. Renderizar obrigatoriamente a **Matriz Completa de 4 Estados** para cada família:
     - **Estado 1: Dados/Pronto** (Dados tipados reais)
     - **Estado 2: Carregamento** (Skeleton espelhado com mesma dimensão)
     - **Estado 3: Vazio** (Empty state com ícone semântico, título e CTA)
     - **Estado 4: Erro** (Error state com diagnóstico e botão de reintento)
  3. Validar alvos de toque mínimos de 44px (`h-11`) para mobile e anéis de foco (`focus-visible:ring-2`).

#### Fase S25: Família Shell e Navegação
- **Objetivo:** Padronizar `Sidebar`, `AppHeader`, `BottomBar`, `GlobalRail` e `Breadcrumb` consumindo exclusivamente tokens.
- **Ações:** Bifurcação nativa entre modo compacto (<600px - barra no polegar, drawers) e expandido (>=840px - Bento/Sidebar).

#### Fase S26: Família Superfície e Dados
- **Objetivo:** Padronizar `Card`, `Surface`, `Table`, `DataGrid`, `KpiTile` e `LedgerRow`.
- **Ações:** Densidade tipográfica (`font-mono` para dados numéricos), padding modular de 4px, zero sombras decorativas em superfícies utilitárias.

#### Fase S27: Família Mídia
- **Objetivo:** Padronizar `ImageCropper`, `MediaUploader`, `Avatar`, `BannerFrame` e `Gallery`.
- **Ações:** Prevenção de CLS com `aspect-ratio` fixo, upload seguro com validação de MIME type, bucket RLS e progresso.

#### Fase S28: Família Formulário e Wizard
- **Objetivo:** Padronizar `Form`, `InputField`, `PhoneField`, `CepField`, `DocumentField`, `CurrencyField` e `StepperWizard`.
- **Ações:** Validação síncrona via schemas Zod, feedback de erro com ícone + texto, acessibilidade via `aria-describedby` e máscaras monetárias/fiscais canônicas.

#### Fase S29: Família Overlay e Matriz de 4 Estados
- **Objetivo:** Padronizar `Dialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip` e `AlertDialog`.
- **Ações:** Foco preso (`focus trap`), fechamento por `Escape`, `z-index` na escala do sistema (40/50), backdrop blur sutil.

#### Fase S30: Migração de Módulos para Primitivas com Catraca Zerando
- **Objetivo:** Substituir componentes locais duplicados em `src/components/` pelas primitivas canônicas de `src/components/ui/`.
- **Ações:** Rodar `node scripts/design-lint.mjs --ratchet` para reduzir sistematicamente violações P0 e P1 a cada módulo migrado.

#### Fase S31: Nativização Mobile, Tablet e Desktop nos 5 Viewports
- **Objetivo:** Testar e aprovar responsividade estrita nos 5 viewports canônicos: **320px** (Mobile Small), **390px** (Mobile Modern), **768px** (Tablet), **1280px** (Desktop), **1920px** (Ultra-Wide).
- **Ações:** Eliminar scroll horizontal espúrio, assegurar Hoober thumb zone no terço inferior mobile e Bento Grid no desktop.

---

### Bloco E — Telemetria Real (Fases S32 a S37)

- **S32**: Captura de erro de cliente e worker com correlação (request ID, tenant, release).
- **S33**: Extinção definitiva do buffer síncrono de 5 segundos de `error-capture.ts`.
- **S34**: Detecção de quebra silenciosa (catch vazio, promessa rejeitada solta, job assíncrono não executado).
- **S35**: Web Vitals reais por rota, dispositivo e vertical (LCP, FID/INP, CLS, TTFB gravados em métricas).
- **S36**: Contabilização sistemática de erros de negócio (falhas de pagamento, estoque esgotado, limites de plano).
- **S37**: Orçamento de erro, alerta e página de status operacional pública/interna.

---

### Bloco F — Documentação Viva, Roadmap e Suporte (Fases S38 a S43)

- **S38**: Roadmap vivo (projetado, feito, a melhorar) com prova item a item extraída do código.
- **S39**: Backlog canônico e sprints em linguagem humana (`docs/canonico/BACKLOG_UNICO.md`).
- **S40**: ADRs, runbook de operação, dicionário de domínio e guia de contribuição.
- **S41**: FAQ e base de conhecimento por vertical.
- **S42**: Changelog e catálogo de capacidades gerados do código.
- **S43**: Suporte com ticket estruturado, SLA, categoria e vínculo com cliente/vertical.

---

### Bloco G — MCP, Autovarredura e CI Bloqueante (Fases S44 a S48)

- **S44**: Registry de capacidades como fonte única (tela, permissão, tool MCP, WebMCP e docs).
- **S45**: Paridade verificada por máquina entre ação, permissão e tool.
- **S46**: Scanner de órfão, duplicado e desvinculado rodando no CI (`scripts/dead-code-detector.mjs`).
- **S47**: CI bloqueante unificado (typecheck, lint, design sem ratchet, testes, paridade, orçamentos).
- **S48**: Ciclo contínuo de autoauditoria e selo final de conclusão de Plano 5.

---

## 4. Procedimento de Execução para a IA Responsável

Quando a IA receber o comando `"leia os proximos planos"`, o seguinte procedimento deve ser seguido à risca:

1. **Leitura de Baseline:**
   - Verificar `docs/canonico/BACKLOG_UNICO.md` e `docs/canonico/ESTADO.json`.
   - Identificar a fase exata marcada como pendente no topo da fila (ex: S23).
2. **Especificação Prévia (EARS):**
   - Criar arquivo `docs/specs/SPEC-[FASE].md` descrevendo: Condição de Gatilho, Ação do Sistema, Invariantes e Critérios de Aceite.
3. **Execução Cirúrgica:**
   - Criar ou refatorar estritamente os arquivos delimitados pelo escopo da fase.
   - Proibir edições arbitrárias fora da árvore autorizada.
4. **Verificação de Quatro Etapas:**
   - `npm run typecheck` -> Exit Code 0 (0 erros de tipagem).
   - `npm run test` -> Todas as suítes verdes (0 falhas).
   - `node scripts/design-lint.mjs --ratchet` -> 0 violações P0/P1.
   - `npm run build` -> Exit Code 0 com worker e rotas gerados.
5. **Registro e Handoff:**
   - Adicionar ADR / Decisão formal em `docs/design/DECISIONS.md` (`DEC-XXX`).
   - Marcar a fase como `[x]` em `docs/canonico/BACKLOG_UNICO.md`.
   - Atualizar métricas e fase ativa em `docs/canonico/ESTADO.json`.
   - Executar commit padronizado e push para sincronização contínua.
