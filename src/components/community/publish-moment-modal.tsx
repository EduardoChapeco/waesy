import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/ui/media-uploader";
import { Lightning, MapPin, Camera, Users, BeerBottle, Coffee, Tree, MusicNotes, Crosshair, Check } from "@phosphor-icons/react";
import { publishLiveMoment } from "@/services/social.functions";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { toast } from "sonner";

export interface PublishMomentModalProps {
 isOpen?: boolean;
 open?: boolean;
 onClose?: () => void;
 onOpenChange?: (open: boolean) => void;
 onSuccess?: () => void | Promise<any>;
 defaultLocation?: { lat: number; lng: number };
}

const VIBE_OPTIONS = [
 { id: "ao_vivo", label: "Ao Vivo", icon: Lightning },
 { id: "mesa_aberta", label: "Mesa Aberta / Dividir Conta", icon: BeerBottle },
 { id: "cafe_trabalho", label: "Café e Trabalho", icon: Coffee },
 { id: "parque_esporte", label: "Parque e Esporte", icon: Tree },
 { id: "encontro_musica", label: "Música e Encontro", icon: MusicNotes },
];

export function PublishMomentModal({
 isOpen: isOpenProp,
 open: openProp,
 onClose,
 onOpenChange,
 onSuccess,
 defaultLocation,
}: PublishMomentModalProps) {
 const isModalOpen = openProp !== undefined ? openProp : (isOpenProp ?? false);
 const handleClose = () => {
 onClose?.();
 onOpenChange?.(false);
 };
 const [caption, setCaption] = useState("");
 const [mediaUrl, setMediaUrl] = useState("");
 const [locationName, setLocationName] = useState("");
 const [lat, setLat] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? getStoredLocation() : null;
    return defaultLocation?.lat || stored?.lat || -27.1004;
  });
  const [lng, setLng] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? getStoredLocation() : null;
    return defaultLocation?.lng || stored?.lng || -52.6152;
  });
 const [isBillSplitOpen, setIsBillSplitOpen] = useState(false);
 const [tableSize, setTableSize] = useState(6);
 const [vibe, setVibe] = useState<
 "ao_vivo" | "mesa_aberta" | "cafe_trabalho" | "parque_esporte" | "encontro_musica"
 >("ao_vivo");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isLocating, setIsLocating] = useState(false);

 const handleGetLocation = () => {
 if (typeof window !== "undefined" && navigator.geolocation) {
 setIsLocating(true);
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 setLat(pos.coords.latitude);
 setLng(pos.coords.longitude);
 setIsLocating(false);
 toast.success("Localização GPS capturada com sucesso!");
 },
 () => {
 setIsLocating(false);
 toast.error("Não foi possível acessar seu GPS.");
 },
 );
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!mediaUrl) {
 toast.error("Adicione uma foto real do que você está fazendo no momento.");
 return;
 }

 if (!caption.trim()) {
 toast.error("Conte o que está rolando!");
 return;
 }

 if (!locationName.trim()) {
 toast.error("Informe o local ou bairro onde você está.");
 return;
 }

 setIsSubmitting(true);
 try {
 await publishLiveMoment({
 data: {
 caption: caption.trim(),
 media_url: mediaUrl,
 location_name: locationName.trim(),
 location_lat: lat,
 location_lng: lng,
 is_bill_split_open: isBillSplitOpen,
 table_size: isBillSplitOpen ? tableSize : undefined,
 vibe,
 },
 });

 toast.success("Momento ao vivo publicado com sucesso no mapa!");
 onSuccess?.();
 handleClose();
 // Reset form
 setCaption("");
 setMediaUrl("");
 setLocationName("");
 setIsBillSplitOpen(false);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao publicar momento.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isModalOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
 <DialogContent className="sm:max-w-[480px] sm:rounded-lg bg-card sm:p-6 p-5 max-h-[90vh] overflow-y-auto no-scrollbar">
 <DialogHeader className="space-y-1">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
 <Camera size={20} weight="bold" />
 </div>
 <DialogTitle className="text-base font-bold text-foreground">
 Publicar Momento no Mapa
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Mostre a atividade cotidiana em tempo real na cidade. Fotos instantâneas, o que está rolando agora ou convites para bater papo.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4 pt-2">
 {/* 1. Foto do Momento */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">
 Foto Real do Momento <span className="text-destructive">*</span>
 </Label>
 <MediaUploader
 value={mediaUrl ? [mediaUrl] : []}
 onChange={(urls) => setMediaUrl(urls[0] || "")}
 maxFiles={1}
 bucket="cms-media"
 folder="moments"
 aspect={4 / 3}
 enableCrop={true}
 lockAspect={true}
 accept="image"
 label="Tirar foto ou enviar imagem instantânea"
 />
 </div>

 {/* 2. O que você está fazendo? */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">
 O que você está fazendo agora? <span className="text-destructive">*</span>
 </Label>
 <textarea
 value={caption}
 onChange={(e) => setCaption(e.target.value)}
 placeholder="Ex: Tomando um chimarrão e curtindo o pôr do sol no parque... Cheguem mais!"
 rows={2}
 className="w-full p-3 rounded-lg bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
 required
 />
 </div>

 {/* 3. Vibe / Categoria */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Qual é a vibe?</Label>
 <div className="flex flex-wrap gap-2">
 {VIBE_OPTIONS.map((v) => {
 const isSelected = vibe === v.id;
 const Icon = v.icon;
 return (
 <button
 key={v.id}
 type="button"
 onClick={() => {
 setVibe(v.id as any);
 if (v.id === "mesa_aberta") setIsBillSplitOpen(true);
 }}
 className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer ${
 isSelected
 ? "bg-foreground text-background border-foreground font-bold "
 : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/70"
 }`}
 >
 <Icon size={14} weight={isSelected ? "fill" : "regular"} />
 <span>{v.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* 4. Localização */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground">
 Onde você está? <span className="text-destructive">*</span>
 </Label>
 <button
 type="button"
 onClick={handleGetLocation}
 disabled={isLocating}
 className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
 >
 <Crosshair size={12} weight="bold" />
 <span>{isLocating ? "Pegando GPS..." : "Usar meu GPS"}</span>
 </button>
 </div>
 <Input
 value={locationName}
 onChange={(e) => setLocationName(e.target.value)}
 placeholder="Ex: Ecoparque, Calçadão da Getúlio, Mirante da Serra..."
 className="h-10 rounded-lg bg-background border-border text-xs focus-visible:ring-1 focus-visible:ring-primary"
 required
 />
 </div>

 {/* 5. Mesa Aberta / Dividir Conta */}
 <div className="p-4 rounded-lg bg-muted/30 space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <BeerBottle size={18} weight="bold" className="text-primary" />
 <div>
 <h4 className="text-xs font-bold text-foreground">Mesa Aberta para Dividir Conta?</h4>
 <p className="text-[10px] text-muted-foreground">
 Convide pessoas para socializar no Happy Hour, almoço ou café e rachar a conta.
 </p>
 </div>
 </div>
 <input
 type="checkbox"
 checked={isBillSplitOpen}
 onChange={(e) => setIsBillSplitOpen(e.target.checked)}
 className="size-4 rounded accent-primary cursor-pointer"
 />
 </div>

 {isBillSplitOpen && (
 <div className="pt-2 flex items-center justify-between gap-2">
 <span className="text-[11px] font-medium text-foreground">Vagas na mesa:</span>
 <div className="flex items-center gap-2">
 {[4, 6, 8, 12].map((num) => (
 <button
 key={num}
 type="button"
 onClick={() => setTableSize(num)}
 className={`size-7 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center justify-center ${
 tableSize === num
 ? "bg-foreground text-background border-foreground"
 : "bg-background border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 {num}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="pt-2 flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="rounded-lg text-xs font-bold border-border"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2"
 >
 {isSubmitting ? "Publicando..." : "Publicar no Mapa"}
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}
