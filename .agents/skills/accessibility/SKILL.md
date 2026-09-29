---
name: accessibility
description: "Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to 'improve accessibility', 'a11y audit', 'WCAG compliance', 'screen reader support', 'keyboard navigation', or 'make accessible'."
---

# Accessibility & Inclusive Design Protocol (WCAG 2.2 AA) — Waesy Platform

> **DIRETRIZ CENTRAL:** Todo software desenvolvido na Waesy deve ser plenamente utilizável por qualquer ser humano, independentemente de limitações físicas, visuais, motoras, auditivas ou cognitivas. O padrão mínimo inegociável é **WCAG 2.2 Nível AA** (com adoção pró-ativa de critérios AAA recomendados).

---

## 🏛️ Os 4 Princípios Fundamentais (POUR)

| Princípio | Descrição | Requisito Canônico Waesy |
| :--- | :--- | :--- |
| **P — Perceivable (Perceptível)** | O conteúdo e a interface devem poder ser percebidos por múltiplos sentidos. | Textos alternativos (`alt`), contraste mínimo 4.5:1, legendas/transcrições e nunca depender exclusivamente de cor. |
| **O — Operable (Operável)** | Todos os controles e fluxos devem poder ser operados por qualquer meio de entrada. | Navegação universal por teclado, sem keyboard traps, alvos de toque de 44px, `:focus-visible` desimpedido e sem limites de tempo forçados. |
| **U — Understandable (Compreensível)** | A informação, os estados e a operação da interface devem ser claros e previsíveis. | Idioma declarado (`lang="pt-BR"`), navegação e ajuda consistentes, rótulos explícitos em formulários e erros em `aria-live`. |
| **R — Robust (Robusto)** | O código deve ser interpretável de forma confiável por tecnologias assistivas atuais e futuras. | HTML5 semântico nativo antes de ARIA, atributos ARIA válidos, `role="alert"` em mensagens críticas e live regions. |

---

## 👁️ 1. Princípio Perceptível (Perceivable)

### 1.1 Alternativas em Texto (WCAG 1.1.1)
- **Imagens Informativas:** Devem possuir atributo `alt` descritivo e objetivo.
  ```html
  <!-- ❌ Ruim: Sem alt ou alt genérico -->
  <img src="grafico-vendas.png">
  <img src="grafico-vendas.png" alt="imagem">

  <!-- ✅ Correto: Descrição fiel do dado -->
  <img src="grafico-vendas.png" alt="Gráfico de barras indicando aumento de 32% nas vendas do 3º trimestre">
  ```
- **Imagens Decorativas:** Devem conter `alt=""` explícito e `role="presentation"` ou `aria-hidden="true"`.
  ```html
  <img src="pattern-bg.svg" alt="" role="presentation" aria-hidden="true" />
  ```
- **Botões de Ícone (Icon Buttons):** NUNCA deixe botões apenas com SVG sem nome acessível.
  ```tsx
  // ❌ Inacessível para leitores de tela
  <button><Search className="size-4" /></button>

  // ✅ Correto: aria-label no botão + aria-hidden no ícone
  <button aria-label="Pesquisar catálogo" className="...">
    <Search className="size-4" aria-hidden="true" />
  </button>

  // ✅ Alternativa: Texto oculto com classe .sr-only
  <button className="...">
    <Search className="size-4" aria-hidden="true" />
    <span className="sr-only">Pesquisar produtos e lojas</span>
  </button>
  ```

### 1.2 Contraste de Cor Rigoroso (WCAG 1.4.3 / 1.4.6 / 1.4.11)
- **Texto Normal (< 18px ou < 14px bold):** Mínimo **4.5:1** (Nível AA) ou **7:1** (Nível AAA).
- **Texto Grande (>= 18px ou >= 14px bold):** Mínimo **3:1** (Nível AA) ou **4.5:1** (Nível AAA).
- **Componentes de UI & Gráficos Interativos:** Mínimo **3:1** contra o fundo adjacente.
- **Proibição de Dependência Exclusiva de Cor (WCAG 1.4.1):**
  - Nunca use apenas cor para indicar erro, sucesso ou status. Combine cor + ícone + texto de apoio.
  ```tsx
  // ❌ Erro indicado apenas pela borda vermelha
  <input className="border-red-500" />

  // ✅ Erro com atributo aria-invalid, ícone e mensagem em texto associada
  <div className="space-y-1">
    <Input aria-invalid="true" aria-describedby="email-error" className="border-destructive" />
    <p id="email-error" className="text-xs text-destructive flex items-center gap-1">
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      <span>Informe um endereço de e-mail válido</span>
    </p>
  </div>
  ```

---

## 🕹️ 2. Princípio Operável (Operable)

### 2.1 Acessibilidade Total por Teclado (WCAG 2.1.1 / 2.1.2)
- Qualquer funcionalidade operável por mouse ou toque DEVE ser operável exclusivamente por teclado (`Tab`, `Shift+Tab`, `Enter`, `Espaço`, `Esc`, setas direcionais).
- **Prefira Elementos Nativos:** Use sempre `<button>` para ações e `<a href="...">` para navegação. Nunca transforme `<div>` ou `<span>` em botões semânticos quando um `<button>` puder ser usado.
- **Sem Armadilhas de Teclado (No Keyboard Traps):** O foco do usuário nunca deve ficar preso em nenhum container, exceto em modais/dialogs onde um foco cíclico controlado é esperado e cancelável via tecla `Esc`.

### 2.2 Foco Visível & Foco Não Encoberto (WCAG 2.4.7 & 2.4.11 — Novo no WCAG 2.2)
- **Proibido `outline: none` sem substituto:**
  ```css
  /* ❌ Inaceitável */
  *:focus { outline: none; }

  /* ✅ Correto: Anel visível para navegação via teclado */
  :focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  ```
- **Foco Não Encoberto por Barras Fixas (WCAG 2.4.11):** Elementos em foco NUNCA podem ser cobertos por headers ou footers fixos (`TopBar`, `MobileNav`):
  ```css
  /* ✅ Margens de rolagem automáticas para elementos em foco */
  :focus, :focus-visible {
    scroll-margin-top: 80px;
    scroll-margin-bottom: 60px;
  }
  :target {
    scroll-margin-top: 80px;
  }
  ```

### 2.3 Skip Links para Navegação Rápida (WCAG 2.4.1)
- O topo da aplicação deve oferecer um link de salto direto para o conteúdo principal, permitindo que usuários de leitor de tela ou teclado pulem cabeçalhos e menus repetitivos:
  ```html
  <a href="#main-content" className="skip-link">Pular para o conteúdo principal</a>
  ```

### 2.4 Dimensão de Alvo de Toque (WCAG 2.5.8 — Target Size)
- **Mínimo Legal WCAG 2.2 AA:** 24 × 24 CSS pixels.
- **Padrão Canônico Waesy (Apple HIG / Nielsen Norman):** Alvos confortáveis de **44 × 44 pixels** (`h-11`, `min-h-[44px]`) em todas as superfícies interativas no mobile.

### 2.5 Respeito à Preferência de Movimento Reduzido (WCAG 2.3.3)
- Usuários com distúrbios vestibulares devem ter animações desativadas instantaneamente quando configurado no sistema operacional:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 🧠 3. Princípio Compreensível (Understandable)

### 3.1 Rótulos Programaticamente Associados (WCAG 3.3.2)
- Todo `<Input>`, `<Select>` ou `<Textarea>` DEVE possuir um `<Label>` com `htmlFor` correspondente ao `id` do elemento.
  ```tsx
  <div className="space-y-1.5">
    <Label htmlFor="customer-cpf">CPF do Titular</Label>
    <Input id="customer-cpf" type="text" placeholder="000.000.000-00" />
  </div>
  ```

### 3.2 Prevenção de Entrada Redundante (WCAG 3.3.7 — Novo no WCAG 2.2)
- O sistema NUNCA deve exigir que o usuário digite novamente dados já fornecidos na mesma sessão (ex: endereço de cobrança idêntico ao de entrega, ou CPF já autenticado). Ofereça preenchimento automático em 1 toque.

### 3.3 Autenticação Acessível (WCAG 3.3.8 — Novo no WCAG 2.2)
- É terminantemente PROIBIDO bloquear a ação de colar (`paste`) em campos de senha ou tokens.
- Sempre suporte `autocomplete="current-password"`, `autocomplete="email"` e métodos passwordless (links mágicos, OTP, passkeys).

---

## 🛡️ 4. Princípio Robusto (Robust) & ARIA Canônico

### 4.1 Regra de Ouro do ARIA
> *"Se você pode usar um elemento HTML semântico com as características e comportamento necessários, use-o em vez de reaproveitar um elemento genérico adicionando uma função ARIA."*

### 4.2 Notificações e Regiões Vivas (Live Regions — WCAG 4.1.3)
- Feedbacks dinâmicos de carrinho, atualizações de estoque e mensagens de erro assíncronas devem utilizar `aria-live="polite"` (para anúncios informativos) ou `aria-live="assertive"` / `role="alert"` (para falhas críticas imediatas).

---

## 📋 Checklist de Auditoria & Verificação

1. **Navegação por Teclado:** A página é 100% percorrível via `Tab`? Os modais prendem o foco e fecham com `Esc`?
2. **Leitor de Tela (NVDA / VoiceOver):** Todos os botões possuem rótulo sonoro claro?
3. **Contraste:** Todas as cores de texto atendem a 4.5:1 no light e dark mode?
4. **Zoom 200%:** A interface quebra ou sobrepõe texto quando ampliada em 200% no navegador?
5. **Reduced Motion:** Ativar `prefers-reduced-motion` no SO congela animações e transições?
6. **Alvo de Toque:** Todos os botões móveis possuem no mínimo 44px de altura e largura?
