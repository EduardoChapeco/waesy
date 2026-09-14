import { useState, useRef } from "react";
import { Plus, X, PencilSimple } from "@phosphor-icons/react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// StoryHighlight — Tipo Canônico
// ─────────────────────────────────────────────────────────────────────────────
export interface StoryHighlight {
  id: string;
  title: string;
  image: string; // URL pública no Storage
}

// ─────────────────────────────────────────────────────────────────────────────
// StoryHighlightUploader
// Componente de destaques visuais em círculos táteis com upload contextual.
// Ao clicar num círculo existente → editar; no "+" → adicionar novo.
// ─────────────────────────────────────────────────────────────────────────────
interface StoryHighlightUploaderProps {
  highlights: StoryHighlight[];
  onChange: (highlights: StoryHighlight[]) => void;
  onUpload?: (file: File) => Promise<string>; // retorna URL pública
  maxHighlights?: number;
  readOnly?: boolean;
  className?: string;
}

export function StoryHighlightUploader({
  highlights,
  onChange,
  onUpload,
  maxHighlights = 8,
  readOnly = false,
  className,
}: StoryHighlightUploaderProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeHighlightRef = useRef<string | null>(null);

  const handleAddNew = () => {
    if (highlights.length >= maxHighlights) {
      toast.info(`Máximo de ${maxHighlights} destaques permitido.`);
      return;
    }
    const id = `hl_${Date.now()}`;
    const newHL: StoryHighlight = { id, title: "Destaque", image: "" };
    onChange([...highlights, newHL]);
    setEditingId(id);
    setEditTitle("Destaque");
  };

  const handleRemove = (id: string) => {
    onChange(highlights.filter((h) => h.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleTitleSave = (id: string) => {
    onChange(
      highlights.map((h) =>
        h.id === id ? { ...h, title: editTitle.trim() || h.title } : h
      )
    );
    setEditingId(null);
  };

  const handleImageClick = (id: string) => {
    if (readOnly) return;
    activeHighlightRef.current = id;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = activeHighlightRef.current;
    if (!file || !id) return;
    e.target.value = "";

    if (!onUpload) {
      // Fallback: ObjectURL local (apenas preview no form)
      const url = URL.createObjectURL(file);
      onChange(highlights.map((h) => (h.id === id ? { ...h, image: url } : h)));
      return;
    }

    setUploadingId(id);
    try {
      const url = await onUpload(file);
      onChange(highlights.map((h) => (h.id === id ? { ...h, image: url } : h)));
      toast.success("Foto do destaque atualizada!");
    } catch {
      toast.error("Falha ao fazer upload. Tente novamente.");
    } finally {
      setUploadingId(null);
      activeHighlightRef.current = null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
        aria-label="Upload de foto para destaque"
      />

      <div className="flex items-end gap-3 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
        {/* Destaques existentes */}
        {highlights.map((hl) => {
          const isUploading = uploadingId === hl.id;
          const isEditing = editingId === hl.id;

          return (
            <div key={hl.id} className="flex flex-col items-center gap-1.5 shrink-0">
              {/* Círculo */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleImageClick(hl.id)}
                  disabled={readOnly}
                  className={cn(
                    "size-16 rounded-full overflow-hidden border-2 transition-all",
                    hl.image
                      ? "border-primary/40 hover:border-primary"
                      : "border-dashed border-border/60 hover:border-primary/60 bg-muted/30",
                    readOnly && "pointer-events-none"
                  )}
                  aria-label={`Foto do destaque: ${hl.title}`}
                >
                  {isUploading ? (
                    <div className="size-full flex items-center justify-center bg-muted">
                      <Loader2 className="size-5 animate-spin text-primary" />
                    </div>
                  ) : hl.image ? (
                    <img
                      src={hl.image}
                      alt={hl.title}
                      className="size-full object-cover group-hover:brightness-90 transition"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <ImagePlus className="size-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay hover */}
                  {!readOnly && hl.image && (
                    <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <PencilSimple className="size-4 text-white" weight="bold" />
                    </div>
                  )}
                </button>

                {/* Botão de remover */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(hl.id)}
                    className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label={`Remover destaque ${hl.title}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Título editável */}
              {isEditing && !readOnly ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleTitleSave(hl.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave(hl.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  maxLength={14}
                  className="w-16 text-center text-[10.5px] font-medium bg-transparent border-b border-primary outline-none text-foreground"
                  aria-label="Título do destaque"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!readOnly) {
                      setEditingId(hl.id);
                      setEditTitle(hl.title);
                    }
                  }}
                  className={cn(
                    "text-[11px] font-medium text-foreground tracking-tight max-w-[64px] truncate",
                    !readOnly && "hover:text-primary transition-colors cursor-pointer"
                  )}
                >
                  {hl.title}
                </button>
              )}
            </div>
          );
        })}

        {/* Botão de adicionar novo destaque */}
        {!readOnly && highlights.length < maxHighlights && (
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAddNew}
              className="size-16 rounded-full border-2 border-dashed border-border/50 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 flex items-center justify-center transition-all active:scale-95"
              aria-label="Adicionar novo destaque"
            >
              <Plus className="size-5 text-muted-foreground" weight="bold" />
            </button>
            <span className="text-[11px] text-muted-foreground font-medium">Adicionar</span>
          </div>
        )}
      </div>

      {highlights.length === 0 && !readOnly && (
        <p className="text-[11px] text-muted-foreground pl-1">
          Adicione destaques visuais para valorizar os pontos principais do anúncio.
        </p>
      )}
    </div>
  );
}
