# NICHOS.md — Matriz Canônica de Verticais, Nichos & Campos Dirigidos (Waesy Platform)

> FONTE ÚNICA DE VERDADE para definição de segmentos de negócio, semântica contextual, campos dirigidos, ações operacionais, terminologia e taxonomia unificada em toda a plataforma Waesy.

---

## 1. Princípios Invioláveis de Nicho (N1 a N6)

### N1 — Modelo Único & Fonte Centralizada
Nenhuma tela, componente, modal ou rota pode declarar listas locais de nichos divergentes ou hardcoded. A única biblioteca autorizada para derivar terminologia, labels, placeholders e métricas é `src/lib/niche-semantics.ts` e `src/lib/constants/business-segments.ts`.

### N2 — Direcionamento Funcional Obrigatório
Todo nicho selecionado deve alterar o comportamento real do produto:
- O rótulo e tipo do item no catálogo (ex: "Prato" na gastronomia, "Veículo" em concessionárias, "Imóvel" em imobiliárias, "Pacote" no turismo).
- Os modos de atendimento no PDV (ex: Mesa/Comanda no restaurante, Provador no vestuário, Check-in no turismo).
- O módulo de retaguarda / KDS (ex: Cozinha na alimentação, Bancada na assistência técnica, Vistoria em veículos).
- As métricas de desempenho (KPIs) exibidas no Dashboard.

### N3 — Anti-Duplicidade Semântica
Proibido cadastrar verticais duplicadas ou variações linguísticas desconexas (ex: "comida" vs "gastronomia", "aluguel" vs "locação"). Todo segmento resolve deterministicamente para um dos 17 nichos canônicos através de `resolveRegistryEntry`.

### N4 — Herança de Subcategorias
Categorias de produtos ou serviços cadastradas pertencem estritamente à taxonomia da vertical ativa. É proibido exibir opções incoerentes para o nicho (ex: campos de quartos/banheiros em lanchonetes).

### N5 — Preservação de Dados em Transição
Caso a empresa altere seu nicho no painel de configurações, o histórico financeiro e pedidos anteriores mantêm seu snapshot imutável em `orders.checkout_niche_metadata`. O catálogo adapta seus rótulos sem perda de integridade relacional.

### N6 — Silêncio Visual & Sem Emojis
Nenhum nicho ou categoria deve utilizar emojis decorativos ou textos conversacionais na interface oficial. A diferenciação é feita por tipografia limpa, hierarquia espacial e ícones semânticos da biblioteca canônica.

---

## 2. Matriz Canônica das 17 Verticais

| ID Canônico | Nome Oficial | Singular | Plural | Catálogo / Menu | Módulo Operacional | Modo PDV Principal |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gastronomy` | Gastronomia & Delivery | Prato / Lanche | Pratos & Itens | Cardápio & Itens | Gestor KDS / Cozinha | Balcão, Mesa, Comanda, Delivery |
| `retail` | Varejo, Moda & Acessórios | Produto | Produtos | Catálogo & Estoque | Separação & Despacho | Balcão, Provador, Envio |
| `tourism` | Turismo & Viagens | Pacote / Roteiro | Pacotes & Roteiros | Pacotes & Roteiros | Emissões & Roteiros | Cotação, Contrato Digital, Grupo ANTT |
| `services` | Serviços, Beleza & Estética | Procedimento | Serviços | Catálogo de Serviços | Fila de Atendimento | Cadeira / Cabine, Recepção, Domicílio |
| `legal` | Advocacia & Jurídico | Área de Atuação | Serviços Jurídicos | Honorários & Serviços | Fila de Audiências | Nova Pasta / Processo, Consulta |
| `rental` | Locação & Estruturas | Equipamento / Bem | Bens & Equipamentos | Inventário de Locação | Montagens & Despacho | Retirada Galpão, Montagem no Local |
| `tech_repair` | Assistência Técnica | Serviço / Peça | Peças & Serviços | Tabela de Reparo | Bancada de Reparos | Ordem de Serviço (OS), Balcão |
| `pet` | Pet Shop & Veterinária | Produto / Procedimento | Rações & Banho | Produtos & Procedimentos | Fila de Banho e Tosa | Banho e Tosa, Consulta, Balcão |
| `supermarket` | Supermercado & Hortifrúti | Mercadoria | Produtos das Gôndolas | Gôndolas & Hortifrúti | Fila Picking / Separação | Caixa Rápido, Entrega, Retirada |
| `pharmacy` | Farmácia & Cosméticos | Medicamento | Medicamentos & OTC | Medicamentos & OTC | Receituários & Balcão | Balcão / Caixa, Tele-Entrega Express |
| `events` | Eventos & Ingressos | Ingresso / Lote | Lotes & Ingressos | Eventos & Lotes | Portaria & Validador QR | Bilheteria Física, Comissário, Portaria |
| `vehicles` | Automóveis & Veículos | Veículo | Estoque de Veículos | Estoque de Veículos | Preparação & Vistoria | Showroom, Avaliação de Troca |
| `real_estate` | Imóveis & Imobiliária | Imóvel | Catálogo de Imóveis | Catálogo de Imóveis | Vistorias & Chaves | Agendamento Visita, Proposta Formal |
| `jobs` | Vagas & Recrutamento | Vaga | Vagas Abertas | Mural de Vagas | Triagem & Entrevistas | Entrevista, Banco de Talentos |
| `education` | Cursos & Treinamentos | Curso / Turma | Cursos & Workshops | Catálogo de Cursos | Gestão de Turmas | Secretaria / Matrícula, Convênio |
| `news` | Notícias & Mídia | Reportagem | Todas as Matérias | Redação & Pautas | Fila de Pauta & Revisão | Classificados, Assinatura Digital |
| `wholesale` | Atacado & Indústria B2B | Produto / Caixa | Produtos & Lotes | Grade de Caixas | Expedição & Paletes | Pedido PJ / Faturamento, Cotação Lote |

---

## 3. Campos Dirigidos por Vertical

### 3.1 Gastronomia (`gastronomy`)
- **Campos Específicos:** Tempo estimado de preparo (minutos), adicionais/opcionais pagos, pontos da carne, combos de bebida, taxa de entrega por bairro.
- **KPIs Principais:** Ticket médio por mesa, tempo médio de preparo no KDS, mesas ativas, taxa de cancelamento.
- **Roteamento Operacional:** `/workspace/pedidos/gestor` e `/workspace/pdv`.

### 3.2 Turismo (`tourism`)
- **Campos Específicos:** Duração da viagem (dias/noites), ponto de embarque, regime de alimentação, apólice de seguro viagem, layout 2D de poltronas, dados de passageiros (PAX) e número ANTT.
- **KPIs Principais:** Taxa de ocupação da frota, break-even por passageiro, receita média PAX, saldo de caixa em viagem.
- **Roteamento Operacional:** `/workspace/turismo/grupos` e `/workspace/turismo/cotacoes`.

### 3.3 Veículos (`vehicles`)
- **Campos Específicos:** Placa, renavam, ano de fabricação, ano do modelo, quilometragem, combustível, cor, câmbio, laudo cautelar e garantia mecânica.
- **KPIs Principais:** Dias médios em pátio, margem bruta por veículo, propostas em análise, taxa de conversão test-drive.
- **Roteamento Operacional:** `/workspace/catalogo/produtos` e `/workspace/orcamentos`.

### 3.4 Imóveis (`real_estate`)
- **Campos Específicos:** Finalidade (venda/locação), tipo de imóvel, área útil (m²), dormitórios, suítes, vagas de garagem, condomínio, IPTU e comodidades (piscina, elevador, mobília).
- **KPIs Principais:** Imóveis ativos na carteira, visitas agendadas, tempo médio de vacância, conversão visita/contrato.
- **Roteamento Operacional:** `/workspace/catalogo/produtos` e `/workspace/orcamentos`.

---

## 4. Resolução Determinística & Normalização (PT/EN)

A função `getNicheSemantics(storeData)` inspeciona em ordem de precedência:
1. `store.settings.niche` / `store.settings.segment` / `store.settings.type`
2. `store.category` / `store.segment`
3. Palavras-chave no nome comercial da empresa (`store.name`)
4. Descrição institucional (`store.description`)

Se nenhum critério específico for satisfeito, o sistema assume fallback gracioso para `retail` (Varejo & Comércio Geral), garantindo que nenhuma rota sofra quebra por referência nula ou indefinida.
