import { describe, it, expect } from "vitest";
import {
  computeTeteterisGrid,
  TeteterisOccupancyMatrix,
  type TeteterisItemInput,
} from "./teteterisgrid-engine";

describe("TeteterisOccupancyMatrix - Rastreamento Bidimensional", () => {
  it("rastreia coordenadas livres e ocupadas corretamente", () => {
    const matrix = new TeteterisOccupancyMatrix(4, 2);
    expect(matrix.findNextEmpty()).toEqual({ col: 0, row: 0 });

    expect(matrix.canPlace(0, 0, 2, 2)).toBe(true);
    matrix.place(0, 0, 2, 2);

    expect(matrix.getOccupiedArea()).toBe(4);
    // Próxima célula vazia na linha 0 é a coluna 2
    expect(matrix.findNextEmpty()).toEqual({ col: 2, row: 0 });

    // Coloca card 2x1 no topo direito
    expect(matrix.canPlace(2, 0, 2, 1)).toBe(true);
    matrix.place(2, 0, 2, 1);

    // Próxima célula vazia é na linha 1, coluna 2 (pois 0 e 1 estão ocupados pelo card 2x2)
    expect(matrix.findNextEmpty()).toEqual({ col: 2, row: 1 });
  });

  it("não permite sobreposição fora dos limites de colunas", () => {
    const matrix = new TeteterisOccupancyMatrix(4, 2);
    expect(matrix.canPlace(3, 0, 2, 1)).toBe(false);
  });
});

describe("computeTeteterisGrid - Engine Canônica teteterisgrid", () => {
  it("retorna array vazio quando items for vazio", () => {
    expect(computeTeteterisGrid([])).toEqual([]);
  });

  it("aloca 1 card para 100% da largura (colSpan = 4) sem sobras", () => {
    const items: TeteterisItemInput[] = [{ id: "c1", content: { title: "Card 1" } }];
    const slots = computeTeteterisGrid(items, 4);

    expect(slots).toHaveLength(1);
    expect(slots[0].colSpan).toBe(4);
    expect(slots[0].rowSpan).toBe(1);
    expect(slots[0].col).toBe(0);
    expect(slots[0].row).toBe(0);
  });

  it("aloca 1 card para 100% da largura em grade de 6 colunas", () => {
    const items: TeteterisItemInput[] = [{ id: "c1", content: { title: "Card 1" } }];
    const slots = computeTeteterisGrid(items, 6);

    expect(slots).toHaveLength(1);
    expect(slots[0].colSpan).toBe(6);
    expect(slots[0].rowSpan).toBe(1);
    expect(slots[0].aspectRatio).toBe("21:9");
  });

  it("divide 2 cards em 50/50 perfeitamente (colSpan = 2 cada)", () => {
    const items: TeteterisItemInput[] = [
      { id: "c1", content: { title: "Card 1" } },
      { id: "c2", content: { title: "Card 2" } },
    ];
    const slots = computeTeteterisGrid(items, 4);

    expect(slots).toHaveLength(2);
    expect(slots[0].colSpan).toBe(2);
    expect(slots[1].colSpan).toBe(2);
    expect(slots[0].colSpan + slots[1].colSpan).toBe(4);
    expect(slots[0].col).toBe(0);
    expect(slots[1].col).toBe(2);
  });

  it("resolve 3 cards em grade de 6 colunas (3 cards 2x1 em linha única)", () => {
    const items: TeteterisItemInput[] = [
      { id: "c1", content: { title: "Card 1" } },
      { id: "c2", content: { title: "Card 2" } },
      { id: "c3", content: { title: "Card 3" } },
    ];
    const slots = computeTeteterisGrid(items, 6);

    expect(slots).toHaveLength(3);
    expect(slots[0].colSpan).toBe(2);
    expect(slots[1].colSpan).toBe(2);
    expect(slots[2].colSpan).toBe(2);
    expect(slots.reduce((acc, s) => acc + s.colSpan, 0)).toBe(6);
  });

  it("resolve 3 cards em grade de 4 colunas com Linha 1 (2x1 + 2x1) e Linha 2 (4x1)", () => {
    const items: TeteterisItemInput[] = [
      { id: "c1", content: { title: "Card 1" } },
      { id: "c2", content: { title: "Card 2" } },
      { id: "c3", content: { title: "Card 3" } },
    ];
    const slots = computeTeteterisGrid(items, 4);

    expect(slots).toHaveLength(3);
    expect(slots[0].colSpan).toBe(2);
    expect(slots[1].colSpan).toBe(2);
    expect(slots[2].colSpan).toBe(4); // O 3º card expande para ocupar a fileira completa
  });

  it("resolve 3 cards com Hero (2x2) + dois secundários (2x1 cada)", () => {
    const items: TeteterisItemInput[] = [
      { id: "c1", preferredSpan: "2:2", priority: 1, content: { title: "Hero Card" } },
      { id: "c2", content: { title: "Card 2" } },
      { id: "c3", content: { title: "Card 3" } },
    ];
    const slots = computeTeteterisGrid(items, 4);

    expect(slots).toHaveLength(3);
    expect(slots[0].colSpan).toBe(2);
    expect(slots[0].rowSpan).toBe(2);
    expect(slots[1].colSpan).toBe(2);
    expect(slots[1].rowSpan).toBe(1);
    expect(slots[2].colSpan).toBe(2);
    expect(slots[2].rowSpan).toBe(1);
  });

  it("resolve 5 cards na composição Bento Modular sem nenhuma célula vazia", () => {
    const items: TeteterisItemInput[] = [
      { id: "c1", content: { title: "Card 1" } },
      { id: "c2", content: { title: "Card 2" } },
      { id: "c3", content: { title: "Card 3" } },
      { id: "c4", content: { title: "Card 4" } },
      { id: "c5", content: { title: "Card 5" } },
    ];
    const slots = computeTeteterisGrid(items, 4);

    expect(slots).toHaveLength(5);
    expect(slots[0].colSpan).toBe(2);
    expect(slots[0].rowSpan).toBe(2);
    expect(slots[1].colSpan).toBe(2);
    expect(slots[2].colSpan).toBe(2);
    expect(slots[3].colSpan).toBe(2);
    expect(slots[4].colSpan).toBe(2);
  });

  it("aplica auto-expansão gulosa de cauda em quantidade ímpar arbitrária para fechar 100% da linha", () => {
    const items: TeteterisItemInput[] = Array.from({ length: 7 }, (_, idx) => ({
      id: `c${idx + 1}`,
      content: { index: idx + 1 },
    }));

    const slots = computeTeteterisGrid(items, 4);
    expect(slots).toHaveLength(7);

    const totalSpan = slots.reduce((acc, s) => acc + s.colSpan, 0);
    expect(totalSpan % 4).toBe(0); // Múltiplo perfeito de 4 (zero lacunas!)
    expect(slots[6].colSpan).toBe(2); // O último card expandiu para cobrir o espaço restante
  });
});
