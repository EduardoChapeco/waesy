# Onda 11 — Catálogo de Engines e Bibliotecas Mecânicas

## 1. Filosofia Operacional: Mecânico antes de IA
O Waesy prioriza a execução determinística em todas as etapas em que regras lógicas, parsers estruturados ou bibliotecas matemáticas possam resolver a demanda sem consumo de tokens de inteligência artificial.

---

## 2. Inventário de Engines e Bibliotecas

| Engine / Biblioteca | Versão | Domínio | Uso Canônico no Sistema | Desempenho / Resiliência |
| :--- | :---: | :--- | :--- | :--- |
| **`html2canvas`** | `1.4.1` | Renderização Visual | Conversão de DOM em imagem para criação de posts e banners sociais | Renderização client-side com isolamento de fontes |
| **`jspdf`** | `4.2.1` | Documentos & Impressão | Geração de PDFs de contratos de viagem, recibos e relatórios | Formatação vetorial rápida sem depender de browser externo |
| **`react-markdown`**| `10.1.0`| Documentos & Notícias | Parser seguro de Markdown para renderização de notícias e artefatos | Sanitização nativa contra scripts e XSS |
| **`maplibre-gl`** | `6.3.0` | Geo & Mobilidade | Visualização de mapas urbanos, estabelecimentos e rotas de entrega | GPU-accelerated WebGL com tiles OpenStreetMap livres |
| **`recharts`** | `2.15.4`| Gráficos & BI | Dashboards de faturamento, telemetria de crawlers e métricas | SVG responsivo com animações suaves |
| **`zod`** | `3.24.2`| Validação Estrita | Schemas invioláveis de BFF, APIs, inputs e contratos de dados | Validação determinística em tempo de compilação e runtime |
| **`framer-motion`** | `13.4.0`| Física & Movimento | Micro-interações, gavetas Vaul e transições com física de mola | Suporte automático a `prefers-reduced-motion` |
| **`libphonenumber-js`**| `1.13.10`| Telecom | Normalização E.164 de telefones para links e webhooks de WhatsApp | Validação rigorosa de DDDs e operadoras brasileiras |
| **`date-fns`** | `4.1.0` | Tempo & Calendário | Manipulação de datas, fusos horários e janelas de agendamento | Funções puras sem mutação de estado |
| **`canvas-confetti`**| `1.9.4` | Feedback Positivo | Efeito de celebração após conclusão de checkout ou publicação | Zero overhead de renderização |

---

## 3. Motores Mecânicos Próprios do Waesy (`src/services/mining/`)

| Motor | Tipo | Invariante M01 | Capacidade |
| :--- | :--- | :---: | :--- |
| **`mechanical-extractor.ts`** | Parser HTML | Validado | Limpeza de DOM, remoção de scripts/CSS, extração de título e Markdown |
| **`integrity-gate.ts`** | Validador de Qualidade | Validado | Cálculo de densidade textual, contagem de parágrafos e validação de imagem |
| **`semantic-deduplicator.ts`**| Algoritmo Jaccard | Validado | Tokenização, remoção de stopwords e similaridade de n-gramas em janela de 48h |
| **`crawler-circuit-breaker.ts`**| Resiliência | Validado | Máquina de estados (CLOSED/OPEN/HALF_OPEN) por domínio para evitar bloqueios |
| **`url-canonicalizer.ts`** | Normalizador | Validado | Canonicalização de URLs, eliminação de UTMs e hash de deduplicação |
