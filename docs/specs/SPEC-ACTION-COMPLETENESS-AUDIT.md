# SPEC-ACTION-COMPLETENESS-AUDIT

## Contexto
Botões e CTAs do Waesy devem executar uma ação real, navegar para um destino válido, submeter formulário, abrir fluxo com continuidade, ou comunicar honestamente que estão indisponíveis. A presença sintática de `onClick` não é evidência suficiente de completude.

## Requisitos EARS
- Quando um controle interativo for renderizado como `Button`, `button`, `a`, `Link` ou elemento com `role="button"`, o sistema deve classificá-lo em uma intenção canônica: `navigate`, `submit`, `mutate`, `open-modal-with-continuation`, `copy-share`, `preview-only` ou `disabled-with-reason`.
- Se a intenção for `mutate`, então o handler deve chamar mutation, Server Function, ação assíncrona persistente ou fluxo operacional equivalente, com feedback de loading/erro quando aplicável.
- Se a intenção for `navigate`, então o controle deve declarar `asChild`, `href`, `to`, ou estar dentro de link válido sem aninhamento DOM inválido.
- Se a intenção for `preview-only`, então o controle não deve prometer sucesso transacional e deve declarar `data-action-intent="preview-only"` ou texto visual inequívoco de prévia.
- Se o controle estiver desabilitado de forma permanente, então deve possuir motivo explícito via `title`, `aria-label`, `aria-describedby` ou `data-action-reason`.
- Se o handler contiver no-op, `console.log`, `alert`, ou `toast` que simula sucesso sem persistência, então a auditoria deve gerar `P1`.
- Se houver `<Link>` ou `<a>` envolvendo `<Button>` sem `asChild`, então a auditoria deve gerar `P0`.

## Evidência Esperada
- `node scripts/audit/audit-interactive-buttons.mjs` gera `scripts/audit/button-ast-audit.json` com `totalControls`, `summaryBySeverity`, `summaryByIntent` e `issues[]`.
- `node scripts/audit/audit-interactive-buttons.test.mjs` cobre botão morto, submit, `asChild`, tab, toast falso, preview-only, link inválido e mutation real.
- `npm run check:canonical` executa a auditoria de botões antes dos demais gates.
