# AUDITORIA SISTÊMICA GERAL — PLANOS MESTRES VS. REALIDADE DO SISTEMA
**Data de Emissão:** 02/10/2026  
**Documento Fonte Analisado:** `Untitled-12` (Backup: `C:\Users\Excelência Tour SMO\AppData\Roaming\Antigravity IDE\Backups\1742bfe273db18b9a4c3b06faf122751\untitled\-73e72b60` / Persistido em: `docs/audit/REVISAO_DOC_COMPLETO_02102026.md`)  
**Órgão de Auditoria:** BigTech Executive Board & Red Team Operacional  
**Status do Monorepo:** 3.349 arquivos | 387 rotas | 352 serviços | 422 migrations | 37.710 violações no Design Lint  

---

## 1. Inventário e Anatomia do Documento `Untitled-12`

O documento aberto e não salvo identificado como `Untitled-12` (164.036 bytes) é o compêndio consolidado da constituição técnica, metodológica e operacional da plataforma Waesy. Ele reúne formalmente os **5 Grandes Planos da Plataforma**:

| Plano | Nome Canônico | Extensão / Escopo | Objetivo Central |
| :--- | :--- | :--- | :--- |
| **Plano 1** | **Protocolo Base & Cirurgia (P01–P78)** | 78 Fases (Fases 0 a 8) | Fundação, UI Nativa Apple/Stripe, eliminação de mocks e hardcodes, metamorfose de nichos, transplante de repositórios, fluxo Turismo E2E, MCP e blindagem. |
| **Plano 2** | **Motor de Anúncios e Vitrine (A01–A48)** | 48 Fases | Classificados unificados, preview em tempo real de anúncios, empty states honestos, checkout transacional e paridade entre loja e cliente. |
| **Plano 3** | **Motor de Ofertas, Nichos e Estoque (O01–O72)** | 72 Fases | Pacotes de nicho para 6 verticais, content blocks dinâmicos, motor de preços dinâmicos, paridade workspace, design system e ledger de estoque. |
| **Plano 4** | **Operação Verdade Única (R01–R64)** | 64 Fases (10 Blocos) | Reconciliação de prompts, auditoria do lint engolido, desmanche de monólitos de rota, eliminação de duplicação de campos, RLS e governança. |
| **Plano 5** | **Estrutura, Escala e BigTech (S01–S48)** | 48 Fases (7 Blocos A–G) | Re-baseline, divisão em 6 camadas estritas, rotas finas (<300 linhas), design system como fonte única com showcase, telemetria real e CI bloqueante. |

---

## 2. Auditoria da Realidade: O Que Foi Executado vs. O Que Falta

A auditoria direta sobre a árvore de código ativa (`src/`, `scripts/`, `supabase/migrations/`) produziu o seguinte confronto determinístico entre a intenção dos planos e a realidade do produto:

### 2.1. O Que Foi Efetivamente Construído e Homologado (Com Prova de Código)
1. **Design System Canônico (Plano 5 Bloco D & Plano 3):**
   - 13 arquivos de primitivas em `src/components/ui/canonical/`: `CanonicalPage`, `CanonicalShell`, `CanonicalSection`, `CanonicalStack`, `CanonicalGrid`, `CanonicalToolbar`, `CanonicalRail`, `CanonicalSplit`, `CanonicalField`, `AdaptiveModal`, `DenseDataGrid`, `CanonicalBottomBar`, `CanonicalSurface`, `CanonicalKpiTile`, `CanonicalLedgerRow`, `CanonicalDataTable`, `CanonicalMediaFrame`, `CanonicalAvatarCluster`, `CanonicalUploadDropzone`, `CanonicalStepperWizard`, `CanonicalDrawer`, `CanonicalConfirmDialog`, `AdaptiveViewportContainer`, `CanonicalBentoGrid`, `CanonicalHooberThumbZone`.
   - Showcase interno em `src/routes/workspace.design-system.tsx` e `src/components/design-system/` com 11 famílias e visualização nas 4 matrizes de estado (Ready, Loading Skeleton, Empty, Error) e 5 viewports (320px, 390px, 768px, 1280px, 1920px).
2. **Motor de Nichos e Conteúdo (Plano 3):**
   - 11 módulos de nicho em `src/lib/ad-engine/niche-packages/` cobrindo Turismo, Imóveis, Veículos, Varejo, Mercado, Serviços e Produtos Digitais.
   - 5 módulos de blocos dinâmicos em `src/lib/ad-engine/content-blocks/` com tipagem, sanitização e renderizadores universais.
3. **Governança Arquitetural (Plano 5 Bloco B):**
   - `src/lib/architecture/layer-contract.ts` e `vertical-manifest.ts` com regras de importação entre camadas.
   - `scripts/dead-code-detector.mjs`, `scripts/naming-convention-validator.mjs`, `scripts/check-circular-deps.mjs`.
4. **Catraca de Design Lint (DL-01 a DL-30):**
   - Baseline congelada rebaixada de 38.314 para 37.710 violações (-604 violações purgadas nos componentes migrados).
   - Zero regressões permitidas via flag `--ratchet`.

---

### 2.2. O Que Falta Executar ou Permanece com Débito Grave (Gaps Críticos)

| Área / Requisito | Meta do Plano | Realidade Atual no Código | Severidade |
| :--- | :--- | :--- | :--- |
| **Monólitos de Rota (S09 / R03 / E2)** | Nenhuma rota > 300 linhas; rota apenas monta tela e delega. | **151 rotas acima de 500 linhas**. Casos extremos: `_store.conta.classificados.novo.tsx` (9.286 linhas), `_store.membro.$id.tsx` (3.790 linhas), `workspace.orcamentos.novo.tsx` (2.232 linhas), `_store.checkout.tsx` (2.195 linhas). | **P0 (Crítico)** |
| **BFF e Serviços na Raiz (S08 / E3)** | Migrar para `src/server/<dominio>/` com casos de uso desacoplados. | **352 arquivos em `src/services/`**, a maioria solta na raiz com terminação `.functions.ts` misturando UI, transporte e queries. | **P1 (Alto)** |
| **Telemetria Real vs Buffer Legado (S32–S37 / Bloco E)** | Captura de erro correlacionada (`requestId`, `tenantId`, release), captura de quebras silenciosas e Web Vitals reais. | O buffer de 5 segundos de `error-capture.ts` foi desarmado, mas **ainda não existe pipeline de telemetria com correlação e agregação por vertical**. | **P1 (Alto)** |
| **Débito Visual Acumulado (DL-01 a DL-30)** | 0 violações de design e migração integral para primitivas canônicas. | **37.710 violações ativas** no repositório (7.194 P0, 17.917 P1, 11.128 P2). As telas antigas continuam com cores literais e classes arbitrárias. | **P1 (Alto)** |
| **Diretórios Paralelos Soltos (S04 / B9)** | Destino definitivo e saneamento com dono e prazo. | **6 diretórios paralelos ativos**: `auditoria/` (10 itens), `ia/` (48 itens), `melhoria/` (11 itens), `reparo/` (6 itens), `legacy_quarantine/` (8 itens), `scratch/` (8 itens). | **P2 (Médio)** |
| **CI Bloqueante Ausente (S47 / B5)** | Pipeline de CI automatizado bloqueando PRs que violem typecheck, lint ou orçamentos. | **Não existe diretório `.github/workflows/`**. O CI não roda em nuvem. | **P1 (Alto)** |

---

## 3. Matriz de Confronto dos 5 Planos

```
[PLANO 1: PROTOCOLO BASE] ─── 78/78 Fases ───> Base conceituada, mas com remanescentes de monólitos.
[PLANO 2: ANÚNCIOS/VITRINE] ── 48/48 Fases ───> Primitivas de preview criadas; formulário novo ainda tem 9k linhas.
[PLANO 3: OFERTAS & NICHOS] ── 72/72 Fases ───> 100% Homologado em src/lib/ad-engine/.
[PLANO 4: OPERAÇÃO VERDADE] ── 64/64 Fases ───> Migrações e reconciliação feitas; monólitos continuam abertos.
[PLANO 5: BIGTECH ESCALA] ──── 30/48 Fases ───> Fases S01 a S30 concluídas. S31 em validação. S32 a S48 na fila.
```

---

## 4. Plano Diretor de Ação: Execução em Multi-Frentes

Conforme a diretiva do documento `Untitled-12`, os planos lineares sequenciais são temporariamente reorganizados para atacar os **3 Grandes Eixos de Fechamento**:

### Frente 1: Desmanche Cirúrgico dos 10 Maiores Monólitos de Rota
- **Alvo:** Reduzir as rotas monólitos de 9.000+ linhas para < 300 linhas, extraindo componentes para `src/components/<dominio>/` e lógica para `src/server/`.
- **Top 5 Prioritários:**
  1. `src/routes/_store.conta.classificados.novo.tsx` (9.286 linhas -> modularizar em steps e seções)
  2. `src/routes/_store.membro.$id.tsx` (3.790 linhas -> modularizar)
  3. `src/routes/workspace.orcamentos.novo.tsx` (2.232 linhas -> migrar para `CanonicalStepperWizard`)
  4. `src/routes/_store.checkout.tsx` (2.195 linhas -> modularizar etapas de frete, pagamento, revisão)
  5. `src/routes/workspace.turismo.viagens.$id.tsx` (2.077 linhas -> modularizar abas)

### Frente 2: Telemetria Real, Observabilidade e Fim do Silêncio (Bloco E / S32–S37)
- **Alvo:** Implementar cliente de telemetria unificado com correlação (`traceId`, `tenantId`, `userId`, `routeId`).
- Captura de quebras silenciosas (unhandled rejections, catches vazios).
- Monitoramento de Web Vitals (LCP, FID/INP, CLS, TTFB) por rota e viewport.

### Frente 3: Governança, CI Bloqueante e Limpeza de Diretórios Paralelos (Bloco G / S44–S48)
- Criar `.github/workflows/ci.yml` bloqueante com 5 etapas estritas: Typecheck, Design Lint Ratchet, Vitest, Paridade de Contratos e Verificação de Órfãos.
- Arquivar ou migrar arquivos úteis de `auditoria/`, `ia/`, `melhoria/`, `reparo/` para `docs/` canônico e expurgar artefatos mortos.
