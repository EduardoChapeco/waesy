# EVENT_EDITOR_INFORMATION_ARCHITECTURE — Arquitetura de Informação do Criador de Eventos

## 1. Estrutura Modular do Editor de Eventos (`niche.id === "evento"`)

| Ordem | Grupo Funcional | Campos e Controles Canônicos | Regras de Isolamento Semântico (Invariante B.37) |
| :--- | :--- | :--- | :--- |
| **1** | **Identidade & Conteúdo Editorial** | Título completo, Subtítulo/Resumo, Descrição rica, Tags, AI Writing Copilot Sheet (`AiWritingCopilotSheet`). | Sem campos de estado de conservação ou troca/permuta de produtos físicos. |
| **2** | **Mídia Oficial Separada** | 1. **Capa Hero (16:9 / 21:9)** (`eventBannerUrl`); 2. **Galeria Exclusiva do Evento** (`images`); 3. **Story Vertical (9:16)** (`eventStoryUrl` + `eventStoryAutoOpen`); 4. **Vídeo / Aftermovie** (`eventVideoUrl`). | Funções claramente separadas entre capa principal, galeria de fotos e story vertical. |
| **3** | **Datas, Horários & Fuso** | Data de início (`eventDate`), Data de término (`eventEndDate`), Abertura dos portões (`eventGatesOpenTime`), Horário de início (`eventStartTime`), Encerramento (`eventEndTime`), Timezone (`America/Sao_Paulo`). | Suporte nativo a eventos de dia único e múltiplos dias (`is_multi_day`). |
| **4** | **Localização & Pontos de Acesso** | Nome do Espaço/Venue (`eventVenueName`), Endereço completo (`eventVenueAddress`), Cidade/UF, Coordenadas GPS e múltiplos `eventAccessPoints` (Portaria, Credenciamento, Estacionamento, VIP, PCD). | Link direto para Google Maps priorizando coordenadas quando disponíveis. |
| **5** | **Organizadores & Realizadores** | Nome da Entidade/Anfitrião (`eventHostName`), Papel (`eventHostRole`), Seletor `Logo (Retangular)` vs `Pessoa (Circular)` (`eventHostEntityType`), `<MediaUploader>`, WhatsApp e lista de Correalizadores (`eventOrganizers`). | Logos institucionais preservam proporção retangular sem corte circular forçado. |
| **6** | **Ingressos, Categorias & Lotes** | Lista de `eventTicketTiers` com Nome, Preço (`0 = GRÁTIS`), Status (`Disponível`, `Agendado`, `Esgotado`), Regra de Elegibilidade (`Exclusivo para associados ACIC`) e Link Externo opcional. | Sincronização automática de `price` e `price_cents`. |
| **7** | **Programação & Cronograma** | Atividades por horário e dia com Título, Palco/Sala (`stage_or_room`), Palestrante Vinculado (`speaker_name`) separado da Descrição (`description`) e flag de Intervalo/Coffee. | Vínculo automático com o cadastro de Palestrantes. |
| **8** | **Palestrantes & Atrações** | Nome, Cargo, Empresa/Instituição, `<MediaUploader>` para Foto, LinkedIn/Rede Social e Biografia integral. | Sem truncamento de biografia na vitrine pública. |
| **9** | **Patrocinadores & Apoiadores** | Nome da Marca, Cota (`Master`, `Ouro`, `Prata`, `Apoio`), `<MediaUploader cropShape="rect">` para Logomarca e Site oficial. | Agrupamento automático por hierarquia de cota na página pública. |
| **10** | **Enquetes & Políticas** | Enquetes interativas com opções dinâmicas + Políticas de Reembolso, Meia-Entrada, Acessibilidade PCD e Estacionamento. | Seções vazias são omitidas dinamicamente na vitrine pública (Regra B.33). |
