

## Continuação executada — integração da Onda 2

- O painel `src/routes/workspace.turismo.hoteis.tsx` agora usa `HotelAutocompleteInput` na aba de dados.
- A seleção canônica preenche nome, cidade, estado, país, endereço e estrelas quando disponíveis.
- O payload de criação/edição persiste `global_hotel_id` em `hotels_bank`.
- A migration adiciona a FK/index de `hotels_bank.global_hotel_id` para permitir migração gradual sem quebrar o legado.
- O fluxo não oferece criação direta de registro canônico ao usuário da agência; governança Master continua separada.

**Validação incremental:** os 2 testes focados (6 casos) e o typecheck passaram novamente; `git diff --check` também passou.
