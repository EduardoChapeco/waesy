

## W2.5 — OCR contratual — 2026-10-07

O OCR contratual agora exige staff, rate limit por tenant/usuário e base64 limitado a 12 MB; o fetch de `imageUrl` controlado pelo chamador foi removido para eliminar SSRF. Regressão focada: 3 arquivos / 7 testes verdes; typecheck e diff check verdes. Provider real, quota persistente e banco remoto continuam pendentes.
