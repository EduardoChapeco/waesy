# Otimização de Imagens & Mídia Moderna

As imagens representam frequentemente mais de 60% do peso da página.

## Formatos e Compressão
- **AVIF:** Maior eficiência de compressão para fotografias com cores ricas.
- **WebP:** Compatibilidade universal em navegadores com suporte a transparência e perda/sem perda.
- **SVG:** Obrigatório para ícones e logotipos vetoriais.

## Padrão Responsivo <picture>
Sempre forneça versões responsivas de 400w, 800w e 1200w com atributo `sizes` configurado para evitar downloads desnecessários de alta resolução no mobile.

## Prioridade LCP
- O elemento visual que compõe o LCP (geralmente a imagem do banner) deve ter:
  `fetchpriority="high" loading="eager" decoding="sync"`
- Todas as demais imagens devem ter:
  `loading="lazy" decoding="async"`
