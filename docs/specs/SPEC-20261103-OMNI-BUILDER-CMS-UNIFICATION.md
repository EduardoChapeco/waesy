# SPEC-20261103-OMNI-BUILDER-CMS-UNIFICATION
## Especificação Técnica: Unificação End-to-End do Builder Omni, CMS e Vitrines Públicas (Paridade Absoluta WYSIWYG & Padrão Wix)

---

### 1. FASE 1 — INVENTÁRIO COMPLETO DO ECOSSISTEMA ATUAL

| Camada | Arquivos Identificados | Responsabilidade Atual | Estado / Débito |
| :--- | :--- | :--- | :--- |
| **Definições & Tipos** | `src/types/omni-builder.ts`<br>`src/components/builder/types.ts` | Schemas Zod de blocos, documentos e nós do builder | Falta contrato explícito de `capabilities`, `substates` e `dataRequirements`. |
| **Catálogo de Blocos** | `src/components/builder/registry.ts`<br>`src/components/builder/blocks/*` | 65+ blocos modulares canônicos (hero, vitrines, notícias, turismo, gastronomia, etc.) | Blocos não expõem explicitamente matriz de capacidades para o inspetor contextual. |
| **Editor Visual** | `src/components/builder/OmniEditor.tsx`<br>`src/components/builder/vitrine-block-inspector.tsx`<br>`src/components/admin/builder/*` | Interface do editor com canvas, barra superior, docked rail e painéis Wix Studio | Lógica de formulário inlined em mais de 2.000 linhas; inspetor não orientado a capabilities dinâmicas; ausência de edição inline no canvas. |
| **Renderizador** | `src/components/builder/OmniPageRenderer.tsx` | Renderizador ultraleve SSR-ready que mapeia blocos para componentes | Totalmente isolado do editor, mas subutilizado nas vitrines públicas canônicas. |
| **Páginas Públicas** | `src/routes/_store.index.tsx`<br>`src/routes/_store.paginas.$slug.tsx`<br>`src/routes/_store.gastronomia.tsx`<br>`src/routes/_store.turismo.index.tsx` | Vitrines públicas e páginas institucionais | Apenas `_store.paginas.$slug.tsx` consulta `experience_documents`. A Home e vitrines verticais ignoram documentos publicados pelo Omni Builder se não houver camada unificadora. |
| **BFF & Persistência** | `src/services/surface-cms.functions.ts`<br>`src/services/omni-builder.functions.ts`<br>`src/services/builder.functions.ts` | Server functions de carregamento, salvamento, publicação e hidratação de páginas | `syncOmniDocumentToPlatformCms` faz sincronização parcial unidirecional; falta resolver de superfície pública unificado com dados reais. |
| **Coleções & Sheet** | `src/components/admin/builder/BuilderWixStudioPanels.tsx` (`WixCmsCollectionManagerModal`) | Edição de coleções em formato planilha/tabela | Falta integração direta contextual nos blocos que contêm arrays de dados dinâmicos. |

---

### 2. FASE 2 — ARQUITETURA & DIAGNÓSTICO DE INCONSISTÊNCIAS

1. **Bifurcação entre CMS e Builder Omni:**
   - O painel `/admin-master/home-editor` gerencia seções em `marketplace_sections` / `home_page_sections`.
   - O Omni Builder gerencia páginas em `experience_documents` / `experience_versions`.
   - Quando o administrador clica em "Editar no Omni Builder", cria-se um snapshot, mas a página pública continua lendo a fonte legada sem integrar os blocos publicados pelo Omni Builder.
2. **Ausência de Contrato Formal de Capabilities:**
   - Os blocos em `registry.ts` possuem schemas de configuração específicos, mas o inspetor de propriedades (`OmniEditor.tsx` / `vitrine-block-inspector.tsx`) possui estruturas manuais e codificadas caso a caso (`if (block.type === '...')`), gerando duplicação e impedindo extensibilidade natural.
3. **Ausência de Edição Inline no Canvas:**
   - Textos simples, botões e títulos no canvas exigem seleção e navegação no painel lateral em vez de permitir clique e digitação imediata com preservação de formatação.
4. **Isolamento de Tenant & Data Binding:**
   - Vários blocos ainda operam com itens estáticos (`items` em `config`) sem suporte nativo para chavear entre dados estáticos manuais e bindings dinâmicos reais (`products`, `stores`, `classifieds`, `news`, `events`, `jobs`).

---

### 3. FASE 3 — GAP ANALYSIS (TAXONOMIA DE GAPS P0 A P3)

| ID | Severidade | Dimensão | Descrição do Gap | Impacto Arquitetural |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | **P0** | Paridade / Fonte Única | Vitrines públicas (`_store.index.tsx`, etc.) não renderizam documentos Omni publicados. | O que o usuário edita no Omni Builder não reflete no portal público. |
| **GAP-02** | **P0** | Tenant Isolation | Ausência de validação rígida de escopo de tenant em queries dinâmicas de blocos. | Risco de dados cruzados entre lojas ou empresas no ecossistema multi-tenant. |
| **GAP-03** | **P1** | Capabilities Engine | Blocos não expõem contrato padronizado de capabilities (`BlockCapabilities`). | Inspetor inflado com mais de 2.000 linhas de `switch`/`if` em vez de renderização contextual dirigida por capabilities. |
| **GAP-04** | **P1** | Data Binding Real | Blocos com coleções (vitrines, carrosséis, grids) carecem de chaveador declarativo de data binding (Manual vs Banco). | Hardcode e falta de conexão dinâmica com entidades reais. |
| **GAP-05** | **P1** | Subestados & Subfluxos | Componentes com estados internos (drawer, modal, accordion, tabs) não permitem chavear o subestado no editor. | Administrador não consegue inspecionar ou editar visualmente o interior de modais ou menus abertos. |
| **GAP-06** | **P2** | Edição Inline | Títulos, rótulos e textos no canvas só são editáveis através dos inputs do painel lateral. | Fricção na experiência do usuário e quebra da metáfora visual WYSIWYG. |
| **GAP-07** | **P2** | Collection Sheet Manager | Falta de botão contextual para abrir o gerenciador de coleções em planilha diretamente do bloco. | Edição trabalhosa de múltiplos itens de lista. |
| **GAP-08** | **P2** | Layers / Navigator | Árvore de camadas no painel lateral não oferece reordenação e renomeação fluida com feedback visual imediato. | Dificuldade para gerenciar páginas extensas com dezenas de seções. |
| **GAP-09** | **P3** | Histórico Undo/Redo | Pilha de desfazer/refazer ausente ou incompleta em mutações profundas. | Risco de perda acidental de configurações durante edições complexas. |

---

### 4. REQUISITOS NORMATIVOS EARS (FASE 4 A FASE 9)

#### 4.1 Fundação & Fonte Única da Verdade (Fase 4)
- **EARS-01 (Public Surface Document Parity Resolver):**
  - *WHEN* uma vitrine ou superfície pública (`_store.index.tsx`, `_store.gastronomia.tsx`, `_store.turismo.index.tsx`, `_store.mercado.tsx`, etc.) for carregada;
  - *THE SYSTEM SHALL* invocar o resolvedor canônico `resolveSurfacePageExperienceDocument({ surfaceSlug, city })`;
  - *IF* existir um documento Omni publicado com blocos ativos para essa superfície, renderizar diretamente via `<OmniPageRenderer />` com paridade visual absoluta e dados reais vinculados;
  - *ELSE* renderizar a composição modular padrão pré-configurada sem qualquer quebra de layout ou regressão funcional.

- **EARS-02 (Contrato de Capabilities & Tipagem):**
  - *THE SYSTEM SHALL* definir `BlockCapabilities` em `src/types/omni-builder.ts`:
    ```ts
    export interface BlockCapabilities {
      text?: boolean;
      background?: boolean;
      media?: boolean;
      animation?: boolean;
      layout?: boolean;
      responsive?: boolean;
      dataBinding?: boolean;
      interactions?: boolean;
      visibility?: boolean;
      collectionManager?: boolean;
      substates?: string[];
    }
    ```
  - *AND* estender `SiteBuilderBlockDefinition` para incluir `capabilities`, `dataRequirements`, `defaultStyling` e `editorConfig`.

- **EARS-03 (Data Binding Real & Isolamento de Tenant):**
  - *WHEN* um bloco de catálogo, vitrine ou feed for vinculado a uma entidade (`products`, `stores`, `classifieds`, `news`, `events`, `jobs`, `banners`, `hotpages`);
  - *THE SYSTEM SHALL* aplicar restrição de tenant (`store_id` para lojas privadas ou `is_global: true` para o marketplace público) e filtro por cidade, garantindo zero vazamento de dados entre empresas.

#### 4.2 Builder Orientado a Capacidades & Subestados (Fase 5)
- **EARS-04 (Inspetor Contextual por Categorias):**
  - *WHEN* um bloco for selecionado no canvas do Omni Builder;
  - *THE SYSTEM SHALL* abrir o inspetor contextual organizado estritamente por suas capacidades declaradas:
    1. **Conteúdo:** Textos, títulos, badges, imagens, vídeos, labels de ação;
    2. **Layout:** Largura máxima, padding, margem, colunas, gaps, z-index;
    3. **Design:** Tokens semânticos de cor, background, borda, radius, sombras de overlay;
    4. **Dados:** Chaveador estático vs dinâmico, entidade, filtros, limite, ordenação;
    5. **Interações & Animações:** Ações de clique (URL, modal, drawer, whatsapp, carrinho) e presets de scroll animation;
    6. **Responsivo & Subestados:** Visibilidade (todos, desktop_only, mobile_only) e chaveamento do subestado ativo (fechado/aberto).

- **EARS-05 (Subelementos & Subestados Visuais):**
  - *WHEN* o bloco selecionado declarar `substates` (ex: `vitrine_ifood_header`, `vitrine_lateral_drawer`, `faq_clean_accordion`, `interactive_quote_calculator`);
  - *THE SYSTEM SHALL* disponibilizar um seletor de subestado no inspetor e no canvas permitindo ao editor alternar entre os estados internos e inspecionar os elementos filhos com live preview.

#### 4.3 Componentes, Edição Inline & Sheet Manager (Fase 6 & 7)
- **EARS-06 (Edição Inline no Canvas):**
  - *WHEN* o usuário clicar duas vezes em um título, subtítulo ou texto de botão com capability `text: true` no canvas;
  - *THE SYSTEM SHALL* ativar o modo de edição inline (`contentEditable`), sincronizando o texto alterado com o estado do documento sem abrir modais intrusivos.

- **EARS-07 (Collection Sheet / Table Manager):**
  - *WHEN* o usuário clicar no botão "Planilha / Sheet" em um bloco com capability `collectionManager: true`;
  - *THE SYSTEM SHALL* exibir a interface de edição de dados em formato de planilha (`WixCmsCollectionManagerModal`), permitindo manipular em massa itens, títulos, links, badges, imagens e ordenação com persistência em tempo real.

- **EARS-08 (Layers / Navigator & Histórico):**
  - *THE SYSTEM SHALL* manter uma árvore de camadas interativa no painel lateral com seleção direta, reordenação de blocos, renomeação amigável e controles de histórico Undo/Redo.

---

### 5. PLANO DE EXECUÇÃO ATÔMICA E ARQUIVOS AUTORIZADOS

1. **`src/types/omni-builder.ts` & `src/components/builder/types.ts`:**
   - Adicionar interfaces `BlockCapabilities`, `BlockDataBinding`, `BlockInteractionAction`, `BlockSubstateConfig`.
2. **`src/services/surface-cms.functions.ts`:**
   - Criar `resolveSurfacePageExperienceDocument` (leitura atômica de páginas e vitrines com paridade WYSIWYG).
   - Garantir hidratação e sincronização bidirecional completa com `experience_documents`.
3. **`src/components/builder/registry.ts`:**
   - Declarar capabilities explícitas para os blocos canônicos da plataforma.
4. **`src/components/builder/universal-block-inspector.tsx`:**
   - Componente de inspetor modular, limpo e orientado a capacidades (Conteúdo, Layout, Design, Dados, Interações, Responsivo/Subestados).
5. **`src/components/builder/OmniEditor.tsx`:**
   - Conectar o novo inspetor universal, suporte a subestados, edição inline de texto, navigator e histórico Undo/Redo.
6. **`src/components/builder/OmniPageRenderer.tsx`:**
   - Assegurar que o renderizador público injeta dados ao vivo resolvidos e aplica classes canônicas do Design System.
7. **`src/routes/_store.index.tsx` & vitrines canônicas:**
   - Integrar `resolveSurfacePageExperienceDocument` no loader e renderizar via `OmniPageRenderer` quando documento publicado existir, mantendo fallback resiliente e SEO/GEO completos.
8. **Testes Unitários & Integração:**
   - `src/components/builder/omni-builder-parity.test.tsx`: Validar paridade WYSIWYG, capabilities e bindings de dados reais.
