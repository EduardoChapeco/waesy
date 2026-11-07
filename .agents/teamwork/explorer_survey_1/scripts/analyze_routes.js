const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const report = {
  total: files.length,
  byPrefix: {},
  mockDataFound: [],
  operationalManagementRoutes: [],
  routesList: []
};

const opKeywords = [
  'agenda', 'agendamento', 'cliente', 'pedido', 'tarefa', 'ordem',
  'servico', 'crm', 'orcamento', 'contrato', 'estoque', 'imoveis',
  'evento', 'processo', 'advocacia', 'turismo', 'atendimento', 'rh',
  'squads', 'pdv', 'fornecedor', 'leads', 'vendas', 'b2b', 'comercial'
];

files.forEach(f => {
  const filePath = path.join(routesDir, f);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasLoader = content.includes('loader:') || (content.includes('createFileRoute') && content.includes('loader'));
  const hasServerFunctions = /from\s+['"][^'"]*functions['"]/i.test(content) || 
                             /from\s+['"][^'"]*services\/[^'"]*['"]/i.test(content) ||
                             /supabase/i.test(content);
  
  // mock markers
  const mockMarkers = [
    /\b(mock[A-Z]\w*|mockData|MOCK_\w+|sampleData|SAMPLE_\w+|dummyData)\b/g,
    /const\s+[A-Za-z0-9_]+List\s*=\s*\[\s*\{/g,
    /const\s+INITIAL_[A-Z_]+\s*=\s*\[\s*\{/g,
    /const\s+DEMO_[A-Z_]+\s*=\s*\[/g
  ];
  let mockMatches = [];
  mockMarkers.forEach(regex => {
    let m;
    while ((m = regex.exec(content)) !== null) {
      mockMatches.push(m[0]);
    }
  });

  const isOp = opKeywords.some(kw => f.toLowerCase().includes(kw));

  // check view modes in op routes
  let viewModes = [];
  if (/kanban/i.test(content)) viewModes.push('kanban');
  if (/table|tabela/i.test(content)) viewModes.push('table');
  if (/cards|grid/i.test(content)) viewModes.push('cards/grid');
  if (/calendar|calendario/i.test(content)) viewModes.push('calendar');
  if (/list|lista/i.test(content)) viewModes.push('list');

  // check toggle between modes
  const hasViewModeToggle = /viewMode|currentView|mode\s*===|setViewMode|activeView|visualizacao/i.test(content);

  const routeItem = {
    file: f,
    hasLoader,
    hasServerFunctions,
    mockMatches: mockMatches.length > 0 ? Array.from(new Set(mockMatches)) : null,
    isOp,
    viewModes: Array.from(new Set(viewModes)),
    hasViewModeToggle
  };

  report.routesList.push(routeItem);
  if (mockMatches.length > 0) {
    report.mockDataFound.push({ file: f, mocks: Array.from(new Set(mockMatches)), hasLoader, hasServerFunctions });
  }
  if (isOp && (f.startsWith('workspace') || f.startsWith('admin-master'))) {
    report.operationalManagementRoutes.push({ file: f, viewModes: Array.from(new Set(viewModes)), hasViewModeToggle, hasLoader, hasServerFunctions });
  }
});

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/route_analysis.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('Total route files analyzed:', report.total);
console.log('Files with mock/static identifiers:', report.mockDataFound.length);
console.log('Operational management routes in workspace/admin:', report.operationalManagementRoutes.length);
console.log('Op routes with view mode toggle:', report.operationalManagementRoutes.filter(r => r.hasViewModeToggle).length);
console.log('Op routes WITHOUT view mode toggle:', report.operationalManagementRoutes.filter(r => !r.hasViewModeToggle).length);
