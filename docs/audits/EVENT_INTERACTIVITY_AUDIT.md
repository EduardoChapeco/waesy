# EVENT_INTERACTIVITY_AUDIT — Auditoria de Enquetes, Agenda, Mural e SDR Contextual

## 1. Subsistemas Interativos do Evento

| Subsistema | Motor / Função | Ciclo de Vida e Regras |
| :--- | :--- | :--- |
| **Enquetes com Agendamento (`EventPollNormalized`)** | `resolveEffectivePollState` + `voteClassifiedEventSurvey` | Suporta opções em `string[]` (editor) ou `object[]`, avaliando `opens_at`, `closes_at` e `is_active` para transicionar entre `SCHEDULED` (`Abre em DD/MM`), `OPEN` (`Votação Aberta`) e `CLOSED` (`Votação Encerrada`). |
| **Salvar na Agenda (`buildEventCalendarLinks`)** | Menu dropdown em `EventClassifiedShowcaseView` | Oferece 3 opções reais: **Google Calendar**, **Outlook Calendar** e **Apple Calendar / Baixar `.ics`** (RFC 5545 com `TZID=America/Sao_Paulo`, acentuação UTF-8, descrição completa e link oficial). |
| **Mural de Participantes & Depoimentos** | `getClassifiedEventPublicWall` + `submitClassifiedEventTestimonial` | Exibe lista de participantes confirmados e avaliações verificadas sem dados fictícios (Regra B.33). |
| **Portaria & Validador QR (`WCTS-1`)** | `verifyClassifiedTicketByCode` + `validateTicketCheckin` | Permite validar códigos `WSY-EVT-...` e `W-TKT-...` diretamente no modal de portaria com registro de check-in para o organizador. |
| **Agente SDR Contextual** | `AiSdrChat` em `_store.classificados.$id.tsx` | Responde dúvidas de participantes com contexto do evento, datas, local e lotes quando `ai_agent_enabled === true`. |
