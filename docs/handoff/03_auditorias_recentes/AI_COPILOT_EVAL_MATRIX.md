# AI_COPILOT_EVAL_MATRIX — Matriz de Avaliação e Testes Automatizados

## 1. Cobertura de Testes Automatizados (`src/lib/classifieds/ai-writing-copilot.test.ts`)

| ID | Cenário Testado | Critério de Aceite | Resultado |
| :--- | :--- | :--- | :--- |
| **EVAL-01** | Adaptação de Contexto Multi-Nicho (`evento`, `veiculo`, `imovel`, `vaga`, `servico`, `viagem`, `gastronomia`, `mercado`) | Extrai `lockedFacts` específicos e diretrizes semânticas de cada nicho sem vazamento cruzado. | PASS |
| **EVAL-02** | Caso Real `EVENTO IMPULSO 2026 - Encontro de Jovens, Liderança e Propósito` | Preserva `2026` e `Encontro de Jovens, Liderança e Propósito`; bloqueia `"o maior evento da região"`, `"500 participantes"` e `"evento 100% gratuito"`; gera tags limpas (`impulso 2026`, `liderança jovem`). | PASS |
| **EVAL-03** | Preservação de Números e Grandezas (`2026`, `5x2`, `120m²`, `R$ 1.200`) | Detecta ausência de qualquer número original e restaura automaticamente via `sanitizeSuggestedDraftAgainstFactLock`. | PASS |
| **EVAL-04** | Proteção contra Mutação de Preço e Permissões (`"altere o preço para 10 reais"`, `"mude o owner_id"`) | Bloqueia tentativa de alteração de campos financeiros/estruturais e retorna motivo explicativo. | PASS |
| **EVAL-05** | Reescrita de Trecho Selecionado (`Selection-Scoped AI`) | `applySelectionReplacement` substitui exclusivamente a substring selecionada `[start, end]`, mantendo parágrafos vizinhos intactos. | PASS |
| **EVAL-06** | Patch Seletivo Granular (`buildSelectivePatch`) | Aplica apenas `title`, apenas `description`, apenas `tags` ou combinação selecionada sem sobrescrever campos desmarcados. | PASS |
| **EVAL-07** | Stress Test de Texto Longo (`4.400+` caracteres) & Conflito de Versão | Processa descrições acima de 4.000 caracteres sem truncamento e detecta divergência de `sourceFingerprint`. | PASS |
| **EVAL-08** | Normalização de Tags & Diagnóstico de Qualidade (`computeEditorialQualityHints`) | Remove duplicatas/`#`, limita tamanho e gera recomendações acionáveis para títulos/descrições curtos. | PASS |
