/**
 * universal-profile-editor.tsx — Editor Universal de Perfis Waesy
 * Unifica a experiência de edição para Perfil Civil, Perfis de Empresas/Lojas e Perfis de Criadores.
 * Aplica o Paradigma Clean, Proporção 3:1 de Capa e Separação Radical de Finanças.
 */

import React, { useState } from "react";
import { Camera, Image as ImageIcon, Check, Loader2, Globe, Phone, MapPin, Star, Building2, User, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ProfilePersonaType = "civil" | "company" | "creator";

export interface UniversalProfileData {
  personaType: ProfilePersonaType;
  id: string;
  name: string;
  handle: string; // @username ou @empresa
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  category?: string;
  website?: string;
  whatsapp?: string;
  cityState?: string;
  
  // Metadados contextuais opcionais
  companyCnpj?: string;
  creatorMediaKitUrl?: string;
}

export interface UniversalProfileEditorProps {
  initialData: UniversalProfileData;
  onSave: (data: UniversalProfileData) => Promise<boolean | void>;
  onUploadAvatar?: (file: File) => Promise<string>;
  onUploadCover?: (file: File) => Promise<string>;
  className?: string;
}

export const UniversalProfileEditor: React.FC<UniversalProfileEditorProps> = ({
  initialData,
  onSave,
  onUploadAvatar,
  onUploadCover,
  className = "",
}) => {
  const [formData, setFormData] = useState<UniversalProfileData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("identity");

  const handleFieldChange = (field: keyof UniversalProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAvatar) return;
    try {
      toast.loading("Enviando foto de perfil...", { id: "upload-avatar" });
      const url = await onUploadAvatar(file);
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
      toast.success("Foto atualizada!", { id: "upload-avatar" });
    } catch {
      toast.error("Erro ao enviar foto.", { id: "upload-avatar" });
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadCover) return;
    try {
      toast.loading("Enviando capa panorâmica...", { id: "upload-cover" });
      const url = await onUploadCover(file);
      setFormData((prev) => ({ ...prev, coverUrl: url }));
      toast.success("Capa atualizada!", { id: "upload-cover" });
    } catch {
      toast.error("Erro ao enviar capa.", { id: "upload-cover" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Falha ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const personaBadge = {
    civil: { label: "Conta Civil / Pessoal", icon: User, color: "bg-primary/10 text-primary border-primary/20" },
    company: { label: "Perfil Empresarial", icon: Building2, color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
    creator: { label: "Perfil de Criador", icon: Star, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  }[formData.personaType];

  return (
    <div className={cn("w-full max-w-4xl mx-auto bg-card border border-border/80 rounded-lg overflow-hidden shadow-xs font-sans", className)}>
      
      {/* ── 1. Topo Canônico do Perfil: Foto 1:1 Squircle ao lado da Capa 21:9 na mesma linha ── */}
      <div className="p-4 sm:p-6 border-b border-border/60 bg-card space-y-4">
        <div className="flex items-center gap-3 sm:gap-5 w-full">
          {/* Avatar Squircle 1:1 */}
          <div className="relative size-20 sm:size-28 md:size-32 rounded-lg bg-card border-2 border-border/60 overflow-hidden group shrink-0 shadow-2xs">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt={formData.name} className="size-full object-cover select-none" />
            ) : (
              <div className="size-full bg-muted flex items-center justify-center text-xl sm:text-2xl font-black text-primary">
                {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            {/* Overlay de Câmera */}
            <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="size-5" />
              <span className="text-[10px] font-bold mt-1">Alterar</span>
              <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
            </label>
          </div>

          {/* Capa Panorâmica Canônica 21:9 ao lado */}
          <div className="flex-1 min-w-0 aspect-[21/9] rounded-lg bg-muted/20 relative overflow-hidden flex items-center group border border-border/40">
            {formData.coverUrl ? (
              <img src={formData.coverUrl} alt="Capa" className="size-full object-cover select-none" />
            ) : (
              <div className="size-full bg-gradient-to-r from-muted to-muted/60 flex items-center justify-center text-muted-foreground p-3 text-center">
                <span className="text-xs font-medium">Sem imagem de capa (Proporção 21:9)</span>
              </div>
            )}

            {/* Trigger de Alteração da Capa */}
            <label className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-background/85 hover:bg-background backdrop-blur-md border border-border/80 text-foreground px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95">
              <ImageIcon className="size-3.5" />
              <span className="hidden sm:inline">Alterar Capa</span>
              <input type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Linha de Identidade e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/40">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate">
              {formData.name || "Seu Nome"}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              @{formData.handle || "usuario"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", personaBadge.color)}>
              <personaBadge.icon className="size-3.5" />
              <span>{personaBadge.label}</span>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              size="sm"
              className="h-11 sm:h-9 px-4 sm:px-5 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs active:scale-95 cursor-pointer"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 mr-1" />}
              <span>Salvar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Tabs Contextuais por Persona (Rótulos Simples e Não Compostos) ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 sm:px-8 pt-3 border-b border-border/40">
          <TabsList className="bg-transparent h-10 p-0 gap-6">
            <TabsTrigger
              value="identity"
              className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
            >
              Identidade
            </TabsTrigger>

            {formData.personaType === "company" && (
              <TabsTrigger
                value="company_details"
                className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
              >
                Empresa
              </TabsTrigger>
            )}

            {formData.personaType === "creator" && (
              <TabsTrigger
                value="creator_details"
                className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
              >
                Mídia Kit
              </TabsTrigger>
            )}

            <TabsTrigger
              value="links"
              className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
            >
              Contato
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Conteúdo Tab: Identidade Básica ── */}
        <TabsContent value="identity" className="p-6 sm:p-10 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                {formData.personaType === "company" ? "Nome da Empresa / Fantasia" : "Nome de Exibição"}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="Ex: João Silva ou Café Central"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                {formData.personaType === "company" ? "Slug da Vitrine (@link)" : "Nome de Usuário (@handle)"}
              </label>
              <Input
                value={formData.handle}
                onChange={(e) => handleFieldChange("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="Ex: joaosilva ou cafecentral"
                className="h-10 text-xs font-mono rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Biografia / Descrição Curta</label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {(formData.bio || "").length}/160 caracteres
              </span>
            </div>
            <Textarea
              value={formData.bio || ""}
              onChange={(e) => handleFieldChange("bio", e.target.value.slice(0, 160))}
              placeholder="Descreva você, seu trabalho ou sua empresa em poucas palavras..."
              rows={3}
              className="text-xs rounded-lg resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Categoria / Segmento Principal</label>
            <Input
              value={formData.category || ""}
              onChange={(e) => handleFieldChange("category", e.target.value)}
              placeholder="Ex: Gastronomia, Turismo, Fotografia, Imóveis"
              className="h-10 text-xs rounded-lg"
            />
          </div>
        </TabsContent>

        {/* ── Conteúdo Tab: Empresa ── */}
        {formData.personaType === "company" && (
          <TabsContent value="company_details" className="p-6 sm:p-10 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">CNPJ da Empresa</label>
                <Input
                  value={formData.companyCnpj || ""}
                  onChange={(e) => handleFieldChange("companyCnpj", e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="h-10 text-xs font-mono rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Cidade / Estado</label>
                <Input
                  value={formData.cityState || ""}
                  onChange={(e) => handleFieldChange("cityState", e.target.value)}
                  placeholder="Ex: Florianópolis, SC"
                  className="h-10 text-xs rounded-lg"
                />
              </div>
            </div>
          </TabsContent>
        )}

        {/* ── Conteúdo Tab: Criador ── */}
        {formData.personaType === "creator" && (
          <TabsContent value="creator_details" className="p-6 sm:p-10 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Link do Mídia Kit ou Apresentação</label>
              <Input
                value={formData.creatorMediaKitUrl || ""}
                onChange={(e) => handleFieldChange("creatorMediaKitUrl", e.target.value)}
                placeholder="https://waesy.com/u/seu-nome/kit"
                className="h-10 text-xs rounded-lg"
              />
            </div>
          </TabsContent>
        )}

        {/* ── Conteúdo Tab: Links & Contato ── */}
        <TabsContent value="links" className="p-6 sm:p-10 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground" />
                <span>WhatsApp de Atendimento</span>
              </label>
              <Input
                value={formData.whatsapp || ""}
                onChange={(e) => handleFieldChange("whatsapp", e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Globe className="size-3.5 text-muted-foreground" />
                <span>Website / Link Externo</span>
              </label>
              <Input
                value={formData.website || ""}
                onChange={(e) => handleFieldChange("website", e.target.value)}
                placeholder="https://seusite.com.br"
                className="h-10 text-xs rounded-lg"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
