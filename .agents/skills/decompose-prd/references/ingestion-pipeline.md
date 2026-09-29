# Pipeline de Ingestão & Normalização de PRDs

Este documento especifica o pipeline técnico de extração e normalização de Documentos de Requisitos de Produto em qualquer formato.

## Formatos Suportados
1. **Markdown (.md / .markdown):**
   - Análise de AST via unified / remark.
   - Extração semântica de seções através da hierarquia de cabeçalhos (#, ##, ###).
2. **Texto Puro / Colado (Raw Text):**
   - Heurísticas de segmentação de texto por parágrafos duplos e numeração de listas.
3. **PDF (.pdf):**
   - Extração textual nativa via pdf-parse.
   - Detecção de documentos escaneados e fallback para OCR.
4. **DOCX (.docx):**
   - Conversão estruturada de parágrafos, tabelas e estilos para blocos semânticos.
5. **Notion Pages & Databases:**
   - Integração com Notion API / MCP para ler blocos de página e tabelas relacionais.
6. **HTML:**
   - Sanitização com Readability/Cheerio, preservando tabelas, listas e títulos semânticos.

## Schema Normalizado do PRD
Toda entrada é mapeada para a seguinte estrutura canônica:
```json
{
  "title": "Sistema de Split de Pagamentos Multi-Tenant",
  "sections": {
    "context": "Necessidade de liquidação em D+1 para lojistas...",
    "problemStatement": "Retenção manual gera atrasos e riscos fiscais...",
    "scope": "Split automático no momento da transação...",
    "nonFunctional": "Latência < 200ms, PCI-DSS compliance..."
  },
  "requirements": [
    { "id": "REQ-01", "text": "Calcular comissão de marketplace em integer cents", "section": "scope" }
  ],
  "metrics": ["Tempo de liquidação < 24h", "Taxa de erro de conciliação < 0.01%"],
  "constraints": {
    "technical": ["PostgreSQL 15+", "Supabase RLS", "Integer Cents BRL"],
    "temporal": ["Entrega em 2 sprints"],
    "budget": ["Zero custo adicional de infraestrutura"]
  },
  "timeline": {
    "milestones": ["M1: Contratos e Migrations", "M2: BFF", "M3: UI e Gestão"]
  },
  "stakeholders": ["Lojistas", "Consumidores", "Time Financeiro", "Admin Master"],
  "openQuestions": []
}
```
