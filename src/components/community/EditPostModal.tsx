import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Tag, X, Loader2, MessageSquare } from "lucide-react";
import { updatePost } from "@/services/social.functions";
import { toast } from "sonner";

export interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content_text?: string | null;
    tags?: string[] | null;
    location_name?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  onSuccess?: () => void;
}

export function EditPostModal({
  open,
  onOpenChange,
  post,
  onSuccess,
}: EditPostModalProps) {
  const queryClient = useQueryClient();

  const [contentText, setContentText] = useState(post.content_text || "");
  const [tags, setTags] = useState<string[]>(post.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [locationName, setLocationName] = useState(post.location_name || "");
  const [allowComments, setAllowComments] = useState(
    !(post.metadata as Record<string, unknown> | null)?.disable_comments,
  );

  useEffect(() => {
    if (open) {
      setContentText(post.content_text || "");
      setTags(post.tags || []);
      setTagInput("");
      setLocationName(post.location_name || "");
      setAllowComments(
        !(post.metadata as Record<string, unknown> | null)?.disable_comments,
      );
    }
  }, [open, post]);

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (!clean) return;
    if (tags.includes(clean)) {
      toast.info("Esta tag já foi adicionada.");
      return;
    }
    if (tags.length >= 8) {
      toast.error("Limite máximo de 8 tags por publicação.");
      return;
    }
    setTags([...tags, clean]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePost({
        data: {
          postId: post.id,
          content_text: contentText.trim(),
          tags,
          location_name: locationName.trim() || null,
          allow_comments: allowComments,
        },
      }),
    onSuccess: () => {
      toast.success("Publicação atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", post.id] });
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar publicação.";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentText.trim()) {
      toast.error("O texto da publicação não pode estar vazio.");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-card border-border text-foreground">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              Editar Publicação
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Atualize o texto, tags e configurações da sua publicação.
            </p>
          </DialogHeader>

          {/* Campo de Conteúdo */}
          <div className="space-y-2">
            <Label htmlFor="post-content-edit" className="text-xs font-semibold">
              Mensagem
            </Label>
            <Textarea
              id="post-content-edit"
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="O que está acontecendo?"
              rows={4}
              maxLength={2000}
              className="resize-none rounded-xl bg-background border-border text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="flex justify-end text-2xs text-muted-foreground">
              <span>{contentText.length} / 2000</span>
            </div>
          </div>

          {/* Campo de Localização */}
          <div className="space-y-2">
            <Label htmlFor="post-location-edit" className="text-xs font-semibold flex items-center gap-2">
              <MapPin className="size-3.5 text-primary" />
              <span>Localização</span>
            </Label>
            <Input
              id="post-location-edit"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: São Miguel do Oeste, SC"
              maxLength={100}
              className="h-11 min-h-11 rounded-xl bg-background border-border text-xs focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Gerenciamento de Tags */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-2">
              <Tag className="size-3.5 text-primary" />
              <span>Tags</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Adicionar tag (pressione Enter)"
                maxLength={30}
                className="h-11 min-h-11 rounded-xl bg-background border-border text-xs focus-visible:ring-2 focus-visible:ring-primary grow"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0"
              >
                Adicionar
              </Button>
            </div>

            {tags.length === 0 ? (
              <p className="text-2xs text-muted-foreground pt-1">
                Nenhuma tag adicionada.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 px-3 py-1 text-xs rounded-full bg-muted/80 text-foreground font-medium"
                  >
                    <span>#{tag}</span>
                    <button /* design-lint-ignore DL-14 reason:"Gatilho de remoção de tag secundária em chip inline" expiry:"2027-12-31" */
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="size-3.5 rounded-full hover:bg-background/80 inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      aria-label={`Remover tag ${tag}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Configuração de Comentários */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
            <div className="space-y-1">
              <Label
                htmlFor="allow-comments-switch"
                className="text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="size-3.5 text-primary" />
                <span>Permitir comentários</span>
              </Label>
              <p className="text-2xs text-muted-foreground">
                Outros membros podem responder e interagir na publicação.
              </p>
            </div>
            <Switch
              id="allow-comments-switch"
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className="h-11 min-h-11 px-5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="h-11 min-h-11 px-6 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
