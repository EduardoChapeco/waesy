# Auditoria automática de templates — Waesy Studio

## Execução

```bash
npm run audit:studio-templates
npm exec -- vitest run src/lib/builder/studio-template-audit.test.ts --reporter=dot
```

O comando avalia os 12 manifests do Studio (9 templates legados + 3 pilotos), imprime PASS/WARN/FAIL e grava `docs/builder/template-audit-report.json`. Também reporta drafts que requerem revisão humana e falhas em templates marcados `ready`. O exit code é `1` quando um template já aprovado (`ready`) reprova; erros em drafts continuam visíveis e devem ser corrigidos antes de promoção/publicação, mas não transformam uma biblioteca ainda não aprovada em falsa aprovação de produção.

## Categorias

| Categoria | Bloqueante (ERROR) | Aviso (WARN) |
|---|---|---|
| Licença/provenance | Imagem remota sem asset referenciado; metadata insuficiente; mismatch de host/fornecedor; asset Unsplash sem seleção/tracking verificado no ledger da mesma loja e slot | Asset local/inline sem metadados ligados ao asset manager |
| Acessibilidade | Imagem sem alt; CTA com destino e sem nome; contraste calculável abaixo de 4.5:1 | Contraste não calculável, título longo, atraso de motion acima de 1 s |
| Performance | Documento acima de 250 kB serializados; mais de 40 blocos; assets remotos com byte_size que somem mais de 2 MB | Mais de 8 imagens; mais de 4 imagens remotas; tamanho remoto não informado |

Os limites podem ser ajustados via `auditStudioTemplate(..., { thresholds })` em testes e ferramentas. O resultado inclui findings com regra, categoria, severidade, path e mensagem, além de métricas e score indicativo.

## Gate de publicação

`publishOmniPageDocument` exige administrador e tenant ativo, valida cada `assetRef` Unsplash contra `unsplash_studio_selections` (loja, foto, slot, URL de imagem e página, autor e licença), depois executa a auditoria Omni e só então grava a publicação. Qualquer `error` bloqueia publicação com mensagem resumida; `warning` não bloqueia, mas permanece no relatório. Se a tabela ledger/migration estiver indisponível para uma página com asset Unsplash, a publicação falha de forma segura. O salvamento de rascunho segue permitido.

## Unificação do renderer

`ExperienceRenderer` aceita `document: OmniPageDocument` ou continua aceitando `nodes` legado. O adapter puro `omniPageToExperienceNodes` preserva IDs, ordem, anchors, estilo e referências de assets; `nodes` mantém compatibilidade com vitrines existentes. O renderer Omni e o Experience Renderer exibem créditos de assets publicamente.

## Limites importantes

A checagem de performance é estática: bytes do JSON, contagem de blocos/imagens e tamanho binário conhecido em `assetRefs`. Ela **não** executa navegador, rede ou Lighthouse e não afirma medir LCP, INP, CLS ou TTFB. Acessibilidade de componentes depende também da semântica do componente; contraste automático cobre somente hex opaco explícito. A integração Unsplash comprova que o próprio backend chamou o endpoint oficial após seleção e que a foto/slot exibidos correspondem ao ledger da loja; isso não constitui parecer jurídico sobre a licença. Todos os manifests atuais ainda exigem revisão humana.
