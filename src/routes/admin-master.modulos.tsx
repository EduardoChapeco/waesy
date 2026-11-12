import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Layers,
  Power,
  Edit2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Tag,
  Sliders,
  Eye,
  EyeOff,
  Download,
  Building2,
  Check,
  X,
  UserX,
  Clock,
  ShieldAlert,
  Search as SearchIcon,
  Store as StoreIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adminListPlatformModules, adminTogglePlatformModule, adminUpdatePlatformModule, type PlatformModuleDTO } from "@/services/modules.functions";
import {
  adminListExtensionRequestsFn,
  adminReviewExtensionRequestFn,
  adminToggleStoreExtensionAuthFn,
  type ExtensionRequestItemDTO,
  type ExtensionPackageType,
} from "@/services/extensions-distributor.functions";
import { getPlatformStoresList } from "@/services/master.functions";
import { ExtensionWebStoreModal } from "@/components/extensions/ExtensionWebStoreModal";
import { toggleStoreModuleAddon } from "@/services/store-modules.functions";
import {
  COMMERCIAL_MODULE_CATALOG,
  STORE_PLANS,
  type CommercialModuleId,
} from "@/lib/architecture/module-plan-governance";

export const Route = createFileRoute("/admin-master/modulos")({
  head: () => ({ meta: [{ title: "Governança Dinâmica de Módulos | Admin Master" }] }),
  loader: async () => {
    try {
      const [modules, requests, stores] = await Promise.all([
        adminListPlatformModules(),
        adminListExtensionRequestsFn().catch(() => []),
        getPlatformStoresList().catch(() => []),
      ]);
      return {
        modules: modules || [],
        requests: (requests || []) as ExtensionRequestItemDTO[],
        stores: stores || [],
      };
    } catch (err: any) {
      console.error("[admin-master.modulos] Loader error:", err);
      return { modules: [], requests: [], stores: [] };
    }
  },
  component: AdminMasterModulosPage,
});

function AdminMasterModulosPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const initialModules = loaderData.modules || [];
  const initialRequests = loaderData.requests || [];
  const initialStores = loaderData.stores || [];
  const router = useRouter();

  const [modules, setModules] = useState<PlatformModuleDTO[]>(initialModules);
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequestItemDTO[]>(initialRequests);
  const [platformStores, setPlatformStores] = useState<any[]>(initialStores);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [togglingStoreExtension, setTogglingStoreExtension] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState("");
  const [showAllStores, setShowAllStores] = useState(false);
  const [storeModalType, setStoreModalType] = useState<ExtensionPackageType | null>(null);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<PlatformModuleDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [editOrderIndex, setEditOrderIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [categoryTab, setCategoryTab] = useState<"all" | "store_operation" | "public_discovery" | "ai_intelligence" | "browser_extensions" | "store_plans">("all");
  const [togglingStoreModule, setTogglingStoreModule] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const refreshExtensionData = async () => {
    setIsLoadingRequests(true);
    try {
      const [reqs, stores] = await Promise.all([
        adminListExtensionRequestsFn(),
        getPlatformStoresList(),
      ]);
      setExtensionRequests(reqs || []);
      setPlatformStores(stores || []);
      toast.success("Fila de solicitações e lojas atualizadas.");
    } catch (err: any) {
      toast.error("Falha ao atualizar dados: " + (err?.message || "Erro desconhecido"));
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleReviewRequest = async (
    req: ExtensionRequestItemDTO,
    status: "approved" | "rejected"
  ) => {
    setProcessingRequestId(req.id);
    try {
      await adminReviewExtensionRequestFn({
        data: {
          requestId: req.id,
          storeId: req.store_id,
          extensionType: req.extension_type,
          status,
          reviewNotes: status === "approved" ? "Acesso liberado pelo Admin Master" : "Solicitação rejeitada pelo Admin Master",
        },
      });
      toast.success(
        status === "approved"
          ? `Acesso à extensão liberado com sucesso para ${req.store_name}!`
          : `Solicitação da loja ${req.store_name} rejeitada.`
      );
      setExtensionRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status, reviewed_at: new Date().toISOString() } : r))
      );
      setPlatformStores((prev) =>
        prev.map((s) => {
          if (s.id !== req.store_id) return s;
          const current: string[] = s.settings?.authorized_extensions || [];
          const updated =
            status === "approved"
              ? Array.from(new Set([...current, req.extension_type]))
              : current.filter((t) => t !== req.extension_type);
          return {
            ...s,
            settings: {
              ...(s.settings || {}),
              authorized_extensions: updated,
            },
          };
        })
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar solicitação.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleToggleStoreExtension = async (
    storeId: string,
    extensionType: ExtensionPackageType,
    currentlyAuthorized: boolean
  ) => {
    const nextAuthorized = !currentlyAuthorized;
    const key = `${storeId}_${extensionType}`;
    setTogglingStoreExtension(key);
    try {
      await adminToggleStoreExtensionAuthFn({
        data: {
          storeId,
          extensionType,
          authorized: nextAuthorized,
        },
      });
      toast.success(
        nextAuthorized
          ? "Extensão liberada com sucesso para a loja."
          : "Acesso à extensão revogado para a loja."
      );
      setPlatformStores((prev) =>
        prev.map((s) => {
          if (s.id !== storeId) return s;
          const current: string[] = s.settings?.authorized_extensions || [];
          const updated = nextAuthorized
            ? Array.from(new Set([...current, extensionType]))
            : current.filter((t) => t !== extensionType);
          return {
            ...s,
            settings: {
              ...(s.settings || {}),
              authorized_extensions: updated,
            },
          };
        })
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar autorização.");
    } finally {
      setTogglingStoreExtension(null);
    }
  };

  const handleToggleStoreModule = async (
    storeId: string,
    moduleId: CommercialModuleId,
    currentlyActive: boolean
  ) => {
    const nextActive = !currentlyActive;
    const key = `${storeId}_${moduleId}`;
    setTogglingStoreModule(key);
    try {
      await toggleStoreModuleAddon({
        data: {
          storeId,
          moduleId,
          active: nextActive,
        },
      });
      toast.success(
        nextActive
          ? "Módulo adicional ativado com sucesso para a loja."
          : "Módulo adicional desativado para a loja."
      );
      setPlatformStores((prev) =>
        prev.map((s) => {
          if (s.id !== storeId) return s;
          const current: string[] = s.settings?.active_modules || [];
          const updated = nextActive
            ? Array.from(new Set([...current, moduleId]))
            : current.filter((m) => m !== moduleId);
          return {
            ...s,
            settings: {
              ...(s.settings || {}),
              active_modules: updated,
            },
          };
        })
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar módulo da loja.");
    } finally {
      setTogglingStoreModule(null);
    }
  };

  const isExcelenciaTourRecord = (store: any) => {
    const slug = String(store?.slug || "").toLowerCase().trim();
    const name = String(store?.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return (
      slug === "excelencia-tour-smo" ||
      slug === "excelencia-tour" ||
      name.includes("excelencia tour")
    );
  };

  const isStoreExtensionAuthorized = (store: any, type: ExtensionPackageType) => {
    if (isExcelenciaTourRecord(store)) {
      return true;
    }
    const authorized: string[] = store.settings?.authorized_extensions || [];
    return authorized.includes(type);
  };

  const isStoreExempt = (store: any) => {
    return isExcelenciaTourRecord(store);
  };

  const formatRequestDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getExtensionLabel = (type: ExtensionPackageType) => {
    switch (type) {
      case "infotravel_extension":
        return "Waesy Sync • Infotravel & GDS";
      case "whatsapp_extension":
        return "Waesy Ingest • WhatsApp Web";
      case "infotravel_miner":
        return "Waesy Miner • Extrator Autônomo";
      default:
        return type;
    }
  };

  const handleDownloadExtension = async (type: "infotravel_extension" | "whatsapp_extension" | "infotravel_miner") => {
    setDownloadingType(type);
    try {
      const res = await fetch(`/api/v1/extensions/download?type=${type}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Acesso restrito para download desta extensão.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      let filename =
        type === "infotravel_extension"
          ? "waesy-sync-infotravel-v2.1.zip"
          : type === "whatsapp_extension"
          ? "waesy-ingest-whatsapp-v2.1.zip"
          : "waesy-miner-infotravel-scripts.zip";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch?.[1]) filename = filenameMatch[1];

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Download de "${filename}" concluído com sucesso!`);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao realizar download.");
    } finally {
      setDownloadingType(null);
    }
  };

  const activeCount = modules.filter((m) => m.enabled).length;
  const disabledCount = modules.length - activeCount;

  const storeOpCount = modules.filter((m) => m.category === "store_operation").length;
  const publicCount = modules.filter((m) => m.category === "public_discovery").length;
  const aiCount = modules.filter((m) => m.category === "ai_intelligence").length;

  const pendingRequestsCount = extensionRequests.filter((r) => r.status === "pending").length;
  const filteredPlatformStores = platformStores.filter((s: any) => {
    if (!storeSearch.trim()) return true;
    const q = storeSearch.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.slug || "").toLowerCase().includes(q);
  });

  const filteredModules = modules.filter((m) => {
    if (categoryTab !== "all" && m.category !== categoryTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchKey = m.module_key.toLowerCase().includes(q);
      const matchDesc = (m.description || "").toLowerCase().includes(q);
      const matchBadge = (m.badge || "").toLowerCase().includes(q);
      if (!matchName && !matchKey && !matchDesc && !matchBadge) return false;
    }
    return true;
  });

  const handleToggle = async (module: PlatformModuleDTO) => {
    const nextState = !module.enabled;
    setTogglingKey(module.module_key);

    try {
      await adminTogglePlatformModule({
        data: {
          moduleKey: module.module_key,
          enabled: nextState,
        },
      });

      setModules((prev) =>
        prev.map((m) =>
          m.module_key === module.module_key ? { ...m, enabled: nextState } : m,
        ),
      );

      toast.success(
        `Módulo "${module.name}" ${nextState ? "ativado" : "desativado"} com sucesso!`,
      );
      router.invalidate();
    } catch (err: any) {
      console.error("Erro ao alternar módulo:", err);
      toast.error(err.message || "Falha ao alterar o status do módulo.");
    } finally {
      setTogglingKey(null);
    }
  };

  const openEditModal = (module: PlatformModuleDTO) => {
    setEditingModule(module);
    setEditName(module.name);
    setEditDescription(module.description || "");
    setEditBadge(module.badge || "");
    setEditOrderIndex(module.order_index || 0);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;

    setIsSaving(true);
    try {
      await adminUpdatePlatformModule({
        data: {
          moduleKey: editingModule.module_key,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          badge: editBadge.trim() || undefined,
          orderIndex: Number(editOrderIndex),
        },
      });

      setModules((prev) =>
        prev.map((m) =>
          m.module_key === editingModule.module_key
            ? {
                ...m,
                name: editName.trim(),
                description: editDescription.trim() || null,
                badge: editBadge.trim() || null,
                order_index: Number(editOrderIndex),
              }
            : m,
        ),
      );

      toast.success(`Módulo "${editName}" atualizado com sucesso!`);
      setEditDialogOpen(false);
      router.invalidate();
    } catch (err: any) {
      console.error("Erro ao salvar módulo:", err);
      toast.error(err.message || "Falha ao salvar configurações do módulo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 px-0 sm:px-4 md:px-0">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="size-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Governança Dinâmica de Módulos
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Ligue ou desligue qualquer recurso da plataforma Waesy em tempo real com controle transacional e persistência no banco.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono px-3 py-1">
            <span className="inline-block size-2 rounded-full bg-success mr-2" />
            {activeCount} Ativos
          </Badge>
          {disabledCount > 0 && (
            <Badge variant="secondary" className="text-xs font-mono px-3 py-1 text-muted-foreground">
              <span className="inline-block size-2 rounded-full bg-muted-foreground mr-2" />
              {disabledCount} Pausados
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Barra de Filtros & Abas ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryTab("all")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "all"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Todos ({modules.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("store_operation")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "store_operation"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Operação de Loja ({storeOpCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("public_discovery")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "public_discovery"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Vitrines Públicas ({publicCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("ai_intelligence")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "ai_intelligence"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Inteligência & IA ({aiCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("browser_extensions")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "browser_extensions"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Extensões & Conectores ({3}{pendingRequestsCount > 0 ? ` • ${pendingRequestsCount} pendente${pendingRequestsCount > 1 ? "s" : ""}` : ""})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("store_plans")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "store_plans"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Planos & Verticais
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar módulo por nome, chave ou badge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs rounded-lg bg-card"
          />
        </div>
      </div>

      {/* ─── Visão de Extensões de Navegador ─────────────────────────── */}
      {categoryTab === "browser_extensions" && (
        <div className="space-y-8">
          {/* Grid dos 3 Pacotes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Extensão 1: Infotravel */}
            <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-2xs font-semibold">
                    Manifest V3
                  </Badge>
                  <Badge variant="secondary" className="text-3xs font-normal">
                    v2.1.0
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  Waesy Sync • Infotravel & GDS
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sincronizador bilateral para Orinter, FRT, Schultz e Incomum Viagens. Captura reservas, passageiros, faturas e cotações em tempo real.
                </p>
                <div className="pt-1 text-2xs font-mono text-muted-foreground">
                  <span>Destino: Chrome / Edge / Brave</span>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadingType === "infotravel_extension"}
                  onClick={() => handleDownloadExtension("infotravel_extension")}
                  className="w-full h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring gap-2"
                >
                  {downloadingType === "infotravel_extension" ? (
                    <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {downloadingType === "infotravel_extension" ? "Empacotando..." : "Baixar Extensão (.zip)"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStoreModalType("infotravel_extension")}
                  className="w-full h-10 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring gap-2 border border-border/60 hover:bg-muted"
                >
                  <Eye className="size-4" />
                  <span>Visualizar na Store</span>
                </Button>
              </div>
            </div>

            {/* Extensão 2: WhatsApp Web */}
            <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-2xs font-semibold">
                    Manifest V3
                  </Badge>
                  <Badge variant="secondary" className="text-3xs font-normal">
                    v2.1.0
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  Waesy Ingest • WhatsApp Web
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extração e higienização de contatos de grupos e conversas com envio idempotente direto ao Waesy CRM da Excelência Tour.
                </p>
                <div className="pt-1 text-2xs font-mono text-muted-foreground">
                  <span>Destino: WhatsApp Web (web.whatsapp.com)</span>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadingType === "whatsapp_extension"}
                  onClick={() => handleDownloadExtension("whatsapp_extension")}
                  className="w-full h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring gap-2"
                >
                  {downloadingType === "whatsapp_extension" ? (
                    <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {downloadingType === "whatsapp_extension" ? "Empacotando..." : "Baixar Extensão (.zip)"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStoreModalType("whatsapp_extension")}
                  className="w-full h-10 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring gap-2 border border-border/60 hover:bg-muted"
                >
                  <Eye className="size-4" />
                  <span>Visualizar na Store</span>
                </Button>
              </div>
            </div>

            {/* Extensão 3: Minerador e Scripts */}
            <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-2xs font-semibold">
                    Node / Playwright
                  </Badge>
                  <Badge variant="secondary" className="text-3xs font-normal">
                    Scripts CLI
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  Waesy Miner • Extrator Autônomo
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Varredura em lote com sessões persistidas do Chrome e gerador de arquivos CSV formatados com BOM UTF-8 e ponto-e-vírgula para Excel.
                </p>
                <div className="pt-1 text-2xs font-mono text-muted-foreground">
                  <span>Destino: Windows / Terminal</span>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadingType === "infotravel_miner"}
                  onClick={() => handleDownloadExtension("infotravel_miner")}
                  className="w-full h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring gap-2"
                >
                  {downloadingType === "infotravel_miner" ? (
                    <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {downloadingType === "infotravel_miner" ? "Empacotando..." : "Baixar Scripts & Extrator (.zip)"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStoreModalType("infotravel_miner")}
                  className="w-full h-10 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring gap-2 border border-border/60 hover:bg-muted"
                >
                  <Eye className="size-4" />
                  <span>Visualizar na Store</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ─── Fila de Solicitações de Acesso ─── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-foreground" />
                  <h3 className="text-base font-bold text-foreground">
                    Fila de Solicitações de Acesso
                  </h3>
                  {pendingRequestsCount > 0 && (
                    <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10 text-2xs font-semibold">
                      {pendingRequestsCount} pendente{pendingRequestsCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lojas que solicitaram liberação através da vitrine Web Store.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingRequests}
                onClick={refreshExtensionData}
                className="h-9 px-3 text-xs font-semibold gap-2 self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className={`size-3.5 ${isLoadingRequests ? "animate-spin motion-reduce:animate-none" : ""}`} />
                <span>Atualizar Fila</span>
              </Button>
            </div>

            {extensionRequests.length === 0 ? (
              <div className="rounded-lg border border-border/80 bg-card p-8 text-center space-y-2">
                <ShieldCheck className="size-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Nenhuma solicitação no histórico</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Quando uma empresa tentar acessar ou baixar extensões sem autorização, ela poderá enviar um pedido formal que aparecerá nesta lista para liberação em 1 clique.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {extensionRequests.map((req) => {
                  const isProcessing = processingRequestId === req.id;
                  const isPending = req.status === "pending";
                  const isApproved = req.status === "approved";

                  return (
                    <div
                      key={req.id}
                      className="rounded-lg border border-border/80 bg-card p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {req.store_name}
                          </span>
                          {req.store_city && (
                            <Badge variant="secondary" className="text-2xs font-normal">
                              {req.store_city}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-2xs font-semibold ${
                              isApproved
                                ? "border-success/50 text-success bg-success/10"
                                : isPending
                                ? "border-warning/50 text-warning bg-warning/10"
                                : "border-destructive/50 text-destructive bg-destructive/10"
                            }`}
                          >
                            {isApproved
                              ? "Liberado & Ativo"
                              : isPending
                              ? "Aguardando Avaliação"
                              : "Rejeitado"}
                          </Badge>
                          <Badge variant="outline" className="text-2xs font-mono">
                            {getExtensionLabel(req.extension_type)}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                          <span>
                            Solicitante: <strong className="text-foreground font-semibold">{req.requester_name}</strong>
                            {req.requester_email ? ` (${req.requester_email})` : ""}
                          </span>
                          <span>•</span>
                          <span>{formatRequestDate(req.created_at)}</span>
                        </div>

                        {req.justification && (
                          <div className="rounded-md bg-muted/40 p-3 text-xs text-foreground/90 italic border border-border/40">
                            &ldquo;{req.justification}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {isPending ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleReviewRequest(req, "approved")}
                              className="h-9 px-3 text-xs font-bold border-success/40 text-success hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-ring gap-2"
                            >
                              {isProcessing ? (
                                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              <span>Liberar Acesso</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleReviewRequest(req, "rejected")}
                              className="h-9 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring gap-2"
                            >
                              <X className="size-3.5" />
                              <span>Rejeitar</span>
                            </Button>
                          </>
                        ) : isApproved ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleReviewRequest(req, "rejected")}
                            className="h-9 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring gap-2"
                          >
                            <UserX className="size-3.5" />
                            <span>Revogar Acesso</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleReviewRequest(req, "approved")}
                            className="h-9 px-3 text-xs font-bold border-success/40 text-success hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-ring gap-2"
                          >
                            <Check className="size-3.5" />
                            <span>Reconsiderar & Liberar</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Gestão Direta de Autorizações por Loja ─── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-foreground" />
                  <h3 className="text-base font-bold text-foreground">
                    Autorização Direta por Loja
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Conceda ou revogue acesso instantâneo a cada extensão para qualquer empresa cadastrada.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Filtrar por nome ou slug..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="h-9 text-xs rounded-lg bg-card"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
              <div className="overflow-x-auto table-scroll-area">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-3xs font-semibold tracking-wider border-b border-border/60">
                    <tr>
                      <th className="p-3">Loja / Empresa</th>
                      <th className="p-3 text-center">Waesy Sync (Infotravel)</th>
                      <th className="p-3 text-center">Waesy Ingest (WhatsApp)</th>
                      <th className="p-3 text-center">Waesy Miner (Scripts)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredPlatformStores.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-xs text-muted-foreground">
                          Nenhuma loja encontrada com o termo pesquisado.
                        </td>
                      </tr>
                    ) : (
                      (showAllStores ? filteredPlatformStores : filteredPlatformStores.slice(0, 15)).map((store) => {
                        const isExempt = isStoreExempt(store);
                        const authInfotravel = isStoreExtensionAuthorized(store, "infotravel_extension");
                        const authWhatsapp = isStoreExtensionAuthorized(store, "whatsapp_extension");
                        const authMiner = isStoreExtensionAuthorized(store, "infotravel_miner");

                        return (
                          <tr key={store.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{store.name}</div>
                              <div className="text-2xs text-muted-foreground font-mono">
                                {store.slug}
                                {isExempt && " • Piloto Nativo Autorizado"}
                              </div>
                            </td>

                            {/* Coluna 1: Infotravel */}
                            <td className="p-3 text-center">
                              {isExempt ? (
                                <Badge variant="secondary" className="text-3xs font-semibold">
                                  Liberado Nativo
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant={authInfotravel ? "outline" : "ghost"}
                                  size="sm"
                                  disabled={togglingStoreExtension === `${store.id}_infotravel_extension`}
                                  onClick={() => handleToggleStoreExtension(store.id, "infotravel_extension", authInfotravel)}
                                  className={`h-8 px-2 text-2xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                                    authInfotravel
                                      ? "border-success/50 text-success bg-success/10"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {togglingStoreExtension === `${store.id}_infotravel_extension` ? (
                                    <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                                  ) : authInfotravel ? (
                                    <Check className="size-3 mr-1" />
                                  ) : (
                                    <X className="size-3 mr-1" />
                                  )}
                                  <span>{authInfotravel ? "Liberado" : "Bloqueado"}</span>
                                </Button>
                              )}
                            </td>

                            {/* Coluna 2: WhatsApp Web */}
                            <td className="p-3 text-center">
                              {isExempt ? (
                                <Badge variant="secondary" className="text-3xs font-semibold">
                                  Liberado Nativo
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant={authWhatsapp ? "outline" : "ghost"}
                                  size="sm"
                                  disabled={togglingStoreExtension === `${store.id}_whatsapp_extension`}
                                  onClick={() => handleToggleStoreExtension(store.id, "whatsapp_extension", authWhatsapp)}
                                  className={`h-8 px-2 text-2xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                                    authWhatsapp
                                      ? "border-success/50 text-success bg-success/10"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {togglingStoreExtension === `${store.id}_whatsapp_extension` ? (
                                    <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                                  ) : authWhatsapp ? (
                                    <Check className="size-3 mr-1" />
                                  ) : (
                                    <X className="size-3 mr-1" />
                                  )}
                                  <span>{authWhatsapp ? "Liberado" : "Bloqueado"}</span>
                                </Button>
                              )}
                            </td>

                            {/* Coluna 3: Minerador */}
                            <td className="p-3 text-center">
                              {isExempt ? (
                                <Badge variant="secondary" className="text-3xs font-semibold">
                                  Liberado Nativo
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant={authMiner ? "outline" : "ghost"}
                                  size="sm"
                                  disabled={togglingStoreExtension === `${store.id}_infotravel_miner`}
                                  onClick={() => handleToggleStoreExtension(store.id, "infotravel_miner", authMiner)}
                                  className={`h-8 px-2 text-2xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                                    authMiner
                                      ? "border-success/50 text-success bg-success/10"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {togglingStoreExtension === `${store.id}_infotravel_miner` ? (
                                    <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                                  ) : authMiner ? (
                                    <Check className="size-3 mr-1" />
                                  ) : (
                                    <X className="size-3 mr-1" />
                                  )}
                                  <span>{authMiner ? "Liberado" : "Bloqueado"}</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredPlatformStores.length > 15 && (
                <div className="p-2 flex items-center justify-center gap-3 bg-muted/20 text-3xs text-muted-foreground border-t border-border/40">
                  <span>
                    Mostrando {showAllStores ? filteredPlatformStores.length : 15} de {filteredPlatformStores.length} lojas.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllStores((prev) => !prev)}
                    className="h-8 px-2 text-2xs font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showAllStores ? "Recolher lista" : "Ver todas"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── Grid de Módulos ────────────────────────────────────────── */}
      {categoryTab !== "browser_extensions" && categoryTab !== "store_plans" && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((module) => {
          const isToggling = togglingKey === module.module_key;

          return (
            <div
              key={module.module_key}
              className={`rounded-lg border p-5 transition-colors duration-200 bg-card ${
                module.enabled
                  ? "border-border/80 shadow-xs"
                  : "border-border/40 opacity-70 bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-foreground truncate">
                      {module.name}
                    </h2>
                    {module.badge && (
                      <Badge variant="outline" className="text-2xs font-semibold">
                        {module.badge}
                      </Badge>
                    )}
                    <span className="text-2xs font-mono text-muted-foreground">
                      #{module.order_index}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {module.description || "Sem descrição definida."}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-2xs font-mono text-muted-foreground flex-wrap">
                    <span className="px-2 py-1 rounded bg-muted">
                      key: {module.module_key}
                    </span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-3xs py-0 px-2 font-normal">
                      {module.category === "store_operation"
                        ? "Workspace"
                        : module.category === "ai_intelligence"
                        ? "IA & Automação"
                        : "Vitrine Pública"}
                    </Badge>
                    <span>•</span>
                    <span className={module.enabled ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-warning-strong  font-medium"}>
                      {module.enabled ? "Ativo no Sistema" : "Pausado Globalmente"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 ml-2">
                  <div className="flex items-center gap-2">
                    {isToggling && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none text-primary" />}
                    <Switch
                      checked={module.enabled}
                      disabled={isToggling}
                      onCheckedChange={() => handleToggle(module)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(module)}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground gap-2 rounded-lg min-h-11 sm:min-h-0"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Editar</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* ─── Visão de Planos & Verticais ────────────────────────────── */}
      {categoryTab === "store_plans" && (
        <div className="space-y-8">
          {/* Header descritivo dos sistemas verticais */}
          <div className="space-y-2 border-b border-border/80 pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <span>Sistemas Verticais & Planos Comerciais</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Estrutura modular de comercialização Waesy: sistemas especializados comercializados de forma independente ou em conjunto no Waesy Pro.
            </p>
          </div>

          {/* Cards dos 6 Sistemas Verticais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-2xs font-bold">Turismo & Viagens</Badge>
                <span className="text-xs font-mono font-bold text-primary">R$ 249/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Roteiros dinâmicos, propostas em PDF, GDS Infotravel, central WhatsApp com Copilot IA e notas de voz.
              </p>
              <div className="text-3xs font-mono text-muted-foreground space-y-1 border-t border-border/40 pt-2">
                <div>Rotas: /workspace/turismo/*, /workspace/atendimento</div>
                <div>Módulos: module_tourism_studio, omnichannel, voice</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-2xs font-bold">Gastronomia & Delivery</Badge>
                <span className="text-xs font-mono font-bold text-primary">R$ 99/mês + R$ 0,99</span>
              </div>
              <p className="text-xs text-muted-foreground">
                PDV touch, KDS de cozinha, impressão térmica, despachador de entregas Waesy Go e cardápio interativo.
              </p>
              <div className="text-3xs font-mono text-muted-foreground space-y-1 border-t border-border/40 pt-2">
                <div>Rotas: /workspace/pdv, /workspace/pdv/cozinha</div>
                <div>Módulos: module_food_delivery, omnichannel, mobilidade</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-2xs font-bold">Varejo & Comércio</Badge>
                <span className="text-xs font-mono font-bold text-primary">R$ 149/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Catálogo WMS com grade, controle de estoque em lote, emissão de pedidos e conciliação de pagamentos Pix.
              </p>
              <div className="text-3xs font-mono text-muted-foreground space-y-1 border-t border-border/40 pt-2">
                <div>Rotas: /workspace/catalogo, /workspace/estoque</div>
                <div>Módulos: WMS, module_financial_erp, omnichannel</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-2xs font-bold">Especialistas & Agenda</Badge>
                <span className="text-xs font-mono font-bold text-primary">R$ 89/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Agenda multiprofissional com slots inteligentes, ficha de cliente 360°, confirmação WhatsApp e lembretes.
              </p>
              <div className="text-3xs font-mono text-muted-foreground space-y-1 border-t border-border/40 pt-2">
                <div>Rotas: /workspace/agendamentos, /workspace/clientes</div>
                <div>Módulos: Agenda 360°, module_omnichannel_whatsapp</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-2xs font-bold">Atendimento Omnichannel</Badge>
                <span className="text-xs font-mono font-bold text-primary">R$ 99 a R$ 199/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Modo dedicado standalone / full-screen com setores, notas internas, IA anti-esquecimento e estúdio de voz PTT.
              </p>
              <div className="text-3xs font-mono text-muted-foreground space-y-1 border-t border-border/40 pt-2">
                <div>Rotas: /workspace/atendimento?view=standalone</div>
                <div>Módulos: module_omnichannel_whatsapp, voice_copilot</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-2xs font-bold">Waesy Pro (All-in-One)</Badge>
                <span className="text-xs font-mono font-bold text-primary">R$ 599/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Acesso irrestrito a todos os módulos, multi-loja, domínio próprio e suporte prioritário 24/7.
              </p>
              <div className="text-3xs font-mono text-muted-foreground space-y-1 border-t border-border/40 pt-2">
                <div>Rotas: Shell completo multi-vertical</div>
                <div>Módulos: Todos os 6 módulos comerciais ativos</div>
              </div>
            </div>
          </div>

          {/* Tabela de Lojas & Ativação de Add-ons */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-foreground" />
                  <h3 className="text-base font-bold text-foreground">
                    Gestão de Módulos & Add-ons por Loja
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ative ou desative módulos comerciais avulsos com persistência e governança multi-tenant imediata.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Filtrar por nome ou slug..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="h-9 text-xs rounded-lg bg-card"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
              <div className="overflow-x-auto table-scroll-area">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-3xs font-semibold tracking-wider border-b border-border/60">
                    <tr>
                      <th className="p-3">Loja / Empresa</th>
                      <th className="p-3 text-center">Plano</th>
                      <th className="p-3 text-center">WhatsApp Hub</th>
                      <th className="p-3 text-center">Copilot IA Voz</th>
                      <th className="p-3 text-center">ERP Financeiro</th>
                      <th className="p-3 text-center">Studio Turismo</th>
                      <th className="p-3 text-center">Food Delivery</th>
                      <th className="p-3 text-center">Booster Ads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredPlatformStores.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">
                          Nenhuma loja encontrada com o termo pesquisado.
                        </td>
                      </tr>
                    ) : (
                      (showAllStores ? filteredPlatformStores : filteredPlatformStores.slice(0, 15)).map((store) => {
                        const activeModules: string[] = store.settings?.active_modules || [];
                        const planTier = (store.plan_tier || store.settings?.plan_tier || "free").toLowerCase();
                        const isExempt = isExcelenciaTourRecord(store);

                        const checkModuleActive = (modId: CommercialModuleId) => {
                          if (isExempt) return true;
                          const plan = STORE_PLANS[planTier as keyof typeof STORE_PLANS];
                          const includedInPlan = plan ? plan.includedModules.includes(modId) : false;
                          return includedInPlan || activeModules.includes(modId);
                        };

                        const commercialModules: { id: CommercialModuleId; label: string }[] = [
                          { id: "module_omnichannel_whatsapp", label: "WhatsApp" },
                          { id: "module_ai_copilot_voice", label: "IA Voz" },
                          { id: "module_financial_erp", label: "Financeiro" },
                          { id: "module_tourism_studio", label: "Turismo" },
                          { id: "module_food_delivery", label: "Delivery" },
                          { id: "module_ads_booster", label: "Ads" },
                        ];

                        return (
                          <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{store.name}</div>
                              <div className="text-2xs font-mono text-muted-foreground">/{store.slug}</div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={isExempt ? "default" : planTier === "enterprise" ? "default" : "secondary"} className="text-3xs uppercase font-mono">
                                {isExempt ? "Enterprise (SSOT)" : planTier}
                              </Badge>
                            </td>
                            {commercialModules.map((cm) => {
                              const isActive = checkModuleActive(cm.id);
                              const isToggling = togglingStoreModule === `${store.id}_${cm.id}`;

                              return (
                                <td key={cm.id} className="p-3 text-center">
                                  {isExempt ? (
                                    <Badge variant="secondary" className="text-3xs font-semibold">
                                      Nativo
                                    </Badge>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant={isActive ? "outline" : "ghost"}
                                      size="sm"
                                      disabled={isToggling}
                                      onClick={() => handleToggleStoreModule(store.id, cm.id, isActive)}
                                      className={`h-8 px-2 text-2xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                                        isActive
                                          ? "border-success/50 text-success bg-success/10"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {isToggling ? (
                                        <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                                      ) : isActive ? (
                                        <Check className="size-3 mr-1" />
                                      ) : (
                                        <X className="size-3 mr-1" />
                                      )}
                                      <span>{isActive ? "Ativo" : "Inativo"}</span>
                                    </Button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Edição de Módulo ────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              <span>Configurar Módulo</span>
            </DialogTitle>
          </DialogHeader>

          {editingModule && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Identificador Técnico</Label>
                <Input
                  value={editingModule.module_key}
                  disabled
                  className="h-9 rounded-lg text-xs bg-muted font-mono opacity-80"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Nome de Exibição</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Descrição</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="rounded-lg text-xs bg-background resize-none min-h-18"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Badge Promocional</Label>
                  <Input
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    placeholder="Ex: Novo, Ativo"
                    className="h-9 rounded-lg text-xs bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Ordem de Exibição</Label>
                  <Input
                    type="number"
                    value={editOrderIndex}
                    onChange={(e) => setEditOrderIndex(parseInt(e.target.value) || 0)}
                    className="h-9 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(false)}
                  className="rounded-lg text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="rounded-lg text-xs font-bold gap-2"
                >
                  {isSaving && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />}
                  <span>Salvar Alterações</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modal Web Store Showcase Preview ───────────────────────── */}
      {storeModalType && (
        <ExtensionWebStoreModal
          isOpen={!!storeModalType}
          onClose={() => setStoreModalType(null)}
          extensionType={storeModalType}
          storeName="Admin Master"
          onDownloadDirect={handleDownloadExtension}
        />
      )}
    </div>
  );
}
