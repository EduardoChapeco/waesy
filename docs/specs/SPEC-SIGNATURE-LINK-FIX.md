# SPEC-SIGNATURE-LINK-FIX — Vinculação Bidirecional de Assinatura e Rubrica na Equipe e Contratos

## 1. Contexto e Causa Raiz
Na tela `/workspace/configuracoes/equipe`, o card `SavedSignatureSettingsCard` e a listagem `Membros Ativos` apresentavam três falhas acopladas:
1. **Desacoplamento entre Rubrica (`saved_initials_url`) e Assinatura (`saved_signature_url`)**: Quando o usuário desenhava sua assinatura no quadro de Rubrica (cujo botão interno de `DigitalSignatureCanvas` exibia o rótulo fixo `"Salvar Assinatura"`), o BFF `saveUserSignatureAndInitials` gravava apenas `saved_initials_url` e deixava `saved_signature_url` nulo. Como resultado, o cabeçalho exibia `"Não cadastrada"` e a linha do membro em `Membros Ativos` exibia `"Sem Assinatura Digital"`, mesmo com o traço visível em tela.
2. **Contraste de Tinta em Dark Mode no `DigitalSignatureCanvas`**: O canvas utilizava `ctx.strokeStyle = "currentColor"` sobre `bg-card`, gerando traço branco (`#fafafa`) quando desenhado no tema escuro, tornando a imagem PNG invisível ao ser renderizada sobre a folha branca de contrato (`TOKEN_HEX.white`).
3. **Sincronização Tardia na Lista de Equipe**: `WorkspaceTeamPage` dependia exclusivamente do loader SSR (`listTeamSignatureStatuses` filtrando `is_active = true`) sem propagar imediatamente o perfil carregado por `SavedSignatureSettingsCard` para a tabela `Membros Ativos`.

## 2. Requisitos EARS
- **WHEN** o usuário salvar uma rubrica (`initialsImageBase64`) e ainda não possuir `saved_signature_url` cadastrada no perfil (ou vice-versa), **THE SYSTEM SHALL** espelhar automaticamente a imagem para o campo complementar vazio no perfil, garantindo vinculação imediata em 1 toque.
- **WHILE** o perfil do usuário ou membro da equipe possuir `saved_signature_url` ou `saved_initials_url` preenchido, **THE SYSTEM SHALL** resolver `hasSavedSignature = true` e `savedSignature = saved_signature_url || saved_initials_url` em `getUserSignatureProfile` e `listTeamSignatureStatuses`.
- **WHERE** o componente `DigitalSignatureCanvas` for exibido (em tema claro ou escuro), **THE SYSTEM SHALL** isolar a superfície do canvas como papel claro (`TOKEN_HEX.white`) e utilizar tinta escura documental (`TOKEN_HEX.slate900`), exibindo rótulo contextual de salvamento (`saveLabel`).
- **WHEN** `SavedSignatureSettingsCard` carregar ou atualizar a assinatura/rubrica do usuário logado, **THE SYSTEM SHALL** notificar imediatamente `WorkspaceTeamPage` para atualizar o selo `"Assinatura Digital Salva"` na linha correspondente de `Membros Ativos`.

## 3. Escopo Atômico
- `src/services/contracts-vault.functions.ts`
- `src/components/workspace/DigitalSignatureCanvas.tsx`
- `src/components/contracts/saved-signature-settings.tsx`
- `src/routes/workspace.configuracoes.equipe.tsx`
- `src/services/contracts-vault-lifecycle.test.ts`
