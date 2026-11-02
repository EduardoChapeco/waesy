# SPEC-20261030 Travel Integrations Completeness Wave 2

## Objetivo

Fechar as quebras de contrato encontradas na auditoria da jornada de turismo, mantendo uma única cadeia canônica entre busca de fornecedor, composição de quartos, cotação, lead CRM, proposta e checkout. A referência `projetos-referencias/travelagencias` é usada somente para conferir cobertura de fluxo; nenhum código ou marca é copiado sem adaptação ao BFF e ao modelo multi-tenant do Waesy.

## Requisitos EARS

- **Quando** o workspace criar uma cotação a partir do Studio, **o sistema deve** enviar o contrato snake_case validado pelo BFF, persistir a ocupação de cada quarto e vincular a loja autenticada.
- **Quando** uma busca Wooba retornar ofertas, **o sistema deve** registrar uma sessão de busca, a execução do provedor e snapshots imutáveis de preço antes de entregar as ofertas à UI.
- **Quando** a API retornar um item sem preço, identificador ou horário obrigatório, **o sistema deve** rejeitar o item ou exibir indisponibilidade honesta; nunca deve fabricar preço, PNR, horário, hotel ou companhia.
- **Quando** uma cotação for criada para uma loja autenticada, **o sistema deve** sincronizar o lead CRM da mesma loja por telefone/e-mail e relacionar a cotação ao lead sem duplicar contato.
- **Quando** o fluxo público não possuir identidade de agência, **o sistema deve** usar apenas a ingestão pública específica e não abrir mutações internas de workspace.

## Invariantes

1. Busca aérea isolada consulta somente Wooba; composição de pacote usa InfoTravel com ocupações explícitas.
2. Preços e totais vêm do fornecedor ou do cálculo server-side; a UI não é fonte de verdade.
3. Snapshot, lead e cotação preservam `store_id`; nenhuma leitura de workspace pode atravessar tenant.
4. Falhas de CRM ou telemetria não podem mascarar falha de cotação; o BFF retorna o identificador canônico e registra o erro operacional.
5. Dados ausentes permanecem ausentes; não há defaults comerciais sintéticos.

## Escopo autorizado

- `src/components/tourism/unified-proposal-workspace.tsx`
- `src/services/tourism.functions.ts`
- `src/services/infotravel.ts`
- `src/services/travel-wooba-connector.service.ts`
- `src/services/travel-supply-orchestrator.service.ts`
- `supabase/migrations/20261030130000_travel_quote_canonical_links.sql`
- testes de contrato e auditoria da onda

## Evidências de aceite

- Teste do contrato snake_case do Studio e da ocupação multi-quarto.
- Teste que rejeita oferta Wooba sem campos obrigatórios e que prova que nenhum preço sintético é emitido.
- Teste/inspeção de persistência de sessão, execução, snapshot e vínculo CRM.
- `node scripts/check-bff-table-contracts.mjs`, lint focado e design lint ratchet.
- Build permanece evidência separada de tráfego real; credenciais e chamadas produtivas externas ainda exigem ambiente autorizado.
