# Spec — Persistência versionada do Omni Builder

**Data:** 2026-10-07
**Onda:** W8.2 CRUD persistente; W8.3 publicação e preview
**Escopo:** `experience_documents`, `experience_versions`, BFF Omni e rota pública

## Requisitos EARS

- **Quando** um administrador autenticado salvar um documento Omni, **o sistema deve** validar o documento e a posse da loja no servidor, gravar um snapshot de draft em uma versão persistente e retornar `version_id` e `version_number` confirmados.
- **Quando** o mesmo draft for reenviado, **o sistema deve** ser idempotente e não criar uma versão duplicada.
- **Quando** um administrador autenticado publicar um documento Omni, **o sistema deve** criar uma versão publicada, arquivar a versão publicada anterior na mesma transação, atualizar o snapshot público e retornar a URL pública e a versão publicada.
- **Quando** um visitante abrir a URL pública, **o sistema deve** renderizar somente o snapshot publicado; draft nunca pode substituir publicação.
- **Quando** um usuário tentar usar um documento de outra loja, **o sistema deve** rejeitar a operação sem alterar documento, versões ou snapshots.
- **Quando** ocorrer falha em qualquer etapa do save/publish, **o sistema deve** deixar a operação sem efeitos parciais observáveis.

## Contrato de dados

- `experience_versions.document_snapshot JSONB` guarda o `OmniPageDocument` completo.
- `experience_versions.status` continua canônico: `draft`, `published`, `archived`.
- `experience_versions.version_number` é monotônico por documento.
- A RPC `persist_omni_document_snapshot` executa lock, ownership, idempotência, versionamento e atualização dos snapshots em uma transação PostgreSQL.

## Evidência exigida

1. Testes estáticos/contratuais da RPC, parâmetros e filtro de tenant.
2. Testes de save idempotente e publicação que preserva a versão anterior.
3. Typecheck, regressão completa e build.
4. Banco/RLS real e browser permanecem pendentes até ambiente Supabase autorizado; não declarar W8.2/W8.3 como integração concluída apenas com testes em memória.

## Paths autorizados

- `docs/specs/SPEC-20261007-BUILDER-VERSIONED-OMNI-PERSISTENCE.md`
- `supabase/migrations/20261007000000_builder_versioned_omni_snapshots.sql`
- `src/services/omni-builder.functions.ts`
- `src/services/omni-builder.functions.test.ts`
- `docs/design/DECISIONS.md`
- `docs/audits/20261007-holistic-execution-ledger.md`
