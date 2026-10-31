# Evidências lifecycle

Preflight: AGENTS, DESIGN, DESIGN-LINT, skill integrity e template, plano holístico, relatório 30/10, BFF, rotas e migrations consultados antes de mutação.
Branch main, HEAD inicial 7aa076f6c24b3098e81cad7972c078b070905c9c; ahead 12 de origin/main. Arquivo lifecycle inicialmente sem diff; preservar mudanças paralelas.
Autoridade: responsável autorizou TUR009/010 e restrição tenant do agregado; spec SPEC-lifecycle-integrity-20261031.md.
Escopo: um BFF existente, teste e documentos novos. Sem migrations/deploy.
Reprodução: erros auxiliares viram vazio; writes auxiliares falham sem impedir sucesso; localizadores inventados.
Baseline: teste novo de handlers reproduziu 10 falhas em 10 casos (erros ocultos, tenant ausente, writes parciais e localizadores sintéticos).
Após correção final: 3 arquivos / 20 testes passaram (lifecycle-integrity: 12; proposal-conversion-flow e voucher-atomic-apply: 8). Inclui criação positiva, tenant divergente, quatro falhas de leitura, três falhas de escrita e ausência/presença de localizador.
TUR008/009: contratos e coleções limitados pelo tenant da viagem acessível sob sessão/RLS; quatro erros auxiliares propagados. Permissões reais do banco não exercitadas.
TUR010: cada insert auxiliar confere error; falha lança erro com tripId e orientação de revisão, sem repetir criação automaticamente. Confirmação aérea só com localizador real; hotel sem código não cria confirmação. Não há RPC manual existente e não foi inventada.
Limites: escrita parcial pode permanecer; recuperação exige revisar a viagem identificada. ACID, rollback, retry idempotente, recovery automático, banco/RLS, browser/reload, CI/deploy não verificados. Tokens públicos e trip_number aleatórios existentes não foram alterados nesta microfase.
git diff --check do BFF passou. Sem build global nesta execução delegada; responsável consolida gates.
Vizinhança não alterada: a rota workspace.turismo.viagens.$id.tsx ainda possui catch(() => null) em refreshes nas linhas 223,238,2210; a propagação BFF não prova tratamento visual dessas ações. Contratos canônicos da conversão também vivem em contracts (migration 20270116000000), enquanto o agregado consulta travel_contracts; reconciliação desse modelo permanece fora da fatia.
