# SPEC-TOURISM-E2E-SYNC-CLOSURE — Segurança, Conversão, Contratos, Financeiro e Edição Pós-Venda E2E

Status: APROVADA PARA EXECUÇÃO ATOMICA (Fases F1–F6)
Data: 2026-11-16
Base: Audit Mestre End-to-End Waesy Turismo & Contratos

## 1. Consenso do Conselho Executivo (BigTech Board & Integrador)
1. **CISO / Staff Security & Data Engineer:** Fechar imediatamente exposições P0 em `travel_trip_official_documents` (RLS cross-tenant), `getTravelerTripPortalDossier` (IDOR sem autenticação), `getTravelContractById`, `deleteTravelContract`, `saveTripFinancialDetails` e `submitAndAutoMatchCustomerReceiptFn`.
2. **Chief Software Architect:** Eliminar escritas sobrescritoras pós-RPC em `convertProposalToTrip`, propagar `lead_id` e `customer_id` para `tourism_trips`, unificar leitura/escrita contratual em `contracts` + `contract_versions` + `signature_envelopes` sem destruir status nem quebrar tokens públicos, e integrar `group_tour_enrollments`/excursões no dossiê do cliente.
3. **Principal Design Ops & Full-Stack Lead:** Tornar 100% editáveis pós-venda em `workspace.turismo.viagens.$id.tsx` os blocos da viagem (voos, hotéis, transfers, passeios, roteiro dia-a-dia, datas, inclusões/exclusões e upload real de Documentos Oficiais) com propagação automática ao voucher e Portal do Viajante, eliminando fallbacks sintéticos (`HT-`, `TR-`, `CONFIRMED`, `inst-single`) e uploads efêmeros em RAM (`URL.createObjectURL`), além de ativar o Álbum Coletivo do grupo via Storage.

## 2. Requisitos Normativos (Sintaxe EARS)

### Fase 1 — Segurança P0 (RLS, IDOR e Barreiras BFF)
- **[EARS-1.1]** WHEN qualquer usuário autenticado consultar `travel_trip_official_documents`, o Postgres SHALL permitir `SELECT` apenas se `is_store_staff(store_id)` OR (`is_visible_to_client = true` AND o usuário for o titular da viagem `tourism_trips.customer_id/client_id = auth.uid()` ou constar por e-mail/CPF em `trip_passengers` vinculado à viagem), e SHALL permitir `INSERT/UPDATE/DELETE` exclusivamente para `is_store_staff(store_id)`.
- **[EARS-1.2]** WHEN `getTravelerTripPortalDossier` for invocado, o BFF SHALL autenticar a sessão (`getServerIdentity`), verificar posse como staff da loja (`store_id`) OR titular/passageiro da viagem (por `customer_id`, `client_id`, `client_email`, `client_document`/`cpf`, telefone ou registro em `trip_passengers`), e SHALL rejeitar anônimos ou terceiros sem vínculo.
- **[EARS-1.3]** WHEN `getTravelContractById`, `deleteTravelContract` ou `saveTripFinancialDetails` forem invocados, o BFF SHALL exigir `requireStaff()`, validar `store_id` do registro contra `identity.store_id` (salvo `platform_admin` explícito onde aplicável em listagem master), e SHALL retornar erro explícito em tentativa cross-tenant.

### Fase 2 — Conversão Atômica e Vínculo Unificado
- **[EARS-2.1]** WHEN `convert_accepted_travel_proposal_staff` converter uma proposta aprovada, a RPC SHALL preencher `tourism_trips.lead_id` e `tourism_trips.customer_id` (resolvendo a partir de `travel_proposals.lead_id`/`customer_id` ou conciliação segura da loja) e SHALL preservar o status inicial do contrato gerado em `'signing'` (em vez de rebaixar para `'draft'`), garantindo acesso imediato em `/contrato/$token`.
- **[EARS-2.2]** WHEN `convertProposalToTrip` concluir a RPC no BFF, o sistema SHALL NOT sobrescrever `itinerary`, `rooms`, `includes`, `excludes` ou `financial_details` com campos do nível raiz da proposta quando a opção selecionada (`accepted_option_id`) definiu valores próprios; e o toast em `workspace.turismo.propostas.$id.tsx` SHALL reportar apenas o que foi realmente criado.
- **[EARS-2.3]** WHEN `listCustomerAgencyTrips`, `listCustomerTravelDossierFn`, `getCustomer360Profile` ou `listUserEnvelopesAndContracts` consultarem viagens e contratos do cliente/lead, as queries SHALL selecionar `source_proposal_id` e consolidar registros canônicos de `contracts` (`category = 'tourism'`) em conjunto com registros legados de `travel_contracts`, além de refletir reservas diretas de excursões confirmadas em `/conta/viagens` via vínculo real em `group_tour_enrollments` / `group_tour_passenger_tokens` ou `tourism_trips`.

### Fase 3 — Contratos Unificados, Multi-Pagador e Documentos Oficiais
- **[EARS-3.1]** WHEN `sign_public_travel_contract` concluir a assinatura pública por token, a RPC SHALL selar `contract_versions`, marcar `contracts.status = 'completed'`, reconciliar `signature_envelopes.signer_profile_id` quando existir usuário com o mesmo CPF/e-mail, espelhar `tourism_trips` (`notes`/evento de assinatura) e registrar automaticamente um documento `'signed_contract'` em `travel_trip_official_documents`.
- **[EARS-3.2]** WHEN `workspace.turismo.viagens.$id.tsx` exibir o status do contrato, a UI SHALL reconhecer tanto `'signed'` quanto `'completed'` como contrato assinado; e URLs geradas por `generateTravelReservationCheckout` SHALL apontar para a rota funcional correspondente ao tipo de token emitido (`/contrato/$token` para `contracts.verification_code` ou `/assinar/$token` quando houver `signature_envelopes.signing_token`).
- **[EARS-3.3]** WHEN `signContractAsMultiPayer` processar assinatura de pagador múltiplo, o serviço SHALL resolver a viagem na tabela canônica `tourism_trips` (nunca `travel_trips`), buscar por `id`/`source_proposal_id`, propagar boletos para `travel_trip_installment_boletos` e lançar falhas reais explicitamente sem `catch {}` mudo.
- **[EARS-3.4]** WHEN a equipe enviar ou importar documentos oficiais na viagem (`workspace.turismo.viagens.$id.tsx`), o BFF (`addTripOfficialDocument` / `apply_operator_voucher_atomic`) SHALL persistir em `travel_trip_official_documents` com upload em bucket privado (`legal-documents`) ou URL assinada válida, tornando-os visíveis ao cliente no Portal da Viagem.

### Fase 4 — Sincronização Financeira Unificada & Eliminação de Dados Sintéticos
- **[EARS-4.1]** WHEN `saveTripFinancialDetails` salvar condições financeiras e parcelas (OCR de carnê ou entrada manual), o BFF SHALL sincronizar atomicamente todas as parcelas em `travel_trip_installment_boletos` (upsert por `(trip_id, installment_number)`) e atualizar `tourism_trips.financial_details` no mesmo escopo de tenant; adicionalmente SHALL permitir espelho opcional/vinculado em `receivables` quando houver usuário titular vinculado para exibição em `/conta/carnes`.
- **[EARS-4.2]** WHEN o cliente enviar comprovante de pagamento em `viajante.viagem.$id.tsx`, a UI SHALL realizar upload persistente no bucket `payment-proofs` via BFF e invocar `submitAndAutoMatchCustomerReceiptFn` com validação de posse da viagem no servidor, eliminando `URL.createObjectURL` em memória e removendo `catch {}` mudos.
- **[EARS-4.3]** IF voos, hotéis, transfers ou boletos não tiverem localizador PNR, confirmação de fornecedor, documento oficial ou parcelas cadastradas, THEN `viajante.viagem.$id.tsx` SHALL exibir estado pendente/vazio honesto (B.8 / B.33), sendo proibido gerar códigos fictícios (`HT-...`, `TR-...`, `"CONFIRMED"`, `inst-single` marcado como `"reconciled"`).
- **[EARS-4.4]** O legado órfão `travel-installments.functions.ts` (`travel_booking_installments`) SHALL ser marcado/redirecionado ou removido caso sem consumidores ativos na UI.

### Fase 5 — Edição Pós-Venda Completa na Viagem & Álbum Coletivo Real
- **[EARS-5.1]** WHEN a equipe editar composição da viagem em `workspace.turismo.viagens.$id.tsx` (título, datas, voos, hotéis, transfers, passeios, inclusões, exclusões, observações e roteiro dia-a-dia), a nova Server Function `updateTripOperationalStructure` SHALL persistir em `tourism_trips` com `requireStaff()` + checagem de `store_id` e sincronizar o `tourism_vouchers` principal da viagem (mantendo localizadores existentes), refletindo imediatamente em `viajante.viagem.$id.tsx` e `/voucher/$token`.
- **[EARS-5.2]** WHEN o cliente enviar foto ou vídeo no `Álbum Coletivo de Memórias` (aba `grupo` de `viajante.viagem.$id.tsx`), uma Server Function autenticada (`addTripGroupMemoryMedia`) SHALL validar vínculo do viajante com a viagem, subir via bucket autorizado e persistir em `tourism_trips.portal_content.group_album` com sobrevivência após reload.

### Fase 6 — Consolidação Final & Verificação E2E
- **[EARS-6.1]** Consolidar `src/services/proposals.ts` e `normalize`/verificação de contratos Zod (`B.25`), validar `vitest`, `design-lint --ratchet`, `check:bff`, `check:schema`, `check:types-ssot`, revisão adversarial por subagentes e verificação real no browser (`desktop` e `mobile`) com relatório transparente do estado de build/SSR pré-existente.

## 3. Paths Autorizados no Escopo
- `supabase/migrations/20270530000000_tourism_e2e_rls_contracts_boletos_sync.sql`
- `src/services/travel-lifecycle.functions.ts`
- `src/services/travel-contract.functions.ts`
- `src/services/travel-continuous-flow.functions.ts`
- `src/services/travel-ecosystem-engines.functions.ts`
- `src/services/travel-installments.functions.ts`
- `src/services/contracts.functions.ts`
- `src/services/crm.functions.ts`
- `src/services/group-tours.functions.ts`
- `src/services/storage.functions.ts`
- `src/routes/workspace.turismo.propostas.$id.tsx`
- `src/routes/workspace.turismo.viagens.$id.tsx`
- `src/routes/viajante.viagem.$id.tsx`
- `src/routes/_store.conta.viagens.tsx`
- `src/routes/_store.conta.contratos.tsx`
- Testes de regressão em `src/services/*.test.ts`
- `docs/design/DECISIONS.md`
