# SPEC-F03: Consolidação da Rota Places / Diretório de Empresas

## 1. Contexto e Motivação
O pilar **Places (Guia de Empresas Locais)** constitui o diretório oficial da cidade com geolocalização, horários, fotos da fachada, contatos e reputação. Ele não deve ser confundido com o Marketplace (onde se compra online com checkout) nem com os Classificados (onde se negocia desapego).

A Fase F03 consolida a rota `/places` (via re-export canônico de `_store.diretorio`), adiciona desambiguação visual formal para os 4 pilares, expurga emojis da interface (em conformidade com AGENTS.md B.8 e DL-23) e fornece link direto para o cadastro rápido de novas empresas.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F03-01] Rota Canônica /places
- **EARS (Quando rota acessada):** Ao acessar `/places`, o sistema deve carregar o Guia Oficial de Empresas e Estabelecimentos dentro do shell público `_store`.

### [REQ-F03-02] Desambiguação Visual e Transparência
- **EARS (Ubíquo):** A página inicial do Places/Diretório deve conter faixa explicativa esclarecendo seu papel de catálogo oficial de empresas, provendo links táteis para o Marketplace (`/marketplace`) e para os Classificados (`/classificados`).

### [REQ-F03-03] Erradicação de Emojis e Purga DL-23
- **EARS (Ubíquo):** Todas as categorias e rótulos do diretório devem utilizar estritamente ícones semânticos da biblioteca `@phosphor-icons/react` ou `lucide-react`, eliminando emojis literais conforme AGENTS.md B.8.

### [REQ-F03-04] Acessibilidade e Touch Targets
- **EARS (Ubíquo):** Todos os botões de contato, WhatsApp e links de rota devem manter altura mínima de 44px (`h-11`) e anel de foco teclado `:focus-visible:ring-2`.

---

## 3. Invariantes
1. Não alterar a assinatura dos serviços `getPublicDirectory`, `listHotpages` e `listActiveBanners`.
2. Preservar o rastreio seguro de cliques para o WhatsApp via `trackAndOpenWhatsApp`.
3. Manter a catraca de Design Lint intacta.

---

## 4. Critérios de Aceite
- [ ] `src/routes/_store.places.index.tsx` criada e sincronizada no TanStack Router.
- [ ] Emojis removidos de `DIRECTORY_CATEGORIES` em `src/routes/_store.diretorio.index.tsx`.
- [ ] Banner de desambiguação dos 4 pilares inserido no topo do diretório.
- [ ] Testes unitários cobrindo a rota de Places em `src/routes/_store.places.test.ts`.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
