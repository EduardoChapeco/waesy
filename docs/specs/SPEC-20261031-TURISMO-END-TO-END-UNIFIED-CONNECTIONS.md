# SPEC-20261031-TURISMO-END-TO-END-UNIFIED-CONNECTIONS: Consolidação End-to-End do Ecossistema de Turismo, OCR Auto-Publish, Radar de Oportunidades e Sincronização InfoTravel

**Status:** Aprovada para Execução  
**Data:** 31 de Outubro de 2026  
**Severidade:** P0 / P1 (Conexão sistêmica integral, proibição de duplicação e eliminação de AI-smell)  
**Governança:** AGENTS.md (B.1 a B.46), DESIGN.md, DESIGN-LINT.md  

---

## 1. Contexto e Escopo
O módulo de Turismo do Waesy possui todas as superfícies especializadas construídas (`workspace.turismo.*`), porém apresentava elos desconectados entre o OCR de cotações, o catálogo de pacotes, o Radar de Oportunidades (`travel_opportunity_matches`), o minerador InfoTravel (`ingestOperatorSyncBatch`), a Ficha 360° do Cliente e a navegação modular lateral. Adicionalmente, torna-se regra pétrea a proibição absoluta de criar painéis duplicados ou simplificados.

---

## 2. Requisitos em Sintaxe EARS

### REQ-TUR-E2E-01: Invariante de Soberania de Painéis e Anti-Duplicação (B.46)
- **O sistema e todos os agentes devem** preservar e evoluir estritamente os painéis e rotas canônicas existentes, sendo terminantemente proibido recriar painéis do zero, criar rotas paralelas simplificadas ou utilizar ícones de AI-smell (`Sparkles`), títulos compostos prolixos ou botões conversacionais.

### REQ-TUR-E2E-02: Visibilidade Integral na Navegação Modular de Turismo
- **Quando** o operador acessar o menu lateral do Workspace no nicho de Turismo,
- **o sistema deve** disponibilizar todos os módulos especializados separados por função operacional (`Atendimento`, `Oportunidades`, `Propostas`, `Cotações`, `Malha Aérea`, `Empresas`, `Viagens`, `Grupos`, `Frota`, `Vouchers`, `Reacomodação`, `Suporte`, `Embarques`, `Passageiros`, `Vistos`, `Documentos`, `Pacotes`, `Destinos`, `Radar`, `Hotéis`, `Operadoras`, `Contratos`, `Comissões`), sem ocultar rotas existentes.

### REQ-TUR-E2E-03: Múltiplas Propostas por Lead e Conversão Atômica em Viagem
- **Quando** um Lead estiver em atendimento no Kanban (`/workspace/turismo`),
- **o sistema deve** listar na Ficha 360° todas as propostas já geradas para aquele atendimento, permitir criar novos cenários de propostas a qualquer momento e executar `convertProposalToTrip` ao aprovar uma proposta ou confirmar a venda.

### REQ-TUR-E2E-04: Ficha 360° do Cliente Consolidada
- **Quando** o operador consultar o perfil 360° do cliente (`getCustomer360Profile`),
- **o sistema deve** retornar todos os orçamentos/leads anteriores, todas as viagens (`tourism_trips`), todos os contratos (`travel_contracts`) e todos os chamados de suporte (`tourism_incident_tickets`) vinculados ao cliente.

### REQ-TUR-E2E-05: OCR de Print/Orçamento com Auto-Vínculo de Hotel, Auto-Publicação no Catálogo e Disparo do Radar de Oportunidades
- **Quando** o operador enviar um print, imagem ou PDF de orçamento em `TravelPackageForm`, `UnifiedProposalWorkspace` ou `workspace.turismo.oportunidades.tsx`,
- **o sistema deve**:
  1. Extrair os dados estruturados via OCR (`parseTravelMediaAI` / `processOperatorQuoteOcr`).
  2. Vincular automaticamente o hotel/resort encontrado no `hotels_bank` ou catálogo canônico SSOT.
  3. Permitir a publicação automática no catálogo de pacotes e ofertas (`publishExtractedTravelPackageToCatalogAndMatchRadar`).
  4. Executar imediatamente o motor determinístico `internalEvaluateOfferMatches` contra os interesses aguardando oportunidade (`travel_interests`) e destacar os leads compatíveis no Radar de Oportunidades.

### REQ-TUR-E2E-06: Reconciliação Ponta a Ponta do Minerador/Extensão InfoTravel
- **Quando** o lote de reservas mineradas da InfoTravel (Orinter, FRT, Incomum, Schultz) for enviado para `ingestOperatorSyncBatch`,
- **o sistema deve** reconciliar de forma idempotente:
  1. O registro do lote em `travel_operator_sync_runs`.
  2. O contato/cliente titular em `customers_crm` e `travel_commercial_contacts`.
  3. A viagem em `tourism_trips` e seus passageiros em `trip_passengers`.
  4. O card de pré-embarque em `travel_departures_kanban`.
  5. O borderô financeiro e comissão em `travel_sale_financial_sheets`.
- **E** disponibilizar o painel `InfotravelIntegrationPanel` diretamente na rota `/workspace/turismo/fornecedores` sem contadores fictícios hardcoded.

---

## 3. Escopo Atômico de Arquivos Autorizados
1. `AGENTS.md`, `.agents/AGENTS.md`, `docs/design/DESIGN.md`
2. `src/lib/workspace-navigation.ts`
3. `src/services/crm.functions.ts`
4. `src/services/travel-ai-extractor.functions.ts`
5. `src/services/travel-operator-sync.functions.ts`
6. `src/components/admin/infotravel-integration-panel.tsx`
7. `src/routes/workspace.turismo.fornecedores.tsx`
8. `src/components/commerce/travel/travel-package-form.tsx`
9. `src/components/tourism/unified-proposal-workspace.tsx`
10. `src/routes/workspace.turismo.oportunidades.tsx`
11. `src/routes/workspace.turismo.cotacoes.tsx`
12. `src/routes/workspace.turismo.index.tsx`
13. `docs/design/DECISIONS.md`
