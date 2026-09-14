import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Trash2,
  Image as ImageIcon,
  CalendarCheck,
  Send,
} from "lucide-react";
import {
  InstagramLogo,
  FacebookLogo,
  TiktokLogo,
  TwitterLogo,
  ThreadsLogo,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  listSocialPosts,
  createSocialPost,
  publishSocialPost,
  deleteSocialPost,
  type SocialPostDTO,
  type SocialNetwork,
} from "@/services/social-publisher.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/workspace/marketing/publicacoes")({
  head: () => ({
    meta: [{ title: "Publicações em Redes Sociais | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const posts = await listSocialPosts();
      return { initialPosts: posts };
    } catch {
      return { initialPosts: [] };
    }
  },
  component: SocialPublicacoesPage,
});

const NETWORK_META: Record<SocialNetwork, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: "Instagram", icon: InstagramLogo, color: "text-pink-500" },
  facebook: { label: "Facebook", icon: FacebookLogo, color: "text-blue-600" },
  tiktok: { label: "TikTok", icon: TiktokLogo, color: "text-foreground" },
  twitter: { label: "X (Twitter)", icon: TwitterLogo, color: "text-sky-500" },
  threads: { label: "Threads", icon: ThreadsLogo, color: "text-foreground" },
};

const STATUS_BADGE: Record<SocialPostDTO["status"], { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", className: "text-muted-foreground border-border/60", icon: Globe },
  scheduled: { label: "Agendado", className: "text-amber-700 border-amber-400/40 bg-amber-400/10", icon: Clock },
  publishing: { label: "Publicando...", className: "text-blue-700 border-blue-400/40 bg-blue-400/10", icon: Send },
  published: { label: "Publicado", className: "text-emerald-700 border-emerald-400/40 bg-emerald-400/10", icon: CheckCircle2 },
  failed: { label: "Falhou", className: "text-red-700 border-red-400/40 bg-red-400/10", icon: AlertCircle },
};

const ALL_NETWORKS: SocialNetwork[] = ["instagram", "facebook", "tiktok", "twitter", "threads"];

function NetworkIcon({ network }: { network: SocialNetwork }) {
  const meta = NETWORK_META[network];
  const Icon = meta.icon;
  return <Icon className={cn("w-4 h-4", meta.color)} weight="fill" />;
}

function SocialPublicacoesPage() {
  const { initialPosts } = Route.useLoaderData();
  const qc = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [content, setContent] = useState("");
  const [selectedNetworks, setSelectedNetworks] = useState<SocialNetwork[]>(["instagram"]);

  const { data: posts = initialPosts, isLoading } = useQuery({
    queryKey: ["social-posts"],
    queryFn: () => listSocialPosts(),
    initialData: initialPosts,
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof createSocialPost>[0]["data"]) =>
      createSocialPost({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      setIsOpen(false);
      setContent("");
      setSelectedNetworks(["instagram"]);
      toast.success("Rascunho criado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMut = useMutation({
    mutationFn: (postId: string) => publishSocialPost({ data: { postId } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      if (result.success) {
        toast.success("Post publicado com sucesso.");
      } else {
        toast.warning(result.post?.error_message || "Publicação parcialmente concluída.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (postId: string) => deleteSocialPost({ data: { postId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Post removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleNetwork = (net: SocialNetwork) => {
    setSelectedNetworks((prev) =>
      prev.includes(net)
        ? prev.length > 1
          ? prev.filter((n) => n !== net)
          : prev
        : [...prev, net]
    );
  };

  const filteredPosts =
    filterStatus === "all" ? posts : posts.filter((p) => p.status === filterStatus);

  const statusFilters = [
    { key: "all", label: "Todos" },
    { key: "draft", label: "Rascunhos" },
    { key: "scheduled", label: "Agendados" },
    { key: "published", label: "Publicados" },
    { key: "failed", label: "Falhos" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Publicações</h1>
        <Button size="sm" onClick={() => setIsOpen(true)} className="h-9 gap-1.5">
          <Plus className="w-4 h-4" />
          Nova publicação
        </Button>
      </div>

      {/* Aviso de configuração OAuth */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <span>
          Para publicar automaticamente, configure as credenciais OAuth de cada rede em{" "}
          <Link to="/workspace/configuracoes/integracoes" className="font-medium underline">
            Configurações → Integrações
          </Link>
          . Por enquanto, use o botão de download para postar manualmente.
        </span>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
              filterStatus === key
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border/60 hover:border-foreground/30"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista de posts */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Carregando...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum post encontrado.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
          >
            Criar primeiro post
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((post) => {
            const statusMeta = STATUS_BADGE[post.status];
            const StatusIcon = statusMeta.icon;
            return (
              <div
                key={post.id}
                className="bg-card border border-border/80 rounded-xl px-4 py-3 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm text-foreground line-clamp-2 leading-snug">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs gap-1 rounded-lg h-5",
                        statusMeta.className
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusMeta.label}
                    </Badge>
                    {/* Redes */}
                    <div className="flex items-center gap-1">
                      {(post.networks || []).map((net) => (
                        <NetworkIcon key={net} network={net as SocialNetwork} />
                      ))}
                    </div>
                    {/* Timestamp */}
                    <span className="text-xs text-muted-foreground/60">
                      {post.published_at
                        ? `Publicado ${formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ptBR })}`
                        : post.scheduled_at
                        ? `Agendado para ${new Date(post.scheduled_at).toLocaleDateString("pt-BR")}`
                        : `Criado ${formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}`}
                    </span>
                  </div>
                  {post.error_message && (
                    <p className="text-xs text-red-600/80">{post.error_message}</p>
                  )}
                </div>
                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  {post.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => publishMut.mutate(post.id)}
                      disabled={publishMut.isPending}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Publicar
                    </Button>
                  )}
                  {["draft", "failed", "scheduled"].includes(post.status) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => deleteMut.mutate(post.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Criar novo post */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nova publicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Conteúdo */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Legenda</Label>
              <Textarea
                placeholder="Escreva a legenda do post..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                maxLength={2200}
                className="resize-none text-sm rounded-xl"
              />
              <p className="text-xs text-muted-foreground/60 text-right">
                {content.length}/2200
              </p>
            </div>

            {/* Redes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Redes</Label>
              <div className="flex gap-2 flex-wrap">
                {ALL_NETWORKS.map((net) => {
                  const meta = NETWORK_META[net];
                  const Icon = meta.icon;
                  const selected = selectedNetworks.includes(net);
                  return (
                    <button
                      key={net}
                      onClick={() => toggleNetwork(net)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors min-h-[44px]",
                        selected
                          ? "bg-foreground text-background border-foreground"
                          : "border-border/60 text-muted-foreground hover:border-foreground/30"
                      )}
                    >
                      <Icon
                        className={cn("w-4 h-4", selected ? "text-background" : meta.color)}
                        weight="fill"
                      />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!content.trim() || selectedNetworks.length === 0 || createMut.isPending}
                onClick={() =>
                  createMut.mutate({
                    content: content.trim(),
                    networks: selectedNetworks,
                  })
                }
              >
                <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                Salvar rascunho
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
