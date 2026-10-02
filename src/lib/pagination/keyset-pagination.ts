/**
 * keyset-pagination.ts — Motor Canônico de Paginação por Chave / Cursor (Plano 5 — S17)
 *
 * Elimina o custo quadrático O(N) e a instabilidade de deslocamento do OFFSET.
 * Oferece busca instantânea via índice (seek index) O(1) em qualquer profundidade de página.
 * Suporta codificação opaca de cursor base64url, ordenação bidirecional e detecção de hasMore via limit + 1.
 */

export interface CursorPayload {
  sortValue: string | number;
  id: string;
}

export interface KeysetPaginationParams {
  cursor?: string | null;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface KeysetPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  limit: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Codifica de forma segura e isomórfica o payload de cursor para string opaca base64url.
 */
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify([payload.sortValue, payload.id]);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64url');
  }
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodifica o cursor opaco com validação estrita. Retorna null se corrompido ou inválido.
 */
export function decodeCursor(cursor: string | null | undefined): CursorPayload | null {
  if (!cursor || typeof cursor !== 'string') return null;

  try {
    let json = '';
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(cursor, 'base64url').toString('utf-8');
    } else {
      let b64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      json = atob(b64);
    }

    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length < 2) return null;

    const [sortValue, id] = parsed;
    if (typeof id !== 'string' || (typeof sortValue !== 'string' && typeof sortValue !== 'number')) {
      return null;
    }

    return { sortValue, id };
  } catch {
    return null;
  }
}

/**
 * Sanitiza e normaliza o tamanho de página respeitando os tetos da plataforma.
 */
export function sanitizePageSize(limit?: number): number {
  if (!limit || typeof limit !== 'number' || limit <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(limit), MAX_PAGE_SIZE);
}

/**
 * Cria o resultado paginado a partir de uma lista de itens obtida com limite N + 1.
 * O item sobressalente (N + 1) é removido e utilizado para determinar hasMore.
 */
export function createKeysetPaginatedResult<T extends { id: string; created_at?: string }>(
  itemsWithExtra: T[],
  limit: number,
  sortFieldExtractor: (item: T) => string | number = (item: T) => item.created_at || item.id,
  direction: 'forward' | 'backward' = 'forward'
): KeysetPaginatedResult<T> {
  const safeLimit = sanitizePageSize(limit);
  const hasMore = itemsWithExtra.length > safeLimit;
  const items = hasMore ? itemsWithExtra.slice(0, safeLimit) : [...itemsWithExtra];

  if (direction === 'backward') {
    items.reverse();
  }

  let nextCursor: string | null = null;
  let prevCursor: string | null = null;

  if (items.length > 0) {
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    if (hasMore) {
      nextCursor = encodeCursor({
        sortValue: sortFieldExtractor(lastItem),
        id: lastItem.id,
      });
    }

    prevCursor = encodeCursor({
      sortValue: sortFieldExtractor(firstItem),
      id: firstItem.id,
    });
  }

  return {
    items,
    nextCursor,
    prevCursor,
    hasMore,
    limit: safeLimit,
  };
}

export interface PostgrestQueryBuilderLike {
  order(column: string, options?: { ascending?: boolean }): this;
  limit(count: number): this;
  lt(column: string, value: unknown): this;
  gt(column: string, value: unknown): this;
}

/**
 * Aplica os filtros de cursor diretamente em um builder PostgREST do Supabase.
 */
export function applyPostgrestKeysetFilter<TQuery extends PostgrestQueryBuilderLike>(
  query: TQuery,
  options: {
    cursor?: string | null;
    limit?: number;
    sortColumn?: string;
    sortOrder?: 'asc' | 'desc';
  }
): TQuery {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    sortColumn = 'created_at',
    sortOrder = 'desc',
  } = options;

  const safeLimit = sanitizePageSize(limit);
  const decoded = decodeCursor(cursor);

  // Busca limit + 1 para detectar hasMore sem COUNT(*)
  let q = query.limit(safeLimit + 1);

  if (decoded) {
    if (sortOrder === 'desc') {
      q = q.lt(sortColumn, decoded.sortValue);
    } else {
      q = q.gt(sortColumn, decoded.sortValue);
    }
  }

  q = q.order(sortColumn, { ascending: sortOrder === 'asc' });
  return q;
}
