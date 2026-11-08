# 17 — Evidências das Correções Executadas

Durante a preparação e execução desta auditoria, as seguintes correções reais foram implementadas no repositório no commit `21226706`:

1. **Tokenização Canônica de Cores de Kanban:**
   - Arquivo: `src/services/kanban-config.functions.ts`
   - Ação: Substituição de 32 ocorrências de cores hexadecimais literais (`#f59e0b`, `#0ea5e9`, etc.) por variáveis semânticas de CSS (`var(--primary)`, `var(--warning)`, `var(--success)`, `var(--destructive)`, `var(--muted-foreground)`, `var(--accent-foreground)`).
   - Evidência: Redução da baseline de design lint de 694 para 674 violações.

2. **Auditoria Transacional em Agendamentos:**
   - Arquivos: `supabase/migrations/20270222000000_booking_appointments_audit_fields.sql` e `src/services/booking.functions.ts`.
   - Ação: Criação e preenchimento dos campos `completed_at`, `completed_by`, `no_show_marked_at`, `no_show_marked_by`, `cancelled_at`, `cancelled_by`, `cancellation_reason`.

3. **Higienização de Vitrines Públicas:**
   - Arquivo: `src/routes/_store.destaques.$slug.tsx`
   - Ação: Remoção de emojis nos temas pré-configurados e substituição de classes de cores arbitrárias por tokens semânticos.

4. **Correção de Tipagem TypeScript:**
   - Arquivos: `src/services/order.functions.ts` e `src/routes/workspace.tsx`.
   - Ação: Narrowing correto do status de cancelamento e tipagem explícita de parâmetros de busca (`validateSearch: (search: Record<string, unknown>): { storeId?: string }`).
