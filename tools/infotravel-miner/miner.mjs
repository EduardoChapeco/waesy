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

const ERRORS_FILE = path.join(OUTPUT_DIR, 'erros_mineracao.json');

// Garantir diretórios locais
fs.mkdirSync(PRINTS_DIR, { recursive: true });

function resolveBrowserExecutablePath() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function recordExtractionError(resId, message) {
  try {
    let errors = [];
    if (fs.existsSync(ERRORS_FILE)) {
      errors = JSON.parse(fs.readFileSync(ERRORS_FILE, 'utf-8'));
      if (!Array.isArray(errors)) errors = [];
    }
    errors.push({ resId, message, at: new Date().toISOString() });
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors.slice(-500), null, 2), 'utf-8');
  } catch {
    // Nao bloqueia fluxo principal
  }
}

async function pushReservationToCloud(serverUrl, token, detail) {
  if (!serverUrl || !token) return;
  try {
    const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/v1/ingest/infotravel-reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        operator: detail.operatorSlug || 'orinter',
        sourceLabel: 'infotravel-miner',
        items: [
          {
            externalReservationCode: String(detail.id),
            status: detail.status || 'Confirmada',
            createdAtRaw: detail.criacao || '',
            checkIn: detail.checkIn || '',
            checkOut: detail.checkOut || '',
            operatorSlug: detail.operatorSlug || 'orinter',
            holderName: detail.contato || 'Titular',
            holderEmail: detail.email || '',
            holderPhone: detail.telefone || '',
            destino: detail.hotel || 'Destino não informado',
            hotel: detail.hotel || '',
            acomodacao: detail.acomodacao || 'Standard',
            localizador: detail.localizador || '',
            valorTotalRaw: detail.valorTotal || '0,00',
            taxasRaw: detail.taxas || '0,00',
            impostosRaw: detail.impostos || '0,00',
            comissaoRaw: detail.comissao || '0,00',
            formaPagamento: detail.formaPagto || 'Faturado',
            statusPagamento: detail.statusPagto || 'Aprovado',
            scoreConfianca: detail.scoreConfianca || 80,
            bancoEmissor: detail.bancoEmissor || 'Operadora Direto',
            parcelamento: detail.parcelamento || '1x',
            passengers: (detail.passengers || []).map((p) => ({
              nome: p.name,
              cpf: p.cpf || '',
              nascimento: p.birthDate || '',
              idade: p.age || '',
              tipo: p.type || 'ADT',
              titular: Boolean(p.titular),
            })),
          },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      recordExtractionError(detail.id, `Cloud sync HTTP ${res.status}: ${errText.slice(0, 180)}`);
    } else {
      console.log(`   [Nuvem] Reserva ${detail.id} sincronizada com Waesy CRM.`);
    }
  } catch (err) {
    recordExtractionError(detail.id, `Cloud sync falhou: ${err.message}`);
  }
}

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

// Inicializa CSV com BOM UTF-8 (\uFEFF) alinhado ao schema canonico
function initFiles() {
  if (!fs.existsSync(CSV_FILE)) {
    const headers = [
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
  const urlArg = args.find((a) => a.startsWith('--url='))?.split('=')[1] || 'https://online.orinter.com.br/infotravel/admin/main.xhtml#';
  const serverArg = args.find((a) => a.startsWith('--server='))?.split('=')[1] || process.env.WAESY_SERVER_URL || '';
  const tokenArg = args.find((a) => a.startsWith('--token='))?.split('=')[1] || process.env.WAESY_INGEST_TOKEN || '';

  if (allArg) {
    maxItems = Infinity;
    console.log('Modo selecionado: EXTRACAO TOTAL');
  } else if (limitArg) {
    maxItems = parseInt(limitArg.split('=')[1], 10) || 10;
    console.log(`Modo selecionado: PILOTO (${maxItems} reservas)`);
  } else {
    console.log(`Modo padrao: PILOTO (${maxItems} reservas).`);
  }

  const executablePath = resolveBrowserExecutablePath();
  console.log(`\nAbrindo navegador (${executablePath || 'Playwright Chromium'}) com sessao persistente...`);
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    ...(executablePath ? { executablePath } : {}),
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const page = browser.pages()[0] || (await browser.newPage());

  console.log(`Navegando para ${urlArg}...`);
  await page.goto(urlArg, {
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

        // Extrai dados detalhados da reserva com escopo isolado na aba/dialogo ativo
        const detail = await page.evaluate((targetId) => {
          const host = window.location.hostname.toLowerCase();
          let operatorSlug = 'infotravel';
          if (host.includes('orinter')) operatorSlug = 'orinter';
          else if (host.includes('incomum')) operatorSlug = 'incomum';
          else if (host.includes('frt')) operatorSlug = 'frt';
          else if (host.includes('schultz')) operatorSlug = 'schultz';

          const isVisible = (el) => {
            if (!el) return false;
            const st = window.getComputedStyle(el);
            return st.display !== 'none' && st.visibility !== 'hidden' && el.offsetParent !== null;
          };

          const dialog = Array.from(document.querySelectorAll('.ui-dialog')).reverse().find(isVisible);
          const tabPanels = Array.from(document.querySelectorAll('.ui-tabs-panel')).filter(isVisible);
          const matchingPanel = tabPanels.find((p) => (p.innerText || '').includes(String(targetId))) || tabPanels[tabPanels.length - 1];
          const rootEl = dialog || matchingPanel || document.body;
          const bodyText = (rootEl && rootEl.innerText) || document.body.innerText || '';

          const getVal = (regex) => {
            const m = bodyText.match(regex);
            return m ? m[1].trim() : '';
          };

          const status = getVal(/Status[:\s]+([^\n\r]+)/i) || getVal(/Tipo\/Status[:\s]+([^\n\r]+)/i) || 'Confirmada';
          const criacao = getVal(/Cria[cç][aã]o[:\s]+([^\n\r]+)/i);
          const checkIn = getVal(/Check-?in[:\s]+(\d{2}\/\d{2}\/\d{4})/i) || getVal(/Embarque[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
          const checkOut = getVal(/Check-?out[:\s]+(\d{2}\/\d{2}\/\d{4})/i) || getVal(/Desembarque[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
          const localizador = getVal(/Localizador[:\s]+([A-Z0-9-]{4,20})/i);
          const valorTotal = getVal(/Total da compra[:\s]*R\$\s*([0-9.,]+)/i) || getVal(/Total[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const taxas = getVal(/Taxas[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const impostos = getVal(/Impostos[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const comissao = getVal(/Comiss[aã]o(?:\s+Ag[eê]ncia)?[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
          const contato = getVal(/Contato[:\s]+([^\n\r]+)/i);
          const email = getVal(/Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
          const telefone = getVal(/Telefone[:\s]+([0-9()\s+-]+)/i);
          const hotel = getVal(/Hotel[:\s]+([^\n\r]+)/i) || getVal(/Destino[:\s]+([^\n\r]+)/i) || getVal(/Tipo:\s*([^\n\r]+)/i);
          const formaPagto = getVal(/Forma de Pagamento[:\s]+([^\n\r]+)/i) || 'Faturado / Operadora';
          const parcelamento = getVal(/Parcelamento[:\s]+([^\n\r]+)/i) || '1x';
          const acomodacao = getVal(/Acomoda[cç][aã]o[:\s]+([^\n\r]+)/i) || getVal(/Apartamento[:\s]+([^\n\r]+)/i) || getVal(/Quarto[:\s]+([^\n\r]+)/i) || 'Standard';

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

          let scoreConfianca = 75;
          const isBoleto = /boleto|faturad/i.test(formaPagto) || /boleto/i.test(bodyText);
          if (isBoleto && statusPagto !== 'Negado') {
            scoreConfianca = 95;
          } else if (statusPagto === 'Negado') {
            scoreConfianca = 20;
          } else if (/cart[aã]o/i.test(formaPagto)) {
            scoreConfianca = 80;
          }

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
              titular: passengers.length === 0,
            });
          }

          if (passengers.length === 0 && contato) {
            passengers.push({
              name: contato,
              type: 'ADT',
              birthDate: '',
              cpf: '',
              titular: true,
            });
          }

          return {
            id: targetId,
            operatorSlug,
            status,
            criacao,
            checkIn,
            checkOut,
            localizador,
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
            passengers,
          };
        }, resId);

        console.log(`   Status: ${detail.status} (${detail.operatorSlug}) | Total: R$ ${detail.valorTotal} | Comissao: R$ ${detail.comissao}`);
        console.log(`   Pagamento: ${detail.formaPagto} (${detail.statusPagto}) | Score: ${detail.scoreConfianca}/100`);
        console.log(`   Contato: ${detail.contato || 'N/D'} | Tel: ${detail.telefone || 'N/D'} | Email: ${detail.email || 'N/D'}`);
        console.log(`   Passageiros encontrados: ${detail.passengers.length}`);

        const paxList = detail.passengers.length > 0
          ? detail.passengers
          : [{ name: detail.contato || 'Titular', cpf: '', birthDate: '', age: '', type: 'ADT', titular: true }];

        const csvRows = paxList.map((p) => [
          resId,
          detail.status,
          detail.criacao,
          detail.checkIn,
          detail.checkOut,
          detail.operatorSlug,
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
          detail.localizador,
          detail.valorTotal,
          detail.taxas,
          detail.impostos,
          detail.formaPagto,
          detail.statusPagto,
          detail.scoreConfianca,
          detail.bancoEmissor,
          detail.parcelamento,
          detail.comissao,
        ]);

        appendToCsv(csvRows);
        appendToJson(detail);
        if (serverArg && tokenArg) {
          await pushReservationToCloud(serverArg, tokenArg, detail);
        }

        processedSet.add(resId);
        saveProgress({ processedIds: Array.from(processedSet) });
        processedCount++;

        console.log(`[Gravado com Sucesso] Total gravado: ${processedSet.size} reservas`);

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

        const delayNext = getHumanRandomDelay();
        console.log(`Aguardando ritmo humano (${(delayNext / 1000).toFixed(1)}s)...`);
        await page.waitForTimeout(delayNext);
      } catch (err) {
        console.error(`Erro ao processar reserva ${resId}:`, err.message);
        recordExtractionError(resId, err.message);
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
