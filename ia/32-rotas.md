# ia/32-rotas.md — Dossiê Forense de Rotas, Registries e Links Reais (Prompt 32)

> Gerado em: `2026-10-01T01:42:50.771Z` | Cobertura Total: 384 rotas físicas em `src/routes/`

## 1. Mapeamento de Verdade entre Fontes (B1)

| Fonte Auditada | Quantidade Mapeada | Status de Cobertura |
| :--- | :--- | :--- | :--- |
| **Arquivos Físicos em `src/routes/`** | **384** | Fonte Canônica de Execução |
| **Rotas Geradas em `src/routeTree.gen.ts`** | **377** | Sincronizado pelo TanStack Router |
| **Rotas no Catálogo Formal (`src/lib/routes.ts`)** | **368** | Catálogo Tipado de Domínio |
| **Links e Navegações Reais em Código** | **456** | Referências Internas Mapeadas |

## 2. Distribuição das Rotas por Shell de Navegação (B4)

| Shell de Aplicação | Quantidade de Rotas | Proporção | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| **Workspace (Lojista / Operação)** | 176 | 45.8% | RBAC Governança Dedicado |
| **Vitrine Pública & Loja (_store)** | 150 | 39.1% | RBAC Governança Dedicado |
| **Admin Master (Governança)** | 37 | 9.6% | RBAC Governança Dedicado |
| **API / Integrações (BFF & MCP)** | 18 | 4.7% | RBAC Governança Dedicado |
| **SEO / Sitemaps** | 3 | 0.8% | RBAC Governança Dedicado |

## 3. Diagnóstico de Inconsistências (B2)

| Categoria de Inconsistência | Detectadas | Risco | Ação Corretiva |
| :--- | :--- | :--- | :--- |
| **Links Quebrados (Potencial 404)** | 0 | Médio/Alto | Redirecionamento canônico ou criação de shim |
| **Rotas Órfãs (Sem links internos)** | 3 | Baixo | Adicionar aos menus laterais ou submenus |
| **Rotas Não Registradas no Catálogo** | 7 | Baixo | Ingestão no catálogo unificado de rotas |
| **Entradas no Catálogo sem Arquivo** | 1 | Médio | Depreciação ou criação da página de destino |

### 3.2 Amostra de Rotas Órfãs (Rotas Físicas sem Links Declarados)

| Arquivo | Rota URL | Shell |
| :--- | :--- | :--- |
| `-apple-hig-design.test.ts` | `/-apple-hig-design/test` | Vitrine Pública & Loja (_store) |
| `-workspace.marketing.anuncios.test.ts` | `/-workspace/marketing/anuncios/test` | Workspace (Lojista / Operação) |
| `portal.subpainel.$token.tsx` | `/portal/subpainel/$token` | Vitrine Pública & Loja (_store) |

