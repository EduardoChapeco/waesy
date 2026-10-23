# SPEC-PARALLEL2-03 — Listing Preview Frame

- **Data:** 2026-10-23
- **Status:** Aprovado para implementação
- **Base:** `b27deabf`
- **Branch:** `paralelo2/listing-preview-frame`
- **Arquivos autorizados:** `src/components/ad-engine/preview/canonical-listing-preview-frame.tsx` e esta spec

## Escopo e diagnóstico comprovado

Remediar somente os achados comprovados na moldura de pré-visualização canônica:

- **DL-18/P1 (superfície):** o contêiner de viewport usa `dark:bg-black/40`, cor literal proibida fora da camada semântica de tokens.
- **DL-14/P1 (responsividade/tato):** sete controles da toolbar declaram `h-8` ou `size-8`, abaixo do piso móvel de 44x44px.
- **DL-07/P2 (superfície):** a moldura do anúncio usa `shadow-2xl` em uma superfície de aplicação, embora elevação decorativa seja reservada a overlays.
- **DL-27/P3 (movimento):** a moldura usa `transition-all`, sem limitar a transição às propriedades necessárias.
- **Acessibilidade verificável no código:** controles iconográficos dependem de `title` para nome acessível e os anéis são repetidos como comentário e classes locais; a remediação explicita `aria-label` nos controles sem rótulo persistente e usa o token de foco canônico.

O preview deve continuar renderizando a mesma `CanonicalListingView`, com o mesmo `listing`, `isPreviewMode`, viewport inicial, callbacks, tipos, rotas e dados reais. Não serão criados dados sintéticos, imagens de fallback, placeholders de anúncio ou novos contratos.

## Requisitos EARS

1. **Quando** a superfície de viewport for renderizada em qualquer tema, **o sistema deve** consumir apenas classes semânticas de superfície, borda e conteúdo, sem `bg-black`, `text-black`, `bg-white`, `text-white` ou cores literais.
2. **Enquanto** a toolbar estiver montada em uma viewport compacta, **cada** seletor de viewport, controle de zoom/reset e ação de abertura externa **deve** manter área mínima de 44x44px (`h-11`/`min-h-11` e `size-11`/`min-w-11` quando aplicável).
3. **Quando** qualquer controle da toolbar receber foco por teclado, **o sistema deve** exibir anel visível de 2px usando token semântico, sem depender de hover ou estado adicional.
4. **Enquanto** um controle iconográfico não tiver texto visível, **o sistema deve** expor nome acessível por `aria-label`; a ação e o callback já existentes devem permanecer idênticos.
5. **Quando** a moldura for escalada para caber no contêiner, **o sistema deve** preservar a largura-alvo do viewport, a escala proporcional existente e a árvore única de `CanonicalListingView`, sem alterar qualquer campo do anúncio.
6. **Enquanto** a moldura estiver em transição, **o sistema deve** animar somente a transformação necessária e respeitar `prefers-reduced-motion`; a superfície não deve usar sombra decorativa.
7. **Quando** o arquivo for analisado pelo lint determinístico, **o sistema deve** produzir zero violações P0/P1 no arquivo e não introduzir classes arbitrárias, cores literais, dados sintéticos ou contratos novos.

## Invariantes e não escopo

- `CanonicalListingPreviewFrameProps`, `PreviewViewport`, `VIEWPORT_WIDTHS`, `listing`, `initialViewport`, `className` e `onOpenExternalPreview` permanecem com os mesmos tipos e significados.
- Os três modos `mobile`, `tablet` e `desktop` continuam na mesma ordem, com as mesmas larguras (390, 768 e 1280), ícones, títulos e callbacks.
- Os limites de zoom (0,6 a 1,4), o reset, o cálculo proporcional e o `ResizeObserver` permanecem inalterados em comportamento.
- `CanonicalListingView` continua sendo o único renderizador do anúncio, recebendo o mesmo objeto `listing` e `isPreviewMode={true}`.
- Não alterar dados do anúncio, regras de negócio, mídia real, props, callbacks, rotas, `DECISIONS.md`, lockfiles, relatórios gerados ou qualquer arquivo fora dos dois paths autorizados.
- Achados fora deste componente ou mudanças de shell do editor não fazem parte desta tarefa.

## Critérios de aceite e evidências

1. A spec existe antes da mutação do componente.
2. `git diff --check` retorna código 0.
3. `npm run typecheck` retorna código 0.
4. O lint determinístico executado em memória exclusivamente para `src/components/ad-engine/preview/canonical-listing-preview-frame.tsx` retorna zero violações P0/P1.
5. A inspeção do diff confirma preservação de tipos, props, callbacks, rotas, árvore canônica e dados do anúncio.
6. `git status` contém somente o componente autorizado e esta spec.
7. O commit usa exatamente `fix(design): remediate listing-preview-frame`.
8. Não fazer push ou merge.
