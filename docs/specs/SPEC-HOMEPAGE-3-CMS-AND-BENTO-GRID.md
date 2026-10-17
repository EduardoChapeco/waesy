# SPEC-HOMEPAGE-3-CMS-AND-BENTO-GRID: Homepage Nativa 3.0, CMS Omni-Builder & Bento Grid

## 1. Contexto e Motivação
A página inicial (`src/routes/_store.index.tsx`) apresentava sobrecarga cognitiva no primeiro quadrante (Hero), incluindo badges de IA redundantes, títulos longos e texto flutuante no canto inferior direito sem affordance transacional. Adicionalmente, a vitrine de feed/posts sofria com quebras visuais e imagens órfãs (violando a Invariante B.30 e gerando CLS severo), enquanto as seções de categorias de Hotpages e Marketplace não dispunham de parametrização bilateral ponta a ponta no Admin Master (violando a Invariante B.20).

Esta especificação define a arquitetura, schemas, novos componentes visuais nativos (inspirados em Noor, iFood e Bento Grid Apple HIG) e o módulo CMS Omni-Builder no Admin Master, garantindo controle ponta a ponta (imagem, texto, visibilidade, aspect ratio e reordenação) com zero AI-smell e zero efeito sanfona (CLS < 0.05).

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Banco de Dados e Schemas Relacionais
- **UBIQUITOUS**: O sistema SHALL persistir as seções estruturais da Home na tabela `home_page_sections` e seus respectivos itens de mídia e atalhos na tabela `home_section_items`.
- **UBIQUITOUS**: O sistema SHALL garantir suporte a buckets públicos de mídia dedicados (`home-banners` e `home-categories`) no Supabase Storage.
- **STATE-DRIVEN**: ENQUANTO uma seção estiver com `is_active = FALSE`, o sistema SHALL omitir a seção e todos os seus itens filhos da renderização da vitrine pública.
- **EVENT-DRIVEN**: QUANDO o administrador cadastrar ou editar um item com `show_text = FALSE`, o sistema SHALL renderizar a imagem ocupando 100% da área do card sem texto sobreposto ou badges secundários.
- **UNWANTED BEHAVIOUR**: SE uma consulta às tabelas da Home falhar ou a tabela estiver vazia, ENTÃO o sistema SHALL recorrer imediatamente aos itens canônicos padrão em memória, garantindo disponibilidade contínua sem quebra de página.

### 2.2 Componentes Visuais & Design System (Noor + iFood + Apple HIG)
- **UBIQUITOUS**: O sistema SHALL disponibilizar o componente `NoorNativeCategoryDock` para navegação horizontal móvel ultra-fluida com alvos de toque mínimos de 44x44px (`min-h-11 min-w-11`), física tátil `:active:scale-95` e contêineres squircle com proporção fixa.
- **UBIQUITOUS**: O sistema SHALL disponibilizar o componente `IFoodSquareCategoryButton` com proporção exata 1:1 (`aspect-square`), cantos arredondados suaves (`rounded-2xl`), ícone/imagem centralizado de alta resolução e rótulo conciso opcional.
- **UBIQUITOUS**: O sistema SHALL disponibilizar o componente `MetamorphicBannerSlider` com suporte a travas de proporção rígidas (`ifood`, `16:9`, `4:3`, `1:1`) e skeletons idênticos, garantindo CLS = 0.
- **OPTIONAL**: ONDE o viewport for widescreen (>=840px / Desktop), o sistema SHALL acomodar seções configuradas como `bento_grid` através do componente `BentoGridTetris`, utilizando empacotamento denso e spans modulares sem espaços vazios.

### 2.3 Remediação da Vitrine de Posts Sociais
- **UBIQUITOUS**: O sistema SHALL normalizar todas as fontes de posts e artigos da comunidade através do DTO `NormalizedShowcasePost`.
- **UNWANTED BEHAVIOUR**: SE a URL de capa do post for nula, inválida ou apontar para mídia inexistente, ENTÃO o sistema SHALL aplicar capa editorial padronizada pré-compilada via `isHealthyImageUrl`, NUNCA renderizando elemento de imagem quebrada (`<img>` órfão) ou contêiner vazio assimétrico (Invariante B.30).

### 2.4 Painel CMS no Admin Master
- **UBIQUITOUS**: O sistema SHALL fornecer interface de edição em `src/routes/admin-master.home-editor.tsx` e função BFF em `src/services/admin-home-cms.functions.ts` para controle integral de seções e itens.
- **EVENT-DRIVEN**: QUANDO o administrador alterar os toggles de exibição (`show_title`, `show_subtitle`, `show_text`, `aspect_ratio`, `layout_variant`), o sistema SHALL sincronizar as alterações e atualizar a exibição pública imediatamente.

---

## 3. Invariantes Arquiteturais e Restrições
1. **Invariante B.20 (Bilateralidade CMS)**: Nenhum bloco da Home terá textos comerciais ou imagens hardcoded sem espelho de edição no Admin Master.
2. **Invariante B.30 (Integridade Visual de Posts)**: Posts e cards sociais sempre preservam autor, data, badge e mídia válida ou capa editorial nativa.
3. **Piso de Acessibilidade WCAG 2.2 AA**: Controles interativos com piso mínimo de 44x44px (`h-11 min-h-11`), foco visível `:focus-visible:ring-2` e contraste >= 4.5:1.
4. **Zero AI-Smell**: Eliminação de badges explicativas de IA, slogans prolixos e jargões. Design direto e limpo.
5. **Anti-Jank & Zero CLS**: Todas as mídias utilizam dimensões e proporções intrínsecas pré-bloqueadas.

---

## 4. Plano de Testes e Evidências
- Testes unitários para as Server Functions de Home CMS e DTO de normalização de posts.
- Validação TypeScript (`npm run typecheck` Exit Code 0).
- Verificação do Design Lint (`node scripts/design-lint.mjs --ratchet` Exit Code 0).
- Teste de regressão visual nos breakpoints mobile (375px) e desktop (1440px).
