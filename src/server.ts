import "./lib/error-capture";

import { consumeLastCapturedError, recordCorrelatedError } from "./lib/error-capture";
import { errorRegistry } from "./lib/telemetry/error-correlator";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response, traceId: string): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const originalError = consumeLastCapturedError(traceId) ?? new Error(`h3 swallowed SSR error [${traceId}]: ${body}`);
  console.error(`[SSR_CATASTROPHIC_ERROR:${traceId}]`, originalError);

  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-request-id": traceId,
    },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const traceId = errorRegistry.extractTraceId(request);

    try {
      // Expose Cloudflare environment to global scope for TanStack Start SSR
      if (typeof globalThis !== "undefined") {
        (globalThis as any).__env__ = env;
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, traceId);
    } catch (error) {
      recordCorrelatedError(traceId, error, { source: "worker" });
      console.error(`[WORKER_FATAL_ERROR:${traceId}]`, error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-request-id": traceId,
        },
      });
    }
  },
};
