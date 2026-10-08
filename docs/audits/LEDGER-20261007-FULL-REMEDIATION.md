

## W2.9 — envelope público e assinatura salva — 2026-10-08

`getEnvelopeByToken` deixou `select("*")` e passou a usar allowlist compatível com a tela de assinatura; token foi limitado. `saveUserSignature` agora aceita somente data URL de imagem limitada a 2 MB e confirma erro/linha atualizada no perfil autenticado. Regressão focada: 7 arquivos / 15 testes verdes; typecheck e diff check verdes. RLS/grants e persistência real continuam não verificados.
