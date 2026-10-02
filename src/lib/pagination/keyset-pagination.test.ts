import { describe, it, expect, vi } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  sanitizePageSize,
  createKeysetPaginatedResult,
  applyPostgrestKeysetFilter,
} from './keyset-pagination';

describe('keyset-pagination (Plano 5 — S17)', () => {
  describe('encodeCursor & decodeCursor', () => {
    it('deve codificar e decodificar cursor com timestamp ISO e ID', () => {
      const payload = { sortValue: '2026-10-02T12:00:00.000Z', id: 'prod-123' };
      const encoded = encodeCursor(payload);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(10);

      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('deve codificar e decodificar cursor numérico (ex: centavos de preço)', () => {
      const payload = { sortValue: 4990, id: 'item-999' };
      const encoded = encodeCursor(payload);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('deve retornar null com segurança para cursores nulos, vazios ou corrompidos', () => {
      expect(decodeCursor(null)).toBeNull();
      expect(decodeCursor(undefined)).toBeNull();
      expect(decodeCursor('')).toBeNull();
      expect(decodeCursor('cursor_invalido_nao_base64')).toBeNull();
      expect(decodeCursor('e30=')).toBeNull(); // JSON "{}" não é array de [sortValue, id]
      expect(decodeCursor(Buffer.from('["so_um_item"]').toString('base64url'))).toBeNull();
    });
  });

  describe('sanitizePageSize', () => {
    it('deve aplicar tamanho padrão de 20 quando omitido ou inválido', () => {
      expect(sanitizePageSize(undefined)).toBe(20);
      expect(sanitizePageSize(0)).toBe(20);
      expect(sanitizePageSize(-5)).toBe(20);
      expect(sanitizePageSize(NaN)).toBe(20);
    });

    it('deve aceitar tamanhos válidos e limitar ao teto de 100', () => {
      expect(sanitizePageSize(15)).toBe(15);
      expect(sanitizePageSize(50)).toBe(50);
      expect(sanitizePageSize(100)).toBe(100);
      expect(sanitizePageSize(500)).toBe(100); // Clamped to MAX_PAGE_SIZE
    });
  });

  describe('createKeysetPaginatedResult', () => {
    const mockItems = [
      { id: '1', created_at: '2026-10-02T10:00:00Z', title: 'Item 1' },
      { id: '2', created_at: '2026-10-02T09:00:00Z', title: 'Item 2' },
      { id: '3', created_at: '2026-10-02T08:00:00Z', title: 'Item 3' },
    ];

    it('deve identificar hasMore=true quando quantidade de itens excede o limite', () => {
      // 3 itens com limite 2 -> hasMore=true, extra item removido
      const result = createKeysetPaginatedResult(mockItems, 2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('1');
      expect(result.items[1].id).toBe('2');
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
      expect(result.prevCursor).not.toBeNull();

      const decodedNext = decodeCursor(result.nextCursor);
      expect(decodedNext?.id).toBe('2');
      expect(decodedNext?.sortValue).toBe('2026-10-02T09:00:00Z');
    });

    it('deve identificar hasMore=false quando itens não excedem o limite', () => {
      const result = createKeysetPaginatedResult(mockItems, 5);
      expect(result.items).toHaveLength(3);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.prevCursor).not.toBeNull();
    });

    it('deve tratar lista vazia com cursores nulos', () => {
      const result = createKeysetPaginatedResult([], 10);
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.prevCursor).toBeNull();
    });
  });

  describe('applyPostgrestKeysetFilter', () => {
    it('deve configurar limit N+1 e order no query builder', () => {
      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
      };

      const cursor = encodeCursor({ sortValue: '2026-10-01', id: 'abc' });
      applyPostgrestKeysetFilter(mockQuery as any, {
        cursor,
        limit: 25,
        sortColumn: 'created_at',
        sortOrder: 'desc',
      });

      expect(mockQuery.limit).toHaveBeenCalledWith(26); // 25 + 1
      expect(mockQuery.lt).toHaveBeenCalledWith('created_at', '2026-10-01');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
});
