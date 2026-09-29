# ATIVOS.md — Matriz Canônica de Ativos & Pipeline Único (Waesy Platform)

> FONTE ÚNICA DE VERDADE para proporções, resoluções, limites de peso, convenções de armazenamento e ciclo de vida de ativos visuais em toda a plataforma Waesy.

---

## 1. Matriz Canônica de Especificações de Ativos

| Tipo de Ativo | Proporção (Aspect) | Resolução Canônica | Formatos Permitidos | Limite de Peso | Destino / Consumo | Bucket Padrão |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Capa de Perfil** | `21:9` (2.33:1) | 2100×900 px | WebP, PNG, JPEG | 10 MB | Topo do perfil civil, perfil de criador e cabeçalho hero de loja | `banners` / `cms-media` |
| **Imagem de Cartão** | `16:9` (1.78:1) | 1600×900 px | WebP, PNG, JPEG | 8 MB | Vitrine de classificados, cards do Places, kit de marca e busca | `classifieds` / `store-assets` |
| **Avatar / Logo** | `1:1` (1.00:1) | 512×512 px | WebP, PNG, SVG | 5 MB | Identidade civil, listas, comentários, favicon, logo de loja | `avatars` / `store-assets` |
| **Lockup Horizontal** | `4:1` (4.00:1) | 1600×400 px | WebP, PNG, SVG | 5 MB | Cabeçalho institucional, faturas e materiais gráficos | `brand-assets` |
| **Produto** | `1:1` e `4:5` | 1200×1200 px / 1200×1500 px | WebP, PNG, JPEG | 10 MB | Ficha técnica de catálogo, anúncio e galeria de e-commerce | `product-media` |
| **Imóvel** | `4:3` e `16:9` | 1600×1200 px / 1600×900 px | WebP, PNG, JPEG | 12 MB | Ficha imobiliária, planta baixa e tour de listagem | `classifieds` |
| **Vídeo Curto** | `9:16` e `16:9` | 1080×1920 px / 1920×1080 px | MP4, WebM, MOV | 100 MB | Anúncio de vídeo, stories imersivos e destaques de mural | `post-media` |
| **Documento** | Livre | Variável (PDF, DOCX) | PDF, DOC, DOCX, CSV, TXT | 5 MB máx | Verificação KYC, contratos, CNH/CRLV e comprovação fiscal | `legal-documents` / `receipts` |

---

## 2. Princípios Invioláveis do Pipeline (P1 a P6)

### P1 — Uma Especificação
Nenhum componente ou rota declara proporção, dimensão ou limite próprio hardcoded. Valores duplicados em telas diferentes são expressamente proibidos. Toda interface deve consumir as constantes canônicas de `PRESET_ASPECT_RATIOS` e desta documentação.

### P2 — Um Caminho de Captura
O perfil civil (pessoa física) e o perfil comercial (loja, empresa, criador) utilizam o mesmo componente (`ImageUpload`), o mesmo modal de enquadramento (`ImageCropperDialog`), o mesmo validador MIME (`validateMimeType`) e o mesmo serviço backend de upload (`storage.functions.ts`).

### P3 — Derivação Explícita
Para capa (`21:9`) e cartão (`16:9`):
- O upload pode ser fornecido diretamente com enquadramento dedicado.
- Na ausência do ativo de cartão específico, a vitrine deriva automaticamente da capa aplicando recorte central com âncora `object-center` e proporção `16:9`, sem distorção anamórfica (`object-cover`).

### P4 — Ponto Focal
Toda derivação sem âncora ajustável é proibida de cortar elementos centrais (rostos e logotipos). O padrão é centralizado com margem de segurança de 10% em todas as bordas.

### P5 — Nunca Sobrescrever
Todo envio gera um novo caminho determinístico e timestamped (`folder/timestamp-random.ext`). O envio nunca substitui o blob anterior diretamente no mesmo caminho, evitando envenenamento de cache do navegador e exibição de imagem desatualizada. A referência antiga no registro do banco de dados é atualizada atomicamente.

### P6 — Quando Falta (Fallback Ergonômico)
Todo ponto de consumo possui estado de ausência com proporção reservada (`aspect-[21/9]`, `aspect-video`, `aspect-square`). Proibido renderizar caixas quebradas ou causar Cumulative Layout Shift (CLS). Na ausência de imagem, renderiza-se o container com background sutil (`bg-muted/40`) e ícone contextualizado.

---

## 3. Convenção Canônica de Caminhos de Armazenamento (F4)

Padrão único e determinístico:
```
{tipo-de-dono}/{id-do-dono}/{tipo-de-ativo}/{timestamp}_{hash}.{ext}
```

Exemplos:
- Avatar de usuário: `profiles/{user_id}/avatar/{timestamp}_{random}.webp`
- Capa de perfil de usuário: `profiles/{user_id}/cover/{timestamp}_{random}.webp`
- Logo de loja: `stores/{store_id}/logo/{timestamp}_{random}.webp`
- Capa de loja: `stores/{store_id}/cover/{timestamp}_{random}.webp`
- Foto de produto: `stores/{store_id}/products/{product_id}/{timestamp}_{random}.webp`
- Mídia de anúncio/classificado: `classifieds/{owner_id}/{classified_id}/{timestamp}_{random}.webp`
- Mídia de post social: `social/{user_id}/{post_id}/{timestamp}_{random}.webp`
- Documento KYC: `identity/{user_id}/kyc/{timestamp}_{random}.pdf`
