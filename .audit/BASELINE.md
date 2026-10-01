# BASELINE.md — Baseline Mensurável do Sistema (P05)

**Data da Medição:** 2026-10-01  
**Métrica Global:** 1560 arquivos em `src/` | 579.341 linhas de código | 21.15 MB

---

## 1. Contagem Estrutural
- **Rotas:** 385
- **Componentes:** 613
- **Serviços / BFF:** 351
- **Hooks:** 16

---

## 2. Top 20 Maiores Arquivos (Alvos Prioritários de Refatoração / Modularização)
| Arquivo | Linhas | Tamanho (KB) |
|---|---|---|
| `src/routes/_store.conta.classificados.novo.tsx` | 9273 | 461.8 KB |
| `src/routeTree.gen.ts` | 8357 | 345.9 KB |
| `src/components/classifieds/editorial-showcase-view.tsx` | 3152 | 175.6 KB |
| `src/services/mining.functions.ts` | 4146 | 148.8 KB |
| `src/components/commerce/canonical-store-profile-view.tsx` | 2976 | 142.1 KB |
| `src/routes/_store.membro.$id.tsx` | 3790 | 128.8 KB |
| `src/components/profile/professional-resume-editor.tsx` | 3136 | 110.0 KB |
| `src/components/mining/mining-dashboard.tsx` | 2267 | 101.6 KB |
| `src/routes/workspace.turismo.viagens.$id.tsx` | 2077 | 101.1 KB |
| `src/services/classifieds.functions.ts` | 2679 | 97.2 KB |
| `src/routes/workspace.comercial.tsx` | 2013 | 96.1 KB |
| `src/routes/admin-master.mining.tsx` | 2049 | 94.3 KB |
| `src/lib/routes.ts` | 3466 | 92.3 KB |
| `src/routes/_store.afiliados.tsx` | 1835 | 91.1 KB |
| `src/components/classifieds/convenience-showcase-view.tsx` | 1930 | 89.4 KB |
| `src/routes/workspace.financeiro.recebiveis.tsx` | 1970 | 89.0 KB |
| `src/services/travel-lifecycle.functions.ts` | 2243 | 83.2 KB |
| `src/routes/_store.classificados.$id.tsx` | 1830 | 82.6 KB |
| `src/services/social.functions.ts` | 2558 | 81.9 KB |
| `src/services/builder.functions.ts` | 3103 | 81.5 KB |

---

## 3. Resumo dos Checks C01-C43
- **Total de Checks:** 43
- **Checks Conformes (0 violações):** 30
- **Checks Abertos:** 13 (C01, C02, C03, C06, C07, C08, C09, C18, C22, C23, C26, C28, C37)
- **Compilação TypeScript:** 0 erros (`tsc --noEmit` verificado)
- **Teto Design Lint Ratchet:** 38.378 violações congeladas em `design-lint.baseline.json`
