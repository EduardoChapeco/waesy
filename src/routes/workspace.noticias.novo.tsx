import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
 Newspaper,
 Plus,
 Trash2,
 Image,
 Quote,
 Heading,
 AlignLeft,
 ArrowLeft,
 CheckCircle2,
 Loader2,
 Eye,
 Sliders,
 Globe,
 Link as LinkIcon,
 X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/commerce/page-header";
import { ImageUpload } from "@/components/ui/image-upload";
import { createArticle, type NewsSectionDTO } from "@/services/news.functions";
import { processUrlWithAI } from "@/services/mining.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/noticias/novo")({
 head: () => ({ meta: [{ title: "Nova Matéria | Redação Waesy | Workspace Waesy" }] }),
 component: WorkspaceNovaMateriaPage,
});

function WorkspaceNovaMateriaPage() {
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);

 // IA Importer State
 const [showAiImport, setShowAiImport] = useState(false);
 const [aiUrl, setAiUrl] = useState("");
 const [aiTone, setAiTone] = useState<"editorial" | "profissional" | "tecnico" | "persuasivo" | "minimalista">("editorial");
 const [isAiProcessing, setIsAiProcessing] = useState(false);
 const [extractedSourceDomain, setExtractedSourceDomain] = useState<string | null>(null);

 // Campos principais
 const [title, setTitle] = useState("");
 const [slug, setSlug] = useState("");
 const [kicker, setKicker] = useState("");
 const [subtitle, setSubtitle] = useState("");
 const [category, setCategory] = useState("cidade");
 const [coverMediaUrl, setCoverMediaUrl] = useState("");
 const [coverMediaType, setCoverMediaType] = useState<"image" | "video" | "gif">("image");
 const [readingTime, setReadingTime] = useState(3);

 // Seções do artigo
 const [sections, setSections] = useState<NewsSectionDTO[]>([
 { type: "paragraph", content: "" },
 ]);

 const handleTitleChange = (val: string) => {
 setTitle(val);
 if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
 const generated = val
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
 setSlug(generated);
 }
 };

 const addSection = (type: "paragraph" | "heading" | "quote" | "gallery") => {
 setSections([...sections, { type, content: "" }]);
 };

 const updateSectionContent = (index: number, content: string | string[], caption?: string) => {
 const updated = [...sections];
 updated[index] = { ...updated[index], content, caption };
 setSections(updated);
 };

 const removeSection = (index: number) => {
 if (sections.length <= 1) return;
 setSections(sections.filter((_, i) => i !== index));
 };

 const handleAiExtract = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!aiUrl.trim()) return;

 setIsAiProcessing(true);
 try {
 const result = await processUrlWithAI({
 data: {
 url: aiUrl.trim(),
 tone: aiTone,
 content_type: "news",
 auto_enqueue: false,
 consume_tokens: false,
 },
 });

 if (result.ai_structured_title) handleTitleChange(result.ai_structured_title);
 if (result.ai_structured_subtitle) setSubtitle(result.ai_structured_subtitle);
 if (result.ai_suggested_kicker) setKicker(result.ai_suggested_kicker);
 if (result.ai_suggested_category) setCategory(result.ai_suggested_category);
 if (result.ai_suggested_cover_url) setCoverMediaUrl(result.ai_suggested_cover_url);
 if (result.ai_estimated_reading_time) setReadingTime(result.ai_estimated_reading_time);

 if (result.ai_structured_sections && Array.isArray(result.ai_structured_sections) && result.ai_structured_sections.length > 0) {
 setSections(result.ai_structured_sections as NewsSectionDTO[]);
 }

 setExtractedSourceDomain(result.source_domain);
 setShowAiImport(false);
 setAiUrl("");
 toast.success(`Notícia estruturada com sucesso! Qualidade: ${result.quality_score || 80}/100`);
 } catch (err: any) {
 toast.error(err.message || "Erro ao extrair conteúdo da URL");
 } finally {
 setIsAiProcessing(false);
 }
 };

 const handleSubmit = async (status: "published" | "draft") => {
 if (!title.trim() || title.length < 3) {
 toast.error("Informe um título com pelo menos 3 caracteres.");
 return;
 }
 if (!slug.trim()) {
 toast.error("Informe o slug identificador da matéria.");
 return;
 }

 const validSections = sections.filter((s) => String(s.content).trim().length > 0);
 if (validSections.length === 0 && !subtitle.trim()) {
 toast.error("Adicione pelo menos um parágrafo de conteúdo.");
 return;
 }

 setIsSubmitting(true);
 try {
 await createArticle({
 data: {
 title: title.trim(),
 slug: slug.trim(),
 kicker: kicker.trim() || undefined,
 subtitle: subtitle.trim() || undefined,
 content_sections: validSections,
 cover_media_url: coverMediaUrl.trim() || undefined,
 cover_media_type: coverMediaType,
 category,
 reading_time_minutes: readingTime,
 status,
 },
 });

 toast.success(
 status === "published"
 ? "Matéria publicada com sucesso!"
 : "Rascunho salvo com sucesso!",
 );
 navigate({ to: "/workspace/noticias" });
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao salvar matéria.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header */}
 <PageHeader
 eyebrow="Redação"
 title="Nova Matéria"
 actions={
 <div className="flex items-center gap-2">
 <Button asChild variant="outline" size="sm" className="rounded-xl font-bold text-xs">
 <Link to="/workspace/noticias">
 <ArrowLeft className="size-3.5 mr-1.5" />
 Voltar
 </Link>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setShowAiImport(!showAiImport)}
 className="rounded-xl font-bold text-xs border-primary/40 text-primary hover:bg-primary/10"
 >
 <Globe className="size-3.5 mr-1.5" />
 Importar de Link
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={isSubmitting}
 onClick={() => handleSubmit("draft")}
 className="rounded-xl font-bold text-xs"
 >
 Salvar Rascunho
 </Button>
 <Button
 type="button"
 size="sm"
 disabled={isSubmitting}
 onClick={() => handleSubmit("published")}
 className="rounded-xl font-bold text-xs bg-primary text-primary-foreground"
 >
 {isSubmitting ? (
 <Loader2 className="size-3.5 animate-spin mr-1.5" />
 ) : (
 <CheckCircle2 className="size-3.5 mr-1.5" />
 )}
 <span>Publicar</span>
 </Button>
 </div>
 }
 />

 {/* ── Modal / Caixa de Importação IA ── */}
 {showAiImport && (
 <div className="p-5 rounded-2xl bg-primary/5 border border-primary/30 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
 <Globe className="size-4" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">Importar Notícia de Link Externo</h3>
 <p className="text-[11px] text-muted-foreground">Cole a URL de qualquer portal de notícias para estruturar os blocos editoriais automaticamente.</p>
 </div>
 </div>
 <button onClick={() => setShowAiImport(false)} className="text-muted-foreground hover:text-foreground">
 <X className="size-4" />
 </button>
 </div>

 <form onSubmit={handleAiExtract} className="space-y-3">
 <div className="flex flex-col sm:flex-row gap-2">
 <div className="relative flex-1">
 <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 type="url"
 placeholder="https://g1.globo.com/sc/..."
 value={aiUrl}
 onChange={(e) => setAiUrl(e.target.value)}
 className="rounded-xl h-10 pl-9 text-xs border-border/60"
 required
 />
 </div>
 <select
 value={aiTone}
 onChange={(e) => setAiTone(e.target.value as any)}
 className="h-10 px-3 rounded-xl border border-border/60 bg-background text-xs font-semibold"
 >
 <option value="editorial">Tom Editorial</option>
 <option value="profissional">Tom Profissional</option>
 <option value="imparcial">Tom Imparcial / Factual</option>
 </select>
 <Button
 type="submit"
 disabled={isAiProcessing || !aiUrl.trim()}
 className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5 h-10 px-4 shrink-0"
 >
 {isAiProcessing ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 Processando...
 </>
 ) : (
 <>
 <Globe className="size-3.5" />
 Estruturar Matéria
 </>
 )}
 </Button>
 </div>
 </form>
 </div>
 )}

 {extractedSourceDomain && (
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 font-medium">
 <CheckCircle2 className="size-3.5" />
 <span>Conteúdo importado e reestruturado a partir de: <strong>{extractedSourceDomain}</strong></span>
 </div>
 )}

 <div className="space-y-6">
 {/* ── 1. Metadados e Manchete ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4">
 <span className="text-xs font-black uppercase tracking-wider text-primary">
 1. Estrutura Editorial
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Chapéu / Kicker</Label>
 <Input
 placeholder="Ex: POLÍTICA LOCAL"
 value={kicker}
 onChange={(e) => setKicker(e.target.value)}
 className="rounded-xl h-10 uppercase text-xs border-border/60"
 />
 </div>

 <div className="space-y-1.5 sm:col-span-2">
 <Label className="text-xs font-bold">Categoria / Editoria</Label>
 <select
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-xs font-semibold"
 >
 <option value="cidade">Cidade & Região</option>
 <option value="politica">Política</option>
 <option value="economia">Economia & Negócios</option>
 <option value="cultura">Cultura & Lazer</option>
 <option value="esportes">Esportes</option>
 <option value="tecnologia">Inovação & Tecnologia</option>
 <option value="geral">Geral</option>
 </select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Manchete / Título Principal *</Label>
 <Input
 placeholder="Digite o título da matéria..."
 value={title}
 onChange={(e) => handleTitleChange(e.target.value)}
 className="rounded-xl h-11 text-sm font-bold border-border/60"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Subtítulo / Lead</Label>
 <textarea
 placeholder="Breve resumo ou linha de apoio da matéria..."
 value={subtitle}
 onChange={(e) => setSubtitle(e.target.value)}
 rows={2}
 className="w-full p-3 rounded-xl border border-border/60 bg-background text-xs font-medium resize-none focus:outline-none focus:border-primary"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Slug URL *</Label>
 <Input
 placeholder="slug-da-materia"
 value={slug}
 onChange={(e) => setSlug(e.target.value)}
 className="rounded-xl h-10 font-mono text-xs border-border/60"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Tempo Estimado de Leitura (minutos)</Label>
 <Input
 type="number"
 min={1}
 max={60}
 value={readingTime}
 onChange={(e) => setReadingTime(parseInt(e.target.value) || 3)}
 className="rounded-xl h-10 text-xs border-border/60"
 />
 </div>
 </div>
 </div>

 {/* ── 2. Mídia de Capa ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4">
 <span className="text-xs font-black uppercase tracking-wider text-primary">
 2. Imagem de Capa
 </span>

 <div className="space-y-1.5 max-w-xl">
 <ImageUpload
 value={coverMediaUrl}
 onChange={(url) => setCoverMediaUrl(url)}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Upload ou recorte de imagem em formato panorâmico (16:10 / 16:9)"
 />
 </div>
 </div>

 {/* ── 3. Corpo da Matéria (Blocos) ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-xs font-black uppercase tracking-wider text-primary">
 3. Conteúdo da Matéria ({sections.length} seções)
 </span>

 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => addSection("paragraph")}
 className="h-8 text-xs font-bold gap-1 rounded-xl"
 >
 <AlignLeft className="size-3" />
 Parágrafo
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => addSection("heading")}
 className="h-8 text-xs font-bold gap-1 rounded-xl"
 >
 <Heading className="size-3" />
 Subtítulo
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => addSection("quote")}
 className="h-8 text-xs font-bold gap-1 rounded-xl"
 >
 <Quote className="size-3" />
 Citação
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => addSection("gallery")}
 className="h-8 text-xs font-bold gap-1 rounded-xl"
 >
 <Image className="size-3" />
 Foto
 </Button>
 </div>
 </div>

 <div className="space-y-3">
 {sections.map((section, idx) => (
 <div
 key={idx}
 className="p-4 rounded-xl bg-background border border-border/60 space-y-2 relative group"
 >
 <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
 <span className="uppercase text-[10px] font-bold">
 {section.type === "paragraph" && "Parágrafo"}
 {section.type === "heading" && "Subtítulo de Seção"}
 {section.type === "quote" && "Citação / Aspas"}
 {section.type === "gallery" && "Foto / Imagem"}
 </span>
 {sections.length > 1 && (
 <button
 type="button"
 onClick={() => removeSection(idx)}
 className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
 title="Remover seção"
 >
 <Trash2 className="size-3.5" />
 </button>
 )}
 </div>

 {section.type === "heading" ? (
 <Input
 placeholder="Digite o subtítulo da seção..."
 value={typeof section.content === "string" ? section.content : ""}
 onChange={(e) => updateSectionContent(idx, e.target.value)}
 className="rounded-lg font-bold text-sm h-10"
 />
 ) : section.type === "quote" ? (
 <div className="space-y-2">
 <textarea
 placeholder="Texto da declaração ou citação..."
 value={typeof section.content === "string" ? section.content : ""}
 onChange={(e) => updateSectionContent(idx, e.target.value, section.caption)}
 rows={2}
 className="w-full p-2.5 rounded-lg border border-border/60 bg-card text-xs italic resize-none focus:outline-none focus:border-primary"
 />
 <Input
 placeholder="Fonte / Autor da declaração (ex: Prefeito Municipal)"
 value={section.caption || ""}
 onChange={(e) => updateSectionContent(idx, typeof section.content === "string" ? section.content : section.content.join("\n"), e.target.value)}
 className="rounded-lg text-xs h-8"
 />
 </div>
 ) : section.type === "gallery" ? (
 <div className="space-y-2">
 <ImageUpload
 value={typeof section.content === "string" ? section.content : ""}
 onChange={(url) => updateSectionContent(idx, url, section.caption)}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Upload ou recorte da imagem (16:9 / 4:3)"
 />
 <Input
 placeholder="Legenda da foto / Crédito (ex: Foto: Divulgação / Acervo)"
 value={section.caption || ""}
 onChange={(e) => updateSectionContent(idx, section.content, e.target.value)}
 className="rounded-lg text-xs h-8"
 />
 </div>
 ) : (
 <textarea
 placeholder="Escreva o parágrafo..."
 value={typeof section.content === "string" ? section.content : ""}
 onChange={(e) => updateSectionContent(idx, e.target.value)}
 rows={4}
 className="w-full p-3 rounded-lg border border-border/60 bg-card text-xs font-normal leading-relaxed resize-none focus:outline-none focus:border-primary"
 />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
