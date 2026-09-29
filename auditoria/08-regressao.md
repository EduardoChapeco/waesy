# Checklist de Regressão & Prova de Runtime

## Verificação Padrão por Correção (A-001, A-002, A-003, A-004)
- [x] Build e typecheck limpos (\`npm run build\` -> Exit Code 0)
- [x] Rota afetada conclui no mobile (390px) sem margem dupla e com Touch Target >= 44px
- [x] Rota afetada conclui no desktop (1280px) com persistência real
- [x] 4 Estados presentes: Carregando (Skeleton/Spinner), Vazio (Empty State sem piada), Erro (Banner com retry), Preenchido
- [x] Persistência após recarregar página (Supabase RLS + Server Function)
- [x] Ausência de mocks ou toasts simulados sem gravação no banco
- [x] Suíte Vitest: \`src/services/accessibility-wcag.test.ts\` (5/5 aprovados)
- [x] Suíte Vitest: \`src/services/pdv-floor-plan.test.ts\` (2/2 aprovados)
- [x] Suíte Vitest: \`src/services/rma-and-gastronomy-modifiers.test.ts\` (5/5 aprovados)
- [x] Suíte Vitest: \`src/services/omni-checkout-and-trust-safety.test.ts\` (7/7 aprovados)
