import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Calendar,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SheetPage } from "@/components/ui/sheet-page";
import { MediaUploader } from "@/components/ui/media-uploader";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getStoreSettings } from "@/services/store.functions";
import {
  storeListConcursos,
  storeCreateConcurso,
  storeUpdateConcurso,
  storeCancelConcurso,
  storeDrawConcurso,
  storeGetConcursoParticipants,
} from "@/services/invite.functions";

export const Route = createFileRoute("/workspace/marketing/concursos")({
  head: () => ({
    meta: [{ title: "Sorteios da Loja | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [concursos, store] = await Promise.all([
        storeListConcursos().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return { concursos: concursos || [], store };
    } catch (err) {
      console.error("[loader:workspace.marketing.concursos]", err);
      return { concursos: [], store: null };
    }
  },
  component: WorkspaceConcursosPage,
});

function getNichePrizePlaceholder(nicheId: string): string {
  switch (nicheId) {
    case "tourism":
      return "Ex: Fim de Semana em Pousada com Café da Manhã ou Passeio com Guia";
    case "gastronomy":
      return "Ex: Jantar Especial para 2 Pessoas ou Combo Família da Casa";
    case "retail":
      return "Ex: Vale Compras de R$ 300 ou Look Completo da Coleção";
    case "services":
      return "Ex: Dia de Cuidados Completo ou Pacote com 3 Sessões";
    case "pet":
      return "Ex: Banho & Tosa Especial com Hidratação ou Kit de Produtos Pet";
    case "events":
      return "Ex: Par de Ingressos VIP com Acesso aos Bastidores";
    case "tech_repair":
      return "Ex: Película 3D Premium e Capa Protetora ou Desconto no Próximo Reparo";
    default:
      return "Ex: Vale Compras de R$ 500 ou Kit Especial de Produtos";
  }
}

function WorkspaceConcursosPage() {
  const { concursos, store } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const semantics = getNicheSemantics(store);
  const prizePlaceholder = getNichePrizePlaceholder(semantics.nicheId);

  // Sheet states
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<any | null>(null);
  const [viewingParticipantsId, setViewingParticipantsId] = useState<string | null>(null);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [termsText, setTermsText] = useState(
    "Participe gratuitamente emitindo seu cupom da sorte. O sorteio será realizado na data estipulada e o vencedor poderá retirar o prêmio diretamente na loja apresentando o cupom contemplado."
  );
  const [drawDate, setDrawDate] = useState("");
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState("5");
  const [pointsCost, setPointsCost] = useState("0");

  const openCreateModal = () => {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setTermsText(
      "Participe gratuitamente emitindo seu cupom da sorte. O sorteio será realizado na data estipulada e o vencedor poderá retirar o prêmio diretamente na loja apresentando o cupom contemplado."
    );
    setDrawDate("");
    setMaxTicketsPerUser("5");
    setPointsCost("0");
    setEditingConcurso(null);
    setIsSheetOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingConcurso(c);
    setTitle(c.title);
    setDescription(c.description || "");
    setImageUrl(c.image_url || "");
    setTermsText(c.terms_text || "");
    try {
      const dt = new Date(c.draw_date);
      setDrawDate(dt.toISOString().slice(0, 16));
    } catch {
      setDrawDate("");
    }
    setMaxTicketsPerUser(String(c.max_tickets_per_user || 5));
    setPointsCost(String(c.points_cost || 0));
    setIsSheetOpen(true);
  };

  const handleSaveConcurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título do prêmio.");
      return;
    }
    if (!drawDate) {
      toast.error("Informe a data e horário do sorteio.");
      return;
    }
    if (!termsText.trim()) {
      toast.error("O regulamento do sorteio é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingConcurso) {
        await storeUpdateConcurso({
          data: {
            raffleId: editingConcurso.id,
            title: title.trim(),
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            termsText: termsText.trim(),
            drawDate: new Date(drawDate).toISOString(),
            maxTicketsPerUser: parseInt(maxTicketsPerUser, 10) || 5,
            pointsCost: parseInt(pointsCost, 10) || 0,
          },
        });
        toast.success("Sorteio atualizado com sucesso!");
      } else {
        await storeCreateConcurso({
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            termsText: termsText.trim(),
            drawDate: new Date(drawDate).toISOString(),
            maxTicketsPerUser: parseInt(maxTicketsPerUser, 10) || 5,
            pointsCost: parseInt(pointsCost, 10) || 0,
          },
        });
        toast.success("Sorteio publicado com sucesso!");
      }

      setIsSheetOpen(false);
      setEditingConcurso(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar sorteio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenParticipants = async (raffleId: string) => {
    setViewingParticipantsId(raffleId);
    setIsLoadingParticipants(true);
    try {
      const list = await storeGetConcursoParticipants({ data: { raffleId } });
      setParticipantsList(list);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar participantes.");
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleDraw = async (raffleId: string) => {
    if (!confirm("Deseja realizar a apuração e sortear o cupom vencedor agora?")) return;

    setDrawingId(raffleId);
    try {
      const res = await storeDrawConcurso({ data: { raffleId } });
      toast.success(`Sorteio concluído! Cupom vencedor #${res.ticketNumber}: ${res.winnerName}`);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao realizar sorteio.");
    } finally {
      setDrawingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── PageHeader Canônico Clean ── */}
      <PageHeader
        eyebrow="Marketing"
        title="Sorteios da Loja"
        actions={
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-11 px-5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
            <span>Novo Sorteio</span>
          </Button>
        }
      />

      {/* ── Lista de Sorteios ou Empty State ── */}
      {concursos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center space-y-4">
          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Ticket className="size-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-foreground">Nenhum sorteio ativo no momento</h2>
            <p className="text-xs text-muted-foreground">
              Crie sorteios e campanhas para premiar clientes da sua loja e movimentar as vendas na região.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-11 px-6 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Criar Primeiro Sorteio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {concursos.map((c: any) => {
            const isCompleted = c.status === "completed";
            const isCancelled = c.status === "cancelled";
            const drawDateFormatted = new Date(c.draw_date).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs flex flex-col justify-between hover:border-foreground/30 transition-all"
              >
                {/* Imagem no Aspecto Exato (16:9) */}
                {c.image_url ? (
                  <div className="relative aspect-video w-full bg-muted overflow-hidden border-b border-border/40">
                    <img
                      src={c.image_url}
                      alt={c.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <Badge
                        className={
                          isCompleted
                            ? "bg-black/70 text-white text-[10px] backdrop-blur-md"
                            : isCancelled
                            ? "bg-rose-600 text-white text-[10px]"
                            : "bg-emerald-600 text-white text-[10px] font-bold"
                        }
                      >
                        {isCompleted ? "Encerrado" : isCancelled ? "Cancelado" : "Em Andamento"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 pb-0 flex items-center justify-between">
                    <Badge
                      className={
                        isCompleted
                          ? "bg-muted text-muted-foreground text-[10px]"
                          : isCancelled
                          ? "bg-rose-500/15 text-rose-600 text-[10px]"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                      }
                    >
                      {isCompleted ? "Encerrado" : isCancelled ? "Cancelado" : "Em Andamento"}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {drawDateFormatted}
                    </span>
                  </div>
                )}

                <div className="p-5 space-y-3 flex-1">
                  {c.image_url && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="size-3" />
                        Sorteio em: {drawDateFormatted}
                      </span>
                    </div>
                  )}

                  <h3 className="text-base font-bold text-foreground leading-snug">{c.title}</h3>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="rounded-xl bg-muted/40 p-2.5 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">
                        Cupons Emitidos
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {c.totalTickets}
                      </span>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">
                        Limite por Cliente
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {c.max_tickets_per_user} cupons
                      </span>
                    </div>
                  </div>

                  {isCompleted && c.winner_ticket_number && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center gap-3">
                      <Trophy className="size-5 text-amber-500 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">
                          Cupom Vencedor #{c.winner_ticket_number}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          Sorteado em {new Date(c.drawn_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border/40 flex items-center justify-between gap-2 bg-card/40">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenParticipants(c.id)}
                      className="h-9 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
                    >
                      <Users className="size-3.5" />
                      <span>Participantes ({c.totalTickets})</span>
                    </Button>

                    {!isCompleted && !isCancelled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(c)}
                        className="h-9 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        <span>Editar</span>
                      </Button>
                    )}
                  </div>

                  {!isCompleted && !isCancelled && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={drawingId === c.id || c.totalTickets === 0}
                      onClick={() => handleDraw(c.id)}
                      className="h-10 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      {drawingId === c.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      <span>
                        {c.totalTickets === 0 ? "Aguardando Participantes" : "Sortear Agora"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SHEETPAGE CANÔNICA: CRIAÇÃO & EDIÇÃO SEM ESPREMER INPUTS ── */}
      <SheetPage
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        title={editingConcurso ? "Editar Sorteio" : "Novo Sorteio da Loja"}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              className="h-11 px-5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="sorteio-form"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl text-xs font-semibold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              <span>{editingConcurso ? "Salvar Alterações" : "Publicar Sorteio"}</span>
            </Button>
          </div>
        }
      >
        <form id="sorteio-form" onSubmit={handleSaveConcurso} className="space-y-6 py-2">
          {/* 1. UPLOAD CANÔNICO DE FOTO COM RECORTE 16:9 E ZOOM */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Foto de Capa do Prêmio</Label>
            <MediaUploader
              value={imageUrl ? [imageUrl] : []}
              onChange={(urls) => setImageUrl(urls[0] || "")}
              bucket="post-media"
              folder="raffles"
              accept="image"
              maxFiles={1}
              enableCrop={true}
              aspect={16 / 9}
            />
          </div>

          {/* 2. TÍTULO DO PRÊMIO COM PLACEHOLDER DO NICHO */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Título do Prêmio *</Label>
            <Input
              placeholder={prizePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl text-sm"
              required
            />
          </div>

          {/* 3. DESCRIÇÃO */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Descrição do Prêmio</Label>
            <Textarea
              placeholder="Descreva os itens inclusos, como retirar na loja e condições para o vencedor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl text-sm min-h-[90px] leading-relaxed"
            />
          </div>

          {/* 4. DATA & LIMITE (DUAS COLUNAS AMPLAS NO DESKTOP, FLUIDO NO MOBILE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data & Horário do Sorteio *</Label>
              <Input
                type="datetime-local"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="h-11 rounded-xl text-sm font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Máximo de Cupons por Cliente</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={maxTicketsPerUser}
                onChange={(e) => setMaxTicketsPerUser(e.target.value)}
                className="h-11 rounded-xl text-sm font-mono"
                required
              />
            </div>
          </div>

          {/* 5. CUSTO EM PONTOS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Pontos de Fidelidade (Opcional)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0 (Gratuito para qualquer cliente)"
              value={pointsCost}
              onChange={(e) => setPointsCost(e.target.value)}
              className="h-11 rounded-xl text-sm font-mono"
            />
          </div>

          {/* 6. REGULAMENTO DO SORTEIO */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Regulamento do Sorteio *</Label>
            <Textarea
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="rounded-xl text-xs min-h-[90px] leading-relaxed"
              required
            />
          </div>
        </form>
      </SheetPage>

      {/* ── SHEETPAGE: AUDITORIA DE PARTICIPANTES ── */}
      <SheetPage
        open={Boolean(viewingParticipantsId)}
        onOpenChange={(open) => {
          if (!open) setViewingParticipantsId(null);
        }}
        title="Participantes do Sorteio"
        size="default"
        footer={
          <div className="flex items-center justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewingParticipantsId(null)}
              className="h-11 px-5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>
          </div>
        }
      >
        {isLoadingParticipants ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs font-mono">Carregando lista de cupons...</span>
          </div>
        ) : participantsList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs font-mono">
            Nenhum cupom emitido até o momento.
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="text-xs font-mono text-muted-foreground pb-1">
              Total de {participantsList.length} cupons emitidos
            </div>
            <div className="divide-y divide-border/40 border border-border/50 rounded-2xl overflow-hidden bg-card">
              {participantsList.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 flex items-center justify-between text-xs gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-lg">
                      #{p.ticketNumber}
                    </span>
                    <div>
                      <span className="font-semibold text-foreground block">{p.userName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Emitido em {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>Confirmado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetPage>
    </div>
  );
}
