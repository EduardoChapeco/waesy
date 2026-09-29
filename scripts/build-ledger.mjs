import fs from 'fs';
import path from 'path';

const SURFACE_PATH = path.resolve('melhoria/00-superficie.json');
const CHAIN_PATH = path.resolve('melhoria/chain-report.json');
const LEDGER_PATH = path.resolve('melhoria/05-ledger.json');

const surface = JSON.parse(fs.readFileSync(SURFACE_PATH, 'utf-8'));
const chain = JSON.parse(fs.readFileSync(CHAIN_PATH, 'utf-8'));

const ledger = [];
let gapCounter = 1;

function nextId() {
  const id = `GAP-${String(gapCounter).padStart(3, '0')}`;
  gapCounter++;
  return id;
}

// 1. Adicionar as 5 Quebras Críticas de Round-Trip
ledger.push({
  id: nextId(),
  tipo: 'quebra',
  modulo: 'estoque',
  localizacao: 'src/routes/workspace.estoque.tsx:142',
  descricao: 'Ausência de invalidação de cache TanStack Query após mutação de produto',
  evidencia: 'Mutação direta sem queryClient.invalidateQueries({ queryKey: [catalog] }) em onSuccess',
  elo_faltante: 'Elo 5 (Hook/Invalidação)',
  dimensao: 'D02',
  impacto: 5,
  severidade: 4,
  esforco: 1,
  score: (5 * 3) + 4 - 1, // 18
  onda: 'ONDA-1',
  status: 'ABERTO'
});

ledger.push({
  id: nextId(),
  tipo: 'quebra',
  modulo: 'pdv',
  localizacao: 'src/routes/workspace.pdv.index.tsx:210',
  descricao: 'Spinner de loading infinito ao falhar fechamento de comanda no PDV',
  evidencia: 'Bloco catch silencioso sem reset de isSubmitting e sem toast de erro',
  elo_faltante: 'Elo 6 (Feedback de Erro)',
  dimensao: 'D04',
  impacto: 5,
  severidade: 5,
  esforco: 1,
  score: (5 * 3) + 5 - 1, // 19
  onda: 'ONDA-1',
  status: 'ABERTO'
});

ledger.push({
  id: nextId(),
  tipo: 'quebra',
  modulo: 'checkout',
  localizacao: 'src/routes/checkout.tsx:320',
  descricao: 'Botão de pagamento PIX congela em loading infinito se expirar token de transação',
  evidencia: 'Bloco catch silencioso sem reset de estado e sem aviso de timeout',
  elo_faltante: 'Elo 6 (Feedback de Erro)',
  dimensao: 'D06',
  impacto: 5,
  severidade: 5,
  esforco: 1,
  score: (5 * 3) + 5 - 1, // 19
  onda: 'ONDA-1',
  status: 'ABERTO'
});

ledger.push({
  id: nextId(),
  tipo: 'quebra',
  modulo: 'motolink',
  localizacao: 'src/routes/conta.meus-pedidos.tsx:98',
  descricao: 'Desconexão silenciosa de Realtime no acompanhamento de corrida do MotoLink',
  evidencia: 'Canal Supabase Realtime sem callback de reconexão automática ao transicionar 4G/WiFi',
  elo_faltante: 'Elo 5 (Hook Realtime)',
  dimensao: 'D01',
  impacto: 4,
  severidade: 4,
  esforco: 2,
  score: (4 * 3) + 4 - 2, // 14
  onda: 'ONDA-1',
  status: 'ABERTO'
});

ledger.push({
  id: nextId(),
  tipo: 'quebra',
  modulo: 'turismo',
  localizacao: 'src/routes/workspace.turismo.cotacoes.tsx:85',
  descricao: 'Página em branco ao navegar para lista anterior com parâmetros de busca vazios',
  evidencia: 'Schema Zod de search params sem default defensivo em page e query',
  elo_faltante: 'Elo 4 (Contrato Zod)',
  dimensao: 'D07',
  impacto: 4,
  severidade: 4,
  esforco: 1,
  score: (4 * 3) + 4 - 1, // 15
  onda: 'ONDA-1',
  status: 'ABERTO'
});

// 2. Componentes construídos mas fora do roteador (Elo 6 presente, Elo 7 faltante)
const orphanComponents = surface.componentes.filter(c => c.fora_do_roteador);
for (const comp of orphanComponents) {
  const mod = comp.arquivo.split('/')[2] || 'ui';
  const score = (4 * 3) + 3 - 2; // 13
  ledger.push({
    id: nextId(),
    tipo: 'cadeia_parcial',
    modulo: mod,
    localizacao: comp.arquivo,
    descricao: `Componente ${comp.exporta} construído e exportado mas não importado no roteador`,
    evidencia: `Zero importações ativas em src/routes/ e src/components/`,
    elo_faltante: 'Elo 7 (Rota de UI)',
    dimensao: 'D07',
    impacto: 4,
    severidade: 3,
    esforco: 2,
    score: score,
    onda: 'ONDA-2',
    status: 'ABERTO'
  });
}

// 3. Funções backend órfãs (Elo 3 presente, Elo 5/6/7 faltantes)
const orphanFns = surface.funcoes_backend.filter(f => f.chamada_ausente);
for (const fn of orphanFns) {
  const mod = path.basename(fn.arquivo).replace('.functions.ts', '');
  const score = (3 * 3) + 3 - 2; // 10
  ledger.push({
    id: nextId(),
    tipo: 'cadeia_parcial',
    modulo: mod,
    localizacao: fn.arquivo,
    descricao: `Função backend ${fn.nome} exportada em services mas sem hook ou rota de consumo`,
    evidencia: `Zero referências no repositório fora de seu próprio arquivo de definição`,
    elo_faltante: 'Elo 5 (Hook TanStack) / Elo 6 (Componente)',
    dimensao: 'D01',
    impacto: 3,
    severidade: 3,
    esforco: 2,
    score: score,
    onda: 'ONDA-2',
    status: 'ABERTO'
  });
}

// 4. Promessas Vazias ("Em Breve" na UI)
for (const p of surface.textos_promessa) {
  const mod = p.arquivo.split('/')[2] || 'ui';
  const score = (3 * 3) + 2 - 1; // 10
  ledger.push({
    id: nextId(),
    tipo: 'promessa_vazia',
    modulo: mod,
    localizacao: `${p.arquivo}:${p.linha}`,
    descricao: `Texto de promessa não cumprida ('${p.termo}') no elemento de interface`,
    evidencia: p.contexto,
    elo_faltante: 'Elo 1 a 6 (Implementação completa ou remoção de ruído)',
    dimensao: 'D11',
    impacto: 3,
    severidade: 2,
    esforco: 1,
    score: score,
    onda: 'ONDA-3',
    status: 'ABERTO'
  });
}

// 5. Oportunidades estratégicas (Tabelas de gravação unidirecional)
const opportunities = [
  {
    tabela: 'abandoned_carts',
    modulo: 'checkout',
    desc: 'Disparador de recuperação de carrinho abandonado com cupom via WhatsApp',
    score: 18,
    onda: 'ONDA-4'
  },
  {
    tabela: 'cash_register_entries',
    modulo: 'pdv',
    desc: 'Relatório e auditoria de fechamento cego de caixa por turno de operador',
    score: 17,
    onda: 'ONDA-4'
  },
  {
    tabela: 'stock_movements',
    modulo: 'estoque',
    desc: 'Extrato analítico Kardex de entradas, perdas e quebras de produto',
    score: 16,
    onda: 'ONDA-4'
  },
  {
    tabela: 'whatsapp_leads',
    modulo: 'crm',
    desc: 'Inbox de novos contatos do webhook WhatsApp com atribuição rápida a vendedor',
    score: 16,
    onda: 'ONDA-4'
  },
  {
    tabela: 'affiliate_clicks',
    modulo: 'afiliados',
    desc: 'Dashboard de comissões, cliques e conversão UTM para criadores de conteúdo',
    score: 14,
    onda: 'ONDA-4'
  },
  {
    tabela: 'delivery_runs',
    modulo: 'dispatch',
    desc: 'Radar de despacho com telemetria de tempo de espera e gargalos de entrega',
    score: 14,
    onda: 'ONDA-4'
  },
  {
    tabela: 'employee_pin_audit_logs',
    modulo: 'seguranca',
    desc: 'Timeline de auditoria de estornos e descontos concedidos por PIN gerencial',
    score: 13,
    onda: 'ONDA-4'
  },
  {
    tabela: 'story_analytics_events',
    modulo: 'marketing',
    desc: 'Card analítico de visualizações e retenção de stories comerciais locais',
    score: 12,
    onda: 'ONDA-4'
  },
  {
    tabela: 'lead_activities',
    modulo: 'crm',
    desc: 'Feed cronológico de ligações, reuniões e propostas do lead no painel CRM',
    score: 12,
    onda: 'ONDA-4'
  },
  {
    tabela: 'coupons',
    modulo: 'catalogo',
    desc: 'Painel gerencial de cupons de desconto ativos com consumo de margem',
    score: 11,
    onda: 'ONDA-4'
  },
  {
    tabela: 'product_location_inventories',
    modulo: 'estoque',
    desc: 'Grade de transferência entre estoques por depósito e prateleira',
    score: 11,
    onda: 'ONDA-4'
  },
  {
    tabela: 'shipping_quotes',
    modulo: 'logistica',
    desc: 'Mapa de calor de cotações de frete abandonadas por CEP urbano',
    score: 10,
    onda: 'ONDA-4'
  }
];

for (const op of opportunities) {
  ledger.push({
    id: nextId(),
    tipo: 'oportunidade',
    modulo: op.modulo,
    localizacao: `database.tables.${op.tabela}`,
    descricao: op.desc,
    evidencia: `Tabela ${op.tabela} gravada mas sem tela/dashboard de devolução de valor`,
    elo_faltante: 'Elo 5 (Hook) / Elo 6 (Componente) / Elo 7 (Rota)',
    dimensao: 'D01',
    impacto: 5,
    severidade: 3,
    esforco: 2,
    score: op.score,
    onda: op.onda,
    status: 'ABERTO'
  });
}

// 6. Ordenar por score decrescente
ledger.sort((a, b) => b.score - a.score);

// 7. Salvar ledger.json
fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8');

console.log(`Ledger gerado com sucesso: ${ledger.length} gaps registrados.`);
console.log('Distribuição por onda:');
const byWave = ledger.reduce((acc, item) => {
  acc[item.onda] = (acc[item.onda] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify(byWave, null, 2));
