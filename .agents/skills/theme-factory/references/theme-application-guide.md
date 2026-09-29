# Guia de Aplicação de Temas em Artefatos (Theme Application Guide)

> **Objetivo:** Métodos práticos para injetar as especificações de tema em slides, páginas HTML, relatórios em Markdown e componentes React.

---

## 1. Aplicação em CSS Variables (Web & Landing Pages)

```css
:root {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-primary: #0284c7;
  --color-secondary: #06b6d4;
  --color-accent: #38bdf8;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

---

## 2. Aplicação em Apresentações de Slides (Marp / Reveal.js)

```markdown
---
marp: true
theme: gaia
_class: lead
backgroundColor: #0f172a
color: #f8fafc
---

# Título da Apresentação
### Subtítulo com Fonte do Tema
```
