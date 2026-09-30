# Documentos, PDF e Apresentações: Templates por Nicho com Fidelidade (Prompt 08)

## 1. Princípio do Dado Estruturado
O documento é armazenado como árvore de dados estruturados (JSON Schema), não como HTML solto ou binário opaco. O PDF e a visualização em tela são projeções determinísticas da mesma árvore.

## 2. Modelagem Canônica
- `doc_templates`: Modelo base por nicho e finalidade (contrato, proposta, laudo, relatório).
- `documents`: Instância com campos preenchidos, vínculos de tenant e status (`rascunho`, `aprovado`, `assinado`, `arquivado`).
- `document_sections`: Seções modulares (capa, cláusulas, tabela de valores, assinaturas digitais).
- `exports`: Registro de renderização com hash criptográfico SHA-256 e manifesto de integridade.

## 3. Catálogo de Documentos por Nicho

| Nicho | Documento Canônico | Elementos Obrigatórios | Validade Jurídica |
| :--- | :--- | :--- | :--- |
| **Turismo** | Contrato de Viagem & Voucher | Dados do passageiro, saídas, bagagem, cancelamento | ICP-Brasil / MP 2.200-2 |
| **Jurídico** | Procuração & Contrato de Honorários | Qualificação das partes, poderes, tabela de custas | Assinatura Eletrônica Avançada |
| **Comércio** | Proposta Comercial & Orçamento | Itens do catálogo, prazos, formas de pagamento, garantia | Código de Defesa do Consumidor |
| **Imobiliário** | Laudo de Vistoria & Contrato de Locação | Fotos de vistoria, metragem, fiador, encargos | Lei do Inquilinato (8.245/91) |
| **Serviços** | Ordem de Serviço & Recibo | Diagnóstico, peças, mão de obra, termo de entrega | Recibo Fiscal e Garantia |

## 4. Garantia de Fidelidade de Exportação
- Tipografia unificada com fontes embutidas (Inter, Roboto).
- Prevenção de quebra de linha em cabeçalhos e tabelas (`break-inside-avoid`).
- Numeração de páginas e rodapés gerados automaticamente na borda de impressão.
