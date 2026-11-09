# SPEC-20261108: Motor Unificado de Insumos, Sub-Receitas, Ficha Técnica (BOM), Desperdício e Validade com Impressão Térmica

## 1. Visão Geral e Contexto Operacional
No segmento de gastronomia e produção de alimentos (pizzarias, hamburguerias, culinária mexicana, marmitarias, docerias, panificação), produtos de venda final (pratos, lanches, pizzas, combos) **não possuem estoque unitário fixo**. O estoque real consiste em matérias-primas e insumos (farinha, queijos, carnes, molhos, embalagens) que são transformados em pratos finais ou em produções intermediárias compartilhadas (sub-receitas como massa de pizza, chilli, maionese verde, molho cheddar).

Esta especificação define o motor holístico de:
1. **Catálogo de Insumos e Matérias-Primas (`supplies`):** Unidades base (g, kg, ml, l, un), custo unitário, estoque atual, estoque mínimo de alerta e vínculo com fornecedores.
2. **Sub-Receitas e Fichas de Produção Intermediária (`recipes`, `recipe_items`):** Formulações compostas com rendimento (porções, peso), tempo de preparo, POP (Procedimento Operacional Padrão) e cálculo de custo por porção.
3. **Ficha Técnica de Produtos e Modificadores (`product_recipes`):** Vínculo da composição tanto no prato principal quanto em sabores, tamanhos e adicionais (ex: Nachos com escolha de sabor Chilli ou Adicional de Cheddar).
4. **Cálculo de Estoque Teórico e Gargalo de Produção (Auto-Pause):** Identificação mecânica do insumo gargalo e bloqueio/pausa automática de pratos e sabores quando o insumo esgota.
5. **Ordens de Produção Interna (`production_orders`):** Lançamento de lotes de cozinha com baixa automática de ingredientes e entrada do produto intermediário no estoque.
6. **Módulo de Desperdício e Perdas (`waste_logs`):** Registro de avarias, sobras, alimentos vencidos ou queimados com apuração de perda financeira em R$.
7. **Controle de Validade e Impressão de Etiquetas Térmicas 58mm/80mm (`expiration_labels`):** Emissão de tickets de segurança alimentar com QR/código, temperatura de conservação e disparo nativo de impressão térmica.
8. **Fornecedores e Entrada de Compras (`suppliers`, `supply_inventory_movements`):** Gestão de parceiros e reposição de estoque com recálculo de custo médio ponderado.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Gestão de Insumos e Estoque Base
- **EARS-01 (Insumo Cadastrado):** *Quando* o gestor cadastrar ou atualizar um insumo em `supplies`, *o sistema deve* registrar unidade de medida padronizada (`g`, `kg`, `ml`, `l`, `un`), custo unitário em centavos, estoque mínimo de alerta e temperatura recomendada de armazenagem.
- **EARS-02 (Estoque Mínimo & Alerta):** *Quando* o saldo em estoque de um insumo atingir ou cair abaixo de `min_stock_alert`, *o sistema deve* sinalizar estado crítico na despensa e calcular quais pratos do cardápio foram impactados.

### 2.2 Sub-Receitas e Fichas Técnicas Multi-Nível
- **EARS-03 (Produção Intermediária):** *Quando* uma receita do tipo `sub_recipe` for criada (ex: Chilli ou Maionese Caseira), *o sistema deve* permitir vincular insumos básicos e sub-insumos, calculando o rendimento total e o custo por unidade gerada.
- **EARS-04 (Composição no Produto & Adicionais):** *Quando* um produto ou adicional possuir receita vinculada em `product_recipes`, *o sistema deve* exibir o custo composto na aba "Insumos" do editor de produtos e atualizar a margem de lucro estimada.

### 2.3 Gargalo de Produção & Auto-Pause no Cardápio
- **EARS-05 (Cálculo do Insumo Gargalo):** *Dado* um prato com receita $R$ composta pelos insumos $(S_1 \dots S_n)$ com consumo $(Q_1 \dots Q_n)$, *o sistema deve* calcular $\text{EstoqueProducivel} = \min_i \lfloor \frac{\text{saldo}(S_i)}{Q_i} \rfloor$.
- **EARS-06 (Auto-Pausa Preventiva):** *Se* o insumo gargalo de um prato ou sabor atingir zero, *então* o sistema deve alertar o operador e oferecer a pausa imediata do item nas vitrines públicas e PDV para evitar venda sem capacidade de entrega.

### 2.4 Lote de Produção & Baixa de Ingredientes
- **EARS-07 (Execução de Lote):** *Quando* a cozinha registrar a produção de $N$ lotes de uma sub-receita em `production_orders`, *o sistema deve* abater atomicamente os insumos consumidos em `supply_inventory_movements`, creditar o rendimento no saldo do insumo composto e calcular a data/hora exata de validade.

### 2.5 Desperdício, Avarias e Perdas
- **EARS-08 (Apuração de Desperdício):** *Quando* for reportada uma perda em `waste_logs` (motivos: vencido, estragado, queimado, queda, erro de preparo), *o sistema deve* abater a quantidade do estoque de insumos e registrar o prejuízo financeiro calculado com base no custo unitário.

### 2.6 Validade e Etiquetas Térmicas (Segurança Alimentar)
- **EARS-09 (Emissão de Etiqueta Térmica):** *Quando* um lote ou insumo fracionado for preparado, *o sistema deve* gerar a etiqueta de validade conforme padrões sanitários e formatar o layout para impressoras térmicas de 58mm e 80mm com acionamento nativo de impressão.

### 2.7 Fornecedores & Entrada de Compras
- **EARS-10 (Reposição de Insumos):** *Quando* for lançada uma entrada de compras em `supply_inventory_movements`, *o sistema deve* incrementar o estoque do insumo, atualizar o fornecedor preferencial e recalcular o custo médio unitário.

---

## 3. Arquitetura de Dados (DDL)

Tabelas a serem criadas na migração:
1. `public.suppliers`: Fornecedores com razão social, CNPJ/CPF, lead time e contato.
2. `public.supplies`: Insumos básicos e compostos com saldo, unidade, custo e validade padrão.
3. `public.recipes`: Fichas técnicas, POP e rendimento.
4. `public.recipe_items`: Ingredientes de cada receita.
5. `public.product_recipes`: Vínculo entre produtos/variações/modificadores e suas receitas.
6. `public.production_orders`: Histórico de ordens de produção interna na cozinha.
7. `public.waste_logs`: Livro de perdas e desperdício de insumos.
8. `public.supply_inventory_movements`: Kardex de movimentações de insumos.
9. `public.expiration_labels`: Registro e impressão de etiquetas térmicas.

RLS: `store_id` multi-tenant em todas as tabelas com políticas estritas `tenant_isolation`.

---

## 4. Matriz de Estados de UI
- **Despensa / Insumos:** Dados (tabela/cards), Loading (Skeleton), Vazio (CTA cadastrar insumo), Erro.
- **Fichas Técnicas & POP:** Lista de receitas, modal de cadastro com cálculo reativo de custo e modo de preparo.
- **Editor de Produtos (Aba Insumos):** Conexão direta com catálogo de insumos reais, cálculo de custo e indicação de estoque máximo produzível.
- **Desperdício:** Gráficos e tabela de perdas com filtro de motivos.
- **Validade & Etiquetas:** Visualizador de etiqueta térmica 58mm/80mm com botão de impressão rápida.
