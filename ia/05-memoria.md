# Memória, Curadoria de Dados e Tom de Voz por Usuário e Marca (Prompt 05)

## 1. As 5 Camadas Canônicas de Memória

| Camada | Escopo | Volatilidade | Quem Grava | Quem Lê | Expiração |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sessão** | Conversa ativa | Volátil | Cliente/Servidor | Orquestrador | 2 horas de inatividade |
| **Usuário** | Preferências, histórico | Persistente | Ações do usuário | Agentes de atendimento | A pedido / GDPR |
| **Marca / Loja** | Identidade, catálogo | Persistente | Lojista / Admin | Agentes de vendas/marketing | Atualização explícita |
| **Nicho** | Vocabulário, regras | Canônica | Seed do sistema | Todos os agentes do nicho | Permanente |
| **Produto** | Conteúdo curado | Validado | Curadoria editorial | Agentes de síntese | Por versão de catálogo |

## 2. Extração, Recuperação e Citação de Origem
- **Busca Híbrida**: Combinação de busca relacional (PostgreSQL `pg_trgm`) com embeddings semânticos (`pgvector`).
- **Isolamento RLS Obrigatório**: Toda consulta de memória aplica cláusula restritiva `store_id = current_store_id()` ou `user_id = auth.uid()`.
- **Citação Interna**: Respostas geradas por IA referenciam os registros internos utilizados (ex: `[Fonte: Catálogo #4812 - Horários de Atendimento]`).

## 3. Configuração de Tom de Voz
- **Parâmetros**:
  - `persona`: Profissional, acolhedor, conciso ou corporativo.
  - `formality_level`: 1 a 5.
  - `max_paragraph_length`: Máximo de 3 sentenças por bloco.
  - `forbidden_words`: Lista de termos proibidos (ex: jargões vazios, emojis em contextos formais).
