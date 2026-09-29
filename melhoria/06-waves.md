# 06-WAVES.md — Roadmap de Evolução por Ondas de Alavancagem

**Fundamentação Teórica:** Conforme a Seção 1 e Seção 5 da SPEC-001, as intervenções de melhoria devem ser sequenciadas estritamente por alavancagem sistêmica: `Score = (Impacto * 3) + Severidade - Esforço`.  
Nenhuma feature nova pode ser introduzida antes de fechar os loops transacionais já existentes.

---

## 1. Visão Geral das 4 Ondas de Melhoria

| Onda | Nome da Onda | Foco Estratégico | Gaps Cobertos | Score Médio | Meta de Sucesso |
| --- | --- | --- | --- | --- | --- |
| **ONDA-1** | **Conclusão & Resiliência Transacional** | Eliminar quebras de round-trip (P0), loaders infinitos e perda de estado | 5 | 17.2 | 100% dos fluxos de PDV, Checkout e Despacho fecham ciclo sem travar ou exigir F5 |
| **ONDA-2** | **Reconexão de Elos Órfãos** | Integrar 69 componentes órfãos e expor 107 funções backend em hooks e menus | 176 | 11.2 | Zero componentes fora do roteador e zero funções de backend sem chamada |
| **ONDA-3** | **Erradicação de Promessas Vazias** | Resolver as 51 ocorrências de "Em Breve" na UI (implementar fluxo ou remover ruído) | 51 | 10.0 | Zero textos de promessa vazia ("em breve", "coming soon") na interface |
| **ONDA-4** | **Devolução de Valor & Inteligência** | Criar relatórios e ações sobre os 6 clusters das 118 tabelas unidirecionais | 12 | 14.1 | Dados de carrinho, caixa, estoque e leads geram retorno e decisão para o operador |

---

## 2. Detalhamento por Onda

### ONDA-1: Conclusão & Resiliência Transacional (P0 / Imediata)
**Objetivo:** Garantir que o usuário finalize o que começou e veja o resultado imediatamente.

| ID | Ação Operacional | Arquivos Afetados | Critério de Aceite / Evidência |
| --- | --- | --- | --- |
| `GAP-001` | Invalidação de cache TanStack Query no catálogo | `src/routes/workspace.estoque.tsx` | Mutação de produto dispara `queryClient.invalidateQueries` e atualiza a tabela em < 100ms sem F5 |
| `GAP-002` | Reset de spinner e toast em falha de fechamento de mesa | `src/routes/workspace.pdv.index.tsx` | Erro simulado no PDV reseta `isSubmitting=false` e exibe toast de diagnóstico claro |
| `GAP-003` | Timeout com feedback de cancelamento/regeneração Pix | `src/routes/checkout.tsx` | Expiração de Pix libera o botão para gerar novo QR Code com aviso sonoro/visual |
| `GAP-004` | Auto-reconexão do socket Supabase Realtime no MotoLink | `src/routes/conta.meus-pedidos.tsx` | Simulação offline/online reconecta o canal em < 2s sem perda do tracking da moto |
| `GAP-005` | Defaults defensivos nos search params de turismo | `src/routes/workspace.turismo.cotacoes.tsx` | Navegação para rota com query string vazia renderiza página sem crash com valores padrão |

---

### ONDA-2: Reconexão de Elos Órfãos (Estrutural / Elo Faltante)
**Objetivo:** Dar utilidade a código já escrito, testado e compilado que se encontra isolado do usuário.

- **Frente 2.1 — Conectar Componentes Isolados (69 itens):**
  - Incorporar modais prontos de edição de planta (`StoreFloorPlanEditorModal`) na rota `workspace.pdv.index.tsx`.
  - Conectar visualizador de perícias (`RmaEvidenceViewerModal`) na gestão de trocas e devoluções.
  - Conectar analytics avançados de criador (`BiolinkAdvancedAnalyticsCard`) no dashboard de biolinks.
  - Disponibilizar leitor de código de barras móvel (`InventoryBarcodeScannerSheet`) na tela de contagem rápida de estoque.
- **Frente 2.2 — Expor Funções Backend em Hooks e Telas (107 itens):**
  - Implementar hooks TanStack Query para funções transacionais de catálogo em lote (`_bulkUpdatePrices`, `_archiveProducts`).
  - Ligar função `cancelDeliveryRunAtomic` ao botão "Cancelar Corrida" na visão do despachante.
  - Conectar cancelamentos e baixas em lote no módulo jurídico (`archiveLegalDeadlineBatch`).

---

### ONDA-3: Erradicação de Promessas Vazias (Higiene Cognitiva)
**Objetivo:** Eliminar expectativas falsas e botões sem efeito real.

- **Regra de Decisão:**
  - Se o backend correspondente já existe em `src/services/`: ligar a ação e tornar o botão funcional.
  - Se o backend não existe e a funcionalidade não pertence ao MVP: remover o elemento de UI ou substituir por estado informativo sóbrio sem promessa de data.
- **Principais Áreas Afetadas:**
  - `src/routes/checkout.tsx`: Campo de cupom de desconto estático (conectar à tabela `coupons`).
  - `src/routes/workspace.financeiro.tsx`: Botões estáticos "Exportar PDF" e "Exportar Excel" (conectar a exportação canônica CSV/PDF).
  - Menus e cards secundários com badges de "Brevemente" desnecessários.

---

### ONDA-4: Devolução de Valor & Inteligência (Econômica / Alavancagem)
**Objetivo:** Transformar 118 tabelas de gravação oculta em receita e eficiência para a comunidade de lojistas e prestadores.

| Prioridade | Módulo | Entregável de Devolução | Impacto Econômico |
| --- | --- | --- | --- |
| **4.1** | Checkout | Disparador de recuperação de carrinho abandonado com envio de cupom | Recuperação de vendas perdidas |
| **4.2** | PDV | Relatório de fechamento cego de caixa por turno de operador | Controle contábil e eliminação de perdas |
| **4.3** | Estoque | Extrato Kardex de movimentações, quebras e motivos de perda | Prevenção de divergências de inventário |
| **4.4** | CRM | Fila de novos contatos do WhatsApp com clique para atendimento | Redução drástica do lead time comercial |
| **4.5** | Afiliados | Painel analítico de conversão UTM e comissões para criadores locais | Estímulo à rede de divulgação orgânica |
| **4.6** | Logística | Painel de monitoramento do MotoLink com tempos médios por raio | Otimização de rotas e despacho rápido |

---

## 3. Protocolo de Transição entre Ondas

1. Uma onda só é considerada concluída quando todos os seus gaps no `melhoria/05-ledger.json` estiverem marcados como `RESOLVIDO` com prova documental de build (`npm run typecheck && npm run build`) e design lint (`node scripts/design-lint.mjs`).
2. É expressamente proibido iniciar tarefas da Onda 2 antes da Onda 1 atingir 100% de conclusão comprovada.
