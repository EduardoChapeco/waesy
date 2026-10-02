import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, ShoppingBag, Utensils, Scissors, Briefcase, Plane, Flame, Shirt, Music, Check, ArrowRight } from 'lucide-react';
import { saveUserPreferences, getUserPreferences } from "@/services/hotpage.functions";
import { toast } from "sonner";

const NICHES_LIST = [
 {
 id: "all",
 label: "Tudo na Cidade",
 icon: Layers,
 color: "from-amber-500/20 to-orange-500/20",
 },
 {
 id: "ofertas",
 label: "Ofertas Relâmpago",
 icon: Flame,
 color: "from-red-500/20 to-rose-500/20",
 },
 {
 id: "gastronomia",
 label: "Gastronomia e Lanches",
 icon: Utensils,
 color: "from-orange-500/20 to-amber-500/20",
 },
 {
 id: "mercado",
 label: "Mercado e Produtores",
 icon: ShoppingBag,
 color: "from-emerald-500/20 to-green-500/20",
 },
 {
 id: "beleza",
 label: "Beleza e Barbearia",
 icon: Scissors,
 color: "from-purple-500/20 to-pink-500/20",
 },
 {
 id: "empregos",
 label: "Vagas e Oportunidades",
 icon: Briefcase,
 color: "from-blue-500/20 to-cyan-500/20",
 },
 {
 id: "viagens",
 label: "Viagens e Passeios",
 icon: Plane,
 color: "from-sky-500/20 to-indigo-500/20",
 },
 { id: "moda", label: "Moda e Estilo", icon: Shirt, color: "from-fuchsia-500/20 to-pink-500/20" },
 {
 id: "arte",
 label: "Música e Eventos",
 icon: Music,
 color: "from-violet-500/20 to-purple-500/20",
 },
];

export function InterestPickerModal() {
 const [open, setOpen] = useState(false);
 const [selectedNiches, setSelectedNiches] = useState<string[]>(["all"]);
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 if (typeof window === "undefined") return;

 // 1. Se já foi concluído ou dispensado no localStorage ou em Cookie persistente, NUNCA abre
 const localDone = localStorage.getItem("waesy_onboarding_interests_done");
 const hasCookie = document.cookie.includes("waesy_onboarding_interests_done=true");
 if (localDone === "true" || hasCookie) {
 return;
 }

 // 2. O modal só deve abrir se o usuário ACABOU de fazer cadastro (onboarding inicial)
 const justRegistered = sessionStorage.getItem("waesy_just_registered") === "true";
 const hasOnboardingParam = window.location.search.includes("onboarding=true") || window.location.search.includes("welcome=true");

 // Verifica no servidor se é um usuário autenticado que ainda não completou o onboarding
 getUserPreferences()
 .then((prefs) => {
 if (prefs && prefs.onboarding_done) {
 localStorage.setItem("waesy_onboarding_interests_done", "true");
 document.cookie = "waesy_onboarding_interests_done=true; path=/; max-age=315360000; SameSite=Lax";
 if (prefs.selected_niches && prefs.selected_niches.length > 0) {
 localStorage.setItem("waesy_user_niches", JSON.stringify(prefs.selected_niches));
 }
 } else if (prefs && !prefs.onboarding_done) {
 // Usuário logado em fase de primeiro onboarding
 const t = setTimeout(() => setOpen(true), 600);
 return () => clearTimeout(t);
 } else if (justRegistered || hasOnboardingParam) {
 // Recém-cadastrado via fluxo visual
 const t = setTimeout(() => setOpen(true), 600);
 return () => clearTimeout(t);
 } else {
 // Usuário anônimo comum navegando no site: não interrompe a experiência com popup
 localStorage.setItem("waesy_onboarding_interests_done", "true");
 document.cookie = "waesy_onboarding_interests_done=true; path=/; max-age=315360000; SameSite=Lax";
 }
 })
 .catch(() => {
 // Erro ou anônimo: suprime popup e grava flag
 localStorage.setItem("waesy_onboarding_interests_done", "true");
 document.cookie = "waesy_onboarding_interests_done=true; path=/; max-age=315360000; SameSite=Lax";
 });
 }, []);

 const toggleNiche = (id: string) => {
 if (id === "all") {
 setSelectedNiches(["all"]);
 return;
 }

 let updated = selectedNiches.filter((n) => n !== "all");
 if (updated.includes(id)) {
 updated = updated.filter((n) => n !== id);
 if (updated.length === 0) updated = ["all"];
 } else {
 updated.push(id);
 }
 setSelectedNiches(updated);
 };

 const handleClose = (newOpen: boolean) => {
 if (!newOpen) {
 localStorage.setItem("waesy_onboarding_interests_done", "true");
 document.cookie = "waesy_onboarding_interests_done=true; path=/; max-age=315360000; SameSite=Lax";
 sessionStorage.removeItem("waesy_just_registered");
 saveUserPreferences({
 data: {
 selected_niches: selectedNiches,
 onboarding_done: true,
 },
 }).catch(() => null);
 }
 setOpen(newOpen);
 };

 const handleConfirm = async () => {
 setIsSaving(true);
 try {
 localStorage.setItem("waesy_onboarding_interests_done", "true");
 document.cookie = "waesy_onboarding_interests_done=true; path=/; max-age=315360000; SameSite=Lax";
 sessionStorage.removeItem("waesy_just_registered");
 localStorage.setItem("waesy_user_niches", JSON.stringify(selectedNiches));

 await saveUserPreferences({
 data: {
 selected_niches: selectedNiches,
 onboarding_done: true,
 },
 });

 toast.success("Preferências salvas com sucesso! Seu feed foi personalizado.");
 setOpen(false);

 if (typeof window !== "undefined") {
 window.dispatchEvent(new CustomEvent("waesy:preferences-updated", { detail: selectedNiches }));
 }
 } catch {
 setOpen(false);
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={handleClose}>
 <DialogContent className="sm:max-w-xl p-5 sm:p-8 sm:rounded-lg bg-background">
 <DialogHeader className="space-y-2 text-center sm:text-left">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold mx-auto sm:mx-0">
 <Layers className="size-5" />
 </div>
 <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
 O que você mais gosta de acompanhar?
 </DialogTitle>
 <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
 Selecione seus temas favoritos para personalizarmos suas ofertas, novidades e eventos
 locais.
 </DialogDescription>
 </DialogHeader>

 {/* Niche Grid (Pinterest / Twitter Style) */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
 {NICHES_LIST.map((item) => {
 const Icon = item.icon;
 const isSelected = selectedNiches.includes(item.id);

 return (
 <button
 key={item.id}
 type="button"
 onClick={() => toggleNiche(item.id)}
 className={`relative flex flex-col items-start justify-between p-4 rounded-lg border text-left transition-all select-none cursor-pointer group ${
 isSelected
 ? "bg-primary text-primary-foreground border-primary scale-[1.02]"
 : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/40"
 }`}
 >
 <div
 className={`size-8 rounded-lg flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
 isSelected ? "bg-white/20 text-white" : "bg-muted text-foreground"
 }`}
 >
 <Icon className="size-4" />
 </div>

 <div className="w-full flex items-center justify-between gap-1">
 <span className="text-xs font-bold leading-tight">{item.label}</span>
 {isSelected && <Check className="size-3.5 shrink-0" />}
 </div>
 </button>
 );
 })}
 </div>

 <div className="flex items-center justify-between pt-2 ">
 <button
 type="button"
 onClick={() => handleClose(false)}
 className="text-xs text-muted-foreground hover:text-foreground font-semibold"
 >
 Pular por enquanto
 </button>

 <Button
 type="button"
 onClick={handleConfirm}
 disabled={isSaving}
 className="h-11 px-6 rounded-lg font-bold bg-primary text-primary-foreground text-xs gap-2 "
 >
 <span>Continuar</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
