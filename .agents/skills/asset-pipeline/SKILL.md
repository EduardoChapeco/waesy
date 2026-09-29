---
name: asset-pipeline
description: Governança do pipeline unificado de ativos visuais, garantindo conformidade com docs/marca/ATIVOS.md e prevenção de distorção ou CLS.
---

# Asset Pipeline — Pipeline Canônico de Ativos Visuais

## Gatilho
Ao criar, editar ou auditar componentes de imagem, enquadramento, upload de fotos, capas ou avatares.

## Quando NÃO Usar
- Em operações de dados estruturados puramente numéricos ou textuais sem imagens.

## Entradas
1. Componentes de UI de mídia (`ImageUpload`, `ImageCropperDialog`, cards de vitrine).
2. Especificações canônicas registradas em `docs/marca/ATIVOS.md`.

## Saídas
- Componentes e views alinhados aos presets canônicos (21:9, 16:9, 1:1, 4:1, 4:3) sem distorção.

## Procedimento
1. Comparar as classes de aspecto do componente contra a tabela em `docs/marca/ATIVOS.md`.
2. Remover qualquer proporção arbitrária hardcoded (ex: trocar `aspect-16/10` por `aspect-video` 16:9).
3. Assegurar que o enquadramento no modal de crop utiliza a máscara exata da proporção canônica.
4. Aplicar regra de derivação explícita: capa 21:9 recorta para 16:9 sem esticar imagem.
5. Garantir estado de ausência com proporção reservada (`bg-muted/40`) para evitar layout shift.
6. Testar renderização do ativo nos dois shells (mobile e desktop).

## Regras Duras
- Nenhum componente declara proporção arbitrária dissociada de `ATIVOS.md`.
- Imagens em cards devem usar `object-cover` e centralização para evitar distorção de proporção.
- Proibido que upload de pessoa física e jurídica usem fluxos de processamento divergentes.

## Anti-Padrões
- Utilizar `h-48` fixo em imagens responsivas sem declarar aspect ratio.
- Permitir upload sem máscara de recorte quando a tela exige proporção estrita.

## Critério de Pronto
Ativo exibido com proporção reservada, recorte correto e sem saltos visuais nos dois shells.
