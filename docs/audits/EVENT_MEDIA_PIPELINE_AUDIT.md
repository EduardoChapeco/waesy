# EVENT_MEDIA_PIPELINE_AUDIT — Auditoria do Pipeline de Mídia de Eventos

## 1. Separação Funcional de Mídias no Domínio de Eventos

| Canal de Mídia | Origem no Editor / DB | Propriedade em `EventDomainViewModel` | Renderização na Vitrine Pública | Proporção & Anti-CLS |
| :--- | :--- | :--- | :--- | :--- |
| **Capa Principal (Hero)** | `eventBannerUrl` (`attributes.banner_image_url` ou `cover_image`) | `event.hero_image_url` + `event.hero_focal_point` (`center`, `top`, `bottom`) | Topo da página sem gradiente escuro sobreposto | `aspect-[16/9] sm:aspect-[21/9]` fixo no CSS |
| **Galeria Exclusiva do Evento** | `images` (`classifieds.images` + `attributes.gallery_images`) | `event.gallery_images` | Seção `#section-midia` (**Mídia e Galeria do Evento**) com Grid + Lightbox Dialog | `aspect-[4/3]` uniforme |
| **Story Vertical (9:16)** | `eventStoryUrl` (`attributes.story_url`, `story_auto_open`) | `event.story_url`, `event.story_auto_open` | Botão `Story (9:16)` no Hero e na seção de Mídia + Dialog Vertical 9:16 (`<video>` ou `<img>`) | `aspect-[9/16]` fixo |
| **Vídeo / Aftermovie** | `eventVideoUrl` (`attributes.video_url`) | `event.video_url` | Player nativo `<video>` ou embed YouTube na seção `#section-midia` | `aspect-video` (16:9) |
| **Fotos de Palestrantes & Logos** | `speaker.avatar_url`, `sponsor.logo_url`, `eventHostAvatarUrl` | `speaker.photo_url`, `sponsor.logo_url`, `org.avatar_url` | Cards de Palestrantes (`object-cover`), Patrocinadores (`object-contain`) e Organizadores | `size-16` / `h-32` sem distorção |
