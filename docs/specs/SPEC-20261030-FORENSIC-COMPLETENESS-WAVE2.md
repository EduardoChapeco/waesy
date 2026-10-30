# SPEC-20261030 — Completude forense e honestidade operacional, onda 2

## Objetivo

Fechar os achados confirmados da auditoria global que mascaram ausência de dados ou afirmam sucesso sem operação real, preservando as capacidades prometidas e conectando-as a uma continuação verificável.

## Requisitos EARS

- Quando um CTA prometer download, o sistema deve gerar um arquivo verificável e apresentar sucesso somente após o download ser preparado.
- Quando uma consulta real retornar coleção vazia, a UI deve exibir estado vazio honesto e não criar artigos, produtos, preços, avaliações, autores ou disponibilidade sintéticos.
- Quando uma operação comercial ou financeira não possuir catálogo, preço ou mutation autorizada, a UI deve bloquear a confirmação, explicar o estado e preservar uma continuação real quando existir.
- Quando uma superfície de comunidade não receber coleções do backend, o componente deve renderizar coleções vazias e esconder abas sem dados.
- Quando uma imagem externa for fornecida, o componente deve encaminhá-la à ingestão segura ou tratá-la como preview, nunca confirmar persistência por callback local.
- Quando uma vista adaptar mobile e desktop, a implementação deve renderizar uma única casca viva por classe de viewport.

## Escopo autorizado

- `src/components/workspace/social-studio-modal.tsx`
- `src/components/news/waesy-news-portal.tsx`
- `src/components/community/CommunitySpacesView.tsx`
- `src/routes/portal.subpainel.$token.tsx`
- `src/components/ui/image-upload.tsx`
- `src/components/classifieds/digital-file-dropzone.tsx`
- `src/components/ui/media-uploader.tsx`
- `src/components/classifieds/event-classified-showcase-view.tsx`
- `src/components/classifieds/editorial-showcase-view.tsx`
- `docs/design/DECISIONS.md`

## Invariantes

- Nenhum toast de sucesso pode substituir a operação que o rótulo promete.
- Ausência de dados nunca pode ser confundida com entidade comercial persistida.
- Preços, ratings, disponibilidade e identidade vêm do backend ou não são exibidos como fatos.
- Fallback de erro não pode virar upload client-side público fora do contrato de Storage autorizado.
- O escopo não remove rotas ou capacidades; transforma estados falsos em estados honestos ou liga a continuação real existente.

## Evidências de aceite

1. Testes unitários reproduzem coleção vazia, falha de BFF, download bem-sucedido e download falho.
2. Busca textual não encontra os fallbacks produtivos removidos nem toasts de sucesso sem operação nos arquivos do escopo.
3. Auditoria de ações e sweep de fallbacks são executados novamente.
4. A bifurcação mobile/desktop é verificada por teste de renderização ou inspeção estrutural.
5. Alterações de Storage/BFF fora do escopo desta onda ficam registradas como próxima microfase, sem serem declaradas resolvidas.
