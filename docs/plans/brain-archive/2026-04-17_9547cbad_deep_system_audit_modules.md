# 🕵️‍♂️ RELATÓRIO DE AUDITORIA PROFUNDA: PLATAFORMA DE GESTÃO TURÍSTICA
**SQUAD DE AUDITORIA:** `[AXIOM] Arquitetura` | `[VECTOR] Banco de Dados` | `[FORGE] Cobertura` | `[CIPHER] Segurança`
**ALVOS DE ANÁLISE:** Cotações, Operacional (Kanban), Equipe, Tarefas, Viagens, Grupos Terrestres, Roteiros, Embarques, Chamados.
**ESCALA DO RAIO-X:** Nível de Schema de Banco, Integração RPC e Componentização Frontend.

---

## 1. MÓDULO: Cotações (Quotations)
### Estado Atual da Arquitetura
- **Banco de Dados (VECTOR):** As cotações (`quotations`) possuem vínculos relacionais pesados e muito bem estruturados com as sub-tabelas satélites: `quote_destinations`, `quote_hotels`, `quote_price_items`, `quote_includes`, `quote_transfers`, `quote_experiences` e `flights`. 
- **Frontend (AXIOM):** Vasta adoção de UI/UX em arquivos muito maduros (`QuotationDetail.tsx` com 25.6KB, `PublicQuotation.tsx` gigantesco com 46KB). O uso da URL pública com rota `PublicQuotation` está funcional e protegido pelo token de visualização. O schema lida nativamente com controle de _markup_ financeiro (por pax, tarifa base, taxas e impostos).
- **Vulnerabilidade/Alerta (CIPHER & FORGE):** O componente `PublicQuotation.tsx` é brutalmente longo (46KB+), agindo como um "God Component" que mistura cálculos complexos financeiros com renderização visual (apresentação para o viajante). Isso dificulta testes unitários de regras de cancelamento (`cancelamento_data_limite`, `cancelamento_valor_multa`).
- **Veredito:** Arquitetura sólida a nível DB, mas Frontend apresenta sinais perigosos de acoplamento técnico. Requer Extração de _Services_ Financeiros urgentemente.

## 2. MÓDULO: Operacional & Gestão (KanbanBoard)
### Estado Atual da Arquitetura
- **Banco de Dados:** Schemas robustos: `kanban_boards` -> `kanban_columns` -> `kanban_cards`. Integrados nativamente a tags (`kanban_tags`), checklists aninhados (`kanban_checklists` e `kanban_checklist_items`) e `kanban_notes`.
- **Frontend:** O arquivo `KanbanBoard.tsx` gerencia visualmente o "Pipe" de leads e demandas. A tipagem das tabelas inclui links cruzados poderosos (um card pode linkar a `client_id`, `quotation_id`, `trip_id` e até interceptar `ticket_id`).
- **Alerta:** A migração de estados de Kanban pode sofrer "corrida de condição" se dois agentes arrastarem _cards_ do banco de dados (não vi menção crassa à subscrição _Realtime_ explícita para evitar colisão na UI caso múltiplos agentes trabalhem no mesmo board).

## 3. MÓDULO: Gestão da Equipe (Team Members)
### Estado Atual da Arquitetura
- **Persistência:** Suportado pela tabela híbrida `team_members` (papéis: admin, agent, viewer). Funciona atrelado a `auth.users.id` para login. Permite até comissionamento em DB (`commission_rate`).
- **Frontend:** Possivelmente injetado na aba "Equipe" da View `Settings.tsx` (que possui alarmantes 40KB+ de tamanho — um arquivo colossal com Múltiplas Abas misturadas).
- **Alerta (AXIOM):** Arquivo de configurações (`Settings.tsx`) precisa ser explodido urgentemente em dezenas de pequenos sub-componentes `/pages/settings/TeamSettings.tsx`, `/pages/settings/BillingSettings.tsx`, etc. Colocar tudo em 40KB atrapalhará carregamento da página inteira para quem só quer trocar o perfil.

## 4. MÓDULO: Tarefas do Dia (TasksKanban)
### Estado Atual da Arquitetura
- **Estruturação:** O `TasksKanban.tsx` é inteligente pois recicla o schema do kanban (tabela `kanban_cards`) focando nos filtros de `status` e `due_date`, onde `assigned_to` recai sob o ID do operador (agente atual logado).
- **Veredito:** Design Patterns aplicados corretamente (DRY - Don't Repeat Yourself). Excelente o reuso do motor de colunas/cards para exibir tarefas do dia em vez de reinventar uma tabela `tasks`.

## 5. MÓDULO: Viagens (Individuais/Fechadas - Trips / Portal)
### Estado Atual da Arquitetura
- **Estrutura DB:** Relacionamentos hiper-detalhados entre `trips` (Viagem mestre), `trip_travelers` (vínculo N:N), `trip_contracts` (contratos pre-assinados pelo hub), `trip_flights` e `trip_documents`. 
- **Persistência Externa:** Conta com o painel do viajante (`TravelerPortal.tsx` - 32.4KB), `PortalTripDetail.tsx` e Formulários online (`PublicTravelerForm.tsx`). 
- **Vulnerabilidade de Segurança (CIPHER):** A RLS da tabela `trip_documents` aparenta conferir acesso. Se não migrado para as `Signed URLs` (que introduzimos no passo acima) haverá grande chance de que todos os Documentos PDF dessas viagens (passagens e vouchers) vazem caso os desenvolvedores os lancem em buckets abertos.

## 6. MÓDULO: Grupos Terrestres (GroupTrips)
### Estado Atual da Arquitetura
- **Complexidade Alta (VECTOR):** É um dos módulos mais complexos. `group_trips` engloba precificação em lote, limite de assentos (`bus_layouts` e `bus_seat_assignments`), taxa de conversão populacional, dias do grupo (`group_trip_days`), financeiro/parcelas isolado (`booking_installments`) e _ledger_ de tesouraria do grupo (`group_trip_ledger`).
- **Frontend:** Há arquivos dedicados massivos: `GroupTripFinance.tsx` (25KB), `GroupTrips.tsx` (24KB).
- **Veredito:** Motor pronto para nível _Enterprise_, incluindo Layouts de andares de Ônibus. Há total flexibilidade para gestão de reservas de poltronas visuais para o cliente final. O esquema é soberbo.

## 7. MÓDULO: Roteiros (Itineraries)
### Estado Atual da Arquitetura
- **Estrutura:** Tabela mestre `itineraries`, filhas `itinerary_days`, sub-filhas `itinerary_stops` as quais se conectam ao catálogo global de `experiences` e `hotels_bank`.
- **Inteligência:** Há sistema forte focado em reaproveitar catálogo base em `experiences` para injetar paradas nos dias sem copiar dados à força. O arquivo `ItineraryBuilder.tsx` é pequeno e modular, apontando que o formulário de build pode estar otimizado fora dele ou sendo acionado via subcomponentes.

## 8. MÓDULO: Embarques (Departures / Checklists)
### Estado Atual da Arquitetura
- **Componentização:** Baseado no arquivo `DeparturesKanban.tsx` (17KB). Visualização no sentido de logística de partida. Conta também com `PublicChecklist.tsx` enviável ao passageiro (o.v tabela `traveler_checklists`).
- **Veredito:** Módulo ágil. O envio de checklist dinâmico com tabela contendo token público `public_token` (uuid) mitiga necessidade de dezenas de mensagens no WhatsApp.

## 9. MÓDULO: Chamados (Tickets + Helpdesk Inbound)
### Estado Atual da Arquitetura
- **Complexidade Ativa:** Arquivos `Tickets.tsx` e `TicketDetail.tsx`. E agora o incrível _parser_ nativo: Tabela `email_inbound` interage com banco `tickets` e `email_messages`. Isso significa que o sistema já prevê a importação _raw_ de IMAP (ou via webhooks fal/resend) para gerar chamados sem uso de software de terceiro como o Zendesk.
- **Nível de Inteligência (NOVA):** Notado a presença das colunas maravilhosas: `ai_intent`, `ai_confidence`, `ai_linked_client_id` na tabela `email_inbound`. Isso indica a base pronta para Inteligência Autônoma mapear clientes na caixa de entrada e alocar como chamados na tabela.

---

### DIAGNÓSTICO FINAL SUMÁRIO DA EQUIPE
**O Sistema atinge nível S de Modelagem Relacional e Negócios.** O schema de Banco de Dados está robustíssimo, capaz de suportar grandes agitur / operadoras de viagem, resolvendo tudo até nível de multas fracionárias de cancelamento, assentos de ônibus no andar superior e importação de email inbox com IA.

**O Calcanhar de Aquiles (Alerta Arquitetural Crítico):**
A fragilidade aguda do sistema não está nos dados, está nas VANTAGENS do REAT (Apresentação).
Arquivos grandes como **`PublicQuotation.tsx` (46KB)**, **`Settings.tsx` (40KB)**, e **`TravelerPortal.tsx` (32KB)** agem como depósitos de lógica maciça.
Qualquer mudança na política visual de cor ou fonte quebrará o ecossistema, além de bloquear o crescimento testável. 

📍 **Plano Corretivo de Curto Prazo (Action Plan):**
1. Explodir os God Files (`PublicQuotation` e `Settings`) em Pastas de Micro-Componentes (`/components/quotations/PriceCard.tsx`, `/pages/settings/tabs/BillingTab.tsx`).
2. Saneamento na proteção RLS dos documentos da viagem.
3. Instalação Realtime nos quadros operacionais do KanbanBoard.
