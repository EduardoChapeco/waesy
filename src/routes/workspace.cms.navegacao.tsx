import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Trash2, Save, Link2, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/state/states";
import { getNavigationMenus, upsertNavigationMenu } from "@/services/cms.functions";

export const Route = createFileRoute("/workspace/cms/navegacao")({
  head: () => ({ meta: [{ title: "Menus de Navegação | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const res = await getNavigationMenus();
      return res || [];
    } catch (err) {
      console.error("[loader:workspace.cms.navegacao] Unhandled loader error:", err);
      return null as any;
    }
  },
  component: CmsNavigationPage,
});

type NavItem = {
  id: string;
  label: string;
  url: string;
};

type MenuState = {
  id?: string;
  name: string;
  handle: string;
  items: NavItem[];
};

const CANONICAL_MENU_PRESETS: Array<{ handle: string; name: string }> = [
  { handle: "main-menu", name: "Menu Principal" },
  { handle: "header_nav", name: "Cabeçalho Global (Header)" },
  { handle: "footer_menu", name: "Rodapé Global (Footer)" },
  { handle: "bottom_nav", name: "Barra Inferior Mobile (5 Abas)" },
  { handle: "explore_menu", name: "Menu Hambúrguer / Explorar" },
];

function CmsNavigationPage() {
  const router = useRouter();
  const menus = Route.useLoaderData();

  const initialMenuList: any[] = Array.isArray(menus) ? menus : [];
  const defaultMenu: any =
    initialMenuList.find((m: any) => m.handle === "main-menu") ||
    initialMenuList[0] ||
    { name: "Menu Principal", handle: "main-menu", items: [] };

  const [activeMenu, setActiveMenu] = useState<MenuState>({
    id: defaultMenu.id && !String(defaultMenu.id).startsWith("canonical-") ? defaultMenu.id : undefined,
    name: defaultMenu.name,
    handle: defaultMenu.handle,
    items: defaultMenu.items || [],
  });

  const [isSaving, setIsSaving] = useState(false);

  // Guard defensivo para null
  if (!menus) {
    return (
      <EmptyState
        title="Não foi possível carregar os menus"
        description="Tente recarregar a página."
      />
    );
  }

  const handleSelectMenuByHandle = (handle: string) => {
    const existing = initialMenuList.find((m: any) => m.handle === handle);
    const preset = CANONICAL_MENU_PRESETS.find((p) => p.handle === handle);
    if (existing) {
      setActiveMenu({
        id: existing.id && !String(existing.id).startsWith("canonical-") ? existing.id : undefined,
        name: existing.name || preset?.name || handle,
        handle: existing.handle,
        items: Array.isArray(existing.items) ? existing.items : [],
      });
    } else {
      setActiveMenu({
        id: undefined,
        name: preset?.name || "Novo Menu",
        handle,
        items: [],
      });
    }
  };

  const handleMoveItem = (index: number, dir: "up" | "down") => {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= activeMenu.items.length) return;
    const next = [...activeMenu.items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setActiveMenu({ ...activeMenu, items: next });
  };

  const handleAddItem = () => {
    const newItem: NavItem = {
      id: crypto.randomUUID(),
      label: "Novo Link",
      url: "/",
    };
    setActiveMenu({ ...activeMenu, items: [...activeMenu.items, newItem] });
  };

  const handleItemChange = (index: number, field: keyof NavItem, value: string) => {
    const newItems = [...activeMenu.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setActiveMenu({ ...activeMenu, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = activeMenu.items.filter((_, i) => i !== index);
    setActiveMenu({ ...activeMenu, items: newItems });
  };

  const handleSave = async () => {
    if (!activeMenu.name || !activeMenu.handle) {
      toast.error("Nome e identificador do menu são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      await upsertNavigationMenu({
        data: {
          id: activeMenu.id,
          name: activeMenu.name,
          handle: activeMenu.handle,
          items: activeMenu.items,
        },
      });
      toast.success("Menu salvo com sucesso!");
      router.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar menu");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
        title="Navegação"
        description="Configure os menus de navegação da sua vitrine pública."
        actions={
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="font-bold min-h-11 gap-2"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Menu"}
          </Button>
        }
      />

      <div className="flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          {/* Seletor de Estrutura + Configurações do Menu */}
          <div className="bg-card rounded-lg border border-border/60 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/60">
              <div className="space-y-1 flex-1 min-w-56">
                <Label className="text-xs font-bold">Estrutura de Navegação</Label>
                <select
                  aria-label="Estrutura de Navegação"
                  value={activeMenu.handle}
                  onChange={(e) => handleSelectMenuByHandle(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CANONICAL_MENU_PRESETS.map((preset) => (
                    <option key={preset.handle} value={preset.handle}>
                      {preset.name} ({preset.handle})
                    </option>
                  ))}
                  {initialMenuList
                    .filter((m: any) => !CANONICAL_MENU_PRESETS.some((p) => p.handle === m.handle))
                    .map((custom: any) => (
                      <option key={custom.id || custom.handle} value={custom.handle}>
                        {custom.name || custom.handle} ({custom.handle})
                      </option>
                    ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setActiveMenu({
                    id: undefined,
                    name: "Menu Personalizado",
                    handle: `custom-menu-${Date.now().toString(36)}`,
                    items: [],
                  })
                }
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 mt-5 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Criar Novo Menu</span>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome do Menu</Label>
                <Input
                  value={activeMenu.name}
                  onChange={(e) => setActiveMenu({ ...activeMenu, name: e.target.value })}
                  placeholder="Ex: Menu Principal"
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Identificador (Handle)</Label>
                <Input
                  value={activeMenu.handle}
                  onChange={(e) => setActiveMenu({ ...activeMenu, handle: e.target.value })}
                  placeholder="Ex: main-menu"
                  disabled={Boolean(activeMenu.id && !String(activeMenu.id).startsWith("canonical-"))}
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Links do Menu */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Links do Menu</h3>
              <Button onClick={handleAddItem} variant="outline" size="sm" className="gap-2 text-xs min-h-11">
                <Plus className="h-3.5 w-3.5" />
                Adicionar Link
              </Button>
            </div>

            {activeMenu.items.length === 0 ? (
              <EmptyState
                title="Nenhum link configurado neste menu"
                description="Adicione links para montar a navegação da sua vitrine."
              />
            ) : (
              <div className="space-y-3">
                {activeMenu.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border/60"
                  >
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => handleMoveItem(index, "up")}
                        aria-label="Subir link"
                        className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === activeMenu.items.length - 1}
                        onClick={() => handleMoveItem(index, "down")}
                        aria-label="Descer link"
                        className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Rótulo</Label>
                        <Input
                          value={item.label}
                          onChange={(e) => handleItemChange(index, "label", e.target.value)}
                          placeholder="Ex: Produtos"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">URL ou Caminho</Label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            className="pl-9 text-xs font-mono"
                            value={item.url}
                            onChange={(e) => handleItemChange(index, "url", e.target.value)}
                            placeholder="Ex: /produtos ou https://..."
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover link"
                      className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-destructive mt-5 shrink-0 cursor-pointer"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
