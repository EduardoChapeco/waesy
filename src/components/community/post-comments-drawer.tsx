import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Send, Heart, MessageSquare, CornerDownRight, Smile, Layers, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPostComments, createPostComment, type PostCommentDTO } from "@/services/social.functions";
import { formatRelativeTime } from "@/lib/datetime";
import { toast } from "sonner";

interface PostCommentsDrawerProps {
 isOpen: boolean;
 onClose: () => void;
 postId: string;
 mediaUrl?: string | null;
 postTitle?: string | null;
 authorName?: string;
}

export function PostCommentsDrawer({
 isOpen,
 onClose,
 postId,
 mediaUrl,
 postTitle,
 authorName,
}: PostCommentsDrawerProps) {
 const [commentText, setCommentText] = useState("");
 const [replyingTo, setReplyingTo] = useState<PostCommentDTO | null>(null);
 const qc = useQueryClient();

 const queryKey = ["post-comments", postId, mediaUrl || "all"];

 const { data: comments = [], isLoading } = useQuery({
 queryKey,
 queryFn: () => listPostComments({ data: { postId, mediaUrl, limit: 50 } }),
 enabled: isOpen,
 });

 const addComment = useMutation({
 mutationFn: (text: string) =>
 createPostComment({
 data: {
 postId,
 mediaUrl: mediaUrl || undefined,
 parentId: replyingTo?.id || undefined,
 content: text,
 },
 }),
 onSuccess: (newCmt) => {
 setCommentText("");
 setReplyingTo(null);
 qc.setQueryData(queryKey, (old: PostCommentDTO[] = []) => [...old, newCmt]);
 qc.invalidateQueries({ queryKey: ["mural-feed"] });
 toast.success("Comentário publicado!");
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao publicar comentário.");
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!commentText.trim() || addComment.isPending) return;
 addComment.mutate(commentText);
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
 {/* Backdrop click to close */}
 <div className="flex-1" onClick={onClose} />

 {/* Drawer Container */}
 <div
 className="relative w-full max-w-lg mx-auto bg-background sm:rounded-t-3xl rounded-t-2xl border-t border-border flex flex-col h-[75vh] max-h-[600px] overflow-hidden animate-in slide-in-from-bottom duration-300"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Drag Handle & Header */}
 <div className="pt-2.5 pb-2 px-4 border-b border-border/40 flex items-center justify-between shrink-0">
 <div className="w-8" />
 <div className="flex flex-col items-center">
 <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
 <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
 <MessageSquare className="size-4 text-primary" />
 <span>{mediaUrl ? "Comentários da Foto" : "Comentários"}</span>
 </h3>
 </div>
 <button
 onClick={onClose}
 className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
 >
 <X className="size-4" />
 </button>
 </div>

 {/* Thumbnail da mídia selecionada (se for comentário de foto específica) */}
 {mediaUrl && (
 <div className="px-4 py-2 bg-muted/20 border-b border-border/30 flex items-center gap-3 shrink-0">
 <div className="size-10 rounded-lg overflow-hidden bg-black shrink-0">
 <img src={mediaUrl} alt="Mídia" className="size-full object-cover" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-xs font-bold text-foreground truncate">
 Foto de {authorName || "Membro"}
 </p>
 <p className="text-[10px] text-muted-foreground">
 Exibindo comentários exclusivos desta imagem
 </p>
 </div>
 </div>
 )}

 {/* Lista de Comentários */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
 <Loader2 className="size-6 animate-spin text-primary" />
 <span className="text-xs">Carregando comentários...</span>
 </div>
 ) : comments.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground space-y-2">
 <div className="size-12 rounded-2xl bg-muted/40 flex items-center justify-center">
 <Layers className="size-6 text-muted-foreground/60" />
 </div>
 <p className="text-sm font-bold text-foreground">Seja o primeiro a comentar!</p>
 <p className="text-xs max-w-xs text-muted-foreground">
 Compartilhe sua opinião sobre {mediaUrl ? "esta foto" : "esta publicação"} com a comunidade.
 </p>
 </div>
 ) : (
 comments.map((cmt) => (
 <div key={cmt.id} className="flex items-start gap-3 group">
 <Avatar className="size-8 rounded-full shrink-0 border border-border/50">
 <AvatarImage src={cmt.author.avatar_url || undefined} />
 <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
 {cmt.author.name.charAt(0).toUpperCase()}
 </AvatarFallback>
 </Avatar>

 <div className="flex-1 min-w-0 space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground truncate">
 {cmt.author.name}
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">
 {formatRelativeTime(cmt.created_at)}
 </span>
 </div>

 <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
 {cmt.content}
 </p>

 <div className="flex items-center gap-3 pt-0.5">
 <button
 onClick={() => {
 setReplyingTo(cmt);
 setCommentText(`@${cmt.author.username || cmt.author.name} `);
 }}
 className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
 >
 <CornerDownRight className="size-3" />
 <span>Responder</span>
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Replying Banner */}
 {replyingTo && (
 <div className="px-4 py-1.5 bg-muted/40 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground shrink-0">
 <span>
 Respondendo a <strong className="text-foreground">{replyingTo.author.name}</strong>
 </span>
 <button
 onClick={() => setReplyingTo(null)}
 className="text-xs font-bold text-destructive hover:underline"
 >
 Cancelar
 </button>
 </div>
 )}

 {/* Input Bar */}
 <form
 onSubmit={handleSubmit}
 className="p-3 bg-card border-t border-border flex items-center gap-2 shrink-0"
 >
 <Input
 value={commentText}
 onChange={(e) => setCommentText(e.target.value)}
 placeholder={mediaUrl ? "Comentar nesta foto..." : "Adicione um comentário..."}
 className="flex-1 h-10 rounded-xl bg-muted/50 border-border text-xs sm:text-sm"
 disabled={addComment.isPending}
 autoFocus
 />
 <Button
 type="submit"
 size="sm"
 disabled={!commentText.trim() || addComment.isPending}
 className="h-10 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5"
 >
 {addComment.isPending ? (
 <Loader2 className="size-4 animate-spin" />
 ) : (
 <>
 <span>Enviar</span>
 <Send className="size-3.5" />
 </>
 )}
 </Button>
 </form>
 </div>
 </div>
 );
}
