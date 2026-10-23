# SPEC-PARALLEL-03 — Builder Theme Panel

## Escopo

Remediar no componente `src/components/admin/builder/builder-global-theme-panel.tsx` as violações comprovadas de tokens, campos de formulário, alvos táteis e foco visível. O único artefato adicional permitido é esta especificação.

Fora do escopo: alteração de rotas, serviços, persistência, `GlobalThemeConfig`, `BuilderGlobalThemePanelProps`, callbacks, eventos de tema, opções de tema, dados das paletas, `DECISIONS.md`, lockfiles e relatórios gerados.

## Requisitos EARS

- **Quando** o painel for renderizado, **então** os controles nativos e os controles de seleção de paleta/geometria devem usar classes sem valores arbitrários, tamanhos canônicos e foco visível com anel de 2px.
- **Quando** uma paleta for selecionada, **então** `onChangeTheme` deve receber exatamente os mesmos valores `primaryColor`, `backgroundColor` e `textColor` do contrato atual, sem alterar o evento, o toast ou a seleção visual.
- **Quando** o padrão for restaurado, **então** o mesmo patch atual deve ser enviado e a mesma mensagem de toast deve ser exibida.
- **Quando** uma opção de raio ou fonte for alterada, **então** o mesmo campo e o mesmo valor selecionado devem ser enviados por `onChangeTheme`.
- **Quando** o usuário navegar por teclado, **então** todos os elementos focáveis do painel devem expor foco visível e os controles de ação devem possuir área mínima de 44px.

## Invariantes

1. As interfaces exportadas, nomes de props, assinatura de `onChangeTheme`, assinatura de `onClose` e o shape de `GlobalThemeConfig` permanecem idênticos.
2. Os valores literais das paletas e do reset são dados do contrato de tema, não declarações CSS; devem permanecer byte a byte iguais. A evidência deve distinguir esses dados de estilos inline.
3. Nenhuma rota, estado assíncrono, dado novo, dependência ou comportamento de persistência será inventado.
4. A remediação deve limitar-se ao componente autorizado e a esta spec.
5. As mudanças visuais ficam restritas à aplicação de tokens canônicos, alvo tátil e foco; não há alteração de fluxo ou de payload.

## Critérios de aceite

- [ ] `text-[10px]`/`text-[11px]` e `transition-all` não aparecem no componente.
- [ ] A prévia de cores não usa `style={{ ... }}`; continua exibindo os valores de tema sem alterar o patch enviado.
- [ ] Selects, botões e seletores de paleta têm altura mínima de 44px quando aplicável.
- [ ] Botão de reset, seletores de paleta e opções de raio têm `focus-visible` com anel de 2px.
- [ ] Não há mudança no contrato TypeScript, nos textos operacionais, nos eventos ou nos dados das paletas.
- [ ] `git diff --check` retorna código 0.
- [ ] `npm run typecheck` é executado no worktree e seu resultado é registrado no handoff.

## Evidência planejada

- Diff restrito a este arquivo e esta spec, confirmado por `git status`/`git diff --name-only`.
- Auditoria direcionada do componente com `scripts/design-lint.mjs` antes e depois, registrando as regras remediadas e qualquer falso positivo de dado de contrato.
- `git diff --check` e `npm run typecheck` executados no worktree `/home/ubuntu/waesy-parallel-builder-theme-panel`.
- Commit final com a mensagem `fix(design): remediate builder-theme-panel`.
