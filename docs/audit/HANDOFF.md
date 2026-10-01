# Handoff Operacional — Bloco B (F07 a F14: Modelo Canônico do Motor de Anúncios)

**Data:** 2026-10-01T17:45:00-03:00  
**Fases Concluídas:** F07 a F14 (Bloco B — Modelo Único de Anúncio e Vitrine)  
**Status do Portão:** Verde (Zero Erros de Compilação, 10/10 Testes Unitários Aprovados, Build de Produção Limpo)  

## Resumo Executivo (12 Linhas Canônicas)
1. **Modelo Canônico:** Unificadas as entidades `classifieds` e `products` sob a interface canônica única `UnifiedListing` em `src/types/unified-ad-engine.ts`.
2. **Ciclo de Vida F08:** Implementada a máquina de estados determinística com 10 transições formais em `src/lib/ad-engine/listing-state-machine.ts`.
3. **Expiração Auditada:** Expiração de 30 dias restrita e automatizada para Classificados; Workspace opera sob governança contínua do comerciante.
4. **Taxonomia por Nicho F09:** Registro canônico de seções e campos mandatórios em `src/lib/ad-engine/niche-taxonomy-manifest.ts`.
5. **Erradicação do Caso O02:** Template "Mercado" (Gôndola) é rejeitado terminantemente no nível de dado dentro do nicho de Turismo.
6. **Validação Condicional F10:** Publicação bloqueada de forma estrita caso itens inclusos ou atributos obrigatórios estejam ausentes.
7. **Camada BFF Unificada F07-F14:** 8 Server Functions em `src/services/unified-listing.functions.ts` fornecendo adapter bidirecional transparente.
8. **Motor de SEO F14:** Metadados estruturados JSON-LD Schema.org (`TouristTrip`, `Product`, etc.) e serializador WebMCP para agentes de IA.
9. **Migração SQL:** Criada a view `unified_listings_view`, função RPC de expiração atômica e índices compostos em `supabase/migrations/`.
10. **Testes Unitários:** 10/10 testes em `src/services/unified-listing.test.ts` aprovados com Exit Code 0 em 34ms.
11. **Build de Produção:** `npm run build` gerando `dist/_worker.js` e assets com Exit Code 0 sem quebras.
12. **Próximo Alvo Imediato:** Bloco C (F15 a F24: Editor em Modo Rápido e Modo Completo com Dono Único de Preço, Pagamento e Inclusos).
