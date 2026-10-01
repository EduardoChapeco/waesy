import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, UserCheck, Search, Clock, ExternalLink, RefreshCw, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/state/states";
import { listWhatsAppLeads, claimWhatsAppLead } from "@/services/crm.functions";
import { formatDateTime } from "@/lib/datetime";
import { toast } from "sonner";

export function WhatsAppLeadsInbox() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "claimed">("all");

  const { data: leads = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["workspace-whatsapp-leads", statusFilter, search],
    queryFn: () => listWhatsAppLeads({ data: { status: statusFilter, search: search || undefined } }),
  });

  const claimMutation = useMutation({
    mutationFn: (leadId: string) => claimWhatsAppLead({ data: { leadId } }),
    onSuccess: () => {
      toast.success("Lead assumido com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["workspace-whatsapp-leads"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao assumir lead.");
    },
  });

  const handleOpenWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Telefone inválido.");
      return;
    }
    const message = encodeURIComponent(`Olá, ${name}! Sou da equipe de atendimento. Como posso te ajudar hoje?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* ── Barra de Filtros e Busca ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border/60">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="pl-9 min-h-11 rounded-md text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md">
            <button type="button" onClick={() => setStatusFilter("all")} className={`min-h-11 px-3 rounded-sm text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${statusFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>
              Todos
            </button>
            <button type="button" onClick={() => setStatusFilter("new")} className={`min-h-11 px-3 rounded-sm text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${statusFilter === "new" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>
              Novos
            </button>
            <button type="button" onClick={() => setStatusFilter("claimed")} className={`min-h-11 px-3 rounded-sm text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${statusFilter === "claimed" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>
              Assumidos
            </button>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isRefetching} className="min-h-11 px-3 rounded-md gap-2 cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden">
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* ── Lista de Leads ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-lg border border-border/60 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="Nenhum contato encontrado"
          description="Mensagens recebidas pelo webhook de WhatsApp serão listadas automaticamente aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {leads.map((lead: any) => (
            <Card
              key={lead.id}
              className="p-4 rounded-lg bg-card border border-border/60 hover:border-border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground text-sm truncate">{lead.name}</span>
                  <Badge
                    variant={lead.status === "new" ? "default" : "secondary"}
                    className="text-xs font-mono py-0 px-2 rounded-sm"
                  >
                    {lead.status === "new" ? "Novo" : "Assumido"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDateTime(lead.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="size-3 shrink-0" />
                  <span className="font-mono">{lead.phone}</span>
                </div>

                {lead.notes && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-2 bg-muted/40 p-2 rounded-md mt-1 font-sans">
                    {lead.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                {lead.status === "new" && (
                  <Button type="button" variant="outline" size="sm" onClick={() => claimMutation.mutate(lead.id)} disabled={claimMutation.isPending} className="min-h-11 px-4 rounded-md text-xs font-semibold gap-2 flex-1 sm:flex-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden">
                    <UserCheck className="size-3.5 text-primary" />
                    <span>Assumir</span>
                  </Button>
                )}

                <Button type="button" variant="default" size="sm" onClick={() => handleOpenWhatsApp(lead.phone, lead.name)} className="min-h-11 px-4 rounded-md text-xs font-semibold gap-2 flex-1 sm:flex-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden">
                  <MessageCircle className="size-3.5" />
                  <span>WhatsApp</span>
                  <ExternalLink className="size-3 opacity-70" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
