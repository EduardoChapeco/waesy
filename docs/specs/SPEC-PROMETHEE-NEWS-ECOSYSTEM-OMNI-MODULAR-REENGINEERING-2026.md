# SPEC: Reengenharia Editorial Prométhée, Mineração Real e Decomposição Modular no Omni Builder

- **ID:** SPEC-PROMETHEE-NEWS-ECOSYSTEM-OMNI-MODULAR-REENGINEERING-2026
- **Data:** 2026-10-27
- **Status:** Aprovada
- **Escopo:** Portal demonstrativo `/valeagoranews`, motor de ingestão e curadoria mecânica de notícias reais (`news_articles`), estúdio de posts e carrosséis PNG com proxy seguro de imagens, proposta comercial fullscreen mobile e blocos modulares do Omni Builder com suíte multipágina estilo Wix.

---

## 1. Contexto e Problema

1. O portal `/valeagoranews` mapeava propriedades inexistentes (`cover_image_url` em vez de `cover_media_url` e `content` em vez de `content_sections`) do DTO canônico `NewsArticleDTO`, resultando em ausência de fotografias reais nas matérias mineradas.
2. Controles de cabeçalho com texto no mobile comprimiam o masthead "Vale Agora News", e o botão de publicação cidadã continha rótulo textual ("Publicar") em vez de operar como botão fixo somente com ícone `+`.
3. Rótulos de abas, cabeçalhos de seção e títulos da proposta comercial utilizavam títulos compostos extensos, violando `AGENTS.md` B.8 (limite de 6 palavras e proibição de títulos compostos).
4. O modal de proposta comercial no mobile abria como caixa comprimida com colisão de badge no Card 5, carecendo de visualização tela cheia (`100dvh`), botão `X` discreto (`size-11 min-h-11 shrink-0`), linguagem comercial acessível e diagrama visual do fluxo de mineração e squads editoriais.
5. No Omni Builder, o portal existia apenas como bloco monolítico (`news_promethee_portal`), impedindo edição individual de cabeçalho, navegação, plantão, feed, publicidade, leitor e rodapé, bem como provisionamento multipágina interligado no domínio do cliente.

---

## 2. Requisitos em Sintaxe EARS

- **REQ-01 (Ubiquitous — Ingestão Real e Anti-Fake):** O sistema DEVE alimentar `/valeagoranews` e os blocos editoriais do Omni Builder a partir de matérias reais publicadas em `public.news_articles` (mineradas via feeds RSS regionais/nacionais e extrator mecânico de `og:image` / JSON-LD `NewsArticle`), exibindo fotografias jornalísticas autênticas quando presentes e renderizando cartão tipográfico limpo (sem caixa de mídia falsa e sem imagens de estoque Unsplash/Pexels) quando o registro for puramente textual (`AGENTS.md` B.8 e B.33).
- **REQ-02 (Ubiquitous — Cabeçalho Minimalista e Navegação Fixa `+`):** O cabeçalho de `/valeagoranews` e `PrometheeNewsHeaderBlock` DEVE exibir o domo vetorial e a marca "Vale Agora News", convertendo ações utilitárias em controles somente com ícone (`size-11 min-h-11`) em viewports mobile (`< 600px`), e mantendo na régua de editorias um botão fixo à esquerda (`sticky left-0`, `size-11 min-h-11`) contendo exclusivamente o ícone `+` ao lado de abas simples em linha horizontal contínua (`AGENTS.md` B.26 e B.39).
- **REQ-03 (Event-Driven — Filtro Geográfico Real com GPS):** QUANDO o leitor acionar o seletor de localização no portal ou nos blocos Prométhée, o sistema DEVE reutilizar a infraestrutura canônica de geolocalização da Waesy (`CANONICAL_CITIES`, `resolveGeoCoordinates`, `getStoredLocation`, `syncClientGeoCookie`), contemplando os municípios do Vale do Paraíba, Litoral Norte e Serra da Mantiqueira com detecção GPS real e priorização regional imediata.
- **REQ-04 (Event-Driven — Proposta Comercial Fullscreen Mobile):** QUANDO o visitante abrir a proposta comercial em dispositivo móvel, o sistema DEVE renderizar superfície em tela cheia (`fixed inset-0 h-dvh w-screen`) com `safe-top`, botão circular discreto de saída (`X`, `size-11 min-h-11 shrink-0`), títulos curtos sem composição (`<= 6` palavras), zero badges sobrepostos, texto comercial persuasivo contemplando todos os módulos Waesy (Portal e Builder Visual, Workspace de Gestão, Motor de Publicidade Regional ADS, Eventos e Patrocinados, Painel de Dados, Radar de Notícias + Squads Editoriais com fluxo visual, Estúdio de Posts PNG e Domínio Próprio) e quadro transparente de investimento.
- **REQ-05 (Event-Driven — Estúdio de Posts e Carrosséis PNG com Capa Real):** QUANDO o usuário selecionar qualquer notícia no Estúdio de Posts PNG (formato Post Único ou Carrossel de 4 Lâminas), o sistema DEVE carregar a fotografia jornalística real da matéria via BFF seguro contra CORS (`fetchNewsImageDataUrlFn`) e exportar arquivos `.PNG` em alta resolução (`1080x1350` ou `1080x1080`) via `<canvas>`, além de disponibilizar template jornalístico integrado no Studio do Workspace.
- **REQ-06 (Ubiquitous — Decomposição Modular e Suíte Wix no Omni Builder):** O Omni Builder DEVE disponibilizar blocos individuais editáveis (`news_promethee_header`, `news_promethee_nav`, `news_promethee_breaking`, `news_promethee_feed`, `news_promethee_ad_slot`, `news_promethee_article_reader`, `news_promethee_footer`) preservando `news_promethee_portal` para retrocompatibilidade, e permitir instalar a suíte multipágina de notícias (`NEWS_WIX_APP_PAGES` / `provisionNewsWixAppSuiteFn`) hidratada com `newsArticles` e `sponsors` reais no domínio do próprio cliente.
- **REQ-07 (Ubiquitous — Assinatura Institucional Discreta):** O rodapé do portal demonstrativo e do bloco `news_promethee_footer` DEVE exibir de forma discreta e minimalista o selo "Feito com Waesy" acompanhado da marca oficial `Logo`.

---

## 3. Invariantes e Gates de Verificação

1. **Zero Regressão Visual (Design Lint):** `node scripts/design-lint.mjs --ratchet` com `0` violações P0 e zero aumento em P1 (zero `!important`, zero hex/rgb literal em `src/components/` e `src/routes/`, zero classes arbitrárias entre colchetes, grade de 4px, alvos `>= 44px` e `:focus-visible`).
2. **Integridade de BFF (B.25):** Desestruturação explícita e defensiva de parâmetros nas Server Functions criadas/atualizadas, validada por `npm run check:bff` e testes unitários.
3. **Compilação Estrita e Build:** `npm run typecheck` (Exit Code 0), suíte Vitest aprovada e `npm run build` gerando bundle de produção limpo.
