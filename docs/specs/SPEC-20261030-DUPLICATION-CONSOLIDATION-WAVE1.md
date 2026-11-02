# SPEC-20261030 — Consolidação de duplicações e ciclo de precificação

## Objetivo

Eliminar o ciclo entre o orquestrador de suprimentos turísticos e o conector Wooba, preservando todos os fluxos existentes e estabelecendo uma única fonte pura para cálculo de preços.

## Escopo atômico autorizado

- `src/lib/travel-pricing.ts`
- `src/services/travel-supply-orchestrator.service.ts`
- `src/services/travel-wooba-connector.service.ts`
- `src/lib/travel-pricing.test.ts`
- `docs/design/DECISIONS.md`

Não remover funções de busca, hold, reserva, compensação, integração externa ou contratos públicos internos nesta onda.

## Requisitos EARS

- Quando o orquestrador ou qualquer conector precisar calcular preço normalizado, o sistema deve importar a mesma função pura em `src/lib/travel-pricing.ts`.
- Quando um consumidor importar `calculateNormalizedPricing` do orquestrador, a exportação deve continuar disponível durante a consolidação.
- Quando `agencyMarkupPercent` for `0`, o cálculo deve preservar markup zero, sem aplicar o default de 10%.
- Quando valores opcionais de taxa forem negativos, o cálculo deve continuar normalizando-os para zero.
- Quando o grafo de dependências for auditado, não deve existir ciclo entre os dois serviços.

## Invariantes

- O total de venda continua sendo líquido + impostos + taxa do fornecedor + markup + taxa fixa.
- Nenhuma chamada ao banco, provider, storage ou criptografia entra no módulo puro.
- Nenhum segredo, preço calculado no cliente ou regra de tenant é deslocado para a UI.
- A busca multi-provider, a saga e os conectores mantêm seus contratos e chamadores atuais.

## Evidências de aceite

1. Testes de pricing cobrem markup padrão, markup zero e normalização de valores negativos.
2. `node scripts/check-circular-deps.mjs` não encontra ciclos.
3. Testes focados dos serviços continuam importando a API histórica sem alteração comportamental.
4. O diff contém somente os arquivos autorizados e a decisão arquitetural.

## Fora desta onda

CRM, propostas, Kanbans, RLS, migrações, criptografia de dados sensíveis e saneamento visual global serão ondas próprias, após comparação individual de callers, contratos, testes e persistência.
