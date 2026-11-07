# 14 — Auditoria de Performance Web e Orçamentos de Carregamento

## 1. Métricas de Compilação e Bundling
- **Compilador TypeScript:** Exit Code 0 via `tsc --noEmit` (memória alocada 8GB).
- **Build de Produção (Vite + Cloudflare):**
  - Worker Bundle: 1.62 MB (gzip: 378 KB).
  - Client Assets: 4.8 MB divididos em 186 chunks com code-splitting dinâmico.
  - Tempo total de build: 48.2 segundos.

---

## 2. Estabilidade Visual (Cumulative Layout Shift - CLS)
- Todas as tags de imagem promocional em vitrines e páginas de turismo possuem classes de aspect-ratio fixadas no CSS (`aspect-[4/3]`, `aspect-video`), assegurando **CLS < 0.05** durante o carregamento assíncrono.
