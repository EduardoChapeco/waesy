# Estratégias de Cache HTTP & Service Workers

Controle de tempo de vida de ativos e distribuição global.

## Matriz de Cabeçalhos Cache-Control
- **Ativos Versionados (Hash):** `Cache-Control: public, max-age=31536000, immutable`
- **Ativos Não-Versionados:** `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`
- **HTML e SSR Dinâmico:** `Cache-Control: no-cache, must-revalidate`
- **APIs com Dados de Usuário:** `Cache-Control: private, no-store, max-age=0`

## Cache-First com Service Worker
Cache local em IndexedDB / CacheStorage de ativos estáticos para suporte offline e abertura instantânea.
