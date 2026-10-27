# Resumo de Remediação Arquitetural — Sistema Viaja

A auditoria e remediação do banco de dados e do código local foram concluídas com sucesso. O sistema transitou de um estado desincronizado (banco de dados incompatível com o código local) para a infraestrutura canônica esperada pelo PRD.

## 1. Migrações e Schema do Banco de Dados
Aplicamos 6 blocos de migrações em ordem de dependência para estabilizar a infraestrutura de dados no ambiente de produção:

1. **Orgs & Profiles**: Criação da tabela `organizations`, sistema de papéis (`user_roles`) e patch na tabela `profiles` conectando usuários à sua organização. 
2. **Core Domain**: Instanciação das tabelas `clients`, `travel_groups`, `travelers`, `quotations` (com campos expandidos de IA) e `hotels_bank`.
3. **Mapeamento Relacional**: Criação das sub-tabelas associadas a `quotations`: `flights`, passagens (segmentos e amenidades), `itinerary_days`, `quote_hotels`, `quote_transfers` e `quote_experiences`.
4. **Módulos Adicionais**: Tabelas para `trips`, quadros `kanban`, `destination_guides` (usando o esquema flat correto esperado pelo frontend) e `ai_keys_pool`.
5. **Storage & Notificações**: Configuração de buckets (`quotation-files`, `hotel-photos`, etc.), notificações via sistema e mapeamento de viagens (`trip_flights`, checklists).
6. **Políticas de RLS Finalizadas**: Aplicação de segurança baseada em linhas para todas as tabelas recursivas usando o padrão `org_id`, impedindo o vazamento de dados entre os inquilinos (agências) do sistema. O acesso anônimo agora está estritamente condicionado aos tokens públicos (`public_token`) sem expiração passada.

## 2. Refatoração de Código (Frontend)
Três patches diretos foram aplicados no repositório para estancar falhas de renderização e estado:

*   **QueryClient (App.tsx):** 
    O `staleTime` global de consultas locais foi rebaixado de `Infinity` para `2 minutos`. As flags `refetchOnWindowFocus`, `refetchOnReconnect` e `refetchOnMount` foram reativadas. Isso garante que as listagens se atualizem quando ocorrem edições (como a mudança de colunas de um cartão Kanban) ou quando vários agentes operam na plataforma ao mesmo tempo.
*   **PublicQuotation.tsx:**
    A query de `select` da RLS do Supabase foi atualizada para puxar integralmente `quote_experiences`. O array estático de passeios (`excursions: []`) foi substituído pelo mapeamento dinâmico ordenado de `row.quote_experiences`.
*   **PublicGuide.tsx:**
    O widget de previsão do tempo hardcoded (`28°C`) foi refatorado. O bloco agora tem uma condicional para renderizar as informações estritamente a partir do banco de dados (`guide.climate_info`), evitando a exibição de falsos positivos.

## 3. Extrator de PDFs por IA (Edge Function)
A função Deno Serverless do Supabase (`extract-quotation`) foi atualizada nas linhas base:

*   **Persistência de Transfers**: Antes o loop de `transfers` extraído do PDF não possuía rotina DML. Adicionada camada que itera pelo vetor extraído do modelo local e persiste na entidade relacional `quote_transfers`.
*   **Campos Expandidos de Cancelamento e PAX**: As features exclusivas do detalhamento da operadora (Id da operadora, regras de cancelamento, detalhamento de taxa) agora fluem do JSONB para colunas formalizadas na raiz do card em `quotations`. A função foi re-implantada no ambiente de Cloud.

## Próximos Passos Recomendados
1.  **Testes de Interface (E2E):** Execute o ambiente localmente (`npm run dev`) e gere uma nova cotação por IA para comprovar o end-to-end (banco atualizado, relacional funcionando e tela renderizando transfer).
2.  **Autenticação**: Registre-se via painel com o login para visualizar o setup automático do `profiles` acionando as Triggers criadas.
