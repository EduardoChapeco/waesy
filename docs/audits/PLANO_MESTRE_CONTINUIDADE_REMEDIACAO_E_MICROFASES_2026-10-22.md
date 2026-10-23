# Plano Mestre de Continuidade, Auditoria Forense e Decomposição em Microfases
**Data de Emissão:** 22 de Outubro de 2026  
**Status do Repositório:** `main` | Branch Ativa: Multithread em Produção  
**Autoridade:** Conselho Consultivo Técnico & Diretoria de Engenharia Waesy  
**Conformidade Normativa:** `AGENTS.md` (Regras B.1 a B.45) e `docs/design/DESIGN.md`

---

## 1. Sumário Executivo & Status Real do Repositório

O ecossistema Waesy atingiu estabilidade transacional em suas camadas críticas de banco de dados e funções BFF, porém uma auditoria forense ponta a ponta revelou divergências entre a casca visual (frontend) e a infraestrutura relacional (Supabase Postgres).

Este documento é a Fonte Única da Verdade (SSOT) técnica para orientar as próximas fases de desenvolvimento, estabelecendo:
1. O que foi **realmente implementado e comprovado** através de testes automatizados e migrações no banco de dados.
2. O inventário forense do que **parece correto na interface, mas apresenta falhas ou desacoplamento sistêmico por baixo**.
3. O plano de trabalho decomposto em **microfases atômicas estritas** (Schema SQL -> Contrato BFF Zod -> Componente UI -> Testes Automatizados), eliminando riscos de colisão com agentes e desenvolvedores atuando em paralelo.

---

## 2. Balanço Real: Entregas Consolidadas vs. Débitos Ativos

### 2.1 Entregas Consolidadas e Comprovadas em Código e Banco

| Módulo / Componente | O Que Foi Realmente Executado | Evidência Comprovada |
| :--- | :--- | :--- |
| **Ingestão & Mineração de Notícias** | Correção das 5 causas raízes estruturais no pipeline de mineração (`editorial-squad.ts`, `_store.noticias.$slug.tsx`, `scraper-utils.ts`, `integrity-gate.ts`). | 60/60 testes unitários aprovados em `src/services/mining/`. |
| **Higienização da Base de Notícias** | Execução de script no Supabase saneando 445 artigos em `news_articles`: desbloqueio de 1.839 parágrafos com `type: "paragraph"`, exclusão de 339 títulos de scaffolding ("Contexto e Apuração", "Desdobramentos") e decodificação de entidades HTML brutas. | 445 artigos verificados no banco com corpo legível e zero títulos técnicos vazados. |
| **Comentários de Membros Civis** | Omissão de badge vazada "Comentários de membros verificados" em `news-comments-section.tsx`, convertendo a diretiva em comentário interno do código. | Zero violações de termos internos na UI pública. |
| **Transação Atômica de Checkout** | Auditoria e cobertura de testes para a função BFF `processCheckout` consumindo a RPC PostgreSQL `process_checkout_transaction_v2`, com barreira de CPF inadimplente (`customer_debt_ledger`) e despacho MotoLink. | 18/18 testes unitários aprovados em `hybrid-checkout`, `omni-checkout` e `marketplace-checkout`. |
| **Provisionamento de Negócios** | Auditoria da função `provisionBusiness` em `onboarding.functions.ts` com rollback transacional em cadeia (caso falhe `workspace_members`, remove `stores` e `organizations`). | 12/12 testes unitários aprovados em `onboarding-pipeline` e `onboarding-e2e`. |

---

### 2.2 Inventário Forense: "O Que Parece Certo, Mas Não Está" (Gaps Sistêmicos)

A inspeção determinística de arquivos identificou 6 inconsistências críticas onde a interface visual simula sucesso ou utiliza atalhos que violam as regras canônicas do produto:

#### GAP 01: Zonas de Entrega com Bairros de Chapecó Hardcoded
- **Localização:** `src/routes/_store.criar-negocio.tsx` (linhas 28 e 145) e `src/components/commerce/neighborhoods-manager.tsx`.
- **Sintoma Visual:** No onboarding de novos estabelecimentos, a tela exibe uma lista de bairros prontos para ativação de taxa de entrega.
- **Defeito Oculto:** O estado do React importa estaticamente a constante `CHAPECO_NEIGHBORHOODS`. Um lojista cadastrando um comércio em Florianópolis, Curitiba ou São Paulo recebe os bairros de Chapecó pré-carregados na tela.
- **Risco:** Corrupção de dados geográficos no banco e erro de precificação de frete.

#### GAP 02: Resíduos de Mídia Sintética (Unsplash) no Código de Notícias e Curadoria
- **Localização:** `src/lib/news/city-editorial-images.ts` e `src/services/mining/business-curation-bootstrap.ts` (6 ocorrências ativas).
- **Sintoma Visual:** Artigos de notícias ou estabelecimentos sem foto original exibem imagens de alta qualidade.
- **Defeito Oculto:** O código injeta imagens de estoque do Unsplash baseadas em palavras-chave ("news", "food", "city") como fallback silencioso.
- **Violação Normativa:** Violação direta da Regra B.8 e B.33 ("Zero Fallbacks Sintéticos"). Notícia ou comércio sem imagem cadastrada deve renderizar estritamente layout tipográfico honesto ou omitir o contêiner de mídia.

#### GAP 03: Metadados Multi-Nicho no Checkout sem Colunas Indexadas
- **Localização:** `src/routes/_store.checkout.tsx` e `src/services/checkout.functions.ts` (linha 494).
- **Sintoma Visual:** O checkout permite preencher dados específicos de nicho (passageiros de turismo, data/hora de agendamento de serviços, talheres descartáveis em gastronomia).
- **Defeito Oculto:** Os dados são persistidos dentro de colunas JSONB genéricas (`orders.checkout_niche_metadata` e `orders.custom_fields`) sem índices B-Tree/GIN e sem schemas Zod discriminados. O painel do lojista (`workspace.pedidos`) realiza parsing dinâmico custoso que degrada a performance de busca.
- **Risco:** Lentidão em consultas de pedidos e falta de tipagem estrita no BFF.

#### GAP 04: Validação de Status da Loja ("Aberto/Fechado") Atrelada ao Horário do Cliente
- **Localização:** `src/components/commerce/business-hours-editor.tsx` e `src/lib/business-hours.ts`.
- **Sintoma Visual:** A vitrine pública exibe selos em tempo real ("Aberto Agora" / "Fechado").
- **Defeito Oculto:** A checagem utiliza `new Date().getDay()` e `new Date().getHours()` no contexto do navegador do usuário. Um cliente acessando em viagem internacional ou com relógio desconfigurado vê o comércio fechado em pleno horário de funcionamento local.
- **Risco:** Perda de conversão comercial e pedidos rejeitados indevidamente.

#### GAP 05: Uploader do CMS sem Suporte a Recorte Dual (Mobile vs. Desktop)
- **Localização:** `src/components/admin/builder/MediaUploader.tsx` e `src/components/ui/media-cropper-modal.tsx`.
- **Sintoma Visual:** Banners cadastrados no Admin Master são exibidos em trilhos da vitrine pública.
- **Defeito Oculto:** O crop modal permite recortar apenas em proporção única (16:9 ou 1:1). Quando um banner ultra-wide (32:9) vai para o mobile sem recorte adaptado, os textos internos são truncados ou a imagem sofre zoom destrutivo via `object-cover`.
- **Violação Normativa:** Regra B.32 (Travas Anti-Jank e Proporções Responsivas Canônicas).

#### GAP 06: Tratamento Silencioso de Exceções (`Silent Catches`)
- **Localização:** `src/lib/theme.ts`, `src/routes/viajante.carteira.tsx` e rotas de edição de anúncios.
- **Sintoma Visual:** Ações que falham não exibem erros, mas o formulário simplesmente não avança.
- **Defeito Oculto:** Blocos `catch {}` sem emissão de log, toast ou fallback defensivo, deixando a interface em estado zumbi.
- **Risco:** Impossibilidade de rastreio de erros de produção na telemetria.

---

## 3. Arquitetura Canônica de Solução (As 4 Camadas Integradas)

Cada funcionalidade do Waesy deve operar estritamente de acordo com a cadeia de integridade de 4 camadas:

```
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 1: BANCO DE DADOS (Supabase Postgres)                          │
│ Tabelas relacionais tipadas, constraints NOT NULL, índices B-Tree/GIN, │
│ RLS deny-by-default, triggers auditados e RPCs ACID atômicas.          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 2: BFF & SERVER FUNCTIONS (TanStack React Start)                 │
│ Funções createServerFn tipadas com schemas Zod estritos, desestrutura-  │
│ ção 100% segura de parâmetros (Regra B.25), zero exposição de service   │
│ role para o browser e sanitização via humanizeErrorMessage.            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 3: INTERFACE DO USUÁRIO & COMPONENTES (React + Tailwind v4)      │
│ Design Squircle Apple/Linear, alvos de toque >= 44px (h-11 min-h-11),  │
│ safe-area defensivo (pt-safe, pb-safe), focus-visible em todos os botões│
│ e omissão automática de containers vazios (Regra B.33).                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 4: TESTES AUTOMATIZADOS & AUDITORIA DE DESIGN (Vitest + Lint)   │
│ Testes unitários de contrato Zod, testes E2E de persistência real,     │
│ design-lint sem violações P0/P1 e verificação de build de produção.    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Decomposição Operacional em Microfases Atômicas

Para garantir execução limpa, sem regressões e sem conflitos com outros agentes, o trabalho restante está subdividido nas seguintes microfases independentes:

### Microfase 1: Erradicação Completa de Mídia Sintética e Blindagem Anti-Fake
* **Objetivo:** Cumprir com rigor a Invariante B.33 (Zero Fallbacks Sintéticos) em todo o ecossistema de conteúdo.
* **Camada 1 (Banco):** Garantir que matérias mineradas salvem `image_url: null` quando não houver imagem legítima na fonte jornalística.
* **Camada 2 (BFF):** Limpar `src/lib/news/city-editorial-images.ts` e `src/services/mining/business-curation-bootstrap.ts`, removendo arrays de URLs do Unsplash. Retornar `null` nativo.
* **Camada 3 (UI):** Ajustar `_store.noticias.$slug.tsx`, cards de notícias e `business-location-picker.tsx` para renderizar layout tipográfico editorial puro quando `image_url` for nulo, sem caixas cinzas quebradas ou imagens de estoque.
* **Camada 4 (Testes):** Executar varredura regex comprovando 0 ocorrências de `images.unsplash.com` em código de produção e 60/60 testes de mineração aprovados.

---

### Microfase 2: Desacoplamento Geográfico no Cadastro de Negócios
* **Objetivo:** Eliminar a amarração estática de bairros de Chapecó e habilitar o carregamento dinâmico de regiões para qualquer município brasileiro.
* **Camada 1 (Banco):** Verificar a integridade das tabelas `cities` e `neighborhoods`. Garantir índice em `neighborhoods(city_id)` e `neighborhoods(city_name, state_uf)`.
* **Camada 2 (BFF):** Criar server function `getNeighborhoodsByCity` em `src/services/public-apis.functions.ts` que consulta a tabela `neighborhoods` do Supabase e retorna a lista dinâmica de bairros para a cidade informada.
* **Camada 3 (UI):** Em `src/routes/_store.criar-negocio.tsx`, substituir `useState(CHAPECO_NEIGHBORHOODS)` por uma consulta assíncrona orientada por `locationData.city`. Se a cidade não possuir bairros mapeados na base, permitir que o comerciante adicione bairros customizados de forma ágil com campo de digitação rápida (`AddNeighborhoodPill`).
* **Camada 4 (Testes):** Teste unitário comprovando que cadastrar uma loja em Florianópolis carrega os bairros de Florianópolis e persiste o array no `stores.settings.delivery_zones`.

---

### Microfase 3: Contratos Tipados & Robustez Relacional no Checkout
* **Objetivo:** Converter o armazenamento de metadados de checkout de JSONB solto para schemas discriminados com índices de banco de dados.
* **Camada 1 (Banco):** Criar migração SQL adicionando índices funcionais GIN na tabela `orders`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_orders_niche_meta_gin ON orders USING GIN (checkout_niche_metadata);
  CREATE INDEX IF NOT EXISTS idx_orders_custom_fields_gin ON orders USING GIN (custom_fields);
  ```
* **Camada 2 (BFF):** Tipar estritamente o `CheckoutSchema` em `src/services/checkout.functions.ts` utilizando discriminated union do Zod para metadados de turismo (voos, passageiros, documentos), gastronomia (itens adicionais, talheres, troco) e serviços (data e turno agendado).
* **Camada 3 (UI):** Em `src/routes/_store.checkout.tsx`, garantir que todos os campos de formulário apliquem `text-base md:text-sm` (anti-zoom no iOS Safari), botões com altura mínima de 44px (`h-11 min-h-11`), `focus-visible:ring-2` e z-index da barra fixa mobile (`z-30`) inferior ao modal de GPS (`z-50`).
* **Camada 4 (Testes):** Executar os 18 testes de checkout (`marketplace-checkout`, `omni-checkout`, `hybrid-checkout`), assegurando zero regressões.

---

### Microfase 4: Normalização de Fuso Horário nos Horários de Expediente
* **Objetivo:** Garantir que o cálculo de status da loja ("Aberto Agora" / "Fechado") respeite o fuso horário da sede do estabelecimento comercial, independentemente do relógio do cliente.
* **Camada 1 (Banco):** Assegurar que a coluna `stores.settings.timezone` armazene a string IANA (padrão `America/Sao_Paulo`).
* **Camada 2 (BFF):** Em `src/lib/business-hours.ts`, refatorar `isStoreOpenNow` para calcular o dia da semana e minuto corrente utilizando `Intl.DateTimeFormat`:
  ```ts
  const nowInStoreTz = new Intl.DateTimeFormat("en-US", {
    timeZone: storeTimezone || "America/Sao_Paulo",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());
  ```
* **Camada 3 (UI):** Em `business-hours-editor.tsx` e no cabeçalho da loja (`canonical-store-profile-view.tsx`), exibir indicador honesto de expediente ("Abre às 18:00" ou "Aberto até às 23:00") formatado no horário do estabelecimento.
* **Camada 4 (Testes):** Testes unitários com fuso simulado (ex: cliente em UTC-4 ou UTC+1 consultando loja em Brasília UTC-3) validando a precisão do status.

---

### Microfase 5: Mídia Bidirecional com Recorte Dual no CMS Master
* **Objetivo:** Eliminar o corte destrutivo de texto em banners móveis, permitindo upload pareado para Desktop (32:9 ou 28:9) e Mobile (16:9 ou 4:3).
* **Camada 1 (Banco):** Adicionar colunas `image_url_mobile` e `focal_point` na tabela `marketplace_sections` e `hotpage_sections`.
* **Camada 2 (BFF):** Atualizar `admin-banners.functions.ts` e `admin-home-cms.functions.ts` para persistir e resolver ambas as URLs.
* **Camada 3 (UI):**
  1. No `MediaUploader.tsx` do Admin Master, adicionar seletor de visualização com preview dinâmico Desktop vs Mobile.
  2. Nas vitrines públicas (`_store.index.tsx`, `HeroInteractiveCarousel.tsx`), renderizar a tag `<picture>` nativa:
     ```tsx
     <picture>
       {section.image_url_mobile && (
         <source media="(max-width: 639px)" srcSet={section.image_url_mobile} />
       )}
       <img src={section.image_url} alt={section.title} className="w-full h-full object-cover" />
     </picture>
     ```
* **Camada 4 (Testes):** Teste de renderização comprovando ausência de CLS (Cumulative Layout Shift) e proporção correta aplicada por media query.

---

### Microfase 6: Padronização Canônica de CTAs e Ergonomia de Vitrine
* **Objetivo:** Aplicar rigorosamente as Invariantes B.22 e B.28 em todos os cards de produtos e estabelecimentos.
* **Camada 1 & 2:** Dados de catálogo e ofertas com preço e status retornados diretamente da tabela `products` e `stores`.
* **Camada 3 (UI):**
  1. `OfferCard` e `grocery-product-card.tsx`: botão de ação primária "Adicionar" ou "Ver Detalhes" com altura estrita de 44px (`h-11 min-h-11`), fonte semibold legível e anel de foco teclado (`:focus-visible`).
  2. `StoreCard`: botão "Ver Estabelecimento" com contraste acessível WCAG AA (>= 4.5:1).
  3. Contêineres de card com bordas suaves squircle (`rounded-lg` / `rounded-xl`) sem uso de classes arbitrárias ou sombras pesadas de IA.
* **Camada 4 (Testes):** Execução do Design Lint com zero violações de DL-14 (Touch target < 44px) e DL-15 (Falta de foco teclado).

---

## 5. Matriz de Governança e Regras de Bloqueio

Antes de mesclar qualquer microfase, o agente ou desenvolvedor deve comprovar:
1. **Compilação TypeScript Sem Erros:** `npm run typecheck` com código de saída 0.
2. **Suíte de Testes Automatizados:** `npx vitest run <suíte_do_módulo>` com 100% de sucesso.
3. **Design Lint Determinístico:** 0 violações P0 e 0 violações P1 em `scripts/design-lint.mjs`.
4. **Isolamento Multithread:** Inspeção via `git status` assegurando que arquivos editados por outras instâncias não foram sobrescritos ou revertidos.
5. **Atualização do Log de Decisões:** Registro da microfase concluída em `docs/design/DECISIONS.md`.

---
*Documento aprovado para comit e versionamento canônico no repositório Waesy.*
