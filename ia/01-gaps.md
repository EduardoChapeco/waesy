# Matriz de Lacunas e Auditoria de Gaps de IA — Waesy (PROMPT 01)

## 1. Visão Geral
Este documento apresenta a Matriz de Lacunas atualizada do ecossistema Waesy, comparando as capacidades esperadas de um sistema operacional de comércio e serviços locais com a infraestrutura atualmente implementada.

---

## 2. FASE D — Matriz de Lacunas (Capacidade Esperada × Implementação)

| Capacidade Esperada pelo Produto | Status | Módulo Implementado | Observações e Resolução |
| :--- | :--- | :--- | :--- |
| **Porta Única Universal de IA** | EXISTE | `src/services/ai-core-gateway.functions.ts` | 10 tarefas do enum `aiTaskTypeEnum` com Circuit Breaker e FinOps (6 decimais). Resolvido no Prompt 27. |
| **Biblioteca de Prompts com Versionamento** | EXISTE | `src/services/ai-master-prompts.functions.ts` | 12 templates com SemVer, validação Zod e cascata Tenant -> System -> Builtin. Resolvido no Prompt 26. |
| **Benchmark Contínuo e Rubricas Ancoradas** | EXISTE | `src/services/ai-quality-benchmark.functions.ts` | 8 rubricas com âncoras 0 a 5, dataset de 20 casos reais e gate de CI. Resolvido no Prompt 28. |
| **Memória em 5 Camadas e LGPD** | EXISTE | `src/services/ai-memory-curation.functions.ts` | Camadas `session`, `user`, `brand`, `niche`, `product` com direito ao esquecimento. Resolvido no Prompt 24. |
| **Composição Unificada de Builders** | EXISTE | `src/services/ai-builder-composition.functions.ts` | Sites, biolinks, docs, slides 16:9 e social cards 1200x630 com rubrica >= 80. Resolvido no Prompt 25. |
| **Runtime de Skills, Agentes e Squads** | EXISTE | `src/services/ai-skills-router.functions.ts` | 10 skills canônicas, 7 agentes, 3 squads com grafo de handoff e veto de custo. Resolvido no Prompt 23. |
| **Chat como Aplicativo Transacional** | EXISTE | `src/services/chat-commerce.functions.ts` | Compra, agendamento, orçamento e rastreio in-stream com idempotência SHA-256. Resolvido no Prompt 22. |
| **Conversational Shell AI-First** | EXISTE | `src/components/chat/ai-chat-shell.tsx` | Trilha de raciocínio, artefatos desacoplados e painel de contexto. Resolvido no Prompt 21. |
| **Módulos Verticais com IA Setorial** | EXISTE | `src/services/vertical-ai-modules.functions.ts` | Verticais Fiscal, RH, Jurídico e Financeiro com vocabulário técnico. Resolvido no Prompt 11. |
| **Forense e Anti-Fraude em Devoluções** | EXISTE | `src/services/rma.functions.ts` | Perícia visual de fotos de avaria e classificação de dano. Resolvido no Prompt 19. |
| **Superfície de Ferramentas WebMCP** | EXISTE | `src/services/mcp-server.functions.ts` | Protocolo WebMCP com ferramentas declarativas para agentes externos. Resolvido no Prompt 19. |
| **OCR Fiscal e Conciliação de DANFE** | EXISTE | `src/services/multimodal-ocr.functions.ts` | Extração de chaves NF-e, emitentes e valores para faturamento. |
| **Extração de Vouchers e Viagens** | EXISTE | `src/services/travel-ai-extractor.functions.ts` | Processamento de bilhetes e manifestos de embarque de passageiros. |
| **SDR e Qualificação Autônoma de Leads** | EXISTE | `src/services/ai-sdr.functions.ts` | Qualificação e cadência conversacional comercial de ponta a ponta. |
| **Curadoria Editorial e Mineração Local** | EXISTE | `src/services/mining/editorial-squad.ts` | Extração de notícias de portais locais com pontuação de qualidade. |
| **Transcrição e Síntese de Voz (Áudio)** | PARCIAL | `src/services/ai-core-gateway.functions.ts` | Suporte à tarefa de OCR/áudio mapeada no enum, com processamento via modelos multimodais, porém sem componente de gravação de voz contínuo na UI. |
| **Geração de Vídeo e Movimento** | PARCIAL | `src/services/ai-core-gateway.functions.ts` | Rota para modelos de vídeo declarada no Gateway, aguardando ativação de credenciais de provedores especializados (Runway/Luma). |

---

## 3. Os 5 Achados de Maior Score no Ledger

| ID | Prompt | Tipo | Causa Raiz | Correção Aplicada | Score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I-0028** | 27 | `ai-core-gateway-and-key-pool` | Chamadas de IA fragmentadas sem porta única e sem Circuit Breaker | Porta Única consolidada para 10 tarefas, Circuit Breaker, FinOps por token e Prompt Shield | **50** |
| **I-0029** | 28 | `ai-continuous-quality-benchmark` | Avaliação de IA subjetiva sem rubricas ancoradas 0 a 5 e sem dataset de referência | Implantadas 8 rubricas universais ancoradas 0 a 5, dataset de 20 casos e gate executável de CI | **50** |
| **I-0030** | 31 | `native-asset-deduplication` | Scanner óptico e comanda KDS dispersos em quarentena sem tokens canônicos | Nativização de BarcodeScannerModal e KDSOrderCard com 100% tokens, `:focus-visible` e testes verdes | **50** |
| **I-0027** | 26 | `ai-master-prompts-library` | Prompts soltos em strings sem versionamento SemVer e sem cascata | Biblioteca de Prompts centralizada com SemVer, validação Zod e cascata Tenant -> System -> Builtin | **48** |
| **I-0026** | 25 | `ai-builders-and-composition` | Produtores de interface dispersos e risco de LLM inventar HTML | Motor unificado de composição servindo 5 arquétipos, rubrica de 5 dimensões e exportação fiel | **45** |

---

## 4. Próxima Ação
Avançar imediatamente para o **Plano #5 (PROMPT 02: Núcleo de IA — Porta Única, Pool de Chaves e Resiliência)**, consolidando a ponte entre os serviços legados residuais (`ai.functions.ts` e `api-orchestrator.functions.ts`) e o novo motor `ai-core-gateway.functions.ts` certificado no DEC-042.
