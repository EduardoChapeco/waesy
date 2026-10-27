# Documentação do Sistema VoyageOS

O VoyageOS é uma plataforma de gestão (ERP/CRM) de alta performance para agências de viagens, projetada para automatizar o ciclo de vida completo de uma viagem, desde o primeiro lead até o pós-venda. O sistema utiliza uma arquitetura AI-First, com extração de dados por visão computacional e agentes inteligentes.

## 1. Arquitetura Técnica

- **Frontend**: React 18 com Vite, TypeScript e Tailwind CSS.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **IA**: Edge Functions (Deno) integrando com Gemini 2.5 Flash, OpenRouter e OpenAI.
- **Segurança**: Row Level Security (RLS) rigoroso por `org_id` (Multi-tenancy).

---

## 2. Módulos e Funcionalidades

### 2.1 CRM e Leads
- **Leads**: Captura e gestão de potenciais clientes.
- **Clientes**: Cadastro completo de passageiros com histórico de viagens, documentos e tags.
- **Portal do Viajante**: Área restrita para o cliente final consultar roteiros e vouchers.

### 2.2 Gestão de Cotações (IA)
- **Extração Vision**: Upload de PDFs ou fotos de operadoras (Orinter, CVC, etc.) para extração automática de dados.
- **Persistência**: Geração automática de orçamentos com voos, hotéis e serviços.
- **Página Pública**: Link gerado para o cliente visualizar a proposta em formato premium.

### 2.3 Kanban de Operações
- **Vendas**: Funil de conversão de cotações em viagens.
- **Embarques**: Gestão de clientes que estão viajando ou prestes a embarcar.
- **Tarefas**: Task board interno da agência.

### 2.4 Itinerários e Roteiros
- **Builder**: Criação de roteiros dia-a-dia com integração de mapas e pontos de interesse.
- **Catálogo**: Banco de hotéis, atividades e destinos pré-cadastrados.

### 2.5 Financeiro e Billing
- **Contas**: Gestão de pagamentos, parcelamentos e comissões.
- **Transações**: Registro de fluxo de caixa da agência.

---

## 3. Fluxos Principais

1. **Ciclo de Venda**: Lead -> Cotação (IA) -> Proposta Pública -> Fechamento -> Viagem.
2. **Pós-Extração**: O sistema lê a cotação, popula o banco e gera um texto otimizado para WhatsApp.

## 4. Estrutura de Tabelas (Principais)

- `organizations`: Dados da agência.
- `quotations`: Cabeçalho do orçamento.
- `flights`: Trechos aéreos extraídos ou manuais.
- `trips`: Viagens confirmadas (vendas).
- `itineraries`: Roteiro estruturado.
- `ai_keys_pool`: Gerenciamento de chaves de IA (Round-robin).
