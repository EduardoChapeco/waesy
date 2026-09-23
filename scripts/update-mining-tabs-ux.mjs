import fs from 'fs';
const path = 'src/components/mining/advanced-mining-tabs.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Update TokenEconomyBanner
content = content.replace(
  'ZERO-TOKEN ARCHITECTURE',
  'MOTOR DE ALTA EFICIÊNCIA'
);
content = content.replace(
  'Extração Mecânica Industrial Open-Source',
  'Processamento Estruturado Sem Custo de IA'
);
content = content.replace(
  'Economia Extrema de Tokens de IA',
  'Operação Otimizada & Inteligente'
);
content = content.replace(
  'Extrações Mecânicas',
  'Importações Diretas'
);

// 2. Update DataJudMiningPanel
content = content.replace(
  '2. Painel Harvester DataJud CNJ (Processos Judiciais)',
  '2. Sincronização de Processos Judiciais (CNJ)'
);
content = content.replace(
  'Consultar e indexar autos processuais do tribunal em tempo real.',
  'Acompanhe andamentos, movimentações e prazos diretamente pelo número do processo.'
);
content = content.replace(
  'Consultar DataJud CNJ',
  'Sincronizar Processo'
);
content = content.replace(
  'Executar Harvester DataJud',
  'Sincronizar Processo'
);

// 3. Update PlacesMiningPanel
content = content.replace(
  '3. Places Harvester / Scraping OpenStreetMap',
  '3. Descobrir Empresas & Negócios Locais'
);
content = content.replace(
  'Mineração de empresas, comércios e prestadores de serviço locais',
  'Importe estabelecimentos comerciais da cidade para enriquecer o catálogo e ativar novas lojas'
);
content = content.replace(
  'Iniciar Scraping de Estabelecimentos',
  'Buscar Estabelecimentos na Região'
);

// 4. Update SpecializedUrlMiningPanel
content = content.replace(
  '4. Specialized Extractor de URL (Schema.org / JSON-LD Zero-Token)',
  '4. Importador por Link (Catálogos, Receitas & Eventos)'
);
content = content.replace(
  'Extração estruturada mecânica com custo 0 de IA para links compatíveis',
  'Importe produtos, cardápios, ingredientes e programações a partir do link de qualquer site'
);
content = content.replace(
  'Extrair Conteúdo Mecânico',
  'Importar Dados do Link'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Successfully updated advanced-mining-tabs.tsx with B2B Silent Design UX writing!');
