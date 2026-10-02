/**
 * CONTRATO CANÔNICO DE ARQUITETURA EM CAMADAS (Plano 5 - S06)
 * Define as camadas do Waesy e as regras estritas de dependência unidirecional.
 */

export type ArchitectureLayer = 'app' | 'routes' | 'modules' | 'platform' | 'lib' | 'services';

export interface LayerRule {
  fromLayer: ArchitectureLayer;
  disallowedImports: string[];
  rationale: string;
}

export const ARCHITECTURE_LAYERS: Record<ArchitectureLayer, { description: string; pathPattern: string }> = {
  app: {
    description: 'Bootstrap, Providers, Shells Globais, entry-points do Cloudflare Worker',
    pathPattern: 'src/{app,entry-*,server.ts,router.tsx}'
  },
  routes: {
    description: 'Definições de rotas TanStack Start. Responsabilidade exclusiva de orquestração de tela',
    pathPattern: 'src/routes/**'
  },
  modules: {
    description: 'Domínios e componentes de verticais de negócio (Commerce, Turismo, Classificados, etc.)',
    pathPattern: 'src/components/{commerce,classifieds,travel,tourism,food,pos,crm,admin}/**'
  },
  services: {
    description: 'Camada BFF (Server Functions) e integrações seguras. Executa no Cloudflare Worker',
    pathPattern: 'src/services/**'
  },
  platform: {
    description: 'Design System canônico, Primitivas de UI, Registries de Capacidade e Telemetria',
    pathPattern: 'src/{components/ui/canonical,registries}/**'
  },
  lib: {
    description: 'Utilitários puros, schemas Zod, formatadores matemáticos e clientes de infraestrutura',
    pathPattern: 'src/lib/**'
  }
};

export const LAYER_DEPENDENCY_RULES: LayerRule[] = [
  {
    fromLayer: 'services',
    disallowedImports: [
      'react',
      'react-dom',
      '@radix-ui',
      '@phosphor-icons',
      'lucide-react',
      'framer-motion',
      'src/components'
    ],
    rationale: 'BFF Server Functions executam em worker headless e são estritamente desacopladas de componentes de UI e DOM'
  },
  {
    fromLayer: 'routes',
    disallowedImports: [
      '@supabase/supabase-js'
    ],
    rationale: 'Rotas de tela devem orquestrar dados via Server Functions tipadas (BFF), nunca chamando persistência direta em componentes'
  },
  {
    fromLayer: 'lib',
    disallowedImports: [
      'react',
      'react-dom',
      '@radix-ui',
      'src/components'
    ],
    rationale: 'Utilitários puros de cálculo, validação e schemas não devem ter dependência de apresentação'
  }
];

export function validateImportAcrossLayers(
  sourcePath: string,
  importTarget: string
): { allowed: boolean; violationRule?: LayerRule } {
  const normalizedSource = sourcePath.replace(/\\/g, '/');

  // Identificar camada de origem
  let currentLayer: ArchitectureLayer | null = null;
  if (normalizedSource.includes('src/services/')) {
    currentLayer = 'services';
  } else if (normalizedSource.includes('src/routes/')) {
    currentLayer = 'routes';
  } else if (normalizedSource.includes('src/lib/')) {
    currentLayer = 'lib';
  }

  if (!currentLayer) {
    return { allowed: true };
  }

  // Ignorar arquivos de teste
  if (normalizedSource.includes('.test.') || normalizedSource.includes('.spec.')) {
    return { allowed: true };
  }

  for (const rule of LAYER_DEPENDENCY_RULES) {
    if (rule.fromLayer === currentLayer) {
      for (const disallowed of rule.disallowedImports) {
        if (importTarget === disallowed || importTarget.startsWith(disallowed + '/') || importTarget.includes(disallowed)) {
          return {
            allowed: false,
            violationRule: rule
          };
        }
      }
    }
  }

  return { allowed: true };
}
