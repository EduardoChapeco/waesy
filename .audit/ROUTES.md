# ROUTES.md — Inventário de Rotas, Telas, Shells e Nichos (P04)

**Total de Rotas Analisadas:** 440
**Status do Check C27 (Rotas Órfãs/Mortas):** 🟢 0 (Todas as rotas mapeadas possuem componentes ativos no sistema TanStack Router)

---

## 1. Distribuição por Shell de Navegação
| Shell | Quantidade de Rotas | Proporção |
|---|---|---|
| **Admin Master Shell** | 38 | 8.6% |
| **Mobile Native Shell** | 10 | 2.3% |
| **Headless API / MCP** | 24 | 5.5% |
| **Storefront Shell (Responsive B2C)** | 179 | 40.7% |
| **Workspace Shell (Desktop/Mobile Split)** | 189 | 43.0% |

---

## 2. Distribuição por Nicho de Mercado
| Nicho | Quantidade de Rotas |
|---|---|
| **Núcleo Genérico (Cross-Niche)** | 393 |
| **Turismo & Viagens** | 37 |
| **Eventos & Festas** | 6 |
| **Gastronomia & Restaurantes** | 4 |

---

## 3. Catálogo Amostral de Rotas Críticas
| Rota | Arquivo Fonte | Shell | Nicho | Suporte Mobile Nativo |
|---|---|---|---|---|
| `/admin-master/ads-network` | `src/routes/admin-master.ads-network.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/algoritmo` | `src/routes/admin-master.algoritmo.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/auditoria-forense` | `src/routes/admin-master.auditoria-forense.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/banners` | `src/routes/admin-master.banners.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/boost-payments` | `src/routes/admin-master.boost-payments.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/botoes` | `src/routes/admin-master.botoes.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/carnes` | `src/routes/admin-master.carnes.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/convite` | `src/routes/admin-master.convite.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/crescimento` | `src/routes/admin-master.crescimento.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/curadoria` | `src/routes/admin-master.curadoria.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/denuncias` | `src/routes/admin-master.denuncias.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/entregadores/auditoria` | `src/routes/admin-master.entregadores.auditoria.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/faturas` | `src/routes/admin-master.faturas.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/home-editor` | `src/routes/admin-master.home-editor.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/hubs` | `src/routes/admin-master.hubs.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/imprensa` | `src/routes/admin-master.imprensa.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master` | `src/routes/admin-master.index.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/integracoes` | `src/routes/admin-master.integracoes.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/kyc` | `src/routes/admin-master.kyc.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/logistica` | `src/routes/admin-master.logistica.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/logs` | `src/routes/admin-master.logs.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/lojas` | `src/routes/admin-master.lojas.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/marca` | `src/routes/admin-master.marca.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/mining` | `src/routes/admin-master.mining.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/modulos` | `src/routes/admin-master.modulos.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/onboarding` | `src/routes/admin-master.onboarding.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/portal-completo` | `src/routes/admin-master.portal-completo.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/pre-cadastro` | `src/routes/admin-master.pre-cadastro.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/seguranca/certificados/$id` | `src/routes/admin-master.seguranca.certificados.$id.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Sim |
| `/admin-master/seguranca/certificados` | `src/routes/admin-master.seguranca.certificados.tsx` | Admin Master Shell | Núcleo Genérico (Cross-Niche) | Desktop/Geral |

*(Relatório completo disponível em .audit/ROUTES.json com 100% das 440 rotas)*
