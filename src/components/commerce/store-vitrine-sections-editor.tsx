/**
 * store-vitrine-sections-editor.tsx — Editor Modular de Seções da Vitrine Comercial (Wix / App Builder Style)
 * Permite ao lojista/gestor reordenar seções, ativar/desativar blocos e gerenciar cards de destaque personalizados.
 */

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  LayoutGrid,
} from "lucide-react";
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
  cards?: VitrineCardItem[];
}

export const DEFAULT_STORE_VITRINE_SECTIONS: VitrineSectionConfig[] = [
  { id: "sec_banners", type: "banners", title: "Banners Principais da Loja", enabled: true },
  { id: "sec_flyers", type: "promotional_flyers", title: "Encartes & Tabloides da Semana", enabled: true },
  {
    id: "sec_cards",
    type: "custom_cards",
    title: "Cards de Destaque & Novidades",
    enabled: true,
    cards: [
      {
        id: "card_1",
        title: "Atendimento Personalizado",
        subtitle: "Fale diretamente com nossa equipe pelo WhatsApp",
        tag: "Destaque",
        linkUrl: "whatsapp",
        imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "card_2",
        title: "Mais Vendidos da Região",
        subtitle: "Confira as novidades e produtos em alta",
        tag: "Tendência",
        linkUrl: "#catalogo",
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  { id: "sec_product_rail", type: "product_rail", title: "Produtos Mais Pedidos", enabled: true },
  { id: "sec_hotpages", type: "hotpages", title: "Acesso Rápido & Botões", enabled: true },
  { id: "sec_brand_story", type: "brand_story", title: "Sobre a Marca & Valores", enabled: true },
  { id: "sec_infinite_feed", type: "infinite_feed", title: "Mais Produtos", enabled: true },
];

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
  const [sections, setSections] = useState<VitrineSectionConfig[]>(
    initialSections && initialSections.length > 0 ? initialSections : DEFAULT_STORE_VITRINE_SECTIONS
  );

  // Estado para Edição de Card Específico
  const [editingCard, setEditingCard] = useState<VitrineCardItem | null>(null);
  const [isEditingCardOpen, setIsEditingCardOpen] = useState(false);

  const handleToggleEnabled = (sectionId: string) => {
    if (sectionId === "sec_infinite_feed") {
      toast.info("Esta seção é obrigatória para exibir todos os produtos da loja.");
      return;
    }
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 space-y-6 overflow-y-auto">
          <SheetHeader className="text-left border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <SheetTitle className="text-lg font-bold">Personalizar Vitrine da Loja</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Reordene as seções da página inicial, oculte blocos ou adicione cards de destaque personalizados (estilo App Builder).
            </SheetDescription>
          </SheetHeader>

          {/* Lista de Seções com Reordenação */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Ordem das Seções da Vitrine
            </Label>

            <div className="space-y-2">
              {sections.map((section, idx) => {
                const isLast = idx === sections.length - 1;
                const isInfinite = section.type === "infinite_feed";

                return (
                  <div
                    key={section.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      section.enabled
                        ? "bg-card border-border/70 shadow-2xs"
                        : "bg-muted/30 border-border/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(section.id)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        title={section.enabled ? "Ocultar seção" : "Exibir seção"}
                      >
                        {section.enabled ? (
                          <Eye className="size-4 text-primary" />
                        ) : (
                          <EyeOff className="size-4 text-muted-foreground" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {section.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {isInfinite ? "Mandatório no final" : `Posição ${idx + 1}`}
                        </span>
                      </div>
                    </div>

                    {!isInfinite && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Subir Seção"
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx >= sections.length - 2}
                          onClick={() => handleMoveDown(idx)}
                          className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Descer Seção"
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gestão de Cards Personalizáveis */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Cards de Destaque Personalizados
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Cards com imagem, chamada e link de ação na vitrine.
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
                className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Adicionar Card</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {(cardsSection?.cards || []).map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="size-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <LayoutGrid className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{card.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{card.subtitle || card.linkUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCard(card);
                        setIsEditingCardOpen(true);
                      }}
                      className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Editar Card"
                    >
                      <Edit3 className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCard(card.id)}
                      className="size-7 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      aria-label="Excluir Card"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-border/40 flex flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAll}
              className="h-10 px-5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
            >
              Salvar Vitrine
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sub-Modal para Edição de Card de Destaque */}
      {editingCard && (
        <Sheet open={isEditingCardOpen} onOpenChange={setIsEditingCardOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <SheetHeader className="text-left border-b border-border/40 pb-2">
              <SheetTitle className="text-base font-bold">Editar Card de Destaque</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Configure a imagem, textos e ação do card para os visitantes da sua loja.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-semibold">Imagem do Card</Label>
                <ImageUpload
                  bucket="store-assets"
                  value={editingCard.imageUrl || ""}
                  onChange={(url) => setEditingCard((prev) => (prev ? { ...prev, imageUrl: url } : null))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Título do Card</Label>
                  <Input
                    value={editingCard.title}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, title: e.target.value } : null))
                    }
                    placeholder="Ex: Coleção Inverno 2026"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Badge / Etiqueta</Label>
                  <Input
                    value={editingCard.tag || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, tag: e.target.value } : null))
                    }
                    placeholder="Ex: Novo, Exclusivo, Oferta"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Subtítulo / Descrição Rápida</Label>
                <Input
                  value={editingCard.subtitle || ""}
                  onChange={(e) =>
                    setEditingCard((prev) => (prev ? { ...prev, subtitle: e.target.value } : null))
                  }
                  placeholder="Ex: Produtos selecionados com até 20% de desconto"
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Link ou Ação ao Clicar</Label>
                <Input
                  value={editingCard.linkUrl || ""}
                  onChange={(e) =>
                    setEditingCard((prev) => (prev ? { ...prev, linkUrl: e.target.value } : null))
                  }
                  placeholder="Ex: whatsapp, #catalogo ou https://..."
                  className="h-10 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <SheetFooter className="pt-2 flex flex-row items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditingCardOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleSaveCard(editingCard)}
                disabled={!editingCard.title.trim()}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
              >
                Salvar Card
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
