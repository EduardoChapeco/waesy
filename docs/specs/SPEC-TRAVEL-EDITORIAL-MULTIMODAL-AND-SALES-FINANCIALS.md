# SPEC-TRAVEL-EDITORIAL-MULTIMODAL-AND-SALES-FINANCIALS

## 1. Escopo e Objetivo
Restaurar e evoluir o ecossistema de Viagens, Turismo e Pacotes Editoriais da plataforma Waesy, corrigindo regressões visuais em publicações e vitrines de viagens, implantando o motor multimodal de voos (estilo Google Flights/CVC com conexões expansíveis, franquia de bagagem e mapa de rota) e hospedagens conectadas a `global_hotels`, adicionando suporte a orçamentos `unlisted` e agrupador comparativo de múltiplos orçamentos (`travel_quote_bundles`), aplicando trava estrita de passageiros por composição tarifária e construindo o módulo interno **"Financeiro da Venda" (`Composição Financeira da Reserva`)** em 8 blocos contábeis auditáveis.

## 2. Requisitos em Sintaxe EARS

### R1 — Restauração do Template Editorial de Viagens e Expurgo de Vazamento de Atributos
- **WHEN** um anúncio pertencer à vertical de viagens/turismo/hospedagem (`isTravelPackage || isHospitality`) ou possuir `template_style = 'editorial'`, **THE SYSTEM SHALL** renderizar `EditorialShowcaseView` com grid assimétrico de 7 colunas à esquerda (galeria `16:10` + miniaturas + abas dinâmicas `Infos do Pacote`, `Roteiro`, `Fotos`, `Condições`) e 5 colunas à direita (painel comercial sticky com Origem $\rightarrow$ Destino, Saída/Retorno/Duração, Pix, Parcelas, Clima e CTA).
- **WHEN** um anúncio de qualquer nicho diferente de conveniência/bebidas for salvo em `_store.conta.classificados.novo.tsx` ou resolvido por `canonical-specs-resolver.ts`, **THE SYSTEM SHALL NOT** gravar nem exibir os atributos `temperature`, `is_alcoholic` ou `volume`.

### R2 — Renderização Nativa de Vídeo e Destaques na Página de Publicação
- **WHEN** `_store.publicacao.$id.tsx` renderizar uma publicação social com `==destaque==` no texto ou arquivos `.mp4`/`.webm`/`.mov` em `media_urls`, **THE SYSTEM SHALL** processar o texto via `RichPostContent` e renderizar a tag `<video controls playsInline>` para URLs de vídeo.

### R3 — Motor Multimodal de Voos (Google Flights) e Múltiplas Hospedagens
- **WHEN** um pacote de viagem possuir detalhes aéreos (`flight_details` / `transport_options`), **THE SYSTEM SHALL** exibir o card de itinerário aéreo contendo resumo de Ida e Volta, horários e códigos IATA, duração total, número de paradas, franquia de bagagem (`Item pessoal`, `Bagagem de mão`, `Bagagem despachada`), mapa visual da rota e acordeão expansível **"Detalhes do voo"** com cada conexão/escala e tempo de espera no aeroporto.
- **WHEN** um pacote possuir hospedagens (`lodgings`), **THE SYSTEM SHALL** permitir vincular hotéis do banco central `global_hotels` ou cadastrar múltiplos hotéis com carrossel de fotos, estrelas, regime alimentar e tipo de quarto.

### R4 — Visibilidade `Unlisted` e Agrupador de Multi-Orçamentos (`travel_quote_bundles`)
- **WHEN** um pacote ou orçamento for configurado com `visibility_mode = 'unlisted'`, **THE SYSTEM SHALL** ocultá-lo das listagens públicas de marketplace/classificados e permitir acesso direto via link.
- **WHEN** o agente agrupar 2 ou mais pacotes/orçamentos em um link único (`/orcamentos/$bundleSlug`), **THE SYSTEM SHALL** exibir no topo um Header Comparativo Especial permitindo ao cliente alternar instantaneamente entre as opções (*Opção 1*, *Opção 2*, *Opção 3*) sem sair da página.

### R5 — Aceite Inteligente de Orçamento e Trava Estrita de Passageiros por Composição
- **WHEN** o pacote for um orçamento personalizado (`is_custom_quote` ou `visibility_mode = 'unlisted'`) ou possuir `passenger_composition` travada (`allow_custom_passenger_count = false`), **THE SYSTEM SHALL** exibir o CTA **"Aceitar Orçamento e Reservar"** e gerar no checkout exatamente os campos dos passageiros configurados (ex.: `Adulto 1`, `Adulto 2`, `Criança 1 até 12 anos`), validando a idade da criança na data de embarque.

### R6 — Módulo Interno "Financeiro da Venda" (`Composição Financeira da Reserva`)
- **WHEN** a agência registrar ou editar o financeiro de uma venda em `/workspace/turismo/comissoes`, **THE SYSTEM SHALL** calcular de forma determinística e auditável os 8 blocos:
  1. `Venda Líquida = Valor Total da Venda - Taxas e Valores Não Comissionáveis`
  2. `Comissão Final` (em `R$` ou `%` sobre a base escolhida, com possibilidade de override manual auditado)
  3. `Over Líquido = Over Bruto - Deduções sobre o Over` (`Imposto`, `Retenção`, `Taxa da operadora`, `Taxa financeira`, `Repasse`, `Outra`)
  4. `Receita da Agência = Comissão Final + Over Líquido`
  5. `Custos Internos da Venda` (lista dinâmica com tipo, valor, beneficiário e status `previsto`/`pago`)
  6. `Resultado da Venda = Receita da Agência - Custos Internos`, com `Margem sobre a Venda (%)` e `Margem sobre a Receita (%)`
  7. `Operadora e Recebimento` (suporte a múltiplos fornecedores por venda: `Orinter`, `FRT`, `Cativa`, `BFly`, `Confiança`, etc., controlando previsto vs. recebido e status)
  8. `Documento Fiscal / Nota` (`Não necessária`, `Pendente`, `Solicitar`, `Solicitada`, `Emitida`, `Recebida`) + `travel_financial_audit_logs`.

## 3. Evidências de Conformidade Esperadas
- Testes unitários Vitest cobrindo a calculadora financeira de 8 blocos e o resolver de especificações sem vazamento de bebidas.
- `npm run typecheck` com Exit Code 0.
- `node scripts/design-lint.mjs --ratchet` com Exit Code 0.
- `npm run build` com Exit Code 0.
