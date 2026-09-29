# Eficiência em Runtime & Prevenção de Bloqueio

Garantir 60 FPS consistentes na interação do usuário (INP < 200ms).

## Prevenção de Layout Thrashing
- Nunca alterne leituras (`offsetHeight`, `getBoundingClientRect`) com escritas (`style.width`, `style.height`) em loops.
- Agrupe todas as leituras primeiro, armazene em variáveis e faça todas as escritas em lote.

## Virtualização Nativa & content-visibility
- Para listas longas (>50 itens), use a propriedade CSS:
  `content-visibility: auto; contain-intrinsic-size: 0 80px;`
- Isso permite que o navegador ignore o trabalho de renderização de nós fora da viewport.

## View Transitions API
- Utilizar `@view-transition { navigation: auto; }` para transições de páginas aceleradas por GPU sem flash ou recalculo pesado de layout.
