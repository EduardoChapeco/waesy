import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listReviews, updateReviewStatus } from "@/services/cms.functions";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/cms/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações & Moderação | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const res = await listReviews();
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error("[loader:workspace.cms.avaliacoes]", err);
      return [] as any[];
    }
  },
  component: CmsAvaliacoesPage,
});

function CmsAvaliacoesPage() {
  const router = useRouter();
  const reviews = Route.useLoaderData();
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredReviews = safeReviews.filter((r: any) =>
    filterStatus === "all" ? true : r.status === filterStatus,
  );

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    try {
      await updateReviewStatus({ data: { id, status } });
      toast.success(
        `Avaliação ${status === "approved" ? "aprovada" : status === "rejected" ? "rejeitada" : "recolocada como pendente"}.`,
      );
      router.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Aprovada</Badge>;
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            Rejeitada
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-warning border-warning/50 bg-warning/10">
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CMS"
        title="Moderação de Avaliações"
        description={`${safeReviews.length} avaliação${safeReviews.length !== 1 ? "ões" : ""} • ${safeReviews.filter((r: any) => r.status === "pending").length} pendentes`}
      />

      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Todas", icon: null },
          { value: "pending", label: "Pendentes", icon: Clock },
          { value: "approved", label: "Aprovadas", icon: CheckCircle },
          { value: "rejected", label: "Rejeitadas", icon: XCircle },
        ].map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={filterStatus === value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(value)}
            className="rounded-xl text-xs font-bold h-9 gap-1.5"
          >
            {Icon && <Icon className="size-3.5" />}
            {label}
          </Button>
        ))}
      </div>

      {filteredReviews.length === 0 ? (
        <EmptyState title="Nenhuma avaliação encontrada" />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review: any) => (
                <TableRow key={review.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {formatDate(review.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {review.products?.title || "Produto desconhecido"}
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-muted text-foreground">
                      {review.rating || 5} / 5
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs">
                    {review.comment || <span className="text-muted-foreground italic">Sem comentário</span>}
                  </TableCell>
                  <TableCell>{getStatusBadge(review.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {review.status !== "approved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-success border-success/20 hover:bg-success/10 rounded-xl text-xs h-8"
                          onClick={() => handleUpdateStatus(review.id, "approved")}
                        >
                          <CheckCircle className="size-3.5 mr-1" />
                          Aprovar
                        </Button>
                      )}
                      {review.status !== "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl text-xs h-8"
                          onClick={() => handleUpdateStatus(review.id, "rejected")}
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Rejeitar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
