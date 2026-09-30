# Arquitetura de Agentes Autônomos e Squads com Handoff Estruturado (Prompt 04)

## 1. Princípios de Governança de Agentes
1. **Configuração Declarativa**: Agentes são configurados como dados com escopo restrito de leitura e escrita.
2. **Squad como Grafo de Execução**: Um squad é um grafo direcionado acíclico (DAG) onde cada nó é um agente especialista e cada aresta é um **Handoff Explícito**.
3. **Nenhum Agente com Acesso Irrestrito**: Agente de marketing não acessa dados financeiros confidenciais; agente de OCR não escreve em tabelas de vendas.
4. **Handoff com Contrato Inviolável**: Toda transição passa:
   - Objetivo da etapa
   - Contexto mínimo necessário
   - O que já foi executado com sucesso
   - O que falta executar
   - Restrições específicas da próxima etapa
   - Formato de schema exigido no retorno.
5. **Supervisor e Arbitragem de Conflitos**: Um supervisor central monitora o progresso. Se houver contradição entre agentes, estouro de orçamento ou repetição sem convergência, o supervisor encerra a execução e devolve ao humano.
6. **Orçamento Rigoroso por Squad**:
   - Teto de chamadas (ex: máx. 5 passos)
   - Teto de custo em dólares (ex: máx. $0.05 por run)
   - Teto de tempo (timeout geral de 120s).

---

## 2. Contrato do Agente

```typescript
export interface AIAgentContract {
  id: string;
  name: string;
  role: string;
  goal: string;
  data_scope: string[]; // ex: ['stores:read', 'orders:read']
  allowed_tools: string[];
  allowed_skills: string[];
  output_schema: Record<string, any>;
  acceptance_criteria: string[]; // Verificações determinísticas obrigatórias
  stop_conditions: string[]; // Condições de transbordo humano imediato
  budget_limit_usd: number;
  tone_of_voice: string;
}
```

---

## 3. Os 3 Squads Canônicos em Execução

### Squad 1: Vendas & Prospecção Comercial
- **Agente 1 (SDR Prospecção)**: Analisa leads e perfil do cliente via skill `lead_qualifier_sdr`.
- **Handoff**: Transmite score BANT + dores do cliente para o Closer.
- **Agente 2 (Closer Comercial)**: Elabora proposta estruturada via skill `commercial_proposal`.
- **Handoff**: Transmite proposta + condições de pagamento para o Follow-up.
- **Agente 3 (Follow-up & Fechamento)**: Gera mensagens de contato no WhatsApp com prazos.

### Squad 2: Publicação & Conteúdo
- **Agente 1 (Estrategista de Pauta)**: Define o tema, objetivo e palavras-chave.
- **Handoff**: Passa briefing completo para o Copywriter.
- **Agente 2 (Copywriter de Marca)**: Cria o texto e variações de anúncios via `ad_copywriter`.
- **Handoff**: Submete para a Revisão de Qualidade.
- **Agente 3 (Auditor de Qualidade e Compliance)**: Valida tom de voz, regras gramaticais e aprova a publicação.

### Squad 3: Financeiro & Conciliação Fiscal
- **Agente 1 (Extrator de Comprovantes)**: Processa faturas e comprovantes via `receipt_organizer`.
- **Handoff**: Transmite valores numéricos validados para a Conciliação.
- **Agente 2 (Conciliador de Caixa)**: Cruza dados com lançamentos em aberto no ERP.
- **Handoff**: Transmite divergências para o Relator Financeiro.
- **Agente 3 (Relator de Fechamento)**: Gera o balancete sintético e notifica anomalias ao gestor.
