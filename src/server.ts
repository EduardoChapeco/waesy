import "./lib/error-capture";

import { consumeLastCapturedError, recordCorrelatedError } from "./lib/error-capture";
import { errorRegistry } from "./lib/telemetry/error-correlator";
import { renderErrorPage } from "./lib/error-page";
import {
  buildAgentApiHeaders,
  buildStructuredApiErrorResponse,
  isProtectedPath,
  prefersMarkdownNegotiation,
  renderAgentFriendly404Markdown,
  renderCanonicalRouteMarkdown,
} from "./lib/agentic/agentic-readiness-engine";

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

      // Resolução de subdomínio corporativo (ex: painel.waesy.com.br ou painel.localhost)
      let effectiveRequest = request;
      try {
        const url = new URL(request.url);
        const host = (request.headers.get("host") || url.host || "").toLowerCase();
        const isPainelSubdomain = host.startsWith("painel.") || host.startsWith("painel-");
        if (isPainelSubdomain && (url.pathname === "/" || url.pathname === "")) {
          const rewrittenUrl = new URL(request.url);
          rewrittenUrl.pathname = "/painel";
          effectiveRequest = new Request(rewrittenUrl.toString(), request);
        }
      } catch {
        effectiveRequest = request;
      }

      const reqUrl = new URL(effectiveRequest.url);
      const pathname = reqUrl.pathname;
      const wantsMarkdown = prefersMarkdownNegotiation(effectiveRequest);
      const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

      if (wantsMarkdown && isProtectedPath(pathname)) {
        return new Response(
          [
            "# 403 Forbidden — Protected Workspace Surface",
            "",
            "This route requires authenticated tenant or civil session privileges and is excluded from public agent indexing.",
            "Consult https://waesy.com.br/llms.txt or https://waesy.com.br/developers for public endpoints.",
          ].join("\n"),
          {
            status: 403,
            headers: {
              "content-type": "text/markdown; charset=utf-8",
              "vary": "Accept",
              "x-robots-tag": "noindex, nofollow",
            },
          },
        );
      }

      if (pathname.startsWith("/__ora-404-probe") && wantsMarkdown) {
        return new Response(renderAgentFriendly404Markdown(pathname, reqUrl.origin), {
          status: 404,
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "vary": "Accept",
            "x-request-id": traceId,
          },
        });
      }

      const FAST_MARKDOWN_ROUTES = new Set([
        "/",
        "/about",
        "/sobre",
        "/contact",
        "/contato",
        "/privacy",
        "/privacidade",
        "/developers",
        "/docs",
      ]);
      const normalizedPath = pathname.replace(/\/+$/, "") || "/";
      if (wantsMarkdown && !isApiRoute && FAST_MARKDOWN_ROUTES.has(normalizedPath)) {
        return new Response(renderCanonicalRouteMarkdown(normalizedPath), {
          status: 200,
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "vary": "Accept",
            "cache-control": "public, max-age=300",
            "x-request-id": traceId,
          },
        });
      }

      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(effectiveRequest, env, ctx);
      const response = await normalizeCatastrophicSsrResponse(rawResponse, traceId);

      if (isApiRoute) {
        const respContentType = (response.headers.get("content-type") || "").toLowerCase();
        if (response.status >= 400 && respContentType.includes("text/html")) {
          return buildStructuredApiErrorResponse({
            status: response.status,
            code: response.status === 404 ? "ENDPOINT_NOT_FOUND" : `HTTP_${response.status}`,
            message:
              response.status === 404
                ? `API endpoint '${pathname}' was not found.`
                : `API request failed with HTTP status ${response.status}.`,
            traceId,
          });
        }

        const apiHeaders = new Headers(response.headers);
        const standardHeaders = buildAgentApiHeaders();
        for (const [k, v] of Object.entries(standardHeaders)) {
          if (!apiHeaders.has(k) || k.toLowerCase() === "vary") {
            apiHeaders.set(k, v);
          }
        }
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: apiHeaders,
        });
      }

      if (wantsMarkdown) {
        if (response.status === 404) {
          return new Response(renderAgentFriendly404Markdown(pathname, reqUrl.origin), {
            status: 404,
            headers: {
              "content-type": "text/markdown; charset=utf-8",
              "vary": "Accept",
              "x-request-id": traceId,
            },
          });
        }
        const respContentType = (response.headers.get("content-type") || "").toLowerCase();
        if (response.status === 200 && respContentType.includes("text/html")) {
          const htmlBody = await response.clone().text();
          const mdBody = renderCanonicalRouteMarkdown(normalizedPath, htmlBody);
          return new Response(mdBody, {
            status: 200,
            headers: {
              "content-type": "text/markdown; charset=utf-8",
              "vary": "Accept",
              "x-request-id": traceId,
            },
          });
        }
      }

      const finalHeaders = new Headers(response.headers);
      const existingVary = finalHeaders.get("vary");
      if (!existingVary) {
        finalHeaders.set("Vary", "Accept");
      } else if (!existingVary.toLowerCase().includes("accept")) {
        finalHeaders.set("Vary", `${existingVary}, Accept`);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: finalHeaders,
      });
    } catch (error) {
      recordCorrelatedError(traceId, error, { source: "worker" });
      console.error(`[WORKER_FATAL_ERROR:${traceId}]`, error);
      const urlObj = new URL(request.url);
      if (urlObj.pathname === "/api" || urlObj.pathname.startsWith("/api/")) {
        return buildStructuredApiErrorResponse({
          status: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected internal error occurred while processing the API request.",
          traceId,
        });
      }
      if (prefersMarkdownNegotiation(request)) {
        return new Response(renderAgentFriendly404Markdown(urlObj.pathname, urlObj.origin), {
          status: 500,
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "vary": "Accept",
            "x-request-id": traceId,
          },
        });
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "vary": "Accept",
          "x-request-id": traceId,
        },
      });
    }
  },
};
