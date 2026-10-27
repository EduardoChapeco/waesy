# EVENT_LOCATION_ACCESS_AUDIT — Auditoria de Localização, Coordenadas e Pontos de Acesso

## 1. Arquitetura Geográfica e Múltiplos Acessos (`src/lib/classifieds/event-domain.ts`)

| Capacidade | Implementação Canônica | Comportamento na Página Pública (`#section-local`) |
| :--- | :--- | :--- |
| **Local Principal (`venue_name` + `venue_address`)** | Normalizado a partir de `attributes.venue_name`, `attributes.venue_address`, `city`, `state`, `location_lat` e `location_lng`. | Card de destaque no cabeçalho (clicável para rolar até `#section-local`) e na seção Localização. |
| **Resolução de URL do Google Maps (`buildGoogleMapsUrl`)** | Prioriza coordenadas exatas (`?api=1&query=lat,lng`) quando presentes e válidas; faz fallback determinístico para `venue_name, venue_address, city, state`. | Botão tátil `h-11 min-h-11` **"Como Chegar (Google Maps)"**. |
| **Múltiplos Pontos de Acesso (`event.access_points`)** | Suporta múltiplos acessos tipados: `main_venue` (Entrada Principal), `accreditation` (Credenciamento), `parking` (Estacionamento), `vip_entrance` (Acesso VIP) e `pcd_access` (Acesso PCD). | Grid de cards em `#section-local` com endereço, instruções de portaria e link individual **"Ver no Mapa"**. |
| **Estacionamento & Acessibilidade PCD** | Integrados em `event.policies.parking_info` e `event.policies.accessibility_info`. | Exibidos diretamente dentro de `#section-local` além de `#section-politicas`. |
