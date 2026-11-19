import * as React from "react";
import { useState, useMemo, useRef, useCallback } from "react";
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Star,
  Download,
  ExternalLink,
  MessageSquare,
  X,
  ZoomIn,
  Edit3,
  Check,
  Folder,
  FolderOpen,
  Sparkles,
  Layers,
  Tag,
  Copy,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadStoreMedia } from "@/services/storage.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface InspirationPhotoItem {
  id: string;
  folder_id: string;
  url: string;
  title?: string;
  caption?: string;
  file_name?: string;
  file_size?: string;
  is_featured?: boolean;
  source?: "upload" | "whatsapp" | "pasted" | "catalog";
  created_at: string;
}

export interface InspirationFolderDef {
  id: string;
  label: string;
  description?: string;
  is_default?: boolean;
}

export const NICHE_INSPIRATION_FOLDER_PRESETS: Record<string, InspirationFolderDef[]> = {
  tourism: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "destinos", label: "Destinos & Paisagens", description: "Fotos de praias, cidades e pontos turísticos de interesse" },
    { id: "hoteis", label: "Hotéis & Resorts", description: "Fotos das acomodações, piscinas e instalações" },
    { id: "passeios", label: "Passeios & Experiências", description: "Atrações, passeios de barco, parques e ingressos" },
  ],
  real_estate: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "fachadas", label: "Fachadas & Vistas", description: "Fotos externas do condomínio, fachada e vizinhança" },
    { id: "ambientes", label: "Ambientes & Plantas", description: "Salas, suítes, cozinhas, varanda gourmet e planta baixa" },
    { id: "acabamentos", label: "Acabamentos & Detalhes", description: "Porcelanato, bancadas, iluminação e marcenaria" },
  ],
  automotive: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "checkin_avarias", label: "Check-in & Lataria", description: "Registro fotográfico de entrada, detalhes de pintura e avarias" },
    { id: "pecas_rodas", label: "Peças & Rodas", description: "Fotos de componentes mecânicos, rodas e pneus" },
    { id: "interior_painel", label: "Interior & Tapeçaria", description: "Bancos, painel, quilometragem e acabamento interno" },
  ],
  events: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "decoracao", label: "Decoração & Cenografia", description: "Referências de arranjos florais, iluminação cênica e altar" },
    { id: "buffet_doces", label: "Bolo, Doces & Buffet", description: "Inspirações de cardápio, apresentação e mesa posta" },
    { id: "vestuario_estilo", label: "Vestidos & Trajes", description: "Modelos de vestido de noiva, terno, paleta de madrinhas" },
  ],
  beauty_salon: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "cortes_cores", label: "Cortes, Cores & Mechas", description: "Fotos de referência de corte, tom de loiro/morena e técnica" },
    { id: "penteados_make", label: "Penteados & Maquiagem", description: "Inspirações para eventos, noivas e produções" },
    { id: "antes_depois", label: "Antes & Depois do Cliente", description: "Registro da evolução capilar e tratamento" },
  ],
  barbershop: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "corte_cabelo", label: "Cortes & Degradê (Fade)", description: "Referências de fade, textura e estilos clássicos" },
    { id: "barba_estilo", label: "Barba & Alinhamento", description: "Modelos de barba lenhador, quadrada ou desenhada" },
  ],
  aesthetics_clinic: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "avaliacoes", label: "Fotos de Avaliação Inicial", description: "Registro de entrada de pele, face ou corporal" },
    { id: "evolucao", label: "Evolução do Tratamento", description: "Fotos de sessões e acompanhamento de resultados" },
    { id: "referencias", label: "Referências Desejadas", description: "Fotos de harmonia ou procedimentos almejados" },
  ],
  healthcare: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "exames", label: "Exames & Laudos", description: "Imagens de exames, ultrassons e receitas" },
    { id: "clinico", label: "Registro Clínico", description: "Acompanhamento visual de lesões ou postura" },
  ],
  dental: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "radiografias", label: "Radiografias & Panorâmicas", description: "Fotos de documentação ortodôntica e raio-x" },
    { id: "sorriso_dentes", label: "Fotos de Sorriso & Arcada", description: "Registro intraoral e extraoral do paciente" },
    { id: "alinhadores_facetas", label: "Facetas & Alinhadores", description: "Projetos de clareamento, lentes de contato e alinhadores" },
  ],
  services: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "ambientes_medidas", label: "Ambientes & Medidas", description: "Fotos do espaço do cliente, tomadas, vãos e medidas" },
    { id: "inspiracoes_projeto", label: "Inspirações de Projeto", description: "Ideias e referências estéticas aprovadas pelo cliente" },
    { id: "materiais_acabamentos", label: "Cores, MDF & Materiais", description: "Amostras de materiais, ferragens e texturas" },
  ],
  gastronomy: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "pratos_apresentacao", label: "Pratos & Apresentação", description: "Fotos de montagem de pratos, porções e bebidas" },
    { id: "mesas_ambientes", label: "Mesas & Espaço de Reserva", description: "Layout de salão, mesas comemorativas e decoração" },
  ],
  retail: [
    { id: "geral", label: "Geral / WhatsApp", is_default: true },
    { id: "looks_combinacoes", label: "Looks & Combinações", description: "Fotos de peças, combinações e cores de interesse" },
    { id: "tamanhos_referencias", label: "Modelagem & Detalhes", description: "Fotos de caimento, tecidos e etiquetas de tamanho" },
  ],
};

export interface LeadInspirationMoodboardProps {
  niche?: string;
  photos: InspirationPhotoItem[];
  folders?: InspirationFolderDef[];
  leadPhone?: string;
  leadName?: string;
  companyName?: string;
  onSavePhotos: (updatedPhotos: InspirationPhotoItem[], updatedFolders?: InspirationFolderDef[]) => Promise<void> | void;
}

export function LeadInspirationMoodboard({
  niche = "tourism",
  photos = [],
  folders = [],
  leadPhone,
  leadName = "Cliente",
  companyName = "Agência",
  onSavePhotos,
}: LeadInspirationMoodboardProps) {
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal de criação de nova pasta de inspiração
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // Modal de Lightbox / Visualização ampliada da foto
  const [previewPhoto, setPreviewPhoto] = useState<InspirationPhotoItem | null>(null);

  // Edição inline de legenda
  const [editingCaptionPhotoId, setEditingCaptionPhotoId] = useState<string | null>(null);
  const [tempCaption, setTempCaption] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolução unificada de pastas canônicas (presets + customizadas salvas)
  const effectiveFolders = useMemo<InspirationFolderDef[]>(() => {
    const rawPresets = NICHE_INSPIRATION_FOLDER_PRESETS[niche] || NICHE_INSPIRATION_FOLDER_PRESETS.tourism || [];
    const map = new Map<string, InspirationFolderDef>();
    for (const f of rawPresets) {
      map.set(f.id, f);
    }
    for (const f of folders) {
      if (f?.id) map.set(f.id, { ...(map.get(f.id) || {}), ...f });
    }
    return Array.from(map.values());
  }, [niche, folders]);

  // Contagem de fotos por pasta
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: photos.length };
    for (const p of photos) {
      const fid = p.folder_id || "geral";
      counts[fid] = (counts[fid] || 0) + 1;
    }
    return counts;
  }, [photos]);

  // Fotos filtradas pela pasta ativa
  const filteredPhotos = useMemo(() => {
    if (activeFolderId === "all") return photos;
    return photos.filter((p) => (p.folder_id || "geral") === activeFolderId);
  }, [photos, activeFolderId]);

  // Upload de arquivos (seja por input ou drag & drop)
  const processFilesForUpload = async (fileList: File[]) => {
    const validImages = fileList.filter((f) => f.type.startsWith("image/"));
    if (validImages.length === 0) {
      toast.error("Por favor, selecione arquivos de imagem válidos (JPG, PNG, WEBP, etc.).");
      return;
    }

    setIsUploading(true);
    const uploadedPhotos: InspirationPhotoItem[] = [];

    for (const file of validImages) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`A imagem "${file.name}" excede 20 MB.`);
        continue;
      }
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || "");
            resolve(raw.includes(",") ? (raw.split(",")[1] || "") : raw);
          };
          reader.onerror = () => reject(new Error("Falha ao ler arquivo local."));
          reader.readAsDataURL(file);
        });

        const uploaded = await uploadStoreMedia({
          data: {
            fileName: file.name,
            fileType: file.type || "image/jpeg",
            base64Data,
            bucket: "cms-media",
          },
        });

        const targetFolder = activeFolderId === "all" ? "geral" : activeFolderId;
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

        uploadedPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          folder_id: targetFolder,
          url: uploaded.url,
          title: file.name.replace(/\.[^/.]+$/, ""),
          file_name: file.name,
          file_size: sizeStr,
          source: "upload",
          created_at: new Date().toISOString(),
        });
      } catch (err: any) {
        toast.error(err?.message || `Erro ao enviar "${file.name}".`);
      }
    }

    if (uploadedPhotos.length > 0) {
      const updated = [...uploadedPhotos, ...photos];
      await onSavePhotos(updated, effectiveFolders);
      toast.success(`${uploadedPhotos.length} foto(s) de inspiração adicionada(s)!`);
    }
    setIsUploading(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFilesForUpload(Array.from(files));
      e.target.value = "";
    }
  };

  // Suporte a colar imagem diretamente da área de transferência (Ctrl+V)
  const handleContainerPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      toast.info("Imagem detectada na área de transferência! Enviando...");
      processFilesForUpload(imageFiles);
    }
  }, [processFilesForUpload]);

  // Criação de nova pasta
  const handleCreateFolder = async () => {
    const title = newFolderTitle.trim();
    if (!title) {
      toast.error("Informe o nome da pasta de inspiração.");
      return;
    }
    const slug = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .slice(0, 32);

    const newFolder: InspirationFolderDef = {
      id: slug || `pasta_${Date.now()}`,
      label: title,
      description: newFolderDesc.trim() || undefined,
    };

    const updatedFolders = [...effectiveFolders, newFolder];
    await onSavePhotos(photos, updatedFolders);
    setActiveFolderId(newFolder.id);
    setIsNewFolderModalOpen(false);
    setNewFolderTitle("");
    setNewFolderDesc("");
    toast.success(`Pasta de inspiração "${title}" criada com sucesso!`);
  };

  // Toggle destaque (is_featured)
  const handleToggleFeatured = async (photoId: string) => {
    const updated = photos.map((p) => {
      if (p.id === photoId) {
        return { ...p, is_featured: !p.is_featured };
      }
      return p;
    });
    await onSavePhotos(updated, effectiveFolders);
    toast.success("Destaque atualizado!");
  };

  // Salvar legenda
  const handleSaveCaption = async (photoId: string) => {
    const updated = photos.map((p) => {
      if (p.id === photoId) {
        return { ...p, caption: tempCaption.trim() };
      }
      return p;
    });
    await onSavePhotos(updated, effectiveFolders);
    setEditingCaptionPhotoId(null);
    setTempCaption("");
    toast.success("Legenda salva!");
  };

  // Mover foto para outra pasta
  const handleMovePhotoFolder = async (photoId: string, targetFolderId: string) => {
    const updated = photos.map((p) => {
      if (p.id === photoId) {
        return { ...p, folder_id: targetFolderId };
      }
      return p;
    });
    await onSavePhotos(updated, effectiveFolders);
    toast.success("Foto movida de pasta!");
  };

  // Excluir foto
  const handleDeletePhoto = async (photoId: string) => {
    const updated = photos.filter((p) => p.id !== photoId);
    await onSavePhotos(updated, effectiveFolders);
    if (previewPhoto?.id === photoId) setPreviewPhoto(null);
    toast.success("Foto removida da galeria.");
  };

  // Compartilhar no WhatsApp
  const handleSendPhotoWhatsApp = (photo: InspirationPhotoItem) => {
    const cleanPhone = (leadPhone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Lead sem telefone cadastrado para envio.");
      return;
    }
    const firstName = leadName.split(" ")[0];
    const captionText = photo.caption ? `\n\n_${photo.caption}_` : "";
    const msg = encodeURIComponent(
      `Olá, ${firstName}! Segue uma referência de inspiração selecionada por ${companyName}:\n\n${photo.url}${captionText}`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleCopyPhotoUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link da foto copiado para a área de transferência!");
  };

  return (
    <div
      onPaste={handleContainerPaste}
      tabIndex={0}
      className="space-y-4 outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl"
    >
      {/* Input de Arquivos Oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Barra de Ações & Filtros de Pastas de Inspiração */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
            Pastas de Inspiração & Referências Visuais
          </h3>
          <Badge variant="secondary" className="text-2xs font-mono font-bold">
            {photos.length} foto(s)
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            title="Criar nova pasta de inspiração personalizada"
          >
            <Plus className="size-4 text-primary" />
            <span>Nova Pasta</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer gap-2"
          >
            <Upload className="size-4" />
            <span>{isUploading ? "Enviando..." : "Adicionar Fotos"}</span>
          </Button>
        </div>
      </div>

      {/* Seletor de Pastas de Inspiração (Carrossel Horizontal / Chips) */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        <button
          type="button"
          onClick={() => setActiveFolderId("all")}
          className={cn(
            "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring",
            activeFolderId === "all"
              ? "bg-primary text-primary-foreground border-primary font-bold"
              : "bg-card border-border/70 text-foreground hover:bg-muted"
          )}
        >
          <Layers className="size-4" />
          <span>Todas as Fotos</span>
          <Badge
            variant="outline"
            className={cn(
              "text-3xs font-mono px-2 py-1",
              activeFolderId === "all" ? "bg-primary-foreground/20 text-primary-foreground border-transparent" : "bg-muted"
            )}
          >
            {folderCounts.all || 0}
          </Badge>
        </button>

        {effectiveFolders.map((f) => {
          const isActive = activeFolderId === f.id;
          const count = folderCounts[f.id] || 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFolderId(f.id)}
              className={cn(
                "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground border-primary font-bold"
                  : "bg-card border-border/70 text-foreground hover:bg-muted"
              )}
            >
              {isActive ? <FolderOpen className="size-4" /> : <Folder className="size-4 text-muted-foreground" />}
              <span>{f.label}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-3xs font-mono px-2 py-1",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground border-transparent" : "bg-muted"
                )}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Zona de Drop & Upload Rápido */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer?.files?.length > 0) {
            processFilesForUpload(Array.from(e.dataTransfer.files));
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "w-full min-h-11 border border-dashed rounded-xl p-5 text-center space-y-1 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
          isDragOver
            ? "border-primary bg-primary/10 text-primary"
            : "border-border/70 bg-card hover:bg-muted/20 text-foreground"
        )}
      >
        <div className="flex items-center justify-center gap-2 text-xs font-semibold">
          <Upload className="size-4 text-primary" />
          <span>Arraste imagens ou clique para subir fotos na pasta ativa</span>
        </div>
        <p className="text-2xs text-muted-foreground">
          Dica rápida: você também pode colar capturas de tela diretamente com <strong>Ctrl+V</strong> a qualquer momento.
        </p>
      </div>

      {/* Grade Visual de Fotos de Inspiração */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPhotos.map((photo) => {
            const folderLabel = effectiveFolders.find((f) => f.id === photo.folder_id)?.label || "Geral";
            const isEditingCaption = editingCaptionPhotoId === photo.id;

            return (
              <div
                key={photo.id}
                className="group relative rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col transition-colors hover:border-primary/50"
              >
                {/* Imagem com Aspect Ratio Seguro e Ação de Clique */}
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(photo)}
                  className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={photo.url}
                    alt={photo.title || "Foto de Inspiração"}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />

                  {/* Badges de Topo sobre a Imagem */}
                  <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                    <Badge variant="secondary" className="text-3xs font-semibold backdrop-blur-md bg-background/80">
                      {folderLabel}
                    </Badge>
                    {photo.is_featured && (
                      <Badge className="text-3xs font-bold bg-warning/20 text-warning-strong border-warning/30 gap-1 px-2 py-1">
                        <Star className="size-3 fill-current" />
                        <span>Destaque</span>
                      </Badge>
                    )}
                  </div>

                  {/* Overlay de Ação no Hover */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewPhoto(photo);
                      }}
                      className="h-11 min-h-11 min-w-11 px-3 sm:h-9 sm:min-h-9 sm:w-9 sm:px-0 rounded-full bg-background/90 hover:bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      title="Ver em tela cheia"
                    >
                      <ZoomIn className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFeatured(photo.id);
                      }}
                      className={cn(
                        "h-11 min-h-11 min-w-11 px-3 sm:h-9 sm:min-h-9 sm:w-9 sm:px-0 rounded-full bg-background/90 hover:bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                        photo.is_featured && "text-warning-strong"
                      )}
                      title={photo.is_featured ? "Remover destaque" : "Marcar como destaque da proposta"}
                    >
                      <Star className={cn("size-4", photo.is_featured && "fill-current")} />
                    </Button>
                  </div>
                </button>

                {/* Área de Legenda e Ações Rápidas */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-2xs">
                  {isEditingCaption ? (
                    <div className="space-y-2">
                      <Input
                        value={tempCaption}
                        onChange={(e) => setTempCaption(e.target.value)}
                        placeholder="Ex: Quarto com vista para o mar..."
                        className="h-11 sm:h-8 text-2xs rounded"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCaptionPhotoId(null)}
                          className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-3xs focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveCaption(photo.id)}
                          className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-3xs bg-primary text-primary-foreground font-bold focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCaptionPhotoId(photo.id);
                        setTempCaption(photo.caption || photo.title || "");
                      }}
                      className="cursor-pointer hover:text-primary transition-colors min-h-11 sm:min-h-8 flex items-start justify-between gap-1 w-full text-left focus-visible:ring-2 focus-visible:ring-ring rounded p-1"
                      title="Clique para editar a legenda desta foto"
                    >
                      <p className="line-clamp-2 text-foreground font-medium">
                        {photo.caption || photo.title || "Sem legenda (clique para adicionar)"}
                      </p>
                      <Edit3 className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                    </button>
                  )}

                  {/* Cluster de Botões da Foto */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/30">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-2 text-3xs gap-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          title="Mover para outra pasta"
                        >
                          <Tag className="size-3" />
                          <span>Mover</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {effectiveFolders.map((ef) => (
                          <DropdownMenuItem
                            key={ef.id}
                            onClick={() => handleMovePhotoFolder(photo.id, ef.id)}
                            className="text-xs gap-2 min-h-11 sm:min-h-8"
                          >
                            {ef.id === photo.folder_id && <Check className="size-4 text-primary" />}
                            <span>{ef.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendPhotoWhatsApp(photo)}
                        className="h-11 min-h-11 w-11 sm:h-8 sm:w-8 sm:min-h-8 p-0 text-success-strong hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-ring"
                        title="Enviar link da foto via WhatsApp para o cliente"
                      >
                        <MessageSquare className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyPhotoUrl(photo.url)}
                        className="h-11 min-h-11 w-11 sm:h-8 sm:w-8 sm:min-h-8 p-0 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        title="Copiar link da foto"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="h-11 min-h-11 w-11 sm:h-8 sm:w-8 sm:min-h-8 p-0 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                        title="Excluir foto"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/5">
          <Camera className="size-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs font-semibold text-foreground">
            {activeFolderId === "all"
              ? "Nenhuma foto de inspiração adicionada a este atendimento ainda."
              : `Nenhuma foto na pasta "${effectiveFolders.find((f) => f.id === activeFolderId)?.label || "selecionada"}".`}
          </p>
          <p className="text-2xs text-muted-foreground max-w-sm mx-auto">
            Arraste referências visuais, fotos enviadas pelo cliente no WhatsApp ou cole com <strong>Ctrl+V</strong> para montar o moodboard do card.
          </p>
        </div>
      )}

      {/* Modal de Criação de Nova Pasta de Inspiração */}
      <Dialog open={isNewFolderModalOpen} onOpenChange={setIsNewFolderModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <span>Criar Nova Pasta de Inspiração</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Organize as referências visuais deste atendimento em álbuns temáticos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-2xs font-semibold text-muted-foreground">Nome da Pasta</Label>
              <Input
                value={newFolderTitle}
                onChange={(e) => setNewFolderTitle(e.target.value)}
                placeholder="Ex: Pousadas Charmosas, Referências de Maquiagem..."
                className="h-11 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-2xs font-semibold text-muted-foreground">Descrição / Objetivo (Opcional)</Label>
              <Input
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="Ex: Fotos enviadas pelo cliente como referência de estilo..."
                className="h-11 text-xs rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewFolderModalOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
            >
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Lightbox / Visualização Ampliada da Foto */}
      <Dialog open={Boolean(previewPhoto)} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl p-6 flex flex-col gap-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                {previewPhoto?.caption || previewPhoto?.title || "Foto de Inspiração"}
              </DialogTitle>
              <DialogDescription className="text-2xs text-muted-foreground">
                {effectiveFolders.find((f) => f.id === previewPhoto?.folder_id)?.label || "Geral"} · Adicionada em{" "}
                {previewPhoto ? new Date(previewPhoto.created_at).toLocaleDateString("pt-BR") : ""}
              </DialogDescription>
            </div>
          </DialogHeader>

          {previewPhoto && (
            <div className="space-y-4">
              <div className="relative w-full max-h-96 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={previewPhoto.url}
                  alt={previewPhoto.caption || previewPhoto.title || "Foto"}
                  className="max-w-full max-h-96 object-contain"
                />
              </div>

              {previewPhoto.caption && (
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 text-xs text-foreground">
                  <span className="font-semibold block text-2xs text-muted-foreground uppercase tracking-wider mb-1">
                    Notas da Referência
                  </span>
                  <p>{previewPhoto.caption}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleToggleFeatured(previewPhoto.id)}
                    className={cn(
                      "h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                      previewPhoto.is_featured && "text-warning-strong border-warning/30 bg-warning/10"
                    )}
                  >
                    <Star className={cn("size-4", previewPhoto.is_featured && "fill-current")} />
                    <span>{previewPhoto.is_featured ? "Foto em Destaque" : "Definir Destaque"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSendPhotoWhatsApp(previewPhoto)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring text-success-strong"
                  >
                    <MessageSquare className="size-4" />
                    <span>Enviar no WhatsApp</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyPhotoUrl(previewPhoto.url)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Copy className="size-4" />
                    <span>Copiar Link</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(previewPhoto.url, "_blank")}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="size-4" />
                    <span>Abrir Original</span>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeletePhoto(previewPhoto.id)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                    <span>Excluir</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
