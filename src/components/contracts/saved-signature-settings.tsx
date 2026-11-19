import { useEffect, useState } from "react";
import { CheckCircle2, PenTool, Trash2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DigitalSignatureCanvas } from "@/components/workspace/DigitalSignatureCanvas";
import { getDocumentThemeCanvasStyle } from "@/lib/builder/block-data-resolver";
import { TOKEN_HEX } from "@/lib/design-tokens";
import {
  getUserSignatureProfile,
  saveUserSignatureAndInitials,
} from "@/services/contracts-vault.functions";
import { cn } from "@/lib/utils";

interface SavedSignatureSettingsCardProps {
  title?: string;
  description?: string;
  compact?: boolean;
  onUpdated?: (signatureUrl: string | null) => void;
  onProfileChange?: (state: {
    profileId: string | null;
    savedSignature: string | null;
    savedInitials: string | null;
  }) => void;
  className?: string;
}

export function SavedSignatureSettingsCard({
  title = "Assinatura Eletrônica Pessoal",
  description = "Cadastre sua assinatura e rubrica uma única vez para assinar contratos e documentos da equipe em 1 toque.",
  compact = false,
  onUpdated,
  onProfileChange,
  className,
}: SavedSignatureSettingsCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedInitials, setSavedInitials] = useState<string | null>(null);
  const [activePad, setActivePad] = useState<"none" | "signature" | "initials">("none");

  useEffect(() => {
    let active = true;
    getUserSignatureProfile()
      .then((res) => {
        if (!active) return;
        const effectiveSignature = res.savedSignature || res.savedInitials || null;
        setProfileId(res.profileId || null);
        setSavedSignature(effectiveSignature);
        setSavedInitials(res.savedInitials);
        onProfileChange?.({
          profileId: res.profileId || null,
          savedSignature: effectiveSignature,
          savedInitials: res.savedInitials,
        });
      })
      .catch(() => {
        /* mantem estado inicial vazio */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persistSignature = async (
    payload: { signatureImageBase64?: string | null; initialsImageBase64?: string | null },
    successMsg: string,
  ) => {
    setSaving(true);
    try {
      const res = await saveUserSignatureAndInitials({ data: payload });
      const effectiveSignature = res.savedSignature || res.savedInitials || null;
      const resolvedProfileId = (res as any).profileId || profileId;
      if (resolvedProfileId) setProfileId(resolvedProfileId);
      setSavedSignature(effectiveSignature);
      setSavedInitials(res.savedInitials);
      setActivePad("none");
      onProfileChange?.({
        profileId: resolvedProfileId,
        savedSignature: effectiveSignature,
        savedInitials: res.savedInitials,
      });
      onUpdated?.(effectiveSignature);
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar a assinatura.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = (file: File | undefined, target: "signature" | "initials") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem PNG, JPEG ou WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = target === "signature" ? 640 : 320;
        const scale = Math.min(1, maxWidth / Math.max(1, img.width));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(120, Math.round(img.width * scale));
        canvas.height = Math.max(60, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const normalizedPng = canvas.toDataURL("image/png");
        if (target === "signature") {
          persistSignature({ signatureImageBase64: normalizedPng }, "Assinatura importada e salva.");
        } else {
          persistSignature({ initialsImageBase64: normalizedPng }, "Rubrica importada e salva.");
        }
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {savedSignature || savedInitials ? (
              <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
                <CheckCircle2 className="size-3" />
                Cadastrada
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Não cadastrada
              </Badge>
            )}
          </div>
          {!compact && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={activePad === "signature" ? "default" : "outline"}
            onClick={() => setActivePad((prev) => (prev === "signature" ? "none" : "signature"))}
            disabled={loading || saving}
            className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs font-medium gap-2"
          >
            <PenTool className="size-3.5" />
            {savedSignature ? "Redesenhar Assinatura" : "Desenhar Assinatura"}
          </Button>
          <label className="inline-flex items-center gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer focus-within:ring-2 focus-within:ring-ring">
            <Upload className="size-3.5" />
            <span>Subir PNG</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                handleUploadImage(e.target.files?.[0], "signature");
                e.currentTarget.value = "";
              }}
            />
          </label>
          <Button
            type="button"
            variant={activePad === "initials" ? "default" : "outline"}
            onClick={() => setActivePad((prev) => (prev === "initials" ? "none" : "initials"))}
            disabled={loading || saving}
            className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs font-medium gap-2"
          >
            <Sparkles className="size-3.5" />
            {savedInitials ? "Alterar Rubrica" : "Cadastrar Rubrica"}
          </Button>
        </div>
      </div>

      {/* Pré-visualização Real em Papel Claro */}
      {!loading && (savedSignature || savedInitials) && activePad === "none" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedSignature && (
            <div className="rounded-lg border border-border/70 p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Assinatura Padrão</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => persistSignature({ signatureImageBase64: null }, "Assinatura removida.")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive min-h-11 sm:min-h-0 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              </div>
              <div
                data-builder-canvas-isolated="light"
                style={getDocumentThemeCanvasStyle({ backgroundColor: TOKEN_HEX.white }, { forceIsolate: true })}
                className="h-20 rounded-md border border-border/60 flex items-center justify-center p-2"
              >
                <img
                  src={savedSignature}
                  alt="Assinatura cadastrada"
                  className="max-h-14 max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {savedInitials && (
            <div className="rounded-lg border border-border/70 p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Rubrica (Visto)</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => persistSignature({ initialsImageBase64: null }, "Rubrica removida.")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive min-h-11 sm:min-h-0 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              </div>
              <div
                data-builder-canvas-isolated="light"
                style={getDocumentThemeCanvasStyle({ backgroundColor: TOKEN_HEX.white }, { forceIsolate: true })}
                className="h-20 rounded-md border border-border/60 flex items-center justify-center p-2"
              >
                <img
                  src={savedInitials}
                  alt="Rubrica cadastrada"
                  className="max-h-14 max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activePad === "signature" && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Desenhar Assinatura Completa</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActivePad("none")}
              className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-xs"
            >
              Cancelar
            </Button>
          </div>
          <DigitalSignatureCanvas
            initialSignatureUrl={savedSignature}
            onSave={(dataUrl) =>
              persistSignature({ signatureImageBase64: dataUrl }, "Assinatura eletrônica salva.")
            }
          />
        </div>
      )}

      {activePad === "initials" && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Desenhar Rubrica / Visto Curto</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActivePad("none")}
              className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-xs"
            >
              Cancelar
            </Button>
          </div>
          <DigitalSignatureCanvas
            initialSignatureUrl={savedInitials}
            placeholderText="Desenhe suas iniciais / rubrica aqui"
            saveLabel="Salvar Rubrica"
            onSave={(dataUrl) =>
              persistSignature({ initialsImageBase64: dataUrl }, "Rubrica salva com sucesso.")
            }
          />
        </div>
      )}
    </div>
  );
}
