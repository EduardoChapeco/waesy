# Arquitetura do Sistema de Skills Declarativas (Prompt 03)

## 1. Princípio Fundamental: Skills como DADOS, não Código Espalhado

Uma **Skill** é uma unidade declarativa padronizada que contém:
- **Gatilho Explícito**: Instrução semântica e padrões de intenção para quando deve ser ativada.
- **Quando NÃO usar**: Limites negativos para evitar alucinações e invasão de escopo.
- **Entradas e Saídas**: Tipos estritos e formato de schema validável.
- **Procedimento Numerado**: Passo a passo determinístico de raciocínio.
- **Regras Duras**: Restrições não-negociáveis de estilo, compliance e fatos.
- **Critério de Pronto (Definition of Done)**: Condição clara de sucesso.
- **Ferramentas Permitidas**: O que a skill tem autorização para chamar.

Nenhuma skill invoca provedores de IA diretamente. Toda execução herda e consome obrigatoriamente a **Porta Única** (`executeAiCoreGateway`) implementada no Prompt 02.

---

## 2. Contrato Único da Skill (Padrão Inviolável)

Cada skill cadastrada obedece ao seguinte schema:

```typescript
export interface AISkillDefinition {
  slug: string;
  name: string;
  category: string;
  niche?: string;
  icon: string;
  trigger_explicit: string;
  when_not_to_use: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  numbered_procedure: string[];
  hard_rules: string[];
  anti_patterns: string[];
  definition_of_done: string;
  allowed_tools: string[];
  quality_rubric: string;
  estimated_cost_usd: number;
}
```

---

## 3. Roteador de Intenção e Resolução Dinâmica

O roteador analisa o pedido do usuário (`userRequest`), contexto de tela, nicho da loja e histórico de navegação:
1. **Filtro de Ativação**: Filtra apenas skills ativadas pelo usuário e pela loja.
2. **Scoring de Semelhança Semântica**: Cruza a intenção do usuário com o gatilho explícito.
3. **Composição em Cadeia**: Se o pedido envolver múltiplas fases (ex.: "pesquise notícias de tecnologia, faça um resumo e gere um post"), o roteador compõe uma pipeline encadeada:
   `[pesquisar] -> [resumir] -> [copywriter_post] -> [formatar_markdown]`.
4. **Fallback Inteligente**: Se nenhuma skill servir com mais de 70% de confiança, a skill canônica de fallback (`fallback_clarifier`) formula perguntas de clarificação antes de alucinar.
5. **Observabilidade**: A decisão e a justificativa são registradas na tabela `ai_skill_runs` com custo e latência auditáveis.
