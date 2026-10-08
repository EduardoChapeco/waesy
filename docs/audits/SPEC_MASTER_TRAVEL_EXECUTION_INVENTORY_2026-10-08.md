

## Onda 5 — Validação de contratos e publicação segura

Foi implementado `src/lib/builder/registry-contract.ts`, que verifica para cada manifest: versão semver, identidade do tipo, `defaultProps.block_type`, `node_type`, compatibilidade de `contentSchema`/`layoutSchema`/`styleSchema` com defaults e coerência dos campos do Inspector, incluindo opções de selects e subcampos de arrays. O diagnóstico encontrou seis divergências reais: cinco superfícies sem schema explícito e dois defaults vazios rejeitados por URLs estritas. Todas foram corrigidas no registry.

Também foi fechado o próximo gap pendente de publicação Omni: `auditOmniDocument` agora gera finding bloqueante `BUILDER_UNKNOWN_OMNI_BLOCK` quando um bloco não existe no registry canônico, evitando que o renderer público simplesmente o ignore.

**Validação final:** 15 testes focados aprovados, typecheck aprovado e `git diff --check` aprovado.
