# SPEC-20261114-PASSHUB-LIVE-QUOTE-PROPOSAL-E2E

## 1. Objetivo & Escopo
Implementar de ponta a ponta (E2E) o fluxo real estilo **PassHub** de cotação multi-API, montagem estruturada de pacotes, edição visual no Studio, exportação PDF fiel e exibição pública em página web interativa com paridade bidirecional em relação ao showcase canônico `/turismo/$id`, erradicando integralmente todos os fallbacks simulados, arrays sintéticos e stubs silenciosos do pipeline de turismo.

## 2. Requisitos em Sintaxe EARS

- **REQ-01 (Unificação Zero-Trust de Credenciais GDS/Operadoras):**
  - *When* um gestor da agência configurar credenciais de **InfoTravel / Operadoras** (`infotravel`, `orinter`, `frt`, `incomum`, `cativa`, `befly`, `confianca`, `infotravel_default`) ou **Wooba Travellink GDS** (`wooba`) na aba `GDS Turismo` de `/workspace/configuracoes/integracoes`, *the system shall* cifrar os segredos via AES-256-GCM (`encryptSecret`), persistir na tabela `travel_operator_integrations` (com compatibilidade bidirecional de leitura em `integration_credentials`), expor somente status e metadados não sensíveis ao cliente e executar teste ativo de conexão contra o endpoint real da API sem falso positivo.
- **REQ-02 (Erradicação Total de Fallbacks Fakes & Dados Simulados):**
  - *While* consultar provedores externos (InfoTravel, Wooba Travellink, orquestrador multi-provider) ou gerar propostas/roteiros/cards, *the system shall not* retornar nem injetar dados simulados, frotas hardcoded (`defaultFleet` com Localiza/Movida/Unidas em `infotravel.ts`), tarifas ou nomes sintéticos em `searchWoobaBusRoutes`, `searchWoobaCars` e `createWoobaCarHold`, stubs vazios como `rexturadvance` no-op em `travel-supply-orchestrator.service.ts`, nem listas hardcoded de `includesList`/`excludesList` ou roteiros falsos de 4 dias em `studio-sidebar-editor.tsx`. Ausência de configuração, erro HTTP ou retorno vazio *shall* produzir estados honestos (Não Configurado com CTA para Integrações, Erro real do provedor ou Empty State limpo).
- **REQ-03 (Motor Unificado de Cotação PassHub Multi-Componente — Real API + Banco Real):**
  - *When* o agente informar aeroportos IATA de origem e destino (via `AirportCombobox` conectado a `searchGlobalAirports`), datas de ida e volta, composição de quartos/hóspedes com idades das crianças, e selecionar os componentes desejados (`packages`, `flights`, `hotels`, `transfers`, `activities`, `cars`) e operadoras ativas em `searchPassHubLiveQuoteFn`, *the system shall* consultar em paralelo exclusivamente as APIs reais configuradas (`InfoTravel` v1/avail + `Wooba` GDS) e opcionalmente os registros reais da agência no banco de dados (`global_hotels`, `products`, `tourism_experiences`, `group_tours`), registrar sessão, execuções por provedor e snapshots (`travel_quote_sessions`, `quote_provider_executions`, `travel_offer_snapshots`), e devolver resultados tipados com status individual por provedor e preço real.
- **REQ-04 (Montagem Completa do Pacote & Opções Comparativas em `UnifiedProposalWorkspace`, `cotacoes` e `StudioSidebarEditor`):**
  - *When* o agente montar um pacote em `UnifiedProposalWorkspace` ou editar em `StudioSidebarEditor` ou simular em `workspace.turismo.cotacoes`, *the system shall* permitir importar individualmente ou em conjunto Voos, Hotéis, Transfers, Passeios/Atividades (`tours`) e Pacotes retornados pela API ou banco real para a proposta, criar e editar múltiplas opções comparativas (`options: TravelProposalOptionDTO[]`), e persistir integralmente `flights`, `hotels`, `transfers`, `tours`, `rooms`, `options`, `includes`, `excludes`, `pricing` e `custom_fields` em `createTravelProposal` e `updateTravelProposal` sem adivinhação sintética de preço (`lead.estimated_value_cents / 2`).
- **REQ-05 (Paridade Bidirecional de Renderização: 7 Templates Studio, PDF e Web `/proposta/$token`):**
  - *When* o cliente acessar `/proposta/$token` ou exportar o PDF a partir do Studio/lista/página pública, *the system shall*:
    1. Trocar todos os componentes da opção selecionada em `_store.proposta.$token.tsx` (`flights`, `hotels`, `transfers`, `tours`, `rooms`, `itinerary`, `includes`, `excludes`, `pricing`);
    2. Capturar `#public-proposal-canvas` visível offscreen (`opacity: 1`, fora da viewport sem classes `[...]`, e normalização defensiva de `opacity` em `html2canvas-safe.ts`) garantindo PDF não em branco mesmo no modo `editorial`;
    3. Renderizar `custom_field_entries` também em `TemplateBentoGrid.tsx` e encaminhar `custom_fields`, `boarding_requirements`, `cancellation_policy` real, `gateway_logistics` e `options` via `proposalToEditorialClassified`;
    4. Impedir que `EditorialShowcaseView` invente inclusões falsas ("Aéreos", "Hospedagem inclusa", "Traslados ao aeroporto") quando a proposta não possuir voos, hotéis ou traslados reais selecionados.

## 3. Arquivos Autorizados no Escopo Atômico

### Novos Arquivos (Criação)
- `docs/specs/SPEC-20261114-PASSHUB-LIVE-QUOTE-PROPOSAL-E2E.md`
- `src/services/travel-gds-workbench.functions.ts`
- `src/components/tourism/quotes/passhub-live-quoter-panel.tsx`
- `src/services/travel-passhub-e2e.test.ts`

### Arquivos Existentes (Edição Cirúrgica via `edit_file`)
1. `src/services/infotravel.ts`
2. `src/services/travel-wooba-connector.service.ts`
3. `src/services/travel-supply-orchestrator.service.ts`
4. `src/services/travel-proposal.functions.ts`
5. `src/routes/workspace.configuracoes.integracoes.tsx`
6. `src/components/tourism/unified-proposal-workspace.tsx`
7. `src/routes/workspace.turismo.cotacoes.tsx`
8. `src/components/tourism/studio/studio-sidebar-editor.tsx`
9. `src/components/tourism/studio/proposal-canvas-renderer.tsx`
10. `src/components/tourism/proposals/templates/TemplateBentoGrid.tsx`
11. `src/lib/canvas/html2canvas-safe.ts`
12. `src/routes/_store.proposta.$token.tsx`
13. `src/lib/tourism/proposal-editorial-mapper.ts`
14. `src/components/classifieds/editorial-showcase-view.tsx`
15. `docs/design/DECISIONS.md`

## 4. Invariantes & Restrições de Segurança / Design
- **Zero Circular Imports (`check-circular-deps.mjs`):** `travel-gds-workbench.functions.ts` é folha de orquestração BFF que importa conectores (`infotravel`, `travel-wooba-connector.service`, `travel-supply-orchestrator.service`), nunca sendo importada de volta por eles. `travel-supply-orchestrator.service.ts` lê `integration_credentials` diretamente do Supabase quando precisar mesclar credenciais legadas, evitando ciclo com `integrations.functions.ts`.
- **Contratos BFF (`check-bff-table-contracts.mjs`):** Todas as queries `.from(...)` em `src/services/*.functions.ts` usam estritamente tabelas declaradas em `supabase/migrations/`.
- **Design System (`DESIGN-LINT.md`):** Tokens semânticos (`bg-card`, `text-foreground`, `border-border`, etc.), grade de 4px, toque mínimo `h-11` no mobile, foco teclado `:focus-visible`, zero `Sparkles`, zero Containeritis (card-dentro-de-card), zero classes arbitrárias `[...]`, zero `!important`, zero truncamento que corte nomes/valores essenciais.
- **Anti-Fake (`AGENTS.md` B.8 / B.33):** Qualquer item sem dado real deve mostrar estado vazio/erro/não-configurado explícito.

## 5. Critérios de Aceitação & Gates de Verificação
- Testes Vitest de regressão reproduzem e validam todos os invariantes E2E (`travel-passhub-e2e.test.ts` + suítes de turismo correlatas).
- `npm run typecheck` -> Exit 0.
- `npm run build` -> Exit 0.
- `node scripts/lint-target.mjs <arquivos-alterados>` -> 0 violações P0/P1 nos blocos modificados/criados.
- `npm run lint:design` (`node scripts/design-lint.mjs --ratchet && node scripts/contrast-audit.mjs`) -> Exit 0.
- `npm run check:bff` & `npm run check:cycles` -> Exit 0.
