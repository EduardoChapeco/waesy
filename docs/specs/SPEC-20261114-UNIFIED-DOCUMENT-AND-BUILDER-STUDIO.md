# SPEC-20261114-UNIFIED-DOCUMENT-AND-BUILDER-STUDIO

- **Data:** 2026-11-14
- **Status:** Aprovada para Execução
- **Escopo:** Unificação do Ecossistema de Editores, Studios e Exportação Multi-Formato de Documentos (`Unified Document & Builder Studio`)

## 1. Diagnóstico & Problema
1. No CRM Kanban e Dossiê do Atendimento (`src/components/tourism/crm/TourismPipeCardDossier.tsx`), a geração de documentos abria dois modais desconexos:
   - `Gerador de Documentos e Modelos A4`: lista estática reduzida a 4 modelos genéricos;
   - `Visualizador & Editor Timbrado`: diálogo estreito exibindo Markdown bruto em `<Textarea>`, tags manuais soltas, marca hardcoded (`WAESY TRAVEL SUITE` / `Waesy Agência de Viagens`), rodapé recortado e ausência de preview WYSIWYG em tempo real, painel CMS, adaptação contextual por arquétipo e exportação multi-formato.
2. O fluxo de Apresentação Comercial no Dossiê também abria um modal isolado em vez do Studio interativo em largura integral.
3. Editores irmãos no Workspace (`CommercialBudgetPadSheet.tsx`, `ContractEditorSheet.tsx`) operavam com alternância modal (editar OU visualizar) sem painel split-pane em tempo real nem exportação multi-formato compartilhada (`PDF A4`, `PNG`, `HTML`, `Word .doc`, `Markdown`, `Impressão`).

## 2. Requisitos Normativos em Sintaxe EARS

- **[EARS-1] Studio Split-Pane Full-Viewport Unificado:**
  Quando o usuário acionar geração ou edição de documento no Dossiê CRM, Orçamentos ou Contratos, o sistema deve abrir um Studio in-page em tela cheia com painel lateral esquerdo CMS (`StudioSidebar` colapsável no mobile via tabs `Editor CMS` | `Visualização`) e palco central ao vivo (`StudioFrame`) atualizado em tempo real sem alternância cega.

- **[EARS-2] Adaptação Contextual por Arquétipo & Nicho:**
  Ao selecionar ou abrir um arquétipo no Studio (`proposal_quote`, `contract_legal`, `voucher_boarding`, `presentation_deck`, `dossier_form_doc`), o Studio deve adaptar automaticamente seus campos avançados estruturados, galeria de templates (`PROPOSAL_TEMPLATES`, `ADVANCED_CONTRACT_TEMPLATES`, `COMMERCIAL_DOCUMENT_TEMPLATES`, modelos de anamnese/embarque/relatório/recibo e `41 módulos` de apresentação) e ações contextuais de promoção para os Builders nativos (`ProposalStudio`, `VoucherStudio`, `/workspace/contratos/$id/editor`, `OmniEditor`).

- **[EARS-3] Identidade & Marca Tenant em Tempo Real (Zero Hardcode):**
  Sempre que qualquer Studio ou template gerar documento, o cabeçalho, rodapé, logo, cores primárias/superfície e dados cadastrais devem ser hidratados automaticamente a partir da loja autenticada (`getStoreSettings` / `useAgency`) com controles CMS em tempo real (cor de superfície, cor de marca, preset tipográfico, exibição de logo/assinatura/QR Code e formato de papel `a4-portrait`, `a4-landscape`, `presentation-169`, `story-916`, `letter-portrait`), eliminando strings fixas de marca (`WAESY TRAVEL SUITE` / `Waesy Agência de Viagens`).

- **[EARS-4] Exportação Multi-Formato Canônica & Compartilhável:**
  Todo Studio documental (`UniversalDocumentStudio`, `ProposalStudio`, `VoucherStudio`, `PreBoardingPresentationStudio`, `CommercialBudgetPadSheet`, `ContractEditorSheet`) deve prover exportação compartilhada sem duplicação para:
  1. `PDF` (A4 / Multipágina via `.a4-page` / `.presentation-page` via `pdf-export.ts`);
  2. `PNG` em alta resolução (`exportElementAsImage`);
  3. `HTML` autônomo estilizado (`.html`);
  4. `Word (.doc)` editável compatível com tabelas e cabeçalho institucional;
  5. `Markdown` estruturado GFM (`.md`);
  6. Impressão A4 nativa e envio/cópia de resumo ou link para WhatsApp.

- **[EARS-5] Conformidade Estrita Design Lint & WCAG 2.2 AA:**
  Todos os arquivos novos e editados devem manter zero violações P0/P1 no `scripts/design-lint.mjs --ratchet` (sem cores hex literais em TSX/styles fora de tokens, sem classes arbitrárias `[...]`, múltiplos de 4px, alvos >= 44px no mobile `h-11 min-h-11`, `focus-visible:ring-2`, safe-area `pt-safe-modal`/`pb-safe` e sem containeritis).

## 3. Escopo de Arquivos Autorizados
- `src/lib/documents/document-export.ts` (novo — motor cliente unificado HTML/Word/Markdown/PDF/PNG)
- `src/lib/documents/document-studio-catalog.ts` (novo — catálogo contextual multi-nicho & compilador estruturado de documentos)
- `src/components/documents/DocumentExportMenu.tsx` (novo — componente canônico de exportação multi-formato)
- `src/components/documents/UniversalDocumentStudio.tsx` (novo — Studio split-pane CMS + `StudioFrame` in-page)
- `src/components/tourism/crm/TourismPipeCardDossier.tsx` (substituição cirúrgica dos 3 modais desconexos pelo `UniversalDocumentStudio` contextual)
- `src/components/tourism/boarding/PreBoardingPresentationStudio.tsx` (integração de `DocumentExportMenu`, captura multipágina de slides e remoção de texto fixo de marca)
- `src/components/tourism/vouchers/templates/template-voucher-story.tsx` (hidratação real da marca da agência)
- `src/components/tourism/vouchers/VoucherStudio.tsx` (integração do menu multi-formato)
- `src/components/documents/CommercialBudgetPadSheet.tsx` (evolução para split-pane em tempo real + seletor de templates + `DocumentExportMenu`)
- `src/components/office/contract-editor-sheet.tsx` (evolução para split-pane em tempo real + `DocumentExportMenu`)
- `src/routes/workspace.turismo.propostas.$id.tsx` (acréscimo do `DocumentExportMenu` sem regressão dos CTAs existentes)
- `src/services/__tests__/unified-document-studio.test.ts` (novo — testes unitários e de contrato arquitetural)

## 4. Critérios de Verificação
1. `npx.cmd vitest run src/services/__tests__/unified-document-studio.test.ts src/services/__tests__/kanban-multiniche-and-pixel-e2e.test.ts src/services/__tests__/travel-proposal-crm-seller-autofill.test.ts`
2. `node scripts/design-lint.test.mjs` & `node scripts/design-lint.mjs --ratchet` (meta: `P0: 0, P1: 0, < 10s`)
3. `node scripts/contrast-audit.mjs`, `npm.cmd run check:tokens`, `npm.cmd run audit:buttons:test`, `npm.cmd run audit:buttons`
4. `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`
