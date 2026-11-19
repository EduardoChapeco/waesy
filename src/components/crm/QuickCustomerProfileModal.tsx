import * as React from "react";
import {
  UserCheck,
  Camera,
  Upload,
  Trash2,
  Save,
  MessageSquare,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateCustomer } from "@/services/crm.functions";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { AdvancedLeadTagsPicker } from "@/components/tourism/crm/advanced-lead-tags-picker";

export interface QuickCustomerData {
  id: string;
  fullName: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  city?: string | null;
  state?: string | null;
  rg?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  tags?: string[];
  score?: number;
}

export interface QuickCustomerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: QuickCustomerData | null;
  leadId?: string;
  onSaved?: (updatedCustomer: QuickCustomerData) => void;
  onViewFullDossier?: () => void;
}

export function QuickCustomerProfileModal({
  open,
  onOpenChange,
  customer,
  leadId,
  onSaved,
  onViewFullDossier,
}: QuickCustomerProfileModalProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [form, setForm] = React.useState<QuickCustomerData>({
    id: "",
    fullName: "",
    document: "",
    phone: "",
    email: "",
    birthDate: "",
    city: "",
    state: "",
    rg: "",
    avatarUrl: "",
    notes: "",
    tags: [],
    score: 100,
  });

  React.useEffect(() => {
    if (customer) {
      setForm({
        id: customer.id || "",
        fullName: customer.fullName || "",
        document: customer.document || "",
        phone: customer.phone || "",
        email: customer.email || "",
        birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : "",
        city: customer.city || "",
        state: customer.state || "",
        rg: customer.rg || "",
        avatarUrl: customer.avatarUrl || "",
        notes: customer.notes || "",
        tags: Array.isArray(customer.tags) ? customer.tags : [],
        score: customer.score ?? 100,
      });
    }
  }, [customer, open]);

  const initials = React.useMemo(() => {
    const names = (form.fullName || "Cliente").trim().split(" ");
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return (names[0] || "C").slice(0, 2).toUpperCase();
  }, [form.fullName]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5 MB.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const uploadResult = await uploadMediaUniversal({
        data: {
          fileName: file.name,
          fileType: file.type,
          base64Data,
          bucket: "avatars",
          folder: "customers",
        },
      });

      const nextUrl = uploadResult.url;
      setForm((prev) => ({ ...prev, avatarUrl: nextUrl }));
      toast.success("Foto de perfil enviada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao fazer upload da foto de perfil.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, avatarUrl: "" }));
    toast.info("Foto de perfil removida. Clique em salvar para confirmar.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id) {
      toast.error("ID do cliente não encontrado.");
      return;
    }

    if (!form.fullName.trim()) {
      toast.error("Informe o nome completo do cliente.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCustomer({
        data: {
          id: form.id,
          fullName: form.fullName.trim(),
          document: form.document?.trim() || null,
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          birthDate: form.birthDate || null,
          city: form.city?.trim() || null,
          state: form.state?.trim() || null,
          rg: form.rg?.trim() || null,
          avatarUrl: form.avatarUrl || null,
          notes: form.notes?.trim() || null,
          tags: form.tags || [],
        },
      });

      toast.success("Perfil do cliente atualizado com sucesso e sincronizado com o CRM!");
      if (onSaved) {
        onSaved(form);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações do cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-screen overflow-y-auto no-scrollbar p-6">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="size-4" />
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground">
                Perfil do Cliente · Edição Rápida
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-2xs font-mono font-semibold text-emerald-600 border-emerald-500/30">
              Cliente Oficial
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Altere fotos de perfil, dados cadastrais e sincronize tudo com o WhatsApp e CRM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-2 text-xs">
          {/* ── 1. AVATAR / FOTO DE PERFIL ── */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
            <div className="relative group shrink-0">
              <Avatar className="size-20 border-2 border-primary/20 shadow-xs">
                {form.avatarUrl ? (
                  <AvatarImage src={form.avatarUrl} alt={form.fullName} className="object-cover" />
                ) : null}
                <AvatarFallback className="font-extrabold text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                  <Loader2 className="size-6 text-primary animate-spin motion-reduce:animate-none" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div>
                <h4 className="font-bold text-xs text-foreground">Foto de Perfil do Cliente</h4>
                <p className="text-2xs text-muted-foreground">
                  A foto aparece nas conversas do WhatsApp, propostas e contratos.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Camera className="size-3.5" />
                  <span>{form.avatarUrl ? "Trocar Foto" : "Fazer Upload de Foto"}</span>
                </Button>

                {form.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploadingPhoto}
                    onClick={handleRemovePhoto}
                    className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Remover</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. DADOS CADASTRAIS ── */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-2xs font-semibold text-muted-foreground">
                Nome Completo do Cliente *
              </Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Ex: Jussara Santos da Silva"
                className="h-11 min-h-11 text-xs rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  CPF / Documento Principal
                </Label>
                <Input
                  value={form.document || ""}
                  onChange={(e) => setForm((p) => ({ ...p, document: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  RG / Órgão Emissor
                </Label>
                <Input
                  value={form.rg || ""}
                  onChange={(e) => setForm((p) => ({ ...p, rg: e.target.value }))}
                  placeholder="Ex: 12.345.678-9 SSP/SC"
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  Telefone / WhatsApp
                </Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(49) 99999-9999"
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  E-mail do Cliente
                </Label>
                <Input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@exemplo.com"
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  Data de Nascimento
                </Label>
                <Input
                  type="date"
                  value={form.birthDate || ""}
                  onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  Cidade
                </Label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="São Miguel do Oeste"
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">
                  Estado (UF)
                </Label>
                <Input
                  value={form.state || ""}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                  placeholder="SC"
                  maxLength={2}
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          {/* ── 3. TAGS DE SEGMENTAÇÃO ── */}
          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-muted-foreground">
              Tags de Segmentação do Cliente
            </Label>
            <AdvancedLeadTagsPicker
              tags={form.tags || []}
              onChange={(nextTags) => setForm((p) => ({ ...p, tags: nextTags }))}
            />
          </div>

          {/* ── 4. NOTAS & OBSERVAÇÕES INTERNAS ── */}
          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-muted-foreground">
              Observações Internas da Agência
            </Label>
            <Textarea
              rows={2}
              value={form.notes || ""}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Preferências, fidelidade, indicações ou restrições do cliente..."
              className="text-xs rounded-lg resize-none"
            />
          </div>

          {/* ── 5. INDICADOR DE SINCRONIZAÇÃO WHATSAPP / CRM ── */}
          {form.phone && (
            <div className="p-3 rounded-lg border border-success/30 bg-success/5 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-success">
                <CheckCircle2 className="size-3.5" />
                <span>Alinhamento em Tempo Real com WhatsApp</span>
              </div>
              <p className="text-2xs text-muted-foreground">
                Todas as conversas com o telefone {form.phone} estão unificadas e vinculadas a esta ficha de cliente.
              </p>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40">
            {onViewFullDossier ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  onViewFullDossier();
                }}
                className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/5 font-semibold gap-2 cursor-pointer"
              >
                <FileText className="size-3.5" />
                <span>Ver Ficha Completa 360°</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isSaving ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="size-3.5" />}
                <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
