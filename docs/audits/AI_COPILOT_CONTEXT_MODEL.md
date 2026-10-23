# AI_COPILOT_CONTEXT_MODEL — Modelo de Contexto, Escopo e Fact Lock

## 1. Estrutura do Contexto (`CopilotStructuredContext`)

| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `niche` | `string` | Chave normalizada do nicho (`evento`, `veiculo`, `imovel`, `vaga`, `servico`, `viagem`, `hospedagem`, `gastronomia`, `mercado`, `desapego`, `negocio`, `agro`, `equipamento`, `digital`, `doacao`, `assinatura`). |
| `nicheLabel` | `string` | Nome legível do nicho exibido no subtítulo contextual do cabeçalho. |
| `availableFields` | `EditorialFieldKey[]` | Lista fechada de campos editoriais permitidos: `['title', 'description', 'summary', 'tags']`. |
| `lockedFacts` | `LockedFact[]` | Fatos extraídos dos atributos estruturados e tokens numéricos do texto original (`2026`, `5x2`, `120m²`, `18500 km`, `R$ 1.200`, cidade, datas). |
| `writingHints` | `string[]` | Diretrizes editoriais específicas do nicho injetadas no prompt do sistema. |
| `nicheForbiddenTerms` | `string[]` | Termos de outros nichos expressamente bloqueados para impedir vazamento semântico cruzado (B.37). |
| `sourceFingerprint` | `string` | Hash determinístico do estado original do formulário para detecção de conflito concorrente. |

## 2. Invariante de Fact Lock (`validateCopilotOutputFacts`)

1. **Extração Automática de Fatos Numéricos (`extractSignificantNumbersAndTokens`)**:
   - Anos (`1950`–`2099`, ex.: `2026`).
   - Escalas e dimensões (`5x2`, `6x1`, `12x36`, `4x4`).
   - Medidas e grandezas (`120m²`, `18500 km`, `220v`, `800g`).
   - Valores monetários explícitos (`R$ 1.200`).
2. **Bloqueio de Alucinações e Superlativos Não Comprovados**:
   - Padrões como `"o maior evento da região"`, `"500 participantes"`, `"evento 100% gratuito"`, `"lucro garantido"` são detectados e removidos caso não existam no texto original do anunciante.
3. **Restauração Defensiva**:
   - Caso a resposta da IA omita um token numérico obrigatório do título ou descrição original, `sanitizeSuggestedDraftAgainstFactLock` restaura o dado factual automaticamente.
