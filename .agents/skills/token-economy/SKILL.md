---
name: token-economy
description: Protocolo de Economia Extrema de Tokens e Eficiência Cirúrgica de Engenharia para Agentes Autônomos na plataforma Waesy.
---

# ⚡ Token Economy & Cirurgia de Precisão (Waesy Standard)

> **Regra Pétrea Inviolável:** A partir desta data, é TERMINANTEMENTE PROIBIDO reescrever arquivos ou blocos de código inteiros de forma desnecessária. Mudanças pequenas, refinamentos, correções de bugs e estilizações DEVEM ser executadas cirurgicamente via `edit_file` delimitado. O comando `write_file(Overwrite=true)` é estritamente proibido em arquivos existentes durante manutenções e refinamentos.

---

## 🛑 Os 3 Mandatos de Preservação e Não-Reescrita

1. **Zero Reescrita de Arquivo Inteiro em Manutenção:**
   - Se o arquivo já existe no repositório, NUNCA gere uma substituição completa de 300, 500 ou 1000 linhas.
   - Cada linha reescrita sem necessidade gasta créditos abusivos, sobrecarrega a janela de contexto e introduz alucinações e perda de regras adjacentes.
2. **Uso Exclusivo de Criação para Itens Virgens:**
   - `write_file` é permitido exclusivamente para arquivos que NÃO existem no repositório: novos componentes, novas rotas TanStack, novas migrações SQL ou novas specs técnicas.
3. **Cirurgia de Precisão em 4 Etapas (Metodologia Oficial):**
   - **Etapa 1 — Localização Cirúrgica:** Usar `read_file` com `StartLine` e `EndLine` estritos (máximo 40-60 linhas) para mapear o trecho exato a alterar.
   - **Etapa 2 — Delimitação do Target:** Mapear no `Target` apenas o bloco contíguo mínimo indispensável.
   - **Etapa 3 — Mutação Focada:** Executar `edit_file` substituindo cirurgicamente o trecho delimitado.
   - **Etapa 4 — Prova de Não-Regressão:** Rodar o teste unitário focado daquele módulo (`npx vitest run path/to/test.ts`) sem disparar comandos pesados e desnecessários.

---

## 🎯 Os 5 Pilares de Eficiência Operacional

### 1. Auditoria Prévia Direcionada (Targeted Inspection First)
- **Proibição de Leitura Cega:** NUNCA execute `read_file` sem delimitadores de linha (`StartLine`/`EndLine`) em arquivos grandes (>100 linhas).
- Ler estritamente o trecho relevante antes de editar.

### 2. Mutação Atômica Cirúrgica (Targeted Minimal Edits)
- Nunca sobrescreva arquivos inteiros.
- Garanta que `Target` seja exato e unívoco no arquivo.
- Preserve todos os comentários, docstrings e regras de negócio preexistentes.

### 3. Orçamento Estrito por Interação (Turn Budget)
- **1 Mensagem = 1 Sub-tarefa Atômica Concluída.**
- **Teto de Ferramentas:** Máximo de 5 a 6 chamadas de ferramenta por ciclo.
- **Teto de Arquivos:** Modificar cirurgicamente no máximo 1 a 2 arquivos por ciclo, facilitando auditoria e rollback.

### 4. Comunicação Enxuta e Sem Duplicação
- Nunca copie e cole arquivos ou relatórios gigantescos desnecessariamente no chat.
- Apresente tabelas objetivas e respostas em schema direto conforme B.6 de AGENTS.md.

### 5. Qualidade Inviolável (Zero-Regression & Zero-Mock)
- A economia de tokens e edição cirúrgica aumentam a confiabilidade:
  - Preservam regras preexistentes sem apagar código alheio.
  - Mantêm a arquitetura das 7 Camadas íntegra.
  - Zero mocks sintéticos e 100% de dados e contratos reais.

---

## 📋 Checklist Rápido de Execução Cirúrgica

1. [ ] Localizei a linha exata via leitura delimitada (`StartLine`/`EndLine`)?
2. [ ] Isolei o menor bloco contíguo possível para o `Target`?
3. [ ] Estou usando `edit_file` em vez de `write_file`?
4. [ ] Mantive 100% dos comentários, tipos e regras existentes fora da área afetada?
5. [ ] Validei a alteração com o menor overhead de teste possível?
6. [ ] Respondi em schema direto e conciso?
