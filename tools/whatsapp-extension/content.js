// Waesy Ingest • WhatsApp Web Content Script v2.1.0
console.log("[Waesy Ingest] Content script ativo no WhatsApp Web.");

function cleanPhone(raw) {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  // Se for celular brasileiro sem DDI 55 (ex: 49999998888 ou 4999998888)
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  }
  return digits;
}

function getActiveChatData() {
  const header = document.querySelector("header");
  if (!header) return { chatName: "", isGroup: false };

  // Busca título da conversa
  const titleEl =
    header.querySelector('[data-testid="conversation-info-header"] [title]') ||
    header.querySelector("span[title]") ||
    header.querySelector(".x1i10hfl span");
  const chatName = titleEl ? titleEl.getAttribute("title") || titleEl.innerText : "Conversa WhatsApp";

  // Busca subtítulo para identificar se é grupo (ex: lista de nomes/números)
  const subtitleEl = header.querySelector("span.x1f6kntn, span[title*=',']");
  const subText = subtitleEl ? subtitleEl.innerText : "";
  const isGroup = subText.includes(",") || subText.includes("participantes") || subText.includes("você");

  return {
    chatName: chatName.trim(),
    chatKey: chatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    isGroup,
    subText,
  };
}

function extractParticipants() {
  const chatData = getActiveChatData();
  const contactsMap = new Map();

  // 1. Extração a partir do painel lateral de participantes do grupo (se aberto)
  const drawer =
    document.querySelector('[data-testid="group-info-drawer"]') ||
    document.querySelector('div[role="region"]') ||
    document.querySelector("aside");

  if (drawer) {
    const listItems = drawer.querySelectorAll('div[role="listitem"]');
    listItems.forEach((item) => {
      const text = item.innerText || "";
      const phoneMatch = text.match(/\+?\d[\d\s\-\(\)]{8,20}\d/);
      if (phoneMatch) {
        const phone = cleanPhone(phoneMatch[0]);
        if (phone.length >= 10) {
          const lines = text.split("\n").filter((l) => l.trim().length > 0);
          const name = lines[0] && !lines[0].includes("+") ? lines[0].trim() : "";
          if (!contactsMap.has(phone)) {
            contactsMap.set(phone, { phone, name });
          }
        }
      }
    });
  }

  // 2. Extração a partir do cabeçalho da conversa (subtítulo com participantes)
  if (chatData.subText && chatData.subText.includes(",")) {
    const parts = chatData.subText.split(",");
    parts.forEach((p) => {
      const trimmed = p.trim();
      const phoneMatch = trimmed.match(/\+?\d[\d\s\-\(\)]{8,20}\d/);
      if (phoneMatch) {
        const phone = cleanPhone(phoneMatch[0]);
        if (phone.length >= 10 && !contactsMap.has(phone)) {
          contactsMap.set(phone, { phone, name: "" });
        }
      } else if (trimmed && !trimmed.toLowerCase().includes("você") && trimmed.length > 2) {
        // Nome de contato salvo sem número direto no subtítulo
        const pseudoKey = "name_" + trimmed.toLowerCase().replace(/\s+/g, "_");
        if (!contactsMap.has(pseudoKey)) {
          // Mantém se tivermos ao menos a intenção
        }
      }
    });
  }

  // 3. Varredura adicional nas mensagens visíveis do grupo
  const messageRows = document.querySelectorAll('div[data-testid="msg-container"]');
  messageRows.forEach((row) => {
    const authorEl = row.querySelector("span[aria-label]") || row.querySelector("span.color-");
    if (authorEl) {
      const authorText = authorEl.innerText || authorEl.getAttribute("aria-label") || "";
      const phoneMatch = authorText.match(/\+?\d[\d\s\-\(\)]{8,20}\d/);
      if (phoneMatch) {
        const phone = cleanPhone(phoneMatch[0]);
        if (phone.length >= 10 && !contactsMap.has(phone)) {
          contactsMap.set(phone, { phone, name: "" });
        }
      }
    }
  });

  return {
    groupName: chatData.chatName,
    groupKey: chatData.chatKey,
    contacts: Array.from(contactsMap.values()),
  };
}

// Listener de mensagens do popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_CHAT_INFO") {
    sendResponse(getActiveChatData());
    return true;
  }

  if (message.action === "EXTRACT_GROUP_CONTACTS") {
    const result = extractParticipants();
    sendResponse(result);
    return true;
  }
});
