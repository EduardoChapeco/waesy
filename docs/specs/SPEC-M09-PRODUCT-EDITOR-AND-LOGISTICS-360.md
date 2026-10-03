# SPEC-M09: Editor de Produtos Ergonômico, Matriz de Variações Híbrida & Logística Multimodal 360

## 1. Metadados e Controle Normativo
- **Código:** SPEC-M09-PRODUCT-EDITOR-AND-LOGISTICS-360
- **Versão:** 1.0 (Enterprise Specification)
- **Data:** 2026-10-02
- **Autoridade:** BigTech Executive Board & Red Team (CPO, Arquiteto Chefe, Engenharia de Dados & Segurança, Design Ops, QA).
- **Invariantes:** M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional), M10 (Isolamento Multi-Tenant), WCAG 2.2 AA.
- **Normas de UI:** Apple HIG, Linear Design System, Proibido !important (DL-04), Proibido Valores Arbitrários (DL-02), Touch Target >= 44px (DL-14), Foco Teclado :focus-visible (DL-15).

---

## 2. Contexto e Problemas Diagnosticados
1. **Editor de Produtos com Persistência Fragmentada e Matriz Comprimida:**
   - Ao editar um produto existente em `/workspace/catalogo/produtos/$id`, o cabeçalho superior continha apenas "Sincronizar", "Voltar" e "Ver na Vitrine", sem botão de salvar evidente.
   - O botão "Salvar Alterações" ficava restrito ao final do bloco de Informações Básicas, inacessível ao navegar pelas demais abas (Mídias, Variantes, Adicionais, Ficha Técnica).
   - A tabela 2D de variações (`VariantMatrixGrid`) sofria compressão severa de colunas dentro da divisão 7/12 do layout desktop (~650px de largura útil para colunas que exigiam >960px), causando overflow ilegível e tornando a edição impossível em telas menores e mobile.
2. **Logística Multimodal Desarticulada:**
   - Falta de um painel unificado estilo iFood Merchant no Workspace para habilitar e calibrar simultaneamente as 4 modalidades operacionais da cidade (MotoLink sob demanda, Entregador Próprio com raio e bairros, Retirada no Balcão e Frete Terceirizado/Transportadora).
   - Inexistência de atalho de despacho avulso para encomendas rápidas com geração de link público de rastreio GPS ao vivo.
3. **Regras Operacionais do Entregador:**
   - Necessidade de formalização das regras de desalocação (livre antes da coleta vs validação obrigatória após coleta), taxa de retorno por entrega mal-sucedida (50% da corrida) e taxa opcional de subida em condomínio.
4. **Produtos Pesáveis (Hortifruti / Carnes) & Substituição:**
   - Falta de suporte formal a margem de tolerância de peso (até 10%) e captura de preferências de substituição no checkout.
5. **Checkout Híbrido Multimodal:**
   - Suporte a pedidos mistos contendo produtos físicos (com frete), serviços agendados (com data/hora) e produtos digitais (com liberação imediata) na mesma transação.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Editor de Produtos & Persistência Ergonômica
- **EARS-U01:** O sistema SHALL exibir uma barra de ação flutuante fixa na base da tela (`bottom-4 sticky` / `fixed bottom-4 z-40 max-w-4xl`) contendo o status do produto e o botão primário "Salvar Alterações" visível em todas as seções do formulário.
- **EARS-U02:** O sistema SHALL renderizar a Matriz de Variações de forma adaptativa e híbrida:
  - No Desktop: cartões de grupo por dimensão mãe com tabela espaçada e scroll horizontal limpo, sem compressão de colunas.
  - No Mobile: cartões nativos verticais individuais com controles numéricos de toque mínimo >= 44px (`h-11`) e botão de edição fina em gaveta lateral (`AdvancedVariantEditor`).
- **EARS-E01:** QUANDO o operador clicar no botão "Salvar Alterações" da barra flutuante, O sistema SHALL persistir as informações gerais do produto e sincronizar o estado da matriz de variações no Supabase.

### 3.2 Painel de Logística Multimodal 360 (Workspace)
- **EARS-U03:** O sistema SHALL disponibilizar no Workspace um painel multimodal no padrão iFood Merchant com 4 modalidades ativáveis de forma independente:
  1. *MotoLink / Frota da Cidade*: despacho sob demanda com cálculo dinâmico de tarifa urbana por km e clima.
  2. *Entregador Próprio*: tabela de entrega por raio geodésico em km e lista de bairros atendidos com taxas personalizadas.
  3. *Retirada no Balcão (Takeout)*: isenção de frete com instrução de coleta na loja.
  4. *Frete Terceirizado / Transportadora*: cotação manual ou FOB com emissão de romaneio de despacho.
- **EARS-E02:** QUANDO o lojista solicitar um "Despacho Avulso", O sistema SHALL gerar uma corrida imediata para a frota ou entregador próprio e disponibilizar um link público de rastreio GPS ao vivo (`/entrega/:token`).

### 3.3 Ciclo de Vida do Entregador & Taxas Especiais
- **EARS-S01:** ENQUANTO o entregador não tiver confirmado a coleta na loja (`status = 'accepted'`), ELE SHALL poder desalocar a corrida livremente, fazendo com que o pedido retorne imediatamente à fila de despacho.
- **EARS-W01:** SE o entregador tentar desalocar a corrida após a confirmação da coleta (`status = 'collected'` ou `'in_transit'`), ENTÃO O sistema SHALL exigir autorização formal da loja ou do suporte central antes de liberar a desistência.
- **EARS-E03:** QUANDO uma entrega for declarada mal-sucedida (cliente ausente ou endereço inacessível), O entregador SHALL retornar a mercadoria ao estabelecimento e receber uma taxa de retorno correspondente a 50% do valor da corrida original.
- **EARS-U04:** O sistema SHALL permitir o cadastro e cobrança opcional de taxa de subida em apartamento/condomínio para pedidos verticais.

### 3.4 Produtos Pesáveis (Supermercados/Açougues) & Substituições
- **EARS-U05:** Em produtos precificados por peso (`fresh_pricing_mode = 'weight'`), O checkout SHALL autorizar uma margem de tolerância de até 10% sobre o valor estimado.
- **EARS-E04:** Na separação do pedido, QUANDO a balança registrar o peso real aferido, O sistema SHALL debitar ou estornar a diferença exata em centavos em relação à pré-autorização.
- **EARS-U06:** O checkout SHALL capturar a preferência de substituição do cliente para produtos esgotados:
  1. Substituir por marca/item similar de mesma qualidade.
  2. Consultar o cliente via chat/WhatsApp antes de substituir.
  3. Cancelar o item e estornar o valor integralmente.

### 3.5 Checkout Híbrido Multimodal (Físico + Agendamento + Digital)
- **EARS-U07:** QUANDO o carrinho contiver itens de naturezas heterogêneas, O checkout SHALL escalonar as etapas de cumprimento:
  - Frete e entrega física calculados exclusivamente sobre os itens físicos.
  - Seletor de data, horário e profissional exibido para os serviços agendados.
  - Acesso imediato (download/chave serial/voucher) liberado automaticamente para itens digitais logo após a confirmação do pagamento.

---

## 4. Contratos de Dados & Interfaces

```typescript
export interface StoreDeliverySettingsDTO {
  store_id: string;
  motolink_enabled: boolean;
  own_delivery_enabled: boolean;
  pickup_enabled: boolean;
  carrier_enabled: boolean;
  own_delivery_radius_km: number;
  own_delivery_base_fee_cents: number;
  own_delivery_per_km_cents: number;
  condo_climb_fee_cents?: number;
  neighborhood_fees: Array<{
    neighborhood: string;
    fee_cents: number;
    estimated_minutes: number;
  }>;
}

export interface GrocerySubstitutionPreferences {
  mode: "similar" | "contact_whatsapp" | "cancel_and_refund";
  weight_tolerance_pct: number; // Ex: 10
}
```

---

## 5. Definition of Done
- [ ] Implementação de barra flutuante fixa (`ProductEditorStickyBar`) em `/workspace/catalogo/produtos/$id` e `/workspace/catalogo/produtos/novo`.
- [ ] Refatoração de `VariantMatrixGrid` com suporte nativo a cartões no mobile e layout amplo sem overflow forçado no desktop.
- [ ] Registro e conformidade em `docs/design/DECISIONS.md` (DEC-154).
- [ ] Zero violações de design lint e zero `!important`.
- [ ] Touch targets >= 44px em todos os controles interativos.
