# SPEC: Captura de Cotações Infotravel e Radar de Oportunidades

**Código:** `SPEC-INFOTRAVEL-QUOTE-CAPTURE-AND-OPPORTUNITY-RADAR`
**Data:** 2026-11-05
**Status:** Proposta para aprovação (nenhum código alterado)
**Estende:** `SPEC-MASTER-INFOTRAVEL-SYNC-ENGINE-AND-EXTENSION` (seções 7, 13.2 e 17)
**Escopo de código previsto:** `tools/infotravel-extension/`, `tools/infotravel-miner/`, nova migration, `src/services/travel-quote-capture.functions.ts`, `src/services/travel-opportunity-radar.functions.ts`, `src/lib/travel-opportunity-matcher.ts`, rota `/workspace/turismo/oportunidades`.

---

## 1. Problema

1. A extensão atual só lê o que já foi vendido (reservas, passageiros, financeiro). Toda a cotação feita no Infotravel (voos, hotéis, passeios, pacotes) se perde.
2. Não existe memória do que foi cotado, para quem, com qual preço e quando.
3. Clientes são esquecidos. Um cliente que pediu orçamento há 40 dias vira lead frio, mesmo quando uma cotação feita hoje (para outro cliente) caberia no período e no orçamento dele.
4. Sem histórico de preço, o agente não sabe se uma tarifa é fria ou quente.

## 2. Princípio de produto

O sistema **não monta pacotes** e **não envia nada ao cliente sozinho**. Ele faz três coisas: capturar, lembrar e avisar o agente. A decisão e o contato continuam humanos.

## 3. Modelo conceitual

```
Cotação capturada (Infotravel)  -->  Observação de preço (append-only)
        |                                   |
        |                                   +--> Temperatura tarifária (fria/média/quente)
        v
Demanda do cliente (intenção) <---- casamento ----> Oferta (cotação nova, ou reserva/preço observado)
        |
        v
Oportunidade (alerta ao agente) --> ação: ver cliente, abrir WhatsApp, descartar, marcar enviada
```

Entidades novas (todas com `store_id`, RLS por tenant):

| Entidade | Papel |
|---|---|
| `travel_quote_captures` | Uma consulta/orçamento visto na tela do Infotravel: tipo, origem, destino, datas, pax (adt/chd/inf), operadora, hash de busca, timestamp. Imutável. |
| `travel_quote_capture_items` | Linhas de resultado: hotel/voo/passeio, regime, companhia, preço total e por pax, taxas, validade, disponibilidade. Imutável. |
| `travel_price_observations` | Já existe (seção 17 da spec mestre). Passa a receber também as capturas da extensão, com `source = 'extension_capture'`. |
| `travel_client_demands` | Intenção do cliente: destino(s), janela de datas (flexível), nº de pax, orçamento mín/máx, origem do dado (cotação enviada, conversa, manual), status (ativa, atendida, perdida, pausada), `last_contact_at`. |
| `travel_proposals_sent_log` | Registro de propostas enviadas por cliente: o que, quando, valor, canal, resultado. Liga captura a demanda. |
| `travel_opportunities` | Resultado do casamento: demanda, oferta, score, motivos, estado (nova, vista, acionada, descartada, expirada), quem agiu. |

Reaproveitar, sem duplicar: `travel_quote_sessions`, `travel_offer_snapshots` (migration `20270214000001`), `travel-quote-session.service.ts`, `crm_leads` e `travel_pax`. A captura da extensão grava em `travel_quote_sessions` com `provider_code` da operadora; as tabelas novas só existem para o que as atuais não cobrem. Definição final de colunas na etapa de modelagem, depois de confirmar o schema real.

## 4. Requisitos EARS

**Captura**
- QUANDO o agente executar uma busca ou abrir um orçamento no Infotravel com a extensão ativa, a extensão DEVE ler o resultado exibido na tela (leitura passiva do DOM e das respostas PrimeFaces que a própria página já recebeu) e enviar ao BFF.
- A extensão NÃO DEVE disparar buscas por conta própria para cotar. Só captura o que o agente consultou. (Evita bloqueio da conta e custo de busca.)
- QUANDO o mesmo `search_payload_hash` chegar de novo no mesmo dia, o BFF DEVE gravar nova observação de preço, mas não duplicar a captura.
- SE o parser não reconhecer a estrutura da tela, ENTÃO a extensão DEVE registrar `parse_failed` com o recorte de HTML anonimizado para diagnóstico e NÃO DEVE enviar valores inventados.
- A captura DEVE funcionar por tipo: voo, hotel, passeio, transfer, carro, pacote. Cada tipo tem parser próprio e testes com HTML real salvo em fixtures.
- Dados do cliente final visíveis na tela (nome, CPF) SÓ DEVEM ser enviados quando o agente vincular a cotação a um cliente de forma explícita.

**Vínculo com cliente**
- QUANDO uma cotação for capturada, o popup da extensão DEVE oferecer "Vincular a cliente" (busca por nome/CPF/telefone no Waesy) e "Salvar sem cliente".
- SE a cotação ficar sem cliente por mais de 24h, ENTÃO o sistema DEVE listá-la em "Cotações sem cliente" no workspace.
- QUANDO uma cotação for vinculada, o sistema DEVE criar ou atualizar a `travel_client_demands` do cliente com destino, datas, pax e valor cotado (orçamento inferido).

**Histórico de preços**
- O sistema DEVE manter observação de preço append-only, nunca deletada, com `advance_days` calculado.
- QUANDO houver no mínimo 5 observações comparáveis (mesmo destino/produto/janela sazonal), o sistema DEVE classificar a tarifa em fria, média ou quente em relação à mediana, informando o tamanho da amostra.
- SE a amostra for menor que 5, ENTÃO o sistema DEVE mostrar "histórico insuficiente" e NÃO DEVE classificar.

**Radar de oportunidades**
- QUANDO uma nova captura ou observação for gravada, o sistema DEVE avaliar demandas ativas da agência e gerar oportunidade para cada uma com score acima do limiar configurável.
- O casamento DEVE considerar: destino (igual ou região/aeroporto próximo), sobreposição da janela de datas, nº de pax, preço dentro do orçamento (ou até X% acima, configurável), tipo de produto.
- QUANDO um cliente tiver demanda ativa sem contato há mais de N dias (padrão 15), o sistema DEVE destacá-lo em "Clientes esquecidos", mesmo sem oportunidade nova.
- QUANDO uma oportunidade citar um cliente que já recebeu proposta equivalente (mesmo destino e janela) nos últimos 30 dias, o sistema DEVE sinalizar "já enviada em DD/MM por X" para evitar repetição.
- QUANDO o agente cotar para o cliente A e o período/destino/orçamento couber na demanda do cliente B, o sistema DEVE avisar o agente na hora, no popup da extensão, e registrar a oportunidade.
- O avaliador DEVE rodar sob demanda no momento da gravação, sem trigger pesado no PostgreSQL (invariante da seção 18 da spec mestre).
- Toda oportunidade DEVE mostrar os motivos do casamento em linguagem simples e o preço histórico de referência. Sem score opaco.
- O agente DEVE poder descartar com motivo. Descartes alimentam o ajuste do limiar.

**Anti-fake**
- O sistema NÃO DEVE exibir oportunidade sem oferta real capturada ou observada. Sem dado, omite a seção (invariante B.33).
- Preço capturado DEVE mostrar a data da captura e aviso de que cotação pode ter expirado no Infotravel.

**Privacidade e segurança**
- Capturas e demandas são isoladas por `store_id` com RLS. Nenhum dado de cliente entra no Data Lake global; apenas agregados anônimos com mínimo de agências por célula.
- A extensão usa token por agência com escopo apenas de ingestão; não lê dados do Waesy além do necessário para o vínculo de cliente.
- Payload validado com Zod, parâmetros desestruturados por completo (B.25), com testes de presença e ausência de campos opcionais.

## 5. Mudanças na extensão e no miner

| Item | Mudança |
|---|---|
| `manifest.json` | Sem novas permissões amplas. Manter hosts atuais. Sem `<all_urls>`. |
| `content.js` | Novo módulo de captura passiva por tipo de produto, com detecção de página (busca, resultado, orçamento, carrinho). |
| `background.js` | Fila local com reenvio, jitter apenas no envio em lote, deduplicação por hash. |
| `popup.html/js` | Aba "Cotações": últimas capturas, vincular cliente, alertas de oportunidade em tempo real. |
| `miner.mjs` | Modo opcional `--orcamentos` para varrer a lista de orçamentos salvos no Infotravel (histórico retroativo). Mesmos limites de ritmo humano. |
| Fixtures | HTML real anonimizado de cada tela em `tools/infotravel-extension/fixtures/` para testes de parser. |

Pré-requisito: mapear as telas reais do Infotravel (busca de voo, hotel, passeio, orçamento salvo). Isso exige HTML ou HAR de cada uma, fornecido por você, sem senhas.

## 6. Superfícies no Waesy

| Rota | Conteúdo |
|---|---|
| `/workspace/turismo/oportunidades` | Lista priorizada: cliente, o que bateu, preço, referência histórica, ações (Abrir cliente, WhatsApp, Descartar). Estados: carregando, vazio, erro. |
| `/workspace/turismo/clientes/$id` | Aba "Demanda e propostas" (somente se houver dados): demanda ativa, propostas enviadas, cotações vinculadas. |
| `/workspace/turismo/cotacoes` | Histórico de capturas, filtros por destino, período, operadora; cotações sem cliente. |
| `/workspace/integracoes/operadoras` | Contadores de captura e falhas de parser por tipo. |

Regras de UI: uma ação primária por tela, alvos de 44px, sem card dentro de card, títulos de até 6 palavras, sem emoji.

## 7. Fases e entregas

| Fase | Entrega | Prova |
|---|---|---|
| F0 | Mapeamento de telas (fixtures) e confirmação do schema atual | Fixtures versionadas, relatório de tabelas existentes |
| F1 | Captura de hotel e voo, grava em `travel_quote_sessions` e `travel_price_observations` | Testes de parser com fixtures, ingestão idempotente |
| F2 | Vínculo com cliente e `travel_client_demands` | Testes RLS e de payload com campos ausentes |
| F3 | Matcher e `travel_opportunities` | Testes com casos positivo, negativo e limite de data/orçamento |
| F4 | Rota de oportunidades e alerta no popup | Estados completos, design lint, typecheck e build |
| F5 | Passeio, transfer, pacote e retroativo de orçamentos salvos | Fixtures por tipo |
| F6 | Temperatura tarifária com amostra mínima | Testes de limiar e "histórico insuficiente" |

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Layout do Infotravel mudar e quebrar parsers | Detecção `parse_failed`, fixtures, alerta no painel |
| Termos de uso da operadora | Leitura passiva do que o agente já vê; nada de buscas automáticas |
| Falso positivo de oportunidade | Motivos visíveis, limiar configurável, descarte com motivo |
| Orçamento do cliente inferido errado | Marcar como "inferido" e permitir edição |
| Dado pessoal na captura | Vínculo explícito, RLS, sem envio ao Data Lake |

## 9. Decisões pendentes (bloqueiam F0)

1. Como a agência registra hoje as propostas enviadas ao cliente: dentro do Infotravel, WhatsApp ou planilha? Define a fonte de `travel_proposals_sent_log`.
2. O Infotravel guarda orçamentos salvos com nome do cliente? Se sim, o vínculo pode ser automático.
3. Janela padrão de "cliente esquecido" (sugestão: 15 dias) e tolerância de orçamento (sugestão: 10% acima).
4. Quais produtos priorizar na F1: voo e hotel, ou hotel e pacote.
5. Você consegue exportar o HTML (ou HAR sem cookies) das telas de busca e orçamento para criar os fixtures?

## 10. Critérios de aceite

- [ ] Spec aprovada por escrito.
- [ ] Captura passiva funcionando em hotel e voo com fixtures reais.
- [ ] Observações de preço append-only com `advance_days`.
- [ ] Oportunidade gerada em teste de integração com demanda ativa e captura nova, com motivos exibidos.
- [ ] Teste negativo: fora do período, fora do orçamento e proposta já enviada não geram oportunidade nova.
- [ ] Reload e rehidratação da lista de oportunidades preservam estado (vista, descartada).
- [ ] `npm run typecheck`, `npm run build` e `node scripts/design-lint.mjs --ratchet` com Exit Code 0.
- [ ] Registro em `docs/design/DECISIONS.md`.

