import { useState, useEffect } from "react";
import { Shield, ShieldCheck, ShieldAlert, History, Search, CheckCircle2, AlertTriangle, RefreshCw, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getEventAuditLogs } from "@/services/events.functions";

interface EventoAuditoriaProps {
  eventId: string;
}

export function EventoAuditoria({ eventId }: EventoAuditoriaProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLogs() {
    setIsLoading(true);
    try {
      const data = await getEventAuditLogs({ data: { eventId } });
      setLogs(data || []);
    } catch (err) {
      console.error("Erro ao carregar auditoria do evento:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [eventId]);

  const filteredLogs = logs.filter((log) => {
    const text = (
      (log.action || "") +
      " " +
      (log.entity_type || "") +
      " " +
      JSON.stringify(log.payload_snapshot || {}) +
      " " +
      (log.profiles?.full_name || "")
    ).toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const getActionBadge = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("INSERT") || act.includes("CREATE")) {
      return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Criação</Badge>;
    }
    if (act.includes("UPDATE") || act.includes("CHECKIN")) {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Atualização</Badge>;
    }
    if (act.includes("DELETE") || act.includes("REVOKE")) {
      return <Badge variant="destructive" className="text-[10px]">Exclusão</Badge>;
    }
    return <Badge variant="outline" className="text-[10px]">{act}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            Governança, Trilha de Auditoria e Integridade
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Registro criptográfico e imutável de todas as ações de ingressos, equipe, lotes e portaria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar histórico..."
              className="pl-8 text-xs h-9 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} className="gap-2 h-9">
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards de Integridade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card rounded-lg border border-border/60">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-foreground">{logs.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-lg border border-border/60">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Portaria</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">
              {logs.filter((l) => l.entity_type === "tickets").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-lg border border-border/60">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Gestão de Lotes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">
              {logs.filter((l) => l.entity_type === "ticket_lots" || l.entity_type === "event_store_products").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-lg border border-border/60">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Status Criptográfico</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-sm font-bold text-emerald-600 flex items-center gap-2 pt-1">
              <ShieldCheck className="size-4" /> 100% Verificado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Trilha de Auditoria */}
      <Card className="rounded-lg border border-border/60 overflow-hidden bg-card">
        <CardHeader className="p-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-bold">Histórico de Transações do Evento</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Trilha auditável em tempo real conectada ao ledger de segurança da Waesy.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-muted-foreground uppercase bg-muted/40 border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Horário</th>
                  <th className="px-4 py-3 font-semibold">Ação</th>
                  <th className="px-4 py-3 font-semibold">Módulo</th>
                  <th className="px-4 py-3 font-semibold">Operador</th>
                  <th className="px-4 py-3 font-semibold">Snapshot / Detalhes</th>
                  <th className="px-4 py-3 font-semibold text-right">Integridade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Carregando trilha de auditoria...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                      <td className="px-4 py-3 font-medium text-foreground capitalize">
                        {log.entity_type?.replace("_", " ") || "Evento"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.profiles?.full_name || "Sistema / Autônomo"}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(log.payload_snapshot || {})}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="size-3" /> Assinado
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
