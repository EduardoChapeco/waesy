# SPEC-F16 — Notificações em Tempo Real no Workspace (Supabase Realtime)

## 1. Identificação e Metadados
- **ID:** SPEC-F16-NOTIFICATIONS-REALTIME
- **Fase:** F16 (Plano de Estabilização E2E — Os 4 Pilares)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board (Antigravity Agent)
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `notifications.functions.ts`.

---

## 2. Contexto e Escopo Delimitado
O ecossistema Waesy provê notificações em tempo real para lojistas e operadores no Workspace Pro sobre novos pedidos, mensagens de atendimento, oportunidades e alertas do sistema:
1. **Server Functions de Notificações (`src/services/notifications.functions.ts`):** Ratificação e exportação canônica de `listNotificationsFn`, `markNotificationReadFn` e `markAllNotificationsAsRead`.
2. **Componente de Sino em Tempo Real (`src/components/workspace/notification-bell.tsx`):** Componente acessível com escuta reativa ao canal Supabase Realtime (`postgres_changes` em `notifications`), badge numérico de não lidas e flyout com as mensagens mais recentes.
3. **Zero Mocks (M01):** As notificações são persistidas e lidas exclusivamente da tabela real `notifications` no Supabase com isolamento de `user_id`.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL retornar as notificações ordenadas cronologicamente de forma decrescente (`created_at DESC`), com distinção de tipo (`order`, `interaction`, `system`, `new_lead`).
- **EARS-U02:** O sistema SHALL atualizar atomicamente o estado de leitura (`is_read = true`) no Supabase ao marcar uma notificação individual ou todas.
- **EARS-U03:** O componente NotificationBell SHALL garantir alvo de toque mínimo de 44x44px (`h-11`) no mobile e anéis de foco acessíveis (`:focus-visible`).

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO uma nova linha for inserida na tabela `notifications` para o usuário ativo, O canal Supabase Realtime SHALL disparar a atualização reativa do contador de não lidas.
- **EARS-E02:** QUANDO o lojista clicar em "Marcar como lida", O sistema SHALL invocar `markNotificationReadFn` e decrementar o badge visual imediatamente.

### 3.3 Requisitos de Estado (State-driven Requirements)
- **EARS-S01:** ENQUANTO não houver notificações não lidas, O sino NÃO SHALL exibir badge numérico, mantendo o silêncio visual do design system.
- **EARS-S02:** ENQUANTO as notificações estiverem sendo carregadas no dropdown, A interface SHALL exibir esqueletos geométricos discretos.

---

## 4. Definition of Done & Critérios de Aceite
- [ ] Exportação dos aliases canônicos `listNotificationsFn` e `markNotificationReadFn` em `src/services/notifications.functions.ts`.
- [ ] Criação de `src/components/workspace/notification-bell.tsx` com Supabase Realtime e dropdown acessível.
- [ ] Suíte de testes unitários verdes em `src/services/notifications.functions.test.ts`.
- [ ] 0 violações de design lint na catraca (`node scripts/design-lint.mjs --ratchet`).
- [ ] 0 erros de compilação TypeScript (`npm run typecheck`).
- [ ] Build de produção Cloudflare Pages aprovado (`npm run build`).
- [ ] Registro canônico em `docs/design/DECISIONS.md` (`DEC-142`).
