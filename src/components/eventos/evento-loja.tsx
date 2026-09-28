import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Package, ShoppingBag, Layers, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CurrencyField } from "@/components/ui/currency-field";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { listEventStoreProducts, upsertEventStoreProduct, deleteEventStoreProduct } from "@/services/events.functions";

interface EventoLojaProps {
  eventId: string;
}

interface ProductItem {
  id: string;
  nome: string;
  descricao?: string | null;
  price_cents: number;
  estoque_atual: number;
  ativo: boolean;
  imagem_url?: string | null;
  is_bundle: boolean;
  bundle_items?: any[] | null;
}

export function EventoLoja({ eventId }: EventoLojaProps) {
  const [produtos, setProdutos] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [priceCents, setPriceCents] = useState(2500);
  const [estoque, setEstoque] = useState(100);
  const [imagemUrl, setImagemUrl] = useState("");
  const [isBundle, setIsBundle] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await listEventStoreProducts({ data: { eventId } });
      setProdutos(data || []);
    } catch (err) {
      console.error("Erro ao carregar produtos da loja do evento:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [eventId]);

  const resetForm = () => {
    setEditingProduct(null);
    setNome("");
    setDescricao("");
    setPriceCents(2500);
    setEstoque(100);
    setImagemUrl("");
    setIsBundle(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (prod: ProductItem) => {
    setEditingProduct(prod);
    setNome(prod.nome);
    setDescricao(prod.descricao || "");
    setPriceCents(prod.price_cents || 0);
    setEstoque(prod.estoque_atual || 0);
    setImagemUrl(prod.imagem_url || "");
    setIsBundle(prod.is_bundle || false);
    setIsDialogOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }

    setIsSaving(true);
    try {
      await upsertEventStoreProduct({
        data: {
          id: editingProduct?.id,
          eventId,
          nome,
          descricao: descricao || undefined,
          priceCents,
          estoqueAtual: estoque,
          imagemUrl: imagemUrl || undefined,
          isBundle,
        },
      });

      toast.success(editingProduct ? "Produto atualizado!" : "Produto cadastrado na loja!");
      setIsDialogOpen(false);
      resetForm();
      await loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar produto.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este item da loja do evento?")) return;
    try {
      await deleteEventStoreProduct({ data: { productId: id } });
      toast.success("Produto removido com sucesso.");
      setProdutos((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover produto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            Loja Oficial e Bar do Evento
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de cardápio, fichas de consumo, merchandising oficial, copos colecionáveis e combos.
          </p>
        </div>

        <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 font-bold h-9">
          <Plus className="size-4" />
          Novo Produto / Combo
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Carregando catálogo da loja...
        </div>
      ) : produtos.length === 0 ? (
        <Card className="bg-card rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Package className="size-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Nenhum produto cadastrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Cadastre bebidas, alimentos ou itens de vestuário para venda antecipada e no caixa do evento.
            </p>
          </div>
          <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-1.5">
            <Plus className="size-4" /> Cadastrar 1º Item
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtos.map((prod) => (
            <Card
              key={prod.id}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col justify-between hover:border-border transition-colors"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {prod.is_bundle ? (
                      <Badge variant="secondary" className="mb-1 text-[10px] uppercase font-bold bg-purple-500/10 text-purple-600 border-purple-500/20">
                        Combo / Kit
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mb-1 text-[10px] uppercase text-muted-foreground">
                        Unitário
                      </Badge>
                    )}
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{prod.nome}</h3>
                  </div>
                  <span className="font-mono font-bold text-sm text-foreground shrink-0">
                    {formatMoney(prod.price_cents)}
                  </span>
                </div>

                {prod.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {prod.descricao}
                  </p>
                )}

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Estoque Disponível:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {prod.estoque_atual} un
                  </span>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-muted/20 border-t border-border/40 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(prod)}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Edit className="size-3" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProduct(prod.id)}
                  className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3" /> Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Produto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Item da Loja" : "Novo Item para a Loja"}
            </DialogTitle>
            <DialogDescription>
              Itens disponíveis para consumo, cashless e balcão oficial durante o evento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-nome" className="text-xs">Nome do Produto *</Label>
              <Input
                id="prod-nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Chopp Artesanal 500ml ou Copo Eco Nexus"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-price" className="text-xs">Preço Unitário (R$) *</Label>
                <CurrencyField
                  value={priceCents}
                  onChange={(val) => setPriceCents(val || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-estoque" className="text-xs">Estoque Inicial (Qtd) *</Label>
                <Input
                  id="prod-estoque"
                  type="number"
                  required
                  min={0}
                  value={estoque}
                  onChange={(e) => setEstoque(parseInt(e.target.value, 10) || 0)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-desc" className="text-xs">Descrição / Detalhes</Label>
              <Textarea
                id="prod-desc"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Cerveja pilsen puro malte gelada servida no copo oficial."
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="is-bundle"
                type="checkbox"
                checked={isBundle}
                onChange={(e) => setIsBundle(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="is-bundle" className="text-xs font-medium cursor-pointer">
                Este produto é um combo / kit promocional
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="font-bold">
                {isSaving ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Adicionar Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
