import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  MapPin,
  Briefcase,
  UserCheck,
  UserPlus,
  ExternalLink,
  MessageCircle,
  Loader2,
} from "lucide-react";
import {
  getPublicMemberProfile,
  toggleUserFollow,
  getUserFollowStatus,
} from "@/services/social.functions";
import { toast } from "sonner";

export interface QuickProfilePeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId?: string;
  initialData?: {
    name?: string;
    username?: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
    bio?: string | null;
  };
}

export function QuickProfilePeekModal({
  isOpen,
  onClose,
  profileId,
  initialData,
}: QuickProfilePeekModalProps) {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["public-member-peek", profileId],
    queryFn: () => getPublicMemberProfile({ data: { profileId: profileId || "" } }),
    enabled: isOpen && !!profileId,
    staleTime: 60_000,
  });

  const resolvedId = (profile as any)?.id || profileId;

  const { data: followStatus } = useQuery({
    queryKey: ["user-follow-status", resolvedId],
    queryFn: () => getUserFollowStatus({ data: { targetUserId: resolvedId } }),
    enabled: isOpen && !!resolvedId,
  });

  const [isFollowingLocal, setIsFollowingLocal] = useState<boolean | null>(null);

  const isFollowing =
    isFollowingLocal !== null
      ? isFollowingLocal
      : followStatus?.following ?? false;

  const followMutation = useMutation({
    mutationFn: () => toggleUserFollow({ data: { targetUserId: resolvedId } }),
    onMutate: () => {
      const next = !isFollowing;
      setIsFollowingLocal(next);
      return { prev: isFollowing };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx) setIsFollowingLocal(ctx.prev);
      toast.error(err?.message || "Não foi possível atualizar o seguidor.");
    },
    onSuccess: (data) => {
      setIsFollowingLocal(data.following);
      qc.invalidateQueries({ queryKey: ["user-follow-status", resolvedId] });
      toast.success(
        data.following ? "Você começou a seguir este perfil!" : "Você deixou de seguir este perfil."
      );
    },
  });

  const memberName = (profile as any)?.full_name || initialData?.name || "Membro da Comunidade";
  const memberUsername = (profile as any)?.username || initialData?.username || "";
  const memberAvatar = (profile as any)?.avatar_url || initialData?.avatarUrl || null;
  const isVerified = (profile as any)?.is_verified || initialData?.isVerified || false;
  const memberBio = (profile as any)?.bio || initialData?.bio || "";
  const memberOccupation = (profile as any)?.occupation || "";
  const memberCity = (profile as any)?.city || "";
  const followersCount = (profile as any)?.stats?.followers_count || 0;
  const followingCount = (profile as any)?.stats?.following_count || 0;

  const profileHref = memberUsername ? `/u/${memberUsername}` : resolvedId ? `/membro/${resolvedId}` : "#";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[92vw] max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl border border-border/60 bg-card text-foreground shadow-2xl z-50 pt-[max(1.25rem,env(safe-area-inset-top))]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil de {memberName}</DialogTitle>
        </DialogHeader>

        {/* ─── Topo de Banner Decorativo Sutil ─────────────────────────── */}
        <div className="h-20 bg-linear-to-r from-primary/15 via-primary/5 to-muted/40 relative" />

        {/* ─── Corpo do Perfil (Apple HIG & Anti-AI Smell) ─────────────── */}
        <div className="px-5 pb-5 -mt-10 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <Avatar className="size-20 rounded-2xl border-4 border-card shadow-md">
              {memberAvatar && (
                <AvatarImage
                  src={memberAvatar}
                  alt={memberName}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="rounded-2xl text-xl font-bold bg-primary/10 text-primary">
                {memberName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Button
              type="button"
              variant={isFollowing ? "outline" : "default"}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 h-11 min-h-11 px-5 rounded-xl font-semibold text-xs transition-colors duration-200 cursor-pointer select-none"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              {followMutation.isPending ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="size-4 mr-2" />
                  Seguindo
                </>
              ) : (
                <>
                  <UserPlus className="size-4 mr-2" />
                  Seguir
                </>
              )}
            </Button>
          </div>

          {/* Nome e Identificação */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground leading-tight">
                {memberName}
              </h2>
              {isVerified && (
                <Badge
                  variant="outline"
                  className="px-2 py-0 h-5 text-2xs font-semibold border-primary/30 bg-primary/10 text-primary flex items-center gap-1"
                >
                  <ShieldCheck className="size-3" />
                  Verificado
                </Badge>
              )}
            </div>
            {memberUsername && (
              <p className="text-xs font-medium text-muted-foreground">
                @{memberUsername}
              </p>
            )}
          </div>

          {/* Ocupação e Cidade */}
          {(memberOccupation || memberCity) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {memberOccupation && (
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3.5 shrink-0" />
                  {memberOccupation}
                </span>
              )}
              {memberCity && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  {memberCity}
                </span>
              )}
            </div>
          )}

          {/* Biografia Completa (Regra B.35: Proibido Truncar Biografia) */}
          {memberBio ? (
            <p className="text-xs text-foreground/90 whitespace-pre-line break-words text-anti-truncate leading-relaxed pt-1">
              {memberBio}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              Membro da comunidade Waesy.
            </p>
          )}

          {/* Barra Compacta de Métricas Sociais */}
          <div className="flex items-center gap-4 py-2 border-y border-border/40 text-xs">
            <span className="text-muted-foreground">
              <strong className="font-bold text-foreground mr-1">
                {followersCount}
              </strong>
              Seguidores
            </span>
            <span className="text-muted-foreground">
              <strong className="font-bold text-foreground mr-1">
                {followingCount}
              </strong>
              Seguindo
            </span>
          </div>

          {/* Ações Secundárias (Piso 44px) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 rounded-xl text-xs font-semibold border-border/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Link
                to={profileHref as any}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center justify-center"
                onClick={onClose}
              >
                <ExternalLink className="size-3.5 mr-2" />
                Ver Perfil
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 rounded-xl text-xs font-semibold border-border/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Link
                to={resolvedId ? (`/conta/conversas/${resolvedId}` as any) : ("/conta/conversas" as any)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center justify-center"
                onClick={onClose}
              >
                <MessageCircle className="size-3.5 mr-2" />
                Mensagem
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
