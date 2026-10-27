# ==========================================
# 🌌 AEGIS OMNIBUS PROTOCOL
# ==========================================
> **Diretriz Máxima**: Transição de "Audit Básico" para **Auditoria Computacional Profunda**.
> **Objetivo**: Escanear, testar, refatorar e alinhar cada módulo da plataforma às regras de negócio e UX de nível Internacional (superior ao padrão Lovable).

---

## 🎭 1. OS ESQUADRÕES DE EXCELÊNCIA (Novos Agentes)
O Antigravity agora se divide em personas super-especializadas que atuarão em conjunto para cada módulo.

| Agente | Foco de Atuação (Deep Skills) | Workflow de Análise |
|:---|:---|:---|
| 👁️ **[VANGUARD]** | UX/UI, Fluxos de Navegação, Design System | Analisa renderização, quebra de layout, sobreposição de Modais/SheetPages, responsividade extrema, e fluidez visual de alto impacto (Flat/Premium). |
| 🧠 **[ORACLE]** | Lógica de Negócios & Regras de Produto | Compara o código construído com a documentação original. Teste de CRUDs (Edge Cases, validações de form nulas, quebras lógicas, fluxo feliz e infeliz). |
| ⚙️ **[SENTINEL]** | Database, Integrations & Edge Functions | Rastreia de ponta a ponta o dado: do Hook da UI até o Banco de Dados. Verifica dependências de Schemas, RLS cruzados, triggers e integridade relacional. |
| 🏗️ **[ARCHITECT]**| Estrutura de Código & Padrões (Clean Code) | Foca na refatoração agressiva. Garante que hooks não estão duplicados, componentes são reutilizáveis e a arquitetura segue o formato modular limpo. |

---

## 🗺️ 2. CRONOGRAMA DE OPERAÇÕES MODULE-BASED

A auditoria não será feira no repositório inteiro "de uma vez", pois isso impede a profundidade. Atacaremos **Módulo por Módulo**, rodando o esquadrão completo em cada um, só avançando quando o módulo estiver 100% impecável.

### 📦 MÓDULO 1: CRM & Gestão de Clientes (`Clients`, `Leads`)
- **Foco**: Criação, edição profunda, associação a organizações, tags, documentação, e vinculação com Portais de Viajantes.
- **Deep Test**: O formulário de edição atualiza corretamente preferências complexas (JSONB)? A exclusão de um cliente trata cancelamentos em cascata de forma limpa?

### 📦 MÓDULO 2: Cotações & Vendas (`Quotations`, `Itineraries`)
- **Foco**: O motor principal de vendas. Associação de destinos, experiências, hotéis, precificação e o link/template público (Public Quotation).
- **Deep Test**: O motor de cálculo de preço condiz com os itens adicionados na interface? A aprovação no link público propaga corretamente o status "Convertido" no Kanban? O design no PublicQuotation quebra em mobile?

### 📦 MÓDULO 3: Operação de Viagens (`Trips`, `Group Trips`, `Guides`, `Hotels`)
- **Foco**: O crud monstruoso de viagens em grupo e individuais. `BusLayout` (layout de ônibus), controle de quartos de hotel e emissão de vouchers.
- **Deep Test**: Associar um cliente a um bloco/assento de ônibus gera erro de UI se o assento não existir? O CRUD de Guias funciona na sincronia com os PDFs do storage?

### 📦 MÓDULO 4: Finanças & Ledger (`Financial Transactions`, `Ledger`, `Commissions`)
- **Foco**: Lançamento de parcelas (installments), transações financeiras, comissionamento automático aos agentes, painel DRE de viagens (`GroupTripFinance`).
- **Deep Test**: Testar conciliação. Se cancelar uma parcela do pacote, a comissão do colaborador é revertida? O Dashboard lê as queries otimizadas ou puxa a tabela inteira e tranca a tela?

### 📦 MÓDULO 5: Operacional (Logística) (`Kanban`, `Tasks`, `Tickets`)
- **Foco**: Quadros de processos, chamados de suporte (`Tickets`), check-lists, e anotações.
- **Deep Test**: Arrastar um card (drag & drop) atualiza instantaneamente a UI via estado local ANTES do banco (optimistic update)? Como o sistema reage se a Edge Function de falha e a UI e Banco ficam dessincronizados?

---

## 🛠️ 3. PROTOCOLO DE TESTES: "O PADRÃO ABSOLUTO"

Para cada Módulo acima, executaremos este fluxo linear (Framework):
1. **[ORACLE]** gera a matriz de Expectativas vs Código Real.
2. **[SENTINEL]** avalia os Schemas, Views, Tipos TSX e o banco ligado a esse módulo.
3. **[ARCHITECT]** re-escreve e refatora a página, removendo blocos antigos e padronizando estado (React Query / Supabase Gen Types).
4. **[VANGUARD]** checa as animações, gaps, remoção de lixo estético e garante uso universal do Shadcn.

---
*AEGIS OMNIBUS INICIADO. Aguardando aprovação para engajamento em: MÓDULO 1 (CRM & Gestão de Clientes).*
