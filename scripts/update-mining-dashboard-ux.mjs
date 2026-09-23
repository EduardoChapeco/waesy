import fs from 'fs';
const path = 'src/components/mining/mining-dashboard.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Header
content = content.replace(
  '<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">\n            <Database className="w-5 h-5 text-primary" />\n            Mineração\n          </h1>',
  '<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">\n            <Database className="w-5 h-5 text-primary" />\n            Central de Dados & Inteligência Comercial\n          </h1>'
);

content = content.replace(
  'Controle de filas, feeds RSS, indicadores oficiais e diretório de empresas.',
  'Gestão unificada de importações, catálogo comercial, processos judiciais e indicadores de mercado.'
);

content = content.replace(
  'Executar Crawl',
  'Sincronizar Dados'
);

// 2. TabsList triggers
content = content.replace(
  '<TabsTrigger value="queue" className="rounded-lg text-xs font-normal py-2 px-3">\n            Fila',
  '<TabsTrigger value="queue" className="rounded-lg text-xs font-normal py-2 px-3">\n            Importações Agendadas'
);

content = content.replace(
  '<TabsTrigger value="feeds" className="rounded-lg text-xs font-normal py-2 px-3">\n            Feeds RSS',
  '<TabsTrigger value="feeds" className="rounded-lg text-xs font-normal py-2 px-3">\n            Feeds de Notícias'
);

content = content.replace(
  '<TabsTrigger value="audit" className="rounded-lg text-xs font-normal py-2 px-3">\n            Logs de Auditoria\n          </TabsTrigger>',
  '<TabsTrigger value="audit" className="rounded-lg text-xs font-normal py-2 px-3">\n            Histórico de Importações\n          </TabsTrigger>'
);

content = content.replace(
  'Empresas (Places)',
  'Buscar Empresas Locais'
);

content = content.replace(
  'Receitas & Eventos',
  'Importar por Link'
);

content = content.replace(
  'Processos CNJ',
  'Processos Judiciais (CNJ)'
);

content = content.replace(
  'Anti-Ban (',
  'Segurança & Conexão ('
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Successfully updated mining-dashboard.tsx with B2B Silent UX Writing!');
