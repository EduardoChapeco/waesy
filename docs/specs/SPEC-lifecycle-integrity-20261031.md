# Integridade da viagem

Escopo autorizado: travel-lifecycle.functions.ts e teste novo de handlers.
Quando uma leitura auxiliar da viagem falhar, o agregado deve rejeitar com o erro, preservando distinção entre vazio e falha.
Quando buscar contrato e coleções, o BFF deve restringir ao store_id da viagem acessível pela sessão/RLS.
Quando criar viagem manual, cada escrita obrigatória deve ser conferida e falhas devem identificar a viagem parcialmente criada; não devolver sucesso.
Quando não existir localizador real, nenhuma confirmação ou localizador sintético deve ser criado. Hotel informado permanece na composição da viagem.
Não há RPC manual encontrada: esta fase não garante ACID, rollback ou retry idempotente; não aplica migrations.
Evidência: regressão em handlers reais com cliente DB simulado, baseline falha e versão corrigida passa. RLS, reload e banco real permanecem não verificados.
