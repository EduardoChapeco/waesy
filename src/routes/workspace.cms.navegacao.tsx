import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Trash2, GripVertical, Save, Link2 } from "lucide-react";
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
      return {} as any;
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

function CmsNavigationPage() {
  const router = useRouter();
  const menus = Route.useLoaderData();

  const defaultMenu: any =
    (menus as any[] | undefined)?.find((m: any) => m.handle === "main-menu") ||
    (menus as any[] | undefined)?.[0] ||
    { name: "Menu Principal", handle: "main-menu", items: [] };

  const [activeMenu, setActiveMenu] = useState<MenuState>({
    id: defaultMenu.id,
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
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        title="Navegação"
        description="Configure os menus de navegação da sua vitrine pública."
        actions={
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="font-bold min-h-[44px] gap-1.5"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Menu"}
          </Button>
        }
      />

      <div className="flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          {/* Configurações do Menu */}
          <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Menu</Label>
                <Input
                  value={activeMenu.name}
                  onChange={(e) => setActiveMenu({ ...activeMenu, name: e.target.value })}
                  placeholder="Ex: Menu Principal"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Identificador (Handle)</Label>
                <Input
                  value={activeMenu.handle}
                  onChange={(e) => setActiveMenu({ ...activeMenu, handle: e.target.value })}
                  placeholder="Ex: main-menu"
                  disabled={!!activeMenu.id}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Links do Menu */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Links do Menu</h3>
              <Button onClick={handleAddItem} variant="outline" size="sm" className="gap-1.5 text-xs min-h-[44px]">
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
                    className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border/60"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move shrink-0" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Rótulo</Label>
                        <Input
                          value={item.label}
                          onChange={(e) => handleItemChange(index, "label", e.target.value)}
                          placeholder="Ex: Produtos"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">URL ou Caminho</Label>
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
                      className="text-muted-foreground hover:text-destructive mt-5 shrink-0"
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
