# Onda 08 & 09 — Catálogo Canônico de Agentes e Skills

## 1. Catálogo de Agentes Especializados (`.agents/agents/`)

| Agente | Classificação | Responsabilidade Técnica | Ferramentas Autorizadas |
| :--- | :--- | :--- | :--- |
| **`spec-writer`** | `planner` | Redige especificações estruturadas em sintaxe EARS e critérios de aceite | Read codebase, view files |
| **`design-system-architect`**| `architect` | Governança de tokens semânticos, styles.css e foundations | Read design docs, tokens.json |
| **`component-craftsman`** | `executor` | Implementação de primitivas Radix e componentes com matriz de 4 estados | Edit/create files, run tests |
| **`visual-auditor`** | `reviewer` | Execução determinística de Design Lint (regras DL-01 a DL-30) | Node lint scripts, report parser |
| **`a11y-guardian`** | `reviewer` | Auditoria de acessibilidade mecânica, anéis de foco e contraste APCA/WCAG | A11y linters, contrast calculation |
| **`content-editor`** | `curator` | Erradicação de prolixidade, jargões e AI-smell em rótulos e microcopy | Read components, string diffs |
| **`platform-splitter`** | `executor` | Bifurcação adaptativa entre Compact (<600px), Medium e Expanded (>=840px) | Component viewports, layout split |
| **`flow-architect`** | `architect` | Rastreio da cadeia de 7 elos em fluxos transacionais (D1 a D5) | Route analysis, breadcrumbs, link maps |
| **`autonomous-copilot`** | `router/planner`| Classificação EARS, delegação a harvesters e entrega de artefatos vivos | MCP tools, database, scrapers |

---

## 2. Catálogo de Skills Essenciais (`.agents/skills/`)

Das **44 skills ativas** no repositório, destacam-se os seguintes blocos funcionais essenciais:

### 2.1. Plataforma de Dados & Banco de Dados
- **`supabase`:** Gestão de client libraries, SSR integrations (@supabase/ssr), autenticação e RLS.
- **`supabase-postgres-best-practices`:** Otimização de queries, índices parciais, skip locked e pooler.
- **`storage-audit`:** Governança de buckets S3, políticas de storage e prevenção de arquivos órfãos.

### 2.2. Engenharia de Mineração & Crawling Urbano
- **`api-pool-manager`:** Roteamento do pool de IA (OpenRouter/Groq/Firecrawl/SteelDev) com cofre de chaves.
- **`dynamic-surge-pricing`:** Motor dinâmico de tarifas para entregadores MotoLink com multiplicadores climáticos.
- **`fallback-sweeper`:** Varredura mecânica que erradica fallbacks hardcoded e dados sintéticos em favor de empty states honestos.

### 2.3. Auditoria, Segurança & Qualidade
- **`security-guard`:** Auditoria server-side, Zero-Trust, RLS Deny-by-Default e prevenção de injeção.
- **`design-lint`:** Execução automatizada das regras normativas DL-01 a DL-30.
- **`proof-verifier`:** Protocolo estrito de verificação (Fase K): 2 shells, ciclo de ida e volta, 0 erros no build.
- **`break-triage`:** Classificação taxonômica (B1 a B12) de falhas antes de qualquer refatoração.
- **`recursive-repair`:** Ciclo fechado de correção na raiz proibindo remendos superficiais.
- **`token-economy`:** Protocolo cirúrgico de economia de contexto e tokens em execuções de agentes.

### 2.4. Design System & Frontend
- **`design-foundations`:** Estruturação inicial de telas e layouts canônicos.
- **`color-and-contrast`:** Derivação e auditoria rigorosa de paletas tonais (WCAG 2.2 AA).
- **`component-api`:** Contratos de componentes reutilizáveis e suporte à matriz completa de 4 estados.
- **`apple-design`:** Imposição de elevação em camadas, touch targets de 44px e física de movimento.
- **`theme-factory`:** 10 temas canônicos para personalização de lojas e painéis.
