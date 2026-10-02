import { UserPlus, Layers, Check, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import { toggleUserFollow } from "@/services/social.functions";

export interface SuggestedFriend {
 id: string;
 name: string;
 avatar_url?: string | null;
 reason?: string;
 bio?: string;
}

interface SuggestedFriendsBlockProps {
 friends: SuggestedFriend[];
}

export function SuggestedFriendsBlock({ friends = [] }: SuggestedFriendsBlockProps) {
 const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
 const [loadingId, setLoadingId] = useState<string | null>(null);

 if (friends.length === 0) return null;

 const handleToggleFollow = async (targetUserId: string, name: string) => {
 setLoadingId(targetUserId);
 try {
 const res = await toggleUserFollow({ data: { targetUserId } });
 setFollowedIds((prev) => {
 const next = new Set(prev);
 if (res.following) {
 next.add(targetUserId);
 } else {
 next.delete(targetUserId);
 }
 return next;
 });
 toast.success(
 res.following ? `Você agora está seguindo ${name}` : `Deixou de seguir ${name}`,
 );
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? err.message : String(err)) ||
 "Você precisa estar autenticado para seguir membros.",
 );
 } finally {
 setLoadingId(null);
 }
 };

 return (
 <div className="w-full my-4 squircle-soft bg-card p-4">
 <div className="flex items-center justify-between mb-3 px-1">
 <div className="flex items-center gap-2">
 <Layers className="size-4 text-primary" />
 <h3 className="text-sm font-semibold text-foreground">Pessoas para Conectar</h3>
 </div>
 <span className="text-xs text-muted-foreground">Membros reais na comunidade</span>
 </div>

 <ScrollArea className="w-full whitespace-nowrap">
 <div className="flex gap-3 py-1">
 {friends.map((friend) => {
 const isFollowing = followedIds.has(friend.id);
 const isLoading = loadingId === friend.id;

 return (
 <div
 key={friend.id}
 className="flex flex-col items-center justify-between w-[140px] p-3 squircle-soft squircle-hover bg-background text-center shrink-0"
 >
 <Avatar className="size-14 ring-2 ring-primary/20 mb-2">
 <AvatarImage src={friend.avatar_url ?? ""} />
 <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
 {friend.name.charAt(0)}
 </AvatarFallback>
 </Avatar>

 <p className="text-xs font-bold text-foreground truncate w-full">{friend.name}</p>
 <p className="text-[10px] text-muted-foreground truncate w-full mt-1 mb-3">
 {friend.reason || "Membro comunitário"}
 </p>

 <Button
 size="sm"
 variant={isFollowing ? "outline" : "default"}
 className="w-full h-7 text-xs rounded-lg font-medium"
 disabled={isLoading}
 onClick={() => handleToggleFollow(friend.id, friend.name)}
 >
 {isLoading ? (
 <Loader2 className="size-3 animate-spin" />
 ) : isFollowing ? (
 <>
 <Check className="size-3 mr-1" /> Seguindo
 </>
 ) : (
 <>
 <UserPlus className="size-3 mr-1" /> Seguir
 </>
 )}
 </Button>
 </div>
 );
 })}
 </div>
 <ScrollBar orientation="horizontal" className="hidden" />
 </ScrollArea>
 </div>
 );
}
