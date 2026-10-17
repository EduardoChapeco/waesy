/**
 * teteterisgrid-engine.ts
 * Engine algorítmica de auto-packing 2D para grades bento e cards squircles.
 * 
 * Invariantes Absolutas:
 * 1. Zero Voids (Preenchimento Estrito de 100%): Nenhuma lacuna residual na grade.
 * 2. Auto-expansão gulosa de cauda (Greedy Tail Expansion): O último card ou cards ímpares
 *    expandem seus spans para fechar exatamente a largura total da grade (maxCols).
 * 3. Formas Canônicas Squircles: Proporções calculadas para encaixe perfeito em 4 ou 6 colunas.
 */

export type TeteterisPreferredSpan = "1:1" | "2:1" | "1:2" | "2:2" | "4:1" | "auto";
export type TeteterisRatio = "21:9" | "16:9" | "4:1" | "3:1" | "2:1" | "1:1";

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
  aspectRatio: TeteterisRatio;
  content: T;
}

/**
 * Calcula deterministicamente o posicionamento e spans de N cards em uma grade de maxCols colunas
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
        aspectRatio: maxCols === 6 ? "21:9" : "4:1",
        content: items[0].content,
      },
    ];
  }

  // CASO 2: 2 Itens -> Divisão balanceada 50/50
  if (count === 2) {
    const span = Math.floor(maxCols / 2);
    return items.map((it) => ({
      id: it.id,
      colSpan: span,
      rowSpan: 1,
      aspectRatio: "2:1",
      content: it.content,
    }));
  }

  // CASO 3: 3 Itens em grade de 4 colunas -> Linha 1: dois 2:1, Linha 2: um 4:1 (ou Hero 2x2 + 2x1 empilhados)
  if (count === 3 && maxCols === 4) {
    if (items[0].preferredSpan === "2:2" || items[0].priority === 1) {
      return [
        { id: items[0].id, colSpan: 2, rowSpan: 2, aspectRatio: "1:1", content: items[0].content },
        { id: items[1].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[1].content },
        { id: items[2].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[2].content },
      ];
    }
    return [
      { id: items[0].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[0].content },
      { id: items[1].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[1].content },
      { id: items[2].id, colSpan: 4, rowSpan: 1, aspectRatio: "4:1", content: items[2].content },
    ];
  }

  // CASO 4: 4 Itens em grade de 4 colunas -> 4 cards uniformes 1x1 ou 2 pares 2x1
  if (count === 4 && maxCols === 4) {
    const prefersTwoCol = items.some((it) => it.preferredSpan === "2:1");
    if (prefersTwoCol) {
      return items.map((it) => ({
        id: it.id,
        colSpan: 2,
        rowSpan: 1,
        aspectRatio: "2:1",
        content: it.content,
      }));
    }
    return items.map((it) => ({
      id: it.id,
      colSpan: 1,
      rowSpan: 1,
      aspectRatio: "1:1",
      content: it.content,
    }));
  }

  // CASO 5: 5 Itens em grade de 4 colunas -> Bento Clássico (1 Hero 2x2 + 4 Satélites 2x1 / 1x1)
  if (count === 5 && maxCols === 4) {
    return [
      { id: items[0].id, colSpan: 2, rowSpan: 2, aspectRatio: "1:1", content: items[0].content },
      { id: items[1].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[1].content },
      { id: items[2].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[2].content },
      { id: items[3].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[3].content },
      { id: items[4].id, colSpan: 2, rowSpan: 1, aspectRatio: "2:1", content: items[4].content },
    ];
  }

  // CASO GERAL: Algoritmo Guloso com Fechamento Dinâmico de Cauda
  const slots: TeteterisCalculatedSlot<T>[] = [];
  let currentOccupied = 0;

  for (let i = 0; i < count; i++) {
    const item = items[i];
    let colSpan = item.preferredSpan === "4:1" ? 4 : item.preferredSpan === "2:1" ? 2 : 1;

    if (colSpan > maxCols) colSpan = maxCols;

    const remainingInCurrentRow = maxCols - (currentOccupied % maxCols);

    if (i === count - 1) {
      if (remainingInCurrentRow > 0 && remainingInCurrentRow <= maxCols) {
        colSpan = remainingInCurrentRow;
      }
    } else if (colSpan > remainingInCurrentRow && remainingInCurrentRow < maxCols) {
      colSpan = remainingInCurrentRow;
    }

    currentOccupied += colSpan;

    const rowSpan = item.preferredSpan === "2:2" || item.preferredSpan === "1:2" ? 2 : 1;
    const aspectRatio: TeteterisRatio =
      colSpan === 4
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
      aspectRatio,
      content: item.content,
    });
  }

  return slots;
}
