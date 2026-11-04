const fs = require('fs');
const path = require('path');

const operationalRoutes = [
  // 1. Agendamentos
  'workspace.agenda.index.tsx',
  'workspace.agenda.recursos.tsx',
  'workspace.agenda.servicos.index.tsx',

  // 2. Clientes & CRM & Captação
  'workspace.clientes.index.tsx',
  'workspace.clientes.$id.tsx',
  'workspace.crm.tsx',
  'workspace.comercial.tsx',
  'workspace.captacao.imoveis.tsx',
  'workspace.captacao.veiculos.tsx',

  // 3. Pedidos & Atendimento & Vendas
  'workspace.pedidos.index.tsx',
  'workspace.pedidos.gestor.tsx',
  'workspace.pedidos.cozinha.tsx',
  'workspace.pedidos.expedicao.tsx',
  'workspace.pedidos.trocas.tsx',
  'workspace.pedidos.historico.tsx',
  'workspace.pedidos.entregadores.tsx',
  'workspace.pedidos.entregadores.novo.tsx',
  'workspace.pdv.index.tsx',
  'workspace.pdv.mesas.tsx',

  // 4. Tarefas & Squads
  'workspace.tarefas.tsx',
  'workspace.squads.tsx',
  'workspace.skills.tsx',

  // 5. Orçamentos & Cotações & Propostas
  'workspace.orcamentos.index.tsx',
  'workspace.orcamentos.$id.tsx',
  'workspace.orcamentos.novo.tsx',
  'workspace.turismo.propostas.index.tsx',
  'workspace.turismo.propostas.$id.tsx',
  'workspace.turismo.cotacoes.tsx',
  'workspace.turismo.corporativo.tsx',
  'workspace.turismo.reservas.tsx',

  // 6. Contratos
  'workspace.contratos.index.tsx',
  'workspace.contratos.$id.tsx',
  'workspace.contratos.modelos.tsx',

  // 7. Advocacia & Jurídico
  'workspace.advocacia.index.tsx',

  // 8. Imóveis
  'workspace.imoveis.index.tsx',

  // 9. Estoque & Lotes
  'workspace.estoque.index.tsx',
  'workspace.estoque.lotes.tsx',
  'workspace.estoque.movimentacoes.tsx',

  // 10. Eventos
  'workspace.eventos.index.tsx',
  'workspace.eventos.$id.subpaineis.tsx',
  'workspace.reservas.index.tsx',

  // 11. Atendimento & Suporte
  'workspace.atendimento.index.tsx',
  'workspace.suporte.index.tsx',
  'workspace.whatsapp.central.tsx',

  // 12. RH & Equipe & Ponto
  'workspace.rh.ponto.tsx',
  'workspace.configuracoes.equipe.tsx',
  'workspace.associacao.membros.tsx',

  // 13. Financeiro
  'workspace.financeiro.caixa.tsx',
  'workspace.financeiro.contas-a-pagar.tsx',
  'workspace.financeiro.contas-a-receber.tsx',
  'workspace.financeiro.extrato.tsx',
  'workspace.financeiro.reconciliacao.tsx',
  'workspace.financeiro.faturas.tsx',
  'workspace.financeiro.metas.tsx',
  'workspace.financeiro.dre.tsx',

  // 14. Logística
  'workspace.logistica.rastreamento.tsx',
  'workspace.logistica.rotas.tsx',
  'workspace.logistica.faturas.tsx',

  // 15. Admin-Master Gestão Operacional
  'admin-master.denuncias.tsx',
  'admin-master.entregadores.auditoria.tsx',
  'admin-master.kyc.tsx',
  'admin-master.hubs.tsx',
  'admin-master.lojas.tsx',
  'admin-master.usuarios.tsx',
  'admin-master.faturas.tsx',
  'admin-master.boost-payments.tsx',
  'admin-master.carnes.tsx',
  'admin-master.curadoria.tsx',
  'admin-master.modulos.tsx'
];

const results = [];

operationalRoutes.forEach(r => {
  const filePath = path.resolve('src/routes', r);
  if (!fs.existsSync(filePath)) {
    results.push({ file: r, exists: false });
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check loaders
  const hasLoader = content.includes('loader:') || (content.includes('createFileRoute') && content.includes('loader'));
  const hasUseQuery = content.includes('useQuery(');
  const dataFetchMethod = hasLoader ? 'Route loader' : hasUseQuery ? 'TanStack useQuery' : 'Local state / none';

  // Check backend server functions
  const importedFunctions = [];
  const funcRegex = /import\s+.*\{([^}]+)\}.*from\s+['"]@\/services\/([^'"]+)['"]/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    importedFunctions.push(`${match[2]}: ${match[1].trim()}`);
  }

  // Check view modes present in code
  const hasKanban = /kanban/i.test(content);
  const hasTable = /<Table\b|<table\b/i.test(content) || /TableHead/i.test(content);
  const hasCards = /grid-cols-|gap-4.*rounded-|Card\b/i.test(content);
  const hasCalendar = /calendar|calendario/i.test(content);
  const hasViewModeState = /viewMode|setViewMode|activeTab.*kanban|currentView/i.test(content);

  // Check if view switching UI is implemented
  const viewSwitchingModes = [];
  if (hasKanban) viewSwitchingModes.push('Kanban');
  if (hasTable) viewSwitchingModes.push('Tabela');
  if (hasCards) viewSwitchingModes.push('Cards');
  if (hasCalendar) viewSwitchingModes.push('Calendário');

  // Gaps for R2 (Flexible visualization: table, kanban, cards)
  const missingModes = [];
  if (!hasKanban) missingModes.push('Kanban');
  if (!hasTable) missingModes.push('Tabela');
  if (!hasCards) missingModes.push('Cards');

  results.push({
    file: r,
    exists: true,
    dataFetchMethod,
    hasServerFunctions: importedFunctions.length > 0,
    importedFunctionsCount: importedFunctions.length,
    currentModes: viewSwitchingModes,
    hasViewModeToggle: hasViewModeState,
    missingR2Modes: missingModes,
    r2Eligible: true
  });
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/operational_flows_detailed.json'),
  JSON.stringify(results, null, 2),
  'utf8'
);

console.log('Operational routes analyzed:', results.length);
console.log('Routes with view mode toggle:', results.filter(r => r.hasViewModeToggle).length);
console.log('Routes missing Kanban:', results.filter(r => r.missingR2Modes && r.missingR2Modes.includes('Kanban')).length);
console.log('Routes missing Tabela:', results.filter(r => r.missingR2Modes && r.missingR2Modes.includes('Tabela')).length);
console.log('Routes missing Cards:', results.filter(r => r.missingR2Modes && r.missingR2Modes.includes('Cards')).length);
