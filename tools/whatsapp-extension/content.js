// Waesy Ingest • WhatsApp Web Content Script v2.2.0
(() => {
  if (window.__waesyIngestContentLoaded) return;
  window.__waesyIngestContentLoaded = true;

  console.log("[Waesy Ingest] Content script ativo no WhatsApp Web.");

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function cleanPhone(raw) {
    if (!raw) return "";
    let digits = String(raw).replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      digits = "55" + digits;
    }
    return digits;
  }

  function addContact(contactsMap, rawPhone, name) {
    const phone = cleanPhone(rawPhone);
    if (phone.length < 10 || phone.length > 15) return;
    const cleanName = String(name || "").trim();
    const existing = contactsMap.get(phone);
    if (!existing || (!existing.name && cleanName)) {
      contactsMap.set(phone, { phone, name: cleanName || existing?.name || "" });
    }
  }

  function extractFromContainer(container, contactsMap) {
    if (!container) return;

    // Extrai por atributos data-id com JID (@c.us ou @s.whatsapp.net)
    const jidNodes = container.querySelectorAll("[data-id]");
    jidNodes.forEach((node) => {
      const dataId = node.getAttribute("data-id") || "";
      const jidMatch = dataId.match(/(\d{10,15})@(?:c\.us|s\.whatsapp\.net)/i);
      if (jidMatch) {
        const lines = (node.innerText || "").split("\n").map((l) => l.trim()).filter(Boolean);
        const maybeName = lines.find((l) => !/^\+?\d[\d\s\-\(\)]{6,}$/.test(l) && !/admin/i.test(l)) || "";
        addContact(contactsMap, jidMatch[1], maybeName);
      }
    });

    // Extrai de itens de lista visíveis (drawer ou modal 'Ver todos')
    const listItems = container.querySelectorAll('div[role="listitem"], div[role="button"], li');
    listItems.forEach((item) => {
      const text = item.innerText || "";
      const titleSpans = Array.from(item.querySelectorAll("span[title]"))
        .map((s) => s.getAttribute("title") || "")
        .filter(Boolean);

      const combinedTexts = [text, ...titleSpans];
      for (const candidate of combinedTexts) {
        const matches = candidate.match(/\+?\d[\d\s\-\(\)]{8,20}\d/g) || [];
        for (const m of matches) {
          const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
          const candidateName =
            lines.find(
              (l) =>
                !l.includes("+") &&
                !/^\d[\d\s\-\(\)]+$/.test(l) &&
                !/^(Admin|Você|You)$/i.test(l)
            ) || "";
          addContact(contactsMap, m, candidateName);
        }
      }
    });
  }

  function findScrollableContainer(root) {
    if (!root) return null;
    if (root.scrollHeight > root.clientHeight + 20) return root;
    const candidates = Array.from(root.querySelectorAll("div"));
    let best = null;
    let maxHeight = 0;
    for (const el of candidates) {
      if (el.scrollHeight > el.clientHeight + 20 && el.scrollHeight > maxHeight) {
        maxHeight = el.scrollHeight;
        best = el;
      }
    }
    return best || root;
  }

  function getActiveChatData() {
    const main = document.getElementById("main") || document;
    const header = main.querySelector("header") || document.querySelector("#main header");
    if (!header) return { chatName: "", chatKey: "geral", isGroup: false, subText: "" };

    const titleEl =
      header.querySelector('[data-testid="conversation-info-header"] [title]') ||
      header.querySelector("span[title]") ||
      header.querySelector('div[role="button"] span[dir="auto"]');
    const chatName = titleEl ? titleEl.getAttribute("title") || titleEl.innerText : "Conversa WhatsApp";

    const subtitleEl = header.querySelector("span[title*=',']") || header.querySelector("span.x1f6kntn");
    const subText = subtitleEl ? subtitleEl.getAttribute("title") || subtitleEl.innerText || "" : "";
    const lowerSub = subText.toLowerCase();
    const isGroup =
      subText.includes(",") ||
      lowerSub.includes("participante") ||
      lowerSub.includes("membro") ||
      lowerSub.includes("você");

    return {
      chatName: chatName.trim(),
      chatKey: chatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") || "geral",
      isGroup,
      subText,
    };
  }

  async function extractParticipants() {
    const chatData = getActiveChatData();
    const contactsMap = new Map();

    // 1. Modal de "Ver todos os participantes" (prioritario para grupos grandes) ou Drawer lateral
    const modal = document.querySelector('div[role="dialog"]');
    const drawer =
      document.querySelector('[data-testid="group-info-drawer"]') ||
      document.querySelector('div[role="region"]') ||
      document.querySelector("aside");

    const containers = [modal, drawer].filter(Boolean);
    for (const root of containers) {
      extractFromContainer(root, contactsMap);
      const scroller = findScrollableContainer(root);
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 20) {
        const originalTop = scroller.scrollTop;
        let stagnantRounds = 0;
        let prevCount = contactsMap.size;
        const maxSteps = 35;

        for (let step = 0; step < maxSteps; step++) {
          const nextTop = Math.min(
            scroller.scrollTop + Math.max(260, Math.floor(scroller.clientHeight * 0.75)),
            scroller.scrollHeight
          );
          scroller.scrollTop = nextTop;
          await sleep(160);
          extractFromContainer(root, contactsMap);

          if (contactsMap.size === prevCount) {
            stagnantRounds++;
          } else {
            stagnantRounds = 0;
            prevCount = contactsMap.size;
          }

          const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8;
          if (atBottom && stagnantRounds >= 2) break;
          if (stagnantRounds >= 5) break;
        }

        scroller.scrollTop = originalTop;
      }
    }

    // 2. Subtitulo do cabecalho
    if (chatData.subText && chatData.subText.includes(",")) {
      const parts = chatData.subText.split(",");
      parts.forEach((p) => {
        const phoneMatch = p.trim().match(/\+?\d[\d\s\-\(\)]{8,20}\d/);
        if (phoneMatch) {
          addContact(contactsMap, phoneMatch[0], "");
        }
      });
    }

    // 3. Mensagens visiveis e participantes citados no chat ativo
    const mainArea = document.getElementById("main") || document;
    const messageRows = mainArea.querySelectorAll('div[data-testid="msg-container"], [data-pre-plain-text]');
    messageRows.forEach((row) => {
      const prePlain = row.getAttribute("data-pre-plain-text") || "";
      const authorEl = row.querySelector("span[aria-label]") || row.querySelector("span[title]") || row;
      const authorText = [
        prePlain,
        authorEl ? authorEl.getAttribute("aria-label") || authorEl.getAttribute("title") || authorEl.innerText : "",
      ].join(" ");

      const phoneMatches = authorText.match(/\+?\d[\d\s\-\(\)]{8,20}\d/g) || [];
      phoneMatches.forEach((m) => addContact(contactsMap, m, ""));
    });

    return {
      groupName: chatData.chatName,
      groupKey: chatData.chatKey,
      isGroup: chatData.isGroup,
      contacts: Array.from(contactsMap.values()),
    };
  }

  // Listener de mensagens do popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "GET_CHAT_INFO") {
      sendResponse(getActiveChatData());
      return true;
    }

    if (message.action === "EXTRACT_GROUP_CONTACTS") {
      extractParticipants()
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ groupName: "", groupKey: "geral", contacts: [], error: err.message }));
      return true;
    }
  });
})();
