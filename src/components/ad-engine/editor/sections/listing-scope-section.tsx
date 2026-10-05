import React, { useState } from "react";
import { CheckCircle2, XCircle, Plus, Trash2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UnifiedNiche } from "@/types/unified-ad-engine";
import { cn } from "@/lib/utils";

export interface ListingScopeSectionProps {
  niche: UnifiedNiche;
  inclusions: string[];
  exclusions: string[];
  onChangeInclusions: (items: string[]) => void;
  onChangeExclusions: (items: string[]) => void;
  className?: string;
}

const NICHE_SUGGESTIONS: Record<string, { inclusions: string[]; exclusions: string[] }> = {
  tourism: {
    inclusions: [
      "Hospedagem com Café da Manhã",
      "Transporte Executivo com Ar-condicionado",
      "Guia Credenciado Cadastur",
      "Seguro Viagem Nacional / Internacional",
      "Ingressos e Taxas Ambientais",
      "Kit Lanche e Hidratação de Bordo",
    ],
    exclusions: [
      "Almoços e jantares não descritos",
      "Bebidas alcoólicas e frigobar",
      "Passeios opcionais e esportes radicais",
      "Despesas de caráter pessoal",
    ],
  },
  services: {
    inclusions: [
      "Diagnóstico Inicial e Alinhamento",
      "Execução Completa do Escopo",
      "Garantia Técnica de 90 dias",
      "Relatório Final de Entrega",
    ],
    exclusions: [
      "Materiais e insumos de terceiros",
      "Alterações fora do escopo homologado",
    ],
  },
};

export function ListingScopeSection({
  niche,
  inclusions,
  exclusions,
  onChangeInclusions,
  onChangeExclusions,
  className,
}: ListingScopeSectionProps) {
  const [newInclusion, setNewInclusion] = useState("");
  const [newExclusion, setNewExclusion] = useState("");

  const suggestions = NICHE_SUGGESTIONS[niche] ?? NICHE_SUGGESTIONS.services;

  const handleAddInclusion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inclusions.includes(trimmed)) return;
    onChangeInclusions([...inclusions, trimmed]);
    setNewInclusion("");
  };

  const handleRemoveInclusion = (index: number) => {
    onChangeInclusions(inclusions.filter((_, i) => i !== index));
  };

  const handleAddExclusion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || exclusions.includes(trimmed)) return;
    onChangeExclusions([...exclusions, trimmed]);
    setNewExclusion("");
  };

  const handleRemoveExclusion = (index: number) => {
    onChangeExclusions(exclusions.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Itens Inclusos (Dono Único) ── */}
      <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <span>O que está incluso no pacote</span>
          </div>
          {inclusions.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              {inclusions.length} item(ns)
            </Badge>
          )}
        </div>

        {/* Sugestões Rápidas de Nicho */}
        <div className="space-y-2">
          <Label className="text-2xs text-muted-foreground flex items-center gap-1">
            <Zap className="size-3 text-primary" />
            <span>Sugestões rápidas:</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {suggestions.inclusions.map((sug) => {
              const alreadyHas = inclusions.includes(sug);
              return (
                <button
                  key={sug}
                  type="button"
                  disabled={alreadyHas}
                  onClick={() => handleAddInclusion(sug)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-lg border transition-colors cursor-pointer text-left",
                    alreadyHas
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 opacity-60 cursor-default"
                      : "border-border/60 bg-background hover:bg-muted/40 text-foreground"
                  )}
                >
                  + {sug}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input customizado de inclusão */}
        <div className="flex items-center gap-2">
          <Input
            value={newInclusion}
            onChange={(e) => setNewInclusion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddInclusion(newInclusion);
              }
            }}
            placeholder="Adicionar item incluso personalizado..."
            className="h-10 rounded-lg text-xs bg-background flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddInclusion(newInclusion)}
            disabled={!newInclusion.trim()}
            className="h-10 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Adicionar</span>
          </Button>
        </div>

        {/* Lista de Itens Inclusos */}
        {inclusions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {inclusions.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-foreground"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveInclusion(idx)}
                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Itens Não Inclusos / Exclusos ── */}
      <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <XCircle className="size-4 text-destructive shrink-0" />
            <span>Não Incluso (O que o cliente precisa saber)</span>
          </div>
          {exclusions.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              {exclusions.length} item(ns)
            </Badge>
          )}
        </div>

        {/* Sugestões Rápidas de Exclusão */}
        <div className="space-y-2">
          <Label className="text-2xs text-muted-foreground flex items-center gap-1">
            <Zap className="size-3 text-primary" />
            <span>Sugestões rápidas:</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {suggestions.exclusions.map((sug) => {
              const alreadyHas = exclusions.includes(sug);
              return (
                <button
                  key={sug}
                  type="button"
                  disabled={alreadyHas}
                  onClick={() => handleAddExclusion(sug)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-lg border transition-colors cursor-pointer text-left",
                    alreadyHas
                      ? "border-destructive/30 bg-destructive/10 text-destructive opacity-60 cursor-default"
                      : "border-border/60 bg-background hover:bg-muted/40 text-foreground"
                  )}
                >
                  + {sug}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input customizado de exclusão */}
        <div className="flex items-center gap-2">
          <Input
            value={newExclusion}
            onChange={(e) => setNewExclusion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddExclusion(newExclusion);
              }
            }}
            placeholder="Adicionar item não incluso (ex: Alimentação)..."
            className="h-10 rounded-lg text-xs bg-background flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddExclusion(newExclusion)}
            disabled={!newExclusion.trim()}
            className="h-10 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Adicionar</span>
          </Button>
        </div>

        {/* Lista de Itens Não Inclusos */}
        {exclusions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {exclusions.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-foreground"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <XCircle className="size-3.5 text-destructive shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveExclusion(idx)}
                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
