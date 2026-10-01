# ia/13-design-conversa.md — UX da Experiência Conversacional: Engenharia Reversa de Referência

**Data:** 2026-09-30  
**Status:** Aprovado e Normativo (DEC-031)  
**Escopo:** Design System Conversacional, Chat Multi-Shell e Blocos Estruturados  
**Referências de Engenharia Reversa:** Linear, Apple HIG, WhatsApp Minimalist, Framer, Figma  

---

## 1. FASE A — Engenharia Reversa Estrutural

A estética "limpa" observada em referências como Linear, Apple HIG e Framer decorre de disciplina estrutural mecânica, não de ornamentação. O chat do Waesy adota estes princípios comparados aos contra-exemplos correntes no mercado.

| Princípio Estrutural | Regra Canônica Waesy | Contra-Exemplo Proibido (AI-Smell / Mercado Comum) |
|---|---|---|
| **Hierarquia e Ponto Focal** | Apenas 1 ação primária (`variant="default"`) por mensagem/bloco. O restante é neutro (`outline` ou `ghost`). | Botões múltiplos coloridos com cores conflitantes (ex: botão verde "Comprar", botão azul "Ver Detalhes", botão laranja "Falar com Atendente" na mesma bolha). |
| **Contenção Textual** | Títulos diretos de no máximo 6 palavras. Informações explicativas da própria interface são sumariamente banidas. | Mensagens prolixas: *"Olá! Sou o assistente de IA da loja e estou aqui para te ajudar com suas dúvidas! Veja abaixo o seu pedido:"* |
| **Uso da Grade e Respiro** | Grade modular estrita de 4px/8px. Alvos de toque de 44px (`h-11`) no mobile. Compacto com margem limpa (`px-0` a `px-3`). | Espaçamentos aleatórios com classes arbitrárias (`p-[13px]`, `w-[317px]`), touch targets minúsculos de 28px ou 32px. |
| **Física de Movimento** | Micro-interações instantâneas (150ms a 200ms), com curvas de aceleração padrão (`cubic-bezier(0.16, 1, 0.3, 1)`), respeitando `prefers-reduced-motion`. | Animações decorativas lentas, saltos tipo "bounce" circense, confetes ou rotações desnecessárias. |
| **Consistência de Superfícies** | Superfícies com elevação neutra em 3 camadas: Canvas (`bg-background`) → Bolha/Card (`bg-card` / `bg-muted/40`) → Controles flutuantes (`shadow-2xs`, sem sombras projetadas difusas). | Gradientes multicoloridos, bordas neon, fundos com glassmorphism artificial (`backdrop-blur-md bg-white/20`) ilegíveis em dark mode. |

---

## 2. FASE B — Design do Chat nos Dois Shells

O chat opera em dois shells distintos:
1. **Shell Compacto (< 600px):** Otimizado para visualização vertical, operação com uma mão (Thumb Zone) e densidade de leitura do cliente final (`_store.conta.conversas.$id.tsx`).
2. **Shell Expandido (>= 840px):** Layout em 3 colunas para operadores e gestores de loja, com lista de conversas, área de mensagens e painel lateral Customer 360 (`workspace.atendimento.index.tsx`).

### Especificação de Elementos Anatômicos

| Elemento | Shell Compacto (< 600px) | Shell Expandido (>= 840px) | Token Semântico / Regra |
|---|---|---|---|
| **Largura de Medida** | `max-w-[85%]` para texto; `max-w-[95%]` para widgets estruturados. | `max-w-xl` ou `max-w-2xl` centrado ou alinhado com trilha de atividade. | Proibido esticar bolhas em 100% da largura de tela em telas largas. |
| **Altura de Linha (Leading)** | `leading-relaxed` (1.625) em corpo de mensagem `text-xs` ou `text-sm`. | `leading-relaxed` em corpo de mensagem `text-sm`. | Garantia de legibilidade continuada sem fadiga visual. |
| **Agrupamento de Mensagens** | Mensagens consecutivas do mesmo remetente agrupadas com raio reduzido no vértice contíguo (`rounded-2xl` com `rounded-tr-xs` ou `rounded-tl-xs`). | Mensagens com cabeçalho de remetente compacto apenas na primeira do bloco agrupado. | Redução de poluição visual e eliminação de avatares repetidos. |
| **Separador de Data e Tempo** | Pill centralizada sutil: `text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full`. | Pill centralizada horizontal com linhas divisórias de grade de 1px `border-border/40`. | Marcação temporal clara com `formatDate` e timezone local. |
| **Status de Envio & Ticks** | 1 check (`Check`) para enviado, 2 checks (`CheckCheck text-primary`) para lido/entregue. | 1 check para enviado, 2 checks para entregue, horário em monoespaçado sutil. | Ícones Phosphor/Lucide de 14px com contraste AA. |
| **Indicador de Digitação** | 3 pulsos sincronizados (`animate-pulse`) ou texto sutil *"Digitando..."* na barra superior. | Trilha com animação discreta de presença e canal realtime broadcast. | Sem animações intrusivas na área de mensagens. |
| **Composer e Botão "+ / Anexar"** | Botão `size-11` (44px), `Paperclip` ou `Plus`, input elástico com foco acessível e botão Enviar `size-11`. | Barra inferior com atalhos de teclado (`Ctrl+Enter` para enviar), botões de bloco rápido e templates de resposta. | Touch target mínimo de 44x44px (`h-11`) universal. |
| **Mensagens de Erro & Reenvio** | Alerta inline discreto com botão de reenvio manual (`onRetry`) sem perder o rascunho. | Banner sutil de falha de conexão com retry automático e opção manual. | Nunca descartar texto digitado pelo usuário em falha de rede. |

---

## 3. FASE C — Catálogo de Blocos Estruturados no Chat

Cada bloco inserido no chat atua como um mini-aplicativo determinístico, renderizado via `StructuredMessageView`:

```
┌────────────────────────────────────────────────────────┐
│ Cabeçalho do Bloco: Ícone + Título Curto + Badge Tipo │
├────────────────────────────────────────────────────────┤
│ Corpo de Dados: Lista / Tabela / Carrossel / Formulário│
├────────────────────────────────────────────────────────┤
│ Rodapé de Ação: 1 Ação Primária + Ação Secundária      │
└────────────────────────────────────────────────────────┘
```

### Matriz dos 14 Blocos Estruturados

1. **`order_tracker`:** Progresso de pedido em 5 fases lineares (`Recebido`, `Confirmado`, `Em Preparo`, `Em Rota`, `Entregue`), valor e endereço de entrega.
2. **`product_card`:** Thumbnail 1:1, título em 2 linhas, preço destacado em fonte mono, botão primário "Adicionar ao Pedido" e link secundário para vitrine.
3. **`proposal_card`:** Proposta comercial/orçamento, valor total, validade e botão de ação primária "Aceitar Proposta".
4. **`table`:** Dados tabulares compactos com cabeçalho sombreado sutil e rolagem horizontal suave (`no-scrollbar`).
5. **`metric_widget`:** Cartão métrico com valor numérico puro, variação percentual neutra e rótulo sem redundância.
6. **`task_card`:** Item de tarefa ou pendência com status (`pending`, `completed`), prioridade e ação.
7. **`vertical_ai_result`:** Resultado estruturado de inteligência artificial de RH, Contábil, Financeiro ou Jurídico, com confiança percentual e badge de "Revisão Humana".
8. **`card_carousel`:** Carrossel horizontal de cartões com scroll snap (`snap-x snap-mandatory`), botões de navegação e touch targets amplos.
9. **`entity_card`:** Cartão universal de entidade (empresa, prestador, estabelecimento local) com avatar, status de atendimento e ação de contato.
10. **`inline_form`:** Formulário conversacional embutido na mensagem para preenchimento de campos essenciais (ex: CPF, observação de entrega) sem modal intrusivo.
11. **`poll`:** Enquete rápida com opções selecionáveis em clique único e contagem de votos.
12. **`event_card`:** Evento da comunidade com data, local, horário e botão de RSVP / Ingressos.
13. **`job_card`:** Vaga de emprego com regime (CLT/PJ), faixa salarial, local e botão "Candidatar-se".
14. **`financial_entry`:** Lançamento de conta a pagar/receber com valor formatado, vencimento e botão "Conciliar / Aprovar".

---

## 4. FASE D — Matriz de Estados e Movimento

Todas as superfícies conversacionais e blocos implementam a matriz completa de 5 estados:

| Estado | Comportamento Visual | Gatilho / Transição |
|---|---|---|
| **Carregando (Skeleton)** | Pulso neutro `bg-muted animate-pulse rounded-xl` respeitando as dimensões exatas do bloco. Zero layout shift. | Enquanto dados assíncronos ou inferência de IA estão em processamento. |
| **Vazio (Empty)** | Ícone sutil `text-muted-foreground/40`, mensagem concisa de 1 linha e CTA claro de recuperação. | Busca sem resultados, thread sem mensagens anteriores. |
| **Erro (Error)** | Borda sutil de alerta `border-destructive/40 bg-destructive/5`, descrição do erro e botão "Tentar novamente". | Falha de rede, timeout de Server Function ou rejeição de payload. |
| **Preenchido (Filled)** | Bloco estruturado renderizado conforme contratos de tipagem Zod e tokens semânticos. | Resposta válida recebida e validada. |
| **Parcial / Streaming** | Renderização progressiva de texto com cursor intermitente (`inline-block w-1.5 h-3.5 bg-primary animate-pulse ml-0.5`). | Mensagem chegando via SSE/Realtime broadcast. |

---

## 5. FASE E — Acessibilidade, Piso WCAG 2.2 AA e Prova

1. **Leitura por Screen Readers:** Mensagens novas são anunciadas automaticamente através de contêiner com `role="log"` e `aria-live="polite"`.
2. **Navegação por Teclado:** Todos os blocos e botões de ação possuem `:focus-visible` com anel de foco destacado (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`).
3. **Alvos de Toque:** Todo botão e controle de ação possui dimensão mínima de 44x44px (`h-11` ou `size-11`) no shell compacto mobile.
4. **Contraste de Cores:** Relação de contraste mínima de 4.5:1 em todos os textos sobre fundos claro/escuro e 3:1 em bordas e controles interativos.
5. **Redução de Movimento:** Animações e pulsos utilizam `motion-safe:animate-...`, respeitando a preferência de acessibilidade do sistema operacional.
