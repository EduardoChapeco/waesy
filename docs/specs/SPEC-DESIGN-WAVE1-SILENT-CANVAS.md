# SPEC-DESIGN-WAVE1 — Canvas silencioso e carrossel acessível

**Status:** Em execução
**Escopo:** `LiveTemplatePreviewModal` e `LaunchCarousel`
**Objetivo:** remover sinais de interface gerada, corrigir alvos táteis, retirar valores arbitrários e deixar estados visuais mais diretos sem alterar contratos de dados.

## Requisitos

- **Quando** o usuário abrir o preview de template, **o sistema deve** exibir controles de viewport com área mínima de 44px e foco visível.
- **Quando** o preview renderizar o canvas, **o sistema deve** usar apenas escala de largura/altura tokenizada, sem `w-[...]`, `min-h-[...]`, `transition-all` ou sombra pesada.
- **Quando** o carrossel apresentar um destaque, **o sistema deve** manter a imagem e o título legíveis sem gradiente decorativo sobre a superfície.
- **Quando** o usuário navegar pelo carrossel, **o sistema deve** oferecer botões de 44px, foco visível e respeito a movimento reduzido.
- **Quando** não existirem slides, **o sistema deve** ocultar a seção sem conteúdo sintético.

## Invariantes

- Nenhuma alteração em schema, BFF ou persistência.
- Nenhuma cor literal nova.
- Nenhum título ou botão conversacional.
- Botões com no máximo três palavras.
- `npm run typecheck`, `npm run build`, testes focados e `npm run lint:design` devem ser executados após a alteração.

## Evidência

- Diff restrito aos dois componentes e este documento.
- Resultado do lint antes/depois.
- Typecheck, build e testes focados aprovados.
