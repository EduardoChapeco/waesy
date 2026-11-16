/**
 * copilot-deploy.functions.ts — Publicação Direta e Deploy Real de Páginas/Projetos do Copilot
 * Zero-Trust: exige autenticação, autorização multi-tenant estrita (Waesy) ou token pessoal cifrado
 * no cofre `ai_connectors` (GitHub / Vercel). Sem simulação de sucesso.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

const PublishWebPageInputSchema = z.object({
  title: z.string().min(1).max(160),
  html: z.string().min(20).max(500_000),
  slug: z.string().min(2).max(100).optional(),
  storeId: z.string().uuid().optional(),
  sourceArtifactId: z.string().max(120).optional(),
  files: z.record(z.string()).optional(),
  mode: z.enum(["publish", "draft"]).default("publish"),
});

const DeployGitHubInputSchema = z.object({
  repoName: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, "Nome do repositório inválido"),
  description: z.string().max(240).optional(),
  isPrivate: z.boolean().default(true),
  branch: z.string().min(1).max(80).default("main"),
  files: z.record(z.string()).refine((f) => Object.keys(f).length > 0, {
    message: "Informe ao menos um arquivo para enviar ao GitHub.",
  }),
});

const DeployVercelInputSchema = z.object({
  projectName: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Nome do projeto Vercel deve conter apenas letras minúsculas, números e hífens"),
  target: z.enum(["production", "preview"]).default("production"),
  files: z.record(z.string()).refine((f) => Object.keys(f).length > 0, {
    message: "Informe ao menos um arquivo para publicar na Vercel.",
  }),
});

function sanitizeSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function runPublishCopilotWebPage(
  input: z.infer<typeof PublishWebPageInputSchema>,
) {
  const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
  const authCtx = await authorizeBuilderStoreContext({
    requestedStoreId: input.storeId || null,
    allowPlatformRootForGlobalAdmin: true,
  });

  const db = getServerClient();
  const baseSlug = sanitizeSlug(input.slug || input.title) || `copilot-page`;
  const mode = input.mode || "publish";

  let existingDoc: any = null;
  if (input.sourceArtifactId) {
    const { data: rows } = await db
      .from("experience_documents")
      .select("id, slug, settings")
      .eq("store_id", authCtx.storeId)
      .contains("settings", { source_artifact_id: input.sourceArtifactId })
      .limit(1);
    if (Array.isArray(rows) && rows.length > 0) {
      existingDoc = rows[0];
    }
  }

  let finalSlug = existingDoc?.slug || baseSlug;
  if (!existingDoc) {
    const { data: slugConflict } = await db
      .from("experience_documents")
      .select("id")
      .eq("store_id", authCtx.storeId)
      .eq("slug", finalSlug)
      .maybeSingle();
    if (slugConflict?.id) {
      finalSlug = `${baseSlug.slice(0, 48)}-${Date.now().toString(36).slice(-5)}`;
    }
  }

  const { createEmptyOmniPage } = await import("@/types/omni-builder");
  const omniDoc = createEmptyOmniPage(finalSlug, input.title, "landing_page");
  omniDoc.blocks = [
    {
      id: `hero_${Date.now()}`,
      type: "hero_minimal_split",
      data: {
        title: input.title,
        subtitle: "Publicação criada via Waesy Copilot",
        ctaLabel: "Explorar",
        ctaUrl: `#`,
      },
      config: {
        title: input.title,
        subtitle: "Publicação criada via Waesy Copilot",
      },
    } as any,
  ];

  const mergedSettings: Record<string, any> = {
    ...(existingDoc?.settings || {}),
    template_id: "copilot_html",
    source_artifact_id: input.sourceArtifactId || null,
    copilot_draft_html: input.html,
    copilot_files: input.files || { "index.html": input.html },
    omni_page_draft: omniDoc,
    ...(mode === "publish"
      ? {
          copilot_published_html: input.html,
          omni_page_published: omniDoc,
          published_at: new Date().toISOString(),
        }
      : {}),
  };

  let documentId = existingDoc?.id as string | undefined;

  if (documentId) {
    const { error: updErr } = await db
      .from("experience_documents")
      .update({
        title: input.title,
        is_active: mode === "publish" ? true : existingDoc?.is_active ?? false,
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("store_id", authCtx.storeId);
    if (updErr) {
      throw new Error(`Falha ao atualizar documento no Builder: ${updErr.message}`);
    }
  } else {
    const { data: created, error: insErr } = await db
      .from("experience_documents")
      .insert({
        store_id: authCtx.storeId,
        title: input.title,
        slug: finalSlug,
        document_type: "landing_page",
        is_active: mode === "publish",
        settings: mergedSettings,
      })
      .select("id")
      .single();
    if (insErr || !created?.id) {
      throw new Error(`Falha ao criar página no Waesy: ${insErr?.message || "erro"}`);
    }
    documentId = created.id;
  }

  const { data: latestVer } = await db
    .from("experience_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVer = Number(latestVer?.version_number || 0) + 1;
  await db.from("experience_versions").insert({
    document_id: documentId,
    version_number: nextVer,
    status: mode === "publish" ? "published" : "draft",
    document_snapshot: omniDoc,
  });

  return {
    success: true,
    documentId,
    storeId: authCtx.storeId,
    slug: finalSlug,
    mode,
    publicUrl: mode === "publish" ? `/paginas/${finalSlug}` : null,
    editorUrl: `/workspace/builder/${documentId}/editor`,
  };
}

export const publishCopilotWebPageToStoreFn = createServerFn({ method: "POST" })
  .validator(PublishWebPageInputSchema)
  .handler(async ({ data }) => {
    return runPublishCopilotWebPage(data);
  });

export async function runDeployFilesToGitHubForUser(
  userId: string,
  input: z.infer<typeof DeployGitHubInputSchema>,
) {
  const { getDecryptedConnectorCredentialsForUser, extractConnectorToken } = await import(
    "./ai-connectors-secrets.server"
  );
  const record = await getDecryptedConnectorCredentialsForUser(userId, "github");
  const token = record ? extractConnectorToken(record.credentials) : "";

  if (!token) {
    throw new Error(
      "Conector GitHub não conectado ou sem Personal Access Token válido. Configure em Conectores & MCP.",
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Waesy-Copilot-Agent/1.0",
    "Content-Type": "application/json",
  };

  const meRes = await fetch("https://api.github.com/user", { headers });
  if (!meRes.ok) {
    throw new Error(`Token GitHub rejeitado (${meRes.status}). Reconecte sua conta em Conectores.`);
  }
  const meData = (await meRes.json()) as { login?: string };
  const owner = meData?.login;
  if (!owner) {
    throw new Error("Não foi possível identificar o proprietário da conta GitHub.");
  }

  const repoFullName = `${owner}/${input.repoName}`;
  const repoCheckRes = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });

  if (repoCheckRes.status === 404) {
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: input.repoName,
        description: input.description || "Projeto gerado pelo Waesy Copilot",
        private: input.isPrivate,
        auto_init: true,
      }),
    });
    if (!createRes.ok) {
      const errBody = await createRes.text().catch(() => "");
      throw new Error(`Falha ao criar repositório GitHub (${createRes.status}): ${errBody.slice(0, 180)}`);
    }
  } else if (!repoCheckRes.ok) {
    throw new Error(`Falha ao consultar repositório GitHub (${repoCheckRes.status}).`);
  }

  const branch = input.branch || "main";
  const filesPushed: string[] = [];

  for (const [rawPath, content] of Object.entries(input.files)) {
    const cleanPath = rawPath.replace(/^\/+/, "");
    if (!cleanPath || cleanPath.includes("..")) continue;

    let existingSha: string | undefined;
    const existingRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(cleanPath)}?ref=${encodeURIComponent(branch)}`,
      { headers },
    );
    if (existingRes.ok) {
      const existingJson = (await existingRes.json()) as { sha?: string };
      existingSha = existingJson?.sha;
    }

    const encodedContent = Buffer.from(String(content ?? ""), "utf8").toString("base64");
    const putRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(cleanPath)}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `chore(copilot): publicar ${cleanPath}`,
          content: encodedContent,
          branch,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      },
    );

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      throw new Error(`Erro ao enviar ${cleanPath} para GitHub (${putRes.status}): ${errText.slice(0, 160)}`);
    }
    filesPushed.push(cleanPath);
  }

  return {
    success: true,
    repoFullName,
    repoUrl: `https://github.com/${repoFullName}`,
    branch,
    filesPushed,
  };
}

export const deployCopilotFilesToGitHubFn = createServerFn({ method: "POST" })
  .validator(DeployGitHubInputSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Autenticação obrigatória para enviar código ao GitHub.");
    }
    return runDeployFilesToGitHubForUser(identity.id, data);
  });

export async function runDeployFilesToVercelForUser(
  userId: string,
  input: z.infer<typeof DeployVercelInputSchema>,
) {
  const { getDecryptedConnectorCredentialsForUser, extractConnectorToken } = await import(
    "./ai-connectors-secrets.server"
  );
  const record = await getDecryptedConnectorCredentialsForUser(userId, "vercel");
  const token = record ? extractConnectorToken(record.credentials) : "";

  if (!token) {
    throw new Error(
      "Conector Vercel não conectado ou sem API Token válido. Configure em Conectores & MCP.",
    );
  }

  const normalizedFiles = Object.entries(input.files)
    .filter(([p]) => Boolean(p && !p.includes("..")))
    .map(([file, data]) => ({
      file: file.replace(/^\/+/, ""),
      data: String(data ?? ""),
    }));

  const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.projectName,
      target: input.target === "production" ? "production" : undefined,
      files: normalizedFiles,
      projectSettings: {
        framework: null,
      },
    }),
  });

  if (!deployRes.ok) {
    const errText = await deployRes.text().catch(() => "");
    throw new Error(`Falha ao publicar na Vercel (${deployRes.status}): ${errText.slice(0, 180)}`);
  }

  const deployed = (await deployRes.json()) as {
    id?: string;
    url?: string;
    inspectorUrl?: string;
    readyState?: string;
  };

  return {
    success: true,
    deploymentId: deployed.id || "",
    url: deployed.url ? `https://${deployed.url}` : "",
    inspectorUrl: deployed.inspectorUrl || "",
    readyState: deployed.readyState || "INITIALIZING",
  };
}

export const deployCopilotFilesToVercelFn = createServerFn({ method: "POST" })
  .validator(DeployVercelInputSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Autenticação obrigatória para publicar na Vercel.");
    }
    return runDeployFilesToVercelForUser(identity.id, data);
  });
