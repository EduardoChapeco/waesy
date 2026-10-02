# SPEC-F09: Places — Detalhe do Estabelecimento com Reputação, Galeria e Mapa

## 1. Metadados e Controle Normativo
- **Fase:** F09 (Places: Detalhe de Estabelecimento Físico).
- **Plano:** Plano Mestre de Estabilização e Desentrelaçamento dos 4 Pilares.
- **Autoridade:** BigTech Executive Board & Red Team.
- **Invariantes:** M01 (Zero Mocks), M02 (SSR / Hidratação Limpa), M03 (Auditabilidade), M10 (Isolamento de Pilares: Pilar 1 Places estritamente para estabelecimentos físicos), WCAG 2.2 AA.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F09-01] Resolução e Carregamento SSR de Estabelecimento Físico por Slug
- **EARS (Quando acionado):** QUANDO o usuário navegar para a rota `/places/$placeSlug`, O SISTEMA DEVE resolver o estabelecimento em `places` ou `stores` garantindo que possui localização física (`is_physical_location = true`), buscando nome, endereço, horário de funcionamento, contatos e coordenadas geográficas (lat/lng).

### [REQ-F09-02] Galeria de Fotos e Exibição Visual Canônica
- **EARS (Ubíquo):** A tela DEVE renderizar fotos do local preservando proporção de aspecto canônica (sem distorção, sem overflow e com loading lazy), além de selo de "Estabelecimento Verificado no Guia Oficial".

### [REQ-F09-03] Avaliações, Reputação e Prova Social Transparente
- **EARS (Ubíquo):** O SISTEMA DEVE exibir a nota média e quantidade de avaliações recebidas, listando depoimentos recentes sem manipulação ou notas sintéticas.

### [REQ-F09-04] Ações Táteis de Localização e Contato Direto
- **EARS (Ubíquo):** A página DEVE disponibilizar botões acessíveis (`h-11`, `:focus-visible:ring-2`) para:
  1. **Como Chegar:** Link externo de rotas no mapa (OpenStreetMap/Google Maps).
  2. **WhatsApp Oficial:** Abertura direta do canal oficial de mensagens.
  3. **Telefone / Ligar:** Disparo nativo de chamada telefônica (`tel:`).
  4. **Ver Produtos no Marketplace:** Se o estabelecimento possuir vitrine comercial ativa no Pilar 3, link direto para `/marketplace/:storeSlug`.

### [REQ-F09-05] Matriz Completa de Estados
- **EARS (Ubíquo):** Em caso de estabelecimento inexistente, O SISTEMA DEVE exibir estado Not Found com CTA para retornar a `/places`. Quando em carregamento, exibir skeleton responsivo.

---

## 3. Critérios de Aceite e Métricas
1. `src/services/places-detail.functions.ts` exporta `getPlaceDetailBySlugFn` com consultas reais no Supabase.
2. `src/routes/_store.places.$placeSlug.tsx` implementada e integrada no TanStack Router.
3. Suíte de testes `src/routes/_store.places.$placeSlug.test.ts` com testes unitários passando.
4. `npm run typecheck` Exit Code 0.
5. `node scripts/design-lint.mjs --ratchet` Exit Code 0 (0 regressões visuais).
