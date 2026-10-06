# Auditoria automática de templates — Waesy Studio

## Execução

```bash
npm run audit:studio-templates
npm exec -- vitest run src/lib/builder/studio-template-audit.test.ts --reporter=dot
```

O comando avalia cada template de `NICHE_TEMPLATE_MATRIX`, imprime contagens PASS/WARN/FAIL e grava `docs/builder/template-audit-report.json`. O exit code é `1` quando qualquer template tem falha crítica, de modo que CI possa impedir merge/publicação de uma biblioteca não conforme.

## Categorias

| Categoria | Bloqueante (ERROR) | Aviso (WARN) |
|---|---|---|
| Licença/provenance | Imagem remota sem asset referenciado; metadata insuficiente; asset não liberado pela política de publicação | Asset local/inline sem metadados ligados ao asset manager |
| Acessibilidade | Imagem sem alt; CTA com destino e sem nome; contraste calculável abaixo de 4.5:1 | Contraste não calculável, título longo, atraso de motion acima de 1 s |
| Performance | Documento acima de 250 kB serializados; mais de 40 blocos; assets remotos com byte_size que somem mais de 2 MB | Mais de 8 imagens; mais de 4 imagens remotas; tamanho remoto não informado |

Os limites podem ser ajustados via `auditStudioTemplate(..., { thresholds })` em testes e ferramentas. O resultado inclui findings com regra, categoria, severidade, path e mensagem, além de métricas e score indicativo.

## Gate de publicação

`publishOmniPageDocument` executa a avaliação sobre o documento Omni recebido depois da autorização de administrador e antes de acessar/gravar a publicação. Findings `error` bloqueiam publicação com mensagem resumida; `warning` não bloqueia, mas permanece no relatório. O salvamento de rascunho segue permitido.

## Unificação do renderer

`ExperienceRenderer` aceita `document: OmniPageDocument` ou continua aceitando `nodes` legado. O adapter puro `omniPageToExperienceNodes` preserva IDs e ordem, converte configurações e estilo em `ExperienceNode`, encapsula os tipos nativos no namespace `waesy_omni:` e encaminha os blocos aos componentes do registry Omni. `nodes` mantém compatibilidade com vitrines existentes; a nova prop permite que novas rotas usem diretamente o AST canônico.

## Limites importantes

A checagem de performance é estática: bytes do JSON, contagem de blocos/imagens e tamanho binário conhecido em `assetRefs`. Ela **não** executa navegador, rede ou Lighthouse e não afirma medir LCP, INP, CLS ou TTFB. Acessibilidade de componentes depende também da semântica do componente; contraste automático cobre somente hex opaco explícito. As checagens de licença validam presença e completude de provenance declarada, não determinam juridicamente o direito de uso. Avisos/falhas exigem revisão humana quando a evidência depende de contexto externo.
