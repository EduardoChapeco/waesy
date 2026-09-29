# 04-ativos.md — Matriz de Ativos, Proporções Canônicas & Consumo em UI

| Tipo de Ativo | Proporção (Aspect) | Resolução Canônica | Formatos Permitidos | Limite de Peso | Bucket Padrão | Pontos de Consumo em UI |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Capa / Banner Hero** | `21:9` (2.33:1) | 2100×900 px | WebP, PNG, JPEG | 10 MB | `banners` / `cms-media` | Topo do perfil civil, header do workspace, vitrine pública de loja |
| **Imagem de Cartão** | `16:9` (1.78:1) | 1600×900 px | WebP, PNG, JPEG | 8 MB | `store-assets` / `classifieds` | Cards de busca, vitrine do Guia Comercial, cards de lugares no Places |
| **Logo / Avatar** | `1:1` (1.00:1) | 512×512 px | WebP, PNG, SVG | 5 MB | `avatars` / `store-assets` | Alternador de perfil, menu lateral, favicon, avatar de comentários |
| **Lockup Horizontal** | `4:1` (4.00:1) | 1600×400 px | WebP, PNG, SVG | 5 MB | `brand-assets` | Cabeçalho institucional, brand kit, faturas e recibos PDF |
| **Foto de Produto** | `1:1` e `4:5` | 1200×1200 px / 1200×1500 px | WebP, PNG, JPEG | 10 MB | `product-media` | Cardápio, catálogo de produtos, galeria e checkout PDV |
| **Mídia de Imóvel / Veículo**| `4:3` e `16:9` | 1600×1200 px / 1600×900 px | WebP, PNG, JPEG | 12 MB | `classifieds` | Ficha técnica de anúncio, galeria de fotos, laudo cautelar |
| **Vídeo Curto / Stories** | `9:16` e `16:9` | 1080×1920 px / 1920×1080 px | MP4, WebM | 100 MB | `post-media` | Feed social, destaques da comunidade, demonstração de produto |
| **Documentos & KYC** | Livre (A4) | Variável (PDF) | PDF, DOCX, JPEG | 10 MB | `legal-documents` | Painel de compliance, alvarás da empresa, contratos assinados |

---

## 1. Implementação dos Princípios P1 a P6

1. **P1 — Especificação Centralizada:**
   - Consumo exclusivo das constantes `PRESET_ASPECT_RATIOS` e tokens de layout.
   - Proibido declarar dimensões mágicas arbitrárias em componentes.
2. **P2 — Captura Unificada:**
   - Ambas as personas (Pessoa e Empresa) utilizam o componente canônico `ImageUpload` acoplado ao modal de corte `ImageCropperDialog`.
3. **P3 — Derivação Explícita de Cartão:**
   - Na ausência do ativo específico de cartão (`16:9`), o renderizador recorta a capa (`21:9`) com âncora `object-center` e classe `object-cover`, preservando elementos centrais e impedindo distorção anamórfica.
4. **P4 — Margem de Segurança Focal:**
   - Logos e rostos devem manter 10% de margem interna de segurança em relação às bordas do recorte para prevenir cortes em telas compactas (<600px).
5. **P5 — Imutabilidade de Blob:**
   - Todo upload gera um identificador único com timestamp e hash aleatório (`{timestamp}_{random}.webp`). Blobs anteriores nunca são sobrescritos in-place, eliminando envenenamento de cache HTTP e CDN.
6. **P6 — Prevenção de Layout Shift (Zero CLS):**
   - Todos os pontos de consumo reservam previamente a caixa dimensional (`aspect-[21/9]`, `aspect-video`, `aspect-square`) com container de fallback sutil (`bg-muted/40`) e ícone semântico.
