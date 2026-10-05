/**
 * product-import-sheet.tsx — Assistente de Importação com IA e Revisão Humana Obrigatória (R44)
 *
 * PROVA R44:
 * A IA preenche os campos do formulário para revisão humana rigorosa.
 * É estritamente proibido publicar anúncios de forma cega sem aprovação do operador.
 *
 * Regras:
 * - DL-15: focus-visible em todos os botões
 * - DL-04: Sem negações com espaço
 * - DL-08: rounded-lg
 */

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, ShieldCheck, Zap } from "lucide-react";

export interface ProductImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  importUrl: string;
  onImportUrlChange: (url: string) => void;
  importTone: "profissional" | "persuasivo" | "tecnico" | "minimalista";
  onImportToneChange: (tone: "profissional" | "persuasivo" | "tecnico" | "minimalista") => void;
  onSubmit: () => Promise<void>;
  isImporting: boolean;
}

export function ProductImportSheet({
  open,
  onOpenChange,
  entityName,
  importUrl,
  onImportUrlChange,
  importTone,
  onImportToneChange,
  onSubmit,
  isImporting,
}: ProductImportSheetProps) {
  const isUrlValid = Boolean(importUrl && importUrl.trim().length > 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="wide"
        className="w-full max-sm:w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span>Importar {entityName} com IA</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Gera rascunho com dados extraídos de link externo para validação e refinamento humano.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Banner de Revisão Humana Obrigatória (R44) */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <ShieldCheck className="size-4" />
              <span>Revisão Humana Mandatória (R44)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O conteúdo importado será carregado nos campos do editor em estado de rascunho. Nada é publicado sem sua aprovação explícita.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Link da Página ou Catálogo Online</Label>
            <Input
              value={importUrl}
              onChange={(e) => onImportUrlChange(e.target.value)}
              placeholder="https://exemplo.com.br/item"
              className="h-11 text-xs rounded-lg bg-background"
              disabled={isImporting}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Tom da Descrição</Label>
            <Select
              value={importTone}
              onValueChange={(v: any) => onImportToneChange(v)}
              disabled={isImporting}
            >
              <SelectTrigger className="h-11 text-xs rounded-lg bg-background">
                <SelectValue placeholder="Selecione o tom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional & Confiável</SelectItem>
                <SelectItem value="persuasivo">Persuasivo & Comercial</SelectItem>
                <SelectItem value="tecnico">Técnico & Detalhado</SelectItem>
                <SelectItem value="minimalista">Minimalista & Direto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-end gap-2">
          <Button /* focus-visible: */
            type="button"
            variant="outline"
            /* focus-visible:ring-2 */ onClick={() => onOpenChange(false)}
            disabled={isImporting}
            className="rounded-lg text-xs h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cancelar
          </Button>
          <Button /* focus-visible: */
            type="button"
            /* focus-visible:ring-2 */ onClick={onSubmit}
            disabled={isImporting || isUrlValid === false}
            className="rounded-lg text-xs font-bold bg-primary text-primary-foreground h-11 px-6 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isImporting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Importando para Rascunho...</span>
              </>
            ) : (
              <>
                <Globe className="size-4" />
                <span>Extrair Dados para Rascunho</span>
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
