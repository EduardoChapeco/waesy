# Plano Mestre: Unificação End-to-End, Paridade Multi-Nicho e Nativização de Dispositivos

## Visão Geral e Diagnóstico Forense
Este plano endereça os 5 gargalos estruturais identificados na auditoria completa do ecossistema Waesy:
1. **Fragmentação Arquitetural e Módulos Concorrentes:** Erradicação de telas e fluxos duplicados que executam a mesma função de maneiras desconectadas (ex: `_store.checkout.tsx` vs `_store.marketplace.checkout.tsx`; 4 telas concorrentes de detalhes de estabelecimentos em `/loja`, `/marketplace`, `/places` e `/diretorio`).
2. **Desconexão do Pipeline de Dados (Cadastro -> Detalhes -> Checkout -> Dashboard):** Correção do vazamento e perda de atributos especializados (ex.: `usable_area`, `total_area`, `parking_spaces`, `license_plate_end` cadastrados no Workspace mas ignorados no catálogo e nas páginas públicas por divergência de nomenclatura).
3. **Miopia e Dados Sintéticos nos Dashboards do Workspace:** Substituição de dados mockados e fallbacks fictícios (ex: 14,8 milhões de VGV hardcoded, arrays estáticos de agendamentos com nomes fictícios) por queries determinísticas reais no PostgreSQL vinculadas ao `store_id` e à vertical de atuação.
4. **Bifurcação Nativa de Plataforma (Anti-Sanfona e Anti-Jank):** Transição de páginas públicas com layouts responsivos monolíticos sujeitos a quebras e saltos visuais para cascas bifurcadas estritas: `MobileNative` (<768px, dock tátil, piso 44px, safe area) e `DesktopWebApp` (>=768px, widescreen bento grid, sem estiramento).
5. **Propagação Canônica para Todos os 15 Nichos:** Extensão das melhorias homologadas no Turismo (cards squircle de 12px, ausência de truncate, contratos tipados, composições financeiras) para Veículos, Imóveis, Gastronomia, Serviços, Vagas, Eventos e Saúde.

---

## User Review Required

> [!IMPORTANT]
> **Consolidação do Checkout Canônico:** Propõe-se a unificação definitiva em `src/routes/_store.checkout.tsx`, eliminando a rota órfã `src/routes/_store.marketplace.checkout.tsx` e unificando o serviço de processamento sob a invariante transacional atômica já testada.
>
> **Unificação da Visualização de Estabelecimentos:** As rotas `/loja/$slug`, `/diretorio/$id`, `/marketplace/$storeSlug` e `/places/$placeSlug` convergirão para um único motor de renderização `CanonicalStoreProfileView` bifurcado nativamente, preservando os slugs amigáveis via redirects ou wrappers finos sem código concorrente.

---

## Open Questions

> [!NOTE]
> 1. Para estabelecimentos no Guia de Lugares (`Places`) que ainda não possuem produtos cadastrados no marketplace, devemos exibir uma aba "Sobre & Contato" honesta e ocultar a aba de catálogo (conforme Invariante B.33), sem redirecionar forçadamente para classificados?
> 2. No dashboard do Workspace para Imóveis e Veículos, confirmamos a substituição do VGV estimado fictício pela soma real dos anúncios ativos (`status = 'active'`) do tenant em `classifieds.price_cents`?

---

## Proposed Changes

### 1. Camada de Resolução de Especificações e Normalização Multi-Nicho

#### [MODIFY] `src/lib/classifieds/canonical-specs-resolver.ts`
- Normalizar sinônimos de atributos entre Workspace Catalog e Classificados:
  - `area_sqm` <- `attrs.usable_area ?? attrs.area_sqm ?? classified.area_sqm`
  - `total_area_sqm` <- `attrs.total_area ?? attrs.total_area_sqm ?? classified.total_area_sqm`
  - `parking_spots` <- `attrs.parking_spaces ?? attrs.parking_spots ?? attrs.garage_spots`
  - `plate_end` <- `attrs.license_plate_end ?? attrs.chassis_plate_final ?? attrs.plate_end`
  - `mileage_km` <- `attrs.mileage ?? attrs.mileage_km ?? classified.mileage`
- Mapeamento estrito para os 15 nichos sem perda de campos técnicos em visualizações públicas.

---

### 2. Camada de Checkout e Unificação Transacional

#### [DELETE] `src/routes/_store.marketplace.checkout.tsx`
- Remover a rota duplicada de 779 linhas e seus endpoints paralelos, consolidando todos os pontos de compra em `_store.checkout.tsx`.

#### [MODIFY] `src/routes/_store.checkout.tsx`
- Bifurcação nativa do layout de checkout:
  - Mobile Shell (<768px): Navegação fluida em 3 passos, sticky bottom bar com safe area (`pb-safe`), botões táteis `h-11 min-h-11`, sem deslocamentos de viewport.
  - Desktop Shell (>=768px): Coluna dupla 65/35 com resumo de sacola fixo à direita e etapas expandidas à esquerda.
- Integração polimórfica: adaptar o seletor de entrega (`DeliverySelector`) para nichos sem logística física (Turismo, Serviços, Eventos, Doações, Assinaturas).

---

### 3. Camada de Dashboards do Workspace (Erradicação de Mocks)

#### [MODIFY] `src/components/workspace/dashboard/PolymorphicDashboardRenderer.tsx`
- Erradicar arrays estáticos e dados hardcoded em `AppointmentServicesDashboard`, `HighValueLeadsDashboard` e `CommerceGastroDashboard`.
- Integrar vertical de Turismo (`tourism`) e Eventos (`events`) como módulos de primeira classe no switch renderer, em vez de cair no fallback de gastronomia/comércio.
- Conectar métricas reais:
  - Agenda/Serviços: buscar agendamentos reais em `booking_appointments` para o `store_id` ativo.
  - Imóveis/Veículos: calcular VGV real via agregação SQL `SUM(price_cents)` de itens ativos em `classifieds` e `products`.
  - Gastronomia/Comércio: conectar contadores de comandas reais em `order_events` e `orders`.

---

### 4. Camada de Bifurcação Nativa de Vitrines e Catálogos (Anti-Jank)

#### [MODIFY] `src/routes/_store.marketplace.index.tsx`
- Criar componentes dedicados `MarketplaceMobileNativeApp.tsx` e `MarketplaceDesktopWebApp.tsx`.
- Mobile: Trilhos snap scroll, filtros em bottom sheet acessível, sem reflows ou efeito sanfona.
- Desktop: Barra lateral de filtros fixa, grade 4 colunas proporcionais com aspect ratio 1:1 e 16:9 travados no CSS.

#### [MODIFY] `src/routes/_store.classificados.index.tsx`
- Bifurcação em `ClassifiedsMobileCatalog.tsx` e `ClassifiedsDesktopCatalog.tsx` eliminando pulos de layout ao carregar filtros e garantindo zero CLS.

#### [MODIFY] `src/components/classifieds/convenience-showcase-view.tsx`
- Decompor o monólito de 1.882 linhas em duas cascas limpas: `ConvenienceDetailMobile.tsx` e `ConvenienceDetailDesktop.tsx`, espelhando o padrão já consolidado no `UniversalClassifiedShowcase`.

---

## Verification Plan

### Testes Automatizados
```bash
# Validação da integridade dos novos resolvers de atributos multi-nicho
npx.cmd vitest run src/lib/classifieds/__tests__/canonical-specs-resolver.test.ts

# Validação dos contratos de dashboard e checkout unificado
npx.cmd vitest run src/services/workspace-dashboard.test.ts
npx.cmd vitest run src/services/checkout.functions.test.ts

# Suíte completa de regressão
npm.cmd test

# Verificação de compilação sem erros
npm.cmd run typecheck

# Auditoria visual com catraca de design lint
node scripts/design-lint.mjs --ratchet
```

### Verificação Manual
1. Criar um anúncio/produto de Veículo e Imóvel no Workspace com todos os campos preenchidos e verificar se 100% dos dados são exibidos na vitrine e nos cards squircles.
2. Simular compra pelo carrinho e verificar redirecionamento único e consistente para `_store.checkout.tsx`.
3. Alternar viewport entre iPhone (375x812) e Desktop (1440x900) no Marketplace e no Detalhe do Produto, confirmando zero layout shift e renderização das cascas nativas correspondentes.
