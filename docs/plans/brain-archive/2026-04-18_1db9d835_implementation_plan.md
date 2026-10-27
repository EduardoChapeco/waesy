# Refatoração Master: Nomenclaturas, Fluxo de Trabalho (Sidebar) e Ingestão de E-mails com IA

Esta especificação define um passo massivo na transição do sistema de uma ferramenta "Tech-Heavy" para um "Enterprise ERP/CRM Comercial e Elegante". O plano responde às três preocupações centrais: Nomenclatura corporativa, organização por fluxo de vida diária do agente e o maquinário para ler e auto-gerenciar Gmail via IA.

## Proposed Changes

### 1. UI Linter Agent: O Fim dos Termos "Techies"
Tudo o que se assemelha a "Prompt", "Agent 7", "Radar", "Cofre" perderá força visual em favor de uma nomenclatura limpa, corporativa e madura.

#### [MODIFY] `src/pages/RadarPortal.tsx` & `App.tsx`
- Renomearemos (refactoring total) o nome e as referências de "RadarPortal" para **"Portal de Notícias"** ou **"Blog de Atualizações"**.
- Os botões no Dashboard: ao invés de "Forçar Varredura Crawler", teremos **"Atualizar Portal"** ou **"Sincronizar"**.
- O "Cofre de Inteligência" (se ainda existir resíduo nos Insights) vira **"Business Intelligence"** ou **"Central de Insights"**.

### 2. Sidebar Flow-Based: Um dia na vida da Agência
O menu lateral hoje está agrupando módulos de forma técnica (ex: tudo que é CRUD está de um lado). Vamos reorganizar o `src/components/AppSidebar.tsx` por **Fluxo de Operação Diário**.

#### [MODIFY] `src/components/AppSidebar.tsx`
Novo agrupamento proposto:
1. **Início da Jornada (Start)**
   - Dashboard (Início)
   - Portal de Notícias 
   - Caixa de Entrada (E-mails & Tickets) - *Ponto focal de contato*.
2. **Conversão & Vendas (Sales)**
   - Kanban de Negociações (CRM)
   - Cotações (Construtor)
   - Carteira de Clientes
3. **Execução Operacional (Ops)**
   - Kanban de Tarefas (A fazer hoje)
   - Controle de Embarques
   - Minhas Viagens (Individuais e Grupos)
   - Roteiros
4. **Inteligência Comercial (Intel)**
   - Guias Mapeados
   - Portfólio de Hotéis
   - Destinos e Passeios
5. **Backoffice & Financeiro (Back**
   - Transações Financeiras (A Receber / A Pagar)
   - Fornecedores
   - Gestão da Equipe & Regras Corporativas

### 3. Integração Inteligente com Gmail / Ingestão
Você perguntou sobre a diferença de abordagens (IMAP/POP vs Webhooks/API).
> [!IMPORTANT]
> **O IMAP/POP está obsoleto** para arquiteturas de IAs autônomas em nuvem. Ele exige um servidor 24 horas "escutando" e gasta processamento inútil. Em sistemas Serverless (Supabase/Edge Functions) a abordagem ideal e infinitamente mais poderosa é a modalidade **Push/Webhooks ou Gmail API**.

Vou implementar o pilar dessa arquitetura:

#### [MODIFY] `supabase/functions/email-webhook-ingest/index.ts`
Transformaremos a função de ingestão básica (que você já possuía a estrutura) no **Inbox AI Classifier**.
- **O que a Edge Function fará:** Toda vez que um E-mail chegar (acionado via Webhook por um GSuite Pub/Sub ou serviço equivalente Inbound), a função acordará imediatamente.
- **Triage (OpenAI):** O motor de IA lerá o corpo do e-mail:
   - Se a IA identificar que o cliente está **"pedindo orçamento"**: A função gera instantaneamente um lead no CRM (`kanban_cards`) e linka o rastreio na tabela `email_messages`.
   - Se a IA prever uma **"reclamação ou atraso de aéreo"**: Ela abre um Chamado Crítico (`tickets` urgente) e alerta com push notification.
   - Se a IA identificar **"mudança ou solicitação burocrática"**: Cria uma tarefa simples delegando ao Agente na aba `Tarefas do Dia`.
- A função salvará um "Rascunho de Resposta" humanizado no banco de dados (`ai_draft_response`) para tornar a resposta pelo corretor da agência 1-click.

### 4. Integração da Extensão V5 (WhatsApp & Gmail Híbrido)
Avaliando o diretório `C:\Users\Eduardo Antônio Ramo\Downloads\turisagencias-v5.1-auditada\v5`, a extensão já faz um excelente trabalho híbrido.

#### [MODIFY] `v5/src/content/whatsapp.js` & `extension-sync`
- **Agente Copiloto WhatsApp:** Modificaremos/validaremos a extensão para atuar de fato como um "Agente Real" flutuante. Ao abrir o WhatsApp de um cliente, o painel se conectará via `extension-sync` e exibirá automaticamente a Cotação em Andamento, os Voos e um prompt de resposta sugerida (IA do GMail + WA unificados).
- **Hibridização do GMail:** Usaremos o `src/content/gmail.js` (que já detecta labels VOUCHER/FLIGHT_CHANGE) para disparar as IAs através do Edge Function antes mesmo do corretor ler a mensagem inteira.

## Open Questions

Para eu começar as modificações precisarei que confira a lista:

> [!CAUTION]
> 1. A nova organização "Flow-Based" do Menu (acima) faz total sentido lógico pra quem chega na agência às 08h da manhã? Posso padronizá-la?
> 2. Posso varrer e substituir todas as menções "Geek / Radar / Crawler" nas partes de visualização do site por nomenclaturas limpas como "Portal", "Sincronizar Atualizações", "Gestão de Insights"?
> 3. Sobre a extensão local no seu PC (`v5.1`), vou empacotar as atualizações necessárias nela. Devo considerar que, em vez de exigir que seus funcionários reencaminhem e-mails pelo Gmail ou usem serviços caros, **toda sua inteligência de e-mail e whatsapp vai rodar invisível na máquina que instalar a extensão**?

## Verification Plan

### Manual Verification
- Renderizar a UI localmente e inspecionar se a barra lateral agora conta uma "história lógica de trabalho" de cima para baixo.
- Revisar `Portal de Notíciais` para garantir que o tom de voz mudou de programador de IAs para B2B Comercial Premium.
- Disparar a Edge Function `email-webhook-ingest` via mock curl ou console, atirando um "E-mail Falso simulando um cliente pedindo cotação de Lua de Mel" para verificar se a IA cria o CRM Lead automaticamente sem interferência humana.
