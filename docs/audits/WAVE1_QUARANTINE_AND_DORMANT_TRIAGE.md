# ONDA 1 — Matriz Completa de Absorção de `legacy_quarantine/` (106 -> 62 -> 0) & Proteção de Dormentes

## 1. Purga Segura Realizada em W1.A (`44` arquivos 100% absorvidos no ativo)

| Pasta / Submódulo | Arquivos Purgados (100% Cobertos em `src/`) | Dono Canônico Verificado em `src/` |
|---|---|---|
| `classificados/ads/*` (8) | `AdCard`, `CategoryCard`, `EventCard`, `FilterPills`, `JobCard`, `MobilityDriverCard`, `ServiceCard`, `SmartAdCard` | `classified-item-card.tsx`, `universal-niche-card.tsx`, `vitrine-commerce-rails.tsx`, `classified-filter-sheet.tsx`, `careers-job-grid.tsx`, `event-classified-showcase-view.tsx` |
| `classificados/business-wizard/*` (4) | `BusinessModeStep`, `CompanyDataStep`, `OperationalStep`, `SemanticPreviewStep` | `fast-company-onboarding.tsx`, `delivery-time-and-radius-matrix.tsx`, `_store.criar-negocio*.tsx`, `niche-semantics` |
| `classificados/logistics/*` (7) | `logistics-data`, `DashboardSection`, `FinancialSection`, `ProfessionalsSection`, `RequestsSection`, `ReviewsSection`, `VehicleModal` | `fleet.functions.ts`, `shipping.functions.ts`, `dispatch.functions.ts`, `waesy-go.functions.ts`, `workspace.pedidos.{frota,expedicao,entregadores.*}.tsx` |
| `classificados/store-wizard/*` (5) | `IdentityStep`, `PublishStep`, `StoreTypeStep`, `types`, `WizardProgress` | `fast-company-onboarding.tsx`, `_store.conta.lojas.nova.tsx`, `workspace.onboarding.revisao.tsx` |
| `restaurante/*` (3) | `GarcomApp`, `kds/index`, `kds/KDSOrderCard` | `_store.garcom.tsx`, `quick-waiter-order-modal.tsx`, `src/components/pos/kds-order-card.tsx`, `pdv.functions.ts` |
| `tourism_boarding/` (1) | `Column.tsx` | `workspace.turismo.embarques.tsx` |
| `tourism_crm/*` (5) | `CrmFilterBar`, `CrmKanbanBoard`, `LeadCard`, `LeadAccessibilityCard`, `LeadInterestCard` | `workspace.turismo.index.tsx`, `src/components/tourism/crm/LeadCard.tsx`, `TourismPipeCardDossier.tsx` |
| `tourism_proposals/` (1) | `OcrButton.tsx` | `multimodal-ocr-uploader.tsx`, `travel-operator-ocr.functions.ts` |
| `tourism_services/*` (4) | `proposal-storage`, `quotes-learning`, `tours`, `vouchers` | `storage.functions.ts`, `unsplash.functions.ts`, `travel-commercial-intelligence.functions.ts`, `group-tours.functions.ts`, `travel-vouchers.functions.ts` |
| `tourism_trips/*` (6) | `NewPassengerSheet`, `NewTripWizard`, `ContractEditor`, `ContractSidebar`, `FinancialKpis`, `InstallmentTable` | `workspace.turismo.viagens.$id.tsx`, `new-trip-sheet.tsx`, `contract-workspace-studio.tsx`, `travel-lifecycle.functions.ts`, `travel-installments.functions.ts` |

---

## 2. Itens em Quarentena Preservados para Extração & Nativização (`62` arquivos)

### Prioridade P0 — Backend Órfão / RPCs Únicas / Segurança / Fluxos Críticos
1. **`reaccommodation.ts`** (`src/services/travel-reaccommodation.functions.ts`): `createFlightAlternative`, `updateAlternativeSettings`, `analyzeFlightDifferences`, `upsertDifferenceAnalysis`, `saveCustomerDecision`, `createOperatorRequest`, `updateOperatorRequest`, `resolveChangeCase`.
2. **`flight-reconciliation.ts`** (`src/lib/tourism/flight-connections.ts` + `src/services/travel-flights.functions.ts`): `compareItineraries`, `setItineraryActive`.
3. **`rooming.ts` + `RoomingList.tsx`** (`src/services/group-tours.functions.ts` + `travel-departures.functions.ts` + `CardDetailPanel.tsx`): RPC `update_rooming_list_versioned` e `boarding_rooming_list` por `card_id` com `meal_plan`.
4. **`visas.ts`** (`src/services/travel-visas.functions.ts`): `visa_stages`, `seed_default_visa_stages`, `persist_visa_move`.
5. **`clients.ts` + `crm.ts`** (`src/services/crm.functions.ts`): `mergeClients` (`merge_clients`), `updateLeadActivity`, `deleteLeadActivity`, `transferLead`, `saveStageUpdates`, `moveLeadsToStage`, `fetchArchivedLeads`, `restoreLead`, `deleteLeadPermanently`, `syncMeetingToGoogleCalendar`.
6. **`trips.ts` + `ContractAddendums.tsx` + `CommissionSection.tsx` + `AddRecordSheet.tsx` + `RecordTable.tsx` + `PlanForm.tsx` + `ContractSignatureControl.tsx`**: RPCs `record_financial_cash_flow`, `create_payment_plan_rpc` (`is_third_party`), UI para `createContractAddendum`, UI para `trip_commissions` (`commission.functions.ts`), `CONTRACT_READ` e badges KYC.
7. **`boarding.ts` + `CardDetailPanel.tsx` + `NewCard.tsx` + `CardView.tsx`**: `persist_boarding_card_move`, `auto_dispatch_enabled`, `boarding_tickets`, `boarding_card_activities`, `hotel_address`/`guide_name`/`emergency_phone`.
8. **`LeadDetailDrawer.tsx` + `AIHunterPanel.tsx` + `OmnichannelChat.tsx` + `LeadTimeline.tsx` + `LeadForm.tsx`**: quiz de estagnação (`updateLeadStaleness`), `lead_insights`, WhatsApp inline no dossiê CRM, edição de notas, regra IATA idades.
9. **`quotes.ts` + `proposals.ts` + `ExportPdfButton.tsx` + `MagicAIAssistant.tsx` + `NewProposalSheet.tsx` + `ProposalHistorySheet.tsx`**: `package_candidates`, `reject_package_candidate_rpc`, `quote_snapshots`, `proposal_history` (IP/UA), `exportServerPdf` (`generate-proposal-pdf`).
10. **`OSMesasPage.tsx` + `OSKDSStations.tsx` + `OSKDSDashboard.tsx` + `KDSMetricsBar.tsx`**: CRUD individual `restaurant_tables` (`saveRestaurantTable`/`deleteRestaurantTable`), UI de `listKdsStations`/`saveKdsStation`/`deleteKdsStation` e bumping por item KDS.
11. **`BarcodeScanner.tsx` (`useUSBScanner`) + `ScannerConfigPanel.tsx`** + **`NewCorporateRfpWizard.tsx`** (`corporate_rfps`).

### Prioridade P1 — Inteligência Vertical & Comercial (`ad-detail`, `addons`, `combos`, `logistics`, `news`, `pos`, `presentations`, `promotions`, `restaurant`, `service-wizard`, `store-wizard`)
- `PropertyAdDetail.tsx` (juros compostos & soma Aluguel+Condomínio+IPTU), `AutoAdDetail.tsx` (`price_history` & `documentacao`/`avaliacao`), `PetAdDetail.tsx` (`vacinas` & triagem adoção), `JobAdDetail.tsx` (`processo_seletivo`), `ServiceAdDetail.tsx` + `ServiceWizard.tsx` (pacotes comparativos, `beforeAfter`, deslocamento/região, buffers/reagendamento, ordem de serviço automática).
- `AddonGroupEditor.tsx` + `ProductDetailModal.tsx` (modo `"pizza"` sabores fracionados + `"quantity"` por item), `ComboWizard.tsx` (`product_combos` com substitutos + `auto_pause`), `PromotionWizard.tsx` (PIX/meio pagto, brinde, pontos com expiração, cupom por CPF em lote).
- `POSSalesTerminal.tsx` + `POSSessionPanel.tsx` + `POSDeliveryMode.tsx` (venda suspensa, balança/kg, vale funcionário, conciliação repasse motoboy), `ComandasTab`/`ConfigTab`/`KitchenTab`/`ReservationsTab`/`TablesTab` (divisão de conta por item/cliente, Couvert Artístico, marcas Ghost Kitchen, setores/elementos de planta 2D).
- `PortalConfigTab.tsx` (curadoria periódica de portal de notícias), `SlideEditor.tsx` (editor XY livre), `FleetSection`/`RoutesSection`/`DeliveryAreaSection`/`SettingsSection` (manutenção/odômetro, rotas fixas recorrentes, desenho de área mapa, regras de frete pesado), `LocationStep`/`OperationsStep` (multi-filial na criação & bandeiras VR/VA).

---

## 3. Triagem dos `211` Módulos Dormentes (`src/`) — Regra Anti-Exclusão Cega

- **`src/components/ad-engine/*` (15) + `src/lib/ad-engine/*` (8):** MANTER E INTEGRAR na Onda 3.1 (possui Reforma Tributária 2026, quick/full editor e preview canônico; hoje desconectado enquanto `_store.conta.classificados.novo.tsx` tem 11.791 LOC).
- **`src/services/*.functions.ts` dormentes (`38` módulos reais):** MANTER E CONECTAR (`travel-financial.functions.ts` tem única chamada a `record_travel_sale_payment` -> fundir em `travel-financials.functions.ts`; `chat-commerce`, `travel-continuous-flow`, `cash-safes`, `match-time`, `fulfillment`, `marketplace-checkout`, `geo-search`, `hotel-mining`, `travel-reviews`, `travel-credit-vault`, `tourism-operations`, `claim`, `token-quota`, `marketing-engagement`, `travel-commission`, `atomic-reservations`, `installments`, etc.).
- **Hooks CRM Turismo (`use-lead-detail.ts` + 4 sub-hooks):** MANTER E RECONECTAR ao `TourismPipeCardDossier.tsx` (inclui `updateLeadStaleness`).
- **`src/components/admin/builder/*` (8 arquivos):** 6 100% substituídos por `OmniEditor`/`BuilderAddPanel3Col` (candidatos seguros à purga em W2); 2 (`builder-inspector.tsx` + `ArrayBuilder.tsx`) exigem extração prévia do toolbar Markdown, filtro `CANONICAL_CITIES` e variantes de superfície antes da purga em W2.
- **`src/services/` realmente mortos/wrappers (`7` alvos W2 após merge de `recordTravelSalePayment`):** `ai.functions.ts`, `ai-pool.ts`, `financial.functions.ts`, `ai-builder-generator.ts`, `builder-exporter.ts`, `proposal-storage.ts`, `lib/engines/module-auditor.ts`.
