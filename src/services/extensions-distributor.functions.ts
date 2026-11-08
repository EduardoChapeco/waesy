import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assertExtensionDownloadAuthorized,
  buildExtensionZip,
  getExtensionAccessStatus,
  submitExtensionAccessRequest,
  adminListExtensionRequests,
  adminReviewExtensionRequest,
  adminToggleStoreExtensionAuth,
  type ExtensionPackageType,
  type ExtensionAccessStatusDTO,
  type ExtensionRequestItemDTO,
} from "./extensions-distributor.server";

export type {
  ExtensionPackageType,
  ExtensionAccessStatusDTO,
  ExtensionRequestItemDTO,
};

export const ExtensionPackageTypeSchema = z.enum([
  "infotravel_extension",
  "whatsapp_extension",
  "infotravel_miner",
]);

export interface ExtensionPermissionDTO {
  isAuthorized: boolean;
  storeName: string | null;
  isAdminMaster: boolean;
  isExcelenciaTour: boolean;
  reason?: string;
}

/**
 * Consulta se o usuário atual possui autorização para baixar as extensões e scripts operacionais.
 */
export const checkExtensionDownloadPermissionFn = createServerFn({
  method: "GET",
})
  .validator((d: { type?: ExtensionPackageType } | undefined) => d)
  .handler(async ({ data }): Promise<ExtensionPermissionDTO> => {
    try {
      const auth = await assertExtensionDownloadAuthorized(data?.type);
      return {
        isAuthorized: true,
        storeName: auth.storeName,
        isAdminMaster: auth.isAdminMaster,
        isExcelenciaTour: auth.isExcelenciaTour,
      };
    } catch (err: any) {
      return {
        isAuthorized: false,
        storeName: null,
        isAdminMaster: false,
        isExcelenciaTour: false,
        reason: err?.message || "Acesso restrito.",
      };
    }
  });

/**
 * Consulta o status detalhado da loja em relação a uma extensão específica (autorizado, pendente, rejeitado).
 */
export const getExtensionAccessStatusFn = createServerFn({
  method: "GET",
})
  .validator(z.object({ type: ExtensionPackageTypeSchema }))
  .handler(async ({ data }): Promise<ExtensionAccessStatusDTO> => {
    return getExtensionAccessStatus(data.type as ExtensionPackageType);
  });

/**
 * Submete uma solicitação de autorização para o Administrador Master.
 */
export const submitExtensionAccessRequestFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      extensionType: ExtensionPackageTypeSchema,
      requesterName: z.string().min(2, "Nome obrigatório"),
      requesterEmail: z.string().email().optional(),
      justification: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    return submitExtensionAccessRequest(data as any);
  });

/**
 * Lista todas as solicitações de acesso de extensões para o Admin Master.
 */
export const adminListExtensionRequestsFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<ExtensionRequestItemDTO[]> => {
  return adminListExtensionRequests();
});

/**
 * Admin Master avalia (aprova/rejeita) uma solicitação de acesso.
 */
export const adminReviewExtensionRequestFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      requestId: z.string().min(1),
      storeId: z.string().uuid(),
      extensionType: ExtensionPackageTypeSchema,
      status: z.enum(["approved", "rejected"]),
      reviewNotes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    return adminReviewExtensionRequest(data as any);
  });

/**
 * Admin Master concede ou revoga autorização direta para qualquer loja.
 */
export const adminToggleStoreExtensionAuthFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      storeId: z.string().uuid(),
      extensionType: ExtensionPackageTypeSchema,
      authorized: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    return adminToggleStoreExtensionAuth(data as any);
  });

/**
 * Prepara o pacote ZIP da extensão e o devolve codificado em base64 com metadados para download no cliente.
 */
export const downloadExtensionBase64Fn = createServerFn({
  method: "POST",
})
  .validator(z.object({ type: ExtensionPackageTypeSchema }))
  .handler(async ({ data }) => {
    // 1. Barreira de segurança obrigatória
    await assertExtensionDownloadAuthorized(data.type as ExtensionPackageType);

    // 2. Monta o ZIP em memória
    const pkg = await buildExtensionZip(data.type as ExtensionPackageType);

    return {
      filename: pkg.filename,
      contentType: pkg.contentType,
      base64: pkg.buffer.toString("base64"),
      sizeBytes: pkg.buffer.length,
    };
  });
