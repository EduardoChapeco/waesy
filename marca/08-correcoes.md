# 08-correcoes.md — Fila de Correções Implementadas & Critérios de Aceite

| ID da Correção | Alvo | Quebra Aliviada | Critério de Aceite | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FIX-MB01** | `src/services/company-mvp.functions.ts:198` | MB1 / MB3 | Gravar cookies canônicos `waesy_active_tenant` e `waesy_active_context=store` com maxAge de 1 ano | **Concluído & Aprovado** |
| **FIX-MB02** | `src/components/workspace/workspace-account-switcher.tsx:66` | MB3 | Busca por slug suporta tanto `m.slug` quanto `m.store_slug` sem falhas | **Concluído & Aprovado** |
| **FIX-MB03** | `src/components/onboarding/fast-company-onboarding.tsx:13` | MB10 / B.8 | Eliminar 100% dos emojis da lista rápida e do select de categorias | **Concluído & Aprovado** |
| **FIX-MB04** | `src/services/checkout.functions.ts:442` | MB11 / TS | Sintaxe válida em `Promise.resolve(db.rpc(...))` sem erros de compilação | **Concluído & Aprovado** |
| **FIX-MB05** | `src/routes/workspace.tsx:26` | MB1 / RBAC | Escopo limpo e declaração única de `isPlatformAdmin` no `beforeLoad` e `loader` | **Concluído & Aprovado** |
| **FIX-MB06** | `docs/marca/ATIVOS.md` & `docs/marca/NICHOS.md` | MB7 / MB9 | SSOT de proporções de imagem e 17 verticais de negócio registradas em docs | **Concluído & Aprovado** |

---

## 1. Verificação de Evidências

1. **Testes Unitários & Integração (Vitest):**
   - Comando: `npx vitest run`
   - Resultado: 109 arquivos de teste executados, **698 testes aprovados (100% de sucesso)**, 0 falhas, Exit Code 0.
2. **Build de Produção (Vite + Nitro + esbuild):**
   - Comando: `npm run build`
   - Resultado: 9.432 módulos de cliente transformados, 8.820 módulos de SSR compilados, worker de produção Cloudflare Pages gerado em `dist/_worker.js` com Exit Code 0.
3. **Persistência Multi-Tenant:**
   - O vínculo `workspace_members` é validado em tempo de execução via `identity.server.ts`.
