import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCommunityBySlug,
  getCommunityFeed,
  toggleCommunityMembership,
  type CommunityDetailDTO,
  type CommunityFeedResponse,
} from "@/services/community.functions";
import { getUserSession, getProfile } from "@/services/auth.functions";
import { CommunityFeedHeader } from "@/components/community/ThreadsCommunityHeader";
import { CommunityFeedView } from "@/components/community/ThreadsCommunityFeed";
import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";
import { CommunitySettingsModal } from "@/components/community/CommunitySettingsModal";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, ArrowLeft, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/c/$slug")({
  head: ({ loaderData }: any) => {
    const title = loaderData?.initialData?.community?.title || "Comunidade";
    const desc = loaderData?.initialData?.community?.description || "Participe da comunidade no Waesy!";
    return {
      meta: [
        { title: `${title} | Comunidade Waesy` },
        { name: "description", content: desc },
      ],
    };
  },
  loader: async ({ params }) => {
    const slug = params.slug;
    try {
      const [initialData, session, profile] = await Promise.all([
        getCommunityBySlug({ data: { slug } }).catch(() => null),
        getUserSession().catch(() => null),
        getProfile().catch(() => null),
      ]);

      let initialFeed: CommunityFeedResponse = { items: [], hasMore: false, nextCursor: null };
      if (initialData?.community?.id) {
        initialFeed = await getCommunityFeed({
          data: { communityId: initialData.community.id, limit: 20 },
        }).catch(() => ({ items: [], hasMore: false, nextCursor: null }));
      }

      return {
        slug,
        initialData,
        initialFeed,
        session,
        profile,
      };
    } catch (err) {
      console.error("[loader:_store.c.$slug] Error:", err);
      return {
        slug,
        initialData: null,
        initialFeed: { items: [], hasMore: false, nextCursor: null },
        session: null,
        profile: null,
      };
    }
  },
  component: CommunityPage,
});

function CommunityPage() {
  const { slug, initialData, initialFeed, session, profile } = (Route.useLoaderData?.() as any) || {};
  const qc = useQueryClient();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const currentUserId = (session as any)?.user?.id || (profile as any)?.id || null;

  // Query reativa para detalhes da comunidade
  const { data: detail } = useQuery({
    queryKey: ["community-detail", slug],
    queryFn: () => getCommunityBySlug({ data: { slug } }),
    initialData: initialData || undefined,
    staleTime: 30_000,
  });

  const community = detail?.community;
  const isMember = Boolean(detail?.is_member);
  const isOwnerOrMod =
    detail?.member_role === "owner" ||
    detail?.member_role === "moderator" ||
    (profile as any)?.role === "platform_admin";
  const recentMembers = detail?.recent_members || [];

  // Query reativa para o feed da comunidade
  const { data: feedData, isLoading: isFeedLoading } = useQuery({
    queryKey: ["community-feed", community?.id],
    queryFn: () =>
      getCommunityFeed({
        data: { communityId: community!.id, limit: 20 },
      }),
    initialData: initialFeed,
    enabled: Boolean(community?.id),
    staleTime: 15_000,
  });

  // Toggle de adesão
  const joinMutation = useMutation({
    mutationFn: () => toggleCommunityMembership({ data: { communityId: community!.id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["community-detail", slug] });
      if (res.isMember) {
        toast.success(`Você agora faz parte de "${community!.title}"!`);
      } else {
        toast.info(`Você saiu de "${community!.title}".`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar participação.");
    },
  });

  // Se comunidade não for encontrada
  if (!community) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
        <div className="size-16 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground">
          <Users className="size-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Comunidade não encontrada</h2>
          <p className="text-xs text-muted-foreground">
            O espaço <span className="font-mono text-primary">/c/@{slug}</span> ainda não existe ou foi arquivado.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            asChild
            className="h-11 min-h-11 rounded-full px-5 text-xs font-bold"
          >
            <Link to="/mural" className="focus-visible:ring-2 focus-visible:ring-primary">
              <ArrowLeft className="size-4 mr-2" />
              <span>Ver Mural</span>
            </Link>
          </Button>
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-11 min-h-11 rounded-full px-5 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4 mr-2" />
            <span>Criar Esta Comunidade</span>
          </Button>
        </div>

        <CreateCommunityModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      </div>
    );
  }

  // Filtragem local de posts se houver termo de busca
  const allPosts = feedData?.items || [];
  const filteredPosts = searchTerm.trim()
    ? allPosts.filter(
        (p: any) =>
          p.content_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.author.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allPosts;

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24 transition-colors duration-200">
      {/* ─── 1. Header Squircle de Capa ───────────────────────── */}
      <CommunityFeedHeader
        community={community}
        isMember={isMember}
        isOwnerOrMod={isOwnerOrMod}
        recentMembers={recentMembers}
        onSearchChange={setSearchTerm}
        onJoinToggle={() => joinMutation.mutate()}
        onNewPostClick={() => setIsComposerOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      {/* ─── 2. Feed Cronológico de Publicações ─────────────────────── */}
      <main className="pt-2">
        <CommunityFeedView
          posts={filteredPosts}
          communityId={community.id}
          currentUserId={currentUserId}
          isLoading={isFeedLoading}
          onNewPostClick={() => setIsComposerOpen(true)}
        />
      </main>

      {/* ─── 3. Modais de Ação ───────────────────────────────────────── */}
      <CommunityPostComposer
        communityId={community.id}
        communityType={community.community_type}
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
      />

      {isOwnerOrMod && (
        <CommunitySettingsModal
          community={community}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
