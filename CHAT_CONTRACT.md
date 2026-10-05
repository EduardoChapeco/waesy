# CHAT_CONTRACT.md — Contrato Canônico de Conversação do Sistema

> Documento Raiz Normativo de Integração do Chat de IA  
> Versão: 2.0.0  
> Status: ATIVO & AUDITADO

## 1. Regra Fundamental
O chat não é um formulário decorativo nem um gerador de texto desgovernado. É um **Loop de Execução de Capacidades** orquestrado por máquina de estados determinística.

## 2. Máquina de Estados (13 Estados Oficiais)
`RECEIVED` -> `UNDERSTANDING` -> `NEEDS_CLARIFICATION` -> `PLANNED` -> `WAITING_APPROVAL` -> `RUNNING` -> `WAITING_TOOL` -> `PARTIAL_RESULT` -> `VALIDATING` -> `COMPLETED` | `FAILED_RETRYABLE` | `FAILED_FINAL` | `CANCELLED`.

## 3. Diretrizes de Resposta
1. Fato vs. Inferência: O chat deve citar explicitamente fontes oficiais de dados (ex: "Fonte: Diário Oficial / PNCP edital 12/2026").
2. Zero Mocks: Proibido inventar dados ou simular transações sem conexão real com a camada de infraestrutura.
3. Resiliência: Se uma ferramenta falhar, preserve o histórico e apresente a alternativa ou botão de retentativa.
4. Artefatos Vivos: Respostas volumosas devem ser sintetizadas em tabelas interativas, planilhas ou blocos visuais, não em blocos quilométricos de texto puro.
