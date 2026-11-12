// Waesy Ingest • WhatsApp Web Popup Controller v2.2.0
document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("statusBadge");
  const inlineBanner = document.getElementById("inlineBanner");
  const activeGroupName = document.getElementById("activeGroupName");
  const groupBadge = document.getElementById("groupBadge");
  const scanGroupBtn = document.getElementById("scanGroupBtn");
  const contactsCountBadge = document.getElementById("contactsCountBadge");
  const contactsListContainer = document.getElementById("contactsListContainer");
  const dryRunCheckbox = document.getElementById("dryRunCheckbox");
  const sendToWaesyBtn = document.getElementById("sendToWaesyBtn");
  const serverUrlInput = document.getElementById("serverUrlInput");
  const tokenInput = document.getElementById("tokenInput");
  const saveConfigBtn = document.getElementById("saveConfigBtn");
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const testConnResult = document.getElementById("testConnResult");
  const logBox = document.getElementById("logBox");
  const clearLogsBtn = document.getElementById("clearLogsBtn");

  let currentGroup = { key: "geral", name: "WhatsApp Geral" };
  let extractedContacts = [];

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
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  function showBanner(text, level = "info") {
    if (!inlineBanner) return;
    inlineBanner.className = `inline-banner show ${level}`;
    inlineBanner.textContent = text;
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

  // 2. Carrega Configurações e último escaneamento salvo
  async function loadConfig() {
    const data = await chrome.storage.local.get([
      "waesyServerUrl",
      "waesyToken",
      "lastExtractedContacts",
      "lastGroup",
    ]);
    if (data.waesyServerUrl && serverUrlInput) {
      serverUrlInput.value = data.waesyServerUrl;
    }
    if (data.waesyToken && tokenInput) {
      tokenInput.value = data.waesyToken;
    }
    if (Array.isArray(data.lastExtractedContacts) && data.lastExtractedContacts.length > 0) {
      extractedContacts = data.lastExtractedContacts;
      if (data.lastGroup?.name) {
        currentGroup = data.lastGroup;
        if (activeGroupName) activeGroupName.textContent = currentGroup.name;
      }
      if (contactsCountBadge) contactsCountBadge.textContent = `${extractedContacts.length} contatos`;
      if (sendToWaesyBtn) sendToWaesyBtn.disabled = false;
      renderContactsList(extractedContacts);
    }
  }

  await loadConfig();

  // 3. Salvar Configurações
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener("click", async () => {
      const serverUrl = (serverUrlInput?.value || "https://waesy.com.br").trim().replace(/\/+$/, "");
      const token = (tokenInput?.value || "").trim();

      await chrome.storage.local.set({
        waesyServerUrl: serverUrl,
        waesyToken: token,
      });

      appendLog("Configurações salvas no armazenamento local.", "success");
      showBanner("Credenciais salvas com sucesso.", "success");
    });
  }

  // 4. Testar Conexão (Whoami)
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", async () => {
      const serverUrl = (serverUrlInput?.value || "https://waesy.com.br").trim().replace(/\/+$/, "");
      const token = (tokenInput?.value || "").trim();

      if (!token) {
        testConnResult.textContent = "Informe o Token de Ingestão primeiro.";
        testConnResult.style.color = "#f85149";
        showBanner("Informe o Token wae_... antes de validar.", "warn");
        return;
      }

      testConnResult.textContent = "Validando credencial...";
      testConnResult.style.color = "#58a6ff";

      try {
        const res = await fetch(`${serverUrl}/api/v1/ingest/whoami`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.entitlement) {
          const storeLabel = data.storeInfo?.name || data.store || "Loja Autenticada";
          testConnResult.textContent = `Conectado: ${storeLabel}`;
          testConnResult.style.color = "#3fb950";
          appendLog(`Token validado com sucesso para "${storeLabel}"`, "success");
          showBanner(`Conectado à loja ${storeLabel}.`, "success");
        } else {
          const errMsg = data.error || `Token inválido ou não autorizado (HTTP ${res.status})`;
          testConnResult.textContent = `Erro ${res.status}: ${errMsg}`;
          testConnResult.style.color = "#f85149";
          appendLog(`Falha de autenticação (HTTP ${res.status}): ${errMsg}`, "error");
          showBanner(errMsg, "error");
        }
      } catch {
        testConnResult.textContent = "Falha ao conectar com o servidor.";
        testConnResult.style.color = "#f85149";
        appendLog(`Erro de rede ao conectar com ${serverUrl}`, "error");
        showBanner("Erro de rede ao validar token no servidor.", "error");
      }
    });
  }

  // 5. Detectar WhatsApp Web
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isWhatsApp = activeTab && activeTab.url && activeTab.url.includes("web.whatsapp.com");

  if (isWhatsApp) {
    if (statusBadge) {
      statusBadge.className = "status-badge online";
      statusBadge.innerHTML = '<span class="pulse-dot"></span><span>WhatsApp Conectado</span>';
    }
    appendLog("Aba do WhatsApp Web ativa e pronta para leitura.", "success");

    chrome.tabs.sendMessage(activeTab.id, { action: "GET_CHAT_INFO" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.chatName) {
        currentGroup = {
          key: response.chatKey || "grupo_wa",
          name: response.chatName,
        };
        if (activeGroupName) activeGroupName.textContent = response.chatName;
        if (groupBadge) groupBadge.textContent = response.isGroup ? "Grupo" : "Conversa";
        appendLog(`Conversa identificada: "${response.chatName}"`, "info");
      }
    });
  } else {
    if (statusBadge) {
      statusBadge.className = "status-badge offline";
      statusBadge.innerHTML = '<span class="pulse-dot"></span><span>Aguardando WhatsApp</span>';
    }
    appendLog("Abra o WhatsApp Web (web.whatsapp.com) para extrair contatos.", "warn");
  }

  // 6. Escanear Participantes do Grupo
  if (scanGroupBtn) {
    scanGroupBtn.addEventListener("click", () => {
      if (!isWhatsApp || !activeTab?.id) {
        showBanner("Abra a aba do WhatsApp Web (web.whatsapp.com) para escanear contatos.", "warn");
        return;
      }

      scanGroupBtn.disabled = true;
      scanGroupBtn.textContent = "Rolando e Escaneando Participantes...";
      appendLog("Iniciando varredura com auto-scroll no WhatsApp Web...", "info");

      chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_GROUP_CONTACTS" }, async (response) => {
        scanGroupBtn.disabled = false;
        scanGroupBtn.textContent = "Escanear Participantes do Grupo";

        if (chrome.runtime.lastError) {
          const msg = "Falha ao ler a página: " + chrome.runtime.lastError.message + ". Recarregue o WhatsApp Web.";
          appendLog(msg, "error");
          showBanner(msg, "error");
          return;
        }

        if (!response || !response.contacts || response.contacts.length === 0) {
          const tip =
            "Nenhum participante encontrado. Clique no nome do grupo no topo para abrir a lista de membros e tente novamente.";
          appendLog(tip, "warn");
          showBanner(tip, "warn");
          return;
        }

        extractedContacts = response.contacts;
        currentGroup = {
          key: response.groupKey || currentGroup.key,
          name: response.groupName || currentGroup.name,
        };
        await chrome.storage.local.set({
          lastExtractedContacts: extractedContacts,
          lastGroup: currentGroup,
        });

        if (activeGroupName) activeGroupName.textContent = currentGroup.name;
        if (contactsCountBadge) contactsCountBadge.textContent = `${extractedContacts.length} contatos`;
        if (sendToWaesyBtn) sendToWaesyBtn.disabled = false;

        renderContactsList(extractedContacts);
        const okMsg = `${extractedContacts.length} participantes extraídos de "${currentGroup.name}".`;
        appendLog(okMsg, "success");
        showBanner(okMsg, "success");
      });
    });
  }

  function renderContactsList(contacts) {
    if (!contactsListContainer) return;
    contactsListContainer.innerHTML = "";

    contacts.slice(0, 100).forEach((c) => {
      const item = document.createElement("div");
      item.className = "contact-item";

      const left = document.createElement("div");
      const name = document.createElement("div");
      name.className = "contact-name";
      name.textContent = c.name || "Participante";

      const phone = document.createElement("div");
      phone.className = "contact-phone";
      phone.textContent = formatPhoneMask(c.phone);

      left.appendChild(name);
      left.appendChild(phone);
      item.appendChild(left);
      contactsListContainer.appendChild(item);
    });

    if (contacts.length > 100) {
      const more = document.createElement("div");
      more.className = "empty-state";
      more.textContent = `... e mais ${contacts.length - 100} contatos na lista.`;
      contactsListContainer.appendChild(more);
    }
  }

  function formatPhoneMask(phone) {
    const raw = String(phone).replace(/\D/g, "");
    if (raw.length === 13 && raw.startsWith("55")) {
      return `+55 (${raw.slice(2, 4)}) ${raw.slice(4, 9)}-${raw.slice(9)}`;
    }
    if (raw.length === 11) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    return phone;
  }

  // 7. Enviar contatos ao Waesy CRM (fatiado em lotes de até 500)
  if (sendToWaesyBtn) {
    sendToWaesyBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["waesyServerUrl", "waesyToken"]);
      const serverUrl = (data.waesyServerUrl || "https://waesy.com.br").replace(/\/+$/, "");
      const token = data.waesyToken;

      if (!token) {
        showBanner("Configure o Token de Ingestão na aba 'Conexão Waesy' antes de enviar.", "warn");
        return;
      }

      if (extractedContacts.length === 0) {
        showBanner("Escaneie os participantes do grupo primeiro.", "warn");
        return;
      }

      const isDryRun = Boolean(dryRunCheckbox?.checked);
      sendToWaesyBtn.disabled = true;
      sendToWaesyBtn.textContent = "Transmitindo lotes...";
      appendLog(`Enviando ${extractedContacts.length} contatos para ${serverUrl}...`, "info");

      const CHUNK_SIZE = 500;
      const itemsAll = extractedContacts.map((c) => ({
        phone: c.phone,
        name: c.name || "",
        group_key: currentGroup.key || "grupo_wa",
        group_name: currentGroup.name || "WhatsApp Grupo",
      }));

      const totals = {
        created: 0,
        merged: 0,
        skipped_customer: 0,
        skipped_opted_out: 0,
        invalid: 0,
        duplicate_in_batch: 0,
        replayed: 0,
      };

      try {
        for (let i = 0; i < itemsAll.length; i += CHUNK_SIZE) {
          const slice = itemsAll.slice(i, i + CHUNK_SIZE);
          const batchIndex = Math.floor(i / CHUNK_SIZE) + 1;
          const idempotencyKey = `wae_wa_${Date.now()}_${batchIndex}_${Math.random().toString(36).substring(2, 8)}`;

          const res = await fetch(`${serverUrl}/api/v1/ingest/whatsapp-contacts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idempotency_key: idempotencyKey,
              dry_run: isDryRun,
              items: slice,
            }),
          });

          const result = await res.json().catch(() => ({}));
          if (!res.ok) {
            const errMsg = `Erro HTTP ${res.status}: ${result.error || "Falha ao enviar contatos."}`;
            appendLog(errMsg, "error");
            showBanner(errMsg, "error");
            return;
          }

          totals.created += Number(result.created || 0);
          totals.merged += Number(result.merged || 0);
          totals.skipped_customer += Number(result.skipped_customer || 0);
          totals.skipped_opted_out += Number(result.skipped_opted_out || 0);
          totals.invalid += Number(result.invalid || 0);
          totals.duplicate_in_batch += Number(result.duplicate_in_batch || 0);
          totals.replayed += result.replayed ? 1 : 0;
        }

        const summary = `${isDryRun ? "[Dry-Run] " : ""}Concluído (${itemsAll.length} enviados): +${totals.created} novos, ${totals.merged} atualizados, ${totals.skipped_customer} já clientes, ${totals.skipped_opted_out} opt-out, ${totals.invalid} inválidos.`;
        appendLog(summary, "success");
        showBanner(summary, "success");
      } catch (err) {
        appendLog(`Erro de rede ao transmitir contatos: ${err.message}`, "error");
        showBanner("Erro de conexão com o servidor Waesy.", "error");
      } finally {
        sendToWaesyBtn.disabled = false;
        sendToWaesyBtn.textContent = "Enviar ao Waesy CRM (Oportunidades)";
      }
    });
  }

  // 8. Limpar Logs
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
      if (logBox) logBox.innerHTML = "";
    });
  }
});
