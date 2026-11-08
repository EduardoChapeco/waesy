# SPEC-20261106 — Unificação Semântica de Catálogo por Nicho, Seletor Visual de Embalagens, APIs de Frete e Módulo de Separação WMS

- **Status:** Aprovada
- **Data:** 2026-11-06
- **Escopo Atômico:**
  - `src/components/admin/catalog/product-editor/product-packaging-selector.tsx` (Novo)
  - `src/components/admin/catalog/product-editor/product-basic-tab.tsx`
  - `src/components/admin/catalog/product-editor/product-specs-tab.tsx`
  - `src/components/admin/catalog/product-editor/product-edit-general-form.tsx`
  - `src/components/admin/catalog/product-editor/use-product-editor.ts`
  - `src/components/admin/catalog/product-editor/use-product-edit.ts`
  - `src/components/admin/catalog/product-editor/index.ts`
  - `src/routes/workspace.catalogo.produtos.novo.tsx`
  - `src/routes/workspace.catalogo.produtos.$id.tsx`
  - `src/components/workspace/workspace-account-switcher.tsx`
  - `src/services/shipping.functions.ts`
  - `src/services/wms.functions.ts`
  - `src/routes/workspace.pedidos.expedicao.tsx`
  - `src/components/commerce/shipping-label-modal.tsx`
  - `src/lib/__tests__/product-packaging-logistics.test.ts` (Novo)

## 1. Requisitos em Sintaxe EARS

### REQ-01 — Eliminação de Duplicidade entre Básico e Especificações & Cobertura Completa de Nichos
**WHEN** o lojista cria ou edita um item em `/workspace/catalogo/produtos/novo` ou `/workspace/catalogo/produtos/$id`, **THE SYSTEM SHALL** manter uma única fonte canônica sincronizada para peso, dimensões (`weight_kg`, `width_cm`, `height_cm`, `length_cm`), prazo de preparação (`preparation_time_days`) e metadados logísticos (`attributes.logistics`), eliminando a duplicação de campos de peso/dimensões em texto livre na aba "Especificações" e exibindo na aba "Especificações" os atributos técnicos específicos de todos os nichos (`retail`, `gastronomy`, `supermarket`, `pharmacy`, `pet`, `tech_repair`, `rental`, `wholesale`, `events`, `education`, `tourism`, `vehicles`, `real_estate`, `services`) além dos campos dinâmicos do Tipo de Produto (`product_types.field_schema`).

### REQ-02 — Seletor Visual de Embalagem, Cubagem e Diretrizes de Separação
**WHEN** o item comercializado for físico (`is_physical = true`), **THE SYSTEM SHALL** apresentar o componente visual `ProductPackagingSelector` permitindo escolher visualmente o formato da embalagem (`box`, `envelope`, `thermal_bag`, `roll`, `pallet`, `digital`) e presets dimensionais (Caixa P/M/G, Sacola E-commerce, Sacola Delivery Térmica, Tubo Postal, Fardo Master), calculando em tempo real o Peso Cubado (`(C × L × A) / 6000`), o Peso Tarifado, a elegibilidade nos modais de entrega (Bag MotoLink 45L vs. Carro/Utilitário vs. Correios/Melhor Envio) e as diretrizes para o Módulo de Separação WMS (`aisle_location`, `fragile`, `stackable`, `thermal_control`, `picking_notes`).

### REQ-03 — Integração End-to-End com APIs de Frete (`shipping.functions.ts`)
**WHEN** `_calculateShipping` ou `getOrderShippingLabelData` for executado para um produto ou carrinho, **THE SYSTEM SHALL** resolver `weight_kg`, `width_cm`, `height_cm`, `length_cm` e `attributes.logistics` tanto por `cartId` quanto por `productId`, enviando o formato de embalagem correspondente (`package_format`: box/roll/envelope) e o peso tarifado às APIs de frete (Melhor Envio / Correios) e ajustando automaticamente o modal local (MotoLink Express vs. Carro/Utilitário Local) quando o volume ou peso exceder a capacidade da bag de motocicleta (`> 12 kg` ou dimensão `> 45 cm`).

### REQ-04 — Propagação para o Módulo de Separação WMS (`workspace.pedidos.expedicao.tsx`) e Etiquetas (`ShippingLabelModal`)
**WHEN** o operador logístico abrir o módulo de Conferência WMS (`/workspace/pedidos/expedicao`) ou emitir a Etiqueta 100x150mm / ZPL II, **THE SYSTEM SHALL** exibir para cada pedido/item o formato visual de embalagem recomendado, medidas (`C × L × A`), localização no estoque (`aisle_location`), alertas de manuseio (`Frágil`, `Controle Térmico`) e instruções de separação (`picking_notes`).

## 2. Invariantes e Gates
- Zero cores literais hex/rgb fora de tokens (DL-01) e zero classes arbitrárias (DL-02) nos arquivos criados/modificados.
- Alvos de toque com altura mínima canônica `h-11` (DL-14) e `:focus-visible:ring-2` (DL-15).
- Zero Containeritis (DL-31).
