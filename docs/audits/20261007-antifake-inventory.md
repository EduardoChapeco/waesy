# Inventário antifalsidade — 2026-10-07

## Regra aplicada

Fora de `simlabs`, nenhum fluxo produtivo pode retornar sucesso, preço, Pix, produto, empresa, cliente, voucher, rota ou integração inventados. Templates de UI e exemplos de prompt não são dados de negócio enquanto não forem persistidos/renderizados como dados reais; fixtures de teste permanecem evidência de teste e não produção.

## Achados P0/P1 reproduzidos

| Superfície | Evidência | Classificação | Correção |
|---|---|---|---|
| Reservas | `src/routes/workspace.reservas.tsx` — `DEFAULT_SALON_TABLES` | Falso pronto: mesas fictícias quando `floor_plan` vazio | Removido; mapa usa somente `getStoreFloorPlan()` e mostra configuração vazia honesta |
| Propostas | `src/services/travel-proposal.functions.ts` — agência, telefone, cliente, destino, inclusões/exclusões e opções de pagamento padrão | Falso pronto/dados comerciais inventados | Removidos; campos ausentes permanecem vazios e opções financeiras só vêm da proposta persistida |
| Criação de proposta | fallback para primeira loja ativa e defaults `Cliente Especial`, telefone e destino | P0 cross-tenant + dados inventados | Exige identidade/tenant real; não escolhe primeira loja |
| OCR de operadora | `travel-operator-ocr.functions.ts` — “Aérea”, bagagem, Standard, 4 estrelas, 10 parcelas, Banco, Agência de Viagens | Falso pronto em saída de OCR | Schemas deixam campos ausentes; destino ausente falha validação |
| OCR de voucher | `travel-lifecycle.functions.ts` — voucher, passageiro, agência, contato e status confirmados sintéticos | Falso pronto crítico | Falha explícita quando IA não extrai; nenhum voucher é criado |
| Criação de viagem pública | fallback de UUID zero, primeira loja ativa, destino “a confirmar”, status `confirmed` | P0 de tenant e lifecycle | Falha sem loja identificada; nova viagem nasce `pending` e destino nulo |
| IA SDR | `createListingWithAI` convertia falha do provider em anúncio heurístico com Pix/cartão/estoque | Falso sucesso | Retorna erro explícito; não cria anúncio sintético |
| Orquestrador | Toast dizia “proposta gerada” e “mockup” | Mensagem enganosa | Texto agora informa que é rascunho e que nada foi publicado |

## Exceção SimLab

`src/routes/workspace.simulacao.tsx`, `src/routes/workspace.simlab.*` e `src/services/simlab.functions.ts` permanecem deliberadamente sintéticos conforme a regra canônica do plano. Eles não devem alimentar vitrines, checkout, catálogo ou dados de produção.

## Pendências ainda abertas, não mascaradas

- `src/lib/niches/niche-presets.ts` contém templates comerciais de nicho. Devem permanecer somente como configuração explícita de template e nunca ser exibidos como produtos/serviços da loja sem persistência; revisão de cada consumidor ainda é necessária.
- `travel-proposal.functions.ts` e outros contratos ainda possuem defaults de apresentação ou schema que precisam ser separados de dados de negócio em uma onda posterior.
- Migração completa de logs, browser E2E, Postgres/RLS real, providers reais e produção continua bloqueada pela ausência de ambiente/credenciais de teste autorizados.
- A busca lexical inclui fixtures e testes com mocks; estes não foram classificados como produção sem confirmação de importação/runtime.
