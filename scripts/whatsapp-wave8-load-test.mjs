#!/usr/bin/env node
import { createHmac, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

const target = process.env.WAVE8_TARGET_URL;
const appSecret = process.env.WAVE8_APP_SECRET;
const total = Math.min(5000, Math.max(1, Number(process.env.WAVE8_REQUESTS || 100)));
const concurrency = Math.min(100, Math.max(1, Number(process.env.WAVE8_CONCURRENCY || 10)));
const allowMutation = process.env.WAVE8_ALLOW_MUTATION === "true";
const output = process.env.WAVE8_OUTPUT || "wave8-load-result.json";

if (!target || !appSecret) throw new Error("WAVE8_TARGET_URL e WAVE8_APP_SECRET são obrigatórios; use somente uma conexão de teste.");
if (!allowMutation) throw new Error("Proteção ativa: defina WAVE8_ALLOW_MUTATION=true para autorizar requests sintéticos no endpoint informado.");
if (!/^https?:\/\/localhost(?::\d+)?\//.test(target) && process.env.WAVE8_ALLOW_NONLOCAL !== "true") throw new Error("Por segurança, o alvo deve ser localhost. Para ambiente controlado, defina WAVE8_ALLOW_NONLOCAL=true.");

function payload(index) {
  const id = `wave8-${randomUUID()}-${index}`;
  return { object: "whatsapp_business_account", entry: [{ id: "wave8-test", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: "wave8-test-phone" }, contacts: [{ profile: { name: "Wave8 synthetic" }, wa_id: "5511999000000" }], messages: [{ from: "5511999000000", id, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: `wave8-load-${index}` } }] } }] }] };
}

async function one(index) {
  const body = JSON.stringify(payload(index));
  const started = performance.now();
  try {
    const response = await fetch(target, { method: "POST", headers: { "content-type": "application/json", "x-hub-signature-256": `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}` }, body });
    return { index, status: response.status, ok: response.ok, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return { index, status: 0, ok: false, latencyMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) };
  }
}

const startedAt = new Date().toISOString();
const results = [];
let cursor = 0;
async function worker() { while (cursor < total) { const index = cursor++; results.push(await one(index)); } }
await Promise.all(Array.from({ length: concurrency }, worker));
const latencies = results.map((item) => item.latencyMs).sort((a, b) => a - b);
const p95 = latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)] || 0;
const report = { testType: "load", target, startedAt, finishedAt: new Date().toISOString(), requests: total, concurrency, acceptedHttp: results.filter((item) => item.ok).length, failedHttp: results.filter((item) => !item.ok).length, p95LatencyMs: p95, minLatencyMs: latencies[0] || 0, maxLatencyMs: latencies.at(-1) || 0, statuses: Object.fromEntries(Object.entries(Object.groupBy(results, (item) => String(item.status))).map(([status, items]) => [status, items.length])) };
await writeFile(output, `${JSON.stringify({ report, samples: results }, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
