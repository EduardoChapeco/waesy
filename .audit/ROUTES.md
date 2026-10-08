# ROUTES.md — Inventário de Rotas, Telas, Shells e Nichos (P04)

**Total de Rotas Analisadas:** 403
**Status do Check C27 (Rotas Órfãs/Mortas):** 🟢 0 (Todas as rotas mapeadas possuem componentes ativos no sistema TanStack Router)

---

## 1. Distribuição por Shell de Navegação
| Shell | Quantidade de Rotas | Proporção |
|---|---|---|
| **Storefront Shell (Responsive B2C)** | 154 | 38.2% |
| **Mobile Native Shell** | 10 | 2.5% |
| **Admin Master Shell** | 37 | 9.2% |
| **Headless API / MCP** | 22 | 5.5% |
| **Workspace Shell (Desktop/Mobile Split)** | 180 | 44.7% |

---

## 2. Distribuição por Nicho de Mercado
| Nicho | Quantidade de Rotas |
|---|---|
| **Núcleo Genérico (Cross-Niche)** | 364 |
| **Eventos & Festas** | 5 |
| **Gastronomia & Restaurantes** | 4 |
| **Turismo & Viagens** | 30 |

---

## 3. Catálogo Amostral de Rotas Críticas
| Rota | Arquivo Fonte | Shell | Nicho | Suporte Mobile Nativo |
|---|---|---|---|---|
| `/acougue` | `src/routes/_store.acougue.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/afiliados` | `src/routes/_store.afiliados.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/agenda` | `src/routes/_store.agenda.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/agendar/$id` | `src/routes/_store.agendar.$id.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/agendar` | `src/routes/_store.agendar.index.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/agendar` | `src/routes/_store.agendar.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Desktop/Geral |
| `/bebidas` | `src/routes/_store.bebidas.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/beleza` | `src/routes/_store.beleza.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/bio/$slug` | `src/routes/_store.bio.$slug.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Desktop/Geral |
| `/busca` | `src/routes/_store.busca.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Desktop/Geral |
| `/buscar` | `src/routes/_store.buscar.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/cadastro` | `src/routes/_store.cadastro.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/cadastroantecipado` | `src/routes/_store.cadastroantecipado.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Desktop/Geral |
| `/carrinho` | `src/routes/_store.carrinho.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/casa` | `src/routes/_store.casa.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/categoria/$slug` | `src/routes/_store.categoria.$slug.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/checkout` | `src/routes/_store.checkout.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/classificados/$id` | `src/routes/_store.classificados.$id.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Desktop/Geral |
| `/classificados` | `src/routes/_store.classificados.index.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/colecao/$slug` | `src/routes/_store.colecao.$slug.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/concurso/$id` | `src/routes/_store.concurso.$id.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/concursos` | `src/routes/_store.concursos.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/construcao` | `src/routes/_store.construcao.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/agendamentos` | `src/routes/_store.conta.agendamentos.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/atividade` | `src/routes/_store.conta.atividade.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/avaliacoes` | `src/routes/_store.conta.avaliacoes.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/candidaturas` | `src/routes/_store.conta.candidaturas.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/carnes` | `src/routes/_store.conta.carnes.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/classificados` | `src/routes/_store.conta.classificados.index.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |
| `/conta/classificados/novo` | `src/routes/_store.conta.classificados.novo.tsx` | Storefront Shell (Responsive B2C) | Núcleo Genérico (Cross-Niche) | Sim |

*(Relatório completo disponível em .audit/ROUTES.json com 100% das 403 rotas)*
