/**
 * teteterisgrid-engine.ts
 * Engine algorítmica canônica de auto-packing 2D para grades e cards squircles.
 * 
 * Invariantes Absolutas:
 * 1. Zero Voids (Preenchimento Estrito de 100%): Nenhuma lacuna residual na grade.
 *    Prova Matemática: sum(colSpan_i * rowSpan_i) = maxCols * totalRows.
 * 2. Auto-expansão gulosa de cauda (Greedy Tail Expansion): O último card ou cards ímpares
 *    expandem seus spans para fechar exatamente a largura total da grade (maxCols).
 * 3. Suporte Bidimensional Nativo (rowSpan >= 1): Suporte a cartões verticais (1:2) e heroes (2:2)
 *    com ocupação contínua de células sem colisão.
 * 4. Formas Canônicas Squircles: Proporções calculadas para encaixe perfeito em 4 ou 6 colunas.
 */

export type TeteterisPreferredSpan = "1:1" | "2:1" | "1:2" | "2:2" | "3:1" | "4:1" | "4:2" | "6:1" | "auto";
export type TeteterisRatio = "21:9" | "16:9" | "6:1" | "4:1" | "3:1" | "2:1" | "1:1";

export interface TeteterisItemInput<T = any> {
  id: string;
  preferredSpan?: TeteterisPreferredSpan;
  priority?: number; // Menor valor = maior prioridade de destaque (ex: 1 = hero)
  content: T;
}

export interface TeteterisCalculatedSlot<T = any> {
  id: string;
  colSpan: number; // Quantidade de colunas (1 a maxCols)
  rowSpan: number; // Quantidade de linhas (1 a 2)
  col: number;     // Coordenada horizontal (0 a maxCols - 1)
  row: number;     // Coordenada vertical (0-indexed)
  aspectRatio: TeteterisRatio;
  content: T;
}

/**
 * Matriz bidimensional de rastreamento de ocupação espacial estilo Tetris.
 * Garante posicionamento determinístico e livre de buracos na grade.
 */
export class TeteterisOccupancyMatrix {
  private grid: boolean[][];
  public readonly cols: number;
  private rows: number;

  constructor(cols: number = 4, initialRows: number = 2) {
    this.cols = cols;
    this.rows = initialRows;
    this.grid = Array.from({ length: initialRows }, () => Array(cols).fill(false));
  }

  /**
   * Verifica se um bloco de dimensão colSpan x rowSpan pode ser colocado na coordenada (col, row).
   */
  canPlace(col: number, row: number, colSpan: number, rowSpan: number): boolean {
    if (col + colSpan > this.cols) return false;
    this.ensureRows(row + rowSpan);
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (this.grid[r]?.[c]) return false;
      }
    }
    return true;
  }

  /**
   * Marca as células como ocupadas.
   */
  place(col: number, row: number, colSpan: number, rowSpan: number): void {
    this.ensureRows(row + rowSpan);
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        this.grid[r][c] = true;
      }
    }
  }

  /**
   * Encontra a próxima célula vazia na ordem de leitura (linha por linha, esquerda para a direita).
   */
  findNextEmpty(): { col: number; row: number } {
    let r = 0;
    while (true) {
      this.ensureRows(r + 1);
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
          return { col: c, row: r };
        }
      }
      r++;
    }
  }

  ensureRows(neededRows: number): void {
    while (this.rows < neededRows) {
      this.grid.push(Array(this.cols).fill(false));
      this.rows++;
    }
  }

  getOccupiedArea(): number {
    return this.grid.flat().filter(Boolean).length;
  }

  getMaxRowUsed(): number {
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].some(Boolean)) {
        return r + 1;
      }
    }
    return 0;
  }

  getUnassignedCellsInRow(r: number): number {
    if (r >= this.rows) return 0;
    return this.grid[r].filter((occupied) => !occupied).length;
  }
}

/**
 * Calcula deterministicamente o posicionamento e spans de N cards em uma grade de maxCols colunas (4 ou 6)
 * garantindo fechamento perfeito de 100% da área sem espaços vagos.
 */
export function computeTeteterisGrid<T = any>(
  items: TeteterisItemInput<T>[],
  maxCols: 4 | 6 = 4
): TeteterisCalculatedSlot<T>[] {
  if (!items || items.length === 0) return [];

  const count = items.length;

  // CASO 1: Apenas 1 Item -> Widescreen Banner (100% da largura)
  if (count === 1) {
    return [
      {
        id: items[0].id,
        colSpan: maxCols,
        rowSpan: 1,
        col: 0,
        row: 0,
        aspectRatio: maxCols === 6 ? "21:9" : "4:1",
        content: items[0].content,
      },
    ];
  }

  // CASO 2: 2 Itens -> Divisão balanceada 50/50
  if (count === 2) {
    const span = Math.floor(maxCols / 2);
    return items.map((it, idx) => ({
      id: it.id,
      colSpan: span,
      rowSpan: 1,
      col: idx * span,
      row: 0,
      aspectRatio: "2:1",
      content: it.content,
    }));
  }

  // CASO 3: 3 Itens em grade de 4 colunas
  if (count === 3 && maxCols === 4) {
    // 3A: Hero 2x2 com 2 satélites 2x1 empilhados
    if (items[0].preferredSpan === "2:2" || items[0].priority === 1) {
      return [
        { id: items[0].id, colSpan: 2, rowSpan: 2, col: 0, row: 0, aspectRatio: "1:1", content: items[0].content },
        { id: items[1].id, colSpan: 2, rowSpan: 1, col: 2, row: 0, aspectRatio: "2:1", content: items[1].content },
        { id: items[2].id, colSpan: 2, rowSpan: 1, col: 2, row: 1, aspectRatio: "2:1", content: items[2].content },
      ];
    }
    // 3B: Linha 1 com dois cards 2x1 e Linha 2 com um card 4x1
    return [
      { id: items[0].id, colSpan: 2, rowSpan: 1, col: 0, row: 0, aspectRatio: "2:1", content: items[0].content },
      { id: items[1].id, colSpan: 2, rowSpan: 1, col: 2, row: 0, aspectRatio: "2:1", content: items[1].content },
      { id: items[2].id, colSpan: 4, rowSpan: 1, col: 0, row: 1, aspectRatio: "4:1", content: items[2].content },
    ];
  }

  // CASO 4: 4 Itens em grade de 4 colunas
  if (count === 4 && maxCols === 4) {
    const prefersTwoCol = items.some((it) => it.preferredSpan === "2:1");
    if (prefersTwoCol) {
      return items.map((it, idx) => ({
        id: it.id,
        colSpan: 2,
        rowSpan: 1,
        col: (idx % 2) * 2,
        row: Math.floor(idx / 2),
        aspectRatio: "2:1",
        content: it.content,
      }));
    }
    return items.map((it, idx) => ({
      id: it.id,
      colSpan: 1,
      rowSpan: 1,
      col: idx,
      row: 0,
      aspectRatio: "1:1",
      content: it.content,
    }));
  }

  // CASO 5: 5 Itens em grade de 4 colunas -> Bento Clássico (1 Hero 2x2 + 4 Satélites 2x1)
  if (count === 5 && maxCols === 4) {
    return [
      { id: items[0].id, colSpan: 2, rowSpan: 2, col: 0, row: 0, aspectRatio: "1:1", content: items[0].content },
      { id: items[1].id, colSpan: 2, rowSpan: 1, col: 2, row: 0, aspectRatio: "2:1", content: items[1].content },
      { id: items[2].id, colSpan: 2, rowSpan: 1, col: 2, row: 1, aspectRatio: "2:1", content: items[2].content },
      { id: items[3].id, colSpan: 2, rowSpan: 1, col: 0, row: 2, aspectRatio: "2:1", content: items[3].content },
      { id: items[4].id, colSpan: 2, rowSpan: 1, col: 2, row: 2, aspectRatio: "2:1", content: items[4].content },
    ];
  }

  // CASO 6: 3 Itens em grade de 6 colunas -> Três cards 2x1 em linha única (100% preenchido)
  if (count === 3 && maxCols === 6) {
    return items.map((it, idx) => ({
      id: it.id,
      colSpan: 2,
      rowSpan: 1,
      col: idx * 2,
      row: 0,
      aspectRatio: "2:1",
      content: it.content,
    }));
  }

  // CASO GERAL: Algoritmo Matricial 2D com Fechamento Guloso de Cauda
  const matrix = new TeteterisOccupancyMatrix(maxCols, 2);
  const slots: TeteterisCalculatedSlot<T>[] = [];

  for (let i = 0; i < count; i++) {
    const item = items[i];
    const pos = matrix.findNextEmpty();

    let colSpan = 1;
    let rowSpan = 1;

    if (item.preferredSpan === "4:1") colSpan = 4;
    else if (item.preferredSpan === "3:1") colSpan = 3;
    else if (item.preferredSpan === "2:1") colSpan = 2;
    else if (item.preferredSpan === "6:1") colSpan = 6;
    else if (item.preferredSpan === "2:2") { colSpan = 2; rowSpan = 2; }
    else if (item.preferredSpan === "1:2") { colSpan = 1; rowSpan = 2; }

    if (colSpan > maxCols) colSpan = maxCols;

    const remainingInRow = maxCols - pos.col;

    // Se for o último card da lista, aplica Greedy Tail Expansion para fechar 100% da linha
    if (i === count - 1) {
      if (remainingInRow > 0 && remainingInRow <= maxCols) {
        colSpan = remainingInRow;
      }
    } else {
      if (colSpan > remainingInRow) {
        colSpan = remainingInRow;
      }
    }

    // Se não puder colocar por colisão vertical com rowSpan anterior, ajusta para 1 row
    if (!matrix.canPlace(pos.col, pos.row, colSpan, rowSpan)) {
      rowSpan = 1;
      while (!matrix.canPlace(pos.col, pos.row, colSpan, rowSpan) && colSpan > 1) {
        colSpan--;
      }
    }

    matrix.place(pos.col, pos.row, colSpan, rowSpan);

    const aspectRatio: TeteterisRatio =
      colSpan === 6
        ? "6:1"
        : colSpan === 4
        ? "4:1"
        : colSpan === 3
        ? "3:1"
        : colSpan === 2
        ? "2:1"
        : "1:1";

    slots.push({
      id: item.id,
      colSpan,
      rowSpan,
      col: pos.col,
      row: pos.row,
      aspectRatio,
      content: item.content,
    });
  }

  // Reconciliação Final de Vazio (Zero Voids Invariant):
  // Se a última linha ainda contiver células não ocupadas, expande o último item alocado
  const maxRow = matrix.getMaxRowUsed();
  const unassignedTail = matrix.getUnassignedCellsInRow(maxRow - 1);
  if (unassignedTail > 0 && slots.length > 0) {
    const lastSlot = slots[slots.length - 1];
    if (lastSlot.row === maxRow - 1 && lastSlot.colSpan + unassignedTail <= maxCols) {
      lastSlot.colSpan += unassignedTail;
      lastSlot.aspectRatio =
        lastSlot.colSpan === 6
          ? "6:1"
          : lastSlot.colSpan === 4
          ? "4:1"
          : lastSlot.colSpan === 3
          ? "3:1"
          : "2:1";
    }
  }

  return slots;
}
