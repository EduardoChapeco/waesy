# SPEC-20261106-UNIVERSAL-KANBAN-MULTI-NICHE-MULTI-SECTOR
## Especificação Canônica de Arquitetura de Kanbans Multi-Nicho e Multi-Setor (Waesy Pipeline Engine)

---

### 1. Metadados & Governança
- **ID da Spec:** SPEC-20261106-UNIVERSAL-KANBAN-MULTI-NICHE-MULTI-SECTOR
- **Data de Criação:** 2026-11-06
- **Status:** APROVADO PARA IMPLEMENTAÇÃO
- **Autor:** Antigravity Agent & Core Platform Engineering
- **Alvo:** `src/services/kanban-config.functions.ts`, `src/components/workspace/kanban/`, `src/lib/niches/`

---

### 2. Contexto e Problema de Negócio
O ecossistema Waesy atende 10 verticais de mercado (Nichos: Turismo, Gastronomia, Varejo, Mecânica/Automotivo, Imobiliária, Serviços, Saúde, Eventos, Criador, Genérico).
Atualmente, as visualizações em Kanban operam de forma fragmentada:
1. O `KANBAN_DEFAULTS` em `src/services/kanban-config.functions.ts` suporta apenas módulos genéricos simples (`tasks`, `commercial_crm`, `quotes`, `orders`), deixando lacunas em departamentos vitais como RH (Recrutamento, Onboarding Documental, Demissão), Compras/Fornecedores, Separação/Expedição (Picking) e KDS de Cozinha.
2. Cada nicho possui particularidades regulatórias e operacionais em cada departamento (exemplo: RH de Mecânica exige NR-10/NR-12, CNH e ASO de ruído/esforço; RH de Imobiliária exige CRECI e certidões forenses; RH de Gastronomia/Supermercado exige RDC 216 e exames coprológicos).
3. O KDS de cozinha e a separação de mercadorias exigem layouts de cartões de alta densidade tátil com SLA cronometrado, modificadores de itens e botões de avanço de estação em 1 clique, incompatíveis com cards genéricos de texto puro.
4. É necessário unificar a engine de Kanbans permitindo que qualquer módulo do Workspace adote visualização Kanban com presets inteligentes de acordo com o nicho e setor ativo da loja.

---

### 3. Requisitos em Sintaxe EARS

#### 3.1 Requisitos Ubíquos (Sempre Ativos)
- **EARS-UBI-01:** O sistema DEVE fornecer configurações de colunas de Kanban desacopladas por `store_id`, `module` e `department`, persistidas de forma multi-tenant em `kanban_stage_configs`.
- **EARS-UBI-02:** O sistema DEVE aplicar tokens de design semânticos canônicos (`bg-card`, `border-border/60`, `text-foreground`, `bg-primary`, `bg-warning`, `bg-emerald-500`, `bg-rose-500`) em todas as superfícies e cards de Kanban, com piso tátil de 44px (`h-11 min-h-11`) para alvos interativos.
- **EARS-UBI-03:** Todas as transições de estágio DEVEM respeitar o propósito semântico (`inbox`, `in_progress`, `review`, `won`, `lost`, `archived`) e acionar a persistência correspondente via Server Functions.

#### 3.2 Requisitos Orientados a Eventos (Gatilhos de Usuário)
- **EARS-EVT-01:** QUANDO o gestor acionar o modal de customização de colunas (`KanbanColumnCustomizerModal`), o sistema DEVE permitir a escolha de presets especializados de acordo com o nicho e o setor selecionados.
- **EARS-EVT-02:** QUANDO o operador arrastar ou clicar no botão de avanço de fase de um card no KDS, o sistema DEVE atualizar o status do pedido, registrar o tempo de preparo da estação e reproduzir feedback visual/auditivo imediato.
- **EARS-EVT-03:** QUANDO um candidato for movido para a etapa de contratação/admissão no Kanban de RH, o sistema DEVE abrir a pasta de validação documental exigindo os documentos obrigatórios correspondentes ao nicho da empresa.

#### 3.3 Requisitos Orientados a Estado
- **EARS-STA-01:** ENQUANTO o card do KDS estiver em fila ou preparo, o sistema DEVE computar e exibir o tempo decorrido com coloração de SLA reativa (normal < 10min, atenção 10-20min, crítico > 20min).
- **EARS-STA-02:** ENQUANTO um processo de compras estiver em cotação, o sistema DEVE computar o status das cotações recebidas dos fornecedores e destacar a de menor valor unitário.

#### 3.4 Requisitos Opcionais (Recursos por Nicho)
- **EARS-OPT-01:** SE a loja for do nicho `gastronomy`, o sistema DEVE habilitar o modo de exibição KDS com classificação automática por estação de preparo (Chapa, Forno, Bebidas, Sobremesas).
- **EARS-OPT-02:** SE a loja for do nicho `automotive`, o sistema DEVE habilitar colunas e cards de Ordem de Serviço com identificação de placa, quilometragem, rampa e aguardo de autopeças.

---

### 4. Matriz Taxonômica de Kanbans: Setores x Nichos

| Setor Operacional | Nicho Alvo | Estágios Canônicos (Pipeline) | Variante de Card | Metadados Específicos |
| :--- | :--- | :--- | :--- | :--- |
| **Comercial / CRM** | Turismo | Novos Contatos ➔ Cotação ➔ Proposta ➔ Negociação ➔ Viagem Confirmada | `commercial` | Destino, Pax, Cotação R$, WhatsApp |
| **Comercial / CRM** | Imobiliária | Novos Leads ➔ Sondagem de Perfil ➔ Visita Agendada ➔ Proposta ➔ Análise de Crédito ➔ Contrato Fechado | `commercial` | Tipo (Venda/Locação), Imóvel, CRECI Corretor |
| **Comercial / CRM** | Automotivo | Orçamento Solicitado ➔ Diagnóstico ➔ Aprovação Cliente ➔ OS Gerada ➔ Faturado | `commercial` | Veículo, Placa, Peças + Mão de Obra |
| **KDS / Cozinha** | Gastronomia | Fila de Entrada ➔ Em Preparo (Estação) ➔ Montagem & Conferência ➔ Pronto para Despacho ➔ Concluído | `kds` | Mesa/Comanda, Tempo SLA, Modificadores, Estação |
| **Separação / Picking** | Varejo / Supermercado | Pedido Recebido ➔ Em Separação (Picking) ➔ Pesagem & Substituição ➔ Embalado ➔ Em Rota | `picking` | Localizador de Corredor, Itens Substitutos, Sacolas |
| **Ordem de Serviço** | Automotivo / Oficina | Check-in / Entrada ➔ Diagnóstico Mecânico ➔ Aguardando Peças ➔ Na Rampa / Execução ➔ Teste de Rodagem ➔ Entregue | `service_order` | Veículo, Placa, Mecânico Responsável, Rampa |
| **RH / Recrutamento** | Multi-Nicho | Banco de Talentos ➔ Triagem Curricular ➔ Entrevista Inicial ➔ Teste Técnico ➔ Entrevista Gestor ➔ Proposta Aceita | `hr_talent` | Cargo, Pretensão Salarial, Score de Match |
| **RH / Admissão & Docs** | Multi-Nicho | Aguardando Documentos ➔ Validação & OCR ➔ ASO Admissional ➔ Assinatura Contrato / LGPD ➔ Efetivado | `hr_onboarding` | Status ASO, Certidões, CTPS Digital, NR/EPIs |
| **RH / Desligamento** | Multi-Nicho | Solicitação / Aviso Prévio ➔ Exame Demissional ➔ Devolução de Ativos / Acessos ➔ Homologação / Rescisão ➔ Arquivado | `hr_offboarding` | Tipo Rescisão, Devolução de Crachá/Notebook |
| **Compras / Suprimentos**| Multi-Nicho | Requisição Interna ➔ Cotação (Fornecedores) ➔ Aprovação Financeira ➔ Pedido Emitido (OC) ➔ Em Trânsito ➔ Recebido / NF | `purchasing` | Fornecedor, Valor OC, Prazo de Entrega, XML NF |

---

### 5. Contrato de Componentes e Modelos de Dados

#### 5.1 Extensão do DTO de Estágio (`KanbanStageDTO`)
```typescript
export interface KanbanStageDTO {
  id?: string;
  stage_key: string;
  title: string;
  purpose: KanbanPurpose;
  color: string;
  sort_order: number;
  is_visible: boolean;
  sla_minutes?: number;
  department?: string;
  card_variant?: "standard" | "commercial" | "kds" | "picking" | "service_order" | "hr_talent" | "hr_onboarding" | "purchasing";
  description?: string;
}
```

#### 5.2 Variante de Renderização de Cartões (`UniversalKanbanCard`)
- Componente polimórfico que bifurca a exibição por `card_variant`.
- Foco em alvos táteis mínimos de 44px (`h-11 min-h-11`).
- Indicadores de SLA visuais sem classes de cores arbitrárias.
- Tratamento para todos os estados de carregamento, vazio e erro.

---

### 6. Critérios de Aceite e Verificação Mecânica
- [ ] Compilação estrita em TypeScript (`npm run typecheck`) com Exit Code 0.
- [ ] Catraca de design lint (`node scripts/design-lint.mjs --ratchet`) aprovada com 0 violações P0/P1.
- [ ] Presets funcionais testados unitariamente no catálogo de estágios.
- [ ] Testes de regressão cobrindo cenários de todos os setores e nichos.
