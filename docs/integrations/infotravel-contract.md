# Contrato Oficial InfoTravel API (OpenAPI 3.0.1) — Waesy / Turis

- **Fonte Oficial Canônica:** `https://developers.infotravel.com.br/openapi.json` (`OpenAPI 3.0.1`, Infotera / InfoTravel API v1.0)
- **Padrão de URL Base por Operadora:** `https://{domain}/infotravel/api/v1` (onde `{domain}` é o domínio dedicado da operadora fornecido pela Infotera — ex.: Orinter, FRT, Incomum, Cativa, BeFly, Confiança, Schultz, EHTL).

---

## 1. Mapeamento dos 6 Blocos Oficiais da API InfoTravel

### Bloco 1 — Autenticação & Gestão de Token (`Authentication`)

| Método e Rota Oficial | Payload de Requisição (`AuthenticationRQ`) | Payload de Resposta (`ApiToken`) | Regras de Ciclo de Vida & Renovação |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/authenticate` | `{"username": "...", "password": "...", "client": "SEU_CLIENT", "agency": "2"}` | `{"accessToken": "uuid-opaco", "type": "Bearer", "expire_seconds": 86400}` | Token opaco enviado via `Authorization: Bearer {accessToken}` em todos os endpoints. Cache persistente por `(store_id, operator_id)` com TTL `expire_seconds - 300s` e renovação *single-flight* automática ao receber HTTP `401`. |

### Bloco 2 — Utilitários, Motor de Busca & Catálogo Estático (`Utility`, `Search Engine`, `Company`, `Package`)

| Método e Rota Oficial | Parâmetros Oficiais | Schema de Resposta | Finalidade Operacional |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/utility/county/{countyName}` | `countyName` (path*) | `CountySearchRS` (`counties[]`) | Resolução de código numérico de destino (`destination`) e UF/país por nome de cidade. |
| `GET /api/v1/utility/hotelDetail/{keyDetail}` | `keyDetail` (path*), `product` (`HOTEL` \| `HOUSE`) | `HotelDetailRS` (`hotel`: `ApiHotel` com `images[]`, `facilities[]`, `descriptions[]`, `policies[]`, `coordinates`, `stars`) | Ficha técnica estática completa do hotel, fotos de alta resolução (`large`, `medium`, `standard`) e comodidades. |
| `GET /api/v1/utility/hotel/{keyDetail}/reviews` | `keyDetail` (path*) | `HotelDetailRS` / `HotelReviewsRS` | Avaliações reais verificadas do hotel. |
| `GET /api/v1/utility/coupon/{cdCupom}` | `cdCupom` (path*) | `ApiCoupon[]` | Validação de cupom promocional da operadora. |
| `GET /api/v1/utility/contract/{idReserva}` | `idReserva` (path*) | `Contract[]` | Contratos vinculados à reserva. |
| `GET /api/v1/searchEngine/package/{packageType}/origin` | `packageType` (`hotel`, `hotel_flight`), `name`, `origin`, `iata` | `MotorPacote` (`origins[]`) | Origens disponíveis para pacotes e bloqueios da operadora. |
| `GET /api/v1/searchEngine/package/{packageType}/destination` | `packageType` (`hotel`, `hotel_flight`), `origin`, `originIata` | `MotorPacote` (`destinations[]`) | Destinos disponíveis a partir de uma origem para pacotes/bloqueios. |
| `GET /api/v1/searchEngine/package/{packageType}/period` | `packageType`, `origin`, `destination`, `originIata`, `destinationIata` | `MotorPacote` (`periods[]`, `durationDaysOptions[]`) | Períodos e saídas de bloqueios disponíveis. |
| `GET /api/v1/searchEngine/allottedDates/flight` | `iata`, `destinationIata`, `key` | `DatasBloqueioAereo` (`goingDate`, `returnDateList[]`) | Datas exatas de bloqueios/fretamentos aéreos. |
| `GET /api/v1/package/{idPacote}` | `idPacote` (path*) | `Pacote` | Detalhes estáticos e roteiro (`roadMap`) de pacote por ID. |
| `GET /api/v1/company` | — | `CompanyRS` | Dados cadastrais da agência/empresa autenticada no ambiente InfoTravel. |

### Bloco 3 — Disponibilidade e Tarifação (`Availability`)

> **Formato Canônico de Ocupação (`occupancy`):** Array de strings no formato `adultos[-idadeCrianca1[,idadeCrianca2]]`. Exemplo: 2 adultos + crianças de 9 e 4 anos = `occupancy=2-9,4`. Múltiplos quartos: `occupancy=2-9,4&occupancy=2`.

| Vertical | Método e Rota Oficial | Parâmetros Query/Path Oficiais | Schema de Resposta Oficial | Chave de Tarifação (`key`) |
| :--- | :--- | :--- | :--- | :--- |
| **Hotéis** | `GET /api/v1/avail/hotel` | `start` (`YYYY-MM-DD`), `end` (`YYYY-MM-DD`), `occupancy` (array), `destination` (int), `destinationType`, `hotel` (int), `keyDetail`, `giataCode`, `latitude`, `longitude`, `nationality`, `integrationId`, `supplierTimeoutSeconds`, `paged`, `page`, `size`, `sort` | `HotelAvailbilityRS` (`hotelAvail[]` -> `ApiHotelAvail`: `provider`, `hotel`, `lowestFare`, `roomGroups[].rooms[]` -> `ApiRoom`) | `room.key` (em `roomGroups[].rooms[].key`) |
| **Voos** | `GET /api/v1/avail/flight` | `start`, `end`, `origin` (IATA), `destination` (IATA), `occupancy` (array), `baggage`, `flightClass` (`ECONOMIC`, `EXECUTIVE`, etc.), `stops`, `airlines`, `isCombinedFlight`, `nationality`, `integrationId`, `supplierTimeoutSeconds`, `paged`, `page`, `size`, `sort` | `FlightAvailbilityRS` (`flightAvail[]` -> `ApiFlightAvail`: `provider`, `routes[].flights[]` -> `ApiFlight` com `key`, `segments[]`, `fares[]`, `fareFlight`) | `flight.key` / `fareFlight.key` |
| **Pacotes & Bloqueios** | `GET /api/v1/avail/package/{packageType}` | `packageType` (path*: `hotel`, `hotel_flight`, `dynamic`, `hotel_bus`, `flight_service`, `service_bus`), `start`, `end`, `occupancy`, `origin`, `originIata`, `originType` (`M`\|`A`), `destination` (int*), `destinationIata`, `destinationType` (`M`\|`A`), `packageId`, `keyDetail`, `supplierTimeoutSeconds`, `paged` | `PackageAvailbilityRS` (`packageAvails[]` -> `ApiPackageAvail`: `package`, `hotelAvails[]`, `flightAvails[]`, `transferAvails[]`, `tourAvails[]`, `ticketAvails[]`, `insuranceAvails[]`) | `package.key` + `key` de cada componente selecionado |
| **Atividades / Passeios** | `GET /api/v1/avail/activity` | `start`, `end`, `occupancy`, `destination` (int), `destinationType`, `activity` (int), `nationality`, `provider`, `supplierTimeoutSeconds`, `paged`, `page`, `size`, `sort` | `TourAvailbilityRS` (`tourAvail[]` -> `ApiTourAvail`: `tour`, `dates[]`, `fares[]`, `modalities[]`, `cancellationPolicies`) | `tour.key` |
| **Ingressos / Tickets** | `GET /api/v1/avail/ticket` | `start`, `end`, `occupancy`, `destination` (int), `destinationType`, `ticket` (int), `keyDetail`, `key`, `isNotDetailed`, `supplierTimeoutSeconds`, `paged` | `TicketAvailbilityRS` (`ticketAvail[]` -> `ApiTicketAvail`: `ticket`, `dates[]`, `fares[]`, `modalities[]`, `cancellationPolicies`) | `ticket.key` |
| **Transfers / Traslados** | `GET /api/v1/avail/transfer` | `start`, `end`, `occupancy`, `origin` (int), `originType`, `destination` (int), `destinationType`, `hourStart`, `hourEnd`, `type`, `isPackage`, `supplierTimeoutSeconds`, `paged` | `TransferAvailbilityRS` (`transferAvail[]` -> `ApiTransferAvail`: `transfer`, `origin`, `destination`, `type`, `dates[]`, `fares[]`, `cancellationPolicies`) | `transfer.key` |
| **Locação de Veículos** | `GET /api/v1/avail/vehicle` | `pickUpDate`, `pickUpHour`, `pickUpLocation` (int), `pickUpLocationType`, `pickUpLocationIata`, `dropOffDate`, `dropOffHour`, `dropOffLocation` (int), `dropOffLocationType`, `dropOffLocationIata`, `driverAge`, `nationality`, `integrationId`, `supplierTimeoutSeconds`, `paged` | `VehicleAvailbilityRS` (`vehicleAvails[]` -> `ApiVehicleAvail`: `provider`, `group`, `vehicles[]` -> `ApiVehicle` com `key`, `rentalCompany`, `fareOptions[]`, `images[]`) | `vehicle.key` / `fareOptions[].key` |
| **Seguros Viagem** | `GET /api/v1/avail/insurance` | `start`, `end`, `occupancy`, `destination` (int), `destinationType`, `nationality`, `provider`, `supplierTimeoutSeconds`, `paged` | `InsuranceAvailbilityRS` (`insuranceAvail[]` -> `ApiInsuranceAvail`: `insurance` com `coverages[]`, `dates[]`, `fares[]`, `cancellationPolicies`) | `insurance.key` |
| **Circuitos** | `GET /api/v1/avail/circuit` | `integrationId`, `searchType` (`R`\|`C`), `searchCode`, `allDestiny`, `idDestinationList`, `date`, `occupancy`, `nationality`, `supplierTimeoutSeconds`, `paged` | `CircuitAvailbilityRS` (`circuitAvail[]`) -> seguido de `POST /api/v1/avail/circuit/calendar` -> `POST /api/v1/avail/circuit/daily-details` | Encadeamento obrigatório de `key` em 3 etapas |
| **Experiências / Chips / Rodoviário / Trem** | `GET /api/v1/avail/experience`, `/chip`, `/bus`, `/train`, `/vipLounge`, `/visaAndPassport`, `/servicePackage`, `/serviceOther` | `start`, `end`, `occupancy`, `origin`, `destination` | `ExperiencAvailbilityRS`, `ChipAvailbilityRS`, `BusAvailbilityRS`, `TrainAvailbilityRS`, etc. | `key` do item retornado |

### Bloco 4 — Revalidação Tarifária & Pré-Reserva Obrigatória (`CheckRate` & `Cart`)

| Método e Rota Oficial | Query Params | Payload de Requisição (`BookingRQ`) | Payload de Resposta (`BookingRS`) | Regras de Negócio Oficiais |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/checkRate` | `permanentKey` (bool), `isAlteration` (bool), `isMobile` (bool) | `{"booking": {"bookingHotels": [{"rooms": [{"key": "..."}]}], "bookingFlights": [...], ...}}` | `{"booking": ApiBooking}` com tarifas revalidadas (`fares[]`: `priceNet`, `priceSale`), `cancellationPolicies` (`refundable`, `immediateFine`, `penalties[]`), campos obrigatórios de passageiros (`names[].nameDetails[]`, `documents[]`) e nova `key` validada. | **Etapa obrigatória entre `Avail` e `Booking`.** Com `permanentKey=false` (padrão), a `key` revalidada vale por 24h no servidor InfoTravel. |
| `POST /api/v1/checkRate/budget` | — | `BookingRQ` | `BookingRS` | Revalidação rápida para geração de orçamento/cotação sem bloqueio imediato de inventário. |
| `POST /api/v1/cart/product` & `POST /api/v1/cart/{id}/checkRate` | `id` (cartId) | `BookingRQ` | `BookingRS` | Composição multi-produto (Voo + Hotel + Transfer + Passeio + Seguro) com `checkRate` unificado antes de `POST /api/v1/cart/reserve`. |

### Bloco 5 — Emissão de Reserva Real (`Booking`)

| Método e Rota Oficial | Query Params | Payload de Requisição (`BookingRQ`) | Payload de Resposta (`BookingRS` / `ApiBooking`) | Semântica de Idempotência & Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/booking` | `waitForProcessing=true` | `{"booking": {"externalId": "waesy-idem-uuid", "contact": {...}, "client": {...}, "bookingHotels": [...], "bookingFlights": [...], "payments": [...]}}` | `{"booking": ApiBooking}` contendo `id` (ID da reserva InfoTravel), `status`, `bookingAmount`, `urlVoucher`, `bookingHotels[].locators[]`, `bookingFlights[].locators[]` | O campo `booking.externalId` identifica univocamente a reserva no cliente e permite reconciliação idempotente via `GET /api/v1/booking/search?externalId=...`. |
| `POST /api/v1/booking/{id}/confirm` | `id` (path*) | — | `ApiBooking` | Confirma a reserva criada (ou `POST /api/v1/booking/confirm` enviando `BookingRQ` com `payments`). |

### Bloco 6 — Pós-Venda: Consulta, Voucher, Sincronização e Cancelamento (`Booking` & `Backoffice`)

| Método e Rota Oficial | Parâmetros | Schema de Resposta | Regra Operacional |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/booking/{id}` | `id` (path*), `syncWithProviders=true`, `isDocument`, `language` | `ApiBooking` | Retorna detalhe atualizado da reserva, localizadores (`locators[].code`), bilhetes (`names[].tickets[]`), `status` e `urlVoucher`. |
| `GET /api/v1/booking/search` | `start` (`YYYY-MM-DD`*), `end` (`YYYY-MM-DD`*), `externalId`, `client`, `document`, `detailed` | `ApiBooking[]` | Busca reservas por janela de data e `externalId` (chave de idempotência para evitar duplicidade em timeout). |
| `DELETE /api/v1/booking/{id}/cancel` | `id` (path*), `cancelType` (`SIMULATION` \| `CANCELLATION`) | `ApiBooking` | **Regra oficial:** sempre executar primeiro com `cancelType=SIMULATION` para revisar multas em `cancellationPolicies`, e somente depois `cancelType=CANCELLATION` para efetivar. |
| `POST /api/v1/booking/{id}/cancel/void` | `id` (path*) + body `VoidTicketRQ` (`insumoId`, `cancelType`, `tickets[]`) | `ApiBooking` | Void/cancelamento de bilhetes aéreos. |

---

## 2. Tabela de Diff: Implementação Anterior no Waesy vs. Especificação Oficial OpenAPI 3.0.1

| Componente / Operação | Como estava em `src/services/infotravel.ts` e `supabase/functions/_shared/infotravel.ts` | Como é na Especificação Oficial (`openapi.json`) | Ação Corretiva Aplicada |
| :--- | :--- | :--- | :--- |
| **Autenticação (`Authenticate`)** | Não chamava `POST /api/v1/authenticate`. Passava `api_key` estático em `Authorization: Bearer` ou `X-API-Key` + `X-Client-ID` + `X-Username` + `X-Password` em headers inventados. | `POST /api/v1/authenticate` com body JSON `{"username", "password", "client", "agency"}` -> retorna `{"accessToken", "type": "Bearer", "expire_seconds": 86400}`. | Implementado `authenticateInfotravelOperator` com cache persistente de token por `(store_id, operator_id)`, suporte a credenciais `{ username, password, client, agency }` (e fallback para token pré-emitido em ambientes de teste) + auto-refresh *single-flight* em `401`. |
| **Edge Function `infotravel-connector`** | Fazia `POST ${baseUrl}/${action}` genérico com timeout fixo de 12s e credenciais hardcoded para `operator_id = "orinter"`. | Rotas RESTful tipadas sob `/api/v1/...` (`GET` para `avail/*`, `utility/*`, `searchEngine/*`, `booking/{id}`, `booking/search`; `POST` para `authenticate`, `checkRate`, `booking`, `booking/{id}/confirm`; `DELETE` para `booking/{id}/cancel`). | Refatorado `supabase/functions/_shared/infotravel.ts` e `infotravel-connector/index.ts` para rotear métodos HTTP e paths oficiais para qualquer operadora configurada da loja. |
| **Formato de `occupancy`** | Em vários pontos enviava `adults=2` separado ou `occupancy: "2"` fixo sem idades das crianças no padrão InfoTravel. | Array/repetição de query param `occupancy=numberOfAdults[-firstChildAge[,nextChildAge]]` (ex.: `occupancy=2-9,4`). | Padronizado `formatInfotravelOccupancy(adults, childrenAges)` gerando `2` ou `2-7,10` conforme spec oficial. |
| **Pacotes & Bloqueios (`Package Avail`)** | Chamava `GET /api/v1/utility/packageAvail` e `GET /api/v1/avail/allotment` (rotas inexistentes no OpenAPI oficial!). | `GET /api/v1/avail/package/{packageType}` (`packageType` em `hotel`, `hotel_flight`, `dynamic`, `hotel_bus`, `flight_service`, `service_bus`) + `GET /api/v1/searchEngine/package/{packageType}/origin\|destination\|period` + `GET /api/v1/searchEngine/allottedDates/flight`. | Substituído pelos endpoints oficiais `/api/v1/avail/package/{packageType}` e `/api/v1/searchEngine/...`. |
| **Locação de Carros (`Vehicle Avail`)** | Chamava `GET /api/v1/avail/car` com `start, end, pickup, dropoff` (rota inexistente no OpenAPI oficial!). | `GET /api/v1/avail/vehicle` com `pickUpDate`, `pickUpHour`, `pickUpLocation`, `pickUpLocationIata`, `dropOffDate`, `dropOffHour`, `dropOffLocation`, `dropOffLocationIata`, `driverAge`. | Substituído por `GET /api/v1/avail/vehicle` com os parâmetros e parser de `vehicleAvails[].vehicles[]` oficiais. |
| **Passeios & Ingressos (`Activity` & `Ticket`)** | Chamava apenas `GET /api/v1/avail/activity` para tudo. | `GET /api/v1/avail/activity` (`tourAvail[]`) para passeios/atividades e `GET /api/v1/avail/ticket` (`ticketAvail[]`) para ingressos, além de `GET /api/v1/avail/experience` (`experienceAvail[]`). | Suporte oficial dedicado a `/api/v1/avail/activity`, `/api/v1/avail/ticket` e `/api/v1/avail/experience`. |
| **Revalidação Tarifária (`PreBook` / `CheckRate`)** | Não executava `POST /api/v1/checkRate` antes de reservar. | `POST /api/v1/checkRate` com body `BookingRQ` (`{"booking": ...}`) retornando `BookingRS` com tarifas revalidadas, multas de cancelamento e exigências de documentos. | Implementado `infotravelCheckRate` (`POST /api/v1/checkRate`) obrigatório antes do checkout e da emissão de reserva. |
| **Emissão de Reserva Real (`Booking`)** | Não existia fluxo de emissão `POST /api/v1/booking` nem reconciliação por `externalId`. | `POST /api/v1/booking?waitForProcessing=true` com `BookingRQ` (`booking.externalId`), seguido de `POST /api/v1/booking/{id}/confirm`, `GET /api/v1/booking/{id}?syncWithProviders=true` e `GET /api/v1/booking/search?externalId=...`. | Implementado fluxo completo idempotente com verificação prévia por `externalId`, `POST /api/v1/booking`, confirmação, extração de localizadores/vouchers e persistência atômica via RPC `apply_infotravel_booking`. |
| **Cancelamento (`Cancel`)** | Não existia chamada oficial de simulação e cancelamento. | `DELETE /api/v1/booking/{id}/cancel?cancelType=SIMULATION` seguido de `DELETE /api/v1/booking/{id}/cancel?cancelType=CANCELLATION`. | Implementado `infotravelCancelBooking` com suporte obrigatório a `SIMULATION` (exibição de multa) e `CANCELLATION`. |
