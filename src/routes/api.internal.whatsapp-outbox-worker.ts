import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { runWhatsAppOutboxWorker } from "@/services/whatsapp-outbox.worker";

function authorized(request: Request): boolean {
  const expected = process.env.WHATSAPP_WORKER_TOKEN;
  const received = request.headers.get("x-waesy-worker-token") || "";
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/internal/whatsapp-outbox-worker")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const input = await request.json().catch(() => ({}));
          const result = await runWhatsAppOutboxWorker({
            batchSize: Number(input?.batch_size) || 25,
            leaseSeconds: Number(input?.lease_seconds) || 300,
            workerId: request.headers.get("x-waesy-worker-id") || undefined,
          });
          return Response.json({ success: true, ...result });
        } catch (error) {
          console.error("[whatsapp-outbox-worker] execution failure", error);
          return Response.json({ error: "Worker execution failed" }, { status: 500 });
        }
      },
    },
  },
} as never);
