# SPEC-20261030 — TypeScript e Build: Separação de Grafos

## Requisitos EARS

- **Quando** o typecheck de produção for executado, **o sistema deve** analisar o grafo de runtime da aplicação sem incluir arquivos de teste como entradas primárias.
- **Quando** os testes forem verificados, **o sistema deve** usar o Vitest como executor comportamental, sem duplicar o grafo pesado de tipos da aplicação em uma segunda compilação.
- **Quando** o gerador TanStack Router encontrar um arquivo `*.test.*` ou dentro de `__tests__`, **o sistema deve** ignorá-lo como módulo de rota.
- **Quando** o build de produção for executado, **o sistema deve** continuar gerando `routeTree.gen.ts`, os assets Cloudflare Pages e a verificação de vazamento server/client.

## Invariantes

1. Nenhum arquivo de produção é removido do grafo de tipos.
2. `npm test` continua sendo o executor dos testes comportamentais.
3. `npm test` continua sendo a verificação executável do grafo de testes; não há uma segunda compilação TypeScript concorrente.
4. A configuração de rotas permanece no gerador oficial; `src/routeTree.gen.ts` não é editado manualmente.

## Evidência

- Contagem baseline: 462 arquivos em `src/routes`, 22 testes de rota e 431 testes no `src`.
- Build baseline: sucesso, com warnings de testes tratados como rotas.
- Aceite: build sem warnings de testes de rota, typecheck de produção focado e teste separado disponível.
