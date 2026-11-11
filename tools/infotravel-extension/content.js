// Waesy Sync • Content Script Universal Infotravel (Orinter, FRT, Incomum, Schultz & Portais)

(() => {
  if (window.__waesyInfotravelContentLoaded) return;
  window.__waesyInfotravelContentLoaded = true;

  console.log('[Waesy Sync] Content script ativo na página da operadora.');

  let isSyncRunning = false;
  let pacingMinSeconds = 2;
  let pacingMaxSeconds = 5;

  function detectOperatorSlug() {
    const host = (window.location.hostname || '').toLowerCase();
    const title = (document.title || '').toLowerCase();
    const combined = `${host} ${title}`;
    if (combined.includes('orinter')) return 'orinter';
    if (combined.includes('frt')) return 'frt';
    if (combined.includes('incomum')) return 'incomum';
    if (combined.includes('schultz')) return 'schultz';
    if (combined.includes('newage') || combined.includes('new age')) return 'new_age';
    if (combined.includes('personal')) return 'personal';
    if (combined.includes('visual')) return 'visual';
    if (combined.includes('trend')) return 'trend';
    if (combined.includes('ancoradouro')) return 'ancoradouro';
    return 'generic';
  }

  function isInfotravelDom() {
    const url = (window.location.href || '').toLowerCase();
    if (
      url.includes('infotravel') ||
      url.includes('orinter.com.br') ||
      url.includes('incomumviagens.com.br') ||
      url.includes('frt.com.br') ||
      url.includes('schultz.com.br') ||
      url.includes('newage.tur.br') ||
      url.includes('personalbrasil.com.br') ||
      url.includes('visualturismo.com.br') ||
      url.includes('trendoperadora.com.br') ||
      url.includes('ancoradouro.com.br')
    ) {
      return true;
    }
    return Boolean(
      document.querySelector('#frmCarrinhoView, #frmResultadoProduto, .ui-datatable, .ui-tabs-nav') ||
        document.title.toLowerCase().includes('infotravel') ||
        document.body?.innerHTML?.toLowerCase().includes('primefaces'),
    );
  }

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
        logType,
      });
    } catch {
      // Popup fechado
    }
  }

  function setSyncState(running) {
    isSyncRunning = running;
    try {
      chrome.storage.local.set({ isSyncing: running });
      chrome.runtime.sendMessage({ type: 'SYNC_STATE_CHANGED', isSyncing: running });
    } catch {
      // ignore
    }
  }

  window.addEventListener('beforeunload', () => {
    if (isSyncRunning) {
      chrome.storage.local.set({ isSyncing: false });
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'PING_INFOTRAVEL') {
      const hasRows = findReservationRows().length > 0;
      sendResponse({
        isInfotravel: isInfotravelDom(),
        operatorSlug: detectOperatorSlug(),
        isSyncRunning,
        hasTable: hasRows,
      });
      return true;
    }

    if (message.action === 'START_SYNC') {
      if (isSyncRunning) {
        sendResponse({ status: 'Sincronização já está em andamento.' });
        return true;
      }
      setSyncState(true);
      pacingMinSeconds = message.pacingMin || 2;
      pacingMaxSeconds = message.pacingMax || 5;
      notifyLog(
        `Iniciando varredura (${detectOperatorSlug().toUpperCase()}) com jitter de ${pacingMinSeconds}s a ${pacingMaxSeconds}s...`,
        'info',
      );
      startExtractionLoop();
      sendResponse({ status: 'Sincronização iniciada com sucesso!' });
      return true;
    }

    if (message.action === 'STOP_SYNC') {
      setSyncState(false);
      notifyLog('Sincronização pausada pelo usuário.', 'warn');
      sendResponse({ status: 'Sincronização pausada.' });
      return true;
    }
  });

  function findReservationRows() {
    const tableRows = Array.from(document.querySelectorAll('.ui-datatable-data tr, table tbody tr'));
    const validRows = [];
    const seenIds = new Set();

    for (const tr of tableRows) {
      if (tr.offsetParent === null) continue;
      const text = (tr.innerText || '').trim();
      if (!text) continue;
      const sanitized = text.replace(/\d{2}\/\d{2}\/\d{4}/g, ' ').replace(/R\$\s*[\d.,]+/g, ' ');
      const matchId = sanitized.match(/\b(\d{6,9})\b/);
      if (matchId && !seenIds.has(matchId[1])) {
        seenIds.add(matchId[1]);
        validRows.push({
          id: matchId[1],
          element: tr,
        });
      }
    }
    return validRows;
  }

  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  }

  function getActiveReservationRoot(resId) {
    const dialogs = Array.from(document.querySelectorAll('.ui-dialog'));
    for (const dlg of dialogs) {
      if (isElementVisible(dlg) && (dlg.innerText || '').includes(resId)) {
        return dlg;
      }
    }

    const panels = Array.from(document.querySelectorAll('.ui-tabs-panel, .tab-pane'));
    for (const panel of panels) {
      if (!panel.classList.contains('ui-helper-hidden') && isElementVisible(panel) && (panel.innerText || '').includes(resId)) {
        return panel;
      }
    }

    for (const panel of panels) {
      if (!panel.classList.contains('ui-helper-hidden') && isElementVisible(panel) && !panel.querySelector('.ui-datatable-data')) {
        return panel;
      }
    }

    return document.body;
  }

  async function waitForReservationPanel(resId, maxMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
      const root = getActiveReservationRoot(resId);
      const txt = root?.innerText || '';
      const hasDetailSignals =
        root !== document.body ||
        (/Total|Status|Contato|Passageiro|Hóspede|Hospede/i.test(txt) && txt.includes(resId));
      const ajaxBusy = Boolean(
        document.querySelector('.ui-blockui:not([style*="display: none"]), .ajax-loading:not([style*="display: none"])'),
      );
      if (hasDetailSignals && !ajaxBusy) {
        return root;
      }
      await waitDelay(250);
    }
    return getActiveReservationRoot(resId);
  }

  async function startExtractionLoop() {
    const processedData = await chrome.storage.local.get(['reservasColetadas']);
    const processedSet = new Set((processedData.reservasColetadas || []).map((r) => String(r.id)));

    notifyLog(`Total de reservas já no histórico: ${processedSet.size}`, 'info');

    while (isSyncRunning) {
      const validRows = findReservationRows();

      if (validRows.length === 0) {
        notifyLog('Nenhuma tabela de reservas visível na tela. Realize a busca de reservas na operadora.', 'warn');
        await waitDelay(3000);
        continue;
      }

      for (const item of validRows) {
        if (!isSyncRunning) break;
        if (processedSet.has(item.id)) continue;

        notifyLog(`Acessando reserva ${item.id} (${detectOperatorSlug().toUpperCase()})...`, 'info');

        const actionBtn = item.element.querySelector(
          '.ui-icon-search, .fa-search, .fa-eye, [title*="Visualizar"], [title*="Detalhe"], [title*="Abrir"], a, button',
        );

        if (actionBtn) {
          actionBtn.click();
        } else {
          const firstTd = item.element.querySelector('td');
          if (firstTd) firstTd.click();
        }

        const rootEl = await waitForReservationPanel(item.id, 8000);
        const loadDelay = getRandomHumanDelay(pacingMinSeconds, pacingMaxSeconds);
        await waitDelay(loadDelay);

        const reservationData = extractReservationDetails(item.id, rootEl);

        chrome.runtime.sendMessage({
          type: 'NEW_RESERVATION_DATA',
          data: reservationData,
        });

        processedSet.add(item.id);

        notifyLog(
          `✓ Reserva ${item.id} gravada (+${reservationData.passageiros?.length || 1} pax) | R$ ${reservationData.valorTotal || '0,00'}`,
          'success',
        );

        closeCurrentReservationTab(item.id);

        const nextDelay = getRandomHumanDelay(pacingMinSeconds, pacingMaxSeconds);
        await waitDelay(nextDelay);
      }

      if (isSyncRunning) {
        const nextPaginatorBtn = document.querySelector(
          '.ui-paginator-next:not(.ui-state-disabled), [aria-label="Next Page"]:not([disabled])',
        );

        if (nextPaginatorBtn && isElementVisible(nextPaginatorBtn)) {
          notifyLog('Avançando para a próxima página de resultados...', 'info');
          nextPaginatorBtn.click();
          await waitDelay(3500);
        } else {
          notifyLog('Todas as páginas disponíveis foram varridas e concluídas!', 'success');
          setSyncState(false);
          break;
        }
      }
    }
  }

  function extractReservationDetails(resId, rootEl) {
    const scopeEl = rootEl || getActiveReservationRoot(resId);
    const bodyText = scopeEl?.innerText || document.body.innerText || '';
    const operatorSlug = detectOperatorSlug();

    const getMatch = (regex) => {
      const m = bodyText.match(regex);
      return m ? m[1].trim() : '';
    };

    const status =
      getMatch(/Status[:\s]+([^\n\r]+)/i) ||
      getMatch(/Tipo\/Status[:\s]+([^\n\r]+)/i) ||
      getMatch(/Situa[çc][ãa]o[:\s]+([^\n\r]+)/i);
    const criacao =
      getMatch(/Cria[çc][ãa]o[:\s]+([^\n\r]+)/i) ||
      getMatch(/Data da Reserva[:\s]+([^\n\r]+)/i);
    const checkIn =
      getMatch(/(?:Check-?in|Entrada|Embarque|In[íi]cio)[:\s]+(\d{2}\/\d{2}\/\d{4})/i) || '';
    const checkOut =
      getMatch(/(?:Check-?out|Sa[íi]da|Retorno|T[ée]rmino)[:\s]+(\d{2}\/\d{2}\/\d{4})/i) || '';
    const localizador =
      getMatch(/Localizador[:\s]+([A-Z0-9-]{4,20})/i) ||
      getMatch(/PNR[:\s]+([A-Z0-9-]{4,20})/i) ||
      resId;

    const valorTotal =
      getMatch(/Total da compra[:\s]*R\$\s*([0-9.,]+)/i) ||
      getMatch(/Total Geral[:\s]*R\$\s*([0-9.,]+)/i) ||
      getMatch(/Valor Total[:\s]*R\$\s*([0-9.,]+)/i) ||
      getMatch(/Total[:\s]*R\$\s*([0-9.,]+)/i);
    const taxas = getMatch(/Taxas?[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
    const impostos = getMatch(/Impostos?[:\s]*R\$\s*([0-9.,]+)/i) || '0,00';
    const comissao =
      getMatch(/Comiss[ãa]o(?:\s+Ag[êe]ncia)?[:\s]*R\$\s*([0-9.,]+)/i) ||
      getMatch(/Over[:\s]*R\$\s*([0-9.,]+)/i) ||
      '0,00';
    const contato =
      getMatch(/(?:Contato|Solicitante|Pagador|Cliente)[:\s]+([^\n\r]+)/i);
    const email = getMatch(/E-?mail[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const telefone = getMatch(/(?:Telefone|Celular|WhatsApp|Fone)[:\s]+([0-9()+\s-]{8,22})/i);
    const hotel =
      getMatch(/Hotel[:\s]+([^\n\r]+)/i) ||
      getMatch(/Destino[:\s]+([^\n\r]+)/i) ||
      getMatch(/Servi[çc]o[:\s]+([^\n\r]+)/i);
    const destino = getMatch(/Destino[:\s]+([^\n\r]+)/i) || hotel;
    const acomodacao =
      getMatch(/Acomoda[çc][ãa]o[:\s]+([^\n\r]+)/i) ||
      getMatch(/Apartamento[:\s]+([^\n\r]+)/i) ||
      getMatch(/Quarto[:\s]+([^\n\r]+)/i) ||
      'Standard';
    const formaPagto =
      getMatch(/Forma de Pagamento[:\s]+([^\n\r]+)/i) ||
      getMatch(/Pagamento[:\s]+([^\n\r]+)/i) ||
      'Faturado / Operadora';
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
    else if (/banco do brasil|\bbb\b/i.test(bodyText)) bancoEmissor = 'Banco do Brasil';
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

    const passageiros = [];
    const seenPaxNames = new Set();
    const paxRegex = /([A-ZÀ-Ú][A-ZÀ-Ú\s]{3,45})\s+(ADT|CHD|INF)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let match;

    while ((match = paxRegex.exec(bodyText)) !== null) {
      const nome = match[1].trim();
      const tipo = match[2];
      const nasc = match[3];
      const substring = bodyText.substring(match.index, match.index + 240);
      const cpfMatch = substring.match(/CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})/i);
      const cpf = cpfMatch ? cpfMatch[1].replace(/[^\d]/g, '') : '';

      seenPaxNames.add(nome.toUpperCase());
      passageiros.push({
        nome,
        tipo,
        nasc,
        idade: '',
        cpf,
        titular: passageiros.length === 0,
      });
    }

    if (passageiros.length === 0 && scopeEl) {
      const paxRows = Array.from(scopeEl.querySelectorAll('table tbody tr'));
      for (const row of paxRows) {
        const rowTxt = (row.innerText || '').trim();
        if (!rowTxt || !/(ADT|CHD|INF|Adulto|Crian[çc]a|Beb[êe]|\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i.test(rowTxt)) {
          continue;
        }
        const cells = Array.from(row.querySelectorAll('td')).map((c) => (c.innerText || '').trim());
        const nameCell = cells.find((c) => /^[A-Za-zÀ-ú\s]{4,50}$/.test(c) && !/^(ADT|CHD|INF|Adulto|Crian)/i.test(c));
        if (nameCell && !seenPaxNames.has(nameCell.toUpperCase())) {
          seenPaxNames.add(nameCell.toUpperCase());
          const cpfCell = rowTxt.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
          const nascCell = rowTxt.match(/(\d{2}\/\d{2}\/\d{4})/);
          const tipo = /\bCHD\b|Crian/i.test(rowTxt) ? 'CHD' : /\bINF\b|Beb[êe]/i.test(rowTxt) ? 'INF' : 'ADT';
          passageiros.push({
            nome: nameCell,
            tipo,
            nasc: nascCell ? nascCell[1] : '',
            idade: '',
            cpf: cpfCell ? cpfCell[1].replace(/[^\d]/g, '') : '',
            titular: passageiros.length === 0,
          });
        }
      }
    }

    if (passageiros.length === 0 && contato) {
      passageiros.push({
        nome: contato,
        tipo: 'ADT',
        nasc: '',
        idade: '',
        cpf: '',
        titular: true,
      });
    }

    return {
      id: resId,
      operatorSlug,
      status: status || 'Confirmada',
      criacao,
      checkIn,
      checkOut,
      localizador,
      valorTotal: valorTotal || '0,00',
      taxas,
      impostos,
      comissao,
      contato,
      email,
      telefone,
      hotel,
      destino,
      acomodacao,
      formaPagto,
      statusPagto,
      scoreConfianca,
      bancoEmissor,
      parcelamento,
      passageiros,
    };
  }

  function closeCurrentReservationTab(targetId) {
    const visibleDialogs = Array.from(document.querySelectorAll('.ui-dialog'));
    for (const dlg of visibleDialogs) {
      if (isElementVisible(dlg) && (dlg.innerText || '').includes(targetId)) {
        const closeIcon = dlg.querySelector('.ui-dialog-titlebar-close, .ui-icon-closethick, button[title*="Fechar"]');
        if (closeIcon) {
          closeIcon.click();
          return;
        }
      }
    }

    const tabs = Array.from(document.querySelectorAll('.ui-tabs-nav li, .nav-tabs li, [role="tab"]'));
    for (const tab of tabs) {
      if ((tab.innerText || '').includes(targetId)) {
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
      const label = tab.innerText || '';
      if (label.includes('Buscar') || label.includes('Pesquisar') || label.includes('Reservas')) {
        tab.click();
        return;
      }
    }
  }

// ============================================================================
// MODULO: Captura Inteligente e Passiva de Cotacoes & Carrinho (Infotravel Quote Watcher)
// NORMAS: SPEC-INFOTRAVEL-QUOTE-CAPTURE-AND-OPPORTUNITY-RADAR
// ============================================================================

let lastCapturedHash = null;
let quoteObserveTimer = null;

function parseCurrencyCents(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d,\.]/g, '').trim();
  if (!cleaned) return 0;
  if (cleaned.includes(',')) {
    const norm = cleaned.replace(/\./g, '').replace(',', '.');
    return Math.round(parseFloat(norm) * 100) || 0;
  }
  return Math.round(parseFloat(cleaned) * 100) || 0;
}

function parseDateIso(raw) {
  if (!raw) return new Date().toISOString().split('T')[0];
  const dmy = String(raw).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  }
  return new Date().toISOString().split('T')[0];
}

function extractDestinationFromFlightNode(flightNode) {
  if (!flightNode) return '';
  const allBold = Array.from(flightNode.querySelectorAll('.font-bold, strong, h3, h4'))
    .map((e) => (e.innerText || '').trim())
    .filter(Boolean);
  const routeMatch = allBold.find((b) => /[A-Z]{3}\s*[-–>]\s*[A-Z]{3}/.test(b) || b.includes(' - '));
  if (routeMatch) {
    const parts = routeMatch.split(/[-–>]/).map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || routeMatch;
  }
  return allBold[0] || '';
}

function inspectAndCaptureInfotravelQuotes() {
  if (!isInfotravelDom()) return;
  try {
    // 1. Deteccao do Carrinho Aberto / Monte Seu Pacote (#frmCarrinhoView / #pnlCarrinho)
    const carrinhoForm = document.getElementById('frmCarrinhoView') || document.querySelector('.frmCarrinhoView');
    if (carrinhoForm && isElementVisible(carrinhoForm)) {
      const pnlCarrinho = carrinhoForm.querySelector('#pnlCarrinho') || carrinhoForm;
      const productCards = pnlCarrinho.querySelectorAll('.product-card');

      if (productCards && productCards.length > 0) {
        let totalCents = 0;
        let dest = 'Destino em Cotacao';
        let startDate = null;
        let endDate = null;
        const items = [];

        productCards.forEach((card) => {
          const descEl = card.querySelector('.product-card__description-text') || card;
          const descText = descEl ? descEl.innerText : '';

          const totalCol = card.querySelector('.TexAlRight:last-of-type, .price_text_important');
          const lineTotal = totalCol ? parseCurrencyCents(totalCol.innerText) : 0;
          totalCents += lineTotal;

          const dateMatch = descText.match(/(\d{2}\/\d{2}\/\d{4})/g);
          if (dateMatch && dateMatch.length > 0) {
            if (!startDate) startDate = parseDateIso(dateMatch[0]);
            if (dateMatch.length > 1) endDate = parseDateIso(dateMatch[dateMatch.length - 1]);
          }

          const destMatch = descText.match(/([A-Z]{3})\s*\(([^)]+)\)/g);
          if (destMatch && destMatch.length > 0) {
            const lastDest = destMatch[destMatch.length - 1];
            const cleanDest = lastDest.match(/\(([^)]+)\)/);
            if (cleanDest) dest = cleanDest[1];
          }

          items.push({
            itemType: descText.includes('Voo') || descText.includes('Aereo') || card.querySelector('.lucide-plane-takeoff') ? 'flight' : 'hotel',
            title: (descText.split('\n')[0] || 'Item de Turismo').trim().slice(0, 180),
            totalAmountCents: lineTotal
          });
        });

        if (totalCents > 0) {
          emitQuoteCapture({
            sourcePage: 'carrinho',
            destinationCity: dest,
            startDate: startDate || new Date().toISOString().split('T')[0],
            endDate,
            totalCents,
            items
          });
          return;
        }
      }
    }

    // 2. Deteccao de Resultado de Busca de Aereo (*:pnlResultadoAereo)
    const pnlAereo = document.getElementById('frmResultadoProduto:pnlResultadoAereo') ||
      document.querySelector('[id$=":pnlResultadoAereo"], [id*="pnlResultadoAereo"]');
    if (pnlAereo && isElementVisible(pnlAereo)) {
      const firstFlight = pnlAereo.querySelector('.flight-search-container, .ui-dataview-row, .product-card');
      if (firstFlight) {
        const priceTotalEl = firstFlight.querySelector('.price_total_container .price_text_important, .price_text_important');
        const pricePerPersonEl = firstFlight.querySelector('.price_per_person');

        const totalCents = priceTotalEl ? parseCurrencyCents(priceTotalEl.innerText) : 0;
        const perAdultCents = pricePerPersonEl ? parseCurrencyCents(pricePerPersonEl.innerText) : 0;
        const dest = extractDestinationFromFlightNode(firstFlight) || 'Destino Aereo';

        const dateEl = firstFlight.querySelector('.text-xs, .flight-date');
        const dateText = dateEl ? dateEl.innerText : '';

        if (totalCents > 0) {
          emitQuoteCapture({
            sourcePage: 'aereo_resultado',
            destinationCity: dest,
            startDate: parseDateIso(dateText),
            totalCents,
            perAdultCents,
            items: [
              {
                itemType: 'flight',
                title: `Voo ${dest} - ${priceTotalEl?.innerText || ''}`.trim(),
                totalAmountCents: totalCents
              }
            ]
          });
          return;
        }
      }
    }

    // 3. Deteccao de Resultado de Busca de Hotel / Pacote
    const pnlHotel = document.querySelector('[id$=":pnlResultadoHotel"], [id$=":pnlResultadoPacote"], [id*="pnlResultadoHospedagem"]');
    if (pnlHotel && isElementVisible(pnlHotel)) {
      const firstHotel = pnlHotel.querySelector('.hotel-search-container, .package-search-container, .product-card, .ui-dataview-row');
      if (firstHotel) {
        const priceEl = firstHotel.querySelector('.price_total_container .price_text_important, .price_text_important');
        const totalCents = priceEl ? parseCurrencyCents(priceEl.innerText) : 0;
        const titleEl = firstHotel.querySelector('h2, h3, h4, .hotel-name, .product-title, .font-bold');
        const hotelName = titleEl ? titleEl.innerText.trim() : 'Hospedagem / Pacote';
        const cityEl = firstHotel.querySelector('.hotel-city, .city-name, .location');
        const dest = cityEl ? cityEl.innerText.trim() : hotelName;
        const dateText = firstHotel.innerText || '';
        const dates = dateText.match(/(\d{2}\/\d{2}\/\d{4})/g) || [];

        if (totalCents > 0) {
          emitQuoteCapture({
            sourcePage: 'hotel_resultado',
            destinationCity: dest.slice(0, 120),
            startDate: parseDateIso(dates[0]),
            endDate: dates[1] ? parseDateIso(dates[1]) : null,
            totalCents,
            items: [
              {
                itemType: 'hotel',
                title: hotelName.slice(0, 180),
                totalAmountCents: totalCents
              }
            ]
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Waesy Sync] Falha defensiva no observador de cotacoes:', err);
  }
}

function emitQuoteCapture(data) {
  const operatorSlug = detectOperatorSlug();
  const hash = `${operatorSlug}:${data.sourcePage}:${data.destinationCity}:${data.startDate}:${data.totalCents}`;
  if (lastCapturedHash === hash) return;
  lastCapturedHash = hash;

  const enrichedPayload = {
    ...data,
    operatorSlug,
    portalHost: window.location.hostname,
    capturedAt: new Date().toISOString()
  };

  console.log('[Waesy Sync] Nova cotacao/orcamento detectado no Infotravel:', enrichedPayload);
  notifyLog(`Cotacao (${operatorSlug}): ${data.destinationCity} por R$ ${(data.totalCents / 100).toFixed(2)}`, 'info');

  chrome.runtime.sendMessage({
    type: 'QUOTE_CAPTURED',
    payload: enrichedPayload
  });
}

function scheduleQuoteInspection() {
  if (quoteObserveTimer) clearTimeout(quoteObserveTimer);
  quoteObserveTimer = setTimeout(() => {
    inspectAndCaptureInfotravelQuotes();
  }, 450);
}

const domObserver = new MutationObserver(() => {
  scheduleQuoteInspection();
});

if (document.body) {
  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

scheduleQuoteInspection();
})();
