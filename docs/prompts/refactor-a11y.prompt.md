# PROMPT: Fechamento de Piso de Acessibilidade WCAG 2.2 AA

## Metadados
- **Nome:** refactor-a11y
- **Gatilho:** Antes de qualquer fechamento de módulo ou entrega de rota interativa.
- **Papel:** a11y-guardian

## Instrução Executável
Execute o fechamento inegociável de acessibilidade:
1. Inspecione todos os botões e links garantindo anéis de foco visíveis (`focus-visible:ring-2`).
2. Garanta touch target mínimo de 44x44px no shell móvel (<600px).
3. Verifique que a razão de contraste de texto normal seja >= 4.5:1 e controles >= 3:1.
4. Confirme que animações possuam `motion-reduce:transition-none`.
5. Valide que inputs possuam tags `<Label>` associadas via `htmlFor`.
