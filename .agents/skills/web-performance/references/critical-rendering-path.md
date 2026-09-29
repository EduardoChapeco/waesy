# Caminho Crítico de Renderização & Early Hints

Otimização de cada etapa entre o clique na URL e a primeira pintura na tela.

## 1. Otimização do TTFB (Time to First Byte)
- Edge Caching na Cloudflare: Cache de respostas HTML para páginas públicas com `stale-while-revalidate`.
- Compressão Brotli nível 6 ou Gzip nível 9.

## 2. HTTP 103 Early Hints
- Emitir cabeçalhos 103 Link antes da resposta 200 para antecipar o download do CSS crítico e imagem de Hero.

## 3. Speculation Rules API
- Configurar regras de pré-renderização moderada para navegações subsequentes baseadas no hover do cursor (>200ms).
