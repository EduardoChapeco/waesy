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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  adminListPlatformModules,
  adminTogglePlatformModule,
  adminUpdatePlatformModule,
  type PlatformModuleDTO,
} from "@/services/modules.functions";

export const Route = createFileRoute("/admin-master/modulos")({
  head: () => ({ meta: [{ title: "Governança Dinâmica de Módulos | Admin Master" }] }),
  loader: async () => {
    try {
      const modules = await adminListPlatformModules();
      return { modules };
    } catch (err: any) {
      console.error("[admin-master.modulos] Loader error:", err);
      return { modules: [] };
    }
  },
  component: AdminMasterModulosPage,
});

function AdminMasterModulosPage() {
  const { modules: initialModules } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const [modules, setModules] = useState<PlatformModuleDTO[]>(initialModules);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<PlatformModuleDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [editOrderIndex, setEditOrderIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [categoryTab, setCategoryTab] = useState<"all" | "store_operation" | "public_discovery" | "ai_intelligence">("all");
  const [search, setSearch] = useState("");

  const activeCount = modules.filter((m) => m.enabled).length;
  const disabledCount = modules.length - activeCount;

  const storeOpCount = modules.filter((m) => m.category === "store_operation").length;
  const publicCount = modules.filter((m) => m.category === "public_discovery").length;
  const aiCount = modules.filter((m) => m.category === "ai_intelligence").length;

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
            <span className="inline-block size-2 rounded-full bg-emerald-500 mr-2" />
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "all"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            }`}
          >
            Todos ({modules.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("store_operation")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "store_operation"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            }`}
          >
            Operação de Loja ({storeOpCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("public_discovery")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "public_discovery"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            }`}
          >
            Vitrines Públicas ({publicCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("ai_intelligence")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              categoryTab === "ai_intelligence"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40"
            }`}
          >
            Inteligência & IA ({aiCount})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar módulo por nome, chave ou badge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs rounded-xl bg-card"
          />
        </div>
      </div>

      {/* ─── Grid de Módulos ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((module) => {
          const isToggling = togglingKey === module.module_key;

          return (
            <div
              key={module.module_key}
              className={`rounded-2xl border p-5 transition-all bg-card ${
                module.enabled
                  ? "border-border/80 shadow-xs"
                  : "border-border/40 opacity-70 bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-foreground truncate">
                      {module.name}
                    </h2>
                    {module.badge && (
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {module.badge}
                      </Badge>
                    )}
                    <span className="text-[11px] font-mono text-muted-foreground">
                      #{module.order_index}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {module.description || "Sem descrição definida."}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-muted-foreground flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-muted">
                      key: {module.module_key}
                    </span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-normal">
                      {module.category === "store_operation"
                        ? "Workspace"
                        : module.category === "ai_intelligence"
                        ? "IA & Automação"
                        : "Vitrine Pública"}
                    </Badge>
                    <span>•</span>
                    <span className={module.enabled ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                      {module.enabled ? "Ativo no Sistema" : "Pausado Globalmente"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2.5 shrink-0 ml-2">
                  <div className="flex items-center gap-2">
                    {isToggling && <Loader2 className="size-3.5 animate-spin text-primary" />}
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
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
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

      {/* ─── Modal de Edição de Módulo ────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              <span>Configurar Módulo</span>
            </DialogTitle>
          </DialogHeader>

          {editingModule && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Identificador Técnico</Label>
                <Input
                  value={editingModule.module_key}
                  disabled
                  className="h-9 rounded-xl text-xs bg-muted font-mono opacity-80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Nome de Exibição</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 rounded-xl text-xs bg-background"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Descrição</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="rounded-xl text-xs bg-background resize-none min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Badge Promocional</Label>
                  <Input
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    placeholder="Ex: Novo, Ativo"
                    className="h-9 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Ordem de Exibição</Label>
                  <Input
                    type="number"
                    value={editOrderIndex}
                    onChange={(e) => setEditOrderIndex(parseInt(e.target.value) || 0)}
                    className="h-9 rounded-xl text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Salvar Alterações</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
