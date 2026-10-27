// Waesy Sync • Popup Controller
document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const statReservas = document.getElementById('statReservas');
  const statPassageiros = document.getElementById('statPassageiros');
  const statVendas = document.getElementById('statVendas');
  const statComissao = document.getElementById('statComissao');
  const pacingSlider = document.getElementById('pacingSlider');
  const pacingLabel = document.getElementById('pacingLabel');
  const toggleSyncBtn = document.getElementById('toggleSyncBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const logBox = document.getElementById('logBox');

  let isSyncing = false;

  function formatBrl(centsOrFloat) {
    const val = typeof centsOrFloat === 'number' ? centsOrFloat : 0;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function appendLog(text, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    const time = new Date().toLocaleTimeString('pt-BR');
    line.textContent = `[${time}] ${text}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Atualiza sliders de pacing
  pacingSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    const min = val;
    const max = val + 3;
    pacingLabel.textContent = `${min}.0s a ${max}.0s`;
    chrome.storage.local.set({ pacingMin: min, pacingMax: max });
  });

  // Atualiza métricas a partir do storage
  async function refreshState() {
    const data = await chrome.storage.local.get([
      'isSyncing',
      'reservasColetadas',
      'totalPassageiros',
      'totalVendas',
      'totalComissao',
      'pacingMin',
      'pacingMax',
      'logs'
    ]);

    isSyncing = !!data.isSyncing;
    statReservas.textContent = (data.reservasColetadas || []).length;
    statPassageiros.textContent = data.totalPassageiros || 0;
    statVendas.textContent = formatBrl(data.totalVendas || 0);
    statComissao.textContent = formatBrl(data.totalComissao || 0);

    if (data.pacingMin) {
      pacingSlider.value = data.pacingMin;
      pacingLabel.textContent = `${data.pacingMin}.0s a ${data.pacingMax || (data.pacingMin + 3)}.0s`;
    }

    if (isSyncing) {
      toggleSyncBtn.className = 'action-btn btn-danger';
      toggleSyncBtn.innerHTML = '<span>Pausar Sincronização</span>';
    } else {
      toggleSyncBtn.className = 'action-btn btn-primary';
      toggleSyncBtn.innerHTML = '<span>Iniciar Sincronização em Segundo Plano</span>';
    }
  }

  // Verifica aba ativa
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isInfotravelTab = activeTab && activeTab.url && (
    activeTab.url.includes('orinter.com.br') ||
    activeTab.url.includes('incomumviagens.com.br') ||
    activeTab.url.includes('frt.com.br') ||
    activeTab.url.includes('infotravel')
  );

  if (isInfotravelTab) {
    statusBadge.className = 'badge badge-online';
    statusText.textContent = 'Portal Detectado';
    appendLog('Sessão do portal de operadora ativa.', 'success');
  } else {
    statusBadge.className = 'badge badge-offline';
    statusText.textContent = 'Aba Incompatível';
    appendLog('Abra a aba da operadora (ex: Orinter) para sincronizar.', 'warn');
  }

  await refreshState();

  // Alternar sincronização
  toggleSyncBtn.addEventListener('click', async () => {
    if (!isInfotravelTab) {
      alert('Por favor, abra a aba da operadora (ex: online.orinter.com.br) para iniciar a sincronização.');
      return;
    }

    isSyncing = !isSyncing;
    await chrome.storage.local.set({ isSyncing });

    chrome.tabs.sendMessage(activeTab.id, {
      action: isSyncing ? 'START_SYNC' : 'STOP_SYNC',
      pacingMin: parseInt(pacingSlider.value, 10),
      pacingMax: parseInt(pacingSlider.value, 10) + 3
    }, (response) => {
      if (chrome.runtime.lastError) {
        appendLog('Falha ao comunicar com a página: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && response.status) {
        appendLog(response.status, 'success');
      }
    });

    await refreshState();
  });

  // Exportar CSV
  exportCsvBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['reservasColetadas']);
    const reservas = data.reservasColetadas || [];

    if (reservas.length === 0) {
      alert('Nenhuma reserva coletada ainda.');
      return;
    }

    const headers = [
      'ID Reserva',
      'Status',
      'Data Criacao',
      'Contato',
      'Email',
      'Telefone',
      'Nome Passageiro',
      'CPF Passageiro',
      'Data Nascimento',
      'Idade',
      'Tipo (ADT/CHD)',
      'Titular?',
      'Destino / Hotel',
      'Acomodacao',
      'Valor Total (R$)',
      'Taxas (R$)',
      'Forma Pagamento',
      'Status Pagamento',
      'Score Confianca Operadora',
      'Banco Emissor',
      'Parcelamento',
      'Comissao (R$)'
    ];

    function escapeCsv(val) {
      if (val === null || val === undefined) return '';
      const s = String(val).trim().replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return `"${s}"`;
    }

    const rows = [];
    reservas.forEach((r) => {
      if (r.passageiros && r.passageiros.length > 0) {
        r.passageiros.forEach((p) => {
          rows.push([
            r.id,
            r.status,
            r.criacao,
            r.contato,
            r.email,
            r.telefone,
            p.nome,
            p.cpf,
            p.nasc,
            p.idade,
            p.tipo,
            p.titular ? 'SIM' : 'NAO',
            r.hotel || r.destino,
            r.acomodacao || 'Standard',
            r.valorTotal,
            r.taxas,
            r.formaPagto || 'Faturado',
            r.statusPagto || 'Aprovado',
            r.scoreConfianca || 80,
            r.bancoEmissor || 'Operadora Direto',
            r.parcelamento || '1x',
            r.comissao
          ].map(escapeCsv).join(';'));
        });
      } else {
        rows.push([
          r.id,
          r.status,
          r.criacao,
          r.contato,
          r.email,
          r.telefone,
          r.contato || 'Titular',
          '',
          '',
          '',
          'ADT',
          'SIM',
          r.hotel || r.destino,
          r.acomodacao || 'Standard',
          r.valorTotal,
          r.taxas,
          r.formaPagto || 'Faturado',
          r.statusPagto || 'Aprovado',
          r.scoreConfianca || 80,
          r.bancoEmissor || 'Operadora Direto',
          r.parcelamento || '1x',
          r.comissao
        ].map(escapeCsv).join(';'));
      }
    });

    // BOM UTF-8 (\uFEFF) para abrir com acentuação correta no Excel brasileiro
    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas_waesy_oficial_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    appendLog('CSV exportado para a pasta Downloads.', 'success');
  });

  // Exportar JSON
  exportJsonBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['reservasColetadas']);
    const reservas = data.reservasColetadas || [];

    if (reservas.length === 0) {
      alert('Nenhuma reserva coletada ainda.');
      return;
    }

    const blob = new Blob([JSON.stringify(reservas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas_waesy_oficial_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    appendLog('JSON exportado para a pasta Downloads.', 'success');
  });

  // Listener para atualizações em tempo real vindas do content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_LOG') {
      appendLog(message.text, message.logType || 'info');
      refreshState();
    }
  });
});
