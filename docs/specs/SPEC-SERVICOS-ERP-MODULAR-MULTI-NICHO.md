# SPEC-SERVICOS-ERP-MODULAR-MULTI-NICHO
## Módulo Operacional de Prestação de Serviços, ERP Multi-Nicho & Gestão Granular Waesy

---

### 1. Contexto & Motivação
A gestão de estabelecimentos prestadores de serviços (salões, barbearias, clínicas estéticas, consultórios, estúdios e serviços especializados) demanda um conjunto de regras transacionais rigorosas:
- Divisão de comissões primárias e compostas (auxiliares, estagiários, lavadores).
- Conformidade jurídica com a Lei do Salão Parceiro (Lei nº 13.352/2016), discriminando cota-parte do salão e do profissional para evitar bitributação.
- Dedução granular de custos: taxas de pagamento, descontos comerciais e consumo de insumos (ficha técnica).
- Retenção e fidelização com mensagens pré/pós procedimento e ciclo de retorno programado.
- Perfil do cliente em 360 graus com histórico financeiro, débitos, créditos, pacotes e anamneses assinadas digitalmente.
- Emissão fiscal descentralizada com botões diretos na linha da tabela (`[S]` NFSe, `[P]` NFe, `[C]` NFCe) preparados para a Reforma Tributária (IBS/CBS).
- Matriz tátil e visual de permissões granulares por módulo.

---

### 2. Invariantes do Sistema (EARS Syntax)
1. **[INVARIANT-01: Cota-Parte do Salão Parceiro]**
   - *Quando* uma comanda de serviço executada por profissional sob o regime da Lei do Salão Parceiro for faturada, o sistema *deverá* segregar contabilmente a cota-parte da empresa e a cota-parte do profissional parceiro, aplicando a base tributária exclusivamente sobre a cota da empresa.
2. **[INVARIANT-02: Dedução Parametrizada de Insumos e Taxas]**
   - *Quando* o comissionamento for apurado, o motor financeiro *deverá* aplicar estritamente as regras de quem absorve as taxas de meios de pagamento, descontos e insumos (Estabelecimento 100%, Profissional 100%, Meio a Meio ou Proporcional), respeitando as sobreposições individuais do cadastro do profissional.
3. **[INVARIANT-03: Ficha Técnica & Baixa Automática de Estoque]**
   - *Quando* uma comanda for concluída, o sistema *deverá* dar baixa automática no estoque dos produtos e insumos vinculados ao serviço cadastrado.
4. **[INVARIANT-04: Assinatura Digital e Validade da Anamnese]**
   - *Quando* uma anamnese for preenchida, o sistema *deverá* coletar o traço vetorial da assinatura digital, o IP, o User-Agent e registrar um timestamp imutável com status "signed".
5. **[INVARIANT-05: Proteção LGPD de Dados de Clientes]**
   - *Quando* um operador sem a permissão `Visualizar Telefones` acessar a listagem ou drawer de clientes, os números de telefone e e-mails *deverão* ser mascarados no BFF antes do envio ao cliente.
6. **[INVARIANT-06: Emissão Fiscal Individual em Tabela]**
   - *Quando* a tabela de comandas ou vendas for exibida, cada linha *deverá* prover gatilhos individuais de emissão fiscal para NFSe (`[S]`), NFe (`[P]`) e NFCe (`[C]`), com indicação de estado e tooltip informativo.

---

### 3. Matriz de Entidades & Schemas SQL
Vide documento de auditoria `auditoria-holistica-regras-servicos-erp.md` para a declaração completa das tabelas:
- `workspace_partner_agreements`
- `service_consumed_materials`
- `service_collaborator_splits`
- `customer_anamnesis_records`
- `order_fiscal_invoices`

---

### 4. Critérios de Aceite & Verificação
- [ ] Schemas validados via TypeScript types gerados.
- [ ] Cálculo de comissões com testes unitários cobrindo as 4 variantes de rateio de taxas e descontos.
- [ ] Drawer do cliente com 14 abas navegáveis sem containeritis (DL-31).
- [ ] Canvas de assinatura digital funcional no mobile e desktop com touch target >= 44px.
- [ ] Heatmap semanal de horários com renderização SVG/CSS pura e zero Cumulative Layout Shift (CLS < 0.05).
