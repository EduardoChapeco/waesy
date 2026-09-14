/**
 * KDS Engine - Kitchen Display System
 * Motor de exibição de pedidos para cozinha/produção
 */

export const defineEngine = <T>(config: T): T => config;

export const KDSEngine = defineEngine({
  id: 'kds_engine',
  name: 'KDS Engine',
  version: '1.0.0',
  description: 'Sistema de Display de Cozinha para gestão de pedidos',
  responsibility: 'Gerenciar fila de pedidos, tempos e fluxo de produção',
  status: 'core',
  type: 'core',
  icon: 'ChefHat',
  
  files: {
    hooks: [
      'useKDS.ts',
      'useOrderQueue.ts',
      'useProductionTimer.ts',
    ],
    services: [
      'kds.service.ts',
      'order-routing.service.ts',
    ],
    components: [
      'KDSDisplay.tsx',
      'OrderCard.tsx',
      'ProductionStation.tsx',
      'TimerBadge.tsx',
    ],
  },
  
  database: {
    tables: [
      'kds_orders',
      'kds_order_items',
      'kds_stations',
      'kds_production_times',
    ],
  },
  
  apis: {
    endpoints: [
      '/api/kds/orders',
      '/api/kds/stations',
      '/api/kds/metrics',
    ],
    actions: [
      'receiveOrder',
      'startProduction',
      'completeItem',
      'completeOrder',
      'bumpOrder',
      'recallOrder',
    ],
  },
  
  dependencies: {
    consumes: ['pdv_engine', 'identity_engine'],
    consumedBy: ['analytics_engine'],
  },
  
  boundaries: {
    can: [
      'Receber pedidos do PDV',
      'Gerenciar fila de produção',
      'Medir tempos de preparo',
      'Rotear itens para estações',
      'Alertar sobre pedidos atrasados',
    ],
    cannot: [
      'Processar pagamentos',
      'Gerenciar estoque',
      'Emitir notas fiscais',
    ],
  },
});

export default KDSEngine;
