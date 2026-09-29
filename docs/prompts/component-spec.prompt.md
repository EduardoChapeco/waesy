# PROMPT: Especificação e Criação de Componente Canônico

## Metadados
- **Nome:** component-spec
- **Gatilho:** Ao criar ou refatorar qualquer componente em `src/components/`.
- **Papel:** component-craftsman + spec-writer

## Instrução Executável
Construa um componente modular de alto padrão em estrita conformidade com `docs/design/COMPONENT-API.md`:
1. Valide que não existe primitivo duplicado no catálogo.
2. Defina Props tipadas em TypeScript e variantes com CVA consumindo tokens semânticos.
3. Cubra obrigatoriamente a matriz de 4 estados: Loading (Skeleton), Data, Empty (2 linhas) e Error (com reintento).
4. Assegure foco visível com `:focus-visible:ring-2` e touch target >= 44x44px no mobile.
5. Verifique a compilação com `npm run typecheck`.
