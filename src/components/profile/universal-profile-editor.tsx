/**
 * universal-profile-editor.tsx — Editor Universal de Perfis Waesy
 * Unifica a experiência de edição para Perfil Civil, Perfis de Empresas/Lojas e Perfis de Criadores.
 * Aplica o Paradigma Clean, Proporção 3:1 de Capa e Separação Radical de Finanças.
 */

import React, { useState } from "react";
import { Camera, Image as ImageIcon, Check, Loader2, Globe, Phone, MapPin, Sparkles, Building2, User, Layers } from "lucide-react";
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
    creator: { label: "Perfil de Criador", icon: Sparkles, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  }[formData.personaType];

  return (
    <div className={cn("w-full max-w-4xl mx-auto bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs font-sans", className)}>
      
      {/* ── 1. Capa Panorâmica Canônica (Proporção 3:1) ── */}
      <div className="relative w-full aspect-[3/1] bg-muted overflow-hidden border-b border-border/60 group">
        {formData.coverUrl ? (
          <img src={formData.coverUrl} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-muted to-muted/60 flex items-center justify-center text-muted-foreground">
            <span className="text-xs font-medium">Sem imagem de capa (Proporção 3:1 recomendada)</span>
          </div>
        )}

        {/* Trigger de Upload da Capa */}
        <label className="absolute top-4 right-4 bg-background/80 hover:bg-background backdrop-blur-md border border-border/80 text-foreground px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-transform active:scale-95">
          <ImageIcon className="size-3.5" />
          <span>Alterar Capa</span>
          <input type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
        </label>
      </div>

      {/* ── 2. Topo do Perfil com Avatar Squircle e Tipo de Persona ── */}
      <div className="px-6 sm:px-10 pb-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
          
          {/* Avatar Squircle Sobreposto */}
          <div className="relative size-24 sm:size-28 rounded-2xl sm:rounded-3xl bg-card border-4 border-card shadow-md overflow-hidden group shrink-0">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt={formData.name} className="size-full object-cover" />
            ) : (
              <div className="size-full bg-muted flex items-center justify-center text-2xl font-black text-primary">
                {formData.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Overlay com Ícone de Câmera */}
            <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="size-6" />
              <span className="text-[10px] font-bold mt-1">Trocar</span>
              <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
            </label>
          </div>

          {/* Badge de Persona & Ação Salvar Rápida */}
          <div className="flex items-center gap-3">
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", personaBadge.color)}>
              <personaBadge.icon className="size-3.5" />
              <span>{personaBadge.label}</span>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              size="sm"
              className="h-9 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs active:scale-95"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 mr-1" />}
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {formData.name || "Seu Nome"}
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            @{formData.handle || "usuario"}
          </p>
        </div>
      </div>

      {/* ── 3. Tabs Contextuais por Persona ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 sm:px-10 pt-4 border-b border-border/40">
          <TabsList className="bg-transparent h-10 p-0 gap-6">
            <TabsTrigger
              value="identity"
              className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
            >
              Identidade Básica
            </TabsTrigger>

            {formData.personaType === "company" && (
              <TabsTrigger
                value="company_details"
                className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
              >
                Dados da Empresa & Loja
              </TabsTrigger>
            )}

            {formData.personaType === "creator" && (
              <TabsTrigger
                value="creator_details"
                className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
              >
                Mídia Kit & Redes
              </TabsTrigger>
            )}

            <TabsTrigger
              value="links"
              className="data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground border-b-2 border-transparent rounded-none px-1 pb-2 text-xs font-bold"
            >
              Links & Contato
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Conteúdo Tab: Identidade Básica ── */}
        <TabsContent value="identity" className="p-6 sm:p-10 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {formData.personaType === "company" ? "Nome da Empresa / Fantasia" : "Nome de Exibição"}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="Ex: João Silva ou Café Central"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {formData.personaType === "company" ? "Slug da Vitrine (@link)" : "Nome de Usuário (@handle)"}
              </label>
              <Input
                value={formData.handle}
                onChange={(e) => handleFieldChange("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="Ex: joaosilva ou cafecentral"
                className="h-10 text-xs font-mono rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
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
              className="text-xs rounded-xl resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Categoria / Segmento Principal</label>
            <Input
              value={formData.category || ""}
              onChange={(e) => handleFieldChange("category", e.target.value)}
              placeholder="Ex: Gastronomia, Turismo, Fotografia, Imóveis"
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </TabsContent>

        {/* ── Conteúdo Tab: Empresa ── */}
        {formData.personaType === "company" && (
          <TabsContent value="company_details" className="p-6 sm:p-10 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">CNPJ da Empresa</label>
                <Input
                  value={formData.companyCnpj || ""}
                  onChange={(e) => handleFieldChange("companyCnpj", e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="h-10 text-xs font-mono rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Cidade / Estado</label>
                <Input
                  value={formData.cityState || ""}
                  onChange={(e) => handleFieldChange("cityState", e.target.value)}
                  placeholder="Ex: Florianópolis, SC"
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>
          </TabsContent>
        )}

        {/* ── Conteúdo Tab: Criador ── */}
        {formData.personaType === "creator" && (
          <TabsContent value="creator_details" className="p-6 sm:p-10 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Link do Mídia Kit ou Apresentação</label>
              <Input
                value={formData.creatorMediaKitUrl || ""}
                onChange={(e) => handleFieldChange("creatorMediaKitUrl", e.target.value)}
                placeholder="https://waesy.com/u/seu-nome/kit"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </TabsContent>
        )}

        {/* ── Conteúdo Tab: Links & Contato ── */}
        <TabsContent value="links" className="p-6 sm:p-10 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                <span>WhatsApp de Atendimento</span>
              </label>
              <Input
                value={formData.whatsapp || ""}
                onChange={(e) => handleFieldChange("whatsapp", e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                <span>Website / Link Externo</span>
              </label>
              <Input
                value={formData.website || ""}
                onChange={(e) => handleFieldChange("website", e.target.value)}
                placeholder="https://seusite.com.br"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
