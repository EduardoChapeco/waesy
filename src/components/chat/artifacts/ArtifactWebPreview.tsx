import React, { useMemo, useEffect, useState } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  Eye,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Wrench,
  ExternalLink,
  Rocket,
  Github,
  Cloud,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  publishCopilotWebPageToStoreFn,
  deployCopilotFilesToGitHubFn,
  deployCopilotFilesToVercelFn,
} from "@/services/copilot-deploy.functions";

export interface ArtifactWebPreviewProps {
  title: string;
  html?: string;
  files?: Record<string, string>;
  documentId?: string;
  artifactId?: string;
  storeId?: string;
  onOpenBuilder?: (resolvedDocumentId?: string) => void;
  onRequestFix?: (errorMessage: string) => void;
  className?: string;
}

function buildFallbackHtmlDocument(title: string, files?: Record<string, string>): string {
  if (files) {
    const indexKey = Object.keys(files).find((k) => /index\.html?$/i.test(k));
    if (indexKey && files[indexKey]) return files[indexKey];
    const firstHtmlKey = Object.keys(files).find((k) => /\.html?$/i.test(k));
    if (firstHtmlKey && files[firstHtmlKey]) return files[firstHtmlKey];
  }
  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans p-8">
  <main class="max-w-3xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold tracking-tight">${safeTitle}</h1>
    <p class="text-sm text-slate-300">Estrutura gerada pronta para personalização no editor visual.</p>
  </main>
</body>
</html>`;
}

function injectPreviewErrorHook(rawHtml: string): string {
  const hookScript = `<script>
(function(){
  function sendErr(msg){
    try { window.parent && window.parent.postMessage({ source: "waesy-web-preview", type: "runtime-error", message: String(msg || "Erro desconhecido").slice(0, 240) }, "*"); } catch(e){}
  }
  window.addEventListener("error", function(ev){ sendErr(ev && ev.message ? ev.message : "Erro de execução"); });
  window.addEventListener("unhandledrejection", function(ev){ sendErr(ev && ev.reason ? (ev.reason.message || ev.reason) : "Promise rejeitada"); });
})();
</script>`;
  if (/<head[^>]*>/i.test(rawHtml)) {
    return rawHtml.replace(/<head[^>]*>/i, (m) => `${m}\n${hookScript}`);
  }
  return `${hookScript}\n${rawHtml}`;
}

export function ArtifactWebPreview({
  title,
  html,
  files,
  documentId,
  artifactId,
  storeId,
  onOpenBuilder,
  onRequestFix,
  className,
}: ArtifactWebPreviewProps) {
  const [viewTab, setViewTab] = useState<"preview" | "code">("preview");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublishingWaesy, setIsPublishingWaesy] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedDocId, setPublishedDocId] = useState<string | null>(null);
  const [deployDialog, setDeployDialog] = useState<null | "github" | "vercel">(null);
  const [deployTargetName, setDeployTargetName] = useState(() =>
    (title || "waesy-copilot-site")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "waesy-copilot-site",
  );
  const [isDeployingExternal, setIsDeployingExternal] = useState(false);
  const [externalDeployResult, setExternalDeployResult] = useState<{
    provider: string;
    url: string;
    label: string;
  } | null>(null);

  const fileEntries = useMemo(() => {
    const map: Record<string, string> = { ...(files || {}) };
    const resolvedHtml = html || buildFallbackHtmlDocument(title, files);
    if (!Object.keys(map).some((k) => /\.html?$/i.test(k))) {
      map["index.html"] = resolvedHtml;
    }
    return map;
  }, [files, html, title]);

  const fileNames = useMemo(() => Object.keys(fileEntries), [fileEntries]);
  const [selectedFile, setSelectedFile] = useState<string>(fileNames[0] || "index.html");

  useEffect(() => {
    if (!fileNames.includes(selectedFile)) {
      setSelectedFile(fileNames[0] || "index.html");
    }
  }, [fileNames, selectedFile]);

  const rawHtml = useMemo(
    () => html || buildFallbackHtmlDocument(title, fileEntries),
    [html, title, fileEntries],
  );

  const activeHtml = useMemo(() => injectPreviewErrorHook(rawHtml), [rawHtml]);

  const handlePublishToWaesy = async () => {
    setIsPublishingWaesy(true);
    try {
      const res = await publishCopilotWebPageToStoreFn({
        data: {
          title: title || "Página Copilot",
          html: rawHtml,
          storeId,
          sourceArtifactId: artifactId || documentId,
          files: fileEntries,
          mode: "publish",
        },
      });
      setPublishedDocId(res.documentId ?? null);
      setPublishedUrl(res.publicUrl ?? null);
      toast.success(`Publicado no Waesy em ${res.publicUrl}`);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao publicar página no Waesy.");
    } finally {
      setIsPublishingWaesy(false);
    }
  };

  const handleOpenOmniEditor = async () => {
    if (publishedDocId) {
      if (onOpenBuilder) onOpenBuilder(publishedDocId);
      else window.location.assign(`/workspace/builder/${encodeURIComponent(publishedDocId)}/editor`);
      return;
    }
    setIsPublishingWaesy(true);
    try {
      const res = await publishCopilotWebPageToStoreFn({
        data: {
          title: title || "Página Copilot",
          html: rawHtml,
          storeId,
          sourceArtifactId: artifactId || documentId,
          files: fileEntries,
          mode: "draft",
        },
      });
      setPublishedDocId(res.documentId ?? null);
      if (onOpenBuilder) {
        onOpenBuilder(res.documentId);
      } else {
        window.location.assign(res.editorUrl);
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível abrir o rascunho no OmniEditor.");
    } finally {
      setIsPublishingWaesy(false);
    }
  };

  const handleExternalDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = deployTargetName.trim();
    if (!targetName || !deployDialog) return;

    setIsDeployingExternal(true);
    try {
      if (deployDialog === "github") {
        const res = await deployCopilotFilesToGitHubFn({
          data: {
            repoName: targetName,
            files: fileEntries,
            isPrivate: true,
            branch: "main",
          },
        });
        setExternalDeployResult({
          provider: "GitHub",
          url: res.repoUrl,
          label: `${res.repoFullName} (${res.filesPushed.length} arq.)`,
        });
        toast.success(`Código enviado para ${res.repoFullName}`);
      } else {
        const safeVercelName =
          targetName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") ||
          "waesy-copilot-site";
        const res = await deployCopilotFilesToVercelFn({
          data: {
            projectName: safeVercelName,
            target: "production",
            files: fileEntries,
          },
        });
        setExternalDeployResult({
          provider: "Vercel",
          url: res.url,
          label: `${res.readyState} • ${res.url}`,
        });
        toast.success("Deploy criado na Vercel!");
      }
      setDeployDialog(null);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar para o provedor externo.");
    } finally {
      setIsDeployingExternal(false);
    }
  };

  useEffect(() => {
    setRuntimeError(null);
    const handler = (ev: MessageEvent) => {
      if (ev?.data?.source === "waesy-web-preview" && ev.data?.type === "runtime-error") {
        setRuntimeError(String(ev.data.message || "Erro detectado no preview"));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [activeHtml]);

  const handleCopyCode = () => {
    const content = fileEntries[selectedFile] || activeHtml;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`Código de "${selectedFile}" copiado.`);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadHtml = () => {
    const raw = html || buildFallbackHtmlDocument(title, fileEntries);
    const blob = new Blob([raw], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = (title || "waesy-site").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36);
    a.download = `${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML baixado!");
  };

  const viewportWidthClass =
    viewport === "mobile"
      ? "max-w-sm mx-auto"
      : viewport === "tablet"
        ? "max-w-2xl mx-auto"
        : "w-full";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Barra de Controle: Preview/Código + Viewport */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="inline-flex rounded-xl bg-muted/60 p-1 gap-1">
          <Button
            type="button"
            variant={viewTab === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewTab("preview")}
            className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2"
          >
            <Eye className="size-3.5" />
            <span>Preview</span>
          </Button>
          <Button
            type="button"
            variant={viewTab === "code" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewTab("code")}
            className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2"
          >
            <Code2 className="size-3.5" />
            <span>Código</span>
          </Button>
        </div>

        {viewTab === "preview" && (
          <div className="inline-flex rounded-xl bg-muted/60 p-1 gap-1">
            {(
              [
                { id: "desktop", label: "Desktop", Icon: Monitor },
                { id: "tablet", label: "Tablet", Icon: Tablet },
                { id: "mobile", label: "Mobile", Icon: Smartphone },
              ] as const
            ).map(({ id, label, Icon }) => (
              <Button
                key={id}
                type="button"
                variant={viewport === id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewport(id)}
                aria-label={label}
                className="size-11 min-h-11 min-w-11 p-0 rounded-lg"
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Alerta de Erro em Tempo de Execução com Correção Assistida */}
      {runtimeError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-1" />
            <div className="min-w-0">
              <p className="font-semibold text-destructive">Erro detectado no preview</p>
              <p className="text-muted-foreground break-words">{runtimeError}</p>
            </div>
          </div>
          {onRequestFix && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRequestFix(runtimeError)}
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 shrink-0"
            >
              <Wrench className="size-3.5" />
              <span>Corrigir com IA</span>
            </Button>
          )}
        </div>
      )}

      {/* Área Principal: Iframe Sandbox ou Árvore/Código */}
      {viewTab === "preview" ? (
        <div className="w-full rounded-xl border border-border/60 bg-muted/20 p-2 overflow-hidden">
          <div className={cn("transition-colors duration-200", viewportWidthClass)}>
            <iframe
              title={title}
              srcDoc={activeHtml}
              sandbox="allow-scripts allow-forms allow-modals"
              className="w-full h-96 rounded-lg bg-background border border-border/40"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {fileNames.length === 0 ? (
              <span className="text-xs text-muted-foreground">Nenhum arquivo gerado.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fileNames.map((fname) => (
                  <Button
                    key={fname}
                    type="button"
                    variant={selectedFile === fname ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedFile(fname)}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-lg text-2xs font-mono",
                      selectedFile === fname && "bg-background font-semibold border-primary/40",
                    )}
                  >
                    {fname}
                  </Button>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </Button>
          </div>
          <pre className="max-h-80 overflow-y-auto rounded-lg bg-background p-3 text-2xs font-mono text-foreground border border-border/40 whitespace-pre-wrap break-all">
            {fileEntries[selectedFile] || ""}
          </pre>
        </div>
      )}

      {(publishedUrl || externalDeployResult) && (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="size-3.5 text-emerald-600 shrink-0" />
            <span className="truncate font-medium text-foreground">
              {publishedUrl ? `Publicado no Waesy: ${publishedUrl}` : `${externalDeployResult?.provider}: ${externalDeployResult?.label}`}
            </span>
          </div>
          {(publishedUrl || externalDeployResult?.url) && (
            <a
              href={publishedUrl || externalDeployResult?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md px-1"
            >
              <span>Abrir Link</span>
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {/* Ações Inferiores */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Badge variant="outline" className="text-2xs">
          {fileNames.length} {fileNames.length === 1 ? "arquivo" : "arquivos"}
        </Badge>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isPublishingWaesy}
            onClick={handlePublishToWaesy}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            {isPublishingWaesy ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <Rocket className="size-3.5" />
            )}
            <span>Publicar na Waesy</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeployDialog("github")}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            <Github className="size-3.5" />
            <span>GitHub</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeployDialog("vercel")}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            <Cloud className="size-3.5" />
            <span>Vercel</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadHtml}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Baixar HTML</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPublishingWaesy}
            onClick={handleOpenOmniEditor}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            <ExternalLink className="size-3.5" />
            <span>Abrir no OmniEditor</span>
          </Button>
        </div>
      </div>

      <Dialog open={deployDialog !== null} onOpenChange={(open) => !open && setDeployDialog(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {deployDialog === "github" ? "Enviar Código para GitHub" : "Publicar na Vercel"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {deployDialog === "github"
                ? "Cria ou atualiza os arquivos no repositório usando sua conta conectada em Conectores & MCP."
                : "Dispara um deploy em produção usando o token Vercel salvo no seu cofre criptografado."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExternalDeploySubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                {deployDialog === "github" ? "Nome do Repositório" : "Slug do Projeto Vercel"}
              </label>
              <Input
                value={deployTargetName}
                onChange={(e) => setDeployTargetName(e.target.value)}
                placeholder="ex: landing-oferta-waesy"
                className="h-11 min-h-11 rounded-xl text-xs bg-muted/40 font-mono"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeployDialog(null)}
                className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isDeployingExternal}
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-semibold gap-2"
              >
                {isDeployingExternal && (
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                )}
                <span>{deployDialog === "github" ? "Enviar para GitHub" : "Deploy Vercel"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}