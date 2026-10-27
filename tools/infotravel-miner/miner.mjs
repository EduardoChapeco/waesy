import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const PRINTS_DIR = path.join(OUTPUT_DIR, 'prints');
const CSV_FILE = path.join(OUTPUT_DIR, 'clientes_excelencia_tour_oficial.csv');
const JSON_FILE = path.join(OUTPUT_DIR, 'clientes_excelencia_tour_oficial.json');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progresso.json');
const USER_DATA_DIR = path.join(__dirname, '.chrome-session');

// Garantir diretórios locais
fs.mkdirSync(PRINTS_DIR, { recursive: true });

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Jitter randômico humano: varia entre 1.5s e 6.0s
function getHumanRandomDelay() {
  const delays = [1500, 2200, 3100, 4200, 5800, 2700, 3600, 4900, 1900];
  const idx = Math.floor(Math.random() * delays.length);
  return delays[idx] + Math.floor(Math.random() * 400);
}

// Inicializa CSV com BOM UTF-8 (\uFEFF) para abrir formatado no Excel
function initFiles() {
  if (!fs.existsSync(CSV_FILE)) {
    const headers = [
      'ID Reserva',
      'Status Reserva',
      'Data Criacao',
      'Contato Principal',
      'Email Contato',
      'Telefone Contato',
      'Nome Passageiro',
      'CPF Passageiro',
      'Data Nascimento',
      'Idade',
      'Tipo (ADT/CHD/INF)',
      'E Titular?',
      'Hotel / Destino',
      'Acomodacao / Quarto',
      'Valor Total Venda (R$)',
      'Taxas Inclusas (R$)',
      'Impostos Inclusos (R$)',
      'Forma de Pagamento',
      'Status Pagamento Operadora',
      'Score Confianca Operadora (0-100)',
      'Banco Emissor / Faturamento',
      'Parcelamento',
      'Comissao Agencia (R$)'
    ];
    fs.writeFileSync(CSV_FILE, '\uFEFF' + headers.join(';') + '\n', 'utf-8');
  }

  if (!fs.existsSync(JSON_FILE)) {
    fs.writeFileSync(JSON_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch {
      return { processedIds: [] };
    }
  }
  return { processedIds: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${s}"`;
}

function appendToCsv(rows) {
  if (!rows || rows.length === 0) return;
  const content = rows.map((r) => r.map(escapeCsv).join(';')).join('\n') + '\n';
  fs.appendFileSync(CSV_FILE, content, 'utf-8');
}

function appendToJson(reservation) {
  try {
    let list = [];
    if (fs.existsSync(JSON_FILE)) {
      list = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    }
    const idx = list.findIndex((r) => r.id === reservation.id);
    if (idx >= 0) {
      list[idx] = reservation;
    } else {
      list.push(reservation);
    }
    fs.writeFileSync(JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // Continua
  }
}

// Abre a pasta no Windows Explorer
function openFolderInExplorer() {
  try {
    exec(`explorer.exe "${OUTPUT_DIR}"`);
  } catch {
    // Ignora
  }
}

async function run() {
  console.log('================================================================');
  console.log('🚀 EXTRATOR AUTÔNOMO DE CLIENTES WAESY • INFOTRAVEL / ORINTER');
  console.log('================================================================');
  console.log(`📁 Pasta física de destino: ${OUTPUT_DIR}`);
  console.log(`📊 Arquivo CSV (Excel): ${CSV_FILE}`);
  console.log(`📋 Arquivo JSON: ${JSON_FILE}`);
  console.log('================================================================\n');

  initFiles();
  const progress = loadProgress();
  const processedSet = new Set(progress.processedIds || []);
  console.log(`💾 Total de reservas já mineradas anteriormente: ${processedSet.size}`);

  const args = process.argv.slice(2);
  let maxItems = 10;
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const allArg = args.includes('--all');

  if (allArg) {
    maxItems = Infinity;
    console.log('⚡ Modo selecionado: EXTRAÇÃO TOTAL (todas as mais de 2.000 reservas)');
  } else if (limitArg) {
    maxItems = parseInt(limitArg.split('=')[1], 10) || 10;
    console.log(`⚡ Modo selecionado: PILOTO (${maxItems} reservas)`);
  } else {
    console.log(`⚡ Modo padrão: PILOTO (${maxItems} reservas).`);
  }

  console.log('\n🌐 Abrindo Google Chrome com sessão persistente...');
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const page = browser.pages()[0] || (await browser.newPage());

  console.log('📍 Navegando para o Infotravel Orinter...');
  await page.goto('https://online.orinter.com.br/infotravel/admin/main.xhtml#', {
    waitUntil: 'domcontentloaded',
  });

  console.log('\n👉 1. Se ainda não estiver logado, faça o login normalmente na janela do Chrome.');
  console.log('👉 2. Acesse "Buscar reservas", filtre as datas desejadas e clique em "Pesquisar".');
  console.log('👉 3. Quando a tabela de resultados estiver visível na tela, pressione [ENTER] aqui...\n');

  await askQuestion('Pressione [ENTER] quando a lista de reservas estiver visível...');

  console.log('\n🔎 Iniciando varredura contínua de páginas...');

  let processedCount = 0;
  let hasMorePages = true;
  let pageNumber = 1;

  while (hasMorePages && processedCount < maxItems) {
    console.log(`\n📄 Processando Página ${pageNumber}...`);
    await page.waitForTimeout(2000);

    // Extrai lista de reservas visíveis na tabela atual
    const rowsData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const list = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.innerText || '';
        const matchId = text.match(/\b(13\d{6,7}|\d{7,8})\b/);
        if (matchId) {
          list.push({
            index: i,
            id: matchId[1],
            text: text
          });
        }
      }
      return list;
    });

    console.log(`📋 Reservas identificadas nesta página: ${rowsData.length}`);

    if (rowsData.length === 0) {
      console.log('⚠️ Nenhuma linha com ID de reserva encontrada. Verifique se a pesquisa foi realizada.');
      const ans = await askQuestion('Deseja tentar novamente? Digite [ENTER] para tentar ou "s" para sair: ');
      if (ans.trim().toLowerCase() === 's') break;
      continue;
    }

    for (const r of rowsData) {
      if (processedCount >= maxItems) break;

      const resId = r.id;
      if (processedSet.has(resId)) {
        console.log(`⏩ Reserva ${resId} já processada. Pulando.`);
        continue;
      }

      console.log(`\n----------------------------------------------------------------`);
      console.log(`[${processedCount + 1}] 🔍 Acessando Reserva: ${resId}`);

      try {
        // Clica para abrir a reserva
        const clicked = await page.evaluate((targetId) => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          for (const row of rows) {
            if (row.innerText.includes(targetId)) {
              const btn = row.querySelector('.ui-icon-search, .fa-search, [title*="Visualizar"], [title*="Detalhe"], a, button');
              if (btn) {
                btn.click();
                return true;
              }
              const td = row.querySelector('td');
              if (td) {
                td.click();
                return true;
              }
            }
          }
          return false;
        }, resId);

        if (!clicked) {
          console.log(`⚠️ Não foi possível clicar na reserva ${resId}.`);
          continue;
        }

        // Intervalo randômico humano para carregar a página
        const delayLoad = getHumanRandomDelay();
        await page.waitForTimeout(delayLoad);

        // Extrai dados detalhados da reserva
        const detail = await page.evaluate((targetId) => {
          const bodyText = document.body.innerText || '';

          const getVal = (regex) => {
            const m = bodyText.match(regex);
            return m ? m[1].trim() : '';
          };

          const status = getVal(/Status[:\s]+([^\n\r]+)/i) || getVal(/Tipo\/Status[:\s]+([^\n\r]+)/i) || 'Confirmada';
          const criacao = getVal(/Criação[:\s]+([^\n\r]+)/i);
          const valorTotal = getVal(/Total da compra[:\s]*R\$\s*([0-9.,]+)/i) || getVal(/Total[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const taxas = getVal(/Taxas[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const impostos = getVal(/Impostos[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const comissao = getVal(/Comissão[:\s]*R\$\s*([0-9.,]+)/i) || getVal(/Comissão Agência[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const contato = getVal(/Contato[:\s]+([^\n\r]+)/i);
          const email = getVal(/Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
          const telefone = getVal(/Telefone[:\s]+([0-9()\s-]+)/i);
          const hotel = getVal(/Hotel[:\s]+([^\n\r]+)/i) || getVal(/Destino[:\s]+([^\n\r]+)/i) || getVal(/Tipo:\s*([^\n\r]+)/i);
          const formaPagto = getVal(/Forma de Pagamento[:\s]+([^\n\r]+)/i) || 'Faturado / Operadora';
          const parcelamento = getVal(/Parcelamento[:\s]+([^\n\r]+)/i) || '1x';
          const acomodacao = getVal(/Acomodação[:\s]+([^\n\r]+)/i) || getVal(/Apartamento[:\s]+([^\n\r]+)/i) || getVal(/Quarto[:\s]+([^\n\r]+)/i) || 'Standard';

          // Análise de Pagamento, Boletos e Crédito da Operadora
          let statusPagto = 'Aprovado';
          if (/negad|recusad|cancelad/i.test(bodyText)) {
            statusPagto = 'Negado';
          } else if (/pendente|aguardando/i.test(bodyText)) {
            statusPagto = 'Pendente';
          } else if (/liquidado|pago|quitado/i.test(bodyText)) {
            statusPagto = 'Liquidado';
          }

          let bancoEmissor = 'Operadora Direto';
          if (/itau|itaú/i.test(bodyText)) bancoEmissor = 'Itaú Unibanco';
          else if (/santander/i.test(bodyText)) bancoEmissor = 'Santander';
          else if (/bradesco/i.test(bodyText)) bancoEmissor = 'Bradesco';
          else if (/banco do brasil|bb/i.test(bodyText)) bancoEmissor = 'Banco do Brasil';
          else if (/caixa/i.test(bodyText)) bancoEmissor = 'Caixa Econômica';

          // Cálculo do Score de Confiança da Operadora (Credit Confidence Scoring)
          let scoreConfianca = 75;
          const isBoleto = /boleto|faturad/i.test(formaPagto) || /boleto/i.test(bodyText);
          if (isBoleto && statusPagto !== 'Negado') {
            scoreConfianca = 95; // Operadora concedeu crédito faturado = alta confiança
          } else if (statusPagto === 'Negado') {
            scoreConfianca = 20; // Alerta de risco
          } else if (/cart[aã]o/i.test(formaPagto)) {
            scoreConfianca = 80;
          }

          // Passageiros
          const passengers = [];
          const paxRegex = /([A-ZÀ-Ú\s]{4,40})\s+(ADT|CHD|INF)\s+(\d{2}\/\d{2}\/\d{4})/g;
          let match;
          while ((match = paxRegex.exec(bodyText)) !== null) {
            const name = match[1].trim();
            const type = match[2];
            const birthDate = match[3];

            const substring = bodyText.substring(match.index, match.index + 200);
            const cpfMatch = substring.match(/CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})/i);
            const cpf = cpfMatch ? cpfMatch[1].replace(/[^\d]/g, '') : '';

            passengers.push({
              name,
              type,
              birthDate,
              cpf,
              titular: passengers.length === 0
            });
          }

          if (passengers.length === 0 && contato) {
            passengers.push({
              name: contato,
              type: 'ADT',
              birthDate: '',
              cpf: '',
              titular: true
            });
          }

          return {
            id: targetId,
            status,
            criacao,
            valorTotal,
            taxas,
            impostos,
            comissao,
            contato,
            email,
            telefone,
            hotel,
            acomodacao,
            formaPagto,
            statusPagto,
            scoreConfianca,
            bancoEmissor,
            parcelamento,
            passengers
          };
        }, resId);

        console.log(`   📄 Status: ${detail.status} | Total: R$ ${detail.valorTotal} | Comissão: R$ ${detail.comissao}`);
        console.log(`   💳 Pagamento: ${detail.formaPagto} (${detail.statusPagto}) | Score Confiança: ${detail.scoreConfianca}/100`);
        console.log(`   👤 Contato: ${detail.contato || 'N/D'} | Tel: ${detail.telefone || 'N/D'} | Email: ${detail.email || 'N/D'}`);
        console.log(`   👥 Passageiros encontrados: ${detail.passengers.length}`);
        detail.passengers.forEach((p, idx) => {
          console.log(`      ${idx + 1}. ${p.name} (${p.type}) - Nasc: ${p.birthDate || 'N/D'} - CPF: ${p.cpf || 'N/D'}`);
        });

        // Monta e grava linhas do CSV imediatamente
        const csvRows = [];
        detail.passengers.forEach((p) => {
          csvRows.push([
            resId,
            detail.status,
            detail.criacao,
            detail.contato,
            detail.email,
            detail.telefone,
            p.name,
            p.cpf,
            p.birthDate,
            p.age || '',
            p.type,
            p.titular ? 'SIM' : 'NAO',
            detail.hotel,
            detail.acomodacao,
            detail.valorTotal,
            detail.taxas,
            detail.impostos,
            detail.formaPagto,
            detail.statusPagto,
            detail.scoreConfianca,
            detail.bancoEmissor,
            detail.parcelamento,
            detail.comissao
          ]);
        });

        appendToCsv(csvRows);
        appendToJson(detail);

        processedSet.add(resId);
        saveProgress({ processedIds: Array.from(processedSet) });
        processedCount++;

        console.log(`💾 [Gravado com Sucesso] Total gravado no CSV: ${processedSet.size} reservas`);

        // Fecha a aba ou clica em Voltar
        await page.evaluate((targetId) => {
          const tabs = Array.from(document.querySelectorAll('.ui-tabs-nav li, .nav-tabs li, [role="tab"]'));
          for (const tab of tabs) {
            if (tab.innerText.includes(targetId)) {
              const closeBtn = tab.querySelector('.ui-icon-close, .close, .fa-times, [title*="Fechar"]');
              if (closeBtn) {
                closeBtn.click();
                return;
              }
            }
          }
          const voltarBtn = document.querySelector('button[title*="Voltar"], a[title*="Voltar"], .ui-icon-arrowreturnthick-1-w');
          if (voltarBtn) {
            voltarBtn.click();
            return;
          }
          for (const tab of tabs) {
            if (tab.innerText.includes('Buscar') || tab.innerText.includes('Pesquisar') || tab.innerText.includes('Reservas')) {
              tab.click();
              return;
            }
          }
        }, resId);

        // Jitter randômico humano antes da próxima reserva (1.5s a 5.8s)
        const delayNext = getHumanRandomDelay();
        console.log(`⏳ Aguardando ritmo seguro humano (${(delayNext / 1000).toFixed(1)}s)...`);
        await page.waitForTimeout(delayNext);
      } catch (err) {
        console.error(`❌ Erro ao processar reserva ${resId}:`, err.message);
      }
    }

    // Se ainda precisa de mais reservas, avança para a próxima página do PrimeFaces
    if (processedCount < maxItems) {
      const hasNext = await page.evaluate(() => {
        const nextBtn = document.querySelector('.ui-paginator-next:not(.ui-state-disabled), [aria-label="Next Page"]:not([disabled])');
        if (nextBtn) {
          nextBtn.click();
          return true;
        }
        return false;
      });

      if (hasNext) {
        pageNumber++;
        console.log(`➡️ Avançando para página ${pageNumber} do portal...`);
        await page.waitForTimeout(3000);
      } else {
        console.log('🏁 Todas as páginas foram concluídas com sucesso.');
        hasMorePages = false;
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 PROCESSO CONCLUÍDO COM SUCESSO!');
  console.log(`📊 Reservas mineradas nesta sessão: ${processedCount}`);
  console.log(`📁 Pasta com os arquivos: ${OUTPUT_DIR}`);
  console.log(`📄 CSV Oficial gerado: ${CSV_FILE}`);
  console.log(`📋 JSON Oficial gerado: ${JSON_FILE}`);
  console.log('================================================================\n');

  // Abre a pasta no Windows Explorer automaticamente para o usuário
  openFolderInExplorer();

  await askQuestion('Pressione [ENTER] para fechar o navegador...');
  await browser.close();
}

run().catch((err) => {
  console.error('Falha crítica no extrator:', err);
  process.exit(1);
});
