import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  createContractAddendum,
  listContractAddendums,
} from "@/services/travel-contract.functions";

interface ContractAddendumRow {
  id: string;
  contract_id: string;
  title: string;
  content: string;
  status: string | null;
  created_at: string | null;
  signed_at: string | null;
}

export interface ContractAddendumsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  contractTitle: string;
  contractStatus: string;
  onCreated?: () => void;
}

const ADDENDUM_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando Assinatura",
  pending_signature: "Aguardando Assinatura",
  signed: "Assinado",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

function formatDatePtBr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("pt-BR");
}

export function ContractAddendumsSheet({
  open,
  onOpenChange,
  contractId,
  contractTitle,
  contractStatus,
  onCreated,
}: ContractAddendumsSheetProps) {
  const queryClient = useQueryClient();
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const canCreateAddendum = contractStatus === "signed";

  const {
    data: addendums = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["travel-contract-addendums", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const rows = await listContractAddendums({ data: { contractId } });
      return (Array.isArray(rows) ? rows : []) as ContractAddendumRow[];
    },
    enabled: open && Boolean(contractId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!contractId) {
        throw new Error("Contrato não selecionado.");
      }
      return createContractAddendum({
        data: {
          contractId,
          title: title.trim(),
          content: content.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Aditivo registrado no contrato.");
      setTitle("");
      setContent("");
      setIsComposing(false);
      queryClient.invalidateQueries({
        queryKey: ["travel-contract-addendums", contractId],
      });
      onCreated?.();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Falha ao registrar aditivo.";
      toast.error(message);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsComposing(false);
      setTitle("");
      setContent("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2 || content.trim().length < 5) {
      toast.error("Preencha título e teor da cláusula aditiva.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent size="md" className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Aditivos Contratuais</SheetTitle>
          <SheetDescription className="truncate">
            {contractTitle || "Documento de viagem"}
          </SheetDescription>
        </SheetHeader>

        {canCreateAddendum && !isComposing ? (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={() => setIsComposing(true)}
              className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              <span>Novo Aditivo</span>
            </Button>
          </div>
        ) : null}

        {!canCreateAddendum ? (
          <p className="text-xs text-muted-foreground">
            Novos aditivos exigem contrato assinado.
          </p>
        ) : null}

        {isComposing ? (
          <form onSubmit={handleSubmit} className="space-y-4 border-y border-border py-4">
            <div className="space-y-2">
              <Label htmlFor="addendum-title">Título do Aditivo</Label>
              <Input
                id="addendum-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Alteração de datas ou hóspede extra"
                required
                minLength={2}
                maxLength={140}
                className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addendum-content">Cláusulas e Condições</Label>
              <Textarea
                id="addendum-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Descreva as alterações acordadas entre agência e contratante..."
                rows={4}
                required
                minLength={5}
                className="min-h-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsComposing(false);
                  setTitle("");
                  setContent("");
                }}
                disabled={createMutation.isPending}
                className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : null}
                <span>Salvar Aditivo</span>
              </Button>
            </div>
          </form>
        ) : null}

        <div className="flex-1 space-y-3 pb-6 pb-safe">
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Carregando aditivos">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Não foi possível carregar os aditivos."}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                <span>Tentar Novamente</span>
              </Button>
            </div>
          ) : addendums.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 p-8 text-center">
              <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
                Nenhum aditivo registrado
              </p>
            </div>
          ) : (
            addendums.map((item) => {
              const statusText =
                ADDENDUM_STATUS_LABEL[item.status ?? "pending"] ??
                item.status ??
                "Pendente";
              const createdDate = formatDatePtBr(item.created_at);
              const signedDate = formatDatePtBr(item.signed_at);

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {item.title}
                    </h4>
                    <Badge
                      variant={item.status === "signed" ? "success" : "warning"}
                    >
                      {statusText}
                    </Badge>
                  </div>

                  <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground tabular-nums">
                    {createdDate ? <span>Emitido em {createdDate}</span> : null}
                    {signedDate ? (
                      <span className="text-success font-medium">
                        Assinado em {signedDate}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
