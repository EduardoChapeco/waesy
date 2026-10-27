import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const CSV_FILE = path.join(OUTPUT_DIR, 'clientes_excelencia_tour_oficial.csv');
const JSON_FILE = path.join(OUTPUT_DIR, 'clientes_excelencia_tour_oficial.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Inicializa CSV com BOM UTF-8 se não existir
if (!fs.existsSync(CSV_FILE)) {
  const headers = [
    'ID Reserva',
    'Status Reserva',
    'Data Criacao',
    'Contato Titular',
    'Email Contato',
    'Telefone Contato',
    'Unidade',
    'Atendente',
    'Nome Passageiro',
    'CPF Passageiro',
    'Data Nascimento',
    'Idade',
    'Tipo (ADT/CHD)',
    'E Titular?',
    'Hotel / Destino',
    'Valor Total Venda (R$)',
    'Taxas Inclusas (R$)',
    'Impostos Inclusos (R$)',
    'Forma de Pagamento',
    'Parcelamento',
    'Comissao Agencia (R$)'
  ];
  fs.writeFileSync(CSV_FILE, '\uFEFF' + headers.join(';') + '\n', 'utf-8');
}

let totalLinhasGravadas = 0;
let totalVendasR$ = 0;
let totalComissaoR$ = 0;

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${s}"`;
}

const server = http.createServer((req, res) => {
  // CORS liberado para o Chrome
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/salvar') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const dados = JSON.parse(body);
        const { resId, status, criacao, contato, email, telefone, unidade, atendente, hotel, totalCompra, taxas, impostos, formaPagto, parcelamento, comissaoTotal, passageiros } = dados;

        const linhasParaGravar = [];

        if (passageiros && passageiros.length > 0) {
          passageiros.forEach(p => {
            linhasParaGravar.push([
              resId,
              status,
              criacao,
              contato,
              email,
              telefone,
              unidade,
              atendente,
              p.nome,
              p.cpf,
              p.nasc,
              p.idade,
              p.tipo,
              p.titular,
              hotel,
              totalCompra,
              taxas,
              impostos,
              formaPagto,
              parcelamento,
              comissaoTotal
            ].map(escapeCsv).join(';'));
            totalLinhasGravadas++;
          });
        } else {
          linhasParaGravar.push([
            resId,
            status,
            criacao,
            contato,
            email,
            telefone,
            unidade,
            atendente,
            contato || 'Titular',
            '',
            '',
            '',
            'TITULAR',
            'SIM',
            hotel,
            totalCompra,
            taxas,
            impostos,
            formaPagto,
            parcelamento,
            comissaoTotal
          ].map(escapeCsv).join(';'));
          totalLinhasGravadas++;
        }

        fs.appendFileSync(CSV_FILE, linhasParaGravar.join('\n') + '\n', 'utf-8');

        const vNum = parseFloat(String(totalCompra).replace(/\./g, '').replace(',', '.')) || 0;
        const cNum = parseFloat(String(comissaoTotal).replace(/\./g, '').replace(',', '.')) || 0;
        totalVendasR$ += vNum;
        totalComissaoR$ += cNum;

        console.log(`💾 [Gravado no Disco] Reserva ${resId} | +${passageiros ? passageiros.length : 1} cadastro(s) | Total acumulado no CSV: ${totalLinhasGravadas} linhas`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, totalLinhas: totalLinhasGravadas }));
      } catch (err) {
        console.error('Erro ao processar dados:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalLinhasGravadas,
      totalVendasR$,
      totalComissaoR$,
      caminhoCsv: CSV_FILE
    }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log('================================================================');
  console.log('🛡️ SERVIDOR GRAVADOR ATIVO NO SEU COMPUTADOR');
  console.log(`📁 Salvando diretamente no arquivo físico:`);
  console.log(`   ${CSV_FILE}`);
  console.log(`⚡ Porta: http://localhost:${PORT}`);
  console.log('================================================================');
});
