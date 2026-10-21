# SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION: Reengenharia e Expansão End-to-End do Ecossistema de Turismo e Viagens Corporativas Waesy

> **Status:** APROVADO PARA IMPLEMENTAÇÃO  
> **Data:** 20 de Outubro de 2026  
> **Autor:** Antigravity Architect Core  
> **Normas Relacionadas:** `AGENTS.md` (B.1 a B.41), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md` (DL-01 a DL-30)  

---

## 1. Contexto e Revalidação da Baseline

### 1.1 Achados da Reauditoria Forense
1. **P0 em `src/routes/viajante.viagem.$id.tsx`:** Comprovado. O componente utilizava um objeto estático `tripContext` ("Buenos Aires", "Alisson Ricardo", "Valdecy Pedrozo", "Orinter") em vez de consumir os dados reais do banco de dados (`tourism_trips`, `trip_passengers`, `trip_confirmation_items`, `travel_trip_installment_boletos`, `travel_trip_official_documents`).
2. **Integração InfoTravel:** A hipótese anterior de que o conector necessitaria de SOAP/XML foi refutada pela documentação oficial atual do InfoTravel (Infotera API v1), que opera em REST/HTTPS, Bearer Token, JSON com ciclo canônico `availability -> check-rate -> book -> confirm`. O conector existente `src/services/infotravel.ts` já implementa REST/JSON com circuit breaker, rate limit e cache TTL de 15 min.
3. **Unificação Arquitetural:** O repositório já possui 42 tabelas no ecossistema de turismo (`tourism_trips`, `trip_passengers`, `travel_proposals`, `travel_contracts`, `travel_vouchers`, `travel_flight_change_cases`, `tourism_incident_tickets`, `group_tours`, etc.). É terminantemente proibido criar tabelas ou serviços duplicados (como `corporate_trips` ou `corporate_vouchers`). Todas as extensões corporativas se acoplam às entidades existentes.
4. **Isolamento de Créditos Aéreos:** Crédito de bilhete aéreo (`AirTicketCredit`) é direito contratual regulado pela ANAC e pela companhia aérea associado ao passageiro e PNR original. É terminantemente proibido tratá-lo como saldo `$WZ`, cashback ou crédito genérico de loja.

---

## 2. Requisitos Estruturados (Sintaxe EARS)

### 2.1 Habilitação da Agência e Governança Master (EARS-ADM)
- **EARS-ADM-01 (Ubíquo):** O sistema deve manter o registro de `agency_corporate_travel_capability` com status `pending`, `approved`, `suspended` ou `revoked`.
- **EARS-ADM-02 (Condicional de Evento):** QUANDO uma requisição de fluxo corporativo for iniciada, O sistema deve verificar no banco de dados se a agência prestadora possui o status `approved` concedido pelo Admin Master antes de processar qualquer cotação ou emissão.
- **EARS-ADM-03 (Exceção):** SE a agência não possuir status `approved` no Admin Master, ENTÃO o sistema deve rejeitar a operação com erro `AGENCY_CORPORATE_NOT_APPROVED`.

### 2.2 Vínculo Empresa ↔ Agência e Níveis de Autonomia (EARS-ACC)
- **EARS-ACC-01 (Ubíquo):** O sistema deve registrar `corporate_travel_accounts` vinculando a empresa cliente (`company_id`) à agência prestadora (`agency_id`) com contrato, política, consultor de contas dedicado (`primary_account_manager_id`) e matriz de autonomia.
- **EARS-ACC-02 (Ubíquo):** A matriz de autonomia deve suportar por vertical (`air_domestic`, `air_international`, `hotel`, `car`, `bus`, `group`) os níveis:
  - `SEARCH_ONLY`
  - `QUOTE_ONLY`
  - `HOLD_ONLY`
  - `BOOK_REQUIRES_AGENCY`
  - `ISSUE_REQUIRES_AGENCY`
  - `SELF_BOOK`
  - `SELF_ISSUE`
- **EARS-ACC-03 (Condicional de Evento):** QUANDO um usuário tentar reservar ou emitir um produto, O sistema deve avaliar se o nível de autonomia configurado para a empresa permite autoatendimento ou exige intervenção do consultor da agência.

### 2.3 RBAC Corporativo e Booker Delegado (EARS-RBAC)
- **EARS-RBAC-01 (Ubíquo):** O sistema deve implementar os papéis corporativos em `corporate_travel_members`: `TRAVEL_ADMIN`, `TRAVEL_MANAGER`, `TRAVEL_BOOKER`, `TRAVELER`, `APPROVER`, `FINANCE`, `AUDITOR`, `VIEWER`, `EXTERNAL_TRAVELER`.
- **EARS-RBAC-02 (Condicional de Evento):** QUANDO um booker delegado reservar para outro passageiro, O sistema deve persistir separadamente `booker_profile_id`, `traveler_profile_id`, `company_id` e entidade pagadora.
- **EARS-RBAC-03 (Exceção):** SE um passageiro externo acessar o sistema via magic link, ENTÃO o sistema deve limitar o escopo exclusivamente aos dados da viagem atribuída (`trip_id`), bloqueando acesso a faturas globais, salários ou outros viajantes.

### 2.4 Cofre de Viajantes e Documentos (EARS-PAX)
- **EARS-PAX-01 (Ubíquo):** O sistema deve manter `traveler_profiles` contendo nome civil, nome social, CPF, passaporte, validades, nacionalidade, preferências de assento/refeição e programas de fidelidade.
- **EARS-PAX-02 (Ubíquo):** O sistema deve manter `traveler_documents` com upload seguro, RBAC estrito e alertas determinísticos de expiração de passaporte ou visto.
- **EARS-PAX-03 (Invariante):** Dados de documentos e dados sensíveis de saúde nunca devem ser expostos para gestores financeiros ou viajantes não autorizados.

### 2.5 Orquestrador de Suprimentos Multi-Provider & Saga de Reserva (EARS-SUP)
- **EARS-SUP-01 (Ubíquo):** As credenciais de integração com fornecedores (`Wooba`, `InfoTravel`, `RexturAdvance`) devem pertencer exclusivamente à agência e ser armazenadas no cofre criptografado (`travel_operator_integrations`). A empresa cliente nunca visualiza tais credenciais.
- **EARS-SUP-02 (Ubíquo):** O sistema deve implementar o modelo canônico `TravelOffer` segregando estritamente: `net_amount` + `tax_amount` + `supplier_fee` + `agency_markup` + `service_fee` = `selling_total`.
- **EARS-SUP-03 (Condicional de Evento):** QUANDO uma reserva multi-fornecedor envolver produtos de operadoras independentes (ex: voo na Wooba, hotel no InfoTravel, carro na Rextur), O sistema deve executar o padrão Saga com compensação:
  1. Reservar voo.
  2. Reservar hotel.
  3. Reservar carro.
  4. Em caso de falha no passo subsequente, acionar a compensação (cancelamento de hold ou abertura de caso operacional auditado).
- **EARS-SUP-04 (Invariante):** É estritamente proibido supor transações atômicas distribuídas entre APIs externas de fornecedores distintos.

### 2.6 Motor de Políticas e Aprovação Contextualizada (EARS-POL)
- **EARS-POL-01 (Ubíquo):** As políticas de viagem devem ser versionadas (`travel_policy_versions` e `travel_policy_rules`). A versão aplicada a uma compra é imutável e nunca deve ser alterada retroativamente por edições futuras.
- **EARS-POL-02 (Condicional de Evento):** QUANDO uma cotação violar as regras de política (ex: voo acima do teto, cabine não autorizada, hotel com estrelas excedentes), O sistema deve marcar a solicitação como `outside_policy`, justificar o motivo específico e encaminhar para o grafo de aprovação em `travel_approval_requests`.
- **EARS-POL-03 (Condicional de Evento):** QUANDO uma tarifa expirar antes da aprovação do gestor, O sistema deve bloquear a emissão pelo valor antigo e exigir revalidação compulsória com o fornecedor.

### 2.7 Projetos de Viagem, Timeline Viva e Resolução de Lugares (EARS-PRJ)
- **EARS-PRJ-01 (Ubíquo):** O sistema deve suportar `travel_projects` (ex: "Auditoria 2026") agregando múltiplas viagens, tarefas integradas ao sistema global (`travel_project_tasks`) e timeline viva georreferenciada (`travel_project_timeline_items`).
- **EARS-PRJ-02 (Condicional de Evento):** QUANDO dois eventos na timeline possuírem janelas temporais incompatíveis com o deslocamento geográfico calculado (ex: voo chega às 13:50 e reunião às 14:00 a 40 min de distância), O sistema deve alertar o booker sobre o conflito de agenda.
- **EARS-PRJ-03 (Invariante):** Pins de mapa e endereços de compromissos devem ser resolvidos via provedor canônico de lugares (`Places/Maps`), sendo proibido inventar coordenadas fictícias ou usar perfis de redes sociais como fonte de localização.

### 2.8 Dossiê Real do Passageiro no Portal do Viajante (EARS-PORTAL)
- **EARS-PORTAL-01 (Ubíquo):** A rota `/viajante/viagem/$id` deve carregar exclusivamente os dados reais da viagem (`tourism_trips`), seus passageiros (`trip_passengers`), itens de confirmação com localizadores PNR (`trip_confirmation_items`), boletos reais (`travel_trip_installment_boletos`), documentos oficiais (`travel_trip_official_documents`) e vouchers (`tourism_vouchers`).
- **EARS-PORTAL-02 (Invariante):** Todo e qualquer mock estático (`tripContext`) é sumariamente eliminado do código.

### 2.9 Livro-Razão de Créditos Aéreos (EARS-CREDIT)
- **EARS-CREDIT-01 (Ubíquo):** O sistema deve manter a tabela `air_ticket_credits` vinculada ao passageiro (`traveler_id`), companhia aérea, PNR original, bilhete original, valor nominal restante e vigência.
- **EARS-CREDIT-02 (Condicional de Evento):** QUANDO uma nova pesquisa aérea for realizada para o mesmo passageiro e companhia aérea compatível, O sistema deve sinalizar a existência de crédito disponível para abatimento na nova emissão.
- **EARS-CREDIT-03 (Exceção):** SE um passageiro distinto tentar resgatar o crédito sem autorização de transferência expressa nas regras tarifárias originais, ENTÃO o sistema deve rejeitar a operação.

### 2.10 Faturamento, Limite de Crédito e Conciliação (EARS-FIN)
- **EARS-FIN-01 (Ubíquo):** O sistema deve registrar `corporate_credit_profiles` com limite total, limite reservado, limite comprometido e faturado. Prazos especiais (15, 30, 45, 60, 90 dias) são parametrizações contratuais entre agência e empresa, sendo proibido prometer prazos universais na interface pública.
- **EARS-FIN-02 (Ubíquo):** O sistema deve emitir `corporate_invoices` e `corporate_invoice_items` rastreando projeto, viagem, passageiro, localizador, centro de custo e departamento.
- **EARS-FIN-03 (Condicional de Evento):** QUANDO houver divergência entre a cobrança do fornecedor e a reserva do Waesy, O sistema deve abrir automaticamente um caso de conciliação em `travel_reconciliation_cases`.

### 2.11 Gateway de Integração MCP para Agentes de IA (EARS-MCP)
- **EARS-MCP-01 (Ubíquo):** As ferramentas do Model Context Protocol (MCP) devem autenticar chamadas através do usuário requisitante e aplicar os escopos estritos de permissão corporativa.
- **EARS-MCP-02 (Invariante):** Credenciais e chaves secretas dos fornecedores (Wooba, InfoTravel, Rextur) nunca são expostas aos clientes ou assistentes MCP.
- **EARS-MCP-03 (Exceção):** Ações de alto risco (`hold_booking`, `issue`, `cancel`, `refund`) executadas via MCP exigem confirmação explícita e validação de política e idempotência no backend.

---

## 3. Matriz de Entidades e Mapeamento Canônico de Banco

| Domínio Conceitual | Tabela Canônica | Relacionamentos Críticos |
| :--- | :--- | :--- |
| **Aprovação Master** | `agency_corporate_travel_capability` | `store_id REFERENCES stores(id)` |
| **Conta Corporativa** | `corporate_travel_accounts` | `company_id`, `agency_id`, `primary_account_manager_id` |
| **Membros Corporativos** | `corporate_travel_members` | `account_id`, `profile_id`, `role`, `permissions` |
| **Perfil de Viajante** | `traveler_profiles` | `company_id`, `profile_id`, `loyalty_programs` |
| **Cofre de Documentos** | `traveler_documents` | `traveler_id`, `doc_type`, `expiry_date` |
| **Projetos de Viagem** | `travel_projects` | `company_id`, `agency_id`, `owner_id` |
| **Tarefas do Projeto** | `travel_project_tasks` | `project_id`, `assignee_profile_id` |
| **Timeline do Projeto** | `travel_project_timeline_items`| `project_id`, `trip_id`, `place_address`, `lat/lng` |
| **Políticas de Viagem** | `travel_policy_versions` | `company_id`, `version_number`, `rules` |
| **Aprovações** | `travel_approval_requests` | `trip_id`, `project_id`, `requester_id`, `approver_id` |
| **Créditos Aéreos** | `air_ticket_credits` | `traveler_id`, `agency_id`, `original_pnr`, `original_ticket_number` |
| **Perfil de Limite** | `corporate_credit_profiles` | `company_id`, `agency_id`, `credit_limit_cents` |
| **Faturas** | `corporate_invoices` | `company_id`, `agency_id`, `total_amount_cents` |
| **Itens de Fatura** | `corporate_invoice_items` | `invoice_id`, `trip_id`, `traveler_id`, `cost_center` |
| **Conciliação** | `travel_reconciliation_cases` | `company_id`, `agency_id`, `provider_code` |
| **Viagens Reais** | `tourism_trips` (Existente) | `project_id` adicionado via FK |
| **Manifesto Pax** | `trip_passengers` (Existente) | `traveler_profile_id` adicionado via FK |
| **Fornecedores** | `travel_operator_integrations` | `provider_type`, `capabilities`, `config_payload` |

---

## 4. Plano de Implementação e Evidências Requeridas

1. **Migration SQL Canônica:** `supabase/migrations/20270213000000_corporate_travel_os_consolidation.sql` com RLS deny-by-default e indexes.
2. **Camada de Orquestração e Adapters BFF:**
   - `src/services/corporate-travel.functions.ts`
   - `src/services/travel-supply-orchestrator.service.ts`
   - `src/services/travel-mcp-gateway.service.ts`
3. **Remediação do Portal do Viajante:**
   - Eliminar mock estático em `src/routes/viajante.viagem.$id.tsx` e plugar loader real com `getTripAggregate`.
4. **Cockpits e Rotas Corporativas:**
   - `src/routes/workspace.turismo.corporativo.tsx` (Cockpit da Agência).
   - `src/routes/workspace.empresa.viagens.tsx` (Hub Corporativo da Empresa).
   - `src/routes/workspace.turismo.projetos.$id.tsx` (Gestor de Projetos e Timeline Viva).
5. **Testes Automatizados:** Testes unitários e de integração validando RLS, Saga, Política, Créditos e MCP.
