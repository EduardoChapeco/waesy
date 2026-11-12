// Waesy Ingest • WhatsApp Web Service Worker v2.2.0
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["waesyServerUrl", "waesyToken"]);
  await chrome.storage.local.set({
    waesyServerUrl: existing.waesyServerUrl || "https://waesy.com.br",
    waesyToken: existing.waesyToken || "",
    lastSyncAt: null,
  });
  console.log("[Waesy Ingest] Extensão WhatsApp Web pronta.");
});
