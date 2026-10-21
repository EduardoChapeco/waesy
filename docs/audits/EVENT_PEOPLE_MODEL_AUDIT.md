# EVENT_PEOPLE_MODEL_AUDIT — Auditoria de Pessoas, Organizadores, Palestrantes e Patrocinadores

## 1. Papéis Canônicos e Tratamento Visual (`src/lib/classifieds/event-domain.ts`)

| Entidade | Modelo Canônico | Papéis Suportados | Uploader & Geometria de Imagem | Vínculo Cruzado |
| :--- | :--- | :--- | :--- | :--- |
| **Organizadores & Realizadores** | `EventOrganizerEntity` (`event.organizers`) | `ORGANIZER` (Organização), `CO_ORGANIZER` (Correalização), `REALIZER` (Realização), `HOST` (Anfitrião), `SUPPORTER` (Apoio Institucional) | Seletor explícito `ORGANIZATION` (`cropShape="rect"`, `object-contain` em caixa retangular/squircle) vs `PERSON` (`cropShape="round"`, `object-cover`). | Exibe selo `"Organizador Verificado"` estritamente quando `is_verified === true` (Regra B.33). |
| **Palestrantes & Atrações** | `EventSpeakerNormalized` (`event.speakers`) | Palestrante, Painelista, Moderador, Atração Musical | `<MediaUploader>` com upload local, Ctrl+V, drag-and-drop e URL. Sincroniza `avatar_url` e `photo_url`, e `social_url` com `social_link`. | Vinculado automaticamente às atividades da `Programação` (`linked_speaker`) por `speaker_id` ou `speaker_name`. |
| **Patrocinadores & Parceiros** | `EventPartnerNormalized` (`event.sponsors`) | `realizacao`, `ouro` (`master`), `prata`, `apoio`, `parceiro_midia` | `<MediaUploader cropShape="rect" aspect={16/9}>` com renderização `object-contain` sem corte circular. | Agrupados por hierarquia de cota na seção `#section-parceiros`. |
