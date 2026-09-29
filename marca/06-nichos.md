# 06-nichos.md — Modelo de Nicho, Campos Dirigidos & Erradicação de Duplicidades

| Dimensão | Especificação Canônica |
| :--- | :--- |
| **Referência de Protocolo** | `.agents/skills/niche-matrix/SKILL.md` (Verificações G1 a G7) |
| **Fonte Canônica** | `docs/marca/NICHOS.md` & `src/lib/niche-semantics.ts` |
| **Total de Verticais** | 17 Verticais Canônicas Homologadas |

---

## 1. Modelo de Dados de Nicho & Tipagem Estruturada

O nicho de uma empresa é armazenado em `stores.settings` sob o formato:
```json
{
  "segment": "tourism",
  "type": "tourism",
  "niche": "tourism",
  "business_model": "physical_and_delivery",
  "is_address_public": true,
  "service_radius_km": 15,
  "working_hours": { ... }
}
```

A resolução semântica em tempo de execução ocorre através de `getNicheSemantics(storeData)`, que retorna o contrato `NicheSemantics`:
- `itemSingular` / `itemPlural` (ex: "Pacote / Roteiro" vs "Prato / Lanche")
- `catalogTitle` (ex: "Pacotes & Roteiros" vs "Cardápio & Itens")
- `newItemAction` / `editItemAction`
- `posServiceModes` (modos de atendimento adaptados)
- `suggestedPresets` (grades, opcionais e adicionais típicos)
- `kpiMetrics` (métricas de desempenho do nicho)
- `departmentLabels` (departamentos de atendimento no chat e CRM)

---

## 2. Cobertura Funcional das Verticais

| Vertical | Campos Dirigidos Específicos | Módulos Conectados | Modos PDV |
| :--- | :--- | :--- | :--- |
| **Gastronomia** | Tempo de preparo, adicionais pagos, ponto da carne, observações de cozinha | `/workspace/pedidos/gestor` (KDS) | Balcão, Mesa, Comanda, Delivery |
| **Varejo & Moda** | Grade de tamanhos (P/M/G), variações de cor, código de barras EAN-13 | `/workspace/pdv`, `/workspace/catalogo/produtos` | Balcão/Caixa, Provador/Reserva, Envio |
| **Turismo** | Duração em dias/noites, embarque, regime de pensão, layout 2D de poltronas, ANTT | `/workspace/turismo/grupos`, `/workspace/turismo/cotacoes` | Cotação, Contrato Digital, Grupo ANTT |
| **Serviços & Beleza** | Duração da sessão (min), comanda por profissional, produtos homecare | `/workspace/agenda`, `/workspace/agenda/servicos` | Cadeira/Cabine, Recepção, Domicílio |
| **Advocacia** | Honorários contratuais/sucumbência, prazos processuais, ramo do direito | `/workspace/advocacia`, `/workspace/agenda` | Pasta/Processo, Consulta Jurídica |
| **Locação & Eventos** | Diária/período, número de patrimônio, checklist de avarias na devolução | `/workspace/agenda`, `/workspace/catalogo/produtos` | Retirada Galpão, Montagem no Local |
| **Assistência Técnica**| Modelo de aparelho, IMEI, laudo de entrada, tempo de bancada (horas) | `/workspace/pedidos/gestor` (OS) | Ordem de Serviço (OS), Balcão |
| **Pet Shop & Vet** | Porte do pet, prontuário animal, intervalo de banho e tosa, validade vacinas | `/workspace/agenda`, `/workspace/pdv` | Banho/Tosa, Consulta, Balcão |
| **Supermercado** | Preço por KG/Unidade, corredor/gôndola, picking/separação de sacolas | `/workspace/pdv`, `/workspace/pedidos/gestor` | Caixa Rápido, Entrega, Drive-thru |
| **Farmácia** | Registro MS, princípio ativo, retenção de receita controlada (SNGPC), lote | `/workspace/pdv`, `/workspace/pedidos/gestor` | Balcão/Caixa, Tele-Entrega Express |
| **Eventos & Shows** | Lote de ingressos, setorização (Pista/Camarote), check-in de portaria offline | `/workspace/eventos`, `/workspace/financeiro/pagamentos` | Bilheteria, Promoter, Portaria |
| **Automóveis** | Placa, renavam, quilometragem, histórico de revisões, proposta financiamento | `/workspace/catalogo/produtos`, `/workspace/orcamentos` | Showroom, Avaliação de Troca |
| **Imóveis** | Quartos, vagas, área útil (m²), condomínio, IPTU, chaves e vistorias | `/workspace/catalogo/produtos`, `/workspace/orcamentos` | Agendamento Visita, Proposta Formal |
| **Empregos & RH** | Faixa salarial, modalidade (remoto/híbrido/presencial), triagem de CVs | `/workspace/empregos`, `/workspace/clientes` | Entrevista, Banco de Talentos |
| **Educação** | Vagas por turma, valor da matrícula/mensalidade, presença e certificados | `/workspace/agenda`, `/workspace/agenda/servicos` | Secretaria/Matrícula, Convênio |
| **Notícias** | Editoria, pauta de apuração, paywall, anúncios patrocinados locais | `/workspace/noticias`, `/workspace/noticias/novo` | Balcão Classificados, Assinatura |
| **Atacado & B2B** | Tabela PJ por volume, faturamento a prazo, paletes/caixas master | `/workspace/catalogo/tabelas`, `/workspace/orcamentos` | Venda PJ / Faturamento, Cotação Lote |

---

## 3. Conformidade com as 7 Regras Anti-Duplicidade (G1 a G7)

- **G1 Modelo Único:** Listas hardcoded eliminadas de componentes isolados; derivação feita exclusivamente de `niche-semantics.ts`.
- **G2 Cobertura de Campos:** Toda seleção de nicho injeta categorias padrão contextuais (ex: "Pacotes Nacionais" para turismo; "Burgers" para gastronomia).
- **G3 Anti-Duplicidade:** Nomes no singular e plural são unificados, prevenindo categorias paralelas para a mesma finalidade.
- **G4 Hierarquia Real:** Categorias filhas referenciam a chave de nicho da loja.
- **G5 Direcionamento Funcional:** O nicho altera botões de ação e visualização de pedidos, não sendo meramente cosmético.
- **G6 Consistência Global:** Cards de busca, vitrines e alternadores utilizam os mesmos rótulos e cores do design system.
- **G7 Semântica Limpa:** Termos contextuais centralizados em dicionário TypeScript tipado.
