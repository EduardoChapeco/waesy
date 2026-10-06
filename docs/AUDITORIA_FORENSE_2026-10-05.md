# Auditoria forense do Waesy — 2026-10-05

## Escopo desta rodada

Esta rodada auditou a branch `main` do repositório `EduardoChapeco/waesy` em uma cópia limpa, com foco em:

- reprodutibilidade da instalação;
- typecheck, lint, testes e build;
- auditoria estática de botões e design;
- harness interno de auditoria;
- detecção de código morto, duplicidades e ciclos;
- regressões nos testes de cache edge, gateway de IA e autoridade de ciclo de vida de classificados;
- preparação para a auditoria end-to-end de mining, copilot, builders e editores.

Esta rodada **não deve ser interpretada como certificação de todos os fluxos de produção**. A validação de browser real, Supabase remoto, jobs cron, RLS em banco implantado, credenciais de provedores e integrações externas exige uma segunda camada de testes de ambiente.

## Repositório e estado auditado

- Repositório: `EduardoChapeco/waesy`
- Branch de origem: `main`
- Branch de correção: `audit/forensic-baseline-fixes`
- Commit auditado na origem: `920d6fff`
- Stack: React 19, Vite, TanStack Router/Start, TypeScript, Vitest, Supabase, Cloudflare Pages/Worker
- Inventário observado: 1.855 arquivos de código, 211 arquivos de teste e 438 migrations

## Baseline inicial reproduzida

| Gate | Resultado inicial | Evidência |
|---|---:|---|
| `npm ci --no-audit --no-fund` | Falhou | `package.json` e lockfile não estavam sincronizados; faltava `lru-cache@11.5.3` no lockfile |
| `npm run typecheck` | Passou | 0 erros TypeScript |
| `npm run lint` | Passou com dívida | 0 erros e 7.632 warnings; 67 potencialmente corrigíveis automaticamente |
| `npm test` | Falhou | 3 suites/casos falharam; 202 arquivos passaram, 1.394 testes passaram e 2 falharam |
| `npm run build` | Passou com warnings | bundle e worker gerados; client-leak passou; aviso sobre `sideEffects: false` ignorando imports de runtime |
| `npm run audit:buttons` | Passou | 1.024 arquivos, 6.145 controles, P0/P1/P2 = 0 |
| `npm run audit:buttons:test` | Passou | 8/8 testes normativos |
| `npm run lint:design:test` | Passou | 44/44 testes normativos |
| `npm run audit:all` | Passou | harness gerou inventário de 395 rotas e relatório consolidado |
| `npm run check:duplication:warn` | Passou | inventário canônico sem duplicidade de campo |
| `npm run check:deadcode` | Passou como detector | 85 órfãos e 23 nomes/componentes coincidentes foram detectados |
| `npm run check:cycles` | Passou | 0 ciclos de aplicação |
| `npm run check:type s-ssot` | Falhou por comando inválido | o script correto é `check:types-ssot`; o comando executado pela auditoria estava incorreto |

## Correções aplicadas nesta branch

### 1. Lockfile reproduzível

Foi adicionada somente a entrada aninhada ausente de `node_modules/nitro/node_modules/lru-cache` no `package-lock.json`. Após a alteração:

```text
npm ci --no-audit --no-fund --ignore-scripts
added 977 packages
```

O `npm ci` foi executado em instalação limpa, sem depender do `node_modules` anterior.

### 2. Teste de ciclo de vida de classificados

O teste mockava `@tanstack/react-start` sem exportar `createIsomorphicFn`, embora o código importado por `edge-cache.ts` o utilize. O mock foi completado e o contexto de `getRequest()` foi explicitamente definido para uma rota `/_serverFn/`.

### 3. Teste de cache edge

O teste de `applyServerFnEdgeCache` não simulava uma Server Function. Como a implementação corretamente força cache privado quando a chamada não está em `/_serverFn/`, o teste foi alinhado ao contrato real e recebeu um mock chamável de `createIsomorphicFn`.

### 4. Teste do gateway de IA

O teste de proteção contra vazamento de segredo chamava o endpoint externo do provedor porque apenas a chave havia sido mockada. O teste agora stubba `fetch` com resposta determinística e restaura o global após cada caso. Isso elimina dependência de rede, timeout e risco de uso acidental de credencial em teste.

## Validação após as correções

- Teste direcionado do cache: 1 arquivo, 6 testes, todos aprovados.
- Teste direcionado dos três módulos: todos aprovados.
- Suíte completa: aprovada; 205 arquivos de teste e 1.400 testes.
- `npm ci` limpo: aprovado.
- `npm run build`: aprovado; client-leak passou e o worker foi gerado.
- `npm run check:route-budget`: aprovado; 100% das rotas dentro do orçamento.
- `npm run check:tokens`: aprovado; 133 tokens carregados, 0 aliases quebrados e paridade CSS 100%.
- `npm run check:naming`: aprovado; 0 violações críticas.

## Achados que permanecem abertos

### Lint

O lint não possui erros bloqueantes, mas 7.632 warnings permanecem. A maior concentração está em `legacy_quarantine`, porém a dívida também alcança código ativo. A próxima etapa deve:

1. separar warnings de legado e runtime ativo;
2. corrigir primeiro hooks com dependências ausentes, blocos vazios e tipos `any` em caminhos críticos;
3. converter o orçamento de warnings em gate gradual;
4. impedir que novos warnings sejam adicionados.

### Código órfão e duplicidade estrutural

O detector encontrou 85 arquivos órfãos e 23 nomes/componentes coincidentes. Os nomes coincidentes não provam duplicidade funcional, mas são candidatos de unificação, especialmente:

- `classified-form` em admin e commerce;
- `product-grid` em commerce e dynamic-sections;
- `ProposalFormFields` e `ProposalStudio` em propostas gerais e turismo;
- `StudioFormatPicker`, `StudioFrame`, `StudioMapWidget` e `StudioSidebar` em studio geral e turismo;
- registries separados de builder, documentos e templates sociais.

Nenhum arquivo deve ser removido sem comprovar referências, rotas e contratos.

### Harness interno

O `audit:all` detecta ocorrências expressivas em C01, C06, C07, C08, C09, C18, C22, C23, C26, C28, C37 e C41. Esses contadores são sinais de investigação, não falhas isoladas. Devem ser correlacionados com rotas e fluxos reais antes de correção em massa.

### Build

O build passa, mas o bundler reporta imports de runtime ignorados porque o pacote declara `sideEffects: false`. Isso deve ser revisado para garantir que módulos de runtime como `dist/_worker.js/_runtime.mjs` não sejam eliminados indevidamente em uma mudança futura.

### Design lint real

O teste normativo do design-lint passa, mas a execução completa de `npm run lint:design` encontrou dívida existente:

- P0: 1.557 violações;
- P1: 10.027 violações;
- P2: 1.332 violações;
- P3: 1.368 violações;
- total: 14.284 violações em 879 de 1.854 arquivos.

O comando saiu com código 0 porque está configurado em modo `--ratchet` e reduziu o teto em 8 violações. Isso não significa que o design esteja limpo. A baseline não foi atualizada para esconder a dívida.

### Tipos duplicados

`npm run check:types-ssot` falha com duas duplicidades que precisam de consolidação cuidadosa:

- `ResolvedGeoLocation`: `src/lib/mining/geo-resolver.ts` e `src/lib/network-telemetry.server.ts`;
- `OrderItemDTO`: `src/services/orders.functions.ts` e `src/types/orders.ts`.

Essas duplicidades são um risco de divergência de contrato e devem ser corrigidas em um lote separado, com migração de imports e testes de compatibilidade.

## Próxima fase recomendada

1. Criar matriz de rotas e módulos com entradas, saídas, mutações e permissões.
2. Auditar os fluxos de mining: fonte → fetch → parser → normalização → deduplicação → quality gate → persistência → editorial → exposição no Copilot.
3. Auditar o Copilot: fragmentação de prompt → plano → skills → agentes/squads → ferramentas → estado → evidência → resposta.
4. Auditar builders e editores pela separação entre `DesignDocument`, HTML/CSS, renderização e artefato persistido.
5. Executar testes de browser contra um ambiente controlado e testes de integração Supabase/RLS.
6. Adicionar contratos de integração para jobs cron, leases, retries, idempotência, rate limits e falhas externas.
7. Corrigir os módulos por lotes pequenos, cada um com teste de regressão e evidência no PR.

## Critério de aceite da auditoria completa

Um módulo só será marcado como corrigido quando houver:

- caminho de entrada reproduzido;
- caminho de sucesso reproduzido;
- estado vazio e erro reproduzidos;
- autorização e isolamento verificados;
- persistência confirmada quando aplicável;
- teste automatizado ou browser evidence;
- logs/métricas suficientes para diagnóstico;
- ausência de mocks falsos no caminho de produção;
- build e typecheck aprovados;
- documentação do contrato e do risco residual.
