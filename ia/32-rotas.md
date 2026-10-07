# ia/32-rotas.md — Dossiê Forense de Rotas, Registries e Links Reais (Prompt 32)

> Gerado em: `2026-10-07T13:31:40.329Z` | Cobertura Total: 403 rotas físicas em `src/routes/`

## 1. Mapeamento de Verdade entre Fontes (B1)

| Fonte Auditada | Quantidade Mapeada | Status de Cobertura |
| :--- | :--- | :--- | :--- |
| **Arquivos Físicos em `src/routes/`** | **403** | Fonte Canônica de Execução |
| **Rotas Geradas em `src/routeTree.gen.ts`** | **401** | Sincronizado pelo TanStack Router |
| **Rotas no Catálogo Formal (`src/lib/routes.ts`)** | **377** | Catálogo Tipado de Domínio |
| **Links e Navegações Reais em Código** | **466** | Referências Internas Mapeadas |

## 2. Distribuição das Rotas por Shell de Navegação (B4)

| Shell de Aplicação | Quantidade de Rotas | Proporção | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| **Workspace (Lojista / Operação)** | 180 | 44.7% | RBAC Governança Dedicado |
| **Vitrine Pública & Loja (_store)** | 159 | 39.5% | RBAC Governança Dedicado |
| **Admin Master (Governança)** | 37 | 9.2% | RBAC Governança Dedicado |
| **API / Integrações (BFF & MCP)** | 24 | 6.0% | RBAC Governança Dedicado |
| **SEO / Sitemaps** | 3 | 0.7% | RBAC Governança Dedicado |

## 3. Diagnóstico de Inconsistências (B2)

| Categoria de Inconsistência | Detectadas | Risco | Ação Corretiva |
| :--- | :--- | :--- | :--- |
| **Links Quebrados (Potencial 404)** | 0 | Médio/Alto | Redirecionamento canônico ou criação de shim |
| **Rotas Órfãs (Sem links internos)** | 12 | Baixo | Adicionar aos menus laterais ou submenus |
| **Rotas Não Registradas no Catálogo** | 17 | Baixo | Ingestão no catálogo unificado de rotas |
| **Entradas no Catálogo sem Arquivo** | 1 | Médio | Depreciação ou criação da página de destino |

### 3.2 Amostra de Rotas Órfãs (Rotas Físicas sem Links Declarados)

| Arquivo | Rota URL | Shell |
| :--- | :--- | :--- |
| `_store.busca.tsx` | `/busca` | Vitrine Pública & Loja (_store) |
| `_store.conta.atividade.tsx` | `/conta/atividade` | Vitrine Pública & Loja (_store) |
| `_store.marketplace.checkout.tsx` | `/marketplace/checkout` | Vitrine Pública & Loja (_store) |
| `_store.places.$placeSlug.tsx` | `/places/$placeSlug` | Vitrine Pública & Loja (_store) |
| `api.ai.stream.ts` | `/api/ai/stream` | API / Integrações (BFF & MCP) |
| `api.cron.mining-worker.ts` | `/api/cron/mining-worker` | API / Integrações (BFF & MCP) |
| `api.internal.whatsapp-outbox-worker.ts` | `/api/internal/whatsapp-outbox-worker` | API / Integrações (BFF & MCP) |
| `api.webhooks.payments.ts` | `/api/webhooks/payments` | API / Integrações (BFF & MCP) |
| `api.webhooks.whatsapp.evolution.$instance.ts` | `/api/webhooks/whatsapp/evolution/$instance` | API / Integrações (BFF & MCP) |
| `api.webhooks.whatsapp.wasender.$instance.ts` | `/api/webhooks/whatsapp/wasender/$instance` | API / Integrações (BFF & MCP) |
| `portal.subpainel.$token.tsx` | `/portal/subpainel/$token` | Vitrine Pública & Loja (_store) |
| `status.tsx` | `/status` | Vitrine Pública & Loja (_store) |

