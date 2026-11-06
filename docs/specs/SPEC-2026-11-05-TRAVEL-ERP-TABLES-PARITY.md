# SPEC-2026-11-05-TRAVEL-ERP-TABLES-PARITY — Tabelas ERP de Comissões, Operadoras, Cancelamento Inteligente e Paridade Ponta a Ponta do Turismo

## 1. Contexto e Objetivo
Eliminar qualquer dependência de `localStorage` isolado, textos fixos de operadoras/cancelamento, comissões expostas para edição sem permissão de gestor, aeroportos/datas estáticos e lacunas de paridade entre o Criador de Pacotes, InfoTravel, Construtor Unificado de Propostas, Proposal Studio e Portal Minha Viagem.

## 2. Requisitos Estruturados (Sintaxe EARS)
- **REQ-01 (Tabelas Relacionais e RLS por Papel):** QUANDO uma agência configurar regras comerciais de operadoras, perfis de comissionamento de agentes, planilha de vendas ou políticas de cancelamento/contrato, O SISTEMA DEVE persistir os registros nas tabelas relacionais `agency_operator_rules`, `agency_agent_commission_profiles`, `agency_sales_commission_ledger` e `agency_contract_cancellation_policies` com políticas RLS que permitam leitura (`SELECT`) aos membros da agência e restrinjam mutações (`INSERT`/`UPDATE`/`DELETE`) de regras/perfis exclusivamente a gestores (`owner`, `admin`, `manager`).
- **REQ-02 (Governança de Comissão por Papel no Construtor de Propostas):** ENQUANTO o usuário autenticado possuir papel de agente/consultor (`staff`/`agent`) sem permissão de override, O SISTEMA DEVE exibir a comissão da agência e a comissão estimada do vendedor em modo somente leitura (bloqueado com cadeado) no `UnifiedProposalWorkspace` e no `InlineSalesSpreadsheetAndGoalsPanel`, permitindo edição apenas para `owner`, `admin` ou `manager`.
- **REQ-03 (WhatsApp Real no Concierge Corporativo e Vitrine de Turismo):** QUANDO a rota `/_store/turismo` for carregada, O SISTEMA DEVE resolver o telefone/WhatsApp real da agência a partir do banco de dados (`stores.whatsapp` / `stores.phone` / `surfaceExperience`) e repassá-lo ao `CorporateVollConciergeView`.
- **REQ-04 (Motor Configurável de Operadoras e Cláusulas de Cancelamento):** QUANDO o sistema calcular orientações de pagamento ou simular multas de cancelamento/crédito em `travel-ecosystem-engines.functions.ts` e `travel-pre-boarding-and-commissions.functions.ts`, O SISTEMA DEVE consumir as faixas de multa por antecedência (`fine_tiers`), janelas de reembolso ANAC/CDC e instruções de pagamento cadastradas pela agência, sem textos fixos hardcoded de operadoras ou percentuais estáticos.
- **REQ-05 (Erradicação de Aeroportos e Datas Padrão Hardcoded):** QUANDO qualquer formulário ou estúdio (`PreBoardingPresentationStudio`, `CarRentalOfferCard`, `workspace.turismo.aereos`, `tourism-dynamic-search-panel`) for inicializado sem dados prévios, O SISTEMA DEVE iniciar com campos vazios ou carregados de viagens/propostas reais do banco, sem injetar `"GRU"`, `"XAP"` ou datas fixas.
- **REQ-06 (Paridade Total Pacotes <-> InfoTravel <-> Proposta <-> Studio <-> Minha Viagem):** QUANDO um pacote, cotação InfoTravel ou OCR for aberto no `UnifiedProposalWorkspace`, editado no `StudioSidebarEditor` e convertido em viagem (`convertProposalToTrip`), O SISTEMA DEVE preservar 100% dos blocos: roteiro dia a dia (`itinerary`), modal de transporte (`transport_modality`: aéreo, rodoviário, multimodal, terrestre), detalhes de ônibus/frota (`bus_details`), trechos aéreos (`flights`), transfers (`transfers`), ocupação por quarto (`rooms`), inclusões/exclusões com busca e filtro inline em linha horizontal única, e condições de pagamento estruturadas.

## 3. Invariantes e Evidências de Aceite
- Zero mocks ou valores hardcoded de aeroportos, datas, operadoras ou multas.
- Migração SQL idempotente com RLS por papel (`owner`/`admin`/`manager` vs `staff`).
- `npm run typecheck` com Exit Code 0.
- Testes automatizados Vitest aprovados.
- `node scripts/design-lint.mjs --ratchet` aprovado com 0 violações P0.
- Deploy em produção concluído (Supabase + Cloudflare Pages).
