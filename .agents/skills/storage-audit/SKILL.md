---
name: storage-audit
description: Auditoria exaustiva de buckets, políticas RLS de storage, convenções de caminhos e órfãos cruzados de arquivos.
---

# Storage Audit — Auditoria de Armazenamento e Buckets

## Gatilho
Em qualquer falha de envio, download, renderização ou exclusão de mídias, fotos e documentos.

## Quando NÃO Usar
- Em tarefas que lidam exclusivamente com tabelas relacionais sem persistência de blobs ou URLs de mídia.

## Entradas
1. Strings de buckets referenciadas no código (`storage.functions.ts`, componentes de upload).
2. Políticas RLS do schema `storage.objects`.
3. Registros de URLs nas tabelas `profiles`, `stores`, `classifieds`, `products`, `posts`.

## Saídas
- Relatório de conformidade com as 8 verificações (F1 a F8) e listagem de buckets corrigidos.

## Procedimento
1. **F1 Referência Órfã:** Garantir que todo bucket citado no código existe no Supabase Storage.
2. **F2 Bucket Morto:** Identificar e sinalizar buckets existentes sem nenhuma chamada ativa.
3. **F3 Política por Operação:** Verificar existência de regras INSERT, SELECT, UPDATE e DELETE.
4. **F4 Convenção de Caminho:** Validar estrutura `{tipo-dono}/{id-dono}/{ativo}/{arquivo}`.
5. **F5 Limites e Tipos:** Conferir limites de tamanho (MB) e MIME types aceitos contra a UI.
6. **F6 Visibilidade:** Confirmar público para visualização livre e privado para documentos fiscais/KYC.
7. **F7 Forma de Acesso:** Garantir URLs públicas estáveis no banco, nunca signed URLs efêmeras.
8. **F8 Órfãos Cruzados:** Contabilizar registros apontando para URLs 404 e arquivos sem registro.

## Regras Duras
- Nunca recriar bucket existente com dados; se falta política, adicione política via migration.
- Todo upload gera caminho único e determinístico com timestamp/hash.
- Proibido salvar URLs assinadas com token temporário no banco de dados.

## Anti-Padrões
- Salvar blob base64 diretamente em colunas de texto no banco de dados.
- Tratar falha de bucket silenciosamente retornando URL placeholder fictícia.

## Critério de Pronto
Todos os buckets do código validados com políticas ativas, limites unificados e URLs estáveis.
