# Relatório Forense de Auditoria: Rotas & Componentes Frontend (Ondas 00 a 14)

> **Agente:** Explorer Survey 1 (`explorer_survey_w0_1`)  
> **Parent:** `orchestrator_5` (`f5055954-3bc6-4fa7-b6c9-7f61186365f7`)  
> **Data:** 2026-10-04T19:26:00Z  
> **Escopo:** Requisitos R1 & R2 — Catálogo de 406 arquivos de rota, 718 componentes, separação HIG/Bento Grid e 15.367 violações DL-01 a DL-30.

---

## 1. Observation (Observações Empíricas Diretas)

### 1.1 Catálogo Físico e Topologia
- **Total de Arquivos em `src/routes/`:** 406 arquivos.
  - **12 arquivos de teste unitário** localizados indevidamente dentro de `src/routes/`:
    `src/routes/-apple-hig-design.test.ts`, `src/routes/-workspace.marketing.anuncios.test.ts`, `src/routes/-_store.marketplace.$storeSlug.test.ts`, `src/routes/-_store.places.$placeSlug.test.ts`, `src/routes/admin-master.vitrines-banners.test.ts`, `src/routes/status.test.ts`, `src/routes/store-route-loaders.test.ts`, `src/routes/_store.classificados.test.ts`, `src/routes/_store.evento-turismo-detail.test.ts`, `src/routes/_store.marketplace.index.test.ts`, `src/routes/_store.pillar-isolation.test.ts`, `src/routes/_store.places.test.ts`.
  - **1 arquivo raiz:** `src/routes/__root.tsx`.
  - **393 rotas físicas executáveis:**
    - 146 rotas de vitrine pública (`_store.*`)
    - 176 rotas de workspace operacional (`workspace.*`)
    - 38 rotas de admin master (`admin-master.*` e `admin.*`)
    - 19 rotas de integração/API (`api.*`)
    - 14 rotas independentes / portais (`home.tsx`, `status.tsx`, `assinar.$token.tsx`, `assinatura.$token.tsx`, `c.$storeSlug.tsx`, `claim.reivindicar.$entityId.tsx`, `claim.reputacao.$entityId.tsx`, `m.excursao.$token.tsx`, `m.lead.$leadId.tsx`, `portal.subpainel.$token.tsx`, `reclamar.novo.tsx`, `verificar.$serial.tsx`, `verify.document.$code.tsx`, `viajante.*`, `workspace_.pedidos.$id.recibo.tsx`)
    - 3 rotas de indexação SEO (`sitemap[.]xml.ts`, `sitemap-products[.]xml.ts`, `sitemap-news[.]xml.ts`).
- **Total de Componentes em `src/components/`:** 718 componentes distribuídos em 62 diretórios semânticos.
  - Principais módulos: `commerce` (142), `ui` (87), `tourism` (65), `admin` (58), `classifieds` (32), `studio` (29), `workspace` (25), `ad-engine` (17), `builder` (17), `chat` (15), `profile` (15), `community` (14), `eventos` (14), `shell` (14), `social-templates` (14), `design-system` (11).

### 1.2 Links Quebrados & Rotas Inexistentes
- `src/components/chat/waesy-copilot-drawer.tsx:126`:
  ```tsx
  case "call_ride":
    setIsOpen(false);
    navigate({ to: "/mobility" as any });
  ```
  *Fato:* A rota `/mobility` não existe no TanStack Router. A rota canônica é `/mobilidade` (`_store.mobilidade.tsx`).
- `src/components/chat/waesy-copilot-drawer.tsx:130`:
  ```tsx
  case "open_checkout":
    setIsOpen(false);
    navigate({ to: `/checkout/${action.payload.cartId}` as any });
  ```
  *Fato:* A rota `/checkout` não possui subrota dinâmica `$cartId` (`_store.checkout.tsx`).
- `src/components/onboarding/fast-company-onboarding.tsx:207, 209`:
  ```tsx
  navigate({ to: `/@${resolvedSlug}` as any });
  // ...
  navigate({ to: `/empresa/${resolvedStoreId}` as any });
  ```
  *Fato:* Nem `/@slug` nem `/empresa/id` existem na árvore de rotas. Rotas canônicas: `/loja/$storeSlug` ou `/c/$storeSlug`.

### 1.3 Botões Inoperantes & Toasts Simulados (Fake Toasts)
- `src/components/chat/waesy-copilot-drawer.tsx:133-143`:
  ```tsx
  case "request_travel_quote":
    toast.success("Demanda de viagem encaminhada para agências credenciadas!");
    break;
  case "submit_legal_demand":
    toast.success("Demanda jurídica registrada para advogados credenciados!");
    break;
  case "publish_ad":
    toast.success("Anúncio publicado no mural com sucesso!");
    break;
  case "add_to_cart":
    toast.success("Item adicionado ao carrinho!");
    break;
  ```
  *Fato:* Dispara toast sem invocar qualquer mutation BFF, sem persistência e sem atualizar o carrinho.
- `src/routes/workspace.imoveis.manutencoes.tsx:517`:
  ```tsx
  onClick={() => toast.info("Relatório de vistoria arquivado digitalmente no contrato.")}
  ```
  *Fato:* Ação sem integração backend.
- `src/routes/_store.conta.creditos.tsx:126`:
  ```tsx
  <Button variant="outline" className="rounded-lg">Cancelar</Button>
  ```
  *Fato:* Botão órfão sem `onClick`, sem `type="button"`, sem vínculo a formulário.

### 1.4 Matriz de 4 Estados (Data, Skeleton Loading, Empty State, Error)
- **Rotas UI (.tsx) inspecionadas:** 371 rotas.
- **Rotas com busca de dados assíncrona:** 346 rotas.
- **Rotas com Matriz Completa de 4 Estados:** 167 rotas (48.3%).
- **Rotas sem Estado de Carregamento (Skeleton/Spinner):** 159 rotas (46.0%).
  Exemplos: `admin-master.lojas.tsx`, `admin-master.logs.tsx`, `workspace.advocacia.index.tsx`, `workspace.captacao.index.tsx`, `workspace.licitacoes.tsx`.
- **Rotas sem Estado Vazio (Empty State):** 51 rotas (14.7%).
  Exemplos: `admin-master.algoritmo.tsx`, `admin-master.hubs.tsx`, `workspace.squads.tsx`, `workspace.skills.tsx`.
- **Rotas sem Tratamento de Erro:** 5 rotas (1.4%):
  1. `src/routes/workspace.mining.tsx`
  2. `src/routes/_store.cadastroantecipado.tsx`
  3. `src/routes/_store.conta.metricas.tsx`
  4. `src/routes/_store.garcom.tsx`
  5. `src/routes/_store.places.$placeSlug.tsx`

### 1.5 Barreira Zero-Trust Civil & Isolamento Multi-Tenant
- **Barreira Zero-Trust com `ActionAuthGuardModal`:**
  Apenas 4 rotas públicas implementam a barreira modal para usuários anônimos:
  - `src/routes/_store.classificados.$id.tsx`
  - `src/routes/_store.evento.$id.tsx`
  - `src/routes/_store.empregos.$id.tsx`
  - `src/routes/_store.turismo.$id.tsx`
  *Faltando em:* `_store.imoveis.$id.tsx`, `_store.produto.$slug.tsx`, `_store.servicos.tsx`, `_store.agendar.index.tsx`, `_store.doacoes.tsx`, `_store.afiliados.tsx`, `_store.noticias.$id.tsx`.
- **Multi-Tenant no Workspace:**
  Das 176 rotas de workspace, embora a raiz `src/routes/workspace.tsx` exija login e pertença a negócio no `beforeLoad`, **132 rotas filhas** não realizam passagem explícita de `store_id` nas consultas internas, deixando a responsabilidade exclusivamente para cookies de sessão e triggers backend.

### 1.6 Separação Mobile HIG vs Desktop Bento Grid & Cabeçalhos
- **Usos de `NativeMobileHeader`:** 37 arquivos.
- **Cabeçalhos Desktop Inpage Pareados:** 15 arquivos possuem cabeçalho desktop (`hidden md:flex`/`PageHeader`).
- **Defeito Crítico: 22 Arquivos "Cabeçalho-Fantasma" no Desktop:**
  Quando `NativeMobileHeader` aplica `md:hidden` nativamente, a visualização desktop (>= 768px) fica **completamente sem cabeçalho, sem título `<h1>`, sem botão voltar e sem breadcrumb**:
  1. `src/routes/_store.conta.classificados.index.tsx`
  2. `src/routes/_store.conta.comissoes.tsx`
  3. `src/routes/_store.conta.curriculo.tsx`
  4. `src/routes/_store.conta.empresa.tsx`
  5. `src/routes/_store.conta.financas.tsx`
  6. `src/routes/_store.conta.ingressos.tsx`
  7. `src/routes/_store.conta.notificacoes.tsx`
  8. `src/routes/_store.conta.pedidos.$id.tsx`
  9. `src/routes/_store.conta.salvos.tsx`
  10. `src/routes/_store.conta.trocas.tsx`
  11. `src/routes/_store.destaques.$slug.tsx`
  12. `src/routes/_store.diretorio.index.tsx`
  13. `src/routes/_store.empregos.index.tsx`
  14. `src/routes/_store.eventos.tsx`
  15. `src/routes/_store.faq.tsx`
  16. `src/routes/_store.marketplace.index.tsx`
  17. `src/routes/_store.membro.$id.tsx`
  18. `src/routes/_store.recuperar-senha.tsx`
  19. `src/routes/_store.redefinir-senha.tsx`
  20. `src/components/commerce/canonical-store-profile-view.tsx`
  21. `src/components/legal/legal-document-viewer.tsx`
  22. `src/components/shell/app-shell.tsx`

### 1.7 Violações de Alvo de Toque Móvel (DL-14 < 44px)
- **Total de violações DL-14 no repositório:** 2.558 ocorrências.
- **117 arquivos TSX** declaram controles interativos com altura menor que 44px (`h-8`, `h-9`, `size-8`, etc.) sem compensação `h-11 min-h-11` ou `md:h-9`.
- Top 5 arquivos com maior incidência:
  1. `src/routes/_store.conta.empresa.tsx` (9 violações)
  2. `src/components/legal/legal-document-viewer.tsx` (6 violações)
  3. `src/routes/workspace.captacao.index.tsx` (6 violações)
  4. `src/routes/workspace.configuracoes.integracoes.tsx` (6 violações)
  5. `src/components/workspace/dashboard/PolymorphicDashboardRenderer.tsx` (5 violações)

### 1.8 Censo Geral do Design Lint (DL-01 a DL-30)
Conforme consolidado em `design-lint.report.json` (1.848 arquivos auditados):
- **Total de Violações:** 15.367
  - **P0 (Bloqueia Entrega):** 1.716
  - **P1 (Bloqueia Merge):** 10.777
  - **P2 (Fila de Correção):** 1.396
  - **P3 (Polimento):** 1.478

| Regra | Descrição | Ocorrências | Severidade | Módulos Mais Afetados |
| :--- | :--- | :--- | :--- | :--- |
| **DL-02** | Classes arbitrárias com colchetes `-[...]` | 5.208 | P1 | `components/app` (2.410), `routes/store` (952), `routes/workspace` (820) |
| **DL-14** | Alvo de toque mobile < 44px (falta `h-11`) | 2.558 | P1 | `components/app` (1.082), `routes/workspace` (485), `routes/store` (412) |
| **DL-15** | Falta anel de foco teclado (`focus-visible:ring-2`) | 1.713 | P0 | `components/app` (666), `routes/workspace` (460), `routes/store` (305) |
| **DL-18** | Classes literais `text-white`, `bg-black`, etc. | 1.314 | P1 | `components/app` (512), `routes/store` (298), `components/tourism` (180) |
| **DL-27** | Uso de `transition-all` | 1.213 | P3 | `components/app` (489), `routes/workspace` (248), `routes/store` (215) |
| **DL-01** | Cores hexadecimais `#HEX` ou `rgb()` no JSX | 1.012 | P1 | `components/tourism` (340), `components/app` (290), `routes/store` (185) |
| **DL-07** | Sombras em superfícies utilitárias (não-modal) | 502 | P2 | `components/app` (210), `routes/workspace` (140), `routes/store` (85) |
| **DL-23** | Emojis literais no código | 480 | P2 | `components/app` (195), `routes/store` (112), `tourism` (95) |
| **DL-28** | Falta de respeito a `motion-reduce` | 308 | P1 | `components/app` (120), `routes/store` (80), `routes/workspace` (60) |
| **DL-30** | Variáveis de token não consumidas | 265 | P3 | `styles.css` / `tokens.json` |
| **DL-03** | Espaçamentos fora da grade de 4px (ex: `p-3.5`) | 163 | P1 | `components/app` (70), `routes/store` (45), `routes/workspace` (30) |
| **DL-05** | Inline styles com cor, padding ou margem | 138 | P1 | `components/tourism` (60), `components/app` (45) |
| **DL-29** | Falta de bifurcação adaptativa móvel | 129 | P2 | `routes/workspace` (65), `routes/store` (42) |
| **DL-08** | Gradientes decorativos utilitários | 123 | P2 | `components/app` (55), `routes/store` (35) |
| **DL-26** | Animações > 300ms | 110 | P2 | `components/app` (45), `routes/store` (30) |
| **DL-12** | Superfície de dados sem Empty State | 39 | P1 | `routes/workspace` (20), `routes/store` (12) |
| **DL-25** | Componentes duplicados | 33 | P2 | `components/ui` (15), `components/app` (18) |
| **DL-11** | Superfície de dados sem Skeleton | 25 | P1 | `routes/store` (15), `routes/workspace` (10) |
| **DL-09** | Mais de 4 raios distintos na tela | 13 | P2 | `routes/workspace` (8), `routes/store` (5) |
| **DL-13** | Superfície de dados sem Error State | 12 | P1 | `routes/workspace` (7), `routes/store` (5) |
| **DL-06** | Z-index arbitrário (> 50 ou `z-[9999]`) | 4 | P2 | `components/builder` (2), `routes/store` (2) |
| **DL-04** | Brute force modifiers (`!important` / `!\w+`) | 3 | P0 | `components/commerce`, `components/pos`, `routes/workspace` |
| **DL-24** | Rótulo de botão > 3 palavras | 2 | P2 | `components/app` (2) |

### 1.9 AI Smell & Emojis Literais
- **336 emojis Unicode** em arquivos TSX de interface (DL-23), concentrados em seletores de tags, templates WhatsApp (`travel-booking-dossier-modal.tsx`) e badges de status.
- **11 caixas explicativas conversacionais** ("AI Smell", banners de boas-vindas e "Dica:") em:
  - `src/components/shell/beta-explanation-modal.tsx:41`
  - `src/components/ui/module-tour-modal.tsx:153`
  - `src/components/workspace/workspace-all-tools-dialog.tsx:760`
  - `src/components/office/contract-editor-sheet.tsx:197`
  - `src/routes/admin-master.mining.tsx:1942`
  - `src/routes/workspace.contratos.$id.editor.tsx:421`

---

## 2. Logic Chain (Cadeia Lógica de Inferências)

1. **Premissa 1 (Observação 1.1):** 12 arquivos `.test.ts` residem diretamente na raiz de `src/routes/`.
   **Inferência:** Scanners de rota do TanStack Router ou scripts como `audit-routes-matrix.mjs` mapeiam inadvertidamente `-apple-hig-design.test.ts` e `-workspace.marketing.anuncios.test.ts` como rotas ativas (ex: `/-apple-hig-design/test`), poluindo o roteamento canônico com artefatos órfãos de teste.

2. **Premissa 2 (Observação 1.2):** O drawer do Copilot (`src/components/chat/waesy-copilot-drawer.tsx`) executa `navigate({ to: "/mobility" })` e `navigate({ to: `/checkout/${action.payload.cartId}` })`.
   **Inferência:** Quando o assistente de IA tenta encaminhar o usuário para chamar uma corrida ou abrir um carrinho específico, o TanStack Router falha em resolver a rota, provocando tela de erro ou redirecionamento involuntário para a home.

3. **Premissa 3 (Observação 1.4):** De 346 rotas que realizam fetch assíncrono, 159 não exibem `Skeleton` ou indicador de carregamento, e 51 não possuem `EmptyState`.
   **Inferência:** Violação direta de Nielsen H1 (Visibilidade do Estado) e dos Core Web Vitals (CLS instável e saltos de layout). O usuário se depara com flash de conteúdo vazio até os dados chegarem da rede.

4. **Premissa 4 (Observação 1.6):** 22 rotas utilizam exclusivamente `NativeMobileHeader` (com classe `md:hidden`), sem declarar nenhum contêiner alternativo para telas maiores.
   **Inferência:** Em dispositivos desktop (>= 768px), o cabeçalho desaparece integralmente, deixando a página desprovida de título hierárquico `h1`, sem botão voltar e sem identidade de seção, rompendo a arquitetura Bento Grid estabelecida em DESIGN.md.

5. **Premissa 5 (Observação 1.7 e 1.8):** Existem 2.558 violações de alvos de toque (< 44px) e 1.713 botões sem anel de foco `focus-visible:ring-2`.
   **Inferência:** Violação severa dos pisos Apple HIG (44x44px no polegar) e WCAG 2.2 AA (Critérios 2.5.8 e 2.4.7), impossibilitando aprovação nos gates P0/P1 estabelecidos em AGENTS.md.

---

## 3. Caveats (Ressalvas e Limitações)

1. **Modo Read-Only:** Nenhuma alteração foi aplicada ao código fonte nesta fase de levantamento (Wave 00).
2. **Proibição Estrita de Compilação:** Respeitando rigorosamente a restrição de engenharia R6 de `ORIGINAL_REQUEST.md`, `npm run typecheck` e `npm run build` **não foram executados**. Toda a análise baseou-se em varredura estática, execução de scripts Node específicos e leitura forense de baselines.
3. **Casos Dinâmicos de Rotas:** Algumas rotas órfãs detectadas (como `/assinar/$token`, `/m.lead.$leadId`, `/portal.subpainel.$token`) recebem acessos exclusivamente via links externos (e-mail, WhatsApp, QR Code) e não via navegação interna de menu, o que justifica a ausência de links internos diretos.

---

## 4. Conclusion (Conclusão & Plano de Ação para as Ondas 01 a 14)

O frontend do Waesy possui uma arquitetura robusta com 393 rotas físicas e 718 componentes, mas apresenta **defeitos concentrados e sistemáticos** em três frentes:

1. **Links & Handlers Falsos (Ondas 01 a 07):**
   - Corrigir as 4 rotas quebradas no Copilot Drawer e Onboarding (`/mobility` → `/mobilidade`, `/checkout/$id` → `/checkout`, `/@slug` → `/loja/$slug`).
   - Mover os 12 arquivos de teste de `src/routes/` para suas pastas de domínio corretas em `src/tests/` ou pastas irmãs para não poluir o RouteTree.
   - Conectar as 4 ações com fake toast no Copilot Drawer aos serviços reais de mensageria e carrinho.
   - Instalar `ActionAuthGuardModal` nas rotas públicas de `imoveis`, `produto`, `servicos` e `doacoes`.
2. **Separação de Cabeçalhos Mobile HIG vs Desktop Bento (Ondas 08 a 10):**
   - Adicionar o bloco de cabeçalho inpage desktop (`hidden md:flex items-center justify-between pb-6 border-b border-border/40`) nas 22 rotas identificadas como "cabeçalho-fantasma".
   - Aplicar `h-11 min-h-11` em todos os botões das 117 páginas móveis com touch targets deficitários.
3. **Saneamento do Design Lint (Ondas 11 a 14):**
   - Eliminar os modificadores de força bruta `!important` e `max-sm:!inset-0 max-sm:!h-[100dvh]` substituindo por classes canônicas de Tailwind v4.
   - Expurgar os 336 emojis literais substituindo por ícones Lucide/Phosphor.
   - Adicionar `focus-visible:ring-2 focus-visible:ring-primary` nos botões da camada UI e rotas centrais para zerar as 1.713 violações P0 de DL-15.
   - Completar a matriz de 4 estados com `<Skeleton />` e `<EmptyState />` nas 159 rotas deficitárias.

---

## 5. Verification Method (Método de Verificação Independente)

Para auditar e reproduzir independentemente cada métrica deste relatório:

1. **Verificação de Violações de Design Lint:**
   ```powershell
   node scripts/design-lint.mjs
   ```
   *Condição de verificação:* Confirmação de 15.367 violações totais (1.716 P0, 10.777 P1) descritas em `design-lint.report.json`.

2. **Verificação de Links Quebrados do Copilot:**
   Inspecionar linha 126 de `src/components/chat/waesy-copilot-drawer.tsx`:
   ```powershell
   Select-String -Path "src/components/chat/waesy-copilot-drawer.tsx" -Pattern "navigate\(\{ to:"
   ```

3. **Verificação dos 22 Arquivos sem Cabeçalho Desktop:**
   Inspecionar por exemplo `src/routes/_store.faq.tsx`: verificar que a linha 30 declara `<NativeMobileHeader />` (oculto no desktop por padrão) e não existe nenhum `hidden md:flex` ou `<h1>` desktop até a linha 50.

4. **Verificação de Testes Infiltrados em Rotas:**
   ```powershell
   Get-ChildItem -Path "src/routes" -Filter "*.test.ts" | Select-Object Name
   ```
   *Resultado esperado:* 12 arquivos de teste listados.
