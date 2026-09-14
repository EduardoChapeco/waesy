import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
 Plus,
 Edit3,
 Trash2,
 Search,
 FileText,
 Copy,
 ExternalLink,
 LayoutTemplate,
 Layers,
 Smartphone,
 CheckCircle2,
 Clock,
 Archive,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
 SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { listAdminPages, createPage, deletePage } from "@/services/cms.functions";
import { createExperienceDocument, duplicateExperienceDocument } from "@/services/builder.functions";

export const Route = createFileRoute("/workspace/cms/paginas/")({
 head: () => ({ meta: [{ title: "Páginas & Landing Pages | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const res = await listAdminPages();
 return res || [];
   } catch (err) {
     console.error("[loader:workspace.cms.paginas.index] Unhandled loader error:", err);
     return {} as any;
    }
 },
 component: CmsPagesPage,
});

const PAGE_TEMPLATES = [
 { id: "blank", label: "Página em Branco", desc: "Comece do zero com blocos livres" },
 { id: "landing_page", label: "Landing Page de Oferta", desc: "Hero, Cronômetro, Benefícios e CTA" },
 { id: "classic_commerce", label: "Vitrine de Coleção", desc: "Carrossel de Banners, Produtos e Mosaicos" },
 { id: "institutional_profile", label: "Quem Somos / Institucional", desc: "História da Marca, Timeline e Depoimentos" },
 { id: "biolink_classic", label: "Link da Bio (Linktree)", desc: "Cards verticais para redes sociais" },
];

function CmsPagesPage() {
 const router = useRouter();
 const navigate = useNavigate();
 const pages = Route.useLoaderData();

 const [search, setSearch] = useState("");
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
 const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 const [formData, setFormData] = useState({
 title: "",
 slug: "",
 template_id: "blank",
 document_type: "campaign" as "storefront" | "biolink" | "campaign" | "seller_showcase",
 });

 const filteredPages = useMemo(() => {
 if (!search.trim()) return pages;
 const term = search.toLowerCase();
 return pages.filter(
 (p: any) =>
 p.title?.toLowerCase().includes(term) ||
 p.slug?.toLowerCase().includes(term)
 );
 }, [pages, search]);

 const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const title = e.target.value;
 const slug = title
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
 setFormData({ ...formData, title, slug });
 };

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.title.trim() || !formData.slug.trim()) {
 toast.error("Preencha título e slug da página.");
 return;
 }

 setIsSubmitting(true);
 try {
 // 1. Create document directly via builder engine
 const res = await createExperienceDocument({
 data: {
 title: formData.title,
 slug: formData.slug,
 document_type: formData.document_type,
 template_id: formData.template_id,
 },
 });

 toast.success("Página criada com sucesso!");
 setIsCreateModalOpen(false);
 router.invalidate();

 // 2. Redirect straight to Visual Page Builder
 if (res?.data?.document?.id) {
 navigate({
 to: "/workspace/builder/$documentId/editor",
 params: { documentId: res.data.document.id },
 });
 }
 } catch (error: any) {
 toast.error(error.message || "Erro ao criar página.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDuplicate = async (id: string) => {
 setIsDuplicating(id);
 try {
 const res = await duplicateExperienceDocument({ data: { id } });
 toast.success("Página duplicada com sucesso!");
 router.invalidate();
 if (res?.documentId) {
 navigate({
 to: "/workspace/builder/$documentId/editor",
 params: { documentId: res.documentId },
 });
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao duplicar página.");
 } finally {
 setIsDuplicating(null);
 }
 };

  const handleDelete = (id: string, title: string) => {
    setPageToDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!pageToDelete) return;
    setIsDeleting(true);
    try {
      await deletePage({ data: { id: pageToDelete.id } });
      toast.success("Página excluída com sucesso.");
      setPageToDelete(null);
      router.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir página.");
    } finally {
      setIsDeleting(false);
    }
  };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <PageHeader
 eyebrow="CMS"
 title="Páginas"
 actions={
 <Sheet open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
 <SheetTrigger asChild>
 <Button className="h-10 px-4 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-sm">
 <Plus className="h-4 w-4" />
 <span>Nova Página</span>
 </Button>
 </SheetTrigger>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl lg:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-card">
 <SheetTitle className="text-base font-bold text-foreground">Nova Página</SheetTitle>
 </SheetHeader>
 <form onSubmit={handleCreate} className="flex-1 flex flex-col justify-between overflow-hidden">
 <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
 <div className="space-y-1.5">
 <Label htmlFor="title" className="text-xs font-bold">Título da Página *</Label>
 <Input
 id="title"
 value={formData.title}
 onChange={handleTitleChange}
 placeholder="Ex: Coleção Inverno 2026"
 className="h-10 rounded-xl text-xs"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="slug" className="text-xs font-bold">Slug (URL amigável) *</Label>
 <Input
 id="slug"
 value={formData.slug}
 onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
 placeholder="Ex: colecao-inverno"
 className="h-10 rounded-xl text-xs font-mono"
 required
 />
 <p className="text-[11px] text-muted-foreground">
 Acesso: /paginas/{formData.slug || "slug-da-pagina"}
 </p>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="template" className="text-xs font-bold">Modelo Inicial (Template)</Label>
 <Select
 value={formData.template_id}
 onValueChange={(val) => setFormData({ ...formData, template_id: val })}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {PAGE_TEMPLATES.map((t) => (
 <SelectItem key={t.id} value={t.id}>
 <div className="text-left">
 <span className="font-semibold text-foreground">{t.label}</span>
 <span className="block text-[10px] text-muted-foreground">{t.desc}</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="type" className="text-xs font-bold">Finalidade da Página</Label>
 <Select
 value={formData.document_type}
 onValueChange={(val: any) => setFormData({ ...formData, document_type: val })}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="campaign">Campanha / Landing Page</SelectItem>
 <SelectItem value="storefront">Página Principal / Vitrine</SelectItem>
 <SelectItem value="biolink">Link da Bio / Perfil</SelectItem>
 <SelectItem value="seller_showcase">Vitrine de Vendedor</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <SheetFooter className="p-4 border-t border-border/60 bg-card flex flex-row items-center justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsCreateModalOpen(false)}
 className="h-10 rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
 >
 <LayoutTemplate className="size-3.5" />
 <span>{isSubmitting ? "Criando..." : "Criar & Abrir no Builder"}</span>
 </Button>
 </SheetFooter>
 </form>
 </SheetContent>
 </Sheet>
 }
 />

 <div className="space-y-4">
 <div className="flex items-center gap-4">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar páginas por título ou slug..."
 className="pl-9 h-10 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 {filteredPages.length === 0 ? (
 <EmptyState
 title={search ? "Nenhuma página encontrada" : "Nenhuma página criada"}
 description={
 search
 ? "Tente buscar por outro termo."
 : "Crie sua primeira landing page ou página institucional usando o Construtor Visual."
 }
 />
 ) : (
 <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
 <Table>
 <TableHeader>
 <TableRow className="hover:bg-transparent">
 <TableHead className="text-xs font-bold">Título da Página</TableHead>
 <TableHead className="text-xs font-bold">URL Pública</TableHead>
 <TableHead className="text-xs font-bold">Status</TableHead>
 <TableHead className="text-right text-xs font-bold">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredPages.map((page: any) => (
 <TableRow key={page.id} className="hover:bg-muted/40 transition-colors">
 <TableCell className="font-medium">
 <div className="flex items-center gap-2.5">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <FileText className="h-4 w-4" />
 </div>
 <div>
 <p className="text-xs font-bold text-foreground">{page.title}</p>
 <p className="text-[10px] text-muted-foreground font-mono">ID: {page.id?.slice(0, 8)}</p>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <Link
 to="/paginas/$slug"
 params={{ slug: page.slug }}
 target="_blank"
 className="text-xs text-muted-foreground hover:text-primary font-mono inline-flex items-center gap-1 hover:underline"
 >
 <span>/paginas/{page.slug}</span>
 <ExternalLink className="size-3" />
 </Link>
 </TableCell>
 <TableCell>
 <Badge
 variant={page.status === "published" ? "default" : "secondary"}
 className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
 >
 {page.status === "published" ? "Publicada" : "Rascunho"}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <div className="flex justify-end items-center gap-1.5">
 <Button
 asChild
 size="sm"
 className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
 >
 <Link
 to="/workspace/builder/$documentId/editor"
 params={{ documentId: page.id }}
 >
 <LayoutTemplate className="size-3.5" />
 <span>Editar no Builder</span>
 </Link>
 </Button>
 <Button
 variant="outline"
 size="icon"
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 title="Duplicar página"
 disabled={isDuplicating === page.id}
 onClick={() => handleDuplicate(page.id)}
 >
 <Copy className="size-3.5" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
 title="Excluir página"
 onClick={() => handleDelete(page.id, page.title)}
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </div>

 {/* Diálogo de Confirmação de Exclusão de Página */}
 <AlertDialog open={Boolean(pageToDelete)} onOpenChange={(open) => { if (!open) setPageToDelete(null); }}>
 <AlertDialogContent className="max-w-md rounded-2xl p-6 border-border/80">
 <AlertDialogHeader>
 <AlertDialogTitle className="text-base font-bold">
 Excluir página?
 </AlertDialogTitle>
 <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
 Tem certeza que deseja excluir a página <strong className="text-foreground">"{pageToDelete?.title}"</strong>?
 Esta ação não poderá ser desfeita e removerá a página pública e todas as suas seções do Construtor.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter className="mt-4 gap-2">
 <AlertDialogCancel
 disabled={isDeleting}
 className="h-10 px-4 rounded-xl text-xs font-semibold"
 >
 Cancelar
 </AlertDialogCancel>
 <AlertDialogAction
 onClick={(e) => {
 e.preventDefault();
 confirmDelete();
 }}
 disabled={isDeleting}
 className="h-10 px-4 rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
 >
 {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 );
}
