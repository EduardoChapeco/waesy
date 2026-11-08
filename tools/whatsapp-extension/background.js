// Waesy Ingest • WhatsApp Web Service Worker v2.1.0
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    waesyServerUrl: "https://waesy.com.br",
    waesyToken: "",
    lastSyncAt: null,
  });
  console.log("[Waesy Ingest] Extensão WhatsApp Web instalada com sucesso.");
});
