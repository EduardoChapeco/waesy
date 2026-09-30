# 02-padroes-waesy.md — Inventário do Alvo: Padrões e Regras de Ouro do Waesy Hoje

## 1. Regras de Ouro Arquiteturais (Constituição Operacional)

Todo código, schema, função de backend ou tela portada dos legados (`ENGIOS`, `simwork`, `brand-builder-ai`, `persona-nexus`, `wider`) DEVE se conformar estritamente aos seguintes padrões canônicos estabelecidos no Waesy:

### Regra de Ouro 1: Camada de Dados (PostgreSQL & RLS Deny-by-Default)
- **Localização de Migrations:** `supabase/migrations/YYYYMMDDHHMMSS_<feature_name>.sql`.
- **Isolamento Multi-Tenant:** Toda tabela com dados de lojista/empresa DEVE conter `store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE`.
- **Ativação Obrigatória de RLS:**
  ```sql
  ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
  ```
- **Políticas RLS Padrão:**
  - Leitura: Membro da equipe da loja (`is_store_staff(store_id)`) ou público se for vitrine/ativo público.
  - Escrita/Mutação: Estritamente equipe da loja (`is_store_staff(store_id)`).
- **Tipagem Financeira:** Proibido uso de `FLOAT` ou `DOUBLE PRECISION` para moeda. Usar sempre inteiros em centavos (`price_cents INT`, `amount_cents INT`) ou `NUMERIC(12, 2)` apenas em relatórios históricos.
- **Auditoria Temporal:** Toda tabela deve conter:
  ```sql
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  ```

---

### Regra de Ouro 2: Camada de Backend (BFF & Server Functions)
- **Tecnologia:** TanStack Start (`createServerFn`) em `src/services/<modulo>.functions.ts`.
- **Validação de Entrada e Saída:** Zod obrigatório em todas as entradas:
  ```ts
  export const myServerFn = createServerFn({ method: "POST" })
    .validator((d: unknown) => mySchemaZod.parse(d))
    .handler(async ({ data }) => { ... });
  ```
- **Identidade e Autorização:** Obter contexto de sessão exclusivamente via `getServerIdentity()` de `@/lib/server-access`:
  ```ts
  const identity = await getServerIdentity();
  const storeId = data.storeId || identity.store_id;
  await assertStoreAccess(storeId);
  ```
- **Cliente Supabase:** Usar `getServerClient()` de `@/lib/supabase` no servidor. Proibido manipular DOM ou importar pacotes de UI em `src/services/`.

---

### Regra de Ouro 3: Camada de Inteligência Artificial & Ledger de Tokens
- **Orquestrador Central:** Toda invocação de LLM deve passar por `executeUnifiedAiCall` em `src/services/api-orchestrator.functions.ts`. Proibido instanciar SDKs proprietários (`@ai-sdk/*`, `@google/genai`) soltos nos componentes.
- **Tratamento de Chaves:** Respeitar o pool de chaves da plataforma (`ApiKeyPoolDTO`) com failover automático e suporte a chaves próprias do lojista (BYOK).
- **Cobrança e Ledger:** Operações de IA que consomem cota da plataforma devem ser registradas no livro-razão (`invoice_ledger` / `billing_invoices`).
- **Engenharia de Prompts:** Prompts estruturados com papéis claros, proibição de alucinação de dados econômicos, dados de evidência obrigatórios e saída JSON estrita validada por Zod.

---

### Regra de Ouro 4: Design System & Silêncio Visual (Apple HIG / Linear)
- **Grade Espacial de 4px:** Todo espaçamento, padding, margin e gap deve pertencer à escala modular de 4px (`p-2`, `p-3`, `p-4`, `p-6`, `space-y-4`). Proibido valores arbitrários entre colchetes (`w-[327px]`, `mt-[13px]`).
- **Alvos de Toque Móveis (Touch Targets):** Mínimo absoluto de 44px (`h-11` ou `min-h-11`) para botões, inputs, abas e itens clicáveis no mobile (`<600px`).
- **Bifurcação Nativa de Layout:**
  - Mobile (`<600px`): Lista vertical fluida edge-to-edge na thumb zone inferior.
  - Desktop (`>=840px`): Bento Grid canônico de 12 colunas (`grid-cols-12`).
- **Silêncio Visual Estrito:**
  - Zero emojis na interface ou em dados técnicos do sistema.
  - Zero badges âmbar ou neon piscantes (`animate-pulse` reservado apenas para skeletons de carregamento).
  - Zero gradientes decorativos ou sombras pesadas em superfícies utilitárias (`bg-card`, `border-border/70`).
  - Zero títulos compostos com mais de 6 palavras ou com barras explicativas (`/`).
  - Matriz de 4 estados obrigatória em toda visualização: Dados, Carregando (`Skeleton`), Vazio (`EmptyState`), Erro (`ErrorState`).

---

## 2. Inventário do Que o Waesy Já Possui nas Mesmas Áreas

| Domínio / Capacidade | O que o Waesy já possui hoje | Localização no Código | O que falta absorver do legado |
| :--- | :--- | :--- | :--- |
| **DNA de Marca & Brand Kit** | Tabela `brand_dna_profiles` com arquétipo, justificativa, tom de voz, regras de tom, pilares e palavras proibidas | `src/services/market-radar.functions.ts:442` | Adicionar fonts (`heading`, `body`, `mono`), logos (`main`, `dark`, `icon`) e extrator automático via URL |
| **Canvas dos 7 Pecados** | Tabela `brand_dna_profiles.seven_sins_triggers` e página de ativação | `src/routes/workspace.marketing.canvas-pecados.tsx` | Integrar com geração automática no onboarding |
| **Análise SWOT** | Tabela `brand_dna_profiles.swot_analysis` e DTO no radar de mercado | `src/services/market-radar.functions.ts:26-45` | Interface visual de edição em quadrantes (4-box matrix) e preenchimento com IA |
| **Business Model Canvas (BMC)** | Não possui tabela/UI formal de 9 blocos | Ausente | **Criar nativamente**: tabela `store_business_model_canvas` + editor em 9 blocos |
| **Pesquisa Sintética (SimLab)** | Rota de Focus Group Virtual com avaliação de personas sintéticas | `src/routes/workspace.simlab.focus-group.tsx` | Nativizar as personas sociodemográficas calibradas (`seed_personas.json` com perfil Chapecó/Interior) |
| **Inteligência de Mercado (IBGE)** | Dados de radar de mercado | `src/services/market-radar.functions.ts` | Conectar a API do IBGE SIDRA (`market-analyzer.ts`) para injetar PIB e população real sem alucinação |
| **Crawlers & Scrapers** | Pool de Firecrawl e Steel configurado no orquestrador | `src/services/api-orchestrator.functions.ts:23-24` | Criar Server Function de extração de DNA de URL (`extractBrandDnaFromUrl`) consumindo Firecrawl |
| **Frameworks Estratégicos** | Dispersos em prompts | Ausente | Unificar biblioteca de 8 frameworks (AIDA, PAS, StoryBrand, SWOT, Oceano Azul, Porter, AARRR, JTBD) |
