# BASELINE.md — Baseline Mensurável do Sistema (P05)

**Data da Medição:** 2026-10-01  
**Métrica Global:** 1922 arquivos em `src/` | 650,909 linhas de código | 23.57 MB

---

## 1. Contagem Estrutural
- **Rotas:** 416
- **Componentes:** 722
- **Serviços / BFF:** 441
- **Hooks:** 22

---

## 2. Top 20 Maiores Arquivos (Alvos Prioritários de Refatoração / Modularização)
| Arquivo | Linhas | Tamanho (KB) |
|---|---|---|
| `src/routes/_store.conta.classificados.novo.tsx` | 9569 | 478.7 KB |
| `src/routeTree.gen.ts` | 8818 | 365.5 KB |
| `src/components/classifieds/editorial-showcase-view.tsx` | 3154 | 172.6 KB |
| `src/services/mining.functions.ts` | 4104 | 143.7 KB |
| `src/components/commerce/canonical-store-profile-view.tsx` | 2989 | 142.5 KB |
| `src/routes/_store.membro.$id.tsx` | 3728 | 126.5 KB |
| `src/routes/_store.checkout.tsx` | 3011 | 120.9 KB |
| `src/components/profile/professional-resume-editor.tsx` | 3041 | 104.7 KB |
| `src/services/classifieds.functions.ts` | 3001 | 103.6 KB |
| `src/components/mining/mining-dashboard.tsx` | 2268 | 99.3 KB |
| `src/routes/workspace.turismo.viagens.$id.tsx` | 2077 | 99.0 KB |
| `src/routes/workspace.comercial.tsx` | 2013 | 94.0 KB |
| `src/lib/routes.ts` | 3506 | 93.4 KB |
| `src/routes/admin-master.mining.tsx` | 2060 | 93.2 KB |
| `src/routes/_store.afiliados.tsx` | 1835 | 89.2 KB |
| `src/services/travel-lifecycle.functions.ts` | 2358 | 87.7 KB |
| `src/components/classifieds/convenience-showcase-view.tsx` | 1935 | 87.5 KB |
| `src/routes/workspace.financeiro.recebiveis.tsx` | 1970 | 86.9 KB |
| `src/services/ai-conversations.functions.ts` | 2111 | 80.6 KB |
| `src/registries/mcp-tool-registry.ts` | 2196 | 80.3 KB |

---

## 3. Resumo dos Checks C01-C43
- **Total de Checks:** 43
- **Checks Conformes (0 violações):** 30
- **Checks Abertos:** 13 (C01, C02, C03, C06, C07, C08, C09, C18, C22, C23, C26, C28, C37)
- **Compilação TypeScript:** 0 erros (`tsc --noEmit` verificado)
- **Teto Design Lint Ratchet:** 38.378 violações congeladas em `design-lint.baseline.json`
