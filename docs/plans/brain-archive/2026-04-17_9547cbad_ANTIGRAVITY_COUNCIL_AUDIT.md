# 🕵️‍♂️ O CONSELHO ANTIGRAVITY — AUDITORIA PROFUNDA DE CÓDIGO E ARQUITETURA
**SQUAD ATIVO:** `[AXIOM]`, `[VECTOR]`, `[CIPHER]`, `[NOVA]`, `[ECHO]`, `[FORGE]`
**STATUS DO SISTEMA:** Análise profunda de Hooks, Edge Functions, RLS, CRUDS e Dívida Técnica.

---

## 🏛️ 1. MÓDULO: COTAÇÕES E VENDAS
**Agente Relator:** `[ECHO]` & `[NOVA]`
- **Hooks (`useQuotations`, `useSendQuotation`, `useQuotationScenarios`):** 
  - Código limpo usando TanStack Query.
  - A conexão com Edge Functions (`extract-quotation`, `score-quotation`, `send-quotation`) é um destaque fenomenal de negócio; o sistema usa IA não apenas como chat, mas no fluxo transacional (pontuando a viabilidade da cotação e parseando as coisas).
- **Frontend / UI Standardization:** O componente `Quotations.tsx` e `QuotationDetail.tsx` usam Cartões padronizados, mas a padronização UI/UX desvia pontualmente no formulário `QuotationNew.tsx` (que mistura inputs nativos com componentes `ui/input`).
- **Dívida Técnica (`[FORGE]`):** A comunicação com as Edge Functions via `useSendQuotation` não possui fallback agressivo. Se o resend/email falhar, ele alerta, mas não deixa na fila (dead-letter queue).
- **Ação Recomendada:** Refatorar formulários padronizando componentes (100% dependência do `@/components/ui/input` em vez de tags `<input>` cruas em alguns formulários) e aplicar fila de e-mail.

## 📋 2. MÓDULO: OPERACIONAL (KANBAN) & TAREFAS
**Agente Relator:** `[AXIOM]` & `[VECTOR]`
- **Banco de Dados & RLS (`[VECTOR]`):** Políticas RLS em `kanban_cards` e `kanban_boards` são bem definidas (`auth.uid() = user_id` para tarefas associadas). A estrutura N:N de checklists e notes está bem normalizada.
- **Hooks (`useKanbanBoards`):** É o maior hook (17KB). Ele monopoliza a lógica de drag-and-drop inteira do sistema junto de mutações gigantescas otimistas (Optimistic UI) para atualizar o board antes do servidor responder.
- **Risco Técnico (`[AXIOM]`):** Como já havíamos mapeado, a falta de subscrição **Realtime** faz com que as mutações otimistas funcionem impecavelmente para o usuário local, mas dessincroniza agências de grande escala. 
- **Ação Recomendada:** Fragmentar `useKanbanBoards.ts` em dois: `useKanbanQueries` e `useKanbanRealtime`.

## 🛡️ 3. MÓDULO: GESTÃO DA EQUIPE
**Agente Relator:** `[CIPHER]`
- **Qualidade e Segurança:**
  - `Team.tsx` e `Settings.tsx` (recentemente refatorado pelo squad) acessa o hook `useTeamMembers` e interage usando Edge Functions seguras para convite.
  - **Ameaça Neutra (Warning):** O sistema depende em certa medida de que administradores saibam alterar `user_roles`. 
- **Ação Recomendada:** Manter como está. A extração dos componentes foi um sucesso retumbante.

## 🚀 4. MÓDULO: VIAGENS, ROTEIROS E EXPERIÊNCIAS
**Agente Relator:** `[ECHO]` & `[FORGE]`
- **Padronização Visual (`Sheetpages` e CRUDs):**
  - O sistema usa componentes de Dashboard belos, mas notamos a presença de subpáginas excessivas que abrem sem `Sheet` (Gaveta Lateral) que seria muito mais luxuoso e fluido. Páginas como `TripNew.tsx` e `QuotationNew.tsx` cortam a experiência. Deveriam abrir em Drawers/Sheets mantendo o estado do Kanban no fundo.
- **Hooks (`useTrips`, `useContracts`, `useItineraries`):**
  - Bem conectados N:N com as tabelas. Mas chamados como `get_dashboard_stats` na camada inicial de viagens mostram evolução, o que prova que os sub-queries foram mitigados no dashboard.
- **Ação Recomendada:** Eliminar rotas completas de "Nova Viagem" e substituir por `<Sheet>` Modals integrados ao Grid Principal para manter o _flow_ do usuário vivo.

## 🚌 5. MÓDULO: GRUPOS TERRESTRES & EMBARQUES
**Agente Relator:** `[VECTOR]`
- **Obras-Primas de Código:** `useGroupTrips`, `useGroupTripFinance` e `useBusLayouts`. A matemática financeira e arranjo de layout de assentos de ônibus está impecável.
- **Falha Capciosa de Integração:** Embarques lidam com envio de tokens abertos. Não há validação de expiração do "Public Token" de Checklists (se vazado 3 meses depois, o checklist pode ser alterado por terceiros).
- **Ação Recomendada (`[CIPHER]`):** Implementar RLS forçando Time-to-Live (TTL) de 48 horas em tokens públicos do checklist / vouchers ou injetar no DB a política de que Viagens passadas bloqueiam a mutação.

## 🧠 6. MÓDULO: CHAMADOS (TICKETS & INBOUND EMAIL)
**Agente Relator:** `[NOVA]`
- **Edge Functions Ativas (`email-webhook-ingest`, `trigger-python-engine`):**
  - Notamos 15 funções de altíssimo nível prontas para Ingestão e Processamento, com `useB2bCredentials.ts` preparado.
  - O loop de IA que classifica o `intent` de emails e cria Tickets ou Kanban Leads está presente no código, denotando um sistema que age como Zendesk+Salesforce próprio.
- **Ação Recomendada:** Os formulários das sheetpages dos tickets ainda estão muito "chatos" visualmente em relação à inteligência de back-end. Refinamento visual da aba Inbound.

---

## 🔨 O VEREDITO DA DÍVIDA TÉCNICA (TECHNICAL DEBT)

1. **Camada de Apresentação Despadronizada (UX Ruptures):** Alguns formulários quebram a navegação carregando a página inteira ao invés de usar modais / Sheet components (`TripNew`, `ClientNew`). 
2. **Camada de Concorrência Física:** Ausência flagrante de Supabase Realtime no Módulo Kanban e Viagens.
3. **Redundância de Tags HTML Nativas:** Misturar `UI/Input` com `<input>`, `<select>` com `SelectTrigger`. Remove a identidade de Design System Premium (o luxo pede componentes idênticos sempre).
4. **Vazamento de Validade PublicToken:** Vouchers e Checklists públicos sem TTL (expiração temporal nativa na RLS).

### PLANO DE ATAQUE COORDENADO
1. Substituir páginas lentas por Drawers (`ui/sheet`). 
2. Refatorar todos os selects nativos `<select>` em toda _codebase_ pelos equivalentes Shadcn/Radix.
3. Plugar Canais Realtime no `useKanbanBoards.ts`.
