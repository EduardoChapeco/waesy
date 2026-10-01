# SPEC-005 — Reconexão de Elos Órfãos, Unificação e Higiene Cognitiva (Ondas 2 e 3)

## 1. Metadados e Contexto
- **Data:** 2026-10-01
- **Autor:** Agente Engenheiro de Plataforma (Antigravity)
- **Status:** APROVADA
- **Escopo:** Ondas 2 e 3 do Roadmap de Melhorias (`melhoria/06-waves.md` e `melhoria/05-ledger.json`).
- **Invariantes:**
  - Zero novas violações no Design Lint (`scripts/design-lint.mjs --ratchet`).
  - Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).
  - Alvos de toque móveis >= 44px (`min-h-11`).
  - Conformidade estrita com `AGENTS.md` B.8 (proibido componentes duplicados, cores arbitrárias ou classes mágicas).

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Requisitos Ubíquos (Sempre Ativos)
- **REQ-001 (Unificação de Componentes Duplicados):** O sistema deve re-exportar primitivas canônicas únicas quando existirem duplicatas legadas (`src/components/admin/classified-form.tsx` delegando para `src/components/commerce/classified-form.tsx`).
- **REQ-002 (Preservação de Integridade de Tipos):** O sistema deve manter 100% de integridade estática de tipos sem `any` desnecessário ou bypass de compilação.
- **REQ-003 (Silêncio Visual e HIG Apple):** Toda nova integração de componente em rota deve respeitar o silêncio visual, tipografia sóbria e anéis de foco (`focus-visible`).

### 2.2 Requisitos Orientados a Eventos (When... Then...)
- **REQ-004 (Renderização de Seções de Turismo no Storefront):**
  - *When* o renderizador de experiências (`experience-renderer.tsx`) receber um bloco do tipo `travel_package_hero`, `travel_hotel_slider`, `travel_itinerary_timeline` ou o alias `tourism_itinerary_timeline`;
  - *Then* o sistema deve despachar e renderizar os respectivos componentes canônicos (`TravelPackageHero`, `TravelHotelSlider`, `TravelItineraryTimeline`).
- **REQ-005 (Leitura de Código de Barras no Estoque):**
  - *When* o operador do estoque clicar na ação "Scanner" na toolbar do estoque operacional (`workspace.estoque.index.tsx`);
  - *Then* o sistema deve abrir o `BarcodeScannerModal` e, ao capturar o código de barras, atualizar o filtro de busca instantaneamente.
- **REQ-006 (Telemetria Visual no Portal de Criadores):**
  - *When* o criador acessar seu painel de perfis em `_store.conta.criadores.tsx`;
  - *Then* o sistema deve disponibilizar o bloco analítico de links (`ProfileBiolinkAnalytics`) conectado às estatísticas de bio e links do criador.
- **REQ-007 (Acesso a Políticas e Manuais no Portal do Colaborador):**
  - *When* o colaborador selecionar a aba "Documentos" no portal `_store.conta.colaborador.tsx`;
  - *Then* o sistema deve exibir o painel `EmployeeDocumentsPanel` associado à loja e ao perfil do colaborador.
- **REQ-008 (Minuta Rápida na Gestão de Contratos):**
  - *When* o operador no workspace de contratos (`workspace.contratos.index.tsx`) acionar a ação secundária "Minuta Rápida";
  - *Then* o sistema deve abrir a gaveta de edição modular `ContractEditorSheet`, corrigindo ainda todo ruído de codificação (mojibake) presente nos rótulos de tela.

---

## 3. Matriz de Rastreabilidade de Gaps

| GAP ID | Tipo | Arquivo Alvo | Ação de Resolução |
| --- | --- | --- | --- |
| `GAP-008` | Duplicata | `src/components/admin/classified-form.tsx` | Re-exportar `ClassifiedForm` do componente canônico |
| `GAP-016` | Elos Órfãos | `src/components/commerce/experience-renderer.tsx` | Registrar `TravelHotelSlider` |
| `GAP-017` | Elos Órfãos | `src/components/commerce/experience-renderer.tsx` | Registrar `TravelItineraryTimeline` |
| `GAP-018` | Elos Órfãos | `src/components/commerce/experience-renderer.tsx` | Registrar `TravelPackageHero` |
| `GAP-036` | Elos Órfãos | `src/routes/_store.conta.colaborador.tsx` | Integrar `EmployeeDocumentsPanel` na aba Documentos |
| `GAP-042` | Elos Órfãos | `src/routes/workspace.contratos.index.tsx` | Integrar `ContractEditorSheet` e corrigir mojibake |
| `GAP-043` | Elos Órfãos | `src/routes/workspace.estoque.index.tsx` | Integrar `BarcodeScannerModal` na toolbar do catálogo |
| `GAP-075` - `GAP-181` | Arquitetura | `melhoria/05-ledger.json` | Validar encapsulamento interno de `createServerFn` e homologar |
| `GAP-182` - `GAP-232` | Falso Positivo | `melhoria/05-ledger.json` | Homologar resolução de promessas vazias conforme SPEC-004 |

---

## 4. Evidência Esperada
1. `npm run typecheck` Exit Code 0.
2. `node scripts/design-lint.mjs --ratchet` Exit Code 0.
3. Atualização integral de status em `melhoria/05-ledger.json` e `melhoria/_estado.md`.
4. Registro de decisão canônica em `docs/design/DECISIONS.md`.
