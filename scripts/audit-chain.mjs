import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SUPERFICIE_PATH = path.join(ROOT_DIR, 'melhoria/00-superficie.json');
if (!fs.existsSync(SUPERFICIE_PATH)) {
  console.error('ERRO: melhoria/00-superficie.json não encontrado. Execute scripts/audit-surface.mjs primeiro.');
  process.exit(1);
}

const superficie = JSON.parse(fs.readFileSync(SUPERFICIE_PATH, 'utf8'));

// Identificar cadeias quebradas / features parciais
const brokenChains = [];

// 1. Funções de backend orfas (Elo 3 existe, mas Elo 5/6/7 ausente)
for (const fn of superficie.funcoes_backend) {
  if (fn.chamada_ausente) {
    brokenChains.push({
      modulo: path.basename(fn.arquivo, '.functions.ts'),
      feature: fn.nome,
      elo_presente: ['Service BFF (' + fn.arquivo + ')'],
      elo_faltante: 'Hook de Consumo ou Rota de UI (Elo 5 / 7)',
      impacto: 'Lógica transacional de backend implementada mas inacessível ao usuário final',
      severidade: 'ALTA'
    });
  }
}

// 2. Componentes fora do roteador (Elo 6 existe, mas Elo 7 ausente)
for (const comp of superficie.componentes) {
  if (comp.fora_do_roteador) {
    brokenChains.push({
      modulo: path.basename(path.dirname(comp.arquivo)),
      feature: comp.exporta,
      elo_presente: ['Componente UI (' + comp.arquivo + ')'],
      elo_faltante: 'Entrada no Roteador / Menu de Navegação (Elo 7)',
      impacto: 'Interface construída mas desconectada da jornada do usuário',
      severidade: 'MEDIA'
    });
  }
}

// 3. Tabelas apenas com leitura ou apenas com escrita (desbalanceamento de persistencia)
for (const tbl of superficie.tabelas) {
  if (tbl.apenas_escrita) {
    brokenChains.push({
      modulo: 'Persistência DB',
      feature: tbl.nome,
      elo_presente: ['Gravação (' + tbl.escritas_por.join(', ') + ')'],
      elo_faltante: 'Interface de Leitura / Devolução de Valor (Elo 6)',
      impacto: 'Dado coletado que nunca volta para o usuário em tela de histórico ou auditoria',
      severidade: 'ALTA'
    });
  } else if (tbl.apenas_leitura) {
    brokenChains.push({
      modulo: 'Persistência DB',
      feature: tbl.nome,
      elo_presente: ['Consulta (' + tbl.lidas_por.join(', ') + ')'],
      elo_faltante: 'Interface de Cadastro / Gravação (Elo 6)',
      impacto: 'Tabela consultada sem fluxo operacional evidente de entrada de dados pelo app',
      severidade: 'BAIXA'
    });
  }
}

// 4. Textos de Promessa ("Em breve")
for (const prom of superficie.textos_promessa) {
  brokenChains.push({
    modulo: path.basename(prom.arquivo),
    feature: `Texto de Promessa "${prom.trecho}"`,
    elo_presente: ['Markup da Tela (' + prom.arquivo + ')'],
    elo_faltante: 'Implementação Real da Funcionalidade Prometida',
    impacto: 'Falso botão ou card bloqueando conclusão do operador',
    severidade: 'MEDIA'
  });
}

const resultado = {
  total_gaps_cadeia: brokenChains.length,
  por_severidade: {
    ALTA: brokenChains.filter(b => b.severidade === 'ALTA').length,
    MEDIA: brokenChains.filter(b => b.severidade === 'MEDIA').length,
    BAIXA: brokenChains.filter(b => b.severidade === 'BAIXA').length
  },
  amostra_principais: brokenChains.slice(0, 50)
};

fs.writeFileSync(path.join(ROOT_DIR, 'melhoria/chain-report.json'), JSON.stringify(resultado, null, 2));
console.log(`Detecção estática de cadeia concluída: ${brokenChains.length} elos faltantes identificados.`);
