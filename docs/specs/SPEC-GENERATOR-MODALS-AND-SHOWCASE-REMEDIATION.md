# SPEC-GENERATOR-MODALS-AND-SHOWCASE-REMEDIATION — Remediação de Modais Geradores, QR Code Soberano e Showcase Editorial

## 1. Contexto e Motivação
A auditoria determinística revelou débitos estruturais críticos em geradores de documentos e vitrines editoriais:
1. **Vazamento e Dependência Externa de QR Code:** `curriculo-generator-modal.tsx` realizava requisições externas para `api.qrserver.com`, quebrando em ambientes offline, gerando risco de privacidade e causando falhas de CORS na renderização para canvas/PDF.
2. **Motores de Exportação Fragmentados:** Chamadas manuais a `html2canvas` e `jsPDF` sem neutralização de transformações de zoom e sem suporte a quebras multipáginas naturais.
3. **58 Violações em `curriculo-generator-modal.tsx`:** Uso de classes com colchetes arbitrários (`w-[95vw]`, `h-[92vh]`, `max-w-[680px]`, `min-h-[960px]`, `text-[8px]`), sombras decorativas pesadas e alvos de toque inferiores a 44px.
4. **96 Violações em `editorial-showcase-view.tsx`:** Padrões fora da grade de 4px, caractere literal de seta `➔`, grades sem prefixos responsivos e 24 ausências de `:focus-visible` (P0).

## 2. Requisitos em Sintaxe EARS

- **EARS-01 (QR Code 100% Offline Soberano):**
  - *WHEN* o usuário habilitar o QR Code no currículo ou documento digital,
  - *THE SYSTEM SHALL* gerar o QR Code vetorial localmente via `@/lib/qr-code` (`generateQrCodeDataUri`), com zero requisições HTTP a serviços de terceiros.

- **EARS-02 (Unificação do Motor de Exportação com `pdf-export.ts`):**
  - *WHEN* o usuário acionar o download do currículo em PDF ou imagem (A4 ou Story),
  - *THE SYSTEM SHALL* invocar `exportElementAsPdf` ou `exportElementAsImage`, aproveitando a neutralização automática de escala e renderização cristalina.

- **EARS-03 (Erradicação de Classes Arbitrárias e Piso Tátil de 44px em `curriculo-generator-modal.tsx`):**
  - *WHEN* o modal de geração de currículo for renderizado,
  - *THE SYSTEM SHALL* utilizar tokens semânticos (`a4-page`, `text-xs font-mono`, `max-w-4xl`), botões com altura mínima de 44px (`h-11 min-h-11`) e anéis de foco `:focus-visible:ring-2`.

- **EARS-04 (Saneamento Visual do Showcase Editorial `editorial-showcase-view.tsx`):**
  - *WHEN* anúncios ou pacotes forem exibidos no showcase editorial,
  - *THE SYSTEM SHALL* renderizar botões com affordance clara e piso de 44px, substituir caracteres de setas por Lucide `ArrowRight`, e estruturar mosaicos fotográficos com prefixos responsivos canônicos.

## 3. Critérios de Aceite
- [x] Zero requisições a `api.qrserver.com` no ecossistema de perfis e currículos.
- [x] Zero violações P0/P1 novas nos arquivos modificados.
- [x] Catraca mecânica de CI aprovada com redução do débito técnico visual global (`node scripts/design-lint.mjs --ratchet`).
- [x] Suíte normativa de testes aprovada com 45/45 (`node scripts/design-lint.test.mjs`).
