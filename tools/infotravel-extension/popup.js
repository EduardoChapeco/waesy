// Waesy Sync • Popup Controller v2.1.0
document.addEventListener("DOMContentLoaded", async () => {
  // Elementos de UI
  const statusBadge = document.getElementById("statusBadge");
  const statusText = document.getElementById("statusText");
  const statReservas = document.getElementById("statReservas");
  const statPassageiros = document.getElementById("statPassageiros");
  const statVendas = document.getElementById("statVendas");
  const statComissao = document.getElementById("statComissao");
  const pacingSlider = document.getElementById("pacingSlider");
  const pacingLabel = document.getElementById("pacingLabel");
  const toggleSyncBtn = document.getElementById("toggleSyncBtn");
  const toggleSyncText = document.getElementById("toggleSyncText");
  const syncCrmBtn = document.getElementById("syncCrmBtn");
  const clearQuotesBtn = document.getElementById("clearQuotesBtn");
  const quotesListContainer = document.getElementById("quotesListContainer");
  const quotesBadgeCount = document.getElementById("quotesBadgeCount");
  const tabQuotesCount = document.getElementById("tabQuotesCount");
  const waesyServerUrlInput = document.getElementById("waesyServerUrlInput");
  const waesyStoreIdInput = document.getElementById("waesyStoreIdInput");
  const saveConfigBtn = document.getElementById("saveConfigBtn");
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const testConnResult = document.getElementById("testConnResult");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const logBox = document.getElementById("logBox");

  let isSyncing = false;

  // 1. Gerenciamento de Abas
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabPanels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const targetId = btn.getAttribute("data-tab");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });

  function formatBrl(centsOrFloat) {
    const val = typeof centsOrFloat === "number" ? centsOrFloat : 0;
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function appendLog(text, type = "info") {
    if (!logBox) return;
    const line = document.createElement("div");
    line.className = `log-line ${type}`;
    const time = new Date().toLocaleTimeString("pt-BR");
    line.textContent = `[${time}] ${text}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // 2. Carrega estado inicial do Storage
  async function refreshState() {
    const data = await chrome.storage.local.get([
      "isSyncing",
      "reservasColetadas",
      "totalPassageiros",
      "totalVendas",
      "totalComissao",
      "pacingMin",
      "pacingMax",
      "cotacoesRecentes",
      "waesyServerUrl",
      "waesyStoreId",
    ]);

    isSyncing = Boolean(data.isSyncing);
    const reservas = data.reservasColetadas || [];
    const cotacoes = data.cotacoesRecentes || [];

    if (statReservas) statReservas.textContent = String(reservas.length);
    if (statPassageiros) statPassageiros.textContent = String(data.totalPassageiros || 0);
    if (statVendas) statVendas.textContent = formatBrl(data.totalVendas || 0);
    if (statComissao) statComissao.textContent = formatBrl(data.totalComissao || 0);

    if (tabQuotesCount) tabQuotesCount.textContent = String(cotacoes.length);
    if (quotesBadgeCount) quotesBadgeCount.textContent = `${cotacoes.length} orçamento(s)`;

    if (data.waesyServerUrl && waesyServerUrlInput) {
      waesyServerUrlInput.value = data.waesyServerUrl;
    }
    if (data.waesyStoreId && waesyStoreIdInput) {
      waesyStoreIdInput.value = data.waesyStoreId;
    }

    if (data.pacingMin && pacingSlider && pacingLabel) {
      pacingSlider.value = String(data.pacingMin);
      pacingLabel.textContent = `${data.pacingMin}.0s a ${data.pacingMax || (data.pacingMin + 3)}.0s`;
    }

    if (toggleSyncBtn && toggleSyncText) {
      if (isSyncing) {
        toggleSyncBtn.className = "btn-action btn-danger";
        toggleSyncText.textContent = "Pausar Sincronização";
      } else {
        toggleSyncBtn.className = "btn-action btn-primary";
        toggleSyncText.textContent = "Iniciar Sincronização em 2º Plano";
      }
    }

    renderQuotesList(cotacoes);
  }

  function renderQuotesList(cotacoes) {
    if (!quotesListContainer) return;
    quotesListContainer.innerHTML = "";

    if (cotacoes.length === 0) {
      quotesListContainer.innerHTML =
        '<div class="empty-state">Nenhuma cotação capturada na sessão atual.<br>Navegue por pesquisas de voos e hotéis nas operadoras.</div>';
      return;
    }

    cotacoes.slice(0, 30).forEach((q) => {
      const item = document.createElement("div");
      item.className = "quote-item";

      const left = document.createElement("div");
      const dest = document.createElement("div");
      dest.className = "quote-dest";
      dest.textContent = `${q.destinationCity || "Destino"} (${q.operatorSlug || "Operadora"})`;

      const dates = document.createElement("div");
      dates.className = "quote-dates";
      dates.textContent = `${q.startDate || ""} ${q.endDate ? "até " + q.endDate : ""} • ${q.adultsCount || 1} ADT`;

      left.appendChild(dest);
      left.appendChild(dates);

      const right = document.createElement("div");
      right.className = "quote-price";
      right.textContent = formatBrl((q.totalCents || 0) / 100);

      item.appendChild(left);
      item.appendChild(right);
      quotesListContainer.appendChild(item);
    });
  }

  // 3. Slider de Ritmo Humano
  if (pacingSlider && pacingLabel) {
    pacingSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      const min = val;
      const max = val + 3;
      pacingLabel.textContent = `${min}.0s a ${max}.0s`;
      chrome.storage.local.set({ pacingMin: min, pacingMax: max });
    });
  }

  // 4. Salvar Configurações de Conexão
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener("click", async () => {
      const serverUrl = (waesyServerUrlInput?.value || "").trim().replace(/\/+$/, "");
      const storeId = (waesyStoreIdInput?.value || "").trim();

      await chrome.storage.local.set({
        waesyServerUrl: serverUrl || "https://waesy.com.br",
        waesyStoreId: storeId,
      });

      appendLog(`Configurações salvas: Servidor ${serverUrl || "https://waesy.com.br"}`, "success");
      alert("Configurações de conexão salvas com sucesso!");
    });
  }

  // 5. Testar Conexão com o Servidor Waesy
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", async () => {
      const serverUrl = (waesyServerUrlInput?.value || "https://waesy.com.br").trim().replace(/\/+$/, "");
      testConnResult.textContent = "Testando conexão...";
      testConnResult.style.color = "#58a6ff";

      try {
        const res = await fetch(`${serverUrl}/api/v1/ingest/whoami`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }).catch(() => null);

        if (res && res.status !== 404) {
          testConnResult.textContent = `✓ Servidor acessível em ${serverUrl}`;
          testConnResult.style.color = "#3fb950";
          appendLog(`Servidor ${serverUrl} respondeu com sucesso!`, "success");
        } else {
          testConnResult.textContent = `Atenção: Servidor respondeu status ${res ? res.status : "offline"}`;
          testConnResult.style.color = "#f59e0b";
          appendLog(`Servidor respondeu com código ${res ? res.status : "offline"}`, "warn");
        }
      } catch (err) {
        testConnResult.textContent = "Falha ao conectar ao servidor.";
        testConnResult.style.color = "#f85149";
        appendLog(`Erro de rede conectando a ${serverUrl}`, "error");
      }
    });
  }

  // 6. Verificar Aba Ativa (Portal Detectado)
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isInfotravelTab =
    activeTab &&
    activeTab.url &&
    (activeTab.url.includes("orinter.com.br") ||
      activeTab.url.includes("incomumviagens.com.br") ||
      activeTab.url.includes("frt.com.br") ||
      activeTab.url.includes("schultz.com.br") ||
      activeTab.url.includes("infotravel"));

  if (isInfotravelTab) {
    if (statusBadge) {
      statusBadge.className = "status-badge online";
      statusBadge.innerHTML = '<span class="pulse-dot"></span><span>Portal Detectado</span>';
    }
    appendLog("Sessão ativa em portal de operadora parceira.", "success");
  } else {
    if (statusBadge) {
      statusBadge.className = "status-badge offline";
      statusBadge.innerHTML = '<span class="pulse-dot"></span><span>Aguardando Portal</span>';
    }
    appendLog("Abra uma aba de operadora (ex: online.orinter.com.br) para iniciar a varredura.", "warn");
  }

  await refreshState();

  // 7. Alternar Sincronização
  if (toggleSyncBtn) {
    toggleSyncBtn.addEventListener("click", async () => {
      if (!isInfotravelTab) {
        alert("Por favor, abra a aba da operadora de turismo (ex: Orinter, Incomum, FRT) para sincronizar.");
        return;
      }

      isSyncing = !isSyncing;
      await chrome.storage.local.set({ isSyncing });

      chrome.tabs.sendMessage(
        activeTab.id,
        {
          action: isSyncing ? "START_SYNC" : "STOP_SYNC",
          pacingMin: parseInt(pacingSlider?.value || "2", 10),
          pacingMax: parseInt(pacingSlider?.value || "2", 10) + 3,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            appendLog("Falha na comunicação com a página: " + chrome.runtime.lastError.message, "error");
          } else if (response && response.status) {
            appendLog(response.status, "success");
          }
        }
      );

      await refreshState();
    });
  }

  // 8. Sincronizar cotações com o Waesy CRM & Radar
  if (syncCrmBtn) {
    syncCrmBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["cotacoesRecentes", "waesyServerUrl", "waesyStoreId"]);
      const cotacoes = data.cotacoesRecentes || [];
      const serverUrl = (data.waesyServerUrl || "https://waesy.com.br").replace(/\/+$/, "");

      if (cotacoes.length === 0) {
        alert("Nenhuma cotação capturada na memória. Pesquise voos ou hotéis no portal da operadora.");
        return;
      }

      syncCrmBtn.disabled = true;
      syncCrmBtn.textContent = "Transmitindo...";
      appendLog(`Transmitindo ${cotacoes.length} cotações para ${serverUrl}...`, "info");

      let successCount = 0;
      let oppTotal = 0;

      for (const q of cotacoes) {
        try {
          const payload = {
            storeId: data.waesyStoreId || undefined,
            operatorSlug: q.operatorSlug || "infotravel_default",
            sourcePage: q.sourcePage || "carrinho",
            originCity: q.originCity || null,
            destinationCity: q.destinationCity,
            startDate: q.startDate,
            endDate: q.endDate || null,
            adultsCount: q.adultsCount || 1,
            childrenCount: q.childrenCount || 0,
            currency: q.currency || "BRL",
            totalCents: q.totalCents,
            perAdultCents: q.perAdultCents || null,
            taxesCents: q.taxesCents || 0,
            items: q.items || [],
            rawPayloadJson: q,
          };

          const res = await fetch(`${serverUrl}/api/v1/ingest/infotravel-quotes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(data.waesyStoreId ? { "x-waesy-store-id": data.waesyStoreId } : {}),
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const resData = await res.json();
            successCount++;
            oppTotal += resData.opportunitiesGenerated || 0;
          }
        } catch (err) {
          console.warn("[Waesy Sync] Falha ao enviar cotação:", err);
        }
      }

      syncCrmBtn.disabled = false;
      syncCrmBtn.textContent = "Transmitir ao Waesy CRM & Radar";
      appendLog(
        `Transmissão finalizada: ${successCount}/${cotacoes.length} cotações gravadas, ${oppTotal} oportunidades no radar!`,
        "success"
      );
    });
  }

  // 9. Limpar cotações
  if (clearQuotesBtn) {
    clearQuotesBtn.addEventListener("click", async () => {
      if (confirm("Deseja limpar a lista de cotações em memória?")) {
        await chrome.storage.local.set({ cotacoesRecentes: [] });
        await refreshState();
        appendLog("Memória de cotações limpa.", "info");
      }
    });
  }

  // 10. Exportar CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["reservasColetadas"]);
      const reservas = data.reservasColetadas || [];

      if (reservas.length === 0) {
        alert("Nenhuma reserva coletada ainda.");
        return;
      }

      const headers = [
        "ID Reserva",
        "Status",
        "Data Criacao",
        "Contato",
        "Email",
        "Telefone",
        "Nome Passageiro",
        "CPF Passageiro",
        "Data Nascimento",
        "Idade",
        "Tipo (ADT/CHD)",
        "Titular?",
        "Destino / Hotel",
        "Acomodacao",
        "Valor Total (R$)",
        "Taxas (R$)",
        "Forma Pagamento",
        "Status Pagamento",
        "Score Confianca Operadora",
        "Banco Emissor",
        "Parcelamento",
        "Comissao (R$)",
      ];

      function escapeCsv(val) {
        if (val === null || val === undefined) return "";
        const s = String(val).trim().replace(/\r?\n/g, " ").replace(/"/g, '""');
        return `"${s}"`;
      }

      const rows = [];
      reservas.forEach((r) => {
        if (r.passageiros && r.passageiros.length > 0) {
          r.passageiros.forEach((p) => {
            rows.push(
              [
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
                p.titular ? "SIM" : "NAO",
                r.hotel || r.destino,
                r.acomodacao || "Standard",
                r.valorTotal,
                r.taxas,
                r.formaPagto || "Faturado",
                r.statusPagto || "Aprovado",
                r.scoreConfianca || 80,
                r.bancoEmissor || "Operadora Direto",
                r.parcelamento || "1x",
                r.comissao,
              ]
                .map(escapeCsv)
                .join(";")
            );
          });
        } else {
          rows.push(
            [
              r.id,
              r.status,
              r.criacao,
              r.contato,
              r.email,
              r.telefone,
              r.contato || "Titular",
              "",
              "",
              "",
              "ADT",
              "SIM",
              r.hotel || r.destino,
              r.acomodacao || "Standard",
              r.valorTotal,
              r.taxas,
              r.formaPagto || "Faturado",
              r.statusPagto || "Aprovado",
              r.scoreConfianca || 80,
              r.bancoEmissor || "Operadora Direto",
              r.parcelamento || "1x",
              r.comissao,
            ]
              .map(escapeCsv)
              .join(";")
          );
        }
      });

      // BOM UTF-8 (\uFEFF) para abrir com acentuação correta no Excel brasileiro
      const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `reservas_excelencia_tour_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      appendLog("CSV exportado com sucesso para a pasta Downloads.", "success");
    });
  }

  // 11. Exportar JSON
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["reservasColetadas", "cotacoesRecentes"]);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados_waesy_sync_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      appendLog("JSON exportado com sucesso.", "success");
    });
  }

  // 12. Limpar Logs
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
      if (logBox) logBox.innerHTML = "";
    });
  }
});
