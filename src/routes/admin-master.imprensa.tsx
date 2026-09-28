import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Newspaper, ShieldCheck, Search, CheckCircle2, XCircle, Clock, ExternalLink, Store, Loader2, Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listPressConsortiumStores, reviewPressAccreditation } from "@/services/news.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-master/imprensa")({
  head: () => ({
    meta: [
      {
        title: "Consórcio de Imprensa e Mídias Aprovadas | Admin Master",
      },
    ],
  }),
  loader: async () => {
    try {
      const stores = await listPressConsortiumStores().catch(() => []);
      return { stores: stores || [] };
    } catch (err) {
      console.error("[loader:admin-master.imprensa] error:", err);
      return { stores: [] };
    }
  },
  component: AdminMasterImprensaPage,
});

function AdminMasterImprensaPage() {
  const { stores: initialStores } = ((Route.useLoaderData?.() as any) || {});
  const [stores, setStores] = useState<any[]>(initialStores || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "approved" | "pending" | "revoked">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refreshList = async () => {
    try {
      const updated = await listPressConsortiumStores();
      setStores(updated || []);
    } catch {
      toast.error("Erro ao atualizar lista de veículos.");
    }
  };

  const handleUpdateStatus = async (storeId: string, status: "approved" | "pending" | "revoked" | "unaccredited") => {
    setUpdatingId(storeId);
    try {
      await reviewPressAccreditation({
        data: { storeId, status },
      });
      toast.success(
        status === "approved"
          ? "Veículo credenciado no Consórcio de Imprensa!"
          : status === "revoked"
          ? "Credencial revogada com sucesso."
          : "Status atualizado.",
      );
      await refreshList();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar credenciamento.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === "approved") return s.is_press_consortium || s.press_accreditation_status === "approved";
    if (filterTab === "pending") return s.press_accreditation_status === "pending";
    if (filterTab === "revoked") return s.press_accreditation_status === "revoked";
    return true;
  });

  const totalCount = stores.length;
  const approvedCount = stores.filter((s) => s.is_press_consortium || s.press_accreditation_status === "approved").length;
  const pendingCount = stores.filter((s) => s.press_accreditation_status === "pending").length;
  const revokedCount = stores.filter((s) => s.press_accreditation_status === "revoked").length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Topo & Cabeçalho Editorial ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Governança de Conteúdo
            </span>
            <span className="text-xs text-muted-foreground font-mono">Consórcio de Imprensa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            Credenciamento de Jornais e Mídias
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Apenas veículos de comunicação e jornalistas homologados pela administração master podem publicar notícias e operar campanhas da Rede Display.
          </p>
        </div>
      </div>

      {/* ── Grid de Métricas de Credenciamento ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border space-y-1">
          <span className="text-xs font-bold text-muted-foreground">Total de Lojas/Veículos</span>
          <p className="text-2xl font-black text-foreground font-mono">{totalCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border space-y-1">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Credenciados Oficiais
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {approvedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border space-y-1">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            Aguardando Aprovação
          </span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {pendingCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border space-y-1">
          <span className="text-xs font-bold text-destructive">Acessos Revogados</span>
          <p className="text-2xl font-black text-destructive font-mono">{revokedCount}</p>
        </div>
      </div>

      {/* ── Barra de Controles e Busca ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border self-start">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setFilterTab("approved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === "approved" ? "bg-background text-emerald-600 shadow-xs" : "text-muted-foreground"
            }`}
          >
            Aprovados ({approvedCount})
          </button>
          <button
            onClick={() => setFilterTab("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === "pending" ? "bg-background text-amber-600 shadow-xs" : "text-muted-foreground"
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab("revoked")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === "revoked" ? "bg-background text-destructive shadow-xs" : "text-muted-foreground"
            }`}
          >
            Revogados ({revokedCount})
          </button>
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-xl h-9 text-xs"
          />
        </div>
      </div>

      {/* ── Tabela / Cards de Veículos ── */}
      {filteredStores.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border bg-card/40 space-y-3">
          <Newspaper className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhum veículo encontrado</h3>
          <p className="text-xs text-muted-foreground">
            Ajuste os filtros de busca ou aguarde novas solicitações de credenciamento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((st) => {
            const isApproved = st.is_press_consortium || st.press_accreditation_status === "approved";
            const isPending = st.press_accreditation_status === "pending";
            const isRevoked = st.press_accreditation_status === "revoked";
            const isUpdating = updatingId === st.id;

            return (
              <div
                key={st.id}
                className="p-5 rounded-2xl bg-card border space-y-4 flex flex-col justify-between hover-elevate transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isApproved
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : isRevoked
                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isApproved
                        ? "✓ Credenciado Oficial"
                        : isPending
                        ? "⏳ Em Análise"
                        : isRevoked
                        ? "✕ Revogado"
                        : "Não Homologado"}
                    </span>

                    <span className="text-[10px] font-mono text-muted-foreground">
                      {st.city ? `${st.city}/${st.state || ""}` : "Local"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-muted p-1 flex items-center justify-center shrink-0 overflow-hidden border">
                      {st.logo_url ? (
                        <img
                          src={st.logo_url}
                          alt={st.name}
                          className="size-full object-cover rounded-xl"
                        />
                      ) : (
                        <Building2 className="size-5 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{st.name}</h3>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        @{st.slug}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ações de Credenciamento */}
                <div className="pt-3 border-t flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isApproved ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(st.id, "revoked")}
                        className="h-8 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        {isUpdating ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <XCircle className="size-3.5 mr-1" />}
                        <span>Revogar</span>
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(st.id, "approved")}
                        className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isUpdating ? (
                          <Loader2 className="size-3.5 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="size-3.5 mr-1" />
                        )}
                        <span>Aprovar Credencial</span>
                      </Button>
                    )}

                    {!isApproved && !isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(st.id, "pending")}
                        className="h-8 rounded-xl text-xs font-bold"
                      >
                        <span>Analisar</span>
                      </Button>
                    )}
                  </div>

                  <Button asChild variant="ghost" size="icon" className="size-8 rounded-xl">
                    <Link to="/c/$storeSlug" params={{ storeSlug: st.slug }} target="_blank">
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
