# Relatório Consolidado — Masterplan Waesy

**Especificação:** `SPEC-MASTER-TRAVEL-OCR-INFOTRAVEL-CMS-BUILDER`  
**Data da consolidação:** 2026-10-08  
**Branch de execução:** `execute/spec-master-travel-20261008`  
**PR de execução:** [PR #21](https://github.com/EduardoChapeco/waesy/pull/21)

## Resumo executivo

As Ondas 1 e 2 possuem entregas funcionais implementadas e publicadas. As Ondas 3 e 4 também receberam implementação relevante, mas permanecem parcialmente dependentes de aplicação das migrations/RPCs no ambiente Supabase e de fechamento do fluxo de reserva self-service/Kanban. A Onda 5 está em execução: o caminho registry → Inspector → renderer já possui cobertura automática e o primeiro bloco órfão foi conectado; nesta rodada foram adicionados os gates de schema/defaults/Inspector e o bloqueio de tipos Omni desconhecidos no gate de publicação. A Onda 6 permanece como etapa transversal de hardening, embora os gates locais de typecheck, testes e build já tenham sido executados com sucesso nas rodadas anteriores.

| Onda | Escopo | Status | Evidência principal | Pendências materiais |
|---|---|---|---|---|
| 1 | Extrator IA de mídia/OCR | **Concluída com hardening** | OCR real e fluxo de flyer sem defaults comerciais falsos; preço ausente preservado como `null`; regressões adicionadas | Validar OCR multimodal com amostras reais e telemetria de `travel_price_history` em ambiente integrado |
| 2 | Banco único de hotéis/deduplicação | **Concluída no código; aplicação DB pendente** | Migration `global_hotels`/aliases, BFF de busca canônica, `HotelAutocompleteInput` integrado ao painel de hotéis | Aplicar migration no Supabase; fechar classificação AI de reviews e curadoria Master de aliases |
| 3 | Hub InfoTravel e credenciais por agência | **Parcialmente concluída** | Cliente InfoTravel existente; isolamento por tenant, validação de `agencyId`, erros `CONNECTOR_UNAVAILABLE` e IDs determinísticos implementados | Exercitar chamadas reais com credenciais por agência; confirmar UI de gestão do vault e contratos de configuração |
| 4 | Reserva, Kanban, contratos e emissão | **Parcialmente concluída** | Estado `reserved_pending_issuance`, retry idempotente no fallback, contrato/voucher gerados no lifecycle | Garantir o status canônico em `travel_bookings`, card explícito no Kanban e cobrança Pix/emissão como transições observáveis |
| 5 | Builder CMS modular estilo Wix | **Em execução avançada** | Cobertura registry → renderer; `office_contract_viewer` conectado; validação de schemas/defaultProps/Inspector; bloqueio de blocos Omni desconhecidos | Fechar 20 layouts canônicos, versionamento/persistência de contrato e fluxo real editor → save → publish sem substituir árvore existente |
| 6 | Qualidade, acessibilidade e build limpo | **Gates locais aprovados; E2E/ambiente real pendentes** | Suíte completa, typecheck, build de produção e client-leak check aprovados nesta rodada; 493 chunks verificados sem runtime de servidor | Adicionar cobertura browser/E2E e verificar migrations em ambiente real |

## Entregas publicadas nesta execução

- `6e45f018`: início do saneamento do extrator e registry global de hotéis.
- `1144fbc7`: integração do autocomplete canônico ao painel de hotéis.
- `c396db60`: endurecimento do InfoTravel e lifecycle de reserva.
- `f03e32bd`: cobertura automática do registry contra renderer e conexão de `office_contract_viewer`.
- Incremento atual: validação de manifests e bloqueio de blocos Omni desconhecidos, com 15 testes focados, typecheck, suíte completa, build e client-leak check aprovados antes da publicação.

## Critérios de aceite versus realidade atual

A especificação pede 20 páginas canônicas reutilizáveis, alimentadas por tabelas CMS e design tokens. O repositório já possui um catálogo amplo de manifests, section templates, Studio catalog, Omni AST e renderer dinâmico. O gap principal não é mais a ausência de primitivas isoladas, mas a governança do contrato: antes desta rodada, um bloco podia existir no registry sem renderer correspondente, defaults poderiam não passar pelo schema e um tipo Omni desconhecido podia ser salvo/auditado sem finding bloqueante.

A implementação corrente transforma esses gaps em falhas determinísticas de teste. Isso reduz o risco de publicar layouts que o Inspector edita de uma forma, o renderer interpreta de outra e o banco persiste sem validação.

## Próxima sequência recomendada

1. Aplicar e verificar as migrations das Ondas 2 e 4 no projeto Supabase conectado.
2. Fechar a transição de `travel_bookings` para `RESERVED_PENDING_ISSUANCE`, incluindo card de Kanban e mensagem pública ao cliente.
3. Integrar o loader real da rota do Builder à árvore versionada, evitando fallback automático para `template_gastronomy` quando já existe uma versão persistida.
4. Fazer o fluxo editor → save → publish atualizar versões corretamente, sem deixar draft público.
5. Catalogar e validar as 20 páginas canônicas como templates versionados, com bindings CMS e testes de publicação.
6. Adicionar E2E/browser para abertura, edição, reabertura e publicação do Builder.

## Limitações

Esta consolidação é baseada em inspeção do repositório, histórico de PRs e gates locais. Não afirma que migrations foram aplicadas no Supabase remoto nem que chamadas reais InfoTravel foram executadas com credenciais de produção. Essas validações dependem do ambiente externo e devem ser realizadas antes do merge/deploy final.
