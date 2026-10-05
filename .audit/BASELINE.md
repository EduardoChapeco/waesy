# BASELINE.md — Baseline Mensurável do Sistema (P05)

**Data da Medição:** 2026-10-01  
**Métrica Global:** 1845 arquivos em `src/` | 634.620 linhas de código | 23.26 MB

---

## 1. Contagem Estrutural
- **Rotas:** 406
- **Componentes:** 718
- **Serviços / BFF:** 402
- **Hooks:** 22

---

## 2. Top 20 Maiores Arquivos (Alvos Prioritários de Refatoração / Modularização)
| Arquivo | Linhas | Tamanho (KB) |
|---|---|---|
| `src/routes/_store.conta.classificados.novo.tsx` | 9561 | 478.9 KB |
| `src/routeTree.gen.ts` | 8591 | 354.9 KB |
| `src/components/classifieds/editorial-showcase-view.tsx` | 3154 | 175.7 KB |
| `src/services/mining.functions.ts` | 4104 | 143.7 KB |
| `src/components/commerce/canonical-store-profile-view.tsx` | 2985 | 142.2 KB |
| `src/routes/_store.membro.$id.tsx` | 3790 | 128.6 KB |
| `src/routes/_store.checkout.tsx` | 3011 | 119.8 KB |
| `src/components/profile/professional-resume-editor.tsx` | 3041 | 107.6 KB |
| `src/components/mining/mining-dashboard.tsx` | 2267 | 101.5 KB |
| `src/routes/workspace.turismo.viagens.$id.tsx` | 2077 | 101.1 KB |
| `src/services/classifieds.functions.ts` | 2746 | 100.2 KB |
| `src/lib/routes.ts` | 3506 | 96.9 KB |
| `src/routes/workspace.comercial.tsx` | 2013 | 96.0 KB |
| `src/routes/admin-master.mining.tsx` | 2049 | 94.2 KB |
| `src/routes/_store.afiliados.tsx` | 1835 | 90.9 KB |
| `src/components/classifieds/convenience-showcase-view.tsx` | 1930 | 89.2 KB |
| `src/routes/workspace.financeiro.recebiveis.tsx` | 1970 | 88.8 KB |
| `src/services/travel-lifecycle.functions.ts` | 2327 | 88.7 KB |
| `src/services/social.functions.ts` | 2558 | 81.9 KB |
| `src/services/builder.functions.ts` | 3103 | 81.5 KB |

---

## 3. Resumo dos Checks C01-C43
- **Total de Checks:** 43
- **Checks Conformes (0 violações):** 30
- **Checks Abertos:** 13 (C01, C02, C03, C06, C07, C08, C09, C18, C22, C23, C26, C28, C37)
- **Compilação TypeScript:** 0 erros (`tsc --noEmit` verificado)
- **Teto Design Lint Ratchet:** 38.378 violações congeladas em `design-lint.baseline.json`
