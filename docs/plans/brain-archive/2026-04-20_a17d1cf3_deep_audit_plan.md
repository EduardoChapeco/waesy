# 🦅 Plano Mestre: Auditoria Verticalizada de Plataforma (Operation Aegis & Forge)

Este plano operacional detalha o raio-x absoluto de toda a plataforma Turis Agências. Ele mapeia módulo a módulo, exigindo validações sistêmicas rigorosas de regras de negócio, modelagem de banco de dados, Edge Functions, integração UI/UX e rotas. O objetivo é assegurar 100% de Prontidão Operacional, zero simulações e dados firmemente conectados entre si.

---

## 🏛️ Módulo 1: Infraestrutura Core & Settings (Hub)
- [ ] **1.1. Revisão Arquitetural de Banco e Autenticação**
  - Checar integridade estrutural das instâncias do Supabase Auth e sessão de variáveis globais (`useAuthStore`).
  - Avaliar schema da tabela `organizations` e `profiles` vs. injeção em hooks de estado.
  - Verificar vazamento de RLS (policies que permitem usuários editarem dados de outras organizações).
- [ ] **1.2. Integrações IAM e Settings**
  - Revisão código-fonte de `Settings.tsx` (KanbanTab, IntegrationsTab, AiLogsTab, B2BTab).
  - Validar salvamento e criptografia estendida de senhas nas credenciais de IA e B2B API (`ai_keys_pool`, `b2b_credentials`).
  - Auditoria dos fluxos de exclusão em cascata quando administradores revogam tokens.
- [ ] **1.3. Gestão de Storage & Uploads**
  - Verificar permissões RLS dos buckets (`media`, `hotel-photos`, `client-media`, `documents`).
  - Auditar UI/Componentes de upload (limite de arquivos, conversão otimizada, validações mime-type) eliminando placeholders fixos e lógicas temporárias.

## 👥 Módulo 2: CRM, Clients e Traveler Information
- [x] **2.1. Modelagem O-D-A (Obrigatoriedade, Dependência e Ausência)**
  - Revisar foreign keys vinculando `travelers` a `clients` e `profiles`. Validação do cascade on delete.
- [x] **2.2. Revisão Holística de Inputs e Forms (TravelerForms)**
  - Checar a página `TravelerInfoEdit.tsx` e `TravelerInfo.tsx` contra dados "chumbados". 
  - Validar tipagem TS estrita nas requisições Supabase. Analisar conversões JSON para armazenamento seguro de dados médicos, familiares de contato e preferências de assento. (Corrigido bug flat-columns vs jsonb em address).
- [ ] **2.3. Funcionalidade da View Pública**
  - Testar fluxos de coleta via `PublicTravelerForm.tsx`.
  - Revisar gatilhos e integrações (webhooks vs. auto-aprovação de cadastro do CRM) quando o cliente submete seus dados remotamente.

## 📝 Módulo 3: Cotações (Quotations) e Cenários IA
- [x] **3.1. Validação DDL do Roteiro Gerador**
  - Avaliar sincronização com as tabelas-satélite: `quote_transfers`, `quote_experiences`, `quotes_inclusions`.
  - Assegurar que consultas ao banco não possuem fallbacks `|| []` simuladores de UI. 
- [x] **3.2. Mecanismos do IA Engine (Agente Especializado)**
  - Revisão rigorosa de Edge Functions: `build-proposal`, `score-quotation`, `extract-quotation`, e `extract-quotation-feedback`.
  - Auditar prompts, payload handlers (tratamento de erros JSON na resposta do LLM) e retentativas dos provedores (Gemini vs OpenRouter).
- [x] **3.3. Front-end de Conversão (Dashboard)**
  - Examinar `QuotationDetail.tsx` (abas detalhadas de Cenários vs Propostas). 
  - Conferir a visualização e mapeamento de metadados das tabelas `quotation_scenarios` sem erros JS/type "any".
- [x] **3.4. Motor de Render Público**
  - Rastrear a view `PublicQuotation.tsx`. Verificar como o código renderiza componentes com base *estritamente* nos dados relacionais recebidos (sem simulações visuais).

## 🧳 Módulo 4: Operações Core (Group Trips & Itinerários)
- [ ] **4.1. Transição Final do Legado**
  - Confirmar exclusão das rotas `/trips` antigas e substituição total por `/group-trips`.
  - Revisão do Controller e hook `useGroupTrips.ts` e validação do fluxo completo (Criação > Adição de Dias > Assinatura de Contratos).
- [x] **4.2. Gestão Diária de Operações**
  - Revisão lógica do editor `GroupTripDaysEditor.tsx`, assegurando a funcionalidade de drag-and-drop e sync transacional ao DB (sem dessincronizar índices/dias).
- [x] **4.3. Layout de Ônibus (Transportes Terrestres)**
  - Auditar relacional de `bus_layouts` e o algoritmo de designação de `bus_seat_assignments`.
  - Checar a interface do mapa visual e bloqueios sistêmicos contra reservas de asientos em duplicidade.
- [x] **4.4. Construtor de Itinerários Autônomo**
  - Verificação paralela de `Itineraries.tsx` e tabela `itinerary_stops`.
  - Teste da IA geradora (Ação: Prompt -> Geocoding nativo Edge -> Inserção relacional).

## 💵 Módulo 5: Financeiro e Gestão de Reservas (Bookings)
- [x] **5.1. Conciliação Automática & Relacional**
  - Revisar estrutura crítica financeira ligando `group_bookings`, `booking_installments`, e `booking_payment_proofs` (arquitetura ERP).
  - Fluxos e restrições de cancelamentos (`useBookingCancellations.ts`).
- [x] **5.2. Holística da UI Financeira**
  - Auditar a interface de `GroupTripFinance.tsx`. 
  - Validar os gatilhos para recálculo financeiro on-the-fly de pendências/comprovantes.
  - Teste de chat interno (`booking_messages`) contra RLS anônimos (cliente falando com operador).
- [x] **5.3. Tracking do Pipeline B2B Suppliers**
  - Revisar código de `finance/Suppliers.tsx` e `finance/Transactions.tsx` em busca de integrações falhas ou estados flutuantes (Race conditions). (Corrigido FK legado trip_id).

## 📊 Módulo 6: Kanban e Logística (Radar Multi-Agências)
- [x] **6.1. Otimização das Boards (Sales/Departures/Tasks)**
  - Validar engine estrito de movimentação (Drag and Drop): sync imediata de metadados (`kanban_cards.position` e `kanban_cards.column_id`).
  - Monitorar referências residuais nos popups (`DepartureCardSheet.tsx`, `TaskCardSheet.tsx`) confirmando o consumo exclusivo da constraint `group_trip_id`. (Completamente erradicadas as referências a `trip_id`).
- [x] **6.2. Componentes Logísticos Global (Radar Portal)**
  - Tracing de `GlobalRadarMap.tsx` e `RadarPortal.tsx` conectado às Edge functions do RAG (`radar-crawler-squad` e `ai_radar_news`).
  - Checar a veracidade das lógicas espaciais de geolocalização.

## 🤖 Módulo 7: Automação Sistêmica, Comandos e Webhooks (Agentes)
- [x] **7.1. Fluxos Autômatos**
  - Auditar `Automations.tsx` (Regras de disparo).
  - Code-review da Edge function `process-automations`: Agendar cronograma, mapear as variáveis do template (`{{client_name}}` -> string real) na renderização do e-mail.
- [ ] **7.2. Extensão Lateral de WhatsApp (Ingestão)**
  - Avaliar chamadas seguras da Edge Function `extension-sync` & `extension-bootstrap`.
  - Sincronização dos logs transientes na tabela `wa_conversation_logs` para serem fixados nos cards de kanban corretos.

## 📜 Módulo 8: Portal B2C & Templates Contratuais
- [x] **8.1. Contratos Dinâmicos B2B/B2C**
  - Revisão visual e lógica no mapeamento JSON de placeholders do `ContractTemplates.tsx`.
- [x] **8.2. Ecossistema Consumidor Final (Traveller Portal)**
  - Auditar telas `PortalLogin`, `PortalHome`, `PortalTripDetail`. Checar validações JWT Customizadas sem poluir autenticações padrão.
  - Segurança de leitura de comprovantes e itinerários, impedindo simulação vetorial. (Removido schema obsoleto trips).

---
**Status da Tabela:** 🟣 *Pronto para Início* | 🛠️ *Work in Progress* | ✅ *Cumprido*
