
## Implementação registrada

- Rota do editor unificada com `getOmniPageDocument`; loader não fabrica documento após falha.
- BFF Omni exige `requireAdmin`, deriva `store_id` da sessão e filtra o documento por tenant.
- Documento Omni ausente inicia vazio; conteúdo inválido falha explicitamente.
- Publish Omni cria versão publicada, atualiza o documento e arquiva versões anteriores com compensação quando a atualização falha.
- Rota pública deixou de fazer fallback para outro `document_type` e deixou de auto-seed durante GET/SSR.
- Produto público exige `status = published` e não cria variante/estoque/backorder sintéticos.
- Coleção pública filtra `store_id`; CRUD administrativo de coleções preserva `rules` e aplica ownership.
- `OmniEditor` indica dirty state, marca persistência somente após sucesso e confirma saída com alterações pendentes.
- `StudioCanvas` deixou de renderizar camadas de exemplo e passou a consumir `elements`, `background`, `aspectRatio`, seleção e movimento controlados pela rota.

## Evidência

- Testes Builder/catálogo: **45/45 aprovados**.
- Testes Studio/Builder adicionais: **26/26 aprovados**.
- Sintaxe do `StudioCanvas`: aprovada por esbuild.
- `git diff --check`: aprovado.
- Typecheck global: ainda bloqueado por 136 erros existentes em 48 arquivos e execuções que terminam em OOM/SIGABRT; nenhum diagnóstico foi emitido para os arquivos alterados nesta onda.
- Gate BFF↔migrations: ainda falha com 28 referências sem migration local; não foram criadas tabelas ou allowlists especulativas.
