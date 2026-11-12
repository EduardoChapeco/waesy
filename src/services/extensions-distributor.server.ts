import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import { createZipArchive, type ZipFileEntry } from "@/lib/zip-packager";
import { EMBEDDED_EXTENSION_BUNDLES } from "@/generated/extensions-bundle.server";
import { isExcelenciaTourStore } from "@/services/whatsapp-group-ingest.server";

export class ExtensionForbiddenError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ExtensionForbiddenError";
  }
}

export type ExtensionPackageType =
  | "infotravel_extension"
  | "whatsapp_extension"
  | "infotravel_miner";

export interface ExtensionDownloadAuthResult {
  authorized: boolean;
  storeId: string;
  storeName: string | null;
  isAdminMaster: boolean;
  isExcelenciaTour: boolean;
  isWhitelistedStore: boolean;
}

export interface ExtensionAccessStatusDTO {
  authorized: boolean;
  status: "authorized" | "pending" | "rejected" | "not_requested";
  storeId: string;
  storeName: string | null;
  isAdminMaster: boolean;
  isExcelenciaTour: boolean;
  extensionType: ExtensionPackageType;
  pendingRequest?: {
    id: string;
    createdAt: string;
    justification: string | null;
    status: string;
    reviewNotes?: string | null;
  } | null;
}

export interface ExtensionRequestItemDTO {
  id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_city: string | null;
  extension_type: ExtensionPackageType;
  requester_name: string;
  requester_email: string | null;
  justification: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

/**
 * Valida se o usuário autenticado possui permissão para baixar as extensões e scripts operacionais.
 * Regra:
 * 1. Admin Master -> Acesso total.
 * 2. Excelência Tour São Miguel do Oeste -> Agência parceira padrão autorizada.
 * 3. Loja com autorização explícita em settings.authorized_extensions ou solicitação aprovada.
 */
export async function assertExtensionDownloadAuthorized(
  packageType?: ExtensionPackageType
): Promise<ExtensionDownloadAuthResult> {
  const staff = await requireStaff();
  const identity = await getServerIdentity();
  const supabase = getServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, city, settings")
    .eq("id", staff.store_id)
    .maybeSingle();

  const isAdminMaster = Boolean(
    identity.isPlatformAdmin ||
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    (identity.role as string) === "admin_master" ||
    (staff.role as string) === "platform_admin" ||
    (staff.role as string) === "master" ||
    (staff.role as string) === "admin_master"
  );

  const isExcelenciaTour = isExcelenciaTourStore(store);

  // Verificação de autorização explícita por loja (armazenada em settings.authorized_extensions)
  const storeSettings = (store?.settings || {}) as Record<string, any>;
  const authorizedList = Array.isArray(storeSettings.authorized_extensions)
    ? (storeSettings.authorized_extensions as string[])
    : [];

  const isWhitelistedBySettings = Boolean(
    authorizedList.includes("*") || (packageType && authorizedList.includes(packageType)) || (!packageType && authorizedList.length > 0)
  );

  let isApprovedByTable = false;
  if (!isAdminMaster && !isExcelenciaTour && !isWhitelistedBySettings && packageType) {
    try {
      const { data: req, error: reqErr } = await supabase
        .from("extension_access_requests")
        .select("id, status")
        .eq("store_id", staff.store_id)
        .eq("extension_type", packageType)
        .eq("status", "approved")
        .limit(1)
      .maybeSingle();
      if (reqErr) throw reqErr;

      if (req?.status === "approved") {
        isApprovedByTable = true;
      }
    } catch {
      // Ignora erro se tabela não existir
    }
  }

  const isAuthorized = isAdminMaster || isExcelenciaTour || isWhitelistedBySettings || isApprovedByTable;

  if (!isAuthorized) {
    throw new ExtensionForbiddenError(
      "Acesso restrito. Para baixar e utilizar esta extensão, solicite a autorização de uso na Vitrine Waesy Store."
    );
  }

  return {
    authorized: true,
    storeId: staff.store_id,
    storeName: store?.name || null,
    isAdminMaster,
    isExcelenciaTour,
    isWhitelistedStore: isWhitelistedBySettings || isApprovedByTable,
  };
}

/**
 * Consulta o status de acesso e histórico de solicitação da loja para uma extensão.
 */
export async function getExtensionAccessStatus(
  packageType: ExtensionPackageType
): Promise<ExtensionAccessStatusDTO> {
  const staff = await requireStaff();
  const identity = await getServerIdentity();
  const supabase = getServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, city, settings")
    .eq("id", staff.store_id)
    .maybeSingle();

  const isAdminMaster = Boolean(
    identity.isPlatformAdmin ||
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    (identity.role as string) === "admin_master"
  );

  const isExcelenciaTour = isExcelenciaTourStore(store);

  const storeSettings = (store?.settings || {}) as Record<string, any>;
  const authorizedList = Array.isArray(storeSettings.authorized_extensions)
    ? (storeSettings.authorized_extensions as string[])
    : [];

  const isWhitelisted = authorizedList.includes("*") || authorizedList.includes(packageType);

  if (isAdminMaster || isExcelenciaTour || isWhitelisted) {
    return {
      authorized: true,
      status: "authorized",
      storeId: staff.store_id,
      storeName: store?.name || null,
      isAdminMaster,
      isExcelenciaTour,
      extensionType: packageType,
      pendingRequest: null,
    };
  }

  // Busca solicitação na tabela
  let pendingRequest: any = null;
  try {
    const { data: req, error: reqErr } = await supabase
      .from("extension_access_requests")
      .select("id, created_at, justification, status, review_notes")
      .eq("store_id", staff.store_id)
      .eq("extension_type", packageType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reqErr) throw reqErr;

    if (req) {
      pendingRequest = {
        id: req.id,
        createdAt: req.created_at,
        justification: req.justification,
        status: req.status,
        reviewNotes: req.review_notes,
      };
    }
  } catch {
    // Fallback: busca em storeSettings.extension_access_requests
    const fallbackList = Array.isArray(storeSettings.extension_access_requests)
      ? storeSettings.extension_access_requests
      : [];
    const found = fallbackList.find((r: any) => r.extension_type === packageType);
    if (found) {
      pendingRequest = {
        id: found.id || "local",
        createdAt: found.created_at || new Date().toISOString(),
        justification: found.justification || null,
        status: found.status || "pending",
        reviewNotes: found.review_notes || null,
      };
    }
  }

  if (pendingRequest?.status === "approved") {
    return {
      authorized: true,
      status: "authorized",
      storeId: staff.store_id,
      storeName: store?.name || null,
      isAdminMaster,
      isExcelenciaTour,
      extensionType: packageType,
      pendingRequest,
    };
  }

  if (pendingRequest?.status === "pending") {
    return {
      authorized: false,
      status: "pending",
      storeId: staff.store_id,
      storeName: store?.name || null,
      isAdminMaster,
      isExcelenciaTour,
      extensionType: packageType,
      pendingRequest,
    };
  }

  if (pendingRequest?.status === "rejected") {
    return {
      authorized: false,
      status: "rejected",
      storeId: staff.store_id,
      storeName: store?.name || null,
      isAdminMaster,
      isExcelenciaTour,
      extensionType: packageType,
      pendingRequest,
    };
  }

  return {
    authorized: false,
    status: "not_requested",
    storeId: staff.store_id,
    storeName: store?.name || null,
    isAdminMaster,
    isExcelenciaTour,
    extensionType: packageType,
    pendingRequest: null,
  };
}

/**
 * Registra a solicitação de autorização da loja para uso de uma extensão.
 */
export async function submitExtensionAccessRequest(input: {
  extensionType: ExtensionPackageType;
  requesterName: string;
  requesterEmail?: string;
  justification?: string;
}): Promise<{ success: boolean; id: string }> {
  const staff = await requireStaff();
  const identity = await getServerIdentity();
  const supabase = getServerClient();

  const reqId = crypto.randomUUID();
  const payload = {
    id: reqId,
    store_id: staff.store_id,
    extension_type: input.extensionType,
    requester_user_id: identity.id,
    requester_name: input.requesterName.trim() || identity.name || "Operador",
    requester_email: input.requesterEmail?.trim() || identity.email || null,
    justification: input.justification?.trim() || "Necessidade operacional de agência parceira.",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { error: insertErr } = await supabase.from("extension_access_requests").insert(payload);
    if (insertErr) {
      console.warn("[extensions-distributor] Inserção em tabela falhou, gravando em store.settings:", insertErr.message);
    }
  } catch (err) {
    console.warn("[extensions-distributor] Inserção em tabela falhou, gravando em store.settings:", err);
  }

  // Grava também defensivamente em store.settings
  try {
    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", staff.store_id)
      .maybeSingle();
    const settings = (store?.settings || {}) as Record<string, any>;
    const existingRequests = Array.isArray(settings.extension_access_requests)
      ? settings.extension_access_requests.filter((r: any) => r.extension_type !== input.extensionType)
      : [];

    existingRequests.push(payload);
    await supabase
      .from("stores")
      .update({
        settings: {
          ...settings,
          extension_access_requests: existingRequests,
        },
      })
      .eq("id", staff.store_id);
  } catch (err) {
    console.error("[extensions-distributor] Falha ao gravar fallback de solicitação em store.settings:", err);
  }

  return { success: true, id: reqId };
}

/**
 * Lista todas as solicitações de extensão para o Admin Master.
 */
export async function adminListExtensionRequests(): Promise<ExtensionRequestItemDTO[]> {
  const identity = await getServerIdentity();
  const isAdminMaster = Boolean(
    identity.isPlatformAdmin ||
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    (identity.role as string) === "admin_master"
  );

  if (!isAdminMaster) {
    throw new Error("Acesso restrito ao Administrador Master.");
  }

  const supabase = getServerClient();
  let items: ExtensionRequestItemDTO[] = [];

  try {
    const { data, error } = await supabase
      .from("extension_access_requests")
      .select(`
        id,
        store_id,
        extension_type,
        requester_name,
        requester_email,
        justification,
        status,
        reviewed_at,
        review_notes,
        created_at,
        stores:store_id (name, slug, city)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      items = data.map((r: any) => ({
        id: r.id,
        store_id: r.store_id,
        store_name: r.stores?.name || "Loja Não Identificada",
        store_slug: r.stores?.slug || "",
        store_city: r.stores?.city || null,
        extension_type: r.extension_type as ExtensionPackageType,
        requester_name: r.requester_name,
        requester_email: r.requester_email,
        justification: r.justification,
        status: r.status,
        reviewed_at: r.reviewed_at,
        review_notes: r.review_notes,
        created_at: r.created_at,
      }));
    }
  } catch (err) {
    console.warn("[extensions-distributor] Erro ao buscar de extension_access_requests:", err);
  }

  // Se a tabela estiver vazia ou indisponível, faz fallback buscando em stores.settings
  if (items.length === 0) {
    try {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, slug, city, settings")
        .limit(100);

      for (const st of stores || []) {
        const sSettings = (st.settings || {}) as Record<string, any>;
        const sReqs = Array.isArray(sSettings.extension_access_requests)
          ? sSettings.extension_access_requests
          : [];
        for (const sr of sReqs) {
          items.push({
            id: sr.id || `${st.id}-${sr.extension_type}`,
            store_id: st.id,
            store_name: st.name,
            store_slug: st.slug,
            store_city: st.city,
            extension_type: sr.extension_type,
            requester_name: sr.requester_name || "Operador",
            requester_email: sr.requester_email || null,
            justification: sr.justification || null,
            status: sr.status || "pending",
            reviewed_at: sr.reviewed_at || null,
            review_notes: sr.review_notes || null,
            created_at: sr.created_at || new Date().toISOString(),
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return items;
}

/**
 * Avalia (aprova ou rejeita) uma solicitação de acesso à extensão.
 */
async function syncExtensionFeatureGrantsForStore(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string,
  authorizedExtensions: string[],
  actorId?: string | null,
) {
  const hasWhatsapp =
    authorizedExtensions.includes("*") || authorizedExtensions.includes("whatsapp_extension");
  const hasInfotravel =
    authorizedExtensions.includes("*") ||
    authorizedExtensions.includes("infotravel_extension") ||
    authorizedExtensions.includes("infotravel_miner");

  const now = new Date().toISOString();
  const grants = [
    {
      store_id: storeId,
      feature_key: "whatsapp_group_ingest",
      enabled: hasWhatsapp,
      granted_at: now,
      granted_by: actorId || null,
    },
    {
      store_id: storeId,
      feature_key: "infotravel_sync",
      enabled: hasInfotravel,
      granted_at: now,
      granted_by: actorId || null,
    },
  ];

  try {
    await supabase
      .from("workspace_feature_grants")
      .upsert(grants, { onConflict: "store_id,feature_key" });
  } catch (err) {
    console.warn("[extensions-distributor] Falha ao sincronizar workspace_feature_grants:", err);
  }
}

export async function adminReviewExtensionRequest(input: {
  requestId: string;
  storeId: string;
  extensionType: ExtensionPackageType;
  status: "approved" | "rejected";
  reviewNotes?: string;
}): Promise<{ success: boolean }> {
  const identity = await getServerIdentity();
  const isAdminMaster = Boolean(
    identity.isPlatformAdmin ||
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    (identity.role as string) === "admin_master"
  );

  if (!isAdminMaster) {
    throw new Error("Acesso restrito ao Administrador Master.");
  }

  const supabase = getServerClient();
  const now = new Date().toISOString();

  // 1. Atualiza tabela de solicitações
  try {
    await supabase
      .from("extension_access_requests")
      .update({
        status: input.status,
        reviewed_by: identity.id,
        reviewed_at: now,
        review_notes: input.reviewNotes?.trim() || null,
        updated_at: now,
      })
      .eq("id", input.requestId);
  } catch (err) {
    console.warn("[extensions-distributor] Update na tabela extension_access_requests falhou:", err);
  }

  // 2. Se aprovado, adiciona a extensão em stores.settings.authorized_extensions
  try {
    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", input.storeId)
      .maybeSingle();
    const settings = (store?.settings || {}) as Record<string, any>;
    let authorizedList: string[] = Array.isArray(settings.authorized_extensions)
      ? [...settings.authorized_extensions]
      : [];

    if (input.status === "approved") {
      if (!authorizedList.includes(input.extensionType)) {
        authorizedList.push(input.extensionType);
      }
    } else {
      authorizedList = authorizedList.filter((e) => e !== input.extensionType);
    }

    // Atualiza status também na lista de fallback em settings
    const existingReqs = Array.isArray(settings.extension_access_requests)
      ? settings.extension_access_requests.map((r: any) =>
          r.id === input.requestId || r.extension_type === input.extensionType
            ? { ...r, status: input.status, reviewed_at: now, review_notes: input.reviewNotes || null }
            : r
        )
      : [];

    await supabase
      .from("stores")
      .update({
        settings: {
          ...settings,
          authorized_extensions: authorizedList,
          extension_access_requests: existingReqs,
        },
      })
      .eq("id", input.storeId);

    await syncExtensionFeatureGrantsForStore(supabase, input.storeId, authorizedList, identity.id);
  } catch (err) {
    console.error("[extensions-distributor] Falha ao atualizar store.settings:", err);
  }

  return { success: true };
}

/**
 * Concede ou revoga autorização direta para qualquer loja sem precisar de solicitação prévia.
 */
export async function adminToggleStoreExtensionAuth(input: {
  storeId: string;
  extensionType: ExtensionPackageType;
  authorized: boolean;
}): Promise<{ success: boolean; authorizedExtensions: string[] }> {
  const identity = await getServerIdentity();
  const isAdminMaster = Boolean(
    identity.isPlatformAdmin ||
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    (identity.role as string) === "admin_master"
  );

  if (!isAdminMaster) {
    throw new Error("Acesso restrito ao Administrador Master.");
  }

  const supabase = getServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", input.storeId)
    .single();

  const settings = (store?.settings || {}) as Record<string, any>;
  let authorizedList: string[] = Array.isArray(settings.authorized_extensions)
    ? [...settings.authorized_extensions]
    : [];

  if (input.authorized) {
    if (!authorizedList.includes(input.extensionType)) {
      authorizedList.push(input.extensionType);
    }
  } else {
    authorizedList = authorizedList.filter((e) => e !== input.extensionType);
  }

  await supabase
    .from("stores")
    .update({
      settings: {
        ...settings,
        authorized_extensions: authorizedList,
      },
    })
    .eq("id", input.storeId);

  await syncExtensionFeatureGrantsForStore(supabase, input.storeId, authorizedList, identity.id);

  return { success: true, authorizedExtensions: authorizedList };
}

/**
 * Lê recursivamente uma pasta no disco e monta a lista de entradas para o zip.
 */
function readDirectoryEntries(baseDir: string, currentDir = ""): ZipFileEntry[] {
  const dirPath = join(baseDir, currentDir);
  if (!existsSync(dirPath)) return [];

  const entries: ZipFileEntry[] = [];
  const items = readdirSync(dirPath);

  for (const item of items) {
    // Ignora artefatos de build, sessões temporárias e caches
    if (
      item === "node_modules" ||
      item === ".git" ||
      item === ".chrome-session" ||
      item === "output" ||
      item.endsWith(".log") ||
      item === "dist" ||
      item === ".DS_Store" ||
      item === "Thumbs.db"
    ) {
      continue;
    }

    const itemPath = join(dirPath, item);
    const relativePath = currentDir ? `${currentDir}/${item}` : item;
    const stat = statSync(itemPath);

    if (stat.isDirectory()) {
      entries.push(...readDirectoryEntries(baseDir, relativePath));
    } else {
      const content = readFileSync(itemPath);
      const isExecutable = item.endsWith(".bat") || item.endsWith(".sh") || item.endsWith(".mjs");
      entries.push({
        path: relativePath,
        content,
        isExecutable,
      });
    }
  }

  return entries;
}

/**
 * Gera o pacote ZIP (.zip) para a extensão ou scripts solicitados.
 */
export async function buildExtensionZip(type: ExtensionPackageType): Promise<{
  filename: string;
  buffer: Buffer;
  contentType: string;
}> {
  let targetDir = "";
  let filename = "";

  if (type === "infotravel_extension") {
    targetDir = join(process.cwd(), "tools", "infotravel-extension");
    filename = "waesy-sync-infotravel-v2.2.zip";
  } else if (type === "whatsapp_extension") {
    targetDir = join(process.cwd(), "tools", "whatsapp-extension");
    filename = "waesy-ingest-whatsapp-v2.2.zip";
  } else if (type === "infotravel_miner") {
    targetDir = join(process.cwd(), "tools", "infotravel-miner");
    filename = "waesy-miner-infotravel-scripts.zip";
  } else {
    throw new Error(`Tipo de extensão desconhecido: ${type}`);
  }

  const embedded = EMBEDDED_EXTENSION_BUNDLES[type];
  let entries: ZipFileEntry[] = Array.isArray(embedded) && embedded.length > 0
    ? embedded.map((entry) => ({
        path: entry.path,
        content: Buffer.from(entry.base64, "base64"),
        isExecutable: entry.isExecutable,
      }))
    : readDirectoryEntries(targetDir);

  if (entries.length === 0) {
    throw new Error(`Diretório ou bundle de extensão não encontrado ou vazio: ${type}`);
  }

  const buffer = createZipArchive(entries);

  return {
    filename,
    buffer,
    contentType: "application/zip",
  };
}
