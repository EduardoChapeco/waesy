// Waesy Sync • Content Script (Injetado nas páginas do Infotravel / Orinter)

console.log('[Waesy Sync] Content script ativo na página da operadora.');

let isSyncRunning = false;
let pacingMinSeconds = 2;
let pacingMaxSeconds = 5;

function waitDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomHumanDelay(minSec, maxSec) {
  const min = (minSec || 2) * 1000;
  const max = (maxSec || 5) * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function notifyLog(text, logType = 'info') {
  console.log(`[Waesy Sync] ${text}`);
  try {
    chrome.runtime.sendMessage({
      type: 'SYNC_LOG',
      text,
      logType
    });
  } catch {
    // Popup fechado
  }
}

// Ouvir mensagens do popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_SYNC') {
    if (isSyncRunning) {
      sendResponse({ status: 'Sincronização já está em andamento.' });
      return true;
    }
    isSyncRunning = true;
    pacingMinSeconds = message.pacingMin || 2;
    pacingMaxSeconds = message.pacingMax || 5;
    notifyLog(`Iniciando varredura com jitter de ${pacingMinSeconds}s a ${pacingMaxSeconds}s...`, 'info');
    startExtractionLoop();
    sendResponse({ status: 'Sincronização iniciada com sucesso!' });
    return true;
  }

  if (message.action === 'STOP_SYNC') {
    isSyncRunning = false;
    notifyLog('Sincronização pausada pelo usuário.', 'warn');
    sendResponse({ status: 'Sincronização pausada.' });
    return true;
  }
});

async function startExtractionLoop() {
  const processedData = await chrome.storage.local.get(['reservasColetadas']);
  const processedSet = new Set((processedData.reservasColetadas || []).map((r) => r.id));

  notifyLog(`Total de reservas já no histórico: ${processedSet.size}`, 'info');

  while (isSyncRunning) {
    // 1. Localiza linhas da tabela de reservas visíveis
    const tableRows = Array.from(document.querySelectorAll('table tbody tr'));
    const validRows = [];

    for (const tr of tableRows) {
      const text = tr.innerText || '';
      const matchId = text.match(/\b(13\d{6,7}|\d{7,8})\b/);
      if (matchId) {
        validRows.push({
          id: matchId[1],
          element: tr
        });
      }
    }

    if (validRows.length === 0) {
      notifyLog('Nenhuma tabela de reservas identificada na tela atual. Verifique se realizou a busca.', 'warn');
      await waitDelay(3000);
      continue;
    }

    let processedInThisPage = 0;

    for (const item of validRows) {
      if (!isSyncRunning) break;

      if (processedSet.has(item.id)) {
        continue;
      }

      notifyLog(`Acessando reserva ${item.id}...`, 'info');

      // Tenta clicar no botão de visualizar/lupa da linha
      const actionBtn = item.element.querySelector(
        '.ui-icon-search, .fa-search, [title*="Visualizar"], [title*="Detalhe"], a, button'
      );

      if (actionBtn) {
        actionBtn.click();
      } else {
        const firstTd = item.element.querySelector('td');
        if (firstTd) firstTd.click();
      }

      // Aguarda carregar detalhes
      const loadDelay = getRandomHumanDelay(pacingMinSeconds, pacingMaxSeconds);
      await waitDelay(loadDelay);

      // Extrai dados detalhados da página
      const reservationData = extractReservationDetails(item.id);

      // Salva no background
      chrome.runtime.sendMessage({
        type: 'NEW_RESERVATION_DATA',
        data: reservationData
      });

      processedSet.add(item.id);
      processedInThisPage++;

      notifyLog(
        `✓ Reserva ${item.id} gravada (+${reservationData.passageiros ? reservationData.passageiros.length : 1} pax) | Valor: R$ ${reservationData.valorTotal || '0,00'}`,
        'success'
      );

      // Fecha aba da reserva ou clica em Voltar
      closeCurrentReservationTab(item.id);

      // Pacing humano entre reservas
      const nextDelay = getRandomHumanDelay(pacingMinSeconds, pacingMaxSeconds);
      await waitDelay(nextDelay);
    }

    // Se varreu toda a página atual ou todas já estavam processadas, avança página no PrimeFaces
    if (isSyncRunning) {
      const nextPaginatorBtn = document.querySelector(
        '.ui-paginator-next:not(.ui-state-disabled), [aria-label="Next Page"]:not([disabled])'
      );

      if (nextPaginatorBtn) {
        notifyLog('Avançando para a próxima página de resultados do portal...', 'info');
        nextPaginatorBtn.click();
        await waitDelay(3500);
      } else {
        notifyLog('Todas as páginas disponíveis foram varridas e concluídas!', 'success');
        isSyncRunning = false;
        await chrome.storage.local.set({ isSyncing: false });
        break;
      }
    }
  }
}

function extractReservationDetails(resId) {
  const bodyText = document.body.innerText || '';

  const getMatch = (regex) => {
    const m = bodyText.match(regex);
    return m ? m[1].trim() : '';
  };

  const status = getMatch(/Status[:\s]+([^\n\r]+)/i) || getMatch(/Tipo\/Status[:\s]+([^\n\r]+)/i);
  const criacao = getMatch(/Criação[:\s]+([^\n\r]+)/i);
  const valorTotal = getMatch(/Total da compra[:\s]*R\$\s*([0-9.,]+)/i) || getMatch(/Total[:\s]*R\$\s*([0-9.,]+)/i);
  const taxas = getMatch(/Taxas[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
  const impostos = getMatch(/Impostos[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
  const comissao = getMatch(/Comissão[:\s]*R\$\s*([0-9.,]+)/i) || getMatch(/Comissão Agência[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
  const contato = getMatch(/Contato[:\s]+([^\n\r]+)/i);
  const email = getMatch(/Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const telefone = getMatch(/Telefone[:\s]+([0-9()\s-]+)/i);
  const hotel = getMatch(/Hotel[:\s]+([^\n\r]+)/i) || getMatch(/Destino[:\s]+([^\n\r]+)/i);
  const acomodacao = getMatch(/Acomodação[:\s]+([^\n\r]+)/i) || getMatch(/Apartamento[:\s]+([^\n\r]+)/i) || getMatch(/Quarto[:\s]+([^\n\r]+)/i) || 'Standard';
  const formaPagto = getMatch(/Forma de Pagamento[:\s]+([^\n\r]+)/i) || 'Faturado / Operadora';
  const parcelamento = getMatch(/Parcelamento[:\s]+([^\n\r]+)/i) || '1x';

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

  // Extração de passageiros
  const passageiros = [];
  const paxRegex = /([A-ZÀ-Ú\s]{4,40})\s+(ADT|CHD|INF)\s+(\d{2}\/\d{2}\/\d{4})/g;
  let match;

  while ((match = paxRegex.exec(bodyText)) !== null) {
    const nome = match[1].trim();
    const tipo = match[2];
    const nasc = match[3];

    // Busca CPF próximo
    const substring = bodyText.substring(match.index, match.index + 200);
    const cpfMatch = substring.match(/CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})/i);
    const cpf = cpfMatch ? cpfMatch[1].replace(/[^\d]/g, '') : '';

    passageiros.push({
      nome,
      tipo,
      nasc,
      idade: '',
      cpf,
      titular: passageiros.length === 0
    });
  }

  // Fallback se não encontrar passageiros estruturados
  if (passageiros.length === 0 && contato) {
    passageiros.push({
      nome: contato,
      tipo: 'ADT',
      nasc: '',
      idade: '',
      cpf: '',
      titular: true
    });
  }

  return {
    id: resId,
    status: status || 'Confirmada',
    criacao,
    valorTotal: valorTotal || '0,00',
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
    passageiros
  };
}

function closeCurrentReservationTab(targetId) {
  // 1. Tenta fechar aba do PrimeFaces
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

  // 2. Se não achou botão fechar, tenta clicar no botão "Voltar" ou na aba "Buscar reservas"
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
}
