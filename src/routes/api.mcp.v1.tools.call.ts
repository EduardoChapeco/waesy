import { createFileRoute } from "@tanstack/react-router";
import { executeMcpToolCall, McpToolCallRequestSchema } from "@/services/mcp-server.functions";

export const Route = createFileRoute("/api/mcp/v1/tools/call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = McpToolCallRequestSchema.safeParse(body);

          if (!parsed.success) {
            return new Response(
              JSON.stringify(
                {
                  error: "Invalid MCP Tool Call Payload",
                  details: parsed.error.issues,
                },
                null,
                2
              ),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          const result = await executeMcpToolCall(parsed.data);
          const isError = result.status === "error";

          let httpStatus = 200;
          if (isError) {
            const errorText = result.content?.[0]?.text || "";
            if (errorText.includes("403 Forbidden") || errorText.includes("multi-tenant")) {
              httpStatus = 403;
            } else if (errorText.includes("401 Unauthorized")) {
              httpStatus = 401;
            } else {
              httpStatus = 400;
            }
          }

          return new Response(JSON.stringify(result, null, 2), {
            status: httpStatus,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
            },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify(
              {
                status: "error",
                message: err.message || "Erro interno ao despachar ferramenta MCP.",
              },
              null,
              2
            ),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
          },
        });
      },
    },
  },
});
