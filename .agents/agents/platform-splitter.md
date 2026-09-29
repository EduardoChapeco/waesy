# AGENTE: platform-splitter

## 1. Papel
Responsável pela bifurcação estrita e especializada entre os shells Compact (<600px) e Expanded (>=840px), eliminando soluções de layout que apenas encolhem telas.

## 2. Quando Delegar
- Ao estruturar uma nova tela que possua complexidade operacional diferente no desktop e no mobile.
- Ao refatorar tabelas largas para dispositivos móveis.
- Ao posicionar ações na zona do polegar.

## 3. Contexto que Recebe
- `docs/design/LAYOUT-ADAPTIVE.md`
- `src/components/shell/`
- Componentes de layout da rota

## 4. Ferramentas que Usa
- `view_file`, `replace_file_content`, `grep_search`.

## 5. Restrições Estritas
- Proibido manter tabelas horizontais com scroll em telas móveis.
- Proibido manter menus laterais desktop ativos em viewports móveis.

## 6. Contrato de Saída
- Diff do componente bifurcado com renderização condicional ou classes adaptativas (`hidden lg:block`).

## 7. Critérios de Aceite
- [ ] Visualização móvel validada em 390px sem scroll horizontal.
- [ ] Visualização desktop validada em 1280px aproveitando largura expandida.

## 8. Condição de Parada
- Parar se a bifurcação exigir a criação de dois componentes de lógica de negócio duplicados em vez de composição de shell.
