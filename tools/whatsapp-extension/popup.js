// Waesy Ingest • WhatsApp Web Popup Controller
document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("statusBadge");
  const statusText = document.getElementById("statusText");
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

  function appendLog(text, type = "info") {
    if (!logBox) return;
    const line = document.createElement("div");
    line.className = `log-line ${type}`;
    const time = new Date().toLocaleTimeString("pt-BR");
    line.textContent = `[${time}] ${text}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // 2. Carrega Configurações
  async function loadConfig() {
    const data = await chrome.storage.local.get(["waesyServerUrl", "waesyToken"]);
    if (data.waesyServerUrl && serverUrlInput) {
      serverUrlInput.value = data.waesyServerUrl;
    }
    if (data.waesyToken && tokenInput) {
      tokenInput.value = data.waesyToken;
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

      appendLog("Configurações salvas no armazenamento seguro.", "success");
      alert("Credenciais salvas com sucesso!");
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

        if (res.ok) {
          const data = await res.json();
          testConnResult.textContent = `✓ Conectado: ${data.store?.name || "Excelência Tour SMO"}`;
          testConnResult.style.color = "#3fb950";
          appendLog(`Token validado com sucesso para a loja "${data.store?.name || "Excelência Tour"}"`, "success");
        } else {
          testConnResult.textContent = `Erro ${res.status}: Token inválido ou não autorizado.`;
          testConnResult.style.color = "#f85149";
          appendLog(`Falha de autenticação (HTTP ${res.status})`, "error");
        }
      } catch (err) {
        testConnResult.textContent = "Falha ao conectar com o servidor.";
        testConnResult.style.color = "#f85149";
        appendLog(`Erro de rede ao conectar com ${serverUrl}`, "error");
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

    // Consulta conversa ativa
    chrome.tabs.sendMessage(activeTab.id, { action: "GET_CHAT_INFO" }, (response) => {
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
      if (!isWhatsApp) {
        alert("Por favor, abra o WhatsApp Web na aba ativa para escanear contatos.");
        return;
      }

      scanGroupBtn.disabled = true;
      scanGroupBtn.textContent = "Escaneando Participantes...";
      appendLog("Iniciando varredura de contatos no DOM do WhatsApp Web...", "info");

      chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_GROUP_CONTACTS" }, (response) => {
        scanGroupBtn.disabled = false;
        scanGroupBtn.textContent = "Escanear Participantes do Grupo";

        if (chrome.runtime.lastError) {
          appendLog("Falha ao comunicar com o WhatsApp Web: " + chrome.runtime.lastError.message, "error");
          alert("Não foi possível ler a página. Certifique-se de que o WhatsApp Web está aberto.");
          return;
        }

        if (!response || !response.contacts || response.contacts.length === 0) {
          appendLog("Nenhum contato detectado. Abra os dados do grupo no painel lateral direito para escanear a lista completa de membros.", "warn");
          alert("Nenhum participante encontrado. Dica: Clique no cabeçalho do grupo para abrir o painel com a lista de membros e tente novamente!");
          return;
        }

        extractedContacts = response.contacts;
        currentGroup.name = response.groupName || currentGroup.name;
        if (activeGroupName) activeGroupName.textContent = currentGroup.name;

        if (contactsCountBadge) contactsCountBadge.textContent = `${extractedContacts.length} contatos`;
        if (sendToWaesyBtn) sendToWaesyBtn.disabled = false;

        renderContactsList(extractedContacts);
        appendLog(`Sucesso: ${extractedContacts.length} participantes extraídos do grupo "${currentGroup.name}"!`, "success");
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

  // 7. Enviar contatos ao Waesy CRM
  if (sendToWaesyBtn) {
    sendToWaesyBtn.addEventListener("click", async () => {
      const data = await chrome.storage.local.get(["waesyServerUrl", "waesyToken"]);
      const serverUrl = (data.waesyServerUrl || "https://waesy.com.br").replace(/\/+$/, "");
      const token = data.waesyToken;

      if (!token) {
        alert("Configure o Token de Ingestão na aba 'Conexão Waesy' antes de enviar.");
        return;
      }

      if (extractedContacts.length === 0) {
        alert("Escaneie os participantes do grupo primeiro.");
        return;
      }

      const isDryRun = Boolean(dryRunCheckbox?.checked);
      sendToWaesyBtn.disabled = true;
      sendToWaesyBtn.textContent = "Transmitindo...";
      appendLog(`Enviando lote de ${extractedContacts.length} contatos para ${serverUrl}...`, "info");

      try {
        const idempotencyKey = `wae_wa_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const items = extractedContacts.map((c) => ({
          phone: c.phone,
          name: c.name || "",
          group_key: currentGroup.key || "grupo_wa",
          group_name: currentGroup.name || "WhatsApp Grupo",
        }));

        const res = await fetch(`${serverUrl}/api/v1/ingest/whatsapp-contacts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            dry_run: isDryRun,
            items,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          appendLog(
            `Sucesso! Ingestão concluída: ${result.inserted_leads ?? result.items_received ?? items.length} contatos processados (${isDryRun ? "Simulação" : "Gravados no CRM"})`,
            "success"
          );
          alert(
            `Sucesso! ${items.length} contatos foram processados e sincronizados com a Excelência Tour no Waesy CRM!`
          );
        } else {
          const errData = await res.json().catch(() => ({}));
          appendLog(`Falha na ingestão (${res.status}): ${errData.error || "Erro desconhecido"}`, "error");
          alert(`Erro ${res.status}: ${errData.error || "Falha ao enviar contatos."}`);
        }
      } catch (err) {
        appendLog(`Erro de rede ao transmitir contatos: ${err.message}`, "error");
        alert("Erro de conexão com o servidor Waesy.");
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
