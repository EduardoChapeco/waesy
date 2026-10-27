// Waesy Sync • Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    reservasColetadas: [],
    totalPassageiros: 0,
    totalVendas: 0,
    totalComissao: 0,
    isSyncing: false,
    pacingMin: 2,
    pacingMax: 5
  });
  console.log('[Waesy Sync] Extensão inicializada com sucesso.');
});

// Listener de mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_RESERVATION_DATA') {
    handleNewReservation(message.data);
    sendResponse({ ok: true });
    return true;
  }
});

async function handleNewReservation(reservation) {
  const data = await chrome.storage.local.get([
    'reservasColetadas',
    'totalPassageiros',
    'totalVendas',
    'totalComissao'
  ]);

  const list = data.reservasColetadas || [];
  const existingIdx = list.findIndex((r) => r.id === reservation.id);

  if (existingIdx >= 0) {
    list[existingIdx] = reservation;
  } else {
    list.push(reservation);
  }

  // Recalcula totais
  let paxCount = 0;
  let sumVendas = 0;
  let sumComissao = 0;

  list.forEach((r) => {
    paxCount += r.passageiros && r.passageiros.length > 0 ? r.passageiros.length : 1;
    const v = parseFloat(String(r.valorTotal || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const c = parseFloat(String(r.comissao || '0').replace(/\./g, '').replace(',', '.')) || 0;
    sumVendas += v;
    sumComissao += c;
  });

  await chrome.storage.local.set({
    reservasColetadas: list,
    totalPassageiros: paxCount,
    totalVendas: sumVendas,
    totalComissao: sumComissao
  });

  // Tenta também enviar para o gravador local do PC (localhost:3333) se estiver rodando
  try {
    fetch('http://localhost:3333/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resId: reservation.id,
        status: reservation.status,
        criacao: reservation.criacao,
        contato: reservation.contato,
        email: reservation.email,
        telefone: reservation.telefone,
        hotel: reservation.hotel || reservation.destino,
        totalCompra: reservation.valorTotal,
        taxas: reservation.taxas,
        impostos: reservation.impostos,
        formaPagto: reservation.formaPagto,
        parcelamento: reservation.parcelamento,
        comissaoTotal: reservation.comissao,
        passageiros: reservation.passageiros
      })
    }).catch(() => {
      // Ignora se o coletor local não estiver ativo
    });
  } catch {
    // Silencioso
  }
}
