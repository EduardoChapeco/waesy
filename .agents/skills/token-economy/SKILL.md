---
name: token-economy
description: Protocolo de Economia Extrema de Tokens e Eficiência Cirúrgica de Engenharia para Agentes Autônomos na plataforma Waesy.
---

# ⚡ Token Economy & Cirurgia de Precisão (Waesy Standard)

> **Regra de Ouro:** A excelência de BigTech não se mede pelo volume de tokens gastos, mas pela precisão cirúrgica de cada mutação. Cada token consumido deve gerar valor direto e permanente ao código.

---

## 🎯 Os 5 Pilares de Eficiência Operacional

### 1. Auditoria Prévia Direcionada (Targeted Inspection First)
- **Proibição de Leitura Cega:** NUNCA execute `view_file` sem delimitadores de linha (`StartLine`/`EndLine`) em arquivos grandes (>100 linhas).
- **Tríade de Inspeção:**
  1. `grep_search` para localizar a linha exata do símbolo, função ou componente.
  2. `view_file` com slice estrito (máximo 40 a 60 linhas de contexto).
  3. Checagem mental dos tipos e dependências antes de qualquer mutação.

### 2. Mutação Atômica em Lote Único (Single-Pass Mutation)
- Nunca faça edições fragmentadas que exigem re-leitura constante.
- Se um arquivo precisa de múltiplas alterações, use uma única chamada `multi_replace_file_content` com todos os chunks mapeados com precisão.
- Garanta que `TargetContent` seja único e idêntico ao código em disco, evitando falhas de substituição que forçam novos turnos.

### 3. Orçamento Estrito por Interação (Turn Budget)
- **1 Mensagem = 1 Sub-tarefa Atômica Concluída.**
- **Teto de Ferramentas:** Máximo de 5 a 6 tool calls por interação do agente.
- **Teto de Arquivos:** Modificar no máximo 1 a 2 arquivos por ciclo, garantindo foco e rollback simples se necessário.

### 4. Comunicação Enxuta e Sem Duplicação
- Nunca copie e cole o conteúdo completo de artifacts (`implementation_plan.md`, `walkthrough.md`) na resposta do chat.
- Aponte o link do artifact (`[implementation_plan.md](...)`) e liste apenas os 3-4 pontos-chave ou a próxima ação necessária.
- Elimine introduções conversacionais prolixas e conclusões redundantes.

### 5. Qualidade Inviolável (Zero-Regression & Zero-Mock)
- Economia de tokens NÃO significa atalhos amadores:
  - Todas as 7 Camadas de Completude continuam obrigatórias (Banco ➔ BFF ➔ UI ➔ Workspace).
  - Toda mutação deve ser validada para manter `npm run build` com 0 erros.
  - A integridade do schema Supabase e isolamento multi-tenant devem ser respeitados.

---

## 📋 Checklist Rápido de Execução de Turno

1. [ ] Localizei a linha exata via `grep_search`?
2. [ ] Li apenas o bloco estrito necessário via `view_file`?
3. [ ] Planejei a mutação em uma chamada atômica (`replace_file_content` ou `multi_replace_file_content`)?
4. [ ] Executei a mutação com precisão?
5. [ ] Verifiquei o impacto com o menor overhead possível?
6. [ ] Respondi de forma concisa, direta e orientada a resultados?
