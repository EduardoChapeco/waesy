import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { getExperienceDocument, saveBuilderNodes, publishBuilderVersion, updateExperienceDocumentSettings } from "@/services/builder.functions";
import { listCategories, listCollections, listAdminProducts } from "@/services/admin-catalog.functions";
import { BuilderTopBar } from "@/components/admin/builder/builder-top-bar";
import { BuilderDockedRail, type DockedRailActivePanel } from "@/components/admin/builder/builder-docked-rail";
import { BuilderAddPanel3Col } from "@/components/admin/builder/builder-add-panel-3col";
import { BuilderLeftPanel } from "@/components/admin/builder/builder-left-panel";
import { BuilderPagesPanel, type BuilderPageItem } from "@/components/admin/builder/builder-pages-panel";
import { BuilderGlobalThemePanel, type GlobalThemeConfig } from "@/components/admin/builder/builder-global-theme-panel";
import { BuilderCmsPanel } from "@/components/admin/builder/builder-cms-panel";
import { BuilderCanvas, ViewportMode } from "@/components/admin/builder/builder-canvas";
import { BuilderInspector, InspectorTab } from "@/components/admin/builder/builder-inspector";
import { BuilderLayoutSwitcherModal } from "@/components/admin/builder/builder-layout-switcher-modal";
import { GuidedSectionPicker } from "@/components/admin/builder/guided-section-picker";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { SectionTemplate } from "@/lib/builder-types";
import { builderRegistry } from "@/lib/builder-registry";

export const Route = createFileRoute("/workspace/builder/$documentId/editor")({
 head: () => ({ meta: [{ title: "Editor Visual de Páginas | Workspace Waesy" }] }),
 loader: async ({ params }) => {
   try {
 const [docData, categories, collections, productsRes] = await Promise.all([
 getExperienceDocument({ data: { id: params.documentId } }),
 listCategories().catch(() => []),
 listCollections().catch(() => []),
 listAdminProducts().catch(() => []),
 ]);

 const realProducts = Array.isArray(productsRes) 
 ? productsRes 
 : ((productsRes as any)?.products || (productsRes as any)?.data || []);

 return {
 ...docData.data,
 categories: categories || [],
 collections: collections || [],
 products: realProducts,
 };
   } catch (err) {
     console.error("[loader:workspace.builder.$documentId.editor] Unhandled loader error:", err);
     return {
       document: null,
       version: null,
       nodes: [],
       categories: [],
       collections: [],
       products: [],
     };
   }
 },
 component: BuilderEditorPage,
});

function BuilderEditorPage() {
 const initialData = (Route.useLoaderData() as any) || {};
 const navigate = useNavigate();

 const [document] = useState(initialData?.document || null);
 const [version, setVersion] = useState(initialData?.version || null);
 const [nodes, setNodes] = useState<any[]>(() => {
 const raw = initialData?.nodes || [];
 return raw.map((n: any, idx: number) => ({
 ...n,
 content: n.content && typeof n.content === "object" ? n.content : {},
 design_tokens: n.design_tokens && typeof n.design_tokens === "object" ? n.design_tokens : {},
 layout_rules: n.layout_rules && typeof n.layout_rules === "object" ? n.layout_rules : {},
 responsive_overrides: n.responsive_overrides && typeof n.responsive_overrides === "object" ? n.responsive_overrides : {},
 data_bindings: n.data_bindings && typeof n.data_bindings === "object" ? n.data_bindings : {},
 action_bindings: n.action_bindings && typeof n.action_bindings === "object" ? n.action_bindings : {},
 sort_order: typeof n.sort_order === "number" ? n.sort_order : idx,
 is_hidden: Boolean(n.is_hidden),
 }));
 });

 // Configurações Globais Persistidas (settings JSONB no Supabase)
 const initialSettings = (initialData?.document as any)?.settings || {};

 // Páginas do Site (Multi-Page Architecture)
 const [pages, setPages] = useState<BuilderPageItem[]>(() => {
 if (Array.isArray(initialSettings.pages) && initialSettings.pages.length > 0) {
 return initialSettings.pages;
 }
 return [
 {
 id: "home",
 title: "Página Inicial",
 slug: initialData?.document?.slug || "inicio",
 is_home: true,
 },
 ];
 });
 const [activePageId, setActivePageId] = useState<string>(() => pages[0]?.id || "home");

 // Tema & Estilo Global (Theme Studio Standard)
 const [themeConfig, setThemeConfig] = useState<GlobalThemeConfig>(() => ({
 primaryColor: initialSettings.theme?.primaryColor || "#09090b",
 backgroundColor: initialSettings.theme?.backgroundColor || "#ffffff",
 textColor: initialSettings.theme?.textColor || "#09090b",
 headingFont: initialSettings.theme?.headingFont || "Inter, sans-serif",
 bodyFont: initialSettings.theme?.bodyFont || "Inter, sans-serif",
 borderRadius: initialSettings.theme?.borderRadius || "xl",
 surfaceStyle: initialSettings.theme?.surfaceStyle || "clean",
 }));

 // Dados Dinâmicos em Tempo Real (Live Data Binding Estrito)
 const transientData = React.useMemo(() => {
   const products = (initialData as any).products || [];

 return {
 products,
 collections: (initialData as any).collections || [],
 categories: (initialData as any).categories || [],
 store: (initialData as any).store || {
 name: document?.title || "Sua Vitrine Conceito",
 description: "Experiência de compras com qualidade, design e atendimento premium.",
 },
 store_hero: {
 name: document?.title || "Sua Vitrine Conceito",
 description: "Experiência de compras com qualidade, design e atendimento premium.",
 cover_url:
 "",
 },
 store_contact: {
 name: document?.title || "Sua Vitrine Conceito",
 phone: "(11) 99999-8888",
 whatsapp: "5511999998888",
 address: "Av. Paulista, 1000",
 city: "São Paulo",
 state: "SP",
 },
 store_hours: {
 is_open: true,
 status_text: "Aberto agora até às 20:00",
 },
 banners: [
 {
 title: "Nova Coleção Exclusiva",
 subtitle: "Design contemporâneo e tecidos de alto padrão.",
 image_url:
 "",
 mobile_image_url:
 "",
 link: "#",
 button_text: "Explorar Coleção",
 },
 ],
 };
 }, [initialData, document]);

 // History State
 const [history, setHistory] = useState<any[][]>([initialData.nodes || []]);
 const [historyIndex, setHistoryIndex] = useState(0);

 // UI State (Wix Studio Standard)
 const [dockedPanel, setDockedPanel] = useState<DockedRailActivePanel>(null);
 const [viewport, setViewport] = useState<ViewportMode>("desktop");
 const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
 const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
 const [blockCategory, setBlockCategory] = useState("hero");

 // Modals & Panels
 const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
 const [isLayoutSwitcherOpen, setIsLayoutSwitcherOpen] = useState(false);
 const [isLegacySectionPickerOpen, setIsLegacySectionPickerOpen] = useState(false);
 const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);

 // Saving & Publishing State
 const [isSaving, setIsSaving] = useState(false);
 const [isPublishing, setIsPublishing] = useState(false);

 // History Actions
 const pushHistory = useCallback(
 (newNodes: any[]) => {
 setHistory((prev) => {
 const newHistory = prev.slice(0, historyIndex + 1);
 newHistory.push(newNodes);
 return newHistory.slice(-30);
 });
 setHistoryIndex((prev) => Math.min(prev + 1, 29));
 setNodes(newNodes);
 },
 [historyIndex],
 );

 const undo = () => {
 if (historyIndex > 0) {
 setHistoryIndex(historyIndex - 1);
 setNodes(history[historyIndex - 1]);
 }
 };

 const redo = () => {
 if (historyIndex < history.length - 1) {
 setHistoryIndex(historyIndex + 1);
 setNodes(history[historyIndex + 1]);
 }
 };

 // Node Mutations
 const updateNode = (nodeId: string, section: string, field: string, value: any) => {
 const newNodes = nodes.map((n) => {
 if (n.id === nodeId) {
 if (section === "root") {
 return { ...n, [field]: value };
 }
 return {
 ...n,
 [section]: {
 ...(n[section] || {}),
 [field]: value,
 },
 };
 }
 return n;
 });
 pushHistory(newNodes);
 };

 const deleteNode = (nodeId: string, e?: any) => {
 e?.stopPropagation();
 const getDescendants = (id: string, allNodes: any[]): string[] => {
 const children = allNodes.filter((n) => n.parent_id === id);
 return [
 ...children.map((c) => c.id),
 ...children.flatMap((c) => getDescendants(c.id, allNodes)),
 ];
 };
 const toDelete = [nodeId, ...getDescendants(nodeId, nodes)];
 const newNodes = nodes.filter((n) => !toDelete.includes(n.id));
 if (selectedNodeId && toDelete.includes(selectedNodeId)) {
 setSelectedNodeId(null);
 }
 pushHistory(newNodes);
 toast.success("Bloco removido.");
 };

 const duplicateNode = (nodeId: string) => {
 const nodeToClone = nodes.find((n) => n.id === nodeId);
 if (!nodeToClone) return;

 const idMap = new Map<string, string>();
 const getDescendants = (id: string, allNodes: any[]): any[] => {
 const children = allNodes.filter((n) => n.parent_id === id);
 return [...children, ...children.flatMap((c) => getDescendants(c.id, allNodes))];
 };

 const treeToClone = [nodeToClone, ...getDescendants(nodeId, nodes)];
 treeToClone.forEach((n) => idMap.set(n.id, crypto.randomUUID()));

 const clonedNodes = treeToClone.map((n) => ({
 ...n,
 id: idMap.get(n.id)!,
 parent_id: n.parent_id === nodeToClone.parent_id ? nodeToClone.parent_id : idMap.get(n.parent_id) || null,
 sort_order: (n.sort_order || 0) + 1,
 }));

 const newNodes = [...nodes, ...clonedNodes];
 pushHistory(newNodes);
 setSelectedNodeId(clonedNodes[0].id);
 toast.success("Bloco duplicado com sucesso!");
 };

 const moveNode = (nodeId: string, direction: -1 | 1, e?: any) => {
 e?.stopPropagation();
 const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
 if (nodeIndex === -1) return;

 const node = nodes[nodeIndex];
 const siblings = nodes
 .filter((n) => n.parent_id === node.parent_id)
 .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

 const currentIndex = siblings.findIndex((n) => n.id === nodeId);
 if (
 (direction === -1 && currentIndex === 0) ||
 (direction === 1 && currentIndex === siblings.length - 1)
 )
 return;

 const targetIndex = currentIndex + direction;
 const targetNode = siblings[targetIndex];

 const newNodes = nodes.map((n) => {
 if (n.id === node.id) return { ...n, sort_order: targetNode.sort_order };
 if (n.id === targetNode.id) return { ...n, sort_order: node.sort_order };
 return n;
 });

 pushHistory(newNodes);
 };

 const reorderNodeAbsolute = (draggedId: string, targetId: string) => {
 const draggedNode = nodes.find((n) => n.id === draggedId);
 const targetNode = nodes.find((n) => n.id === targetId);
 if (!draggedNode || !targetNode) return;

 const newParentId = targetNode.parent_id;
 const newSortOrder = (targetNode.sort_order || 0) + 1;

 const newNodes = nodes.map((n) => {
 if (n.id === draggedId) {
 return { ...n, parent_id: newParentId, sort_order: newSortOrder };
 }
 if (n.parent_id === newParentId && (n.sort_order || 0) >= newSortOrder && n.id !== draggedId) {
 return { ...n, sort_order: (n.sort_order || 0) + 1 };
 }
 return n;
 });

 pushHistory(newNodes);
 };

 // Inserção de Seção Completa (Template) com Mapeamento Canônico de Nós
 const handleSelectTemplate = (template: SectionTemplate) => {
 if (!template || !Array.isArray(template.nodes) || template.nodes.length === 0) {
 toast.error("Modelo de seção inválido ou vazio.");
 return;
 }

 const idMap = new Map<string, string>();
 template.nodes.forEach((n) => {
 if (n.id) idMap.set(n.id, crypto.randomUUID());
 });

 const highestSortOrder = nodes
 .filter((n) => n.parent_id === null)
 .reduce((max, n) => Math.max(max, n.sort_order || 0), 0);

 const newSectionNodes = template.nodes.map((n) => {
 const newId = idMap.get(n.id!) ?? crypto.randomUUID();
 const newParentId = n.parent_id ? idMap.get(n.parent_id) || null : null;
 return {
 ...n,
 id: newId,
 version_id: version?.id,
 parent_id: newParentId,
 content: n.content ? { ...n.content } : {},
 design_tokens: n.design_tokens ? { ...n.design_tokens } : {},
 layout_rules: n.layout_rules ? { ...n.layout_rules } : {},
 data_bindings: n.data_bindings ? { ...n.data_bindings } : {},
 sort_order: newParentId === null ? highestSortOrder + 1 : n.sort_order || 0,
 };
 });

 const updatedNodes = [...nodes, ...newSectionNodes];
 pushHistory(updatedNodes);

 // Seleciona diretamente o nó de conteúdo principal (Hero, Vitrine, etc.) em vez do container estrutural
 const primaryContentNode =
 newSectionNodes.find((n) => n.node_type === "composition" || n.node_type === "element") ||
 newSectionNodes[newSectionNodes.length - 1] ||
 newSectionNodes[0];

 setSelectedNodeId(primaryContentNode.id);
 setDockedPanel(null); // Fecha gaveta de adicionar para dar foco imediato ao bloco no editor
 toast.success(`Seção "${template.name}" inserida com sucesso!`);
 };

 // Inserção de Bloco Individual
 const insertBlock = (blockType: string) => {
 const reg = builderRegistry[blockType];
 if (!reg) return;

 const sectionId = crypto.randomUUID();
 const containerId = crypto.randomUUID();
 const elementId = crypto.randomUUID();

 const highestSortOrder = nodes
 .filter((n) => n.parent_id === null)
 .reduce((max, n) => Math.max(max, n.sort_order || 0), 0);

 const newNodes = [
 {
 id: sectionId,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: highestSortOrder + 1,
 content: {},
 layout_rules: { maxWidth: "full", paddingY: "md" },
 design_tokens: {},
 },
 {
 id: containerId,
 node_type: "container",
 block_type: "container",
 parent_id: sectionId,
 sort_order: 0,
 content: {},
 layout_rules: { maxWidth: "6xl", paddingX: "md", paddingY: "md" },
 design_tokens: {},
 },
 {
 id: elementId,
 node_type: reg.defaultProps?.node_type || "element",
 block_type: blockType,
 parent_id: containerId,
 sort_order: 0,
 content: (reg.defaultProps?.content as Record<string, unknown>) || {},
 layout_rules: (reg.defaultProps?.layout_rules as Record<string, unknown>) || {},
 design_tokens: (reg.defaultProps?.design_tokens as Record<string, unknown>) || {},
 },
 ];

 pushHistory([...nodes, ...newNodes]);
 setSelectedNodeId(elementId);
 setDockedPanel(null);
 toast.success(`Bloco "${reg.name}" adicionado à página!`);
 };

 // Alterar Layout da Seção (Wix Pro Gallery Standard)
 const handleApplyLayout = (layoutVariant: string) => {
 if (!selectedNodeId) return;
 updateNode(selectedNodeId, "layout_rules", "variant", layoutVariant);
 toast.success(`Layout atualizado para ${layoutVariant.toUpperCase()}!`);
 };

 // ── Gestão de Tema Global (Theme Studio) ──
 const handleChangeTheme = async (patch: Partial<GlobalThemeConfig>) => {
 const updatedTheme = { ...themeConfig, ...patch };
 setThemeConfig(updatedTheme);
 if (!document?.id) return;
 try {
 await updateExperienceDocumentSettings({
 data: {
 document_id: document.id,
 settings: {
 theme: updatedTheme,
 },
 },
 });
 toast.success("Estilo global atualizado e sincronizado!");
 } catch (e: any) {
 console.warn("Erro ao salvar tema:", e);
 }
 };

 // ── Gestão de Páginas do Site (Multi-Page Architecture) ──
 const handleAddPage = async (newPage: { title: string; slug: string; is_home: boolean }) => {
 const newPageItem: BuilderPageItem = {
 id: crypto.randomUUID(),
 title: newPage.title,
 slug: newPage.slug,
 is_home: newPage.is_home,
 };
 const updatedPages = [...pages, newPageItem];
 setPages(updatedPages);
 setActivePageId(newPageItem.id);
 if (!document?.id) return;
 try {
 await updateExperienceDocumentSettings({
 data: {
 document_id: document.id,
 settings: {
 pages: updatedPages,
 },
 },
 });
 toast.success(`Página "${newPage.title}" criada.`);
 } catch (e: any) {
 console.warn("Erro ao salvar páginas:", e);
 }
 };

 const handleDeletePage = async (pageId: string) => {
 if (pages.length <= 1) {
 toast.error("O site precisa de pelo menos uma página.");
 return;
 }
 const updatedPages = pages.filter((p) => p.id !== pageId);
 setPages(updatedPages);
 if (activePageId === pageId) {
 setActivePageId(updatedPages[0].id);
 }
 if (!document?.id) return;
 try {
 await updateExperienceDocumentSettings({
 data: {
 document_id: document.id,
 settings: {
 pages: updatedPages,
 },
 },
 });
 toast.success("Página removida.");
 } catch (e: any) {
 console.warn("Erro ao atualizar páginas:", e);
 }
 };

 const handleDuplicatePage = async (pageId: string) => {
 const pageToClone = pages.find((p) => p.id === pageId);
 if (!pageToClone) return;
 const cloned: BuilderPageItem = {
 ...pageToClone,
 id: crypto.randomUUID(),
 title: `${pageToClone.title} (Cópia)`,
 slug: `${pageToClone.slug}-copia`,
 is_home: false,
 };
 const updatedPages = [...pages, cloned];
 setPages(updatedPages);
 setActivePageId(cloned.id);
 if (!document?.id) return;
 try {
 await updateExperienceDocumentSettings({
 data: {
 document_id: document.id,
 settings: {
 pages: updatedPages,
 },
 },
 });
 toast.success(`Página duplicada.`);
 } catch (e: any) {
 console.warn("Erro ao duplicar página:", e);
 }
 };

 const handleUpdatePageSeo = async (pageId: string, seo: { seo_title?: string; seo_description?: string }) => {
 const updatedPages = pages.map((p) => (p.id === pageId ? { ...p, ...seo } : p));
 setPages(updatedPages);
 if (!document?.id) return;
 try {
 await updateExperienceDocumentSettings({
 data: {
 document_id: document.id,
 settings: {
 pages: updatedPages,
 },
 },
 });
 toast.success("Metadados SEO atualizados.");
 } catch (e: any) {
 console.warn("Erro ao salvar SEO:", e);
 }
 };

 // ── Inserção Dinâmica CMS (Dados Vivos de Produtos, Destinos e Coleções) ──
 const handleInsertDynamicBlock = (blockType: string, bindingSource: string, title?: string) => {
 const sectionId = crypto.randomUUID();
 const containerId = crypto.randomUUID();
 const elementId = crypto.randomUUID();

 const highestSortOrder = nodes
 .filter((n) => n.parent_id === null)
 .reduce((max, n) => Math.max(max, n.sort_order || 0), 0);

 const reg = (builderRegistry as any)[blockType];

 const newNodes = [
 {
 id: sectionId,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: highestSortOrder + 1,
 content: {},
 layout_rules: { maxWidth: "full", paddingY: "lg" },
 design_tokens: {},
 },
 {
 id: containerId,
 node_type: "container",
 block_type: "container",
 parent_id: sectionId,
 sort_order: 0,
 content: {},
 layout_rules: { maxWidth: "6xl", paddingX: "md", paddingY: "md" },
 design_tokens: {},
 },
 {
 id: elementId,
 node_type: "composition",
 block_type: blockType,
 parent_id: containerId,
 sort_order: 0,
 content: {
 title: title || reg?.name || "Coleção em Destaque",
 ...(reg?.defaultProps?.content || {}),
 },
 layout_rules: reg?.defaultProps?.layout_rules || {},
 design_tokens: reg?.defaultProps?.design_tokens || {},
 data_bindings: {
 items: { source: bindingSource, key: "all" },
 },
 },
 ];

 pushHistory([...nodes, ...newNodes]);
 setSelectedNodeId(elementId);
 setDockedPanel(null);
 toast.success(`Coleção dinâmica conectada à tela!`);
 };

 const sanitizeNodesForSave = (rawNodes: any[]) => {
 return (rawNodes || []).map((n, idx) => ({
 id: String(n.id || crypto.randomUUID()),
 version_id: version?.id,
 parent_id: n.parent_id || null,
 node_type: n.node_type || "section",
 block_type: String(n.block_type || "custom_section"),
 layout_variant: n.layout_variant || null,
 content: n.content && typeof n.content === "object" ? n.content : {},
 design_tokens: n.design_tokens && typeof n.design_tokens === "object" ? n.design_tokens : {},
 layout_rules: n.layout_rules && typeof n.layout_rules === "object" ? n.layout_rules : {},
 responsive_overrides: n.responsive_overrides && typeof n.responsive_overrides === "object" ? n.responsive_overrides : {},
 data_bindings: n.data_bindings && typeof n.data_bindings === "object" ? n.data_bindings : {},
 action_bindings: n.action_bindings && typeof n.action_bindings === "object" ? n.action_bindings : {},
 sort_order: typeof n.sort_order === "number" ? n.sort_order : idx,
 is_hidden: Boolean(n.is_hidden),
 }));
 };

 // Salvamento e Publicação no Supabase
 const handleSave = async () => {
 if (!version?.id) {
 toast.error("Versão do documento não encontrada.");
 return;
 }
 const versionId: string = version.id;
 setIsSaving(true);
 try {
 const sanitized = sanitizeNodesForSave(nodes);
 const res = await saveBuilderNodes({
 data: {
 version_id: versionId,
 nodes: sanitized,
 },
 });

 if (res?.version) {
 setVersion(res.version);
 }
 if (res?.nodes && res.nodes.length > 0) {
 setNodes(res.nodes);
 }

 toast.success("Rascunho salvo com sucesso no banco!");
 } catch (err: any) {
 const msg = typeof err?.message === "string" ? err.message : "Erro ao salvar rascunho.";
 toast.error(msg);
 } finally {
 setIsSaving(false);
 }
 };

 const handlePublish = async () => {
 if (!version?.id) return;
 const versionId: string = version.id;
 setIsPublishing(true);
 try {
 const sanitized = sanitizeNodesForSave(nodes);
 // 1. Salva estado atual
 const saveRes = await saveBuilderNodes({
 data: {
 version_id: versionId,
 nodes: sanitized,
 },
 });

 const activeVersionId = saveRes?.version_id || versionId;

 // 2. Publica versão
 const pubRes = await publishBuilderVersion({
 data: { version_id: activeVersionId, nodes: saveRes?.nodes || sanitized },
 });

 if (pubRes?.version) {
 setVersion(pubRes.version);
 } else {
 setVersion((prev: any) => ({ ...prev, id: activeVersionId, status: "published" }));
 }
 if (saveRes?.nodes && saveRes.nodes.length > 0) {
 setNodes(saveRes.nodes);
 }

 toast.success("Vitrine publicada com sucesso! As alterações já estão ativas para os visitantes.");
 } catch (err: any) {
 const msg = typeof err?.message === "string" ? err.message : "Erro ao publicar versão.";
 toast.error(msg);
 } finally {
 setIsPublishing(false);
 }
 };

 // Montagem da Árvore Hierárquica para Renderização
 const buildTree = (allNodes: any[]) => {
 const nodeMap = new Map<string, any>();
 allNodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }));

 const roots: any[] = [];
 nodeMap.forEach((n) => {
 if (n.parent_id && nodeMap.has(n.parent_id)) {
 nodeMap.get(n.parent_id)!.children.push(n);
 } else {
 roots.push(n);
 }
 });

 const sortRec = (list: any[]) => {
 list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
 list.forEach((c) => {
 if (c.children && c.children.length > 0) sortRec(c.children);
 });
 };
 sortRec(roots);
 return roots;
 };

 const treeNodes = React.useMemo(() => buildTree(nodes), [nodes]);
 const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
 const selectedBlockManifest = selectedNode ? (builderRegistry as any)[selectedNode.block_type] : null;

 return (
 <div className="flex flex-col h-[100dvh] w-screen bg-background overflow-hidden select-none font-sans">
 {/* ── 1. BARRA SUPERIOR CANÔNICA (Wix Studio / Editor X Standard) ── */}
 <BuilderTopBar
 document={document}
 version={version}
 viewport={viewport}
 setViewport={setViewport}
 undo={undo}
 redo={redo}
 canUndo={historyIndex > 0}
 canRedo={historyIndex < history.length - 1}
 previewUrl={document?.slug ? (document.document_type === "storefront" ? "/perfil-da-loja" : `/paginas/${document.slug}`) : "/perfil-da-loja"}
 setIsTemplateModalOpen={() => setDockedPanel("add")}
 handleSave={handleSave}
 handlePublish={handlePublish}
 isSaving={isSaving}
 isPublishing={isPublishing}
 />

 {/* ── 2. ÁREA PRINCIPAL: DOCKED RAIL + GAVETAS + CANVAS + INSPETOR ── */}
 <div className="flex flex-1 overflow-hidden relative">
 {/* ── Trilho de Ícones (Desktop Only) ── */}
 <div className="hidden md:flex">
 <BuilderDockedRail
 activePanel={dockedPanel}
 onTogglePanel={(p) => setDockedPanel(p)}
 nodesCount={nodes.length}
 />
 </div>

 {/* Drawer 3-Colunas "Adicionar ao Site" (Wix Studio Imagem 3) */}
 <BuilderAddPanel3Col
 isOpen={dockedPanel === "add"}
 onClose={() => setDockedPanel(null)}
 onSelectTemplate={handleSelectTemplate}
 onInsertSingleBlock={insertBlock}
 />

 {/* Painel de Camadas / Árvore de Elementos */}
 {dockedPanel === "layers" && (
 <BuilderLeftPanel
 activePanel="layers"
 setActivePanel={() => {}}
 nodesCount={nodes.length}
 treeNodes={treeNodes}
 selectedNodeId={selectedNodeId}
 setSelectedNodeId={setSelectedNodeId}
 moveNode={(id, dir, e) => moveNode(id, dir, e)}
 deleteNode={(id, e) => deleteNode(id, e)}
 reorderNodeAbsolute={reorderNodeAbsolute}
 blockCategory={blockCategory}
 setBlockCategory={setBlockCategory}
 insertBlock={insertBlock}
 insertSectionPreset={() => {}}
 onAddSection={() => setDockedPanel("add")}
 />
 )}

 {/* Painel de Páginas do Site (Multi-Page Studio) */}
 {dockedPanel === "pages" && (
 <BuilderPagesPanel
 pages={pages}
 activePageId={activePageId}
 onSelectPage={(pid) => setActivePageId(pid)}
 onAddPage={handleAddPage}
 onDeletePage={handleDeletePage}
 onDuplicatePage={handleDuplicatePage}
 onUpdatePageSeo={handleUpdatePageSeo}
 onClose={() => setDockedPanel(null)}
 />
 )}

 {/* Painel de Tema & Estilo Global (Theme Studio) */}
 {dockedPanel === "design" && (
 <BuilderGlobalThemePanel
 theme={themeConfig}
 onChangeTheme={handleChangeTheme}
 onClose={() => setDockedPanel(null)}
 />
 )}

 {/* Painel de Gerenciamento de Dados & CMS Dinâmico */}
 {dockedPanel === "cms" && (
 <BuilderCmsPanel
 productsCount={(initialData as any).products?.length || 0}
 destinationsCount={12}
 collectionsCount={(initialData as any).collections?.length || 0}
 onInsertDynamicBlock={handleInsertDynamicBlock}
 onClose={() => setDockedPanel(null)}
 />
 )}

 {/* Canvas de Edição Central Studio com Live Data Binding */}
 <BuilderCanvas
 viewport={viewport}
 nodesCount={nodes.length}
 treeNodes={treeNodes}
 selectedNodeId={selectedNodeId}
 setSelectedNodeId={setSelectedNodeId}
 onAddSection={() => setDockedPanel("add")}
 onEditContent={() => setInspectorTab("content")}
 onChangeLayout={() => setIsLayoutSwitcherOpen(true)}
 onDuplicateNode={duplicateNode}
 onDeleteNode={deleteNode}
 onMoveNode={(id, dir) => moveNode(id, dir)}
 pageSlug={pages.find((p) => p.id === activePageId)?.slug || document?.slug || "vitrine"}
 transientData={transientData}
 themeConfig={themeConfig}
 />

 {/* Painel Inspetor (Desktop Only) */}
 <div className="hidden md:flex">
 <BuilderInspector
 selectedNodeId={selectedNodeId}
 selectedNode={selectedNode}
 blockManifest={selectedBlockManifest}
 inspectorTab={inspectorTab}
 setInspectorTab={setInspectorTab}
 setSelectedNodeId={setSelectedNodeId}
 updateNode={updateNode}
 setNodes={setNodes}
 collections={initialData.collections || []}
 categories={initialData.categories || []}
 treeNodes={treeNodes}
 pages={pages}
 />
 </div>

 {/* ── FAB Mobile: Ferramentas (< md) ── */}
 <Sheet open={isMobileToolsOpen} onOpenChange={setIsMobileToolsOpen}>
 <SheetTrigger asChild>
 <button
 className="md:hidden fixed bottom-20 right-4 z-50 flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground shadow-lg"
 aria-label="Ferramentas do editor"
 >
 <SlidersHorizontal className="size-5" />
 </button>
 </SheetTrigger>
 <SheetContent side="right" className="w-80 p-0 overflow-y-auto">
 <BuilderInspector
 selectedNodeId={selectedNodeId}
 selectedNode={selectedNode}
 blockManifest={selectedBlockManifest}
 inspectorTab={inspectorTab}
 setInspectorTab={setInspectorTab}
 setSelectedNodeId={setSelectedNodeId}
 updateNode={updateNode}
 setNodes={setNodes}
 collections={initialData.collections || []}
 categories={initialData.categories || []}
 treeNodes={treeNodes}
 pages={pages}
 />
 </SheetContent>
 </Sheet>
 </div>

 {/* ── 3. MODAL SELETOR DE LAYOUTS DE GRID (Wix Pro Gallery - Imagem 2) ── */}
 <BuilderLayoutSwitcherModal
 isOpen={isLayoutSwitcherOpen}
 onClose={() => setIsLayoutSwitcherOpen(false)}
 currentNode={selectedNode}
 onApplyLayout={handleApplyLayout}
 />
 </div>
 );
}
