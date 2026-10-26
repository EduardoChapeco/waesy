# SPEC-CANVAS-STUDIO-LIDOJS-ENGINE — Motor Profissional de Canvas & Camadas (LidoJS / OpenPolotno)

## 1. Contexto e Motivação
A análise e engenharia reversa de projetos líderes open-source de edição gráfica no GitHub (LidoJS, OpenPolotno, Fabric.js e Puck) demonstraram que builders visuais profissionais operam sob 4 pilares indispensáveis:
1. **Modelo de Camadas Tipado (Layer Tree):** Cada elemento possui identidade única, tipo semântico (`text`, `badge`, `qr`, `shape`), coordenadas virtuais normalizadas, rotação, opacidade e ordem Z.
2. **Manipulação Direta com Guias de Alinhamento (Smart Snap):** O usuário pode arrastar camadas interativamente com o cursor/toque, com guias visuais magnéticas centralizadas (eixo X e Y).
3. **Motor de Histórico Transacional (Undo / Redo):** Pilhas imutáveis `past`, `present` e `future` com atalhos de teclado e botões táteis no toolbar.
4. **Exportação de Alta Resolução Independente de Viewport:** O canvas virtual de 1080x1920 (Story), 1080x1080 (Feed) ou 1920x1080 (Landscape) é renderizado em resolução nativa na exportação, eliminando qualquer borrado de zoom de tela.

## 2. Requisitos em Sintaxe EARS

- **EARS-01 (Manipulação Direta de Camadas):**
  - *WHEN* o usuário interage via clique ou toque sobre uma camada no `StudioCanvas`,
  - *THE SYSTEM SHALL* selecioná-la, renderizar a moldura de seleção com marcadores visuais e permitir translação fluida (drag-and-drop) com atualização de coordenadas em tempo real.

- **EARS-02 (Snap Magnético e Guias Centrais):**
  - *WHEN* uma camada for arrastada para próximo do centro horizontal (50%) ou vertical (50%) da prancheta virtual,
  - *THE SYSTEM SHALL* exibir linhas guias pontilhadas de alinhamento e ancorar suavemente as coordenadas da camada.

- **EARS-03 (Pilha de Desfazer e Refazer - Undo/Redo):**
  - *WHEN* qualquer mutação for executada (adição, edição, exclusão, reordenação ou arraste de camada),
  - *THE SYSTEM SHALL* armazenar o snapshot na pilha de histórico, habilitando `canUndo` / `canRedo` no toolbar e suporte aos atalhos `Ctrl+Z` / `Ctrl+Y`.

- **EARS-04 (Gerenciamento de Profundidade Z-Index e Clonagem):**
  - *WHEN* uma camada estiver selecionada,
  - *THE SYSTEM SHALL* disponibilizar ações para "Trazer para Frente", "Enviar para Trás", "Centralizar na Tela", "Duplicar Camada" e "Excluir".

- **EARS-05 (Camada de QR Code Vetorial Soberana):**
  - *WHEN* o usuário solicitar a adição de QR Code no design,
  - *THE SYSTEM SHALL* gerar o QR Code vetorial localmente através do utilitário soberano `@/lib/qr-code` (`uqr`), sem requisições HTTP externas.

- **EARS-06 (Exportação Ultra HD Full-Fidelity):**
  - *WHEN* o usuário acionar a exportação ou envio ao Hero Banner,
  - *THE SYSTEM SHALL* rasterizar o layout em resolução nativa Full HD (1080x1920 / 1080x1080 / 1920x1080) com tipografia escalada e suavização bicúbica.

## 3. Critérios de Aceite
- [x] Zero dependências pesadas adicionadas ao `package.json`.
- [x] Controles interativos com piso canônico de 44px (`h-11 min-h-11`).
- [x] Suíte de testes normativos de design lint com 45/45 aprovados.
- [x] Zero regressões visuais na catraca mecânica de CI (`node scripts/design-lint.mjs --ratchet`).
