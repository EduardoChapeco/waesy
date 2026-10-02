import React, { useState, useRef } from "react";
import { UploadCloud, X, Loader2, FileText, CheckCircle2, AlertCircle, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface DigitalFileDropzoneProps {
  value?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  onChange: (fileData: { url: string; name: string; sizeBytes: number } | null) => void;
  className?: string;
  maxSizeBytes?: number; // Default: 100MB
}

export const DigitalFileDropzone: React.FC<DigitalFileDropzoneProps> = ({
  value,
  fileName,
  fileSizeBytes,
  onChange,
  className,
  maxSizeBytes = 100 * 1024 * 1024, // 100 MB
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadFile = async (file: File) => {
    if (file.size > maxSizeBytes) {
      toast.error(`O arquivo excede o limite máximo permitido (${(maxSizeBytes / (1024 * 1024)).toFixed(0)} MB).`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const supabase = getBrowserClient();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filePath = `digital/${timestamp}_${randomStr}_${sanitizedName}`;

      setUploadProgress(40);
      const { data, error } = await supabase.storage
        .from("classifieds")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("[DigitalDropzone] Erro no upload:", error);
        throw new Error(error.message || "Falha ao enviar arquivo.");
      }

      setUploadProgress(80);
      const { data: pubData } = supabase.storage.from("classifieds").getPublicUrl(filePath);

      setUploadProgress(100);
      onChange({
        url: pubData.publicUrl || filePath,
        name: file.name,
        sizeBytes: file.size,
      });

      toast.success("Arquivo digital enviado com sucesso!");
    } catch (err: any) {
      console.error("[DigitalDropzone] Exceção:", err);
      toast.error(err.message || "Erro ao carregar o arquivo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        className="hidden"
        accept=".pdf,.zip,.rar,.7z,.epub,.mobi,.xlsx,.xls,.docx,.doc,.psd,.fig,.mp3,.wav,.mp4"
      />

      {value ? (
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <FileArchive className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {fileName || "Arquivo Digital Anexado"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {fileSizeBytes ? <span>{formatFileSize(fileSizeBytes)}</span> : null}
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" /> Pronto para entrega
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs h-8"
            >
              Substituir
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
              className="text-xs h-8 text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer text-center",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border/70 hover:border-border hover:bg-muted/20",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-foreground">Enviando arquivo digital seguro...</p>
              {uploadProgress !== null && (
                <div className="w-40 bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center border border-border/50">
                <UploadCloud className="size-6 text-foreground/80" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Arraste ou clique para selecionar o arquivo digital
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, ZIP, RAR, EPUB, Planilhas, Presets, Vídeo-aulas (até 100 MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
