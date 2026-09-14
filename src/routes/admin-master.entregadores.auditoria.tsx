/**
 * admin-master.entregadores.auditoria.tsx — Painel Forense do CISO / Admin Master
 * Auditoria Bilateral de Inscrições de Entregadores, Cross-Check de IA, Minivídeos de Liveness e Dossiê Policial.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
    Warning,
  CheckCircle,
  XCircle,
  Eye,
  Motorcycle,
  Car,
  Truck,
  VideoCamera,
  Camera,
  FileText,
  User,
  Siren,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listCourierApplicationsForAudit,
  auditCourierApplication,
  type CourierApplicationDTO,
} from "@/services/courier-verification.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-master/entregadores/auditoria")({
  head: () => ({
    meta: [{ title: "Auditoria Forense de Entregadores | Admin Master Waesy" }],
  }),
  loader: async () => {
    try {
    const applications = await listCourierApplicationsForAudit({ data: { status: "all" } }).catch(
      () => []
    );
    return { applications };
    } catch (err) {
      console.error("[loader:admin-master.entregadores.auditoria] Unhandled loader error:", err);
      return { applications: null };
    }
  },
  component: AdminCourierAuditPage,
});

function AdminCourierAuditPage() {
  const { applications: initialApps } = ((Route.useLoaderData?.() as any) || {});
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<CourierApplicationDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data: applications, refetch, isFetching } = useQuery({
    queryKey: ["admin-courier-applications", selectedStatus],
    queryFn: () =>
      listCourierApplicationsForAudit({
        data: { status: selectedStatus === "all" ? undefined : selectedStatus },
      }),
    initialData: initialApps,
  });

  const handleAuditDecision = (
    applicationId: string,
    decision: "match_approved" | "fraud_rejected" | "requires_resubmission",
    notifyPolice = false
  ) => {
    startTransition(async () => {
      try {
        await auditCourierApplication({
          data: {
            applicationId,
            decision,
            notifyPolice,
            rejectionReason:
              decision === "fraud_rejected"
                ? "Divergência grosseira de titularidade e suspeita de uso de documento de terceiro."
                : undefined,
          },
        });
        toast.success(
          decision === "match_approved"
            ? "Candidatura aprovada com sucesso!"
            : decision === "fraud_rejected"
            ? "Fraude registrada e dossiê encaminhado!"
            : "Solicitação de reenvio despachada."
        );
        setSelectedApp(null);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Erro na auditoria.");
      }
    });
  };

  const appList = applications || [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24 p-4 sm:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link to="/admin-master" className="hover:text-foreground">
              Admin Master
            </Link>
            <span>/</span>
            <span className="text-foreground">Auditoria de Entregadores</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck size={26} weight="bold" className="text-primary" />
            <span>Auditoria de Parceiros</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Inspeção biométrica em 2 etapas, minivídeos de liveness, cross-check anti-fraude e comunicação legal.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-xl h-9 text-xs font-semibold gap-1.5"
        >
          <ArrowsClockwise size={14} className={isFetching ? "animate-spin" : ""} />
          <span>Atualizar Fila</span>
        </Button>
      </div>

      {/* Filtros de Status */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {[
          { id: "all", label: "Todos os Cadastros" },
          { id: "divergence_flagged", label: "⚠️ Divergência Detectada", alert: true },
          { id: "manual_review", label: "⏳ Análise Manual" },
          { id: "match_approved", label: "🟢 Aprovados" },
          { id: "fraud_rejected", label: "🚨 Fraude Rejeitada" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              selectedStatus === tab.id
                ? "bg-foreground text-background font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela de Inscrições */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-mono uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Modal</th>
                <th className="px-4 py-3">Cross-Check IA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {appList.map((app: any) => {
                const details = app.crosscheck_details || {};
                const isDivergent = app.crosscheck_status === "divergence_flagged";
                const isApproved = app.crosscheck_status === "match_approved";
                const isFraud = app.crosscheck_status === "fraud_rejected";

                return (
                  <tr key={app.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{app.full_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        CNH: {app.document_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{app.cpf}</td>
                    <td className="px-4 py-3 capitalize font-mono text-[11px]">
                      {app.vehicle_type}
                      {app.vehicle_plate && (
                        <span className="block text-[10px] text-muted-foreground">
                          {app.vehicle_plate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span>Match Face:</span>
                        <strong
                          className={
                            (details.face_match_score || 0) >= 0.8
                              ? "text-emerald-600 font-bold"
                              : "text-amber-600 font-bold"
                          }
                        >
                          {Math.round((details.face_match_score || 0) * 100)}%
                        </strong>
                      </div>
                      {details.divergence_reasons && details.divergence_reasons.length > 0 && (
                        <span className="text-[10px] text-destructive block truncate max-w-[200px]">
                          {details.divergence_reasons[0]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isDivergent && (
                        <Badge className="bg-amber-500/20 text-amber-600 text-[10px] font-bold">
                          Divergência
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px] font-bold">
                          Aprovado
                        </Badge>
                      )}
                      {isFraud && (
                        <Badge className="bg-destructive/20 text-destructive text-[10px] font-bold">
                          Fraude / Polícia
                        </Badge>
                      )}
                      {!isDivergent && !isApproved && !isFraud && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {app.crosscheck_status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                      {new Date(app.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApp(app)}
                        className="rounded-xl h-8 px-3 text-xs font-semibold gap-1"
                      >
                        <Eye size={13} />
                        <span>Inspecionar</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {appList.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    Nenhuma inscrição encontrada nesta categoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inspeção Forense Lado a Lado */}
      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>Dossiê Forense de Credenciamento de Parceiro</span>
                <span className="font-mono text-xs text-muted-foreground font-normal">
                  ID: #{selectedApp.id.slice(0, 8)}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Alerta de Divergência se houver */}
              {selectedApp.crosscheck_details?.divergence_reasons &&
                selectedApp.crosscheck_details.divergence_reasons.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase">
                      <Warning size={16} weight="bold" />
                      <span>Incompatibilidades de Dados Identificadas pela IA:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-foreground/90 space-y-0.5">
                      {selectedApp.crosscheck_details.divergence_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Inspeção de Imagens Lado a Lado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Foto da CNH */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <FileText size={14} />
                    <span>CNH / Documento</span>
                  </Label>
                  <div className="aspect-[4/3] rounded-xl border border-border overflow-hidden bg-muted/30">
                    <img
                      src={selectedApp.document_front_url}
                      alt="CNH"
                      className="size-full object-cover"
                    />
                  </div>
                </div>

                {/* 2. Selfie do Condutor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Camera size={14} />
                    <span>Selfie Cadastrada</span>
                  </Label>
                  <div className="aspect-[4/3] rounded-xl border border-border overflow-hidden bg-muted/30">
                    <img
                      src={selectedApp.selfie_url}
                      alt="Selfie"
                      className="size-full object-cover"
                    />
                  </div>
                </div>

                {/* 3. Minivídeo de Liveness */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <VideoCamera size={14} />
                    <span>Minivídeo Liveness (Prova de Vida)</span>
                  </Label>
                  <div className="aspect-[4/3] rounded-xl border border-border overflow-hidden bg-black flex items-center justify-center">
                    {selectedApp.liveness_video_url.endsWith(".mp4") ||
                    selectedApp.liveness_video_url.endsWith(".webm") ? (
                      <video
                        src={selectedApp.liveness_video_url}
                        controls
                        className="size-full object-contain"
                      />
                    ) : (
                      <img
                        src={selectedApp.liveness_video_url}
                        alt="Liveness"
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Dados Cadastrais em Colunas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border/40 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                    Nome Candidato
                  </span>
                  <strong className="text-foreground">{selectedApp.full_name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                    CPF Candidato
                  </span>
                  <strong className="text-foreground font-mono">{selectedApp.cpf}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                    Veículo / Placa
                  </span>
                  <strong className="text-foreground">
                    {selectedApp.vehicle_type} ({selectedApp.vehicle_plate || "S/ Placa"})
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                    Titular da Conta
                  </span>
                  <strong className="text-foreground">
                    {selectedApp.crosscheck_details?.initial_kyc_name || "N/D"}
                  </strong>
                </div>
              </div>

              {/* Barra de Ações de Auditoria Forense */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    handleAuditDecision(selectedApp.id, "requires_resubmission")
                  }
                  disabled={isPending}
                  className="rounded-xl h-10 px-4 text-xs font-semibold"
                >
                  Solicitar Reenvio de Documento
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      handleAuditDecision(selectedApp.id, "fraud_rejected", true)
                    }
                    disabled={isPending}
                    className="rounded-xl h-10 px-4 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Siren size={15} weight="bold" />
                    <span>Rejeitar Fraude & Registrar Notificação</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() =>
                      handleAuditDecision(selectedApp.id, "match_approved")
                    }
                    disabled={isPending}
                    className="rounded-xl h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Aprovar Credenciamento</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
