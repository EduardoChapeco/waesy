import { describe, it, expect } from 'vitest';
import { validateImportAcrossLayers, ARCHITECTURE_LAYERS, LAYER_DEPENDENCY_RULES } from './layer-contract';

describe('BigTech Architecture Layer Contract (Plano 5 - S06)', () => {
  it('deve declarar todas as 6 camadas canônicas do sistema', () => {
    expect(Object.keys(ARCHITECTURE_LAYERS)).toEqual([
      'app',
      'routes',
      'modules',
      'services',
      'platform',
      'lib'
    ]);
  });

  it('deve reprovar import de componente de UI em camada de services (BFF)', () => {
    const checkReact = validateImportAcrossLayers('src/services/billing-ledger.functions.ts', 'react');
    expect(checkReact.allowed).toBe(false);
    expect(checkReact.violationRule?.fromLayer).toBe('services');

    const checkRadix = validateImportAcrossLayers('src/services/order.functions.ts', '@radix-ui/react-dialog');
    expect(checkRadix.allowed).toBe(false);

    const checkComponent = validateImportAcrossLayers('src/services/catalog.functions.ts', 'src/components/ui/button');
    expect(checkComponent.allowed).toBe(false);
  });

  it('deve reprovar import direto de supabase em camada de rotas', () => {
    const checkSupabase = validateImportAcrossLayers('src/routes/workspace.produtos.novo.tsx', '@supabase/supabase-js');
    expect(checkSupabase.allowed).toBe(false);
    expect(checkSupabase.violationRule?.fromLayer).toBe('routes');
  });

  it('deve permitir imports legítimos entre camadas permitidas', () => {
    // Rota consumindo service BFF
    const routeToService = validateImportAcrossLayers('src/routes/workspace.produtos.novo.tsx', '@/services/unified-listing-workflow.functions');
    expect(routeToService.allowed).toBe(true);

    // Service consumindo Zod ou lib pura
    const serviceToLib = validateImportAcrossLayers('src/services/order.functions.ts', 'zod');
    expect(serviceToLib.allowed).toBe(true);

    // Arquivos de teste são isentos de restrição para fins de simulação/mocking
    const testFile = validateImportAcrossLayers('src/services/order.functions.test.ts', 'react');
    expect(testFile.allowed).toBe(true);
  });
});
