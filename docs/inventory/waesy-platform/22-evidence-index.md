# 22 — Índice de Evidências Técnicas

| Portão / Teste de Validação | Resultado Comprovado | Comando de Reprodução |
| :--- | :--- | :--- |
| **Design Lint Ratchet** | 0 P0, 723 Total (-8 violações abaixo da baseline 731) | `node scripts/design-lint.mjs --ratchet` |
| **Testes Vitest do Builder**| 8 arquivos / 65 testes 100% aprovados | `npx vitest run src/components/builder/` |
| **Build de Produção** | 565 chunks gerados + Worker Cloudflare Pages (`dist/_worker.js/index.js`) | `npm run build` |
| **Validação de Schema SQL** | 576 migrações aplicáveis sem conflito | `supabase db lint` |
