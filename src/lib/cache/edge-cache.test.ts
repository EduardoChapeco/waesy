import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createIsomorphicFn: vi.fn(() => {
    const builder: any = {
      server: vi.fn((fn: any) => {
        builder._server = fn;
        return callable;
      }),
      client: vi.fn((fn: any) => {
        builder._client = fn;
        return callable;
      }),
      _server: undefined,
      _client: undefined,
    };
    const callable: any = (...args: any[]) => {
      const implementation = typeof window === 'undefined' ? builder._server : builder._client;
      return implementation?.(...args);
    };
    return Object.assign(callable, builder);
  }),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(() => ({ url: 'https://test.local/_serverFn/edge-cache' })),
}));
import {
  EDGE_CACHE_PROFILES,
  CACHE_TAGS,
  buildEdgeCacheHeaders,
  applyEdgeCache,
  applyServerFnEdgeCache,
  purgeEdgeCacheTags,
} from './edge-cache';

describe('edge-cache (Plano 5 — S18)', () => {
  it('deve gerar cabeçalhos de cache para dados públicos estáticos com s-maxage longo', () => {
    const headers = buildEdgeCacheHeaders('PUBLIC_STATIC', [CACHE_TAGS.classifieds()]);
    expect(headers['Cache-Control']).toContain('s-maxage=86400');
    expect(headers['Cache-Control']).toContain('stale-while-revalidate=604800');
    expect(headers['CDN-Cache-Control']).toBe('max-age=86400');
    expect(headers['Cache-Tag']).toBe('classifieds:all');
  });

  it('deve gerar cabeçalhos de cache para vitrine pública dinâmica com tags de loja', () => {
    const headers = buildEdgeCacheHeaders('PUBLIC_DYNAMIC', [
      CACHE_TAGS.store('store-123'),
      CACHE_TAGS.catalog('store-123'),
    ]);
    expect(headers['Cache-Control']).toContain('s-maxage=300');
    expect(headers['Cache-Control']).toContain('stale-while-revalidate=3600');
    expect(headers['Cache-Tag']).toBe('store:store-123,catalog:store-123');
  });

  it('deve impor private, no-store e omitir Cache-Tag para dados autenticados', () => {
    const headers = buildEdgeCacheHeaders('PRIVATE_MUTABLE', [CACHE_TAGS.store('store-123')]);
    expect(headers['Cache-Control']).toBe('private, no-cache, no-store, must-revalidate');
    expect(headers['CDN-Cache-Control']).toBeUndefined();
    expect(headers['Cache-Tag']).toBeUndefined();
  });

  it('deve aplicar cabeçalhos em objeto Headers web nativo', () => {
    const nativeHeaders = new Headers();
    applyEdgeCache(nativeHeaders, 'REALTIME_QUICK', ['weather:florianopolis']);

    expect(nativeHeaders.get('Cache-Control')).toContain('s-maxage=15');
    expect(nativeHeaders.get('Cache-Tag')).toBe('weather:florianopolis');
  });

  it('deve aplicar cabeçalhos via função setResponseHeader de Server Function', () => {
    const captured: Record<string, string> = {};
    const mockSetHeader = (k: string, v: string) => {
      captured[k] = v;
    };

    applyServerFnEdgeCache(mockSetHeader, 'PUBLIC_DYNAMIC', ['store:abc', 'catalog:abc']);
    expect(captured['Cache-Control']).toContain('s-maxage=300');
    expect(captured['Cache-Tag']).toBe('store:abc,catalog:abc');
  });

  it('deve executar expurgo de tags de borda com retorno determinístico', async () => {
    const res = await purgeEdgeCacheTags(['store:abc', 'product:xyz']);
    expect(res.purged).toBe(true);
    expect(res.tags).toEqual(['store:abc', 'product:xyz']);
  });
});
