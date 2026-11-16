# SPEC-20261115-CONTRACTS-E2E — Ecossistema Completo de Contratos, Cofre de Pastas, Upload PDF/DOCX/MD, Posicionamento Real & Assinatura de Equipe

**Status:** Aprovada para Execucao (Fase Contratos E2E)
**Data:** 2026-11-15
**Modulo:** `workspace/contratos/*`, `assinar/$token`, `verify/document/$code`, `conta/perfil`, `conta/colaborador`, `workspace/configuracoes/equipe`

## 1. Contexto & Problemas Diagnosticados
1. **Enviesamento de Nicho para Turismo:** `workspace.contratos.novo.tsx`, `ContractVariablePicker` e `ContractEditorSheet` exibem por padrao abas, minutas e pastas ficticias voltadas a Turismo (`"Turismo & Excursoes"`, `"Turismo 2026"`, `"Propostas de Viagem"`) mesmo em lojas de Delivery, Gastronomia, Varejo ou Servicos.
2. **Upload de Documentos Simulado & Canvas Falso:** O upload de arquivos apenas aciona OCR sem preservar nem renderizar o arquivo real (`PDF`, `DOCX`, `MD`, `TXT`) no editor. `SignaturePositionerCanvas` renderiza barras cinzas falsas em vez do documento real e declara `cursor-move` sem manipuladores de arraste e redimensionamento de ponteiro.
3. **Pastas Hardcoded & Falha de Ciclo de Vida:** `workspace.contratos.$id.editor.tsx` usa pastas ficticias em vez da tabela `public.folders`. O painel `/workspace/contratos` filtra `status === "signed"` ignorando contratos com status canonico `"completed"`, nao exibe quem visualizou (`viewed_at`), quem assinou e quem falta assinar, e carece de cobranca/reenvio, cancelamento e download de PDF/Certificado.
4. **Assinatura Rapida do Emissor & Colaboradores:** Falta fluxo imediato apos emitir contrato convidando o criador logado a assinar com 1 toque usando `profiles.saved_signature_url`, alem de gerenciamento da assinatura digital no perfil do usuario, portal do colaborador e configuracoes da equipe.
5. **Layout do Editor Fora do Padrao Workspace:** O editor atual sofre com sobreposicao de sidebars e caixas empilhadas, em vez de operar full-bleed dentro da `WorkspaceShell` (Coluna 1 fina de pilares + Coluna 2 contextual do editor de contratos + Canvas A4 ao vivo / viewer de documento).

## 2. Requisitos Funcionais em Sintaxe EARS

- **EARS-C1 (Shell Full-Bleed Dual-Column do Editor):**
  When the user navigates to `/workspace/contratos/novo` or `/workspace/contratos/$id/editor`, the `WorkspaceShell` SHALL collapse its default navigation drawer (`setIsSubSidebarOpen(false)`) and apply full-bleed viewport framing (`p-0 h-full overflow-hidden`) on desktop (`>= 840px`), preserving Column 1 (thin primary rail) and letting `ContractWorkspaceStudio` render its contextual Column 2 tool/signer/folder panel adjacent to the live A4 document canvas. On compact/mobile viewports (`< 840px`), the studio SHALL provide accessible 44px-tall mode tabs switching cleanly between editor controls, live document canvas, and signers/dispatch without card-in-card nesting or horizontal overflow.

- **EARS-C2 (Upload Real PDF/DOCX/MD/TXT & Visualizacao Fiel):**
  When the user selects or drops a `.pdf`, `.docx`, `.md`, or `.txt` file (up to 20 MB), the system SHALL upload the original binary to private bucket `legal-documents` (`<store_id>/contracts/...`), store its storage path (`source_file_url`), file name (`source_file_name`), MIME type (`source_file_mime`), and detected `page_count`, extract structured text/markdown locally for `.docx` / `.md` / `.txt` (and PDF page count detection without external dependencies), render the real uploaded document pages (or native PDF iframe `#page=N` + transparent interactive overlay) directly inside `SignaturePositionerCanvas`, and generate fresh 1-hour `sourceFileSignedUrl` values server-side on `getContractById` and `getEnvelopeByToken`.

- **EARS-C3 (Editor Estilo Word, Clausulas & Posicionamento Real por Arraste):**
  While composing in Clause/Word mode or viewing an uploaded file, the system SHALL offer a clean typography/formatting bar (`H1`, `H2`, `Negrito`, `Italico`, `Lista`, `Tabela`), editable clauses list synchronized with live A4 preview, real pointer drag-and-drop and corner-resize handlers (`onPointerDown` / `onPointerMove` / `onPointerUp`) with clamped percentage coordinates (`0..100%`) and keyboard nudge accessibility on every placed field (`signature`, `initials`, `name`, `cpf`, `date`).

- **EARS-C4 (Isolamento Semantico por Nicho da Loja):**
  While loading `/workspace/contratos/novo`, `/workspace/contratos/$id/editor`, or `ContractVariablePicker`, the system SHALL resolve the active store niche via `getNicheContractBlueprint(store)` and prioritize templates, CRM import sources, and semantic variable groups matching that niche. Unrelated niche tabs (such as `"Turismo & Excursoes"` for non-tourism tenants) SHALL remain hidden by default unless the user activates an explicit filter toggle.

- **EARS-C5 (Cofre de Pastas Real, Telemetria de Envelopes & Acoes Completas):**
  When listing, creating, renaming, moving, reminding, cancelling, or exporting contracts, all folder operations SHALL persist in tenant-scoped `public.folders`. The dashboard and editor SHALL treat `status IN ('signed', 'completed')` uniformly, stamp `signature_envelopes.viewed_at` and transition `'pending' -> 'viewed'` + append a `'VIEWED'` entry in `contract_audit_chain` when a signer opens `/assinar/$token` (without altering `'signed'` envelopes), expose per-signer tracking (`Assinado`, `Visualizado`, `Pendente`, `Recusado`, `Expirado`, `reminder_count`), allow authorized staff to resend/remind via WhatsApp outbox/share link (`resendContractEnvelope`), cancel non-completed contracts (`cancelContract`), and download/print both the Signed Document (with embedded signature stamps) and the Audit Certificate (`ContractAuditManifest`).

- **EARS-C6 (Assinatura Salva do Colaborador & Assinatura Imediata do Criador):**
  When a staff creator seals/issues a contract that includes them (or chooses "Incluir-me como signatario"), the system SHALL immediately offer a 1-click quick-sign modal preloaded with `profiles.saved_signature_url` (or `SignatureCanvasPad` with save-to-profile option). Additionally, `_store.conta.perfil`, `_store.conta.colaborador`, `workspace.configuracoes.equipe`, and `workspace.contratos.index` SHALL embed `<SavedSignatureSettingsCard />` so users and employees can register or update their digital signature in one place and see signature readiness across the team.

## 3. Invariantes de Seguranca & Banco de Dados
1. Todas as RPCs atomicas P0 existentes (`seal_and_issue_contract`, `finalize_contract_signature`, `promote_contract_after_signatures`) e fronteiras verificadas em `contracts-*-security.test.ts` permanecem estritamente intactas (nenhum afrouxamento de RLS ou vazamento de `dispatch_settings`/`observers` nas projections publicas).
2. A tabela `contract_audit_chain` passa a validar isolamento via `workspace_members` alem de `profiles`.
3. O bucket privado `legal-documents` aceita `application/pdf`, `.docx`, `.doc`, `.md`, `.txt` e imagens ate 20 MB com leitura via URL assinada gerada apenas apos checagem de acesso BFF.
4. Proibido inventar dados simulados, datas ou hashes em documentos sem selo criptografico real.

## 4. Escopo de Arquivos Autorizados
- `supabase/migrations/20270518000000_contracts_vault_events_and_upload.sql`
- `src/integrations/supabase/types.ts`
- `src/lib/contracts/document-file-parser.ts` (novo)
- `src/lib/contracts/document-file-parser.test.ts` (novo)
- `src/lib/contracts/contract-pdf-download.ts` (novo)
- `src/services/contracts-vault.functions.ts` (novo)
- `src/services/contracts-vault-lifecycle.test.ts` (novo)
- `src/services/contracts.functions.ts`
- `src/services/storage.functions.ts`
- `src/components/contracts/contract-variable-picker.tsx`
- `src/components/contracts/signature-positioner-canvas.tsx`
- `src/components/contracts/saved-signature-settings.tsx` (novo)
- `src/components/contracts/contract-workspace-studio.tsx` (novo)
- `src/components/office/contract-editor-sheet.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/routes/workspace.contratos.index.tsx`
- `src/routes/workspace.contratos.novo.tsx`
- `src/routes/workspace.contratos.$id.editor.tsx`
- `src/routes/assinar.$token.tsx`
- `src/routes/verify.document.$code.tsx`
- `src/routes/_store.conta.perfil.tsx`
- `src/routes/_store.conta.colaborador.tsx`
- `src/routes/workspace.configuracoes.equipe.tsx`

## 5. Criterios de Aceite & Evidencia Esperada
- `npm.cmd run typecheck` com Exit Code 0.
- Todos os testes `src/services/contracts*.test.ts`, `src/lib/contracts/*.test.ts` e suite completa Vitest aprovados sem falhas/skips.
- `node scripts/design-lint.mjs --ratchet`, `npm.cmd run audit:buttons`, `npm.cmd run check:bff`, `npm.cmd run check:schema` e `npx.cmd eslint --quiet .` aprovados sem novas violacoes P0/P1.
- `npm.cmd run build` e `npm.cmd run check:route-budget` com Exit Code 0.
- Registro `DEC-504` em `docs/design/DECISIONS.md`.
