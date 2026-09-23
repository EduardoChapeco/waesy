import fs from 'fs';

const file = 'src/components/mining/mining-dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
if (!content.includes('TokenEconomyBanner')) {
  content = `import { TokenEconomyBanner, DataJudMiningPanel, PlacesMiningPanel, SpecializedUrlMiningPanel } from "./advanced-mining-tabs";\nimport { Scale, MapPin, Utensils, Zap } from "lucide-react";\n` + content;
}

// 2. Add TokenEconomyBanner above KPI cards
if (!content.includes('<TokenEconomyBanner />')) {
  content = content.replace(
    '{/* KPI Cards — Clean Paradigm */}',
    `{/* Banner de Economia de Tokens de IA */}\n      <TokenEconomyBanner />\n\n      {/* KPI Cards — Clean Paradigm */}`
  );
}

// 3. Add tabs to TabsList
if (!content.includes('value="datajud"')) {
  const newTabsTriggers = `          <TabsTrigger value="datajud" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Processos CNJ
          </TabsTrigger>
          <TabsTrigger value="places" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Empresas (Places)
          </TabsTrigger>
          <TabsTrigger value="specialized" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <Utensils className="w-3.5 h-3.5" />
            Receitas & Eventos
          </TabsTrigger>
`;

  content = content.replace(
    '<TabsTrigger value="audit" className="rounded-lg text-xs font-normal py-2 px-3">\n            Logs de Auditoria\n          </TabsTrigger>',
    `<TabsTrigger value="audit" className="rounded-lg text-xs font-normal py-2 px-3">\n            Logs de Auditoria\n          </TabsTrigger>\n${newTabsTriggers}`
  );
}

// 4. Add TabsContent
if (!content.includes('<DataJudMiningPanel />')) {
  const newTabsContents = `
        {/* TAB DATAJUD */}
        <TabsContent value="datajud" className="space-y-4">
          <DataJudMiningPanel />
        </TabsContent>

        {/* TAB PLACES */}
        <TabsContent value="places" className="space-y-4">
          <PlacesMiningPanel />
        </TabsContent>

        {/* TAB SPECIALIZED (RECEITAS & EVENTOS) */}
        <TabsContent value="specialized" className="space-y-4">
          <SpecializedUrlMiningPanel />
        </TabsContent>
`;

  content = content.replace(
    '{/* TAB 1: VISÃO GERAL */}',
    `${newTabsContents}\n        {/* TAB 1: VISÃO GERAL */}`
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Integrated advanced mining tabs into mining-dashboard.tsx');
