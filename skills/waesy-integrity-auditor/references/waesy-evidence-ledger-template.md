# Ledger de Evidências — Waesy

Use uma cópia deste arquivo por sessão de auditoria/remediação. Não marque um finding como fechado sem preencher os campos aplicáveis.

## Snapshot e escopo

- Data/hora (ISO, fuso):
- Repositório: `EduardoChapeco/waesy`
- Branch/HEAD:
- Base remota comparada:
- PR(s) e estado/checks:
- Worktree inicial e paths preexistentes preservados:
- Ambiente e versões:
- Escopo explicitamente incluído/excluído:

## Preflight de leitura por microfase

| Onda.microfase | AGENTS/skill/plano lidos | Paths de implementação lidos (UI/rota, BFF, DTO, SQL, teste) | Hash/commit inicial | Ação autorizada | Leitura concluída antes de mutar? |
|---|---|---|---|---|---|
| W?.? | | | | | |

## Finding e estado de prova

| ID | Severidade | Estado | Path(s)/linha(s) | Reprodução antes | Causa-raiz | Correção/path(s) | Prova depois | Revisão adversarial |
|---|---|---|---|---|---|---|---|---|
| | | `confirmado / hipótese / em correção / código corrigido / integração / browser / produção / bloqueado` | | | | | | |

## Matriz de teste por finding

Para cada ID, registrar `pass/fail/not run` e link/log/commit, nunca apenas “testado”.

- [ ] Regressão reproduz falha na baseline
- [ ] Caso positivo
- [ ] Caso negativo de identidade/role/tenant
- [ ] Erro de provider/DB e cada write parcial
- [ ] Retry/replay idempotente
- [ ] Concorrência/lock/constraint (quando aplicável)
- [ ] Reload/rehidratação do estado persistido
- [ ] Browser real: clique, navegação, loading, erro, vazio, sucesso
- [ ] Desktop e mobile, acessibilidade/teclado/foco
- [ ] Typecheck, lint/design, testes e build no SHA final
- [ ] Banco efêmero/migrations/RLS, quando aplicável
- [ ] CI e deploy/smoke, quando explicitamente autorizados

## Gates e resultados

| Comando/ambiente | SHA exato | Resultado/exit code | Evidência/log | O que NÃO prova |
|---|---|---|---|---|
| | | | | |

## Bloqueios, incertezas e decisões humanas

- Dependências/credenciais/ambientes ausentes:
- Regras de produto/semântica pendentes:
- Findings que continuam não verificados:
- Ações externas que exigem autoridade/confirmação:

## Fechamento

- Findings fechados com prova completa:
- Findings abertos/bloqueados:
- Paths alterados e paths intencionalmente não alterados:
- Commit/PR final:
- Merges/deploy: só afirmar quando observados diretamente:
- Revisão adversarial independente (quem, que hipóteses tentou derrubar, resultado):
