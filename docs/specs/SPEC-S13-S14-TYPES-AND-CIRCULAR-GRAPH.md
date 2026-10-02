# SPEC-S13-S14: Unificação de Tipos e Schemas Duplicados & Grafo Acíclico de Verticais

## 1. Metadados e Controle
- **ID:** SPEC-S13-S14
- **Título:** Unificação Canônica de Tipos/Schemas e Eliminação de Dependências Circulares entre Verticais
- **Fases do Plano 5:** S13 (Unificação de Tipos) e S14 (Grafo Acíclico de Verticais)
- **Status:** APROVADO
- **Autor:** Conselho Técnico BigTech & Arquiteto de Sistemas
- **Data:** 2026-10-02

---

## 2. Requisitos em Sintaxe EARS

### S13: Unificação de Tipos e Schemas Duplicados
- **EARS-S13-01 (Ubíquo):** O sistema deve manter uma única Fonte da Verdade (SSOT) para cada tipo ou interface de domínio em `src/types/` ou `src/lib/`, proibindo declarações duplicadas concorrentes.
- **EARS-S13-02 (Orientado a Evento):** Quando um componente, rota ou service necessitar de um tipo de entidade (como `PaymentStatus`, `ClaimStatus`, `RawVariant`, `JobPostingItem`, `NicheId`, `Role`), o sistema deve consumir a definição canônica da camada de tipos ou registros correspondentes.
- **EARS-S13-03 (Invariante):** O número de tipos exportados com nomes duplicados no inventário de código deve ser estritamente zero para as entidades mapeadas, mantendo bridges com `@deprecated` onde necessário para compatibilidade retroativa.

### S14: Grafo sem Dependência Circular entre Verticais
- **EARS-S14-01 (Ubíquo):** O grafo de importações estáticas em `src/` deve ser um Grafo Direcionado Acíclico (DAG), excetuando unicamente artefatos gerados pelo compilador de rotas (`routeTree.gen.ts`).
- **EARS-S14-02 (Orientado a Evento):** Quando uma vertical ou serviço especializado requerer orquestração cruzada, o sistema deve desacoplar funções utilitárias em módulos folha (`leaf modules`) ou abstrações puras, impedindo ciclos `A -> B -> A`.
- **EARS-S14-03 (Invariante):** A ferramenta `scripts/check-circular-deps.mjs` integrada ao CI deve finalizar com Exit Code 0 e zero ciclos reportados.

---

## 3. Matriz de Entidades e Donos Canônicos (S13)

| Entidade / Tipo | Origens Concorrentes Identificadas | Dono Canônico (SSOT) | Ação de Unificação |
| :--- | :--- | :--- | :--- |
| `PreviewViewport` | `canonical-listing-preview-frame.tsx`, `product-preview-pane.tsx` | `src/types/unified-ad-engine.ts` | Extrair para SSOT e re-exportar |
| `ItineraryDay` | `itinerary-day-editor.tsx`, `src/services/proposals.ts` | `src/types/travel-package.ts` | Importar da SSOT de turismo |
| `ViewModeType` | `discovery-control-bar.tsx`, `module-action-header.tsx` | `src/types/domain.ts` | SSOT em domain.ts |
| `FieldProps` | `components/forms/field.tsx`, `components/ui/field.tsx` | `src/components/ui/field.tsx` | Re-exportar em forms/field.tsx |
| `ContractClause` | `contract-clause-library.tsx`, `advanced-contract-templates.ts` | `src/lib/data/advanced-contract-templates.ts` | Importar de advanced-contract-templates |
| `TemplateDefinition` | `proposals/templates/index.ts`, `template-metamorphosis.ts` | `src/lib/ad-engine/template-metamorphosis.ts` | Importar de template-metamorphosis |
| `AddressData` | `ui/address-field.tsx`, `ui/cep-field.tsx` | `src/types/domain.ts` | SSOT em domain.ts |
| `SheetPageProps` | `ui/sheet-page.tsx`, `ui/sheet.tsx` | `src/components/ui/sheet.tsx` | Re-exportar em sheet-page.tsx |
| `StateTransitionRule` | `listing-state-machine.ts`, `state-machines.ts` | `src/lib/state-machines.ts` | SSOT em state-machines.ts |
| `NicheId` | `niche-packages/types.ts`, `niches/niche-manifest.ts` | `src/lib/niches/niche-manifest.ts` | Re-exportar de niche-manifest.ts |
| `Weekday`, `TimeInterval`, `DaySchedule` | `lib/business-hours.ts`, `services/store.functions.ts` | `src/lib/business-hours.ts` | Re-exportar de business-hours.ts |
| `CityRecord` | `constants/cities.ts`, `data/cities-brazil-catalog.ts` | `src/lib/constants/cities.ts` | Re-exportar de constants/cities.ts |
| `ContentStats` | `continuous-crawler.engine.ts`, `integrity-gate.ts` | `src/types/mining.ts` | SSOT em types/mining.ts |
| `FaqItem` | `cancellation-policy-registry.ts`, `omni-builder.ts` | `src/types/domain.ts` | SSOT em domain.ts |
| `IntegrationStatus` | `integration-registry.ts`, `domain.ts` | `src/types/domain.ts` | Re-exportar em registry |
| `Role` | `permission-registry.ts`, `domain.ts` | `src/registries/permission-registry.ts` | Re-exportar em domain.ts |
| `BrandKitDTO` | `brand-kit.functions.ts`, `studio.functions.ts` | `src/types/studio.ts` | SSOT em studio.ts |
| `ChannelFinancialSummaryDTO` | `finance.functions.ts`, `marketplace-hub.functions.ts` | `src/types/billing-ledger.ts` | SSOT em billing-ledger.ts |
| `DestinationReview` | `travel-catalog.functions.ts`, `destination-intelligence.ts` | `src/types/destination-intelligence.ts` | Re-exportar em functions |
| `ClaimStatus`, `ClaimCategory` | `claim-intelligence.ts`, `wms-workflows-reputation.ts` | `src/types/claim-intelligence.ts` | Re-exportar em wms |
| `PaymentStatus` | `gastronomy-pos.ts`, `orders.ts` | `src/types/orders.ts` | Re-exportar em gastronomy-pos |

---

## 4. Matriz de Ciclos e Resolução (S14)

| Ciclo | Componentes / Serviços Envolvidos | Causa Raiz | Ação Corretiva |
| :--- | :--- | :--- | :--- |
| **#1–#5** | `api-orchestrator.functions.ts` <-> `mining.functions.ts` (e subsistemas) | `api-orchestrator` importava `enrichOrInsertMinedProduct` de `mining.functions` | Extrair `enrichOrInsertMinedProduct` para `src/services/mining/mined-product-enricher.ts` (módulo folha) |
| **#6** | `careers-job-grid.tsx` <-> `careers-application-form.tsx` | `application-form` importava `JobPostingItem` de `job-grid` | Mover `JobPostingItem` para `src/types/hr.ts` |
| **#7** | `advanced-variant-editor.tsx` <-> `variant-matrix-grid.tsx` | `advanced-variant-editor` importava `RawVariant` de `variant-matrix-grid` | Mover `RawVariant` para `src/types/catalog.ts` |
| **#8, #9** | `universal-classified-showcase.tsx` <-> `classified-detail-mobile.tsx` / `desktop.tsx` | Details importavam `UniversalClassifiedShowcaseProps` do showcase | Mover `UniversalClassifiedShowcaseProps` para `src/types/unified-ad-engine.ts` |
| **#10** | `router.tsx` <-> `routeTree.gen.ts` | Geração do TanStack Router | Exceção estrutural permitida no validador |

---

## 5. Critérios de Aceite
- [ ] 0 tipos duplicados sem dono único declarado.
- [ ] 0 dependências circulares detectadas por `check-circular-deps.mjs`.
- [ ] TypeScript (`tsc --noEmit`) 0 erros.
- [ ] Vitest 153/153 arquivos aprovados.
- [ ] `check:canonical` 100% verde.
