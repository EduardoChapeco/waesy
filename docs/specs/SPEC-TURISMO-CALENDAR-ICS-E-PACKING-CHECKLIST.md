# SPEC-TURISMO-CALENDAR-ICS-E-PACKING-CHECKLIST: Sincronização iCalendar (.ics) e Checklist Inteligente de Mala Pré-Embarque no Portal do Viajante

> **Status:** APROVADO PARA IMPLEMENTAÇÃO  
> **Data:** 24 de Outubro de 2026  
> **Autor:** Antigravity Architect Core  
> **Normas Relacionadas:** `AGENTS.md` (B.1 a B.41), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md` (DL-01 a DL-30)  
> **Benchmark de Engenharia Reversa (REA):** `itskovacs/trip`, `mauriceboe/TREK` e `davinoishi/my-trip-planner`  

---

## 1. Problema e Motivação
No ecossistema atual de turismo do Waesy:
1. O viajante recebe os vouchers e itinerário em PDF ou tela, mas não possui ferramenta nativa para exportar datas de voos, check-in de hotel e passeios diretamente para a agenda do celular (Google Calendar, Apple Calendar, Outlook).
2. O portal do viajante (`/viajante/viagem/$id`) exibe regras de bagagem, mas não oferece checklist interativo de mala (*packing list*) para conferência tátil pré-embarque antes da partida, padrão existente nos principais ecossistemas open-source do GitHub (`itskovacs/trip` e `TREK`).

---

## 2. Requisitos Estruturados (Sintaxe EARS)

### REQ-ICS-01: Geração de Calendário RFC 5545 (.ics) (EARS-CalendarExport)
- **QUANDO** o viajante clicar no botão "Adicionar ao Calendário" no Portal do Viajante,
- **O SISTEMA DEVE** gerar um arquivo no formato iCalendar (`.ics`) contendo:
  - Evento de Voo de Ida: `DTSTART`, `DTEND`, `SUMMARY` com número do voo e rota (`GRU -> MCZ`), `DESCRIPTION` com localizador PNR e franquia de bagagem, e `LOCATION` com aeroporto de saída.
  - Evento de Voo de Retorno (se houver).
  - Evento de Hospedagem: Período da estadia com horário de check-in (14:00) e check-out (12:00), `SUMMARY` com nome do hotel/resort, endereço e código de reserva.
- **ENTÃO O SISTEMA DEVE** disparar o download imediato do arquivo com nome `viagem-{codigoReserva}.ics`, compatível com importação universal em iOS, Android e desktop.

### REQ-PAK-01: Checklist Inteligente de Bagagem Pré-Embarque (EARS-SmartPacking)
- **QUANDO** o viajante acessar a aba "Apresentação de Pré-Embarque" ou "Resumo",
- **O SISTEMA DEVE** renderizar o componente `SmartPackingChecklist` categorizado em:
  1. *Documentos & Financeiro* (RG/Passaporte, vouchers, cartões, seguro viagem).
  2. *Eletrônicos & Acessórios* (carregador, powerbank, adaptador de tomada universal).
  3. *Vestuário & Conforto* (roupas de voo, calçados adequados, casaco leve).
  4. *Saúde & Farmácia* (remédios de uso contínuo, protetor solar, repelente).
  5. *Higiene & Bagagem de Mão* (frascos até 100ml, almofada de pescoço).
- **O SISTEMA DEVE** permitir marcar/desmarcar itens com persistência local no navegador (`LocalStorage` com chave vinculada ao ID da viagem).
- **O SISTEMA DEVE** permitir a inclusão de itens personalizados pelo viajante via campo de input e tecla Enter.
- **O SISTEMA DEVE** calcular dinamicamente a barra de progresso (ex: "12 de 18 itens prontos — 67%").

### REQ-A11Y-01: Piso Ergonômico de 44px e Design Tokens (EARS-DesignFloor)
- **UBÍQUO:** Todos os checkboxes, botões de ação e campos de texto DEVEM respeitar a altura mínima de 44px (`h-11 min-h-11`), foco teclado explícito `:focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`, sem classes arbitrárias com colchetes e consumindo unicamente tokens semânticos.

---

## 3. Matriz de Arquivos Afetados

| Arquivo | Ação | Responsabilidade |
| :--- | :--- | :--- |
| `src/services/travel-calendar-export.ts` | Criação | Utilitário puro de geração de arquivo `.ics` RFC 5545 para voos e hotéis |
| `src/components/tourism/boarding/smart-packing-checklist.tsx` | Criação | Componente de checklist tátil de bagagem com persistência local |
| `src/routes/viajante.viagem.$id.tsx` | Modificação | Inclusão do botão de calendário no cabeçalho e integração do checklist |

---

## 4. Critérios de Aceite
1. Download do arquivo `.ics` funcional com estrutura RFC 5545 válida.
2. Checklist de mala com marcação, persistência no `LocalStorage` e adição de itens.
3. 100% de conformidade com o Design Lint (zero novas violações P0/P1).
4. Catraca de CI (`node scripts/design-lint.mjs --ratchet`) aprovada com Exit Code 0.
