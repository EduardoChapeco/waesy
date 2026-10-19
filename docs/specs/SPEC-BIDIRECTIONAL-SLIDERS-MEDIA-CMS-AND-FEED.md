# SPEC-BIDIRECTIONAL-SLIDERS-MEDIA-CMS-AND-FEED: Especificação Canônica de Sliders Fino, Recorte Bidirecional, Seções Modulares e Feed Adaptativo

## 1. Metadados e Contexto
- **ID:** SPEC-BIDIRECTIONAL-SLIDERS-MEDIA-CMS-AND-FEED
- **Data:** 2026-10-19
- **Autor:** Agente BigTech Waesy / Equipe de Arquitetura de Interface
- **Status:** APROVADO
- **Invariantes Vinculadas:** B.1, B.2, B.4, B.6, B.8, B.20, B.28, B.29, B.30, B.32, B.38

---

## 2. Visão Geral e Problema Resolvido
A auditoria forense identificou 5 pontos críticos no ciclo de vida visual e de mídia da plataforma:
1. **Sliders Widescreen Desproporcionais:** No desktop, contêineres com `aspect-banner-cinema` (`16/9`) atingem até 1080px de altura em telas grandes, cobrindo a viewport inteira e cortando textos laterais por conta de `object-cover`.
2. **Quebra de Mídia Cruzada entre Dispositivos:** Um recorte feito para desktop quebra no mobile (ou vice-versa), gerando cortes agressivos ou barras vazias por ausência de pipeline bidirecional com `<picture>`.
3. **Cards Estreitos no Mobile:** Cards em trilhos horizontais com `w-56` (224px) x `h-96` (384px) geram um formato excessivamente vertical ("fino demais").
4. **Corte de Vídeos Verticais no Feed:** Vídeos em formato de Story/Reels (9:16) no feed sofrem cefa de mais de 70% por caírem em contêineres horizontais 16:10 com `object-cover`.
5. **CMS de Vitrines com Limitação de Formatos:** Ausência de seções personalizáveis estilo botão (com ícone ou background), falta de biblioteca de templates para todas as vitrines e falta de controles de agendamento/validade.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1. Sliders e Banners Fino Bidirecionais
- **[R-SLIDER-01 Ubíquo]:** O sistema DEVE fornecer o aspect ratio canônico `aspect-banner-slim` (`28/9` ou `3.2/1` com teto `max-h-72 lg:max-h-80`) para palcos desktop widescreen.
- **[R-SLIDER-02 Conduzido por Evento]:** QUANDO o usuário visualizar um slider no desktop, o sistema DEVE priorizar `image_desktop_url` com fallback para `image_url`.
- **[R-SLIDER-03 Conduzido por Evento]:** QUANDO o usuário visualizar um slider no mobile, o sistema DEVE priorizar `image_mobile_url` com fallback para `image_url`, renderizado em `aspect-banner-cinema` ou `aspect-banner-ifood`.
- **[R-SLIDER-04 Opcional]:** CASO a imagem possua dimensões específicas de corte, o renderizador DEVE utilizar a tag nativa `<picture>` com `<source media="(max-width: 767px)">` garantindo Cumulative Layout Shift nulo (CLS < 0.05).

### 3.2. Ferramenta de Recorte & Media Uploader
- **[R-CROP-01 Ubíquo]:** O `ImageCropperDialog` DEVE disponibilizar os presets canônicos: `28:9 (Desktop Fino)`, `21:9 (Panorâmico)`, `16:9 (Widescreen)`, `4:5 (Retrato Threads)`, `9:16 (Story/Reels)`, `1:1 (Quadrado)`, `4:3 (Fotográfico)` e `Livre`.
- **[R-CROP-02 Conduzido por Evento]:** QUANDO ativado o modo bidirecional no uploader do CMS, o sistema DEVE permitir recortar sequencialmente a versão Desktop e a versão Mobile a partir de um único upload de imagem original.

### 3.3. Cards de Produtos, Serviços e Classificados no Mobile
- **[R-CARD-01 Ubíquo]:** Os cards em trilhos horizontais mobile (`HomeMobileNativeApp`) DEVEM possuir largura mínima de `w-68` a `w-72` (272px a 288px), mantendo proporção áurea com a altura.
- **[R-CARD-02 Conduzido por Estado]:** ENQUANTO renderizando no mobile, a imagem do card DEVE preservar enquadramento proporcional sem cortes de produto.

### 3.4. Feed Social & Vídeos Verticais
- **[R-FEED-01 Conduzido por Evento]:** QUANDO o usuário criar uma publicação no feed, o sistema DEVE permitir selecionar a proporção do post: `1:1`, `4:5`, `16:9` ou `9:16 (Story/Reels)`.
- **[R-FEED-02 Conduzido por Evento]:** QUANDO renderizar um post com vídeo vertical (`9:16` ou flag `aspect_ratio="9:16"`), o componente `PostCard` DEVE aplicar contêiner vertical `aspect-post-moment` com `max-h-[580px] mx-auto` e `object-contain bg-black/95` ou `object-cover` limpo, eliminando qualquer cefa de conteúdo.

### 3.5. CMS Admin Master & Seções Modulares
- **[R-CMS-01 Ubíquo]:** O CMS DEVE suportar os novos tipos de layout: `cards_action_grid` (botões com ícone ou background personalizável) e `slim_slider`.
- **[R-CMS-02 Ubíquo]:** O CMS DEVE permitir programar início (`starts_at`) e fim/auto-arquivamento silencioso (`ends_at` / `auto_archive_at`) para seções e banners.
- **[R-CMS-03 Ubíquo]:** Seções e templates criados DEVEM ser passíveis de replicação e ativação em qualquer vitrine do ecossistema (`home`, `mercado`, `gastronomia`, `turismo`, `classificados`, etc.).

---

## 4. Plano de Execução Atômica
1. **Migração SQL:** Criação de `supabase/migrations/20270129000001_bidirectional_media_cms_and_slim_sliders.sql`.
2. **Design Tokens & CSS:** Inclusão de `aspect-banner-slim` e classes auxiliares em `src/styles.css`.
3. **Recorte & Media Uploader:** Atualização de `ImageCropperDialog.tsx` e `media-uploader.tsx`.
4. **BFF Server Functions:** Atualização de `admin-home-cms.functions.ts`, `banner.functions.ts`, e `social.functions.ts`.
5. **Renderizadores de Vitrine:** Atualização de `MetamorphicBannerSlider.tsx`, `BannerHeroCarousel.tsx`, `HomeDesktopWebApp.tsx` e `HomeMobileNativeApp.tsx`.
6. **Feed Social:** Atualização de `post-creation-drawer.tsx` e `post-card.tsx`.
7. **Admin Master UI:** Atualização de `admin-master.banners.tsx` e `admin-master.home-editor.tsx`.
8. **Validação & Testes:** Verificação de testes unitários, typecheck e build de produção.
