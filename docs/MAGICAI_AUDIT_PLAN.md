# 🧠 MAGICAI — AUDITORIA COMPLETA, DESIGN SYSTEM & PLANO DE INTEGRAÇÃO
> Versão: 1.0 | Data: Outubro 2026 | Tipo: SaaS AI Platform (Laravel + PHP 8.x)  
> Referência: MagicAI v11.2 (CodeCanyon #45408109)

---

## ÍNDICE

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Design System — Auditoria Completa](#2-design-system--auditoria-completa)
3. [Mapa de Módulos Completo](#3-mapa-de-módulos-completo)
4. [Camada de IA — Orquestrador e Integrações](#4-camada-de-ia--orquestrador-e-integrações)
5. [Provedores de IA — Matriz Completa](#5-provedores-de-ia--matriz-completa)
6. [Fluxos Funcionais por Módulo](#6-fluxos-funcionais-por-módulo)
7. [Como Replicar em Projeto Existente](#7-como-replicar-em-projeto-existente)
8. [Templates e Layouts](#8-templates-e-layouts)
9. [Plano de Implementação Rápida](#9-plano-de-implementação-rápida)
10. [Recomendações Finais](#10-recomendações-finais)

---

## 1. VISÃO GERAL DA ARQUITETURA

### Stack Tecnológico Confirmado

```
Backend:     Laravel 10/11 (PHP 8.x)
Database:    MySQL 8.x
Frontend:    Alpine.js + Livewire + Vanilla JS
CSS:         TailwindCSS (com tema customizado)
Queue:       Laravel Queue (Redis/Database)
Storage:     Local / AWS S3 / Cloudflare R2
Cache:       Redis
Auth:        Laravel Sanctum + OAuth2 (Google, GitHub, Facebook)
API:         REST API própria + múltiplos providers externos
WebSockets:  Laravel Reverb / Pusher (para streaming de respostas)
```

### Diagrama de Arquitetura Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                        │
│   Alpine.js + Livewire + TailwindCSS + SSE (Server-Sent Events) │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/SSE
┌─────────────────────────────▼───────────────────────────────────┐
│                    LARAVEL APPLICATION                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Routes  │  │  Middleware│  │Controllers│  │   Services    │  │
│  └────┬─────┘  └────┬─────┘  └─────┬────┘  └───────┬───────┘  │
│       └─────────────┴───────────────┴────────────────┘          │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │               AI ORCHESTRATOR (Core)                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │  │
│  │  │  Router  │ │Credit Mgr│ │  Queue   │ │ Stream Mgr  │ │  │
│  │  └────┬─────┘ └──────────┘ └──────────┘ └─────────────┘ │  │
│  └────────┼──────────────────────────────────────────────────┘  │
│           │                                                      │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │                  AI PROVIDER POOL                         │  │
│  │  OpenAI │ Gemini │ Claude │ Grok │ DeepSeek │ OpenRouter  │  │
│  │  ElevenLabs │ StableDiffusion │ MidJourney │ Kling │ Veo  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    DATA LAYER                             │  │
│  │  MySQL (principal) │ Redis (cache/queue) │ S3 (arquivos)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN SYSTEM — AUDITORIA COMPLETA

### 2.1 Identidade Visual Identificada

O MagicAI usa um design system que eu classifico como **"SaaS Moderno Neutro com Acento Vibrante"** — diferente do Apple HIG puro, mas incorporável ao seu sistema. Características-chave:

- **Base**: Superfícies brancas/cinza muito claro no modo claro, grafite escuro no dark mode
- **Acento primário**: Roxo/violeta (#7C3AED → Violet-600 TailwindCSS)
- **Filosofia**: Espaço generoso, hierarquia clara, iconografia minimalista
- **Influência**: Linear, Notion, Vercel — SaaS-first, não consumer-first

### 2.2 Tokens de Cor

```css
/* ============================================
   DESIGN TOKENS — MAGICAI-STYLE DESIGN SYSTEM
   Compatível com Apple HIG + SaaS Modern
   ============================================ */

:root {
  /* === PRIMITIVOS (fonte da verdade) === */
  
  /* Violeta — Acento Primário */
  --color-violet-50:  #F5F3FF;
  --color-violet-100: #EDE9FE;
  --color-violet-200: #DDD6FE;
  --color-violet-300: #C4B5FD;
  --color-violet-400: #A78BFA;
  --color-violet-500: #8B5CF6;
  --color-violet-600: #7C3AED;  /* ← PRIMÁRIO PRINCIPAL */
  --color-violet-700: #6D28D9;
  --color-violet-800: #5B21B6;
  --color-violet-900: #4C1D95;

  /* Cinzas de superfície */
  --color-gray-25:  #FAFAFA;   /* Background app */
  --color-gray-50:  #F9FAFB;   /* Sidebar bg */
  --color-gray-100: #F3F4F6;   /* Card hover */
  --color-gray-200: #E5E7EB;   /* Borders */
  --color-gray-300: #D1D5DB;   /* Input borders */
  --color-gray-400: #9CA3AF;   /* Placeholder text */
  --color-gray-500: #6B7280;   /* Label text */
  --color-gray-600: #4B5563;   /* Body text */
  --color-gray-700: #374151;   /* Strong body */
  --color-gray-800: #1F2937;   /* Heading */
  --color-gray-900: #111827;   /* Title */

  /* === SEMÂNTICOS — MODO CLARO === */
  --bg-app:           var(--color-gray-25);
  --bg-surface:       #FFFFFF;
  --bg-surface-hover: var(--color-gray-100);
  --bg-sidebar:       var(--color-gray-50);
  --bg-sidebar-active: var(--color-violet-50);

  --border-default:   var(--color-gray-200);
  --border-input:     var(--color-gray-300);
  --border-active:    var(--color-violet-300);

  --text-primary:     var(--color-gray-900);
  --text-secondary:   var(--color-gray-600);
  --text-tertiary:    var(--color-gray-400);
  --text-accent:      var(--color-violet-600);
  --text-inverse:     #FFFFFF;

  --accent-primary:   var(--color-violet-600);
  --accent-hover:     var(--color-violet-700);
  --accent-light:     var(--color-violet-100);
  --accent-ring:      rgba(124, 58, 237, 0.2);

  /* Estados */
  --color-success:    #10B981;  /* Emerald-500 */
  --color-warning:    #F59E0B;  /* Amber-500 */
  --color-error:      #EF4444;  /* Red-500 */
  --color-info:       #3B82F6;  /* Blue-500 */

  /* Gradientes temáticos (visto na imagem do Social Media Dashboard) */
  --gradient-social:  linear-gradient(135deg, #FF6B35 0%, #F7C59F 40%, #E63946 70%, #C77DFF 100%);
  --gradient-brand:   linear-gradient(135deg, var(--color-violet-600) 0%, #A855F7 100%);
  --gradient-warm:    linear-gradient(135deg, #FF8C42 0%, #FF3CAC 50%, #784BA0 100%);
  --gradient-chat:    linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 100%);
}

/* === DARK MODE === */
[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-app:           #0F0F0F;
    --bg-surface:       #1A1A1A;
    --bg-surface-hover: #252525;
    --bg-sidebar:       #141414;
    --bg-sidebar-active: rgba(124, 58, 237, 0.15);

    --border-default:   #2A2A2A;
    --border-input:     #333333;
    --border-active:    var(--color-violet-500);

    --text-primary:     #F9FAFB;
    --text-secondary:   #9CA3AF;
    --text-tertiary:    #6B7280;
    --text-accent:      var(--color-violet-400);
  }
}
```

### 2.3 Tipografia

```css
/* === TIPOGRAFIA === */
/* MagicAI usa Inter como fonte principal — combina com Apple HIG (SF Pro) */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  /* Família */
  --font-sans:   'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
                 'Segoe UI', sans-serif;
  --font-mono:   'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  /* Escala tipográfica (8pt grid) */
  --text-xs:     0.75rem;    /* 12px — labels, badges */
  --text-sm:     0.875rem;   /* 14px — body secundário, sidebar items */
  --text-base:   1rem;       /* 16px — body principal */
  --text-lg:     1.125rem;   /* 18px — subheadings */
  --text-xl:     1.25rem;    /* 20px — card titles */
  --text-2xl:    1.5rem;     /* 24px — section titles */
  --text-3xl:    1.875rem;   /* 30px — page headings */
  --text-4xl:    2.25rem;    /* 36px — hero titles */
  --text-5xl:    3rem;       /* 48px — display */

  /* Peso */
  --font-light:    300;
  --font-regular:  400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
  --font-extrabold: 800;

  /* Line height */
  --leading-tight:  1.25;
  --leading-snug:   1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Letter spacing */
  --tracking-tight:  -0.025em;
  --tracking-normal:  0em;
  --tracking-wide:    0.025em;
}

/* Aplicação semântica */
.text-display  { font-size: var(--text-4xl);  font-weight: var(--font-bold);     letter-spacing: var(--tracking-tight);  line-height: var(--leading-tight); }
.text-title    { font-size: var(--text-2xl);  font-weight: var(--font-semibold); letter-spacing: var(--tracking-tight);  line-height: var(--leading-snug); }
.text-heading  { font-size: var(--text-xl);   font-weight: var(--font-semibold); line-height: var(--leading-snug); }
.text-body     { font-size: var(--text-base); font-weight: var(--font-regular);  line-height: var(--leading-normal); }
.text-caption  { font-size: var(--text-sm);   font-weight: var(--font-regular);  color: var(--text-secondary); }
.text-label    { font-size: var(--text-xs);   font-weight: var(--font-medium);   letter-spacing: var(--tracking-wide); }
```

### 2.4 Espaçamento e Grid

```css
/* === SISTEMA DE ESPAÇAMENTO (8pt grid) === */
:root {
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */

  /* Border radius */
  --radius-sm:  0.375rem;   /* 6px — inputs, badges */
  --radius-md:  0.5rem;     /* 8px — cards pequenos */
  --radius-lg:  0.75rem;    /* 12px — cards principais */
  --radius-xl:  1rem;       /* 16px — modais, painéis */
  --radius-2xl: 1.5rem;     /* 24px — chat bubbles grandes */
  --radius-full: 9999px;    /* pills, avatars */

  /* Sombras */
  --shadow-xs:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:  0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04);
  --shadow-accent: 0 0 0 3px var(--accent-ring);

  /* Sidebar */
  --sidebar-width-collapsed: 64px;
  --sidebar-width-expanded:  280px;
  --topbar-height:           64px;
  --content-max-width:       1280px;
}
```

### 2.5 Componentes de Layout — ASCII Wireframes

#### Layout Principal (Dashboard)

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR (64px altura)                                           │
│  [Logo]         [Search Global]        [Notif][Theme][Avatar]   │
├──────────────┬──────────────────────────────────────────────────┤
│  SIDEBAR     │  CONTENT AREA                                    │
│  (280px)     │                                                  │
│              │  ┌────────────────────────────────────────────┐  │
│  [Icon] Item │  │  PAGE HEADER                               │  │
│  [Icon] Item │  │  Título da Página       [Actions]          │  │
│  [Icon] Item │  └────────────────────────────────────────────┘  │
│  ──────────  │                                                  │
│  [Icon] Item │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  [Icon] Item │  │  CARD   │ │  CARD   │ │  CARD   │           │
│  [Icon] Item │  │         │ │         │ │         │           │
│              │  └─────────┘ └─────────┘ └─────────┘           │
│  ──────────  │                                                  │
│  [Settings]  │  ┌──────────────────────────────────────────┐   │
│  [Profile]   │  │         CONTENT PRINCIPAL                │   │
│              │  └──────────────────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────────────┘
```

#### Layout Chat AI (estilo visto nas imagens 1 e 2)

```
┌────────────────┬─────────────────────────────────────────────────┐
│  CONTEXT       │  CHAT AREA                                      │
│  SELECTOR      │                                                  │
│  (300px)       │   ┌─────────────────────────────────────────┐  │
│                │   │  AVATAR + GREETING                       │  │
│  Search [    ] │   │   🤖                                      │  │
│                │   │  "Hello Admin 👋"                         │  │
│  ○ All Data    │   │  "Ask me anything about your CRM."       │  │
│  ○ Contacts    │   └─────────────────────────────────────────┘  │
│  ○ Companies   │                                                  │
│  ○ Deals       │   [Chip Sugestão] [Chip Sugestão] [Chip...]    │
│  ○ Tasks       │                                                  │
│  ○ Projects    │                                                  │
│  ● Presentations│  ┌─────────────────────────────────────────┐  │
│  (selecionado) │   │ [+] Type a message... [📎] [🎤] [⚡]   │  │
│                │   └─────────────────────────────────────────┘  │
└────────────────┴─────────────────────────────────────────────────┘
```

#### Layout Social Media Dashboard (imagem 5 — Gradient Theme)

```
┌──────────────────────────────────────────────────────────────────┐
│  SIDEBAR ÍCONES APENAS (64px)       CONTENT (gradient bg)       │
│                                                                  │
│  [⊞]                               ░░░░░░░░░░░░░░░░░░░░░░░░    │
│  [🔗]                               ░  GRADIENT BACKGROUND  ░    │
│  [✏️]                               ░  Orange → Pink → Purple░    │
│  [📷]                               ░░░░░░░░░░░░░░░░░░░░░░░░    │
│  [🎬]                                                            │
│  [👤]                                                            │
│  [🎧]                                                            │
│  [((·))]                                                         │
│  [✈️]                                                             │
│  ─────                                                           │
│  [📁]                                                            │
│  ─────                                                           │
│  [$]                                                             │
│  [⚙️]                                                             │
│  [💻]                                                            │
└──────────────────────────────────────────────────────────────────┘
```

### 2.6 Componentes UI — Especificações

#### Botões

```css
/* === BOTÕES === */
.btn {
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  gap:             var(--space-2);
  border-radius:   var(--radius-md);
  font-weight:     var(--font-medium);
  font-size:       var(--text-sm);
  transition:      all 150ms ease;
  cursor:          pointer;
  border:          none;
  text-decoration: none;
}

.btn-primary {
  background:  var(--accent-primary);
  color:       var(--text-inverse);
  padding:     10px var(--space-4);
  box-shadow:  var(--shadow-sm);
}
.btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

.btn-secondary {
  background:  transparent;
  color:       var(--text-primary);
  border:      1px solid var(--border-default);
  padding:     10px var(--space-4);
}
.btn-secondary:hover { background: var(--bg-surface-hover); }

.btn-ghost {
  background:  transparent;
  color:       var(--text-secondary);
  padding:     8px var(--space-3);
}
.btn-ghost:hover { background: var(--bg-surface-hover); color: var(--text-primary); }

/* Tamanhos */
.btn-sm { padding: 6px var(--space-3);  font-size: var(--text-xs); }
.btn-lg { padding: 14px var(--space-6); font-size: var(--text-base); }
.btn-xl { padding: 16px var(--space-8); font-size: var(--text-lg); }

/* Ícone-only */
.btn-icon { padding: 8px; border-radius: var(--radius-md); aspect-ratio: 1; }
```

#### Cards

```css
/* === CARDS === */
.card {
  background:    var(--bg-surface);
  border:        1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding:       var(--space-6);
  box-shadow:    var(--shadow-sm);
}

.card-hover {
  transition: all 200ms ease;
}
.card-hover:hover {
  border-color: var(--border-active);
  box-shadow:   var(--shadow-md);
  transform:    translateY(-2px);
}

.card-active {
  border-color: var(--accent-primary);
  background:   var(--bg-sidebar-active);
  box-shadow:   var(--shadow-accent);
}

/* Card com ícone de categoria (Template Cards) */
.card-template {
  display:       flex;
  flex-direction: column;
  gap:           var(--space-3);
  padding:       var(--space-5);
  cursor:        pointer;
}
.card-template .card-icon {
  width:         40px;
  height:        40px;
  border-radius: var(--radius-md);
  background:    var(--accent-light);
  display:       flex;
  align-items:   center;
  justify-content: center;
  color:         var(--accent-primary);
}
```

#### Sidebar Items

```css
/* === SIDEBAR NAVIGATION === */
.sidebar-item {
  display:       flex;
  align-items:   center;
  gap:           var(--space-3);
  padding:       10px var(--space-3);
  border-radius: var(--radius-md);
  color:         var(--text-secondary);
  font-size:     var(--text-sm);
  font-weight:   var(--font-medium);
  cursor:        pointer;
  transition:    all 150ms ease;
}
.sidebar-item:hover {
  background: var(--bg-surface-hover);
  color:      var(--text-primary);
}
.sidebar-item.active {
  background: var(--bg-sidebar-active);
  color:      var(--accent-primary);
}
.sidebar-item .icon {
  width:  20px;
  height: 20px;
  flex-shrink: 0;
}

/* Versão colapsada (ícone apenas) */
.sidebar-collapsed .sidebar-item {
  justify-content: center;
  padding: 10px;
}
.sidebar-collapsed .sidebar-item span { display: none; }
```

#### Input / Chat Field

```css
/* === INPUTS E CHAT === */
.input {
  width:         100%;
  padding:       10px var(--space-4);
  border:        1px solid var(--border-input);
  border-radius: var(--radius-md);
  font-size:     var(--text-sm);
  color:         var(--text-primary);
  background:    var(--bg-surface);
  transition:    all 150ms ease;
}
.input:focus {
  outline:      none;
  border-color: var(--accent-primary);
  box-shadow:   var(--shadow-accent);
}

/* Chat input especial (estilo MagicAI) */
.chat-input-wrapper {
  display:       flex;
  align-items:   center;
  gap:           var(--space-2);
  padding:       12px var(--space-4);
  background:    var(--bg-surface);
  border:        1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow:    var(--shadow-sm);
}
.chat-input {
  flex:          1;
  border:        none;
  outline:       none;
  background:    transparent;
  font-size:     var(--text-base);
  resize:        none;
  max-height:    120px;
}

/* Chips de sugestão */
.suggestion-chip {
  display:       inline-flex;
  align-items:   center;
  gap:           var(--space-2);
  padding:       6px 14px;
  background:    var(--bg-surface);
  border:        1px solid var(--border-default);
  border-radius: var(--radius-full);
  font-size:     var(--text-sm);
  cursor:        pointer;
  white-space:   nowrap;
  transition:    all 150ms ease;
}
.suggestion-chip:hover {
  background:    var(--bg-sidebar-active);
  border-color:  var(--accent-primary);
  color:         var(--accent-primary);
}
```

### 2.7 Grids de Template

```css
/* === TEMPLATE GALLERY GRID === */
.template-grid {
  display:               grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap:                   var(--space-4);
}

/* Mobile first */
@media (max-width: 640px) {
  .template-grid { grid-template-columns: 1fr; }
}

/* Stats / Dashboard widgets */
.stats-grid {
  display:               grid;
  grid-template-columns: repeat(4, 1fr);
  gap:                   var(--space-4);
}
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr; }
}
```

---

## 3. MAPA DE MÓDULOS COMPLETO

### 3.1 Módulos Core (Base)

| # | Módulo | Função | AI Provider | Free Tier |
|---|--------|---------|-------------|-----------|
| 01 | **AI Writer** | 100+ templates de conteúdo | OpenAI / Gemini / Claude | ✅ |
| 02 | **AI Chat** | Chat conversacional multi-modelo | OpenAI / Claude / Groq | ✅ |
| 03 | **AI Chat Pro** | Chat avançado com memória, pastas, pesquisa | OpenAI / Claude | ❌ Pago |
| 04 | **AI Image Generator** | Geração de imagens | DALL-E / SD3 / Midjourney | ✅ |
| 05 | **AI Photo Studio** | Edit, inpaint, remove bg | Stability / GPT-Image | ❌ |
| 06 | **AI Code Generator** | Geração de código | OpenAI / Claude / Groq | ✅ |
| 07 | **AI Speech to Text** | Transcrição de áudio | OpenAI Whisper | ✅ |
| 08 | **AI Voiceover** | Texto para voz | ElevenLabs / OpenAI TTS | ✅ |
| 09 | **AI Vision** | Análise de imagens | GPT-4o Vision / Gemini | ✅ |
| 10 | **AI FileChat** | Chat com PDFs/Docs/CSV | OpenAI / Gemini | ✅ |
| 11 | **AI Article Wizard** | Criação de artigos SEO | OpenAI / Gemini | ✅ |
| 12 | **AI Web Chat** | Análise de URLs | OpenAI / Firecrawl | ✅ |

### 3.2 Módulos de Automação e Agentes

| # | Módulo | Função | AI Provider | Notas |
|---|--------|---------|-------------|-------|
| 13 | **AI Agent Builder** | Construtor visual de agentes | OpenAI / Claude | Pago |
| 14 | **AI Agent Workflows** | Fluxos de automação | OpenAI / Claude | Pago |
| 15 | **Social Media Agent** | Automação de redes sociais | OpenAI / Claude | Pago |
| 16 | **Marketing Bot** | Bot para campanhas WhatsApp | Meta API / OpenAI | Pago |
| 17 | **AI Blogger Agent** | Agente criador de blogs | OpenAI / Gemini | Pago |
| 18 | **Phone Call Agent** | Agente de voz para chamadas | OpenAI Realtime / Vapi | Pago |
| 19 | **External Chatbot** | Chatbot embeddable | OpenAI / Claude | Pago |
| 20 | **AI Voice Bot** | Voice bot treinável | OpenAI Realtime | Pago |

### 3.3 Módulos de Mídia e Criação

| # | Módulo | Função | AI Provider | Notas |
|---|--------|---------|-------------|-------|
| 21 | **AI Video Pro** | Geração de vídeos | Veo / Kling / Runway | Pago |
| 22 | **AI Video Agent** | Agente criador de vídeos | OpenAI + Veo | Pago |
| 23 | **AI Auto Video Edit** | Edição automática de vídeos | Gemini Omni | Pago |
| 24 | **AI Video Editor** | Editor de vídeo com IA | Kling / Stable Video | Pago |
| 25 | **AI Captions** | Legendas automáticas | OpenAI Whisper | Pago |
| 26 | **AI Dubbing** | Dublagem por IA | ElevenLabs / OpenAI | Pago |
| 27 | **AI Avatar/Persona** | Criação de avatares IA | HeyGen / D-ID | Pago |
| 28 | **AI Voice Clone** | Clonagem de voz | ElevenLabs | ✅ |
| 29 | **AI Voice Isolator** | Isolamento de voz | Spleeter | ✅ |
| 30 | **AI Music Pro** | Composição musical | Suno / Udio | Pago |
| 31 | **AI Creative Suite** | Suite de design | Flux / SD3 | Pago |
| 32 | **AI Image Editor** | Editor de imagens | Flux Kontext / SD | Pago |
| 33 | **AI Image Pro** | Geração avançada | Midjourney / SD | Pago |
| 34 | **AI Photoshoot** | Fotografia de produto | SD / GPT-Image | Pago |
| 35 | **AI Fashion Studio** | Moda e vestuário | SD3 / GPT-Image | Pago |
| 36 | **UGC Factory** | User-generated content | OpenAI + Veo | Pago |

### 3.4 Módulos de Negócio

| # | Módulo | Função | AI Provider | Notas |
|---|--------|---------|-------------|-------|
| 37 | **CRM Completo** | CRM com IA integrada | OpenAI / Claude | Pago |
| 38 | **AI Social Media Suite** | Suite de social media | OpenAI / Claude | Pago |
| 39 | **AI Presentation Maker** | Criador de apresentações | OpenAI / Claude | Pago |
| 40 | **Content Manager** | Gerenciador de conteúdo | — | Pago |
| 41 | **AI Plagiarism Check** | Verificação de plágio | Copyleaks API | ✅ |
| 42 | **AI Content Detector** | Detector conteúdo IA | OpenAI / Copyleaks | ✅ |
| 43 | **WordPress Integration** | Publicação no WP | — | Pago |
| 44 | **SEO Tools** | Ferramentas de SEO | OpenAI | Pago |

### 3.5 Módulos de Plataforma (SaaS Core)

| # | Módulo | Função | Notas |
|---|--------|---------|-------|
| 45 | **Dashboard Admin** | Gestão da plataforma | Core |
| 46 | **Payment Gateways** | Stripe, Paypal, etc | Core |
| 47 | **Pricing Plans** | Planos de assinatura | Core |
| 48 | **Affiliate System** | Sistema de afiliados | Core |
| 49 | **Credit System** | Gestão de créditos | Core |
| 50 | **User Management** | Gestão de usuários | Core |
| 51 | **Team Management** | Trabalho em equipe | Core |
| 52 | **Newsletter** | Email marketing | Core |
| 53 | **API REST** | API pública | Core |
| 54 | **Marketplace** | Loja de addons | Core |
| 55 | **2FA** | Autenticação dupla | Core |
| 56 | **Dark Mode** | Tema escuro | Core |
| 57 | **Multilingual** | Múltiplos idiomas | Core |
| 58 | **RTL Support** | Suporte árabe/hebraico | Core |

---

## 4. CAMADA DE IA — ORQUESTRADOR E INTEGRAÇÕES

### 4.1 Arquitetura do Orquestrador

```
┌──────────────────────────────────────────────────────────────────┐
│                     AI ORCHESTRATOR                              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    REQUEST ROUTER                          │  │
│  │                                                            │  │
│  │  Input → [Detectar tipo] → [Selecionar provider] → Call   │  │
│  │                                                            │  │
│  │  Tipos:  text | image | video | audio | code | embedding   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  PROVIDER   │  │   CREDIT    │  │    STREAM MANAGER       │ │
│  │  SELECTOR   │  │  DEDUCTOR   │  │  SSE / WebSocket        │ │
│  │             │  │             │  │  Real-time response     │ │
│  │  Primary    │  │  Pre-call   │  │                         │ │
│  │  Fallback   │  │  Post-call  │  │  chunk → client         │ │
│  │  Load bal.  │  │  Refund err │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   PROVIDER ADAPTERS                        │  │
│  │                                                            │  │
│  │  OpenAIAdapter  | GeminiAdapter  | ClaudeAdapter          │  │
│  │  GroqAdapter    | GrokAdapter    | DeepSeekAdapter        │  │
│  │  OpenRouterAdapter | StableDiffAdapter | ElevenLabsAdapter │  │
│  │  VeoAdapter     | KlingAdapter   | SunoAdapter            │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Como Implementar o Adapter Pattern

```php
<?php
// app/Services/AI/Contracts/AIProviderInterface.php

interface AIProviderInterface
{
    public function chat(array $messages, array $options = []): StreamInterface|string;
    public function generateImage(string $prompt, array $options = []): string;
    public function transcribe(string $audioPath, array $options = []): string;
    public function textToSpeech(string $text, string $voice, array $options = []): string;
    public function getModels(): array;
    public function countTokens(string $text): int;
    public function calculateCost(int $inputTokens, int $outputTokens, string $model): float;
}

// ─────────────────────────────────────────────────────────────
// app/Services/AI/Providers/OpenAIAdapter.php

class OpenAIAdapter implements AIProviderInterface
{
    public function __construct(
        private string $apiKey,
        private string $defaultModel = 'gpt-4o',
        private HttpClient $client
    ) {}

    public function chat(array $messages, array $options = []): StreamInterface|string
    {
        $response = $this->client->post('https://api.openai.com/v1/chat/completions', [
            'headers' => ['Authorization' => "Bearer {$this->apiKey}"],
            'json' => [
                'model'    => $options['model'] ?? $this->defaultModel,
                'messages' => $messages,
                'stream'   => $options['stream'] ?? true,
                'max_tokens' => $options['max_tokens'] ?? 2048,
                'temperature' => $options['temperature'] ?? 0.7,
            ]
        ]);
        return $options['stream'] ?? true ? $response->getBody() : $response->json('choices.0.message.content');
    }
    // ... outros métodos
}

// ─────────────────────────────────────────────────────────────
// app/Services/AI/Providers/GeminiAdapter.php

class GeminiAdapter implements AIProviderInterface
{
    public function chat(array $messages, array $options = []): StreamInterface|string
    {
        // Converte formato OpenAI → Gemini
        $geminiMessages = collect($messages)->map(fn($m) => [
            'role' => $m['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $m['content']]]
        ])->toArray();

        $model = $options['model'] ?? 'gemini-2.0-flash';
        return $this->client->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}",
            ['json' => ['contents' => $geminiMessages]]
        )->json('candidates.0.content.parts.0.text');
    }
}

// ─────────────────────────────────────────────────────────────
// app/Services/AI/AIOrchestrator.php

class AIOrchestrator
{
    private array $providers = [];

    public function __construct(private CreditService $credits) {}

    public function register(string $name, AIProviderInterface $provider): self
    {
        $this->providers[$name] = $provider;
        return $this;
    }

    public function route(string $task, array $params): mixed
    {
        $provider = $this->selectProvider($task, $params);
        
        // Verificar créditos antes
        $estimatedCost = $this->estimateCost($task, $params, $provider);
        $this->credits->reserve(auth()->id(), $estimatedCost);

        try {
            $result = match($task) {
                'chat'     => $provider->chat($params['messages'], $params['options'] ?? []),
                'image'    => $provider->generateImage($params['prompt'], $params['options'] ?? []),
                'audio'    => $provider->transcribe($params['file'], $params['options'] ?? []),
                'tts'      => $provider->textToSpeech($params['text'], $params['voice']),
                default    => throw new \InvalidArgumentException("Task '{$task}' not supported"),
            };

            // Deduzir créditos reais
            $actualCost = $this->calculateActualCost($task, $result, $provider);
            $this->credits->deduct(auth()->id(), $actualCost);

            return $result;
        } catch (\Exception $e) {
            $this->credits->release(auth()->id(), $estimatedCost);
            
            // Fallback automático
            if ($fallback = $this->getFallback($task)) {
                return $this->route($task, array_merge($params, ['_provider' => $fallback]));
            }
            throw $e;
        }
    }

    private function selectProvider(string $task, array $params): AIProviderInterface
    {
        $preferred = $params['_provider'] ?? config("ai.task_defaults.{$task}");
        return $this->providers[$preferred] ?? throw new \RuntimeException("Provider not found");
    }
}
```

### 4.3 Sistema de Streaming (SSE)

```php
// routes/api.php
Route::post('/ai/stream', [AIStreamController::class, 'stream'])->middleware('auth');

// app/Http/Controllers/AIStreamController.php
class AIStreamController extends Controller
{
    public function stream(Request $request, AIOrchestrator $orchestrator): StreamedResponse
    {
        return response()->stream(function () use ($request, $orchestrator) {
            $stream = $orchestrator->route('chat', [
                'messages' => $request->messages,
                'options'  => array_merge($request->options ?? [], ['stream' => true]),
            ]);

            foreach ($stream as $chunk) {
                $content = $this->extractContent($chunk);
                if ($content) {
                    echo "data: " . json_encode(['content' => $content]) . "\n\n";
                    ob_flush();
                    flush();
                }
            }

            echo "data: [DONE]\n\n";
        }, 200, [
            'Content-Type'  => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
```

```javascript
// Frontend: consumir SSE
class AIStream {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.buffer = '';
    }

    async send(messages, options = {}, onChunk) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.csrf },
            body: JSON.stringify({ messages, options })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;
                    
                    const parsed = JSON.parse(data);
                    onChunk(parsed.content);
                }
            }
        }
    }
}

// Uso com Alpine.js
Alpine.data('aiChat', () => ({
    messages: [],
    input: '',
    streaming: false,
    currentResponse: '',

    async sendMessage() {
        const stream = new AIStream('/api/ai/stream');
        this.streaming = true;
        this.currentResponse = '';

        await stream.send(this.messages, {}, (chunk) => {
            this.currentResponse += chunk;
        });

        this.messages.push({ role: 'assistant', content: this.currentResponse });
        this.streaming = false;
    }
}));
```

---

## 5. PROVEDORES DE IA — MATRIZ COMPLETA

### 5.1 Provedores que Você Já Usa

| Provider | Uso Atual | Modelos Relevantes | Free Tier |
|----------|-----------|---------------------|-----------|
| **Gemini** (Google) | ✅ Ativo | Gemini 2.0 Flash, Gemini Pro | ✅ $0 até limite |
| **Firecrawl** | ✅ Web Scraping | API de scraping | ✅ 500 req/mês |
| **Steel Dev** | ✅ Browser Agent | Browser automation | ✅ |
| **Groq** | ✅ Inferência rápida | Llama 3.3, Mixtral | ✅ Generoso |
| **OpenRouter** | ✅ Roteador | 100+ modelos | ✅ Pay-as-go |

### 5.2 Provedores a Adicionar

#### 🔵 TEXTO / CHAT

| Provider | Modelos | Free Tier | Melhor Para |
|----------|---------|-----------|-------------|
| **OpenAI** | GPT-4o, GPT-4o-mini | $5 crédito inicial | Chat premium |
| **Anthropic** | Claude Sonnet 4.6, Haiku | $5 crédito inicial | Raciocínio, código |
| **DeepSeek** | V3, R1 | ✅ Muito barato | Código, raciocínio |
| **Mistral** | Mistral Large, Pixtral | ✅ Free tier | Multilingual |
| **Together AI** | Llama, Qwen | ✅ $25 créditos | Open source |
| **Cohere** | Command R+ | ✅ 1000 req/mês | RAG, embeddings |
| **Perplexity** | Sonar | Pago | Web search |

#### 🖼️ IMAGEM

| Provider | Modelos | Free Tier | Melhor Para |
|----------|---------|-----------|-------------|
| **Stability AI** | SD3, SDXL | ✅ 25 img/mês | Imagens gerais |
| **Replicate** | Flux, SD, SDXL | ✅ Pay-per-use | Qualquer modelo |
| **fal.ai** | Flux, AuraFlow | ✅ $1 crédito | Rápido e barato |
| **Leonardo AI** | Phoenix | ✅ 150/dia | Artístico |

#### 🎙️ VOZ / ÁUDIO

| Provider | Serviço | Free Tier | Melhor Para |
|----------|---------|-----------|-------------|
| **ElevenLabs** | TTS, Voice Clone | ✅ 10k chars/mês | Voz realista |
| **OpenAI TTS** | TTS-1, HD | Pago ($15/1M chars) | Rápido |
| **Murf AI** | TTS | ✅ 10 min/mês | Vozes variadas |
| **Deepgram** | STT | ✅ $200 créditos | Transcrição barata |
| **AssemblyAI** | STT | ✅ 5h/mês | Speaker diarization |

#### 📹 VÍDEO

| Provider | Serviço | Free Tier | Melhor Para |
|----------|---------|-----------|-------------|
| **RunwayML** | Gen-3 | ✅ 125 créditos | Vídeo IA |
| **Kling AI** | Text/Image to Video | Pago | Qualidade alta |
| **Veo (Google)** | Veo 3 | Pago | Qualidade máxima |
| **D-ID** | Avatar vídeo | ✅ 5 créditos | Avatar falante |
| **HeyGen** | Avatar vídeo | ✅ 1 min/mês | Personas IA |

#### 📞 VOZ REALTIME

| Provider | Serviço | Free Tier | Melhor Para |
|----------|---------|-----------|-------------|
| **Vapi.ai** | Phone agents | ✅ $10 créditos | Agentes de voz |
| **Retell AI** | Voice agents | ✅ $10 créditos | Conversacional |
| **Twilio** | SMS/Call | ✅ $15 créditos | Telefonia |
| **OpenAI Realtime** | Real-time audio | Pago | Integrado |

#### 🔍 BUSCA / RAG

| Provider | Serviço | Free Tier | Melhor Para |
|----------|---------|-----------|-------------|
| **Tavily** | Web search API | ✅ 1000/mês | Busca para IA |
| **Brave Search** | Search API | ✅ 2000/mês | Alternativa |
| **Pinecone** | Vector DB | ✅ 2GB | RAG/Embeddings |
| **Weaviate** | Vector DB | ✅ Cloud 14 dias | RAG |
| **Qdrant** | Vector DB | ✅ Self-hosted | RAG barato |

### 5.3 Configuração do config/ai.php

```php
<?php
// config/ai.php

return [
    'providers' => [
        'openai' => [
            'api_key'       => env('OPENAI_API_KEY'),
            'default_model' => 'gpt-4o',
            'models' => [
                'gpt-4o'         => ['input_cost' => 2.5,  'output_cost' => 10.0, 'context' => 128000],
                'gpt-4o-mini'    => ['input_cost' => 0.15, 'output_cost' => 0.60, 'context' => 128000],
                'gpt-4.1'        => ['input_cost' => 2.0,  'output_cost' => 8.0,  'context' => 1047576],
                'o4-mini'        => ['input_cost' => 1.1,  'output_cost' => 4.4,  'context' => 200000],
            ],
        ],
        'anthropic' => [
            'api_key'       => env('ANTHROPIC_API_KEY'),
            'default_model' => 'claude-sonnet-4-6',
            'models' => [
                'claude-sonnet-4-6' => ['input_cost' => 3.0, 'output_cost' => 15.0, 'context' => 200000],
                'claude-haiku-4-5'  => ['input_cost' => 0.8, 'output_cost' => 4.0,  'context' => 200000],
                'claude-opus-4-6'   => ['input_cost' => 15.0,'output_cost' => 75.0, 'context' => 200000],
            ],
        ],
        'gemini' => [
            'api_key'       => env('GEMINI_API_KEY'),
            'default_model' => 'gemini-2.0-flash',
            'models' => [
                'gemini-2.0-flash'     => ['input_cost' => 0.10, 'output_cost' => 0.40, 'context' => 1048576, 'free' => true],
                'gemini-2.5-pro'       => ['input_cost' => 1.25, 'output_cost' => 10.0, 'context' => 1048576],
                'gemini-1.5-flash'     => ['input_cost' => 0.075,'output_cost' => 0.30, 'context' => 1048576, 'free' => true],
            ],
        ],
        'groq' => [
            'api_key'       => env('GROQ_API_KEY'),
            'default_model' => 'llama-3.3-70b-versatile',
            'base_url'      => 'https://api.groq.com/openai/v1',
            'models' => [
                'llama-3.3-70b-versatile' => ['input_cost' => 0.59, 'output_cost' => 0.79, 'free' => true],
                'llama-3.1-8b-instant'    => ['input_cost' => 0.05, 'output_cost' => 0.08, 'free' => true],
                'mixtral-8x7b-32768'      => ['input_cost' => 0.24, 'output_cost' => 0.24, 'free' => true],
            ],
        ],
        'openrouter' => [
            'api_key'       => env('OPENROUTER_API_KEY'),
            'base_url'      => 'https://openrouter.ai/api/v1',
            'default_model' => 'anthropic/claude-3.5-haiku',
        ],
        'deepseek' => [
            'api_key'       => env('DEEPSEEK_API_KEY'),
            'base_url'      => 'https://api.deepseek.com/v1',
            'models' => [
                'deepseek-chat'     => ['input_cost' => 0.27, 'output_cost' => 1.10],
                'deepseek-reasoner' => ['input_cost' => 0.55, 'output_cost' => 2.19],
            ],
        ],
        'elevenlabs' => [
            'api_key'       => env('ELEVENLABS_API_KEY'),
            'base_url'      => 'https://api.elevenlabs.io/v1',
        ],
        'stability' => [
            'api_key'       => env('STABILITY_API_KEY'),
            'base_url'      => 'https://api.stability.ai',
        ],
        'replicate' => [
            'api_key'       => env('REPLICATE_API_KEY'),
            'base_url'      => 'https://api.replicate.com/v1',
        ],
        'tavily' => [
            'api_key'       => env('TAVILY_API_KEY'),
            'base_url'      => 'https://api.tavily.com',
        ],
        'vapi' => [
            'api_key'       => env('VAPI_API_KEY'),
            'base_url'      => 'https://api.vapi.ai',
        ],
    ],

    // Roteamento padrão por tarefa
    'task_defaults' => [
        'chat'              => 'gemini',     // Free tier primeiro
        'chat_premium'      => 'openai',
        'code'              => 'groq',       // Rápido e gratuito
        'image'             => 'stability',
        'image_premium'     => 'openai',     // DALL-E / GPT-Image
        'audio_transcribe'  => 'groq',       // Whisper via Groq (gratuito!)
        'audio_tts'         => 'elevenlabs',
        'web_search'        => 'tavily',
        'document_analysis' => 'anthropic',  // Claude tem contexto longo
        'video'             => 'replicate',
        'voice_call'        => 'vapi',
    ],

    // Fallbacks automáticos
    'fallbacks' => [
        'openai'     => 'gemini',
        'anthropic'  => 'openai',
        'gemini'     => 'groq',
        'groq'       => 'openrouter',
        'stability'  => 'replicate',
        'elevenlabs' => 'openai',
    ],
];
```

---

## 6. FLUXOS FUNCIONAIS POR MÓDULO

### 6.1 Fluxo: AI Writer (Templates)

```
USUÁRIO
   │
   ▼ Seleciona template (ex: "Product Description")
   │
   ▼ Preenche campos do form (nome, palavras-chave, tom)
   │
[TemplateController::generate()]
   │
   ├─ Busca template no banco (prompt base + variáveis)
   │
   ├─ Interpola variáveis no prompt
   │   "Write a {tone} product description for {product_name}. Keywords: {keywords}"
   │
   ├─ AIOrchestrator::route('chat', messages)
   │
   ├─ Deduz créditos
   │
   ▼ Streaming SSE → Frontend Alpine.js
   │
   ▼ Salva resultado no banco (documents table)
   │
   ▼ USUÁRIO pode: Copiar | Editar no AI Editor | Exportar PDF/Word
```

### 6.2 Fluxo: AI Chat (Multi-modelo)

```
USUÁRIO digita mensagem
   │
[ChatController::send()]
   │
   ├─ Monta contexto: [system_prompt + histórico + nova msg]
   │
   ├─ Detecta: tool_calls? (web_search, imagem, código)
   │   ├─ SE web_search → Tavily API → injeta resultado no contexto
   │   ├─ SE image → redireciona para AI Image
   │   └─ SE code → usa model especializado (DeepSeek/Groq)
   │
   ├─ AIOrchestrator::route('chat')
   │   ├─ Provider selecionado: Gemini (free) ou GPT-4o (premium)
   │   └─ Streaming habilitado
   │
   ▼ SSE chunks → Alpine.js atualiza DOM em tempo real
   │
   ▼ Salva conversa no banco
```

### 6.3 Fluxo: AI Image Generator

```
USUÁRIO → Prompt + Configurações (tamanho, estilo, modelo)
   │
[ImageController::generate()]
   │
   ├─ Valida créditos disponíveis
   │
   ├─ Melhora prompt (opcional): GPT-4o-mini → "enhanced prompt"
   │
   ├─ Seleciona provider:
   │   ├─ DALL-E 3    → OpenAI API
   │   ├─ SD3         → Stability AI
   │   ├─ Flux        → Replicate / fal.ai
   │   └─ Midjourney  → Discord API wrapper
   │
   ├─ Faz request → recebe URL ou base64
   │
   ├─ Upload para S3/R2
   │
   ▼ Retorna URL → Exibe na galeria
   │
   ▼ Salva metadata no banco (prompt, modelo, custo, dimensões)
```

### 6.4 Fluxo: AI Agent (Agente Autônomo)

```
ADMIN configura agente:
   ├─ Nome, avatar, instrução base
   ├─ Ferramentas disponíveis: [web_search, email, calendar, crm]
   ├─ Modelo de IA: GPT-4o / Claude
   └─ Canais: Chat | WhatsApp | Email

USUÁRIO envia tarefa ao agente:
   │
[AgentOrchestrator::execute()]
   │
   ├─ LOOP DE RACIOCÍNIO (ReAct pattern):
   │   │
   │   ├─ Pensamento: "Preciso buscar X para completar Y"
   │   │
   │   ├─ Ação: chama tool (ex: web_search)
   │   │
   │   ├─ Observação: processa resultado
   │   │
   │   └─ Repete até concluir ou atingir max_steps (10)
   │
   ├─ Resposta final → usuário
   │
   ▼ Salva histórico de steps no banco (para debug/auditoria)
```

### 6.5 Fluxo: Phone Call Agent

```
SETUP DO AGENTE:
   ├─ Voz: ElevenLabs voice_id selecionado
   ├─ Prompt base: "Você é Maria, recepcionista da Clínica X..."
   ├─ Ferramentas: [check_availability, book_appointment, send_sms]
   └─ Número telefônico: Twilio/Vapi número comprado

CHAMADA RECEBIDA:
   │
[Twilio Webhook → Vapi → AgentCallController]
   │
   ├─ Converte voz → texto: OpenAI Whisper ou Deepgram
   │
   ├─ Processa com LLM: GPT-4o Realtime API
   │
   ├─ Executa tools se necessário (booking, consulta CRM)
   │
   ├─ Converte resposta → voz: ElevenLabs
   │
   ▼ Toca áudio para o chamador
   │
   ▼ Salva transcrição e dados coletados no CRM
```

### 6.6 Fluxo: CRM com IA

```
CRM DATA LAYER:
   ├─ Contacts (clientes)
   ├─ Companies (empresas)
   ├─ Deals (negócios/oportunidades)
   ├─ Tasks (tarefas)
   ├─ Invoices (faturas)
   └─ Payments (pagamentos)

AI CRM ASSISTANT:
   │
   ├─ CONSULTA NATURAL:
   │   User: "Quais clientes têm faturas em aberto?"
   │   │
   │   ├─ Claude analisa pergunta
   │   ├─ Gera SQL/Query para o banco
   │   ├─ Executa query de forma segura (via QueryBuilder)
   │   └─ Retorna resposta formatada
   │
   ├─ CRIAÇÃO:
   │   User: "Criar follow-up para João Silva amanhã"
   │   │
   │   ├─ Extrai: contact=João Silva, type=follow-up, date=amanhã
   │   ├─ Busca contact_id no banco
   │   └─ Insere Task no banco → confirmação
   │
   └─ RELATÓRIOS:
       User: "Relatório de vendas dos últimos 30 dias"
       │
       ├─ Agrega dados do banco (Deals + Invoices + Payments)
       ├─ Claude formata em markdown/tabela
       └─ Opção de exportar como PDF ou PPT
```

---

## 7. COMO REPLICAR EM PROJETO EXISTENTE

### 7.1 Diagnóstico — O Que Você Provavelmente Já Tem

Assumindo que seu projeto existe e tem estrutura similar, o plano é **integrar sem duplicar**:

```
✅ JÁ EXISTE NO SEU PROJETO:
   - Sistema de auth/usuários
   - Dashboard admin
   - Sistema de créditos ou billing
   - Orquestrador de IAs (mencionado)
   - Mineradores de dados
   - Integrações com Gemini, Groq, OpenRouter

🔧 PRECISA ADICIONAR/MELHORAR:
   - AI Writer Templates (100+ templates)
   - AI Agent Builder visual
   - Sistema de Chat com SSE streaming
   - CRM básico com IA
   - Geração de imagens multi-provider
   - AI Voiceover com ElevenLabs
   - Phone Call Agent (Vapi)
   - Design System unificado
```

### 7.2 Ordem de Implementação (Prioridade)

```
SPRINT 1 (Semana 1-2) — Design System + Base
├─ Implementar tokens CSS (seção 2.2)
├─ Refatorar sidebar para o padrão icon+text
├─ Criar componente chat-input com chips
└─ Grid de templates

SPRINT 2 (Semana 3-4) — AI Writer
├─ Criar tabela templates (id, name, category, prompt, fields_schema)
├─ Importar 100 templates (JSON disponível publicamente)
├─ UI: template gallery com filtros por categoria
├─ Form dinâmico baseado no fields_schema do template
└─ Integrar com orquestrador de IAs existente

SPRINT 3 (Semana 5-6) — AI Chat Melhorado
├─ Implementar SSE streaming
├─ Adicionar tool calling (web_search, image_gen)
├─ Histórico de conversas com pastas
└─ Selecionar modelo por conversa

SPRINT 4 (Semana 7-8) — AI Image
├─ Integrar Stability AI (free tier)
├─ Integrar fal.ai (Flux - barato)
├─ Galeria de imagens geradas
└─ Opções: tamanho, estilo, número de variações

SPRINT 5 (Semana 9-10) — AI Agents
├─ Builder visual de agentes (form-based)
├─ Implementar ReAct loop
├─ Conectores: web_search, email, calendar
└─ Deploy de agente em canal

SPRINT 6 (Semana 11-12) — CRM + Voice
├─ Schema do CRM (contacts, companies, deals)
├─ AI Assistant para CRM (consultas naturais)
├─ Integrar Vapi para Phone Agents
└─ Dashboard de chamadas
```

### 7.3 Schema de Banco de Dados Essenciais

```sql
-- ==========================================
-- TABELAS CORE PARA O SISTEMA AI
-- ==========================================

-- Templates de AI Writer
CREATE TABLE ai_templates (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    icon            VARCHAR(50),   -- emoji ou nome do ícone
    prompt_template TEXT NOT NULL, -- template com {variáveis}
    fields_schema   JSON,          -- definição dos campos do form
    is_active       BOOLEAN DEFAULT TRUE,
    is_custom       BOOLEAN DEFAULT FALSE,  -- criado pelo usuário
    created_by      BIGINT UNSIGNED,
    usage_count     INT DEFAULT 0,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- Documentos gerados
CREATE TABLE ai_documents (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    template_id BIGINT UNSIGNED,
    title       VARCHAR(255),
    content     LONGTEXT,
    input_data  JSON,            -- inputs usados para gerar
    model       VARCHAR(100),
    tokens_used INT,
    cost        DECIMAL(10,6),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- Chats
CREATE TABLE ai_chats (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    chatbot_id  BIGINT UNSIGNED,
    title       VARCHAR(255),
    model       VARCHAR(100),
    is_pinned   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ai_chat_messages (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    chat_id     BIGINT UNSIGNED NOT NULL,
    role        ENUM('user','assistant','system','tool'),
    content     LONGTEXT,
    metadata    JSON,            -- tool_calls, images, etc
    tokens      INT,
    created_at  TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
);

-- Imagens geradas
CREATE TABLE ai_images (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    prompt      TEXT,
    model       VARCHAR(100),
    size        VARCHAR(20),
    style       VARCHAR(50),
    file_path   VARCHAR(500),
    thumbnail   VARCHAR(500),
    cost        DECIMAL(10,6),
    metadata    JSON,
    created_at  TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Agentes de IA
CREATE TABLE ai_agents (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    name            VARCHAR(255),
    description     TEXT,
    system_prompt   TEXT,
    model           VARCHAR(100),
    tools           JSON,         -- lista de tools disponíveis
    channels        JSON,         -- chat, whatsapp, email, phone
    avatar          VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSON,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CRM
CREATE TABLE crm_contacts (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    company_id  BIGINT UNSIGNED,
    name        VARCHAR(255),
    email       VARCHAR(255),
    phone       VARCHAR(50),
    address     TEXT,
    notes       TEXT,
    tags        JSON,
    custom_data JSON,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

CREATE TABLE crm_deals (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    contact_id  BIGINT UNSIGNED,
    title       VARCHAR(255),
    value       DECIMAL(15,2),
    currency    VARCHAR(3) DEFAULT 'BRL',
    stage       VARCHAR(100),    -- prospecting, proposal, negotiation, won, lost
    probability INT DEFAULT 0,
    expected_close DATE,
    notes       TEXT,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

-- Créditos de IA
CREATE TABLE user_credits (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL UNIQUE,
    balance     DECIMAL(15,6) DEFAULT 0,
    reserved    DECIMAL(15,6) DEFAULT 0,    -- créditos em uso
    total_used  DECIMAL(15,6) DEFAULT 0,
    updated_at  TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE credit_transactions (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    type        ENUM('charge','deduct','refund','bonus'),
    amount      DECIMAL(15,6),
    balance_after DECIMAL(15,6),
    description VARCHAR(255),
    reference   VARCHAR(100),   -- chat_id, image_id, etc
    metadata    JSON,
    created_at  TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
);
```

---

## 8. TEMPLATES E LAYOUTS

### 8.1 Template Card Component (HTML/Alpine.js)

```html
<!-- Template Gallery com filtros -->
<div x-data="templateGallery()" class="template-page">
    
    <!-- Filtros por categoria -->
    <div class="category-tabs">
        <template x-for="cat in categories">
            <button 
                @click="filter = cat.slug"
                :class="filter === cat.slug ? 'tab-active' : 'tab'"
                x-text="cat.name">
            </button>
        </template>
    </div>

    <!-- Barra de busca -->
    <div class="search-bar">
        <input 
            x-model="search" 
            type="text" 
            placeholder="Buscar templates..."
            class="input">
    </div>

    <!-- Grid de templates -->
    <div class="template-grid">
        <template x-for="template in filteredTemplates" :key="template.id">
            <div 
                class="card card-template card-hover"
                @click="openTemplate(template)">
                
                <div class="card-icon">
                    <span x-text="template.icon" style="font-size: 20px"></span>
                </div>
                
                <div>
                    <h3 class="text-heading" x-text="template.name"></h3>
                    <p class="text-caption" x-text="template.description"></p>
                </div>
                
                <div class="card-footer">
                    <span class="badge" x-text="template.category"></span>
                    <span class="text-caption" x-text="template.usage_count + ' usos'"></span>
                </div>
            </div>
        </template>
    </div>
</div>

<script>
function templateGallery() {
    return {
        filter: 'all',
        search: '',
        templates: [], // carregado via AJAX
        categories: [
            { slug: 'all', name: 'Todos' },
            { slug: 'blog', name: 'Blog' },
            { slug: 'social', name: 'Social Media' },
            { slug: 'email', name: 'Email' },
            { slug: 'business', name: 'Negócios' },
            { slug: 'code', name: 'Código' },
        ],
        
        get filteredTemplates() {
            return this.templates.filter(t => {
                const matchCat = this.filter === 'all' || t.category === this.filter;
                const matchSearch = !this.search || 
                    t.name.toLowerCase().includes(this.search.toLowerCase());
                return matchCat && matchSearch;
            });
        },
        
        async init() {
            const res = await fetch('/api/templates');
            this.templates = await res.json();
        },
        
        openTemplate(template) {
            window.location.href = `/ai/write/${template.id}`;
        }
    }
}
</script>
```

### 8.2 Chat Interface Component

```html
<!-- AI Chat com Streaming -->
<div x-data="aiChat()" class="chat-container">
    
    <!-- Histórico de mensagens -->
    <div class="messages-area" x-ref="messagesArea">
        
        <!-- Estado vazio / Greeting -->
        <template x-if="messages.length === 0">
            <div class="chat-empty">
                <div class="chat-avatar">🤖</div>
                <h2 class="text-title">Olá, <span x-text="userName">Usuário</span> 👋</h2>
                <p class="text-body text-secondary">Como posso ajudar você hoje?</p>
                
                <!-- Chips de sugestão -->
                <div class="suggestion-chips">
                    <template x-for="chip in suggestions">
                        <button class="suggestion-chip" @click="input = chip; send()">
                            <span x-text="chip.icon"></span>
                            <span x-text="chip.text"></span>
                        </button>
                    </template>
                </div>
            </div>
        </template>
        
        <!-- Mensagens -->
        <template x-for="msg in messages" :key="msg.id">
            <div :class="msg.role === 'user' ? 'message-user' : 'message-ai'">
                <div class="message-content" x-html="marked(msg.content)"></div>
                <div class="message-meta">
                    <span x-text="msg.model" class="text-label"></span>
                    <span x-text="msg.time" class="text-label"></span>
                </div>
            </div>
        </template>
        
        <!-- Streaming indicator -->
        <template x-if="streaming">
            <div class="message-ai">
                <div class="message-content streaming" x-html="marked(currentResponse)"></div>
            </div>
        </template>
    </div>
    
    <!-- Input area -->
    <div class="chat-input-wrapper">
        <button class="btn btn-ghost btn-icon" @click="attachFile()">+</button>
        
        <textarea 
            x-model="input"
            @keydown.enter.meta="send()"
            @keydown.enter.ctrl="send()"
            placeholder="Digite uma mensagem..."
            class="chat-input"
            rows="1"
            @input="autoResize($el)">
        </textarea>
        
        <button class="btn btn-ghost btn-icon" @click="startVoice()">🎤</button>
        <button class="btn btn-primary btn-icon" @click="send()" :disabled="!input.trim() || streaming">
            <svg><!-- send icon --></svg>
        </button>
    </div>
</div>

<script>
function aiChat() {
    return {
        messages: [],
        input: '',
        streaming: false,
        currentResponse: '',
        model: 'gemini-2.0-flash',
        
        suggestions: [
            { icon: '✍️', text: 'Escreva um post para LinkedIn' },
            { icon: '📊', text: 'Crie um relatório de vendas' },
            { icon: '💡', text: 'Gere ideias para meu produto' },
            { icon: '🔍', text: 'Pesquise sobre tendências de IA' },
        ],

        async send() {
            if (!this.input.trim() || this.streaming) return;
            
            const userMessage = this.input;
            this.input = '';
            this.streaming = true;
            this.currentResponse = '';
            
            this.messages.push({ role: 'user', content: userMessage, id: Date.now() });
            this.$nextTick(() => this.scrollToBottom());
            
            const stream = new AIStream('/api/ai/chat/stream');
            await stream.send(
                this.messages.filter(m => m.role !== 'ai_meta'),
                { model: this.model },
                (chunk) => {
                    this.currentResponse += chunk;
                    this.scrollToBottom();
                }
            );
            
            this.messages.push({
                role: 'assistant',
                content: this.currentResponse,
                model: this.model,
                time: new Date().toLocaleTimeString(),
                id: Date.now()
            });
            
            this.streaming = false;
            this.currentResponse = '';
        },
        
        scrollToBottom() {
            this.$refs.messagesArea.scrollTop = this.$refs.messagesArea.scrollHeight;
        },
        
        autoResize(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }
    }
}
</script>
```

---

## 9. PLANO DE IMPLEMENTAÇÃO RÁPIDA

### 9.1 Checklist de Integração (priorizado por impacto)

```
FASE 1 — FUNDAÇÃO (1-2 semanas)
□ Implementar tokens CSS no projeto existente
□ Refatorar sidebar para dual-mode (collapsed/expanded)
□ Criar componente chat-input com chips de sugestão
□ Configurar SSE endpoint para streaming
□ Adicionar tabelas de banco (templates, documents, images)
□ Criar config/ai.php com todos os providers

FASE 2 — CONTEÚDO (2-3 semanas)  
□ Criar 50 templates básicos no banco (seed)
□ Template gallery com filtros Alpine.js
□ Formulário dinâmico baseado em fields_schema
□ AI Writer com streaming
□ Exportação para PDF/Word/TXT
□ Histórico de documentos gerados

FASE 3 — CHAT AVANÇADO (2 semanas)
□ Pastas para organizar chats
□ Selecionar modelo por conversa
□ Tool calling: web_search (Tavily)
□ Tool calling: geração de imagens
□ Upload de arquivos no chat (PDF, imagem)
□ Compartilhar chat via link público

FASE 4 — IMAGENS (1-2 semanas)
□ Integrar Stability AI (SD3)
□ Integrar fal.ai (Flux)
□ Galeria de imagens com filtros
□ Variações e edição de imagens

FASE 5 — AGENTES (3-4 semanas)
□ Agente Builder (formulário)
□ Implementar ReAct loop
□ Conectores: email, calendar (Google)
□ Deploy em canal de chat
□ Logs de execução do agente

FASE 6 — CRM + VOICE (3-4 semanas)
□ Schema CRM (contacts, deals, invoices)
□ UI do CRM com pipeline kanban
□ AI Assistant para CRM (queries naturais)
□ Integrar Vapi.ai para phone agents
□ WhatsApp via Meta API

FASE 7 — POLIMENTO (contínuo)
□ Dark mode completo
□ Responsividade mobile
□ Performance (lazy loading, cache)
□ Analytics de uso
□ Testes automatizados
```

### 9.2 Variáveis de Ambiente (.env)

```bash
# === AI PROVIDERS ===
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
DEEPSEEK_API_KEY=sk-...
ELEVENLABS_API_KEY=...
STABILITY_API_KEY=sk-...
REPLICATE_API_KEY=r8_...
FAL_API_KEY=...

# === BUSCA ===
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
BRAVE_SEARCH_API_KEY=BSA...

# === VOZ / TELEFONIA ===
VAPI_API_KEY=...
VAPI_PHONE_NUMBER=+55...
TWILIO_SID=AC...
TWILIO_TOKEN=...

# === STORAGE ===
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=meu-bucket

# === SOCIAL / INTEGRAÇÕES ===
META_API_TOKEN=...          # WhatsApp Business API
TELEGRAM_BOT_TOKEN=...

# === DEFAULTS ===
AI_DEFAULT_CHAT_PROVIDER=gemini
AI_DEFAULT_IMAGE_PROVIDER=stability
AI_DEFAULT_TTS_PROVIDER=elevenlabs
AI_DEFAULT_STT_PROVIDER=groq
AI_CREDITS_PER_CHAR=0.0001
AI_FREE_CREDITS_ON_REGISTER=100
```

### 9.3 ServiceProvider para registrar providers

```php
// app/Providers/AIServiceProvider.php

class AIServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AIOrchestrator::class, function ($app) {
            $orchestrator = new AIOrchestrator($app->make(CreditService::class));
            
            // Registra todos os providers configurados
            foreach (config('ai.providers') as $name => $config) {
                if (empty($config['api_key'])) continue;
                
                $adapter = match($name) {
                    'openai'      => new OpenAIAdapter($config),
                    'anthropic'   => new AnthropicAdapter($config),
                    'gemini'      => new GeminiAdapter($config),
                    'groq'        => new GroqAdapter($config),
                    'openrouter'  => new OpenRouterAdapter($config),
                    'deepseek'    => new DeepSeekAdapter($config),
                    'elevenlabs'  => new ElevenLabsAdapter($config),
                    'stability'   => new StabilityAdapter($config),
                    'replicate'   => new ReplicateAdapter($config),
                    default       => null,
                };
                
                if ($adapter) {
                    $orchestrator->register($name, $adapter);
                }
            }
            
            return $orchestrator;
        });
    }

    public function boot(): void
    {
        // Registra tasks padrão
        $this->callAfterResolving(AIOrchestrator::class, function (AIOrchestrator $orchestrator) {
            $orchestrator->setDefaults(config('ai.task_defaults'));
            $orchestrator->setFallbacks(config('ai.fallbacks'));
        });
    }
}
```

---

## 10. RECOMENDAÇÕES FINAIS

### 10.1 Stack Mínima Recomendada para Começar (Free Tier)

```
CHAT:        Gemini 2.0 Flash (free) + Groq/Llama (free) via fallback
IMAGEM:      Stability AI (25 img/mês free) + fal.ai ($1 crédito)
TRANSCRIÇÃO: Groq Whisper (free, mais rápido que OpenAI!)
VOZ TTS:     ElevenLabs (10k chars/mês free)
BUSCA WEB:   Tavily (1000 req/mês free)
SCRAPING:    Firecrawl (já tem)
TELEFONIA:   Vapi.ai ($10 créditos free)
EMBEDDINGS:  Gemini embedding (free) + Qdrant self-hosted
```

### 10.2 Custo Estimado para Escalar

```
TIER 1 (startup, até 100 usuários/mês):
   Gemini API:    ~$0 (free tier)
   Groq:          ~$0 (free tier)
   ElevenLabs:    $5/mês (Starter)
   Tavily:        $0 (free)
   Total:         ~$5-15/mês

TIER 2 (crescimento, até 1000 usuários/mês):
   OpenAI GPT-4o-mini: ~$30/mês
   Anthropic Haiku:    ~$20/mês
   ElevenLabs:         $22/mês
   Stability AI:       $20/mês
   Vapi Phone:         $30/mês
   Total:              ~$100-150/mês

TIER 3 (escala, 10000+ usuários):
   Contratar com AWS Bedrock (custo por uso)
   Negociar rate limits com providers
   Considerar modelos self-hosted (Llama via RunPod/Together)
```

### 10.3 Modelo de Negócio Recomendado (baseado no MagicAI)

```
PLANO FREE:
   - 50 créditos/mês (equivale a ~100 mensagens Gemini)
   - Acesso a 20 templates básicos
   - Chat com Gemini Flash apenas
   - Sem imagens

PLANO STARTER ($19/mês):
   - 2.000 créditos/mês
   - Todos os templates
   - Chat com GPT-4o-mini e Claude Haiku
   - 50 imagens/mês
   - AI Voiceover básico

PLANO PROFESSIONAL ($49/mês):
   - 10.000 créditos/mês
   - GPT-4o + Claude Sonnet
   - Imagens ilimitadas
   - AI Agents
   - CRM básico
   - Prioridade de suporte

PLANO ENTERPRISE ($199/mês):
   - Créditos ilimitados (fair use)
   - Todos os modelos premium
   - Phone Call Agents
   - Branded chatbot
   - API access
   - SLA 99.9%
```

### 10.4 Diferenças Apple HIG vs MagicAI Design

```
                    APPLE HIG          MAGICAI STYLE
─────────────────────────────────────────────────────
Espaçamento:        Generoso (20-32px)  Moderado (16-24px)
Bordas (radius):    Média (10-12px)     Média (8-12px)
Tipografia:         SF Pro (system)     Inter (web)
Cor acento:         Azul sistema        Roxo (#7C3AED)
Sombras:            Minimal/nenhuma     Leve (shadow-sm)
Fundo:              Branco/cinza sist.  Branco puro
Icons:              SF Symbols          Lucide/Heroicons
Dark mode:          Auto (sistema)      Toggle manual
Animações:          Física (spring)     CSS transition 150ms
Mobile:             Native-first        Responsive web
Gradientes:         Raramente           Temas temáticos
```

**Conclusão:** Você pode e deve combinar os dois. Use Apple HIG como base para:
- Espaçamento generoso
- Tipografia system (-apple-system, SF Pro no macOS/iOS)
- Animações suaves e significativas
- Dark mode automático respeitando preferência do sistema

Adicione do MagicAI:
- Sidebar dual-mode (collapsed/expanded)
- Cards de template com hover effects
- Chat interface com suggestion chips
- Gradientes em páginas temáticas (social media, etc.)
- Roxo como cor de acento (funciona bem com SF Pro)

---

## APÊNDICE A — Links e Recursos

```
MAGICAI DEMO:         https://demo.magicproject.ai
MAGICAI DOCS:         https://magicaidocs.liquid-themes.com
MAGICAI COMMUNITY:    https://community.projecthub.ai
MAGICAI CHANGELOG:    https://magicaidocs.liquid-themes.com/changelog/
MAGIC ACADEMY YT:     https://www.youtube.com/channel/UCMAwAMUb5rIxPJcWDxnrpnA
CODECANYON ITEM:      https://codecanyon.net/item/45408109

APIS RECOMENDADAS:
  OpenAI:        https://platform.openai.com
  Anthropic:     https://console.anthropic.com
  Gemini:        https://aistudio.google.com
  Groq:          https://console.groq.com
  OpenRouter:    https://openrouter.ai
  ElevenLabs:    https://elevenlabs.io
  Stability:     https://stability.ai
  fal.ai:        https://fal.ai
  Replicate:     https://replicate.com
  Tavily:        https://tavily.com
  Vapi:          https://vapi.ai
  Deepgram:      https://deepgram.com
  Together AI:   https://together.ai
  Pinecone:      https://pinecone.io

FRAMEWORKS / LIBS:
  Alpine.js:     https://alpinejs.dev
  TailwindCSS:   https://tailwindcss.com
  Lucide Icons:  https://lucide.dev
  Marked.js:     https://marked.js.org  (render markdown no chat)
  DOMPurify:     https://github.com/cure53/DOMPurify  (sanitizar HTML)
  Highlight.js:  https://highlightjs.org  (syntax highlight código)
```

---

> **Versão:** 1.0 | **Criado em:** Outubro 2026  
> **Baseado em:** MagicAI v11.2, análise visual dos screenshots e documentação pública  
> **Stack alvo:** Laravel + MySQL + Alpine.js + TailwindCSS  
> **Objetivo:** Replicar e superar as capacidades do MagicAI no projeto existente, sem duplicar estruturas

---
*Documento gerado para uso interno. Todas as integrações devem respeitar os termos de serviço de cada provider de IA.*