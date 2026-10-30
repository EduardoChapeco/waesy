/**
 * BuilderCodeExplorerModal.tsx — Visualizador de Código do Projeto (Lovable & Replit Parity)
 * 
 * Permite aos desenvolvedores e gestores inspecionar a árvore física de arquivos
 * gerados pelo Omni Builder (TanStack Router + Tailwind v4), copiar arquivos ou
 * baixar o bundle completo do projeto para deploy local ou em nuvem.
 */

import * as React from "react";
import { useState, useMemo } from "react";
import {
  X,
  FileCode,
  Folder,
  FolderOpen,
  Download,
  Copy,
  Check,
  ExternalLink,
  Github,
  Terminal,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generateTanStackProjectFiles, GeneratedProjectFileTree } from "@/services/builder-project-generator";
import { OmniPageDocument } from "@/types/omni-builder";
import { toast } from "sonner";

export interface BuilderCodeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: OmniPageDocument;
}

export function BuilderCodeExplorerModal({
  isOpen,
  onClose,
  document,
}: BuilderCodeExplorerModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>("src/routes/index.tsx");
  const [copied, setCopied] = useState(false);

  // Gera a árvore de arquivos dinamicamente
  const files: GeneratedProjectFileTree = useMemo(() => {
    return generateTanStackProjectFiles(document);
  }, [document]);

  const fileList = useMemo(() => Object.keys(files), [files]);
  const activeContent = files[selectedFile] || "// Arquivo vazio";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      toast.success(`Conteúdo de ${selectedFile} copiado para a área de transferência!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o conteúdo.");
    }
  };

  const handleDownloadZip = () => {
    // Cria um blob JSON com a coleção de arquivos para download estruturado
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(files, null, 2));
    const downloadAnchor = window.document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `waesy-project-${document.slug || "export"}.json`);
    window.document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Árvore de arquivos do projeto exportada com sucesso!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border border-border/80 shadow-2xl">
        {/* Header Superior */}
        <DialogHeader className="h-14 px-4 border-b border-border/80 flex flex-row items-center justify-between flex-none bg-card select-none">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Terminal className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                Explorador de Código do Projeto
                <Badge variant="outline" className="text-2xs font-mono font-normal">
                  TanStack Start + Tailwind v4
                </Badge>
              </DialogTitle>
              <p className="text-2xs text-muted-foreground">
                Código-fonte limpo, estruturado e pronto para execução local ou deploy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-9 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copiado!" : "Copiar Arquivo"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleDownloadZip}
              className="h-9 px-3 rounded-lg text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              <Download className="size-3.5" />
              <span>Exportar Projeto</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo: Árvore de Arquivos à Esquerda + Visualizador de Código à Direita */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna 1: Árvore de Arquivos */}
          <aside className="w-64 border-r border-border/80 bg-muted/20 flex flex-col flex-none select-none overflow-y-auto p-2 gap-1 font-mono text-xs">
            <div className="px-2 py-1.5 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Arquivos ({fileList.length})
            </div>

            {fileList.map((filePath) => {
              const isSelected = selectedFile === filePath;
              const isRoute = filePath.startsWith("src/routes");
              const isConfig = filePath.endsWith(".json") || filePath.endsWith(".ts");

              return (
                <button
                  key={filePath}
                  type="button"
                  onClick={() => setSelectedFile(filePath)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer text-xs truncate",
                    isSelected
                      ? "bg-primary/15 text-primary font-bold border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <FileCode className={cn("size-3.5 shrink-0", isRoute ? "text-amber-500" : isConfig ? "text-sky-500" : "text-muted-foreground")} />
                  <span className="truncate">{filePath}</span>
                </button>
              );
            })}
          </aside>

          {/* Coluna 2: Editor de Código com Numeração de Linhas */}
          <main className="flex-1 bg-card/60 flex flex-col overflow-hidden">
            {/* Barra de Abas do Arquivo Selecionado */}
            <div className="h-9 px-4 border-b border-border/60 bg-muted/30 flex items-center justify-between text-2xs font-mono text-muted-foreground select-none">
              <span className="flex items-center gap-2 text-foreground font-semibold">
                <FileCode className="size-3 text-primary" />
                {selectedFile}
              </span>
              <span>{activeContent.split("\n").length} linhas</span>
            </div>

            {/* Visualizador de Código */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground bg-zinc-950/90">
              <pre className="selection:bg-primary selection:text-primary-foreground">
                {activeContent.split("\n").map((line, idx) => (
                  <div key={idx} className="flex gap-4 hover:bg-white/5 px-2 rounded">
                    <span className="w-8 text-right text-muted-foreground/50 select-none shrink-0 font-normal">
                      {idx + 1}
                    </span>
                    <span className="flex-1 whitespace-pre">{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
