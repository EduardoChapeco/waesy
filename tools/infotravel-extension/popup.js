// Waesy Sync • Popup Controller v2.2.0
document.addEventListener("DOMContentLoaded", async () => {
  // Elementos de UI
  const statusBadge = document.getElementById("statusBadge");
  const inlineBanner = document.getElementById("inlineBanner");
  const operatorPill = document.getElementById("operatorPill");
  const activatePortalBtn = document.getElementById("activatePortalBtn");
  const statReservas = document.getElementById("statReservas");
  const statPassageiros = document.getElementById("statPassageiros");
  const statVendas = document.getElementById("statVendas");
  const statComissao = document.getElementById("statComissao");
  const pacingSlider = document.getElementById("pacingSlider");
  const pacingLabel = document.getElementById("pacingLabel");
  const toggleSyncBtn = document.getElementById("toggleSyncBtn");
  const toggleSyncText = document.getElementById("toggleSyncText");
  const syncReservationsBtn = document.getElementById("syncReservationsBtn");
  const syncCrmBtn = document.getElementById("syncCrmBtn");
  const clearQuotesBtn = document.getElementById("clearQuotesBtn");
  const quotesListContainer = document.getElementById("quotesListContainer");
  const quotesBadgeCount = document.getElementById("quotesBadgeCount");
  const tabQuotesCount = document.getElementById("tabQuotesCount");
  const waesyServerUrlInput = document.getElementById("waesyServerUrlInput");
  const waesyTokenInput = document.getElementById("waesyTokenInput");
  const autoSyncCheckbox = document.getElementById("autoSyncCheckbox");
  const saveConfigBtn = document.getElementById("saveConfigBtn");
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const testConnResult = document.getElementById("testConnResult");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const logBox = document.getElementById("logBox");

  let isSyncing = false;
  let portalDetected = false;
  let clearConfirmArmed = false;

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

  function showBanner(message, level = "info") {
    if (!inlineBanner) return;
    inlineBanner.className = `inline-banner show ${level}`;
    inlineBanner.textContent = message;
  }

  function formatBrl(centsOrFloat) {
    const val = typeof centsOrFloat === "number" ? centsOrFloat : 0;
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function appendLog(text, type = "info", customTime) {
    if (!logBox) return;
    const line = document.createElement("div");
    line.className = `log-line ${type}`;
    const time = customTime || new Date().toLocaleTimeString("pt-BR");
    line.textContent = `[${time}] ${text}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function detectOperatorFromUrl(url) {
    const lower = String(url || "").toLowerCase();
    if (lower.includes("orinter")) return "orinter";
    if (lower.includes("incomum")) return "incomum";
    if (lower.includes("frt")) return "frt";
    if (lower.includes("schultz")) return "schultz";
    if (lower.includes("infotravel")) return "infotravel";
    return "portal_web";
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
      "waesyToken",
      "autoSyncReservas",
      "syncLogs",
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
    if (data.waesyToken && waesyTokenInput) {
      waesyTokenInput.value = data.waesyToken;
    }
    if (autoSyncCheckbox) {
      autoSyncCheckbox.checked = data.autoSyncReservas !== false;
    }

    if (data.pacingMin && pacingSlider && pacingLabel) {
      pacingSlider.value = String(data.pacingMin);
      pacingLabel.textContent = `${data.pacingMin}.0s a ${data.pacingMax || data.pacingMin + 3}.0s`;
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

    if (Array.isArray(data.syncLogs) && logBox && logBox.childElementCount === 0) {
      data.syncLogs.slice(-50).forEach((entry) => {
        appendLog(entry.text, entry.type, entry.time);
      });
    }

    renderQuotesList(cotacoes);
  }

  function renderQuotesList(cotacoes) {
    if (!quotesListContainer) return;
    quotesListContainer.innerHTML = "";

    if (cotacoes.length === 0) {
      quotesListContainer.innerHTML =
        '<div class="empty-state">Nenhuma cotação capturada na sessão atual.<br>Navegue por pesquisas de voos, hotéis ou carrinho nas operadoras.</div>';
      return;
    }

    cotacoes.slice(0, 30).forEach((q) => {
      const item = document.createElement("div");
      item.className = "quote-item";

      const left = document.createElement("div");
      const dest = document.createElement("div");
      dest.className = "quote-dest";
      dest.textContent = `${q.destinationCity || "Destino"} (${q.operatorSlug || "infotravel"})`;

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
      const token = (waesyTokenInput?.value || "").trim();
      const autoSync = Boolean(autoSyncCheckbox ? autoSyncCheckbox.checked : true);

      await chrome.storage.local.set({
        waesyServerUrl: serverUrl || "https://waesy.com.br",
        waesyToken: token,
        autoSyncReservas: autoSync,
      });

      appendLog(`Configurações salvas: Servidor ${serverUrl || "https://waesy.com.br"}`, "success");
      showBanner("Configurações de conexão salvas com sucesso.", "success");
    });
  }

  // 5. Validar Token e Conexão com o Servidor Waesy
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", async () => {
      const serverUrl = (waesyServerUrlInput?.value || "https://waesy.com.br").trim().replace(/\/+$/, "");
      const token = (waesyTokenInput?.value || "").trim();
      if (!token) {
        testConnResult.textContent = "Informe o Token wae_... gerado no painel Turismo > Operadoras Infotravel.";
        testConnResult.style.color = "#f59e0b";
        showBanner("Token Waesy obrigatório para autenticar no servidor.", "warn");
        return;
      }

      await chrome.storage.local.set({ waesyServerUrl: serverUrl, waesyToken: token });
      testConnResult.textContent = "Validando token e permissões...";
      testConnResult.style.color = "#58a6ff";

      try {
        const res = await fetch(`${serverUrl}/api/v1/ingest/whoami`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload.entitlement) {
          const storeName = payload.storeInfo?.name || payload.store || "Agência Conectada";
          testConnResult.textContent = `Conectado: ${storeName} (${(payload.scopes || []).join(", ")})`;
          testConnResult.style.color = "#3fb950";
          appendLog(`Token autenticado para ${storeName}`, "success");
          showBanner(`Conectado à loja ${storeName}.`, "success");
        } else {
          const msg = payload.error || `Falha HTTP ${res.status}`;
          testConnResult.textContent = `Não autorizado: ${msg}`;
          testConnResult.style.color = "#f85149";
          appendLog(`Falha na autenticação (${res.status}): ${msg}`, "error");
          showBanner(`Falha na validação do token: ${msg}`, "error");
        }
      } catch {
        testConnResult.textContent = "Falha de rede ao conectar ao servidor.";
        testConnResult.style.color = "#f85149";
        appendLog(`Erro de rede conectando a ${serverUrl}`, "error");
        showBanner("Erro de rede ao acessar o servidor Waesy.", "error");
      }
    });
  }

  // 6. Verificar Aba Ativa (DOM Infotravel ou URL conhecida + Ativação em qualquer domínio Infotravel)
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  async function probeActivePortal() {
    if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith("chrome")) {
      return false;
    }
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, { action: "PING_INFOTRAVEL" });
      if (resp && resp.isInfotravel) {
        if (operatorPill) operatorPill.textContent = (resp.operatorSlug || detectOperatorFromUrl(activeTab.url)).toUpperCase();
        return true;
      }
    } catch {
      // Content script pode nao estar injetado ainda em dominio customizado
    }
    return false;
  }

  function updatePortalBadge(detected, url) {
    portalDetected = detected;
    if (detected) {
      if (statusBadge) {
        statusBadge.className = "status-badge online";
        statusBadge.innerHTML = '<span class="pulse-dot"></span><span>Portal Detectado</span>';
      }
      if (activatePortalBtn) activatePortalBtn.style.display = "none";
      if (operatorPill && (operatorPill.textContent === "Detectando..." || !operatorPill.textContent)) {
        operatorPill.textContent = detectOperatorFromUrl(url).toUpperCase();
      }
      appendLog("Sessão Infotravel ativa e pronta para extração.", "success");
    } else {
      if (statusBadge) {
        statusBadge.className = "status-badge offline";
        statusBadge.innerHTML = '<span class="pulse-dot"></span><span>Aguardando Portal</span>';
      }
      if (operatorPill) operatorPill.textContent = detectOperatorFromUrl(url).toUpperCase();
      if (activatePortalBtn && activeTab && activeTab.url && /^https?:\/\//i.test(activeTab.url)) {
        activatePortalBtn.style.display = "inline-block";
      }
      appendLog("Abra um portal Infotravel (Orinter, FRT, Incomum, Schultz ou clique em Ativar neste Portal).", "warn");
    }
  }

  const probed = await probeActivePortal();
  updatePortalBadge(probed, activeTab?.url || "");

  if (activatePortalBtn) {
    activatePortalBtn.addEventListener("click", async () => {
      if (!activeTab?.id || !activeTab?.url) return;
      try {
        const parsed = new URL(activeTab.url);
        const originPattern = `${parsed.origin}/*`;
        const granted = await chrome.permissions.request({ origins: [originPattern] });
        if (!granted) {
          showBanner("Permissão negada para este domínio.", "warn");
          return;
        }
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id, allFrames: true },
          files: ["content.js"],
        });
        const ok = await probeActivePortal();
        updatePortalBadge(ok, activeTab.url);
        if (ok) {
          showBanner("Portal Infotravel ativado nesta aba com sucesso!", "success");
        } else {
          showBanner("Script injetado, mas os elementos do Infotravel não foram detectados nesta tela.", "warn");
        }
      } catch (err) {
        appendLog(`Falha ao ativar portal customizado: ${err.message}`, "error");
        showBanner("Não foi possível ativar neste domínio.", "error");
      }
    });
  }

  await refreshState();

  // 7. Alternar Sincronização em 2º Plano
  if (toggleSyncBtn) {
    toggleSyncBtn.addEventListener("click", async () => {
      if (!portalDetected || !activeTab?.id) {
        showBanner("Abra uma tela de Reservas Infotravel ou clique em 'Ativar neste Portal'.", "warn");
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
            showBanner("Recarregue a aba do portal e tente novamente.", "error");
          } else if (response && response.status) {
            appendLog(response.status, "success");
            showBanner(response.status, "info");
          }
        }
      );

      await refreshState();
    });
  }

  // 7b. Enviar todas as reservas em memória para o Waesy CRM
  if (syncReservationsBtn) {
    syncReservationsBtn.addEventListener("click", async () => {
      syncReservationsBtn.disabled = true;
      syncReservationsBtn.textContent = "Enviando reservas ao CRM...";
      chrome.runtime.sendMessage({ type: "SYNC_RESERVATIONS_CLOUD" }, (res) => {
        syncReservationsBtn.disabled = false;
        syncReservationsBtn.textContent = "Enviar Reservas Coletadas ao Waesy CRM";
        if (chrome.runtime.lastError || !res || !res.ok) {
          const msg = res?.error || chrome.runtime.lastError?.message || "Erro ao sincronizar reservas";
          showBanner(msg, "error");
          appendLog(msg, "error");
        } else {
          const s = res.summary || {};
          const summaryMsg = `CRM atualizado: ${res.syncedCount || 0} reservas enviadas (Trips: +${s.tripsCreated || 0}/${s.tripsUpdated || 0}, Pax: ${s.passengersUpserted || 0}).`;
          showBanner(summaryMsg, "success");
          appendLog(summaryMsg, "success");
        }
      });
    });
  }

  // 8. Sincronizar cotações com o Waesy CRM & Radar
  if (syncCrmBtn) {
    syncCrmBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["cotacoesRecentes", "waesyServerUrl", "waesyToken"]);
      const cotacoes = data.cotacoesRecentes || [];
      const serverUrl = (data.waesyServerUrl || "https://waesy.com.br").replace(/\/+$/, "");

      if (!data.waesyToken) {
        showBanner("Configure seu Token wae_... na aba 'Conexão Waesy' primeiro.", "warn");
        return;
      }

      if (cotacoes.length === 0) {
        showBanner("Nenhuma cotação capturada. Pesquise voos ou hotéis no portal.", "warn");
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
            operatorSlug: q.operatorSlug || "infotravel",
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
              Authorization: `Bearer ${data.waesyToken}`,
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
      const doneMsg = `Transmissão finalizada: ${successCount}/${cotacoes.length} cotações gravadas, ${oppTotal} oportunidades no radar.`;
      appendLog(doneMsg, "success");
      showBanner(doneMsg, "success");
    });
  }

  // 9. Limpar cotações (confirmação em 2 etapas inline, sem confirm())
  if (clearQuotesBtn) {
    clearQuotesBtn.addEventListener("click", async () => {
      if (!clearConfirmArmed) {
        clearConfirmArmed = true;
        clearQuotesBtn.textContent = "Clique novamente para confirmar limpeza";
        setTimeout(() => {
          clearConfirmArmed = false;
          if (clearQuotesBtn) clearQuotesBtn.textContent = "Limpar Memória de Cotações";
        }, 4000);
        return;
      }
      clearConfirmArmed = false;
      clearQuotesBtn.textContent = "Limpar Memória de Cotações";
      await chrome.storage.local.set({ cotacoesRecentes: [] });
      await refreshState();
      appendLog("Memória de cotações limpa.", "info");
      showBanner("Memória de cotações limpa.", "info");
    });
  }

  // 10. Exportar CSV (schema canonico alinhado ao coletor.mjs e parseOperatorCsvToSyncItems)
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["reservasColetadas"]);
      const reservas = data.reservasColetadas || [];

      if (reservas.length === 0) {
        showBanner("Nenhuma reserva coletada ainda para exportar.", "warn");
        return;
      }

      const headers = [
        "ID Reserva",
        "Status Reserva",
        "Data Criacao",
        "Check-in",
        "Check-out",
        "Operadora",
        "Contato Titular",
        "Email Contato",
        "Telefone Contato",
        "Nome Passageiro",
        "CPF Passageiro",
        "Data Nascimento",
        "Idade",
        "Tipo (ADT/CHD/INF)",
        "E Titular?",
        "Destino / Hotel",
        "Acomodacao",
        "Localizador",
        "Valor Total Venda (R$)",
        "Taxas Inclusas (R$)",
        "Impostos Inclusos (R$)",
        "Forma de Pagamento",
        "Status Pagamento",
        "Score Confianca",
        "Banco Emissor",
        "Parcelamento",
        "Comissao Agencia (R$)",
      ];

      function escapeCsv(val) {
        if (val === null || val === undefined) return "";
        const s = String(val).trim().replace(/\r?\n/g, " ").replace(/"/g, '""');
        return `"${s}"`;
      }

      const rows = [];
      reservas.forEach((r) => {
        const paxList = r.passageiros && r.passageiros.length > 0
          ? r.passageiros
          : [{ nome: r.contato || "Titular", cpf: "", nasc: "", idade: "", tipo: "ADT", titular: true }];

        paxList.forEach((p) => {
          rows.push(
            [
              r.id,
              r.status,
              r.criacao,
              r.checkIn || "",
              r.checkOut || "",
              r.operatorSlug || "orinter",
              r.contato,
              r.email,
              r.telefone,
              p.nome,
              p.cpf,
              p.nasc,
              p.idade,
              p.tipo || "ADT",
              p.titular ? "SIM" : "NAO",
              r.hotel || r.destino,
              r.acomodacao || "Standard",
              r.localizador || "",
              r.valorTotal,
              r.taxas,
              r.impostos || "0,00",
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
      });

      const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `reservas_waesy_sync_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      appendLog(`CSV exportado (${rows.length} linhas) para Downloads.`, "success");
      showBanner("CSV exportado com sucesso.", "success");
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
      showBanner("JSON exportado com sucesso.", "success");
    });
  }

  // 12. Limpar Logs
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", async () => {
      if (logBox) logBox.innerHTML = "";
      await chrome.storage.local.set({ syncLogs: [] });
    });
  }

  // 13. Escuta eventos em tempo real do background / content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === "SYNC_LOG" && msg.payload) {
      appendLog(msg.payload.text, msg.payload.type, msg.payload.time);
    } else if (msg.type === "SYNC_STATE_CHANGED" || msg.type === "RESERVATIONS_UPDATED") {
      refreshState();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.isSyncing || changes.reservasColetadas || changes.cotacoesRecentes) {
      refreshState();
    }
  });
});
