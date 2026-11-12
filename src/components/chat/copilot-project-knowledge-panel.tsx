import React, { useRef, useState } from "react";
import { BookOpen, FileText, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  CopilotProjectDTO,
  CopilotProjectFileDTO,
} from "@/services/copilot-projects.functions";
import { toast } from "sonner";

export interface CopilotProjectKnowledgePanelProps {
  project: CopilotProjectDTO;
  files: CopilotProjectFileDTO[];
  isLoadingFiles?: boolean;
  onUploadFile: (payload: {
    projectId: string;
    filename: string;
    fileType: string;
    fileSize: number;
    contentText: string;
  }) => Promise<void> | void;
  onDeleteFile: (fileId: string) => Promise<void> | void;
  onUpdateInstructions?: (
    projectId: string,
    instructions: string,
  ) => Promise<void> | void;
}

function formatKnowledgeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractReadableTextFromBuffer(rawBytes: Uint8Array, fallbackText: string): string {
  if (!fallbackText.startsWith("%PDF-")) {
    return fallbackText;
  }
  // Extração defensiva de cadeias de texto legíveis para PDFs com streams não comprimidos
  const decoded = new TextDecoder("latin1").decode(rawBytes);
  const literalChunks: string[] = [];
  const parenRegex = /\(([^()\\]{3,200})\)/g;
  let match: RegExpExecArray | null = parenRegex.exec(decoded);
  while (match && literalChunks.length < 4000) {
    const clean = match[1].replace(/[^\x20-\x7E\xA0-\xFF]/g, " ").trim();
    if (clean.length >= 3 && /[a-zA-ZÀ-ÿ]/.test(clean)) {
      literalChunks.push(clean);
    }
    match = parenRegex.exec(decoded);
  }
  return literalChunks.join(" ").trim();
}

export function CopilotProjectKnowledgePanel({
  project,
  files,
  isLoadingFiles = false,
  onUploadFile,
  onDeleteFile,
  onUpdateInstructions,
}: CopilotProjectKnowledgePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instructions, setInstructions] = useState(project.system_instructions || "");
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  React.useEffect(() => {
    setInstructions(project.system_instructions || "");
  }, [project.id, project.system_instructions]);

  const handleSaveInstructions = async () => {
    if (!onUpdateInstructions) return;
    setIsSavingInstructions(true);
    try {
      await onUpdateInstructions(project.id, instructions);
      toast.success("Diretrizes do projeto atualizadas.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar diretrizes.");
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const handleSelectedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    setIsUploading(true);
    try {
      const buffer = await selected.arrayBuffer();
      const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const extracted = extractReadableTextFromBuffer(new Uint8Array(buffer), rawText);
      if (!extracted || extracted.trim().length < 4) {
        toast.error(
          "Arquivo binário sem camada textual direta. Cole o conteúdo como nota de contexto ou envie .txt/.md/.csv/.json.",
        );
        return;
      }

      await onUploadFile({
        projectId: project.id,
        filename: selected.name,
        fileType: selected.type || "text/plain",
        fileSize: selected.size,
        contentText: extracted,
      });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível indexar este arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error("Informe o título e o conteúdo de referência.");
      return;
    }
    setIsUploading(true);
    try {
      const normalizedName = noteTitle.trim().endsWith(".md")
        ? noteTitle.trim()
        : `${noteTitle.trim()}.md`;
      await onUploadFile({
        projectId: project.id,
        filename: normalizedName,
        fileType: "text/markdown",
        fileSize: new TextEncoder().encode(noteContent).byteLength,
        contentText: noteContent.trim(),
      });
      setNoteTitle("");
      setNoteContent("");
      setShowNoteComposer(false);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar nota de contexto.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Base de Conhecimento */}
      <div className="space-y-2 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <BookOpen className="size-3.5 text-primary" />
            <span>Base do Projeto</span>
          </span>
          <Badge variant="outline" className="text-2xs font-mono">
            {files.length} {files.length === 1 ? "arquivo" : "arquivos"}
          </Badge>
        </div>

        <p className="text-xs font-semibold text-foreground truncate">{project.title}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.log,.tsv,.pdf"
          onChange={handleSelectedFile}
          className="hidden"
          aria-label="Enviar arquivo para a base de conhecimento do projeto"
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Upload className="size-3.5" />
            <span>{isUploading ? "Indexando..." : "Arquivo"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => setShowNoteComposer((prev) => !prev)}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Plus className="size-3.5" />
            <span>Texto Base</span>
          </Button>
        </div>
      </div>

      {/* Formulário rápido para colar regras/contexto (ex.: scripts WhatsApp, tarifas) */}
      {showNoteComposer && (
        <div className="space-y-2 pb-3 border-b border-border/40">
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Nome do documento (ex: Tabela Tarifas.md)"
            className="h-11 min-h-11 text-xs"
          />
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Cole regras, políticas, scripts de atendimento ou tabela de preços..."
            rows={4}
            className="text-xs resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNoteComposer(false)}
              className="h-11 min-h-11 px-3 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isUploading}
              onClick={handleSaveNote}
              className="h-11 min-h-11 px-4 text-xs font-semibold"
            >
              Salvar na Base
            </Button>
          </div>
        </div>
      )}

      {/* Diretrizes Permanentes do Projeto */}
      {onUpdateInstructions && (
        <div className="space-y-2 pb-3 border-b border-border/40">
          <span className="text-2xs font-semibold text-muted-foreground uppercase block">
            Instruções do Projeto
          </span>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ex.: Responda sempre com base nas políticas de viagem da agência..."
            rows={3}
            className="text-xs resize-none bg-muted/20"
          />
          {instructions !== (project.system_instructions || "") && (
            <Button
              type="button"
              size="sm"
              disabled={isSavingInstructions}
              onClick={handleSaveInstructions}
              className="h-11 min-h-11 w-full text-xs font-semibold"
            >
              {isSavingInstructions ? "Salvando..." : "Salvar Diretrizes"}
            </Button>
          )}
        </div>
      )}

      {/* Lista de Arquivos Indexados */}
      <div className="space-y-2">
        {isLoadingFiles ? (
          <p className="text-2xs text-muted-foreground">Carregando arquivos indexados...</p>
        ) : files.length === 0 ? (
          <p className="text-2xs text-muted-foreground leading-relaxed">
            Nenhum arquivo anexado ao projeto. Envie documentos ou cole regras para embasar todas as respostas da IA.
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-muted/25 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground truncate">
                    {file.filename}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono">
                  <span>{formatKnowledgeBytes(file.file_size)}</span>
                  <span>·</span>
                  <span>{file.status === "ready" ? "Indexado" : file.status}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDeleteFile(file.id)}
                className="size-11 min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                aria-label={`Remover ${file.filename}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
