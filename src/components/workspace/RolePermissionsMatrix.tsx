import { useState, useEffect } from "react";
import { ShieldCheck, Check, AlertCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRolePermissionsMatrix, saveRolePermissionsMatrix } from "@/services/services-erp.functions";

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
  roleKey: string;
  roleName: string;
}

export function RolePermissionsMatrix({ roleKey, roleName }: RolePermissionsMatrixProps) {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getRolePermissionsMatrix({ data: { roleKey } })
      .then((data) => {
        if (isMounted) {
          setPermissions(data || {});
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar permissões:", err);
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Matriz de Permissões: {roleName}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina o acesso visual e funcional por setor com comandos táteis em linha de 44px.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 px-5 font-semibold text-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
