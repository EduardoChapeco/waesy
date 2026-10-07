

### Onda antifalsidade — continuação e gates finais — 2026-10-07
- **Superfície pública:** o perfil canônico não injeta mais seções/cards padrão; catálogo, posts, avaliações e vagas só ganham aba quando existem registros persistidos. O renderer de experiências não fabrica `Nossa Loja` quando não há binding de loja.
- **Studio e propostas:** o Studio exige sessão/tenant real, não usa perfil de marca Waesy implícito, não usa logo de cobertura fictício e falha se a persistência não retornar ID. A proposta visual inicia sem Cancún, México, datas futuras, companhia aérea, hotel, tags, preços, Pix ou parcelamento inventados; dados só entram por lead, usuário, OCR ou tabela real.
- **Turismo e vouchers:** UUID zero, agência genérica, plantão fictício, destino genérico, cliente/documento de exemplo, observações automáticas e seguradora/central inventadas foram removidos dos caminhos tocados. Token inválido de formulário de viajante agora falha, em vez de retornar contexto genérico com `success: true`.
- **Contratos de ausência:** parcelas de OCR são tratadas como lista vazia quando ausentes; parser de voucher lança erro explícito quando o provider não retorna JSON estruturado; nenhuma dessas condições produz sucesso ou registro sintético.
- **Rotas de tenant:** aéreas e reacomodação não usam UUID sentinela e bloqueiam criação sem loja configurada. Reservas mantêm estado vazio honesto quando a planta não possui mesas persistidas.
- **Gates:** `npm run typecheck` PASS; suíte direcionada final PASS com 4 arquivos e 15 testes; `git diff --check` PASS. Garante compilação e contratos locais, mas não prova provider externo, Postgres/RLS, Storage, browser E2E, deploy ou produção.
- **Estado honesto:** a onda está corrigida e validada localmente nos caminhos tocados. Permanecem para varredura posterior alguns textos genéricos de apresentação e módulos legados fora do escopo desta micro-onda; eles não devem ser interpretados como dados reais nem como integração concluída.
