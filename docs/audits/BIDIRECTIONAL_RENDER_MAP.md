# BIDIRECTIONAL_RENDER_MAP.md — Arquitetura de Renderização Bidirecional (Desktop Native × Mobile Native)

**Data:** 2026-10-21
**Status:** Auditado & Implementado

---

## 1. Princípio de Design Bidirecional (Invariantes B.36 & B.42)

No Waesy:
- **Desktop Native (`>= 840px` ou `previewViewport === "desktop"`)** ≠ Mobile escalado.
- **Mobile Native (`< 600px` ou `previewViewport === "mobile"`)** ≠ Desktop comprimido.

Ambas as composições compartilham:
- Mesma fonte de dados (`classified` / `UnifiedListing` / `OmniPageDocument`);
- Mesmo domínio e regras de negócio;
- Mesmo `template_style` / `template_id`;
- Mesmos tokens semânticos (`tokens.json` / `styles.css`).

E divergem intencionalmente em:
- **Hierarquia espacial e colunas:**
  - **Desktop Native:** Grid assimétrico de 12 colunas (`8 cols` de mídia/conteúdo principal + `4 cols` de sidebar sticky com card de conversão, preço, condições e anunciante).
  - **Mobile Native:** Fluxo vertical contínuo de 1 coluna com hero tátil, pílulas rápidas, régua horizontal de abas em linha única (`flex-nowrap overflow-x-auto no-scrollbar`) e `ClassifiedFloatingActionBar` (`z-30`) fixa no rodapé com folga `pb-32 pb-safe`.

---

## 2. Manifesto de Composição por Template (`TemplateLayoutManifest`)

Para que a seleção de template (`standard`, `editorial`, `automotivo`, `imobiliario`, `resort_hotel`, `servicos_agenda`, `conveniencia`) produza composições reais tanto em Desktop quanto em Mobile:

| Template ID | Nichos Compatíveis | Composição Desktop Native (`ClassifiedDetailDesktop`) | Composição Mobile Native (`ClassifiedDetailMobile`) |
| :--- | :--- | :--- | :--- |
| `standard` | Todos os nichos | Grid 8+4 clássico: Galeria 16:10, resumo direto, abas de Ficha Técnica / Descrição / Pagamento, sidebar de conversão. | Hero 4:3, resumo compacto, régua horizontal de abas, CTA fixo inferior. |
| `editorial` | `viagem`, `hospedagem`, `imovel`, `veiculo`, `servico`, `evento`, `negocio`, `gastronomia`, `desapego`, `vaga`, `digital`, `assinatura`, `agro` |Para `viagem`: `EditorialShowcaseView` (Hero cinematográfico, timeline de roteiro, voos, hotelaria). Para demais nichos: Cabeçalho Editorial Magazine com selo curatorial, tipografia de destaque, narrativa expandida e galeria em destaque antes das especificações. | Para `viagem`: `EditorialShowcaseView` em modo compacto (`previewViewport="mobile"`, 1 coluna, carrossel e barra inferior). Para demais nichos: Hero vertical editorial com narrativa prioritária e destaques visuais. |
| `automotivo` | `veiculo`, `agro` | Cockpit Automotivo: Strip superior de telemetria rápida (Ano, KM, Câmbio, Combustível), destaque de procedência/opcionais e calculadora/condições de financiamento e permuta em evidência. | Strip tátil horizontal de telemetria veicular logo abaixo da foto principal + ficha técnica prioritária. |
| `imobiliario` | `imovel`, `hospedagem`, `negocio` | Planta & Patrimônio: Strip arquitetônico no topo (Área m², Quartos/Suítes, Vagas, Condomínio + IPTU mensal totalizado) e destaque para visita/proposta patrimonial. | Resumo patrimonial de métricas do imóvel em destaque acima das abas + discriminação clara de pacote mensal (Aluguel/Venda + Condomínio + IPTU). |
| `resort_hotel` | `hospedagem`, `viagem` | Hospitalidade & Estadia: Painel de Check-in/Check-out, capacidade de hóspedes, regras da casa e comodidades de lazer em destaque no topo. | Card de estadia rápida (Hóspedes, Quartos, Check-in/out) + comodidades prioritárias para reserva imediata. |
| `servicos_agenda` | `servico`, `assinatura`, `equipamento` | Agenda & Credenciais Profissionais: Destaque de disponibilidade semanal, horário de atendimento, SLA de duração, modalidade (presencial/online/domicílio) e CTA prioritário de agendamento. | Banner compacto de disponibilidade e agenda com botão tátil imediato de agendamento/orçamento. |
| `conveniencia` | `mercado`, `gastronomia`, `farmacia`, `desapego` | `ConvenienceShowcaseView` (Layout de catálogo/delivery rápido 2 colunas com seletor de quantidade, maturação/corte, descontos progressivos e pedido em 3 toques). | `ConvenienceShowcaseView` com `previewDevice="mobile"` (1 coluna compacta nativa de delivery). |

---

## 3. Isolamento do Device Mockup Chassis vs Viewport Renderer

1. **Device Mockup Chassis:** Responsável exclusivamente pela moldura visual externa (`390px` no Mobile com barra de status simulada e scroll interno; `100%` / `1280px` no Desktop), sem vazar barras administrativas para dentro da superfície renderizada.
2. **Propagação Explícita de `previewViewport`:**
   - Como `@media (min-width: 1024px)` do navegador avalia a janela inteira do monitor e não a largura do container de preview, todos os renderers (`UniversalClassifiedShowcase`, `EditorialShowcaseView`, `ConvenienceShowcaseView`, `EventClassifiedShowcaseView`, `CanonicalListingView`) recebem `previewViewport?: "mobile" | "tablet" | "desktop"` e forçam a estrutura Mobile Native quando `previewViewport === "mobile"`, independentemente da largura do monitor.
