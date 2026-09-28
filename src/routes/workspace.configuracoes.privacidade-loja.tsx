/**
 * workspace.configuracoes.privacidade-loja.tsx â€” Painel do Lojista para Controle de Lojas Ocultas,
 * Senhas de Acesso, Marketplace Seletivo e ComissÃµes (Waesy Platform).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { LockKey, EyeSlash, Eye, Storefront, ShieldCheck, Tag, Check, ArrowRight, Info, CurrencyCircleDollar } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getStorePrivacySettings, updateStorePrivacySettings } from "@/services/private-store.functions";
import { WorkspaceAccessDenied } from "@/components/workspace/workspace-access-denied";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/configuracoes/privacidade-loja")({
  head: () => ({
    meta: [{ title: "Privacidade | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
    const settings = await getStorePrivacySettings().catch(() => null);
    return { settings };
    } catch (err) {
      console.error("[loader:workspace.configuracoes.privacidade-loja] Unhandled loader error:", err);
      return { settings: null };
    }
  },
  component: StorePrivacySettingsPage,
});

function StorePrivacySettingsPage() {
  const { settings: initialSettings } = ((Route.useLoaderData?.() as any) || {});
  const [isPending, startTransition] = useTransition();

  const { data: settings, refetch } = useQuery({
    queryKey: ["store-privacy-settings"],
    queryFn: () => getStorePrivacySettings(),
    initialData: initialSettings,
  });

  const [isHidden, setIsHidden] = useState(settings?.isHiddenFromDirectory || false);
  const [accessType, setAccessType] = useState<"public" | "password_protected" | "members_only">(
    settings?.accessType || "public"
  );
  const [password, setPassword] = useState("");
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(
    settings?.marketplaceCommissionEnabled !== false
  );
  const [onlyCatalogMode, setOnlyCatalogMode] = useState(settings?.onlyCatalogMode || false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.storeId) return;

    if (accessType === "password_protected" && !password.trim() && !settings.hasPasswordConfigured) {
      toast.error("Defina uma senha para proteger sua loja.");
      return;
    }

    startTransition(async () => {
      try {
        await updateStorePrivacySettings({
          data: {
            storeId: settings.storeId,
            isHiddenFromDirectory: isHidden,
            accessType,
            accessPassword: password.trim() || undefined,
            marketplaceCommissionEnabled: marketplaceEnabled,
            onlyCatalogMode,
          },
        });
        toast.success("ConfiguraÃ§Ãµes de privacidade e marketplace salvas com sucesso!");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Erro ao salvar configuraÃ§Ãµes.");
      }
    });
  };

  if (!settings?.storeId) {
    return (
      <WorkspaceAccessDenied
        role="colaborador"
        path="/workspace/configuracoes/privacidade-loja"
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link to="/workspace/configuracoes" className="hover:text-foreground">
            ConfiguraÃ§Ãµes
          </Link>
          <span>/</span>
          <span className="text-foreground">Privacidade e Canais</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Privacidade da Loja
        </h1>
        <p className="text-xs text-muted-foreground">
          Controle quem pode visualizar sua empresa, configure proteÃ§Ã£o por senha e escolha se quer vender no marketplace ou apenas na vitrine direta.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* â”€â”€ 1. VISIBILIDADE NO DIRETÃ“RIO & BUSCA PÃšBLICA â”€â”€ */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <EyeSlash size={18} weight="bold" className="text-primary" />
                <span>Ocultar Loja do DiretÃ³rio e de Guias PÃºblicos</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                Quando ativado, sua loja NÃƒO aparecerÃ¡ na pÃ¡gina do DiretÃ³rio (/diretorio), na busca geral e serÃ¡ bloqueada contra indexaÃ§Ã£o de motores de busca (Google). O acesso sÃ³ serÃ¡ possÃ­vel via link direto.
              </p>
            </div>
            <Switch checked={isHidden} onCheckedChange={setIsHidden} />
          </div>
        </div>

        {/* â”€â”€ 2. MODO DE ACESSO (PÃšBLICO VS SENHA VS MEMBROS) â”€â”€ */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <LockKey size={18} weight="bold" className="text-primary" />
              <span>Controle de Acesso ao CatÃ¡logo e PreÃ§os</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Defina quem tem permissÃ£o para visualizar seus produtos, cardÃ¡pio e preÃ§os.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "public",
                label: "Livre / PÃºblico",
                desc: "Qualquer visitante com o link pode ver os itens.",
                icon: Eye,
              },
              {
                id: "password_protected",
                label: "Protegida por Senha",
                desc: "Exige que o cliente digite uma senha prÃ©via.",
                icon: LockKey,
              },
              {
                id: "members_only",
                label: "Apenas Membros",
                desc: "Apenas clientes com conta cadastrada e aprovada.",
                icon: ShieldCheck,
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAccessType(opt.id as any)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  accessType === opt.id
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 hover:border-foreground/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <opt.icon
                    size={20}
                    weight="bold"
                    className={accessType === opt.id ? "text-primary" : "text-muted-foreground"}
                  />
                  {accessType === opt.id && <Check size={16} weight="bold" className="text-primary" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{opt.label}</h3>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Campo de Senha se Protegida por Senha */}
          {accessType === "password_protected" && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2 pt-3">
              <Label htmlFor="storePass" className="text-xs font-semibold">
                {settings?.hasPasswordConfigured
                  ? "Alterar Senha de Acesso da Loja (Deixe em branco para manter a atual)"
                  : "Definir Senha de Acesso"}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="storePass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ex: VIP2026"
                  className="h-10 rounded-xl text-xs max-w-xs font-mono"
                />
                {settings?.hasPasswordConfigured && (
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
                    Senha Ativa Configurada
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* â”€â”€ 3. CANAL DE VENDAS & COMISSÃƒO DO MARKETPLACE â”€â”€ */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CurrencyCircleDollar size={18} weight="bold" className="text-primary" />
                <span>DivulgaÃ§Ã£o no Marketplace Unificado Waesy</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                A comissÃ£o de intermediaÃ§Ã£o sÃ³ Ã© aplicada nas vendas originadas atravÃ©s do Marketplace pÃºblico. Desative se deseja operar exclusivamente atravÃ©s de vendas orgÃ¢nicas diretas (0% de taxa de marketplace).
              </p>
            </div>
            <Switch
              checked={marketplaceEnabled}
              onCheckedChange={setMarketplaceEnabled}
            />
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground">Modo CatÃ¡logo Somente</span>
              <p className="text-[11px] text-muted-foreground">
                Exibe produtos como portfÃ³lio sem botÃ£o de checkout online, direcionando o cliente para orÃ§amento no WhatsApp.
              </p>
            </div>
            <Switch
              checked={onlyCatalogMode}
              onCheckedChange={setOnlyCatalogMode}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-xl h-11 px-6 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            {isPending ? "Salvando AlteraÃ§Ãµes..." : "Salvar ConfiguraÃ§Ãµes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
