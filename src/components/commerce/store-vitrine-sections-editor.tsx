/**
 * store-vitrine-sections-editor.tsx — Editor Modular de Seções da Vitrine Comercial (Wix / App Builder Style)
 * Permite ao lojista/gestor reordenar seções, ativar/desativar blocos e gerenciar cards de destaque personalizados.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { Layers, ArrowUp, ArrowDown, Plus, Trash2, Edit3, Eye, EyeOff, LayoutGrid, MapPin } from "lucide-react";
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface VitrineCardItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  tag?: string;
  linkUrl?: string;
}

export interface VitrineSectionConfig {
  id: string;
  type: "banners" | "custom_cards" | "product_rail" | "hotpages" | "sponsors" | "brand_story" | "infinite_feed" | "promotional_flyers";
  title: string;
  enabled: boolean;
  city_filter?: string | null;
  cards?: VitrineCardItem[];
}

/** Nenhuma seção é criada implicitamente; a loja precisa configurá-la e persistí-la. */
export const DEFAULT_STORE_VITRINE_SECTIONS: VitrineSectionConfig[] = [];

interface StoreVitrineSectionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  initialSections?: VitrineSectionConfig[];
  onSave: (sections: VitrineSectionConfig[]) => void;
}

export function StoreVitrineSectionsEditor({
  open,
  onOpenChange,
  storeId,
  initialSections,
  onSave,
}: StoreVitrineSectionsEditorProps) {
  if (!open) return null;

  const [sections, setSections] = useState<VitrineSectionConfig[]>(
    initialSections && initialSections.length > 0 ? initialSections : DEFAULT_STORE_VITRINE_SECTIONS
  );

  // Estado para Edição de Card Específico In-Page
  const [editingCard, setEditingCard] = useState<VitrineCardItem | null>(null);
  const [isEditingCardOpen, setIsEditingCardOpen] = useState(false);

  const handleToggleEnabled = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleCityFilterChange = (sectionId: string, city: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, city_filter: city === "all" ? null : city } : s))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    // Não move além da penúltima (infinite feed é a última)
    if (index >= sections.length - 2) return;
    setSections((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleSaveCard = (savedCard: VitrineCardItem) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.type !== "custom_cards") return s;
        const currentCards = s.cards || [];
        const exists = currentCards.some((c) => c.id === savedCard.id);
        const newCards = exists
          ? currentCards.map((c) => (c.id === savedCard.id ? savedCard : c))
          : [...currentCards, savedCard];
        return { ...s, cards: newCards };
      })
    );
    setIsEditingCardOpen(false);
    setEditingCard(null);
    toast.success("Card de destaque atualizado!");
  };

  const handleDeleteCard = (cardId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.type !== "custom_cards") return s;
        return { ...s, cards: (s.cards || []).filter((c) => c.id !== cardId) };
      })
    );
    toast.success("Card removido da vitrine.");
  };

  const handleSaveAll = () => {
    // Garante que infinite feed continue no final
    const withoutInfinite = sections.filter((s) => s.type !== "infinite_feed");
    const infiniteSection = sections.find((s) => s.type === "infinite_feed") || {
      id: "sec_infinite_feed",
      type: "infinite_feed",
      title: "Mais Produtos",
      enabled: true,
    };
    const finalSections = [...withoutInfinite, infiniteSection];

    onSave(finalSections);
    try {
      localStorage.setItem(`store_vitrine_sections_${storeId}`, JSON.stringify(finalSections));
    } catch {}
    toast.success("Vitrine personalizada salva com sucesso!");
    onOpenChange(false);
  };

  const cardsSection = sections.find((s) => s.type === "custom_cards");

  return (
    <section
      aria-label="Editor de Seções da Vitrine"
      className="rounded-lg border border-border/80 bg-card p-4 sm:p-6 pb-20 sm:pb-24 space-y-6 shadow-sm animate-in fade-in duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-11 min-h-11 min-w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Editor In-Page da Vitrine</h3>
            <p className="text-xs text-muted-foreground">
              Reordene as seções da página inicial, oculte blocos ou gerencie cards de destaque.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold self-start sm:self-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Fechar Editor
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Ordem das Seções */}
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Ordem das Seções da Vitrine
          </Label>

          <div className="space-y-2">
            {sections.map((section, idx) => {
              const isInfinite = section.type === "infinite_feed";

              return (
                <div
                  key={section.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    section.enabled
                      ? "bg-card border-border/70"
                      : "bg-muted/30 border-border/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(section.id)}
                      className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                      title={section.enabled ? "Ocultar seção" : "Exibir seção"}
                    >
                      {section.enabled ? (
                        <Eye className="size-4 text-primary" />
                      ) : (
                        <EyeOff className="size-4 text-muted-foreground" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground break-words text-wrap leading-tight">
                        {section.title}
                      </p>
                      <span className="text-xs text-muted-foreground font-mono block">
                        {isInfinite ? "Mandatório no final" : `Posição ${idx + 1}`}
                      </span>
                    </div>
                  </div>

                  {!isInfinite && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Subir Seção"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx >= sections.length - 2}
                        onClick={() => handleMoveDown(idx)}
                        className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Descer Seção"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Cards de Destaque Personalizados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Cards de Destaque
              </h4>
              <p className="text-xs text-muted-foreground">
                Banners e chamadas com imagem e link de ação.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingCard({
                  id: `card_${Date.now()}`,
                  title: "",
                  subtitle: "",
                  tag: "Destaque",
                  linkUrl: "",
                  imageUrl: "",
                });
                setIsEditingCardOpen(true);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-4" />
              <span>Novo Card</span>
            </Button>
          </div>

          {/* Sub-Formulário In-Page para Edição de Card (Zero Modais) */}
          {isEditingCardOpen && editingCard && (
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-muted/20 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">
                  {editingCard.title ? `Editar: ${editingCard.title}` : "Novo Card de Destaque"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCardOpen(false);
                    setEditingCard(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Imagem do Card</Label>
                  <ImageUpload
                    bucket="store-assets"
                    value={editingCard.imageUrl || ""}
                    onChange={(url) =>
                      setEditingCard((prev) => (prev ? { ...prev, imageUrl: url } : null))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Título</Label>
                    <Input
                      value={editingCard.title}
                      onChange={(e) =>
                        setEditingCard((prev) => (prev ? { ...prev, title: e.target.value } : null))
                      }
                      placeholder="Ex: Coleção Inverno 2026"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Etiqueta / Badge</Label>
                    <Input
                      value={editingCard.tag || ""}
                      onChange={(e) =>
                        setEditingCard((prev) => (prev ? { ...prev, tag: e.target.value } : null))
                      }
                      placeholder="Ex: Novo, Oferta, Destaque"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Subtítulo / Descrição</Label>
                  <Input
                    value={editingCard.subtitle || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, subtitle: e.target.value } : null))
                    }
                    placeholder="Ex: Produtos selecionados com desconto"
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Link ou Ação</Label>
                  <Input
                    value={editingCard.linkUrl || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, linkUrl: e.target.value } : null))
                    }
                    placeholder="Ex: whatsapp, #catalogo ou /produtos"
                    className="h-11 min-h-11 rounded-lg text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditingCardOpen(false);
                      setEditingCard(null);
                    }}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSaveCard(editingCard)}
                    disabled={!editingCard.title.trim()}
                    className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Confirmar Card
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Cards Cadastrados */}
          <div className="grid grid-cols-1 gap-2">
            {(cardsSection?.cards || []).length === 0 && !isEditingCardOpen && (
              <div className="p-6 text-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
                Nenhum card de destaque configurado. Clique em &quot;Novo Card&quot; para adicionar.
              </div>
            )}
            {(cardsSection?.cards || []).map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="size-11 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <LayoutGrid className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground break-words text-wrap leading-tight">{card.title}</p>
                    <p className="text-xs text-muted-foreground break-words text-wrap leading-tight">{card.subtitle || card.linkUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCard(card);
                      setIsEditingCardOpen(true);
                    }}
                    className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Editar Card"
                  >
                    <Edit3 className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCard(card.id)}
                    className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Excluir Card"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Ação Inferior In-Page (Sticky z-30) */}
      <div className="sticky bottom-0 z-30 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 rounded-b-lg border-t border-border/60 bg-background/95 backdrop-blur-md flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSaveAll}
          className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Salvar Vitrine
        </Button>
      </div>
    </section>
  );
}
