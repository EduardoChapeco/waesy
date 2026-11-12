import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const CSV_FILE = path.join(OUTPUT_DIR, 'clientes_excelencia_tour_oficial.csv');
const JSON_FILE = path.join(OUTPUT_DIR, 'clientes_excelencia_tour_oficial.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const CANONICAL_HEADERS = [
  'ID Reserva',
  'Status Reserva',
  'Data Criacao',
  'Check-in',
  'Check-out',
  'Operadora',
  'Contato Titular',
  'Email Contato',
  'Telefone Contato',
  'Nome Passageiro',
  'CPF Passageiro',
  'Data Nascimento',
  'Idade',
  'Tipo (ADT/CHD/INF)',
  'E Titular?',
  'Hotel / Destino',
  'Acomodacao',
  'Localizador',
  'Valor Total Venda (R$)',
  'Taxas Inclusas (R$)',
  'Impostos Inclusos (R$)',
  'Forma de Pagamento',
  'Status Pagamento',
  'Score Confianca',
  'Banco Emissor',
  'Parcelamento',
  'Comissao Agencia (R$)',
];

// Inicializa CSV com BOM UTF-8 se não existir
if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, '\uFEFF' + CANONICAL_HEADERS.join(';') + '\n', 'utf-8');
}

if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, '[]', 'utf-8');
}

let totalLinhasGravadas = 0;
let totalVendasR$ = 0;
let totalComissaoR$ = 0;
const uniqueTripIds = new Set();

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${s}"`;
}

function appendJsonReservation(dados) {
  try {
    let list = [];
    if (fs.existsSync(JSON_FILE)) {
      list = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      if (!Array.isArray(list)) list = [];
    }
    const idx = list.findIndex((item) => item && item.resId === dados.resId);
    if (idx >= 0) {
      list[idx] = dados;
    } else {
      list.push(dados);
    }
    fs.writeFileSync(JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // Nao interrompe gravacao CSV caso JSON falhe
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && pathname === '/salvar') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const dados = JSON.parse(body);
        const {
          resId,
          operatorSlug = 'orinter',
          status = 'Confirmada',
          criacao = '',
          checkIn = '',
          checkOut = '',
          contato = '',
          email = '',
          telefone = '',
          hotel = '',
          acomodacao = 'Standard',
          localizador = '',
          totalCompra = '0,00',
          taxas = '0,00',
          impostos = '0,00',
          formaPagto = 'Faturado',
          statusPagto = 'Aprovado',
          scoreConfianca = 80,
          bancoEmissor = 'Operadora Direto',
          parcelamento = '1x',
          comissaoTotal = '0,00',
          passageiros = [],
        } = dados;

        const linhasParaGravar = [];
        const paxList =
          Array.isArray(passageiros) && passageiros.length > 0
            ? passageiros
            : [{ nome: contato || 'Titular', cpf: '', nasc: '', idade: '', tipo: 'ADT', titular: true }];

        paxList.forEach((p) => {
          linhasParaGravar.push(
            [
              resId,
              status,
              criacao,
              checkIn,
              checkOut,
              operatorSlug,
              contato,
              email,
              telefone,
              p.nome,
              p.cpf,
              p.nasc,
              p.idade,
              p.tipo || 'ADT',
              p.titular === true || p.titular === 'SIM' ? 'SIM' : 'NAO',
              hotel,
              acomodacao,
              localizador,
              totalCompra,
              taxas,
              impostos,
              formaPagto,
              statusPagto,
              scoreConfianca,
              bancoEmissor,
              parcelamento,
              comissaoTotal,
            ]
              .map(escapeCsv)
              .join(';')
          );
          totalLinhasGravadas++;
        });

        fs.appendFileSync(CSV_FILE, linhasParaGravar.join('\n') + '\n', 'utf-8');
        appendJsonReservation(dados);

        if (resId) uniqueTripIds.add(String(resId));
        const vNum = parseFloat(String(totalCompra).replace(/\./g, '').replace(',', '.')) || 0;
        const cNum = parseFloat(String(comissaoTotal).replace(/\./g, '').replace(',', '.')) || 0;
        totalVendasR$ += vNum;
        totalComissaoR$ += cNum;

        console.log(
          `[Gravado no Disco] Reserva ${resId} (${operatorSlug}) | +${paxList.length} pax | Total acumulado: ${totalLinhasGravadas} linhas`
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            totalLinhas: totalLinhasGravadas,
            totalTrips: uniqueTripIds.size,
          })
        );
      } catch (err) {
        console.error('Erro ao processar dados:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && (pathname === '/status' || pathname === '/api/status')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        totalLinhasGravadas,
        totalTrips: uniqueTripIds.size,
        totalPax: totalLinhasGravadas,
        totalVendasR$,
        totalComissaoR$,
        caminhoCsv: CSV_FILE,
        caminhoJson: JSON_FILE,
      })
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

const PORT = 3333;
server.listen(PORT, '127.0.0.1', () => {
  console.log('================================================================');
  console.log('COLETOR LOCAL WAESY SYNC ATIVO');
  console.log(`CSV:  ${CSV_FILE}`);
  console.log(`JSON: ${JSON_FILE}`);
  console.log(`API:  http://127.0.0.1:${PORT}/api/status`);
  console.log('================================================================');
});
