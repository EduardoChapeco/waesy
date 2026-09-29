# MOTION.md — Física de Movimento, Durações e Acessibilidade Fisiológica

## 1. Princípios de Física de Movimento
O movimento na plataforma Waesy é utilitário, direto e silencioso (Apple Fluid Interfaces / Material 3 Motion):
1. **Intencional:** Animações existem unicamente para guiar a atenção do olhar e prover feedback mecânico de ações executadas.
2. **Interrompível:** O usuário pode reverter qualquer gesto ou transição em curso sem travar o thread de renderização.
3. **Não-Bloqueante:** Toda interação responde em menos de 100ms (Nielsen Limites de Resposta).

---

## 2. Escala Canônica de Durações e Curvas

| Papel de Movimento | Duração | Curva de Bézier | Uso no Sistema |
| --- | --- | --- | --- |
| **Instantâneo** | `100ms` | `cubic-bezier(0, 0, 0.2, 1)` | Troca de cor em hover, foco, pressionamento ativo de botão |
| **Micro-Interação** | `150ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Checkboxes, switches, tooltips e micro-chips |
| **Expansão / Retração**| `200ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Dropdowns, accordions, selects e banners de alerta |
| **Superfície Modal** | `250ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Bottom sheets, gavetas laterais e caixas de diálogo |
| **Transição de Rota** | `300ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Teto máximo do sistema: troca de páginas e navegação profunda |

---

## 3. Respeito Obrigatório a Movimento Reduzido (WCAG 2.3.3)
Para garantir conforto a usuários com transtornos vestibulares e epilepsia fotossensível:
- Todas as classes de transição devem respeitar `@media (prefers-reduced-motion: reduce)`.
- É obrigatório o uso de `motion-reduce:transition-none` ou desativação de transformações espaciais.
- Violações com animações lentas (>300ms) sem justificativa disparam a regra `DL-26`.
- Ausência de cancelamento de movimento dispara a regra `DL-28`.
