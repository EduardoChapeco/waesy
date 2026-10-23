# ESPECIFICAÇÃO DE DESIGN MOBILE NATIVE DO RADAR COMERCIAL
## COMPACT LAYOUT (< 600px) • GAVETAS TÁTEIS • SAFE-AREA • WAESY
### Data: 2026-10-21 • Versão: 1.0-PROD • Baseline: Production

---

## 1. Visão Geral da Arquitetura Mobile Native

Em viewports móveis (< 600px), tentar espremer 5 colunas horizontais de um Kanban desktop em uma tela de smartphone é um erro grave de usabilidade que destrói a legibilidade.

A versão Mobile Native do Radar Comercial bifurca a experiência para o padrão **App-Like Tátil**:
1. **Régua de Abas Horizontais Contínuas (Padrão TikTok/Instagram):** Abas em linha única com scroll elástico (`flex flex-nowrap overflow-x-auto no-scrollbar`), permitindo alternar instantaneamente entre etapas (`Novos`, `Com Oferta`, `Em Contato`).
2. **Lista Vertical de Cards Squircles:** Cards com largura total (100%), affordance de toque proeminente e informações verticais bem espaçadas.
3. **Bottom Action Sheet Desobstruída:** Ao tocar no card, abre uma gaveta inferior nativa com padding superior defensivo de safe-area, botão de fechar abaixo do entalhe de hardware e ações táteis com no mínimo 44px de altura.

```
┌───────────────────────────────────────┐
│ 16:20 📶 🔋                          │
│ [Radar Comercial]                🔍 ➕ │
├───────────────────────────────────────┤
│ (Com Oferta 8) (Novos 12) (Em Espera) │  <- Régua Deslizante Snap
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ CARLOS SILVA                  92% │ │
│ │ Punta Cana All Inclusive          │ │
│ │ 12 a 19 Nov • 2 adultos           │ │
│ │ 15x de R$ 856 no boleto ou cartão │ │
│ │                                   │ │
│ │ [📱 WhatsApp]    [📋 Ver Detalhe] │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ JULIANA MENDES                88% │ │
│ │ Maceió • Jatiúca Resort           │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ [🏠 Home]   [✈️ Turismo]   [⚙️ Ajustes]│
└───────────────────────────────────────┘
```

---

## 2. Invariantes de Interface Mobile Atendidas

### 2.1. Desobstrução de Safe-Area (Invariante B.34)
Em dispositivos com entalhe de câmera (notch) ou Dynamic Island:
- O modal e a gaveta inferior aplicam padding defensivo:
  `pt-[max(1.25rem,env(safe-area-inset-top))]`.
- O botão de fechar (`<X>`) fica posicionado abaixo da safe-area:
  `top-[max(1rem,env(safe-area-inset-top))]`.
- A barra de navegação inferior respeita `pb-safe` para evitar sobreposição da barra de gestos do iOS/Android.

### 2.2. Deconflito de Z-Index (Invariante B.34)
- A barra de ações flutuante da página opera em **`z-30`**.
- O backdrop do modal e o drawer operam em **`z-50`**, garantindo que o diálogo cubra 100% da viewport e bloqueie qualquer interação residual com o fundo da tela.

### 2.3. Piso Tátil Universal de 44px (Invariante B.26 e DL-14)
Todos os botões de ação ("Chamar no WhatsApp", "Promover ao CRM", "Adiar Contato") possuem altura mínima exata de **44px (`h-11 min-h-11`)**, garantindo acionamento seguro com o polegar sem erros de toque.

---

## 3. Ações Rápidas Mobile com 1 Toque (Quick Actions)

No card mobile, o corretor dispõe de botões imediatos de atalho:
- **`Botão WhatsApp`:** Abre diretamente o aplicativo oficial via `https://wa.me/5549998123456?text=...` com a cópia comercial personalizada já pré-carregada na caixa de texto.
- **`Botão Copiar Mensagem`:** Copia a abordagem para a área de transferência emitindo toast tátil de confirmação.
- **`Botão Promover`:** Dispara a modal de confirmação de envio ao CRM com formulário adaptado para polegar.
