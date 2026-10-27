# Refinamento e Potencialização da Extensão v5.1

Este plano abrange as melhorias solicitadas: criação de parsers dedicados para operadoras (Orinter, CVC, Flytour), evolução do painel lateral para um verdadeiro CRM 360º no WhatsApp, e preparação do ecossistema de automações (Browser Automation) focado na conexão real com a plataforma (sem mocks, com schemas e edge functions verdadeiras).

## User Review Required

> [!IMPORTANT]
> Precisarei de sua autorização para prosseguir com a criação dos parsers específicos e modificações no `manifest.json`.
>
> Além disso, se a extensão precisar gravar as migrations/functions relativas à automação (Browser Automation Jobs) no repositório da sua plataforma `plan-fect-harmony` que se encontra em outro ambiente, descreverei os scripts para que você os aplique no backend. Atuarei pesadamente na UI/Lógica local da extensão garantindo que o "CRM 360" do WhatsApp renderize tudo o que o seu schema atual do backend provê.

## Proposed Changes

### Content Scripts — Scrapers Dedicados
Para extrair "tudo o que der" (reservas vendidas, pacotes, clientes, financeiro) sem depender do scraper genérico:

#### [NEW] src/content/orinter-scraper.js
Substitui o parser genérico da Orinter. Identifica não apenas resultados da busca, mas telas de detalhe de reserva comprada, extraindo rooming list, CPF (quando visível) e integrando ao status correto no `ingest_operator_snapshot`.

#### [NEW] src/content/cvc-scraper.js
Específico para o DOM do portal B2B da CVC. Lê localizador, detalhe de passageiros e detalhes de serviço com extração de preços exatos.

#### [NEW] src/content/flytour-scraper.js
Específico para Flytour: extrai PNR, hóspedes e datas de voo, injetando o overlay nativo (igual ao que temos no Infotravel) com botões de integração ao CRM.

#### [MODIFY] manifest.json
- Remover as URLs específicas de Orinter, CVC e Flytour do `operator-scraper.js`.
- Incluir as rotas para cada um dos novos scripts (`orinter-scraper.js`, etc.).

#### [MODIFY] src/background/service-worker.js
- Atualizar `OPERATOR_URLS` para mapear os nomes corretos de parsers e notificar os scripts content adequados.
- Preparar integração a endpoints (ainda em expansão) de scraping avançado por Background job.

---

### Sidepanel (Painel Lateral via Chrome) — CRM 360º Real no WhatsApp

#### [MODIFY] src/sidepanel/sidepanel.html
- Garantir a presença sem simulações (sem dados "mock") para os componentes de **Passagens / Tickets**, **Documentos**, **Trips / Viagens** e **Caixa Financeiro** utilizando a base de design BentoGrid existente.
- Expandir a interface com abas de CRM Real para um painel rápido que agregue o perfil do passageiro, LTV (Life Time Value) que vem da plataforma e tarefas do "taskBoard" do Supabase.

#### [MODIFY] src/sidepanel/sidepanel.js
- Modificar os processadores do payload recebidos da `Supabase / Extension-Sync` para renderizar os dados financeiros (parcelas/pagamentos da viagem atual) e passageiros (travelers lists).
- Aperfeiçoar o vínculo: ao clicar num cliente no WhatsApp, bater no banco, baixar todo o snapshot de `trips` + tickets de aéreo e repassar à view limpa.

---

### Backend e Automação de Navegadores (Arquitetura)
Como pedido, "raspar tudo que der" de portais fechados com eficiência demanda automação sem headless.
Prepararei uma migration recomendada e uma função que você deve embarcar na sua plataforma `plan-fect-harmony`.

#### [Migration / Database] 
Sugiro uma tabela de Jobs assíncronos:
```sql
CREATE TABLE browser_automation_jobs (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references organizations(id),
    provider_name text not null,
    job_type varchar(50) not null,
    status varchar(30) default 'pending', -- pending, running, success, failed
    params jsonb,
    result_payload jsonb,
    requested_by_user uuid references auth.users(id),
    created_at timestamptz default now()
);
```
Isso permitirá disparar comandos de scrapping B2B complexos *a partir do clique na extensão*.

## Open Questions

1. **Testes do B2B Local:** Devo prosseguir criando a base visual/estrutural no Extrator (CVC/Fly/Orinter) injetando o DOM? 
2. Você pode autorizar o plano com a compreensão de que atuarei ativamente na **Extensão v5**? (Eu tenho acesso nativo a workspace local `turisagencias-v5...`).

## Verification Plan
1. Modificaremos a extensão no Workspace. 
2. Rodaremos testes dos parsers JS isolados.
3. Solicitar sua validação real (carregar a extensão `v5` no Chrome) via seu WhatsApp Web confirmando todo fluxo CRM 360.
