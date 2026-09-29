# Diretrizes de Acessibilidade Digital (WCAG 2.2 Nível AA) — Waesy Platform

> **Fonte Única de Verdade (SSOT) para Acessibilidade, Inclusão e Conformidade Legal**  
> Alinhado aos padrões W3C / WAI WCAG 2.2, Apple Human Interface Guidelines e Lei Brasileira de Inclusão (LBI nº 13.146/2015, Art. 63).

---

## 1. Princípios POUR Aplicados à Arquitetura Waesy

### 1.1 Perceptível (Perceivable)
1. **Imagens & Mídia:**
   - Imagens de produtos, fotos de estabelecimentos, documentos e avarias possuem `alt` com conteúdo real.
   - Ícones SVG decorativos são marcados com `aria-hidden="true"`.
   - Botões com apenas ícone (ex: botões de busca, fechar modal, carrinho, ações rápidas) recebem obrigatoriamente `aria-label` descritivo.
2. **Contraste de Cores:**
   - Todo texto normal possui contraste mínimo de **4.5:1** em relação ao plano de fundo.
   - Todo texto em destaque e elementos gráficos de controle possuem contraste mínimo de **3:1**.
   - Estados de foco (`:focus-visible`) utilizam `outline: 2px solid currentColor` ou anel com contraste comprovado $\ge$ 3:1.
3. **Independência de Cor:**
   - Validações de erro em formulários combinam borda destacada, ícone de alerta e mensagem explicativa associada via `aria-describedby`.

### 1.2 Operável (Operable)
1. **Navegação Integral por Teclado:**
   - Elementos interativos utilizam tags semânticas nativas (`<button>`, `<a href>`, `<input>`).
   - Ativação universal via tecla `Enter` e barra de `Espaço`.
   - Foco lógico de cima para baixo, da esquerda para a direita, sem armadilhas de teclado.
2. **Foco Visível e Não Encoberto (WCAG 2.4.11):**
   - É expressamente proibido zerar o outline sem indicador visual (`*:focus { outline: none; }` sem `:focus-visible`).
   - Todos os elementos focáveis contêm `scroll-margin-top: 80px` e `scroll-margin-bottom: 60px` em `src/styles.css` para evitar que barras flutuantes (`TopBar` ou `MobileNav`) ocultem o cursor de foco do usuário.
3. **Alvos de Toque (WCAG 2.5.8 & Apple HIG):**
   - No shell mobile, touch targets mínimos de **44 × 44 pixels** (`h-11`, `min-h-[44px]`).
   - No shell desktop, dimensões mínimas de **24 × 24 pixels** (recomendado 32 a 36px).
4. **Skip Link (WCAG 2.4.1):**
   - Link invisível no topo da página que se torna visível ao primeiro `Tab` (`.skip-link`), permitindo pular direto para o `<main id="main-content">`.
5. **Preferência de Movimento Reduzido (WCAG 2.3.3):**
   - Suporte estrito a `@media (prefers-reduced-motion: reduce)` em `src/styles.css`, desligando animações complexas para usuários sensíveis a vertigem visual.

### 1.3 Compreensível (Understandable)
1. **Idioma Declarado:**
   - Tag `<html lang="pt-BR">` em `src/routes/__root.tsx`.
2. **Associação de Formulários:**
   - Todo input possui rótulo claro associado via `<Label htmlFor="id">`.
3. **Prevenção de Entrada Redundante (WCAG 3.3.7):**
   - Checkout, CRM e PDV memorizam dados prévios e oferecem seleção em 1 toque sem exigir redigitação do mesmo endereço ou documento.
4. **Autenticação Inclusiva (WCAG 3.3.8):**
   - Permissão irrestrita para colar senhas e códigos OTP a partir de gerenciadores de senhas (`autocomplete` apropriado).

### 1.4 Robusto (Robust)
1. **Semântica HTML5 Nativa:**
   - Tags `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<section>` e `<article>`.
2. **Regiões Vivas (Live Regions):**
   - Modais, toasts e alertas utilizam `role="status"` ou `role="alert"` com `aria-live` calibrado para leitores de tela (NVDA, JAWS, VoiceOver, TalkBack).

---

## 2. Tabela de Utilitários CSS de Acessibilidade

```css
/* Utilitário para conteúdo legível apenas por leitores de tela */
.visually-hidden,
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Foco que desoculta o skip-link ao navegar via teclado */
.sr-only-focusable:focus,
.sr-only-focusable:focus-visible,
.skip-link:focus,
.skip-link:focus-visible {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 9999;
  width: auto;
  height: auto;
  padding: 0.75rem 1.25rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-radius: var(--radius-xl);
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
}
```
