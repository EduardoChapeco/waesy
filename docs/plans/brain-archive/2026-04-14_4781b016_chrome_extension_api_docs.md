# Turis Agências - Documentação Backend para a Extensão Chrome

Este documento contém todas as informações de API, Endpoints e Webooks necessários para desenvolver a interface e os Service Workers da extensão Chrome do **Turis Agências**. Forneça este documento integralmente ao Claude ou ao seu ambiente de desenvolvimento.

---

## 1. Autenticação

A extensão atuará em nome do consultor logado, utilizando um Token JWT proveniente da sessão do usuário. A URL do painel Web onde a extensão deve sondar os cookies/sessions é o domínio real do seu app (ex: `app.turisagencias.com` / `localhost:8080`).

Para todas as chamadas HTTP (POST) para as nossas **Edge Functions**, o cabeçalho base será:
```javascript
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${ACCESS_TOKEN_DA_SESSÃO_WEB}`
};
```

---

## 2. Ingestor de Operadoras e Scrapers (Endpoint Automático)

Para capturar reservas copiadas de telas de sistemas operacionais (Orinter, E-Trip, CVC, Rextur, etc) e transformá-las em "Viagens" prontas no CRM (inclusive criando clientes se necessário):

**Endpoint:** `POST https://xhdoupxnpjbzkzuhucpp.supabase.co/functions/v1/extension-sync`

**Action:** `create_scraped_trip`

**Exemplo de Payload (JS):**
```javascript
// Payload enviado quando o V-Squad Scraper na página lê os dados de um voucher/reserva
const payload = {
  action: "create_scraped_trip",
  data: {
    client_name: "João Silva",      // Extraído da Operadora
    client_email: "joao@email.com", // Se existir, nós tentaremos dar match com cliente na base!
    title: "Pacote Lua de Mel Cancun",
    supplier: "Orinter", 
    value: 12500.00
  }
};

fetch('https://xhdoupxnpjbzkzuhucpp.supabase.co/functions/v1/extension-sync', {
  method: 'POST', headers, body: JSON.stringify(payload)
})
```
**O que acontece no Servidor?**
1. Valida o JWT.
2. Descobre a Organização do atendente.
3. Cria o Cliente (se e-mail for novo).
4. Cria uma `Viagem` ("Pacote Lua de Mel Cancun").
5. Abre imediatamente um Card no **Módulo de Embarques** para lembrete de Check-in!

---

## 3. Ingestão de Quick Tasks (Tarefas Rápidas)

Se o agente está navegando no WhatsApp Web e lembra que precisa resolver um aéreo pendente ou cotar algo rapidamente:

**Endpoint:** `POST https://xhdoupxnpjbzkzuhucpp.supabase.co/functions/v1/extension-sync`

**Action:** `quick_task`

**Exemplo de Payload (JS):**
```javascript
const payload = {
  action: "quick_task",
  data: {
    title: "Cotar Marriott para o casal Ribeiro",
    description: "Pediram 3 noites front-sea com meia pensão via Copastur",
    task_type: "cotar", // Valores: 'cotar', 'ligar', 'reembolso', 'cancelamento', 'geral'
    priority: "Alta" // 'Alta' | 'Normal' | 'Baixa'
  }
};

// ... Fetch IDêntico
```
**O que acontece no Servidor?**
Cria um Card de Kanban na aba de "Minhas Tarefas" do Web App vinculado a este atendente, para que ele veja na hora que abrir o laptop.

---

## 4. Manipulação Avançada no Banco de Dados (Supabase REST API)

Caso a extensão precise de dados dinâmicos *diretamente* do Postgresql sem intermédio (Ex: Carregar lista de Clientes ou Autocomplete de Viagens na tela de e-mail), utilize a porta direta do [Supabase REST API](https://supabase.com/docs/guides/api):

**Base URL:** `https://xhdoupxnpjbzkzuhucpp.supabase.co/rest/v1`

**Atenção aos Headers Extras obrigatórios no Supabase puro:**
Em requisições diretas ao Postgres (não edge-functions), além de `Authorization: Bearer <TOKEN>`, é obrigatório o `apikey: <SUA_SUPABASE_ANON_KEY>`.
- *A RLS (Row Level Security) já está habilitada no banco. O usuário da extensão (devido ao seu token gerado) só retornará automaticamente dados da sua Organização*.

### Exemplos Rest p/ Autocomplete:
**Buscar Clientes por nome (GET):**
`GET /rest/v1/clients?select=id,name,email&name=ilike.*joão*&limit=10`

**Buscar Viagens Recentes p/ Dropdown (GET):**
`GET /rest/v1/trips?select=id,title,status&order=created_at.desc&limit=15`

---

## 5. Integração com Webhook de Emails

*Nota: Esse endpoint foi desenvolvido pensando prioritariamente em ser acionado por um serviço como Zapier/Make atrelado aos aliases do Gmail. Contudo, se a extensão injetar botões dentro da DOM do Gmail do próprio navegador, você pode usar nossa API para enviar o texto raw!*

**Endpoint:** `POST https://xhdoupxnpjbzkzuhucpp.supabase.co/functions/v1/email-webhook-ingest`

*(Essa função utiliza Chave Global Administrativa no lado Backend, mas valida requisições contendo)*:
```json
{
  "org_id": "cole-uuid-da-org-conhecida-pela-extensao",
  "subject": "Fwd: Voo Gol Confirmado H8S5XQ",
  "body_text": "...",
  "from_email": "atendimento@gol.com",
  "thread_id": "opcional-identificador-do-gmail"
}
```
**Automágica**: Somente enviar esse Payload cru causará Análise por Inteligência Artificial (Extração de PNRs e Abertura preditiva de Chamados urgentes).

---
**Instruções Finais para o Claude:** "Construa o *Service Worker* principal e gere um *Content Script* engajante com Tailwind. Confie na ingestão e nos IDs retornados pela `extension-sync`. Todos os middlewares e restrições já estão programadas e validadas no núcleo."
