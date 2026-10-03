import React, { useMemo } from "react";
import { X, Copy, Plus, Trash2, EyeOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatMoney } from "@/lib/money";
import { AdvancedVariantEditor } from "./advanced-variant-editor";
import { ProductDimensionModal } from "./product-editor/product-dimension-modal";
import { toast } from "sonner";

import type { RawVariant } from "@/types/catalog";
export type { RawVariant };

interface VariantMatrixGridProps {
  variants: RawVariant[];
  onChange: (variants: RawVariant[]) => void;
  basePriceCents: number;
  wholesaleEnabled?: boolean;
}

export function VariantMatrixGrid({
  variants,
  onChange,
  basePriceCents,
  wholesaleEnabled = false,
}: VariantMatrixGridProps) {
  const [advancedEditIndex, setAdvancedEditIndex] = React.useState<number | null>(null);
  const [isAddDimensionOpen, setIsAddDimensionOpen] = React.useState(false);
  const [newDimensionName, setNewDimensionName] = React.useState("");
  const [newDimensionValue, setNewDimensionValue] = React.useState("");

  // Coleta todas as chaves dinamicas que existem no banco/state atual
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    variants.forEach((v) => Object.keys(v.attributes).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [variants]);

  // A primeira chave vira a Mestra (ex: Cor). O resto vira Sub-variaveis.
  const rowKey = attributeKeys[0] || "Opção";
  const colKeys = attributeKeys.slice(1);

  // Se nao houver sub-variavel, injeta coluna Especificacao
  const displayColKeys = colKeys.length > 0 ? colKeys : ["Especificação"];

  if (variants.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
        <EyeOff className="size-8 mx-auto mb-2 opacity-50" />
        Nenhuma variação definida. Adicione grupos abaixo.
      </div>
    );
  }

  // --- Funcoes Auxiliares de Atualizacao ---
  const handleOpenAddDimension = () => {
    setNewDimensionName("");
    setNewDimensionValue("");
    setIsAddDimensionOpen(true);
  };

  const handleAddDimensionSubmit = () => {
    const dim = newDimensionName.trim();
    const val = newDimensionValue.trim();
    if (!dim) {
      toast.error("Informe o nome da propriedade.");
      return;
    }
    if (attributeKeys.includes(dim)) {
      toast.error("Essa propriedade já existe!");
      return;
    }
    const newVariants = variants.map((v) => ({
      ...v,
      attributes: { ...v.attributes, [dim]: v.attributes[dim] || val },
    }));
    onChange(newVariants);
    setIsAddDimensionOpen(false);
    setNewDimensionName("");
    setNewDimensionValue("");
    toast.success(`Propriedade "${dim}" adicionada como coluna.`);
  };

  const handleRenameDimension = (oldKey: string, newKey: string) => {
    if (!newKey || newKey === oldKey || attributeKeys.includes(newKey)) return;
    const newVariants = variants.map((v) => {
      const { [oldKey]: oldVal, ...rest } = v.attributes;
      return { ...v, attributes: { ...rest, [newKey]: oldVal } };
    });
    onChange(newVariants);
  };

  // --- Agrupamento dos dados ---
  const grouped = new Map<string, { variants: RawVariant[]; originalIndices: number[] }>();
  variants.forEach((v, idx) => {
    const pVal = attributeKeys.length > 0 ? (v.attributes[rowKey] ?? "Geral") : "Geral";
    if (!grouped.has(pVal)) grouped.set(pVal, { variants: [], originalIndices: [] });
    grouped.get(pVal)!.variants.push(v);
    grouped.get(pVal)!.originalIndices.push(idx);
  });

  const handleGroupImageUpdate = (groupVal: string, url: string | null) => {
    const newVariants = [...variants];
    const group = grouped.get(groupVal);
    if (group) {
      group.originalIndices.forEach((idx) => {
        newVariants[idx] = { ...newVariants[idx], image_url: url };
      });
      onChange(newVariants);
    }
  };

  const handleAddVariantToGroup = (groupVal: string) => {
    const group = grouped.get(groupVal);
    if (!group || group.variants.length === 0) return;
    const templateVariant = group.variants[0];
    const newAttributes = { ...templateVariant.attributes };

    displayColKeys.forEach((k) => {
      newAttributes[k] = "";
    });

    onChange([
      ...variants,
      {
        attributes: newAttributes,
        stock: 0,
        price_override_cents: null,
        image_url: templateVariant.image_url,
        sku: "",
      },
    ]);
  };

  const handleAddEmptyVariant = () => {
    const newAttributes: Record<string, string> = {};
    attributeKeys.forEach((k) => (newAttributes[k] = ""));
    if (attributeKeys.length === 0) {
      newAttributes["Opção"] = "Novo Grupo";
      newAttributes["Especificação"] = "";
    } else {
      newAttributes[rowKey] = "Novo Grupo";
    }
    onChange([
      ...variants,
      { attributes: newAttributes, stock: 0, price_override_cents: null, sku: "" },
    ]);
  };

  const handleDeleteVariant = (globalIdx: number) => {
    const removed = variants[globalIdx];
    const newVariants = variants.filter((_, idx) => idx !== globalIdx);
    onChange(newVariants);
    toast.success("Linha removida.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          const restored = [...newVariants];
          restored.splice(globalIdx, 0, removed);
          onChange(restored);
          toast.info("Linha restaurada.");
        },
      },
    });
  };

  const handleCloneVariant = (globalIdx: number) => {
    const template = variants[globalIdx];
    const newVariants = [...variants];
    newVariants.splice(globalIdx + 1, 0, {
      ...template,
      id: undefined,
      sku: template.sku ? `${template.sku}-copy` : "",
      original_stock: 0,
    });
    onChange(newVariants);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 p-4 border bg-card border-dashed rounded-lg">
        <div className="text-sm">
          <p className="font-semibold text-foreground">Construtor Livre de Variações ({variants.length} geradas)</p>
          <p className="text-muted-foreground text-xs">
            Adicione propriedades infinitas (Cor, Tamanho, Material). Clique nos cabeçalhos para renomear.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAddDimension} /* focus-visible: */
          className="border-dashed text-primary hover:text-primary font-bold h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <Plus className="size-4 mr-2" /> Adicionar Coluna de Propriedade
        </Button>
      </div>

      {/* Visualizacao Desktop: Tabela Ampla com Rolagem Suave sem Esmagamento */}
      <div className="hidden md:block border rounded-lg overflow-x-auto bg-card mb-4">
        <table className="w-full min-w-3xl text-sm text-left">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 min-w-48 group bg-muted/90 backdrop-blur-xs sticky left-0 z-20 border-r border-border shadow-xs">
                <div className="flex items-center gap-1">
                  <Input
                    value={rowKey}
                    onChange={(e) => handleRenameDimension(rowKey, e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all font-bold uppercase px-1 -ml-1 cursor-text w-full focus-visible:ring-2 focus-visible:ring-ring"
                    title="Renomear matriz mãe"
                  />
                  <span className="text-xs font-normal lowercase opacity-70 whitespace-nowrap">
                    (Matriz Mãe)
                  </span>
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {displayColKeys.map((k, colIndex) => (
                    <Input
                      key={`col-${colIndex}`}
                      value={k}
                      onChange={(e) => handleRenameDimension(k, e.target.value)}
                      className="h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all font-semibold uppercase px-1 -ml-1 cursor-text w-32 focus-visible:ring-2 focus-visible:ring-ring"
                      title="Renomear coluna"
                    />
                  ))}
                </div>
              </th>
              <th className="px-4 py-3 text-center">Estoque</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Preço Exceção</th>
              {wholesaleEnabled && <th className="px-4 py-3">Preço Atacado (B2B)</th>}
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          {Array.from(grouped.entries()).map(([gName, gData], groupIndex) => {
            const sharedImage = gData.variants[0]?.image_url;
            return (
              <tbody
                key={`group-${groupIndex}`}
                className="divide-y divide-border/30 border-b-4 border-muted/50 last:border-b-0"
              >
                {gData.variants.map((variant, localIdx) => {
                  const globalIdx = gData.originalIndices[localIdx];
                  return (
                    <tr
                      key={variant.id || globalIdx}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      {/* Celula Agrupada (Matriz Mae) */}
                      {localIdx === 0 && (
                        <td
                          className="px-4 py-3 w-56 align-top border-r border-border bg-card sticky left-0 z-10 shadow-xs"
                          rowSpan={gData.variants.length + 1}
                        >
                          <div className="flex flex-col gap-3">
                            <Input
                              className="h-10 font-bold text-sm w-full bg-card focus-visible:ring-2 focus-visible:ring-ring"
                              value={gName}
                              onChange={(e) => {
                                const newName = e.target.value;
                                const newVariants = [...variants];
                                gData.originalIndices.forEach((idx) => {
                                  newVariants[idx] = {
                                    ...newVariants[idx],
                                    attributes: {
                                      ...newVariants[idx].attributes,
                                      [rowKey]: newName,
                                    },
                                  };
                                });
                                onChange(newVariants);
                              }}
                            />
                            {sharedImage ? (
                              <div className="relative group w-full aspect-square rounded-lg overflow-hidden border bg-card">
                                <img
                                  src={sharedImage}
                                  alt={gName}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleGroupImageUpdate(gName, null)}
                                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Remover foto"
                                >
                                  <X className="size-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-full aspect-square">
                                <ImageUpload
                                  onChange={(url) => handleGroupImageUpdate(gName, url)}
                                  bucket="product-media"
                                  variant="minimal"
                                  className="h-full w-full p-0 min-h-20 rounded-lg border-dashed bg-card"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Colunas de Atributos */}
                      <td className="px-4 py-3 font-medium text-xs text-muted-foreground align-middle">
                        <div className="flex flex-wrap gap-2">
                          {displayColKeys.map((k, colIdx) => (
                            <Input
                              key={`cell-${colIdx}`}
                              className="h-10 text-xs w-32 px-3 bg-card focus:ring-primary focus:border-primary transition-all focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder="Ex: Rosa 36"
                              value={variant.attributes[k] || ""}
                              onChange={(e) => {
                                const newVariants = [...variants];
                                newVariants[globalIdx] = {
                                  ...newVariants[globalIdx],
                                  attributes: {
                                    ...newVariants[globalIdx].attributes,
                                    [k]: e.target.value,
                                  },
                                };
                                onChange(newVariants);
                              }}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Estoque */}
                      <td className="px-4 py-2 w-32 align-middle">
                        <StockInput
                          value={variant.stock}
                          onChange={(newStock) => {
                            const newVariants = [...variants];
                            newVariants[globalIdx] = { ...variant, stock: newStock };
                            onChange(newVariants);
                          }}
                        />
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-2 w-48 align-middle">
                        <Input
                          type="text"
                          value={variant.sku || ""}
                          placeholder="Auto gerado"
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[globalIdx] = { ...variant, sku: e.target.value };
                            onChange(newVariants);
                          }}
                          className="h-10 font-mono text-xs bg-muted/20 hover:bg-muted/40 focus:bg-background transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </td>

                      {/* Preco Excecao */}
                      <td className="px-4 py-2 w-40 align-middle">
                        <PriceInput
                          valueCents={variant.price_override_cents ?? null}
                          basePriceCents={basePriceCents}
                          onChange={(newPrice) => {
                            const newVariants = [...variants];
                            newVariants[globalIdx] = { ...variant, price_override_cents: newPrice };
                            onChange(newVariants);
                          }}
                        />
                      </td>

                      {/* Preco Atacado / B2B */}
                      {wholesaleEnabled && (
                        <td className="px-4 py-2 w-40 align-middle">
                          <PriceInput
                            valueCents={variant.wholesale_price_cents ?? null}
                            basePriceCents={variant.price_override_cents ?? basePriceCents}
                            placeholder="Preço B2B"
                            onChange={(newPrice) => {
                              const newVariants = [...variants];
                              newVariants[globalIdx] = { ...variant, wholesale_price_cents: newPrice };
                              onChange(newVariants);
                            }}
                          />
                        </td>
                      )}

                      {/* Acoes Livres */}
                      <td className="px-4 py-2 w-28 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            title="Duplicar linha"
                            onClick={() => handleCloneVariant(globalIdx)}
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setAdvancedEditIndex(globalIdx)}
                            title="Edição Avançada"
                          >
                            <Settings className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => handleDeleteVariant(globalIdx)}
                            title="Remover linha"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Rodape do Grupo */}
                <tr>
                  <td
                    colSpan={wholesaleEnabled ? 6 : 5}
                    className="px-4 py-3 bg-muted/10 border-t-0 rounded-bl-xl rounded-br-xl"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-primary border border-dashed border-muted-foreground/30 bg-background/50 w-full justify-start h-10 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleAddVariantToGroup(gName)}
                    >
                      <Plus className="size-3 mr-2" /> Adicionar linha em {gName}
                    </Button>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>

      {/* Visualizacao Mobile: Cartoes Nativos com Touch Target >= 44px */}
      <div className="block md:hidden space-y-4 mb-4">
        {Array.from(grouped.entries()).map(([gName, gData], groupIndex) => {
          const sharedImage = gData.variants[0]?.image_url;
          return (
            <div key={`m-group-${groupIndex}`} className="p-4 rounded-xl border border-border bg-card space-y-4">
              <div className="flex items-center gap-3">
                {sharedImage ? (
                  <div className="relative size-14 rounded-lg overflow-hidden border bg-muted shrink-0">
                    <img src={sharedImage} alt={gName} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleGroupImageUpdate(gName, null)}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      aria-label="Remover foto"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="size-14 shrink-0">
                    <ImageUpload
                      onChange={(url) => handleGroupImageUpdate(gName, url)}
                      bucket="product-media"
                      variant="minimal"
                      className="h-full w-full p-0 min-h-14 rounded-lg border-dashed bg-card"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase text-muted-foreground">{rowKey}</span>
                  <Input
                    className="h-11 font-bold text-sm w-full bg-background focus-visible:ring-2 focus-visible:ring-ring"
                    value={gName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const newVariants = [...variants];
                      gData.originalIndices.forEach((idx) => {
                        newVariants[idx] = {
                          ...newVariants[idx],
                          attributes: {
                            ...newVariants[idx].attributes,
                            [rowKey]: newName,
                          },
                        };
                      });
                      onChange(newVariants);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {gData.variants.map((variant, localIdx) => {
                  const globalIdx = gData.originalIndices[localIdx];
                  return (
                    <div key={variant.id || globalIdx} className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {displayColKeys.map((k, colIdx) => (
                          <div key={`m-cell-${colIdx}`} className="flex-1 min-w-32">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">{k}</span>
                            <Input
                              className="h-11 text-xs bg-card focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder={`Valor de ${k}`}
                              value={variant.attributes[k] || ""}
                              onChange={(e) => {
                                const newVariants = [...variants];
                                newVariants[globalIdx] = {
                                  ...newVariants[globalIdx],
                                  attributes: {
                                    ...newVariants[globalIdx].attributes,
                                    [k]: e.target.value,
                                  },
                                };
                                onChange(newVariants);
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Estoque</span>
                          <StockInput
                            value={variant.stock}
                            onChange={(newStock) => {
                              const newVariants = [...variants];
                              newVariants[globalIdx] = { ...variant, stock: newStock };
                              onChange(newVariants);
                            }}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Preço Exceção</span>
                          <PriceInput
                            valueCents={variant.price_override_cents ?? null}
                            basePriceCents={basePriceCents}
                            onChange={(newPrice) => {
                              const newVariants = [...variants];
                              newVariants[globalIdx] = { ...variant, price_override_cents: newPrice };
                              onChange(newVariants);
                            }}
                          />
                        </div>
                      </div>

                      {wholesaleEnabled && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Preço Atacado (B2B)</span>
                          <PriceInput
                            valueCents={variant.wholesale_price_cents ?? null}
                            basePriceCents={variant.price_override_cents ?? basePriceCents}
                            placeholder="Preço B2B"
                            onChange={(newPrice) => {
                              const newVariants = [...variants];
                              newVariants[globalIdx] = { ...variant, wholesale_price_cents: newPrice };
                              onChange(newVariants);
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">SKU</span>
                        <Input
                          type="text"
                          value={variant.sku || ""}
                          placeholder="SKU da variação"
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[globalIdx] = { ...variant, sku: e.target.value };
                            onChange(newVariants);
                          }}
                          className="h-11 font-mono text-xs bg-card focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                          onClick={() => setAdvancedEditIndex(globalIdx)}
                        >
                          <Settings className="size-4" />
                          <span>Edição Avançada</span>
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                            title="Duplicar variação"
                            onClick={() => handleCloneVariant(globalIdx)}
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-destructive/70 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                            title="Excluir variação"
                            onClick={() => handleDeleteVariant(globalIdx)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-11 border-dashed text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  onClick={() => handleAddVariantToGroup(gName)}
                >
                  <Plus className="size-4" />
                  <span>Adicionar linha em {gName}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="w-full border-dashed bg-card/50 hover:bg-card text-foreground font-semibold h-11 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        onClick={handleAddEmptyVariant}
      >
        <Plus className="size-5 mr-2" /> Adicionar Nova Matriz Mãe (Ex: Nova Cor)
      </Button>

      {advancedEditIndex !== null && (
        <AdvancedVariantEditor
          variant={variants[advancedEditIndex]}
          basePriceCents={basePriceCents}
          isOpen={true}
          onClose={() => setAdvancedEditIndex(null)}
          onSave={(updatedVariant) => {
            const newVariants = [...variants];
            newVariants[advancedEditIndex] = updatedVariant;
            onChange(newVariants);
          }}
        />
      )}

      <ProductDimensionModal
        open={isAddDimensionOpen}
        onOpenChange={setIsAddDimensionOpen}
        dimensionName={newDimensionName}
        onDimensionNameChange={setNewDimensionName}
        dimensionValue={newDimensionValue}
        onDimensionValueChange={setNewDimensionValue}
        onSubmit={handleAddDimensionSubmit}
      />
    </>
  );
}

function PriceInput({
  valueCents,
  basePriceCents,
  onChange,
  placeholder,
}: {
  valueCents: number | null;
  basePriceCents: number;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <CurrencyField
      compact
      currencySymbol="R$"
      allowZero={true}
      value={valueCents}
      placeholder={placeholder || `Base: ${formatMoney(basePriceCents)}`}
      onChange={(cents) => {
        onChange(cents === undefined ? null : cents);
      }}
      className={`h-10 font-mono text-xs transition-colors ${
        valueCents != null
          ? "bg-warning/10 text-warning font-bold border-warning/30"
          : "bg-muted/20 hover:bg-muted/40 focus:bg-background"
      }`}
    />
  );
}

function StockInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [str, setStr] = React.useState(value === 0 ? "" : value.toString());

  React.useEffect(() => {
    const currentVal = str === "" ? 0 : parseInt(str) || 0;
    if (currentVal !== value) {
      setStr(value === 0 ? "" : value.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleBlur = () => {
    if (str && !isNaN(parseInt(str))) {
      const val = parseInt(str);
      setStr(val.toString());
      onChange(val);
    } else {
      setStr("");
      onChange(0);
    }
  };

  return (
    <Input
      type="number"
      min="0"
      value={str}
      placeholder="0"
      onChange={(e) => {
        setStr(e.target.value);
        if (e.target.value === "") {
          onChange(0);
          return;
        }
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
          onChange(val);
        }
      }}
      onBlur={handleBlur}
      className="h-10 font-mono text-center bg-muted/20 hover:bg-muted/40 focus:bg-background transition-colors focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
