# SPEC-CHAT-HUB-OMNICHANNEL-REENGINEERING: Horários de Atendimento por Setor & Chat Hub Omnichannel 4.0

## 1. Contexto e Objetivos

O ecossistema Waesy integra atendimento comercial e suporte multicanal para lojas, prestadores de serviços e membros da comunidade.
Esta especificação consolida:
1. **Exibição de Horários de Atendimento & SLA/Tempo de Resposta por Setor no Perfil Público da Loja** (`canonical-store-profile-view.tsx`).
2. **Evolução Arquitetural do Chat Hub Central & WhatsApp Omnichannel 4.0** (`workspace.atendimento.index.tsx` e `chat.functions.ts`), incluindo:
   - Sinalizador visual da Janela Ativa de 24 Horas da Meta Cloud API (WhatsApp Session Window).
   - Modo Whisper (Notas Internas de Atendimento para Supervisão & Gestão Assistida).
   - Card e Acesso Direto a Tickets SAC / Suporte vinculados (#TCK-XXXX).
   - Atalhos de Mensagens Rápidas / Macros (Slash Commands `/`).
   - Conformidade estrita com o Design Bidirecional, grade de 4px (DL-03), cantos arredondados canônicos `rounded-lg` (DL-09) e alvos táteis mínimos de 44px (DL-14).

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Exibição de Setores no Perfil Público (Canonical Store Profile)

- **EARS-01 [Ubíquo]**: The system SHALL render a dedicated "Atendimento por Setores & Tempo de Resposta" block in the "Sobre" tab of `canonical-store-profile-view.tsx`.
- **EARS-02 [Orientado a Estado]**: WHILE rendering store departments, the system SHALL display each department's name, operating hours (e.g., "08:00 às 18:00", "Plantão 24h"), average response time badge (e.g., "Geralmente responde em 10 min", "Até 1h"), and real-time open/closed status.
- **EARS-03 [Orientado a Evento]**: WHEN the customer clicks the action button for a department (e.g., "Falar com Vendas", "Falar com Suporte"), the system SHALL initiate the conversation routed directly to the selected department or open WhatsApp with an automated routing greeting.
- **EARS-04 [Comportamento Indesejado]**: IF the store does not have custom department schedules explicitly configured in `settings`, THEN the system SHALL synthesize normalized standard departments based on the store's primary niche and working hours without rendering empty or broken containers.

### 2.2 Chat Hub Central & WhatsApp Omnichannel 4.0 (Workspace Atendimento)

- **EARS-05 [Orientado a Estado]**: WHILE an active thread with a customer is selected, the system SHALL display the WhatsApp 24h Conversation Window badge indicating whether the window is open (freeform text allowed) or closed (HSM template required).
- **EARS-06 [Orientado a Evento]**: WHEN the attendant toggles "Modo Whisper / Nota Interna", the system SHALL switch the input styling to an amber supervisory aesthetic, and messages sent in this mode SHALL be recorded as internal notes invisible to the customer.
- **EARS-07 [Orientado a Estado]**: WHILE a conversation has a linked support ticket (#TCK-XXXX) or order (#ORD-XXXX), the system SHALL render interactive quick badges in the header allowing 1-click inspection and resolution modal launch.
- **EARS-08 [Orientado a Evento]**: WHEN the attendant types `/` in the message composer, the system SHALL display a quick-reply macro picker (e.g., `/ola`, `/pix`, `/horarios`, `/endereco`, `/rastreio`).
- **EARS-09 [Ubíquo]**: The system SHALL maintain strict bidirectional layout integrity (compact mobile app feel and expanded desktop system feel) with zero arbitrary Tailwind brackets and zero `!important`.

---

## 3. Invariantes de Design e Governança

1. **DL-03**: Todos os paddings e margens devem respeitar a grade estrita de 4px (`p-3`, `p-4`, `p-5`, `gap-2`, `gap-3`, etc.).
2. **DL-09**: Todas as superfícies e cartões devem utilizar exclusivamente `rounded-lg` (token canônico de 12px).
3. **DL-14**: Todos os botões, gatilhos e seletores devem possuir altura mínima de 44px (`h-11 min-h-11` ou `h-10` com target touch defensivo em áreas compactas).
4. **DL-15**: Todos os elementos clicáveis devem declarar anel de foco teclado `:focus-visible:ring-2`.
5. **Zero Falsos-Positivos**: Nenhuma imagem sintética ou dados mockados. Fallbacks devem ser honestos e tipográficos.

---

## 4. Critérios de Aceite

1. `canonical-store-profile-view.tsx` renderiza o bloco "Atendimento por Setor" com badge de tempo de resposta e status aberto/fechado por departamento.
2. `workspace.atendimento.index.tsx` possui indicador de Janela WhatsApp 24h, alternador de Modo Whisper (nota interna) e atalhos rápidos `/`.
3. `npm run typecheck` com Exit Code 0.
4. `scripts/design-lint.mjs` sem violações P0/P1 novas.
5. `npm run build` gerando assets e worker com Exit Code 0.
