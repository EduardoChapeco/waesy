# MATCH SCORE MODEL — MODELO MATEMÁTICO DE PONTUAÇÃO E DECOMPOSIÇÃO
## Fórmulas Algébricas, Pesos, Penalidades e Critérios de Aceite
**Data:** 2026-10-21  
**Módulo:** Turismo / Excelência Tour  

---

### 1. Tabela de Dimensões e Pesos Canônicos

A pontuação é composta pela soma ponderada de 5 dimensões independentes, somando no máximo **100 pontos**:

| Dimensão | Peso Máximo | Critério de Avaliação |
| :--- | :---: | :--- |
| **1. Destino** | **35 pts** | Compatibilidade geográfica, cidade, país ou região temática. |
| **2. Orçamento & Parcela** | **25 pts** | Encaixe no teto total e no valor da parcela mensal desejada. |
| **3. Temporalidade & Datas** | **20 pts** | Coincidência de datas exatas, mês alvo ou temporada. |
| **4. Composição Familiar** | **10 pts** | Capacidade de acomodação para adultos e crianças com idades corretas. |
| **5. Inclusões Desejadas** | **10 pts** | Presença de itens mandatórios (All Inclusive, Aéreo, Transfer, Passeios). |

---

### 2. Regras Algébricas Detalhadas por Dimensão

#### Dimensão 1: Destino (Máximo 35 pts)
- **Correspondência Exata de Cidade / Destino:** `+35 pts`  
  (Ex: Interesse pede "Punta Cana" e a oferta é no resort em "Punta Cana").
- **Correspondência Regional / Correlata:** `+25 pts`  
  (Ex: Interesse pede "Caribe" e a oferta é "Cancún" ou "Aruba").
- **Correspondência Categórica / Temática:** `+15 pts`  
  (Ex: Interesse pede "resort de praia com tudo incluído" e a oferta é em "Porto de Galinhas").
- **Sem Correspondência:** `0 pts`.

#### Dimensão 2: Orçamento & Parcela Mensal (Máximo 25 pts)
No mercado brasileiro, o valor da **parcela mensal** é frequentemente mais determinante do que o preço total. O motor avalia ambos:
- **Oferta Abaixo ou Igual ao Teto Desejado:** `+25 pts`.
- **Oferta até 10% Acima do Teto:** `+18 pts` (Margem viável com negociação).
- **Oferta entre 11% e 20% Acima do Teto:** `+10 pts` (Margem de estiramento tolerável).
- **Oferta mais de 20% Acima do Teto:** `0 pts`.
- *Bonificação por Parcelamento Flexível:* Se a oferta oferecer 10x ou 12x sem juros encaixando na parcela do passageiro, adiciona prioridade na recomendação.

#### Dimensão 3: Datas & Flexibilidade (Máximo 20 pts)
- **Datas Exatas Coincidentes (`exact_dates`):** `+20 pts`.
- **Mês Alvo Coincidente (`specific_month`):** `+18 pts`.
- **Temporada Compatível (`specific_season`):** `+12 pts`.
- **Interesse Totalmente Flexível (`flexible_anytime`):** `+15 pts` (Aceita qualquer época boa).
- **Fora da Janela Solicitada:** `0 pts`.

#### Dimensão 4: Composição de Grupo / Família (Máximo 10 pts)
- **Capacidade Exata de Acomodação (Adultos + Crianças):** `+10 pts`.
- **Acomodação Compatível com Ajuste de Cama / CHD Free:** `+7 pts`.
- **Incompatível (Ex: Quarto Single para Família de 4):** `0 pts`.

#### Dimensão 5: Inclusões Críticas (Máximo 10 pts)
- **Todas as Inclusões Solicitadas Presentes:** `+10 pts`.
- **Ao Menos 70% das Inclusões Presentes:** `+6 pts`.
- **Ausência de Inclusão Crítica Mandatória:** `0 pts`.

---

### 3. Classificação de Prioridade e Ação

- **Score >= 80 (Alta Prioridade / Match Quente):**
  - Card exibido em destaque com badge verde esmeralda "Alta Compatibilidade".
  - Notificação direta ao agente responsável.
  - Abordagem imediata recomendada via WhatsApp.
- **Score entre 60 e 79 (Match Viável / Alternativa):**
  - Card exibido no Radar Comercial como opção alternativa para consulta.
- **Score < 60 (Descarte Silencioso):**
  - Não polui a tela do corretor. Permanece em silêncio no banco até surgir oferta melhor.
