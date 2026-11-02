import { useState, useEffect } from "react";
import { ShieldCheck, Check, AlertCircle, Save, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getRolePermissionsMatrix, saveRolePermissionsMatrix } from "@/services/services-erp.functions";

export const AVAILABLE_ROLES = [
  { key: "manager", name: "Gerente / Administrador" },
  { key: "seller", name: "Vendedor / Comercial" },
  { key: "operator", name: "Profissional / Atendente" },
  { key: "support", name: "Suporte / SAC" },
  { key: "stockkeeper", name: "Estoquista" },
];

export interface PermissionModuleItem {
  key: string;
  label: string;
  description: string;
  actions: { key: string; label: string; isSpecial?: boolean }[];
}

export const MODULE_PERMISSIONS_CATALOG: PermissionModuleItem[] = [
  {
    key: "agenda",
    label: "Agenda",
    description: "Acesso, criação, edição e exclusão de agendamentos na grade horária.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "view_all", label: "Visualizar todos", isSpecial: true },
      { key: "customize", label: "Personalizar", isSpecial: true },
    ],
  },
  {
    key: "anamneses",
    label: "Anamneses",
    description: "Acesso, criação, edição e exclusão de questionários e modelos de anamnese com assinatura.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
    ],
  },
  {
    key: "clientes",
    label: "Clientes (CRM)",
    description: "Acesso e gestão da base de clientes com proteção LGPD de contatos.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "view_phones", label: "Visualizar telefones", isSpecial: true },
      { key: "notes", label: "Anotações", isSpecial: true },
      { key: "edit_credits", label: "Editar créditos", isSpecial: true },
    ],
  },
  {
    key: "comandas",
    label: "Comandas / PDV",
    description: "Abertura, adição de itens, assistentes e faturamento de comandas no balcão.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "view_finalized", label: "Exibir faturadas", isSpecial: true },
      { key: "edit_assistants", label: "Editar assistentes", isSpecial: true },
      { key: "finalize", label: "Faturar comanda", isSpecial: true },
    ],
  },
  {
    key: "comissoes",
    label: "Comissões",
    description: "Apuração de repasses, rateios, deduções e quitação de comissões de parceiros.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "pay", label: "Pagar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "view_all", label: "Visualizar todos", isSpecial: true },
    ],
  },
  {
    key: "estoque_compras",
    label: "Compras & Insumos",
    description: "Acesso a pedidos de compra de produtos, reposições do estoquista e importação de XML.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "import_xml", label: "Importar XML NFe", isSpecial: true },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro & Caixas",
    description: "Acesso ao fluxo de caixa, conciliação e governança de turnos de operadores.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "retroactive", label: "Lançamentos retroativos", isSpecial: true },
      { key: "multiple_drawers", label: "Múltiplos caixas", isSpecial: true },
      { key: "edit_after_close", label: "Editar com caixa fechado", isSpecial: true },
    ],
  },
  {
    key: "servicos_produtos",
    label: "Serviços & Produtos",
    description: "Cadastro de catálogo, precificação, fichas técnicas e pacotes predefinidos.",
    actions: [
      { key: "access", label: "Acessar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "inline_stock", label: "Ajuste rápido de estoque", isSpecial: true },
    ],
  },
];

export interface RolePermissionsMatrixProps {
  roleKey?: string;
  roleName?: string;
  storeId?: string;
}

export function RolePermissionsMatrix({ roleKey: initialRoleKey, roleName: initialRoleName }: RolePermissionsMatrixProps) {
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>(initialRoleKey || "manager");
  const currentRole = AVAILABLE_ROLES.find((r) => r.key === selectedRoleKey) || { key: selectedRoleKey, name: initialRoleName || selectedRoleKey };
  const roleKey = currentRole.key;
  const roleName = currentRole.name;
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    getRolePermissionsMatrix({ data: { roleKey } })
      .then((data) => {
        if (isMounted) {
          setPermissions(data || {});
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Não foi possível carregar as permissões.";
        if (isMounted) {
          setLoadError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roleKey]);

  const toggleAction = (moduleKey: string, actionKey: string) => {
    setPermissions((prev) => {
      const moduleState = prev[moduleKey] || {};
      const nextVal = !moduleState[actionKey];
      return {
        ...prev,
        [moduleKey]: {
          ...moduleState,
          [actionKey]: nextVal,
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveRolePermissionsMatrix({
        data: {
          roleKey,
          permissions,
        },
      });
      toast.success(`Permissões de ${roleName} atualizadas com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar matriz de permissões.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Não foi possível carregar a matriz.</p>
        <p className="max-w-md text-xs text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span>Matriz de Permissões por Cargo</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina o acesso visual e funcional por setor com comandos táteis em linha de 44px.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Cargo:</span>
            <Select value={selectedRoleKey} onValueChange={(val) => setSelectedRoleKey(val)}>
              <SelectTrigger className="h-11 min-h-11 w-52 rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map((r) => (
                  <SelectItem key={r.key} value={r.key} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 px-5 font-semibold text-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Permissões
            </>
          )}
        </Button>
      </div>
      </div>

      <div className="space-y-4">
        {MODULE_PERMISSIONS_CATALOG.map((mod) => {
          const modState = permissions[mod.key] || {};
          return (
            <div
              key={mod.key}
              className="rounded-2xl border border-border bg-card p-4 transition-colors"
            >
              <div className="mb-2">
                <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {mod.actions.map((act) => {
                  const isActive = !!modState[act.key];
                  return (
                    <button
                      key={act.key}
                      type="button"
                      onClick={() => toggleAction(mod.key, act.key)}
                      className={cn(
                        "h-11 px-4 rounded-xl text-xs font-semibold border transition-all select-none inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? act.isSpecial
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground",
                      )}
                    >
                      {isActive && <Check className="mr-1.5 h-3.5 w-3.5" />}
                      {act.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
