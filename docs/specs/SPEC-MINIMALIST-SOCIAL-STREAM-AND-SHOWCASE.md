# SPEC-MINIMALIST-SOCIAL-STREAM-AND-SHOWCASE — Stream Social Minimalista, Galeria Deslizante & Erradicação de Posts Fictícios

## 1. Contexto e Escopo
Refatoração ponta a ponta do ecossistema de publicações sociais, vitrine de posts da Home (`HomePostsShowcase`), seções de superfícies de marketplace (`ModularSurfaceFeed`), feed principal (`_store.feed.tsx`, `_store.mural.tsx`), página canônica de publicação (`_store.publicacao.$id.tsx`), compositores (`inline-post-composer.tsx`, `floating-community-dock.tsx`, `post-creation-drawer.tsx`) e cards de notícias (`news-card.tsx`), adotando estética minimalista limpa, suporte a múltiplos formatos de visualização de mídia sem menção a marcas de terceiros e eliminação integral de posts fictícios hardcoded.

## 2. Requisitos em Sintaxe EARS
- **REQ-01 (Ubiquitous — Zero Fake Posts):** O sistema **SHALL** consultar exclusivamente registros reais de `posts` (`status = 'active'`) e `news_articles` (`status = 'published'`) em `getUnifiedShowcasePosts`, priorizando correspondências da cidade ativa e complementando com publicações regionais reais, sem jamais retornar arrays estáticos hardcoded (`editorial-demo-*`) ou contadores de engajamento sintéticos (`5 + (idx % 7)`).
- **REQ-02 (Ubiquitous — Rotas Canônicas Reais):** Quando um usuário acionar qualquer card de publicação ou notícia na vitrine ou no feed, o sistema **SHALL** direcionar para a rota real da publicação (`/publicacao/$id`) ou da matéria (`/noticias/$slug`), corrigindo `getPostById` para ler `content_text` e `media_urls` diretamente da tabela `posts`.
- **REQ-03 (Event-Driven — Formatos Visuais Sem Marcas de Terceiros):** Quando um autor criar ou visualizar uma publicação com múltiplas mídias ou formatos avançados, o sistema **SHALL** disponibilizar e renderizar os formatos nativos Waesy:
  - `trilho_horizontal` (**Galeria Deslizante**): trilho horizontal com peek de cards verticais (`3:4`) lado a lado;
  - `carrossel_unico` (**Carrossel Paginado**): quadro único deslizante com indicadores e setas;
  - `simple` / `panoramico` (**Publicação / Destaque Panorâmico**): texto natural acima de mídia única `16:9` ou vídeo com controle de áudio;
  - `grid` (**Mosaico de Fotos**): grade limpa de 2 colunas arredondadas;
  - `news` (**Notícia / Editorial**): cabeçalho minimalista + manchete e resumo acima da mídia + link inline **"Ler mais"** para a matéria completa;
  - `travel` (**Viagem / Roteiro**): itinerário origem-destino limpo.
- **REQ-04 (Ubiquitous — Estética Minimalista Limpa em Notícias e Posts):** Tanto `PostCard`, `HomePostsShowcase` quanto `NewsCard` **SHALL** apresentar cabeçalho em linha única (avatar circular + nome + selo verificado + tempo relativo), texto principal posicionado acima da mídia com gatilho inline **"Ler mais"**, mídias com cantos arredondados e barra inferior minimalista de ações táteis (`>= 44px`).
- **REQ-05 (State-Driven — Seções Configuráveis em Marketplaces e Vitrines):** Enquanto uma seção do tipo `social_posts_vitrine` (na Home) ou `social_posts_rail` (em superfícies de marketplace) estiver ativa no CMS, o sistema **SHALL** respeitar título, subtítulo e visibilidade configurados pelo Admin Master.

## 3. Invariantes e Evidências Esperadas
- Invariantes: B.20 (CMS Bilateral), B.25 (Parâmetros Server Functions), B.27 (Avatar Direto com Fallback), B.30 (Integridade Visual do Feed Social).
- Verificação: `npm run typecheck` (Exit Code 0), `npx vitest run src/routes/__tests__/home-cms-and-bento-grid.test.ts` (100% Pass), `node scripts/design-lint.mjs --ratchet` (0 regressões), `npm run build` e deploy Cloudflare Pages.
