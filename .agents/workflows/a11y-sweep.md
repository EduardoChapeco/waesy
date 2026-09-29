# WORKFLOW: a11y-sweep

## Metadados
- **Objetivo:** Varredura exaustiva do piso WCAG 2.2 AA (foco visível, touch targets, contraste e movimento).
- **Entradas:** Superfície interativa, formulário ou tela em revisão.
- **Saídas:** Relatório numérico de contraste, medidas de alvo e verificação de foco de teclado.
- **Teto de Passos:** 6 passos.

## Passos Numerados
1. **Varredura de Foco:** Inspecionar todos os elementos com `onClick` e garantir presença de `:focus-visible:ring-2`.
2. **Varredura de Toque:** Medir alvos interativos na casca móvel e impor dimensão mínima de 44x44px.
3. **Varredura de Contraste:** Extrair pares de cor (texto sobre fundo) e calcular razão de luminância relativa.
4. **Varredura de Movimento:** Confirmar cancelamento de transições via `motion-reduce:transition-none`.
5. **Varredura de Formulários:** Validar associação estrita de `<Label htmlFor="...">` com inputs.
6. **Emissão de Parecer:** Registrar aprovação com 0 violações P0 de acessibilidade.

## Critério de Parada
Parar e rejeitar entrega se qualquer texto normal apresentar razão de contraste inferior a 4.5:1.
