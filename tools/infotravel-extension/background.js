// Waesy Sync • Background Service Worker (Manifest V3) v2.2.0

const MAX_SYNC_LOGS = 150;
const MAX_QUEUE_ITEMS = 200;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(
    ["waesyServerUrl", "waesyToken", "autoSyncCloud", "reservasColetadas", "cotacoesRecentes"],
    (existing) => {
      chrome.storage.local.set({
        waesyServerUrl: existing.waesyServerUrl || "https://waesy.com.br",
        waesyToken: existing.waesyToken || "",
        autoSyncCloud: existing.autoSyncCloud !== undefined ? existing.autoSyncCloud : true,
        reservasColetadas: existing.reservasColetadas || [],
        cotacoesRecentes: existing.cotacoesRecentes || [],
        pendingSyncQueue: [],
        syncLogs: [],
        totalPassageiros: 0,
        totalVendas: 0,
        totalComissao: 0,
        isSyncing: false,
        pacingMin: 2,
        pacingMax: 5,
      });
    },
  );
  chrome.alarms.create("waesy_sync_retry", { periodInMinutes: 2 });
  console.log("[Waesy Sync] Extensão v2.2.0 inicializada com sucesso.");
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "waesy_sync_retry") {
    void flushPendingQueue();
  }
});

async function appendPersistedLog(text, logType = "info") {
  try {
    const data = await chrome.storage.local.get(["syncLogs"]);
    const logs = Array.isArray(data.syncLogs) ? data.syncLogs : [];
    const time = new Date().toLocaleTimeString("pt-BR");
    logs.push({ time, text, logType });
    if (logs.length > MAX_SYNC_LOGS) {
      logs.splice(0, logs.length - MAX_SYNC_LOGS);
    }
    await chrome.storage.local.set({ syncLogs: logs });
  } catch {
    // ignore
  }
}

async function enqueuePendingItem(entry) {
  try {
    const data = await chrome.storage.local.get(["pendingSyncQueue"]);
    const queue = Array.isArray(data.pendingSyncQueue) ? data.pendingSyncQueue : [];
    queue.push({ ...entry, queuedAt: new Date().toISOString() });
    if (queue.length > MAX_QUEUE_ITEMS) {
      queue.splice(0, queue.length - MAX_QUEUE_ITEMS);
    }
    await chrome.storage.local.set({ pendingSyncQueue: queue });
  } catch {
    // ignore
  }
}

async function postJsonAuthenticated(path, body) {
  const data = await chrome.storage.local.get(["waesyServerUrl", "waesyToken"]);
  const serverUrl = (data.waesyServerUrl || "https://waesy.com.br").replace(/\/+$/, "");
  const token = (data.waesyToken || "").trim();

  if (!token) {
    return { ok: false, skipped: true, status: 401, error: "Token de ingestão não configurado." };
  }

  try {
    const res = await fetch(`${serverUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json, error: json?.error };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || "Erro de rede" };
  }
}

async function flushPendingQueue() {
  const data = await chrome.storage.local.get(["pendingSyncQueue", "waesyToken"]);
  const queue = Array.isArray(data.pendingSyncQueue) ? data.pendingSyncQueue : [];
  if (queue.length === 0 || !(data.waesyToken || "").trim()) return { flushed: 0, remaining: queue.length };

  const remaining = [];
  let flushed = 0;

  for (const entry of queue) {
    const res = await postJsonAuthenticated(entry.path, entry.body);
    if (res.ok) {
      flushed++;
    } else if (res.status === 0 || res.status >= 500) {
      remaining.push(entry);
    }
  }

  await chrome.storage.local.set({ pendingSyncQueue: remaining });
  if (flushed > 0) {
    await appendPersistedLog(`Fila offline sincronizada: ${flushed} item(ns) enviados.`, "success");
  }
  return { flushed, remaining: remaining.length };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SYNC_LOG") {
    void appendPersistedLog(message.text, message.logType || "info");
    return false;
  }

  if (message.type === "NEW_RESERVATION_DATA") {
    handleNewReservation(message.data)
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: err?.message }));
    return true;
  }

  if (message.type === "QUOTE_CAPTURED") {
    handleQuoteCaptured(message.payload)
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: err?.message }));
    return true;
  }

  if (message.type === "SYNC_RESERVATIONS_CLOUD") {
    syncAllStoredReservationsToCloud(message.reservations)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err?.message || "Falha ao sincronizar" }));
    return true;
  }

  if (message.type === "FLUSH_SYNC_QUEUE") {
    flushPendingQueue()
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: err?.message }));
    return true;
  }
});

async function handleQuoteCaptured(q) {
  try {
    const data = await chrome.storage.local.get(["cotacoesRecentes", "autoSyncCloud", "waesyToken"]);
    const list = data.cotacoesRecentes || [];
    const key = `${q.operatorSlug || "generic"}:${q.sourcePage}:${q.destinationCity}:${q.startDate}:${q.totalCents}`;
    const existsIdx = list.findIndex(
      (item) =>
        `${item.operatorSlug || "generic"}:${item.sourcePage}:${item.destinationCity}:${item.startDate}:${item.totalCents}` ===
        key,
    );
    if (existsIdx >= 0) {
      list[existsIdx] = q;
    } else {
      list.unshift(q);
      if (list.length > 50) list.pop();
    }
    await chrome.storage.local.set({ cotacoesRecentes: list });

    if (data.autoSyncCloud === false || !(data.waesyToken || "").trim()) {
      return { stored: true, synced: false };
    }

    const payload = {
      operatorSlug: q.operatorSlug || "generic",
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

    const res = await postJsonAuthenticated("/api/v1/ingest/infotravel-quotes", payload);
    if (!res.ok && !res.skipped) {
      await enqueuePendingItem({ path: "/api/v1/ingest/infotravel-quotes", body: payload });
      await appendPersistedLog(
        `Cotação ${q.destinationCity} enfileirada para retry (${res.error || "HTTP " + res.status}).`,
        "warn",
      );
      return { stored: true, synced: false, queued: true };
    }

    if (res.ok) {
      await appendPersistedLog(
        `Cotação ${q.destinationCity} enviada ao Radar (${res.data?.opportunitiesGenerated || 0} oportunidades).`,
        "success",
      );
    }
    return { stored: true, synced: res.ok, data: res.data };
  } catch (err) {
    return { stored: false, synced: false, error: err?.message };
  }
}

function buildReservationPayloadItem(r) {
  return {
    id: String(r.id),
    operatorSlug: r.operatorSlug || "generic",
    status: r.status || "Confirmada",
    criacao: r.criacao || "",
    checkIn: r.checkIn || "",
    checkOut: r.checkOut || "",
    valorTotal: r.valorTotal || "0,00",
    taxas: r.taxas || "0,00",
    impostos: r.impostos || "0,00",
    comissao: r.comissao || "0,00",
    contato: r.contato || "",
    email: r.email || "",
    telefone: r.telefone || "",
    hotel: r.hotel || r.destino || "",
    destino: r.destino || r.hotel || "",
    localizador: r.localizador || String(r.id),
    acomodacao: r.acomodacao || "Standard",
    formaPagto: r.formaPagto || "Faturado",
    statusPagto: r.statusPagto || "Aprovado",
    scoreConfianca: Number(r.scoreConfianca) || 75,
    bancoEmissor: r.bancoEmissor || "Operadora Direto",
    parcelamento: r.parcelamento || "1x",
    passageiros: (r.passageiros || []).map((p) => ({
      nome: p.nome || "Passageiro",
      tipo: p.tipo || "ADT",
      birthDate: p.nasc || p.birthDate || "",
      cpf: p.cpf || "",
      titular: Boolean(p.titular),
    })),
  };
}

async function syncAllStoredReservationsToCloud(explicitList) {
  const data = await chrome.storage.local.get(["reservasColetadas", "waesyToken"]);
  if (!(data.waesyToken || "").trim()) {
    return { ok: false, error: "Configure o Token de Ingestão na aba Conexão Waesy." };
  }
  const list = Array.isArray(explicitList) ? explicitList : data.reservasColetadas || [];
  if (list.length === 0) {
    return { ok: true, totalSent: 0, newProcessed: 0, reconciledTripsCount: 0 };
  }

  let newProcessed = 0;
  let reconciledTripsCount = 0;
  let totalPax = 0;
  const CHUNK = 40;

  for (let i = 0; i < list.length; i += CHUNK) {
    const slice = list.slice(i, i + CHUNK).map(buildReservationPayloadItem);
    const operatorCode = slice[0]?.operatorSlug || "generic";
    const res = await postJsonAuthenticated("/api/v1/ingest/infotravel-reservations", {
      operatorCode,
      sourceKind: "browser_extension",
      items: slice,
    });
    if (!res.ok) {
      return { ok: false, error: res.error || `HTTP ${res.status}` };
    }
    newProcessed += res.data?.newProcessed || 0;
    reconciledTripsCount += res.data?.reconciledTripsCount || 0;
    totalPax += res.data?.totalPax || 0;
  }

  return {
    ok: true,
    totalSent: list.length,
    newProcessed,
    reconciledTripsCount,
    totalPax,
  };
}

async function handleNewReservation(reservation) {
  const data = await chrome.storage.local.get([
    "reservasColetadas",
    "totalPassageiros",
    "totalVendas",
    "totalComissao",
    "autoSyncCloud",
    "waesyToken",
  ]);

  const list = data.reservasColetadas || [];
  const existingIdx = list.findIndex((r) => r.id === reservation.id);

  if (existingIdx >= 0) {
    list[existingIdx] = reservation;
  } else {
    list.push(reservation);
  }

  let paxCount = 0;
  let sumVendas = 0;
  let sumComissao = 0;

  list.forEach((r) => {
    paxCount += r.passageiros && r.passageiros.length > 0 ? r.passageiros.length : 1;
    const v = parseFloat(String(r.valorTotal || "0").replace(/\./g, "").replace(",", ".")) || 0;
    const c = parseFloat(String(r.comissao || "0").replace(/\./g, "").replace(",", ".")) || 0;
    sumVendas += v;
    sumComissao += c;
  });

  await chrome.storage.local.set({
    reservasColetadas: list,
    totalPassageiros: paxCount,
    totalVendas: sumVendas,
    totalComissao: sumComissao,
  });

  try {
    chrome.runtime.sendMessage({ type: "RESERVATIONS_UPDATED" }).catch(() => {});
  } catch {
    // popup fechado
  }

  let cloudSynced = false;
  if (data.autoSyncCloud !== false && (data.waesyToken || "").trim()) {
    const cloudPayload = {
      operatorCode: reservation.operatorSlug || "generic",
      sourceKind: "browser_extension",
      items: [buildReservationPayloadItem(reservation)],
    };
    const cloudRes = await postJsonAuthenticated("/api/v1/ingest/infotravel-reservations", cloudPayload);
    if (cloudRes.ok) {
      cloudSynced = true;
    } else if (!cloudRes.skipped) {
      await enqueuePendingItem({
        path: "/api/v1/ingest/infotravel-reservations",
        body: cloudPayload,
      });
    }
  }

  try {
    fetch("http://127.0.0.1:3333/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resId: reservation.id,
        operatorSlug: reservation.operatorSlug,
        status: reservation.status,
        criacao: reservation.criacao,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        contato: reservation.contato,
        email: reservation.email,
        telefone: reservation.telefone,
        hotel: reservation.hotel || reservation.destino,
        acomodacao: reservation.acomodacao,
        totalCompra: reservation.valorTotal,
        taxas: reservation.taxas,
        impostos: reservation.impostos,
        formaPagto: reservation.formaPagto,
        statusPagto: reservation.statusPagto,
        scoreConfianca: reservation.scoreConfianca,
        bancoEmissor: reservation.bancoEmissor,
        parcelamento: reservation.parcelamento,
        comissaoTotal: reservation.comissao,
        passageiros: reservation.passageiros,
      }),
    }).catch(() => {});
  } catch {
    // Silencioso
  }

  return { cloudSynced };
}
