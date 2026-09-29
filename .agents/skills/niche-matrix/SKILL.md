---
name: niche-matrix
description: Auditoria de coerência semântica de nichos, verticais de negócio, campos dinâmicos e taxonomia unificada em toda a plataforma.
---

# Niche Matrix — Matriz de Nichos e Verticais

## Gatilho
Ao criar ou modificar fluxos de cadastro de negócio, filtros de busca, campos por segmento ou categorização de produtos e anúncios.

## Quando NÃO Usar
- Em rotas administrativas genéricas ou operações financeiras que independem da vertical do negócio.

## Entradas
1. Identificadores de nicho em `src/lib/niche-semantics.ts` e `store_segments`.
2. Formulários dinâmicos de criação de negócio e catálogo.
3. Filtros da barra de busca e vitrines públicas.

## Saídas
- Mapeamento consistente de nichos onde cada vertical altera campos reais, rótulos e taxonomia.

## Procedimento
1. **G1 Modelo Único:** Verificar se os nichos são derivados de uma única fonte canônica (`niche-semantics.ts`).
2. **G2 Cobertura de Campos:** Checar se a seleção de nicho carrega os campos operacionais corretos.
3. **G3 Anti-Duplicidade:** Eliminar variações redundantes (ex: singular/plural, acentuação divergente).
4. **G4 Hierarquia Real:** Validar que categorias filhas pertencem a nichos ativos existentes.
5. **G5 Direcionamento Funcional:** Garantir que o nicho altera fluxos de negócio reais e não é meramente decorativo.
6. **G6 Consistência Global:** Confirmar que vitrines, busca, lugares e cards usam o mesmo rótulo para o nicho.
7. **G7 Internacionalização/Texto:** Usar chaves semânticas centralizadas, sem strings soltas espalhadas.

## Regras Duras
- Proibido declarar listas de nichos hardcoded divergentes em telas distintas.
- Nicho que não altera campos dinâmicos nem comportamento é considerado quebra B12.

## Anti-Padrões
- Criar dropdown de nicho na UI que não é persistido nem consumido pelo backend.
- Exibir campos irrelevantes para a vertical (ex: quartos/banheiros em lanchonete).

## Critério de Pronto
Matriz de nichos unificada, campos operacionais específicos validados e sem categorias duplicadas.
