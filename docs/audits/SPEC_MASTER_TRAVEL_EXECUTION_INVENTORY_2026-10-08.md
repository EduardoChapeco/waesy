# Inventário de Execução — SPEC-MASTER Turismo Waesy

**Data:** 2026-10-08  
**Repositório:** `EduardoChapeco/waesy`  
**Branch de trabalho:** `execute/spec-master-travel-20261008`  
**Escopo:** leitura rápida e orientada pelo masterplan `SPEC-MASTER-TRAVEL-OCR-INFOTRAVEL-CMS-BUILDER`.

## Resumo executivo

O projeto já possui uma base extensa de turismo, contratos, propostas, InfoTravel e Builder, mas o masterplan anexado ainda não está concluído como fluxo integrado. A principal diferença é entre **módulos isolados já existentes** e os **contratos canônicos ponta a ponta** exigidos pelo masterplan.

Nesta execução foram concluídas duas correções de baixo risco e alta evidência:

- remoção dos defaults comerciais fictícios do OCR/flyer de turismo;
- criação da fundação do banco global de hotéis com aliases, escopos de review, BFF de busca e autocomplete reutilizável.

## PRs e branches recentes relevantes

| PR | Estado | Branch | Leitura rápida |
|---|---|---|---|
| #20 | Aberta | `audit/full-remediation-continuation-20261007` | Endurecimento de segurança de contratos; não fecha o masterplan de turismo. |
| #19 | Aberta | `fix/copilot-p0-integrity-2026-10-07` | Editor de classificados e continuidade do Copilot. Fora do núcleo deste masterplan. |
| #18 | Aberta | `feat/waesy-niche-template-factory` | Fábrica de templates/Studio; toca parcialmente a Onda 5. |
| #17 | Mesclada | `wave-20261007` | Integrações de produção e vitrines data-driven; base útil para Ondas 3 e 5. |
| #16 | Mesclada | `execute/waesy-resumption-2026-10-07` | Auth/RPCs; suporte de segurança, não implementação específica de turismo. |
| #7 | Aberta | `docs/waesy-holistic-remediation-2026-10-06` | Plano amplo de remediação e auditoria; não deve ser confundido com entrega funcional do masterplan. |

## Matriz das seis ondas

| Onda | Status observado | Evidência | Gap principal | Próxima ação |
|---|---|---|---|---|
| 1 — Extrator IA | **Parcial / incrementada nesta sessão** | `travel-ai-extractor.functions.ts` usa `executeUnifiedAiCall` e fallback nulo; modal e template existiam. | Havia defaults `249000`, `20750`, inclusões e período fictícios; o prompt ainda contém um exemplo numérico, não um valor de fallback. | Integrar confirmação humana persistida e tornar `unlisted`/hash explícito no pacote gerado. |
| 2 — Banco único | **Parcial / fundação criada nesta sessão** | `hotels_bank` e `listHotelsBank` já existiam. Não havia `global_hotels`, `hotel_aliases` nem `HotelAutocompleteInput`. | Migration ainda precisa ser aplicada no Supabase e o autocomplete precisa ser conectado aos formulários de hotel existentes. | Migrar/espelhar registros legados, criar tela Master de fusão e conectar o componente aos editores. |
| 3 — InfoTravel | **Parcial** | `src/services/infotravel.ts` despacha para Edge Function `infotravel-connector`, com erro explícito de credencial ausente. | Não foi comprovada, nesta leitura rápida, a tela canônica `/workspace/settings/integrations` nem a garantia de credencial por tenant ponta a ponta. | Auditar o Edge Function, vault e tela de configuração; adicionar teste de isolamento por agência e respostas reais. |
| 4 — Reserva/Kanban/contratos | **Parcial e fragmentada** | Existem `travel_contract.functions.ts`, `travel_departures_kanban`, propostas e fluxo de contratos. | Não foi encontrada evidência de um fluxo único que crie sempre `RESERVED_PENDING_ISSUANCE`, gere card de cotação, contrato e cobrança em sequência. | Definir DTO/estado canônico e fechar o fluxo transacional com idempotência. |
| 5 — Builder CMS modular | **Parcial avançada** | `experience-renderer.tsx`, `builder-registry.ts`, `travel-catalog.functions.ts` e dossiês do Builder existem. | Documentação de recuperação marca renderer/registro como parcial; a matriz dos 20 layouts canônicos ainda não está comprovada como contrato único. | Fechar registry → inspector → renderer → CMS e remover aliases/órfãos no caminho público. |
| 6 — Qualidade/A11y/build | **Parcial** | Typecheck passou; há testes Vitest e workflows CI. Auditorias existentes apontam gaps de cobertura UI/E2E e dívida de design. | Build completo, A11y navegável e cobertura real dos fluxos do masterplan ainda não foram validados nesta sessão. | Rodar `npm test`, `npm run build`, gates canônicos e adicionar E2E para OCR, hotel autocomplete e reserva pendente. |

## Alterações realizadas nesta sessão

### Onda 1

- `src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx`
  - preço inicial passa a ser `null` quando ausente;
  - inclusões e datas não são inventadas;
  - parcelas não são calculadas quando não existe preço;
  - interface exibe `Preço não informado`.
- `src/components/social-templates/TravelTemplateEditorial.tsx`
  - remove defaults de preço, parcela, inclusões e agência;
  - renderiza estado honesto quando os dados não foram extraídos.
- `src/services/travel-w12-integrity.test.ts`
  - adiciona regressões contra os defaults removidos.

### Onda 2

- `supabase/migrations/20261008090000_global_hotels_deduplication.sql`
  - cria `global_hotels`, `hotel_aliases` e `hotel_reviews`;
  - adiciona índices trigram e unicidade de alias normalizado;
  - separa `hotel_rating`, `destination_rating` e `agency_service_rating`;
  - restringe escrita canônica e fusão a Master/Platform Admin.
- `src/services/travel-catalog.functions.ts`
  - adiciona `GlobalHotelDTO` e `searchGlobalHotels`;
  - limita a busca a hotéis verificados e 20 resultados.
- `src/components/tourism/hotels/hotel-autocomplete-input.tsx`
  - autocomplete com debounce de 250 ms, estados loading/empty e sem ação de criar duplicata.
- `src/services/travel-global-hotels.test.ts`
  - testes de contrato da migration, BFF e componente.

## Validação executada

- `npx vitest run src/services/travel-w12-integrity.test.ts src/services/travel-global-hotels.test.ts --reporter=dot`
  - **2 arquivos, 6 testes aprovados**.
- `npm run typecheck`
  - **exit code 0**.
- `git diff --check`
  - **sem erro**.

## Backlog priorizado para continuidade

1. Aplicar a migration de hotéis em ambiente Supabase e validar RLS com perfis Master, agência e anônimo.
2. Conectar `HotelAutocompleteInput` aos formulários que hoje gravam diretamente em `hotels_bank`.
3. Criar operação de merge `hotel_aliases` com auditoria e referência ao registro legado.
4. Fechar o contrato de review classifier e impedir que `agency_service_rating` afete score do hotel.
5. Auditar o Edge Function `infotravel-connector` e o `secret-vault` por agência, sem fallback simulado.
6. Implementar o estado único `RESERVED_PENDING_ISSUANCE` e o transbordo idempotente para Kanban/contrato.
7. Mapear os 20 layouts canônicos e registrar faltantes no `builder-registry`.
8. Rodar os gates completos e adicionar E2E mínimo dos fluxos do masterplan.

## Limitações desta leitura rápida

- A migration foi criada no código, mas não foi aplicada a um projeto Supabase nesta sessão.
- Não foi feita análise visual no navegador nem validação E2E.
- PRs abertas foram inventariadas por metadados e arquivos; não foram incorporadas automaticamente para evitar misturar escopos.
