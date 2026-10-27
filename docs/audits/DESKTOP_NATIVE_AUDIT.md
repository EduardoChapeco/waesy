# DESKTOP_NATIVE_AUDIT.md — Auditoria da Experiência Desktop Native
## Densidade, Produtividade, Painéis Múltiplos, Ergonomia e Atalhos
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Componentes  

---

### 1. Diretriz Conceitual Desktop Native

> O Desktop **não é um app mobile esticado**.  
> Ele é um **workspace de alta produtividade**, projetado para corretores e operadores que trabalham com múltiplas janelas, monitores widescreen (1080p a 4K), mouse de alta precisão e atalhos de teclado.

---

### 2. Inventário de Recursos Desktop Implementados

1. **Toolbar Canônica com Alternância de Visualização (`WorkspaceCanonicalToolbar`):**
   - Suporta busca em tempo real com debounce, abas de status rápidas e acionamento de métricas em gaveta flutuante.
2. **Layouts de Painel Dividido (Split-Screen):**
   - No editor de propostas e pacotes, o corretor edita os parâmetros à esquerda enquanto visualiza a renderização exata do cliente à direita (WYSIWYG instantâneo).
3. **Densidade de Informação sem Poluição:**
   - Funis Kanban com colunas largas que exibem passageiro, data, destino e valor sem quebra de card.
   - Tabelas operacionais com ordenação por colunas, paginação e visualização de dados financeiros.
4. **Inspetor Lateral Deslizante (`Sheet` / `PagePanel`):**
   - Ao clicar em qualquer oportunidade no Radar Comercial, uma lâmina lateral de 540px se abre à direita, exibindo a decomposição dos 5 pesos de matching e o copy de abordagem sem tirar o usuário do fluxo principal.
5. **Navegação Rápida por Teclado:**
   - Todos os botões e campos de busca contêm anéis `:focus-visible` com contraste de 3:1 conforme WCAG 2.2 AA.
