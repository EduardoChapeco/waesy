import { createFileRoute } from "@tanstack/react-router";
import {
  ExtensionForbiddenError,
  assertExtensionDownloadAuthorized,
  buildExtensionZip,
  type ExtensionPackageType,
} from "@/services/extensions-distributor.server";

export const Route = createFileRoute("/api/v1/extensions/download")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const typeParam = url.searchParams.get("type") as ExtensionPackageType;

        if (
          !typeParam ||
          !["infotravel_extension", "whatsapp_extension", "infotravel_miner"].includes(typeParam)
        ) {
          return Response.json(
            {
              error:
                "Parâmetro 'type' inválido. Tipos permitidos: 'infotravel_extension', 'whatsapp_extension', 'infotravel_miner'.",
            },
            { status: 400 }
          );
        }

        try {
          // 1. Validação estrita de autorização (Excelência Tour SMO, Admin Master ou Whitelist por Loja)
          await assertExtensionDownloadAuthorized(typeParam);

          // 2. Montagem do ZIP
          const pkg = await buildExtensionZip(typeParam);

          return new Response(new Uint8Array(pkg.buffer), {
            status: 200,
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="${pkg.filename}"`,
              "Content-Length": String(pkg.buffer.length),
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
            },
          });
        } catch (err: any) {
          const isForbidden = err instanceof ExtensionForbiddenError || err?.status === 403;
          if (!isForbidden) {
            console.error("[api/v1/extensions/download] Erro interno ao empacotar extensão:", err);
            return Response.json(
              {
                error: err?.message || "Erro interno ao gerar pacote da extensão.",
                can_request: false,
                extension_type: typeParam,
              },
              { status: 500 }
            );
          }
          console.warn("[api/v1/extensions/download] Acesso negado:", err?.message);
          return Response.json(
            {
              error:
                err?.message ||
                "Acesso restrito. Para baixar e utilizar esta extensão, solicite a autorização de uso na Vitrine Waesy Store.",
              can_request: true,
              extension_type: typeParam,
            },
            { status: 403 }
          );
        }
      },
    },
  },
} as never);
