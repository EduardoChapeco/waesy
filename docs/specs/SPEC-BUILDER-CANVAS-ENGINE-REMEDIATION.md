# SPEC-BUILDER-CANVAS-ENGINE-REMEDIATION — Reengenharia e Refinamento de Builders, Canvas e Exportadores (html2canvas / jsPDF / Story / Ficha 360)

## 0. Metadados e Controle
- **ID da Spec:** SPEC-CANVAS-BUILDER-001
- **Título:** Reengenharia de Resolução Nativa e Exportação de Builders, Canvas, Stories e Ficha 360°
- **Autor / Agente Responsável:** spec-writer
- **Data de Aprovação:** 2026-10-24
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Erradicar renderizações em escala miniaturizada, cortes cegos de páginas em PDFs e desconexões visuais em todos os builders, geradores de storys, propostas turísticas e fichas 360° do projeto, elevando os motores ao padrão industrial open-source de alta fidelidade (Polotno/Canva/jsPDF paginado).
- **Escopo Incluído:**
  1. `src/lib/pdf-export.ts`: Neutralização do `transform: scale` no alvo antes da captura, suporte a clonagem de alta resolução (1080x1920 nativo para Stories e 794x1123/A4 nativo), e paginação inteligente baseada em nós DOM `.pdf-page`/`.pdf-section` para evitar corte cego de textos e imagens.
  2. `src/components/tourism/studio/studio-frame.tsx`: Desacoplamento da escala de zoom do elemento alvo de exportação (o id de captura opera em coordenadas virtuais 1:1, enquanto o container de palco aplica o zoom visual).
  3. `src/routes/workspace.marketing.studio.tsx`: Elevação do container de preview/export de 300px para o padrão nativo Full HD (1080x1920 Stories / 1080x1080 Feed / 1920x1080 Paisagem) utilizando proporções tipográficas balanceadas e integração direta com a biblioteca canônica de templates sociais (`social-templates`).
  4. `src/components/studio/studio-canvas.tsx`: Conexão real entre os dados de projeto recebidos via props (`elements`, `aspectRatio`, `background`) e o motor de desenho do canvas, eliminando estado estático mockado.
  5. `src/components/tourism/vouchers/templates/template-voucher-story.tsx`: Atualização para a proporção nativa de 1080x1920 com tipografia escalada e remoção de classes arbitrárias com colchetes.
  6. `src/components/dossier/customer-360-printable-dossier.tsx`: Criação de componente canônico de Ficha 360° A4 pronta para impressão e exportação PDF sem ruído de UI.
  7. `src/routes/workspace.clientes.$id.tsx`: Adição de ação de exportação de Ficha 360° / Dossiê em PDF de alta qualidade.
- **Não-Objetivos:**
  - Não alterar regras de negócio do gateway de pagamento ou RLS de banco.
  - Não adicionar novas dependências pesadas externas no package.json (utilizar os pacotes já homologados: `html2canvas` e `jspdf`).

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo:** O sistema DEVE renderizar todos os modelos de Story na resolução base de 1080 × 1920 px e documentos A4 na resolução base de 794 × 1123 px (ou mm correspondente), aplicando transformações de escala exclusivamente na moldura visual do viewport (`stage`).
- **Acionado por Evento:** QUANDO o usuário solicitar a exportação de uma imagem PNG ou documento PDF, o motor `pdf-export.ts` DEVE neutralizar qualquer `transform: scale` ativo no elemento alvo antes de acionar o `html2canvas`, gerando arquivos na resolução nominal integral sem perda de nitidez.
- **Acionado por Evento:** QUANDO um documento possuir múltiplos blocos ou páginas (`.pdf-page` ou `.pdf-section`), o motor de PDF DEVE adicionar novas páginas de forma estruturada (`pdf.addPage()`), impedindo o fatiamento de linhas de texto, cards ou fotos na junção de páginas.
- **Orientado a Estado:** ENQUANTO o usuário estiver editando no Studio de Marketing (`workspace.marketing.studio.tsx`), a interface DEVE exibir a pré-visualização proporcional aos templates de alta fidelidade e atualizar todos os textos e lâminas de carrossel de forma reativa.
- **Opcional:** ONDE a Ficha 360° de um cliente for consultada em `workspace.clientes.$id.tsx`, o sistema DEVE disponibilizar botão proeminente de "Exportar Dossiê 360° (PDF)" que monta a folha A4 canônica do cliente.
- **Exceção:** SE uma imagem remota falhar por bloqueio de CORS ou rede durante a exportação, ENTÃO o sanitizador de imagem DEVE substituir a imagem por container com gradiente neutro preservando a integridade da renderização sem interromper a geração do PDF.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] Estado de Dados (Data/Success) especificado para cada template e visualizador.
- [x] Estado de Carregamento (Loading/Skeleton) com preservação de aspect-ratio contra CLS.
- [x] Estado Vazio (Empty) com layout honesto sem imagens sintéticas de estoque.
- [x] Estado de Erro (Error) com feedback visual claro via toast e tratamento gracioso.
- [x] Touch Targets >= 44x44px (`h-11`) em todos os botões de controle e exportação.
- [x] Contraste >= 4.5:1 (texto) e >= 3.0:1 (controles) em todos os templates.
- [x] Anéis de foco `:focus-visible:ring-2` em todos os elementos interativos.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| :--- | :--- | :--- |
| `src/lib/pdf-export.ts` | Modificar | Implementação do isolamento de escala, multi-página inteligente e anti-blur |
| `src/components/tourism/studio/studio-frame.tsx` | Modificar | Desacoplamento de `transform: scale` do container de exportação |
| `src/routes/workspace.marketing.studio.tsx` | Modificar | Atualização para template nativo 1080x1920 com tipografia escalada e anti-jank |
| `src/components/studio/studio-canvas.tsx` | Modificar | Conexão real de props com camadas dinâmicas e exportação em alta resolução |
| `src/components/tourism/vouchers/templates/template-voucher-story.tsx` | Modificar | Proporções canônicas de Story (1080x1920) e remoção de valores arbitrários |
| `src/components/dossier/customer-360-printable-dossier.tsx` | Criar | Dossiê A4 estruturado do cliente para impressão e PDF limpo |
| `src/routes/workspace.clientes.$id.tsx` | Modificar | Inclusão do trigger de exportação de Dossiê 360° do cliente |
| `docs/design/DECISIONS.md` | Modificar | Registro normativo de arquitetura de builders e canvas |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. Execução limpa do Design Lint (`node scripts/design-lint.mjs --ratchet`) com 0 novas violações P0/P1.
2. Suíte de testes do Design Lint com 45/45 aprovações.
3. Resolução dos problemas de exportação com fontes nítidas e ausência de elementos miniaturizados.
4. Registro de encerramento em `docs/design/DECISIONS.md`.
