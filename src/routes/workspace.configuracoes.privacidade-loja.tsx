/**
 * workspace.configuracoes.privacidade-loja.tsx — Painel do Lojista para Controle de Lojas Ocultas,
 * Senhas de Acesso, Marketplace Seletivo e Comissões (Waesy Platform).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LockKey,
  EyeSlash,
  Eye,
  Storefront,
  ShieldCheck,
  Tag,
  Check,
  ArrowRight,
  Info,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  getStorePrivacySettings,
  updateStorePrivacySettings,
} from "@/services/private-store.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/configuracoes/privacidade-loja")({
  head: () => ({
    meta: [{ title: "Privacidade da Loja & Marketplace | Workspace Waesy" }],
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
        toast.success("Configurações de privacidade e marketplace salvas com sucesso!");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Erro ao salvar configurações.");
      }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link to="/workspace/configuracoes" className="hover:text-foreground">
            Configurações
          </Link>
          <span>/</span>
          <span className="text-foreground">Privacidade & Canais</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Privacidade da Loja
        </h1>
        <p className="text-xs text-muted-foreground">
          Controle quem pode visualizar sua empresa, configure proteção por senha e escolha se quer vender no marketplace ou apenas na vitrine direta.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── 1. VISIBILIDADE NO DIRETÓRIO & BUSCA PÚBLICA ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <EyeSlash size={18} weight="bold" className="text-primary" />
                <span>Ocultar Loja do Diretório e de Guias Públicos</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                Quando ativado, sua loja NÃO aparecerá na página do Diretório (/diretorio), na busca geral e será bloqueada contra indexação de motores de busca (Google). O acesso só será possível via link direto.
              </p>
            </div>
            <Switch checked={isHidden} onCheckedChange={setIsHidden} />
          </div>
        </div>

        {/* ── 2. MODO DE ACESSO (PÚBLICO VS SENHA VS MEMBROS) ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <LockKey size={18} weight="bold" className="text-primary" />
              <span>Controle de Acesso ao Catálogo e Preços</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Defina quem tem permissão para visualizar seus produtos, cardápio e preços.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "public",
                label: "Livre / Público",
                desc: "Qualquer visitante com o link pode ver os itens.",
                icon: Eye,
              },
              {
                id: "password_protected",
                label: "Protegida por Senha",
                desc: "Exige que o cliente digite uma senha prévia.",
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

        {/* ── 3. CANAL DE VENDAS & COMISSÃO DO MARKETPLACE ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CurrencyCircleDollar size={18} weight="bold" className="text-primary" />
                <span>Divulgação no Marketplace Unificado Waesy</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                A comissão de intermediação só é aplicada nas vendas originadas através do Marketplace público. Desative se deseja operar exclusivamente através de vendas orgânicas diretas (0% de taxa de marketplace).
              </p>
            </div>
            <Switch
              checked={marketplaceEnabled}
              onCheckedChange={setMarketplaceEnabled}
            />
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground">Modo Catálogo Somente</span>
              <p className="text-[11px] text-muted-foreground">
                Exibe produtos como portfólio sem botão de checkout online, direcionando o cliente para orçamento no WhatsApp.
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
            {isPending ? "Salvando Alterações..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
