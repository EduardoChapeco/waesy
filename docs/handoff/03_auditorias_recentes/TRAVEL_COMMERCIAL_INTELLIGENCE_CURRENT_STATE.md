# TRAVEL COMMERCIAL INTELLIGENCE — ESTADO ATUAL & DIAGNÓSTICO (AS-IS)
## Auditoria Canônica do Submódulo de Inteligência Comercial e Memória de Oportunidades
**Data:** 2026-10-21  
**Domínio:** Turismo, Viagens & Lazer — Excelência Tour / Waesy  
**Status:** Auditado e Especificado  

---

### 1. Diagnóstico do Problema Operacional Real

Na operação diária de uma agência de turismo emissiva e receptiva, centenas de passageiros entram em contato todos os meses demonstrando interesse em viagens futuras:
1. Um passageiro pergunta sobre Punta Cana para as férias escolares de julho, mas os voos estão caros no momento e ele decide não fechar imediatamente.
2. Três meses depois, a operadora (CVC, ViagensPromo ou Orinter) lança um bloqueio aéreo fretado com hotel All-Inclusive em Punta Cana com 40% de desconto.
3. **O problema:** O corretor/agente não se lembra mais daquele contato específico de três meses atrás. A oportunidade evapora e o passageiro compra em outra agência ou não viaja.
4. **O erro clássico de software:** Forçar o cadastro completo de todo curioso como "Lead Formal" ou "Cliente Cadastrado" polui o CRM (`leads_crm`), gera kanbans inchados com milhares de cards frios, destrói métricas de conversão e gera trabalho burocrático inútil.

---

### 2. Mapa do Estado Atual do Repositório (As-Is)

| Componente / Tabela | Papel Atual | Limitação Identificada |
| :--- | :--- | :--- |
| `public.travel_quotes` | Registro pontual de cotação solicitada no site. | Isolado; relação 1:1 com uma cotação estática; não monitora ofertas que chegam semanas depois. |
| `public.leads_crm` | Gestão de negociação ativa e fechamento. | Alto custo cognitivo; polui pipeline com contatos frios ou intenções de longo prazo (12 meses). |
| `public.classifieds` | Vitrine pública de pacotes e ofertas (`excelencia_offer`). | Desconectado do backlog de viajantes que queriam aquele exato destino. |
| `public.travel_document_ingestions` | Extração OCR/IA de lâminas e PDFs de operadoras. | Gera pacotes e propostas, mas não alerta automaticamente os clientes que queriam aquelas datas. |
| `src/lib/travel/excelencia-offer-engine.ts` | Motor de parsing e normalização de ofertas. | Pronto para integração, gerando snapshots de preços e parcelamentos. |
| `src/lib/travel/travel-commercial-intelligence.ts` | Motor determinístico de matching e pontuação. | Implementado na camada de lib pura; precisa de persistência, BFF Server Functions e UI dedicada. |

---

### 3. As Quatro Invariantes Fundamentais do Submódulo

1. **Invariante 1 — Isto NÃO é um Segundo CRM:**
   - O backlog comercial é uma *memória de intenções leves*, não um funil de vendas ativo.
   - Um contato só é promovido a `leads_crm` quando manifesta interesse real em avançar após a abordagem da oportunidade.

2. **Invariante 2 — Zero Poluição de Base Cadastral:**
   - Contatos importados ou capturados por formulário rápido de intenção permanecem na tabela de pré-CRM `travel_commercial_contacts`.
   - Nenhuma linha é inserida em `customers` ou `profiles` sem transação financeira ou consentimento explícito.

3. **Invariante 3 — Matching Determinístico Primeiro (Token Economy):**
   - É terminantemente proibido enviar listas inteiras de contatos para LLM comparar com ofertas.
   - O matching é executado algebricamente (SQL + TypeScript) em 5 dimensões (Destino, Orçamento, Datas, Composição Familiar, Inclusões), atingindo score 0..100.
   - LLM é acionada estritamente para estruturar intenções complexas em texto livre e gerar copy de abordagem personalizado para WhatsApp.

4. **Invariante 4 — Suporte Obrigatório a Multi-Interesse (1:N):**
   - Um mesmo passageiro (`CommercialContact`) pode ter múltiplos interesses ativos simultaneamente (ex.: "Punta Cana em Julho/2026 com a família" e "Mendoza em Maio/2026 em casal").
   - Cada interesse possui ciclo de vida e monitoramento independente.
