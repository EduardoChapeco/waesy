---
name: web-performance
description: "Optimize web performance for faster loading and better user experience. Use when asked to 'speed up my site', 'optimize performance', 'reduce load time', 'fix slow loading', 'improve page speed', or 'performance audit'."
---

# Web Performance & Core Web Vitals Optimization Protocol

> **Missão:** Impor excelência milimétrica de desempenho em tempo de carregamento e tempo de execução (runtime), maximizando as métricas dos **Core Web Vitals** (LCP < 2.5s, INP < 200ms, CLS < 0.1, TTFB < 800ms) através de orçamentos rígidos de peso de página, Speculation Rules, View Transitions, virtualização nativa e otimização cirúrgica de mídia e código.

---

## ⚡ 1. Orçamento de Desempenho (Performance Budget)

| Recurso | Orçamento Máximo | Justificativa Técnica de BigTech |
| --- | --- | --- |
| **Peso Total da Página** | **< 1,5 MB** | Carregamento completo em redes móveis 3G/4G em ~3 a 4 segundos. |
| **JavaScript (comprimido)** | **< 300 KB** | Reduz tempo de parse e compilação V8 da thread principal. |
| **CSS (comprimido)** | **< 100 KB** | Elimina bloqueio crítico de renderização da árvore de render. |
| **Imagens Acima da Dobra (Hero/LCP)** | **< 500 KB** | Impacto direto no Largest Contentful Paint (LCP < 2.5s). |
| **Fontes Web** | **< 100 KB** | Prevenção absoluta de FOIT (texto invisível) e FOUT (texto instável). |
| **Scripts de Terceiros (Third-Party)** | **< 200 KB** | Prevenção de latência não controlada e drenagem de bateria. |

---

## 🚀 2. O Caminho Crítico de Renderização (Critical Rendering Path)

### Resposta de Servidor & Edge Network
- **TTFB < 800ms:** Servir HTML estático ou SSR a partir da borda da Cloudflare CDN com cache inteligente.
- **Compressão Brotli/Gzip:** Priorizar Brotli (`br`), que reduz arquivos de texto em 15% a 20% a mais que Gzip.
- **HTTP/2 e HTTP/3:** Multiplexação de conexões com zero head-of-line blocking.
- **HTTP 103 Early Hints:** Enviar cabeçalho `Link: </hero.webp>; rel=preload; as=image` enquanto o servidor monta a resposta principal, acelerando o LCP em 20-30%.

### Carregamento de Recursos & Especulação
- **Pré-conexão para origens críticas:**
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```
- **Preload de imagem LCP & Fontes:**
  ```html
  <link rel="preload" href="/hero.webp" as="image" fetchpriority="high">
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
  ```
- **Navegação Instantânea com Speculation Rules API:**
  ```html
  <script type="speculationrules">
  {
    "prerender": [
      {
        "where": { "href_matches": "/*" },
        "eagerness": "moderate"
      }
    ]
  }
  </script>
  ```

---

## 🎨 3. Mídia & Imagens: AVIF, WebP e Prioridade LCP

- **Seleção de Formatos:** Formato moderno **AVIF** para navegadores modernos (92%+ de suporte) com fallback para **WebP** (97%+).
- **Elemento `<picture>` Responsivo com `srcset` e `sizes`:**
  ```html
  <picture>
    <source type="image/avif" srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w" sizes="(max-width: 640px) 100vw, 50vw">
    <source type="image/webp" srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w" sizes="(max-width: 640px) 100vw, 50vw">
    <img src="/hero-800.jpg" width="1200" height="600" alt="Destaque" fetchpriority="high" loading="eager" decoding="sync">
  </picture>
  ```
- **Regra de Prioridade LCP:**
  - Imagem do Hero (acima da dobra): `fetchpriority="high"`, `loading="eager"`, `decoding="sync"`.
  - Imagens abaixo da dobra: `loading="lazy"`, `decoding="async"`.

---

## 🏎️ 4. Otimização de JavaScript & Eficiência em Runtime

- **Adiar Scripts Não-Críticos:** `defer`, `async` e `<script type="module">`.
- **Code Splitting Granular:** Rotas isoladas com TanStack Router e carregamento sob demanda (`lazy`).
- **Eliminação de Layout Thrashing:** Agrupar todas as leituras de layout antes das escritas:
  ```javascript
  // ✅ Batch reads, then batch writes
  const heights = elements.map(el => el.offsetHeight);
  elements.forEach((el, i) => { el.style.height = `${heights[i] + 10}px`; });
  ```
- **Operações Otimizadas & RAF:** Debounce/throttle em eventos de scroll e resize; `requestAnimationFrame` para transições contínuas.
- **Virtualização Nativa com CSS `content-visibility`:**
  ```css
  .virtual-list-item {
    content-visibility: auto;
    contain-intrinsic-size: 0 80px;
  }
  ```
- **Navegações Fluidas com View Transitions API:**
  ```css
  @view-transition {
    navigation: auto;
  }
  ```

---

## 🗄️ 5. Estratégia de Cache & Headers HTTP

```http
# HTML / SSR (validação frequente)
Cache-Control: no-cache, must-revalidate

# Ativos Estáticos com Hash Imutável (JS, CSS, Imagens com hash de build)
Cache-Control: public, max-age=31536000, immutable

# Ativos Sem Hash (Imagens genéricas, ícones)
Cache-Control: public, max-age=86400, stale-while-revalidate=604800

# Respostas de API Privadas / Multi-Tenant
Cache-Control: private, no-store, max-age=0
```

---

## 📊 6. Metas dos Core Web Vitals (Lighthouse & CrUX)

| Métrica | Meta Aceitável | Excelente (P95) | Ferramenta de Aferição |
| --- | --- | --- | --- |
| **LCP (Largest Contentful Paint)** | < 2,5s | < 1,5s | Lighthouse, CrUX |
| **INP (Interaction to Next Paint)** | < 200ms | < 100ms | Web Vitals lib, Chrome DevTools |
| **CLS (Cumulative Layout Shift)** | < 0.1 | < 0.05 | Lighthouse, CrUX |
| **TTFB (Time to First Byte)** | < 800ms | < 300ms | Web Vitals lib, CDN Telemetry |
| **FCP (First Contentful Paint)** | < 1,8s | < 1,0s | Lighthouse |
| **TBT (Total Blocking Time)** | < 200ms | < 100ms | Lighthouse |

---

## 📚 Biblioteca de Referências Técnicas da Skill

- [`references/performance-budgets.md`](references/performance-budgets.md): Orçamentos de bytes e limites de tráfego.
- [`references/critical-rendering-path.md`](references/critical-rendering-path.md): TTFB, Early Hints (103), preconnect e Speculation Rules.
- [`references/image-media-optimization.md`](references/image-media-optimization.md): AVIF, WebP, responsive picture e prioridade LCP.
- [`references/javascript-runtime-efficiency.md`](references/javascript-runtime-efficiency.md): Tree shaking, code splitting, prevenção de layout thrashing e virtualização.
- [`references/font-loading-strategies.md`](references/font-loading-strategies.md): WOFF2, fontes variáveis, font-display: swap e unicode-range.
- [`references/caching-cdn-service-workers.md`](references/caching-cdn-service-workers.md): Headers de cache, stale-while-revalidate e Cloudflare edge caching.
- [`references/core-web-vitals-benchmarking.md`](references/core-web-vitals-benchmarking.md): Guia de instrumentação de LCP, INP, CLS e relatórios Lighthouse.
