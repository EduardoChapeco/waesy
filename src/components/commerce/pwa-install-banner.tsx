import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PWAInstallBannerProps {
 storeName?: string;
 storeLogoUrl?: string;
 storeId?: string;
 className?: string;
}

export function PWAInstallBanner({
 storeName = "Loja Oficial",
 storeLogoUrl,
 storeId,
 className,
}: PWAInstallBannerProps) {
 const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
 const [isStandalone, setIsStandalone] = useState(false);
 const [isIOS, setIsIOS] = useState(false);
 const [showIOSGuide, setShowIOSGuide] = useState(false);
 const [isDismissed, setIsDismissed] = useState(false);

 useEffect(() => {
 // 1. Verifica se já está rodando em modo PWA standalone
 const isStandaloneMode =
 window.matchMedia("(display-mode: standalone)").matches ||
 (window.navigator as any).standalone === true ||
 document.referrer.includes("android-app://");

 setIsStandalone(isStandaloneMode);

 // 2. Verifica se o usuário já dispensou hoje
 const storageKey = `pwa_dismiss_${storeId || "default"}`;
 const dismissedTimestamp = localStorage.getItem(storageKey);
 if (dismissedTimestamp) {
 const hoursSinceDismiss = (Date.now() - parseInt(dismissedTimestamp, 10)) / (1000 * 60 * 60);
 if (hoursSinceDismiss < 24) {
 setIsDismissed(true);
 }
 }

 // 3. Detecta iOS Safari
 const userAgent = window.navigator.userAgent.toLowerCase();
 const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
 setIsIOS(isIosDevice);

 // 4. Captura evento nativo do Android / Chrome / Edge
 const handleBeforeInstallPrompt = (e: Event) => {
 e.preventDefault();
 setDeferredPrompt(e);
 };

 window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

 return () => {
 window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 };
 }, [storeId]);

 // Não exibe se já estiver instalado como PWA ou dispensado
 if (isStandalone || isDismissed) {
 return null;
 }

 // Não exibe em desktop se não houver prompt nativo
 if (!deferredPrompt && !isIOS) {
 return null;
 }

 const handleInstallClick = async () => {
 if (isIOS) {
 setShowIOSGuide(true);
 return;
 }

 if (!deferredPrompt) return;

 deferredPrompt.prompt();
 const { outcome } = await deferredPrompt.userChoice;
 if (outcome === "accepted") {
 setIsDismissed(true);
 }
 setDeferredPrompt(null);
 };

 const handleDismiss = () => {
 setIsDismissed(true);
 const storageKey = `pwa_dismiss_${storeId || "default"}`;
 localStorage.setItem(storageKey, Date.now().toString());
 };

 return (
 <>
 {/* ── Banner Flutuante de Instalação (Thumb-Zone amigável) ── */}
 <div
 className={cn(
 "fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40 sm:max-w-md",
 "p-4 rounded-lg bg-card/95 backdrop-blur-md border border-border/80 shadow-xl",
 "flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300",
 className
 )}
 >
 <div className="flex items-center gap-3 min-w-0">
 {storeLogoUrl ? (
 <img
 src={storeLogoUrl}
 alt={storeName}
 className="size-10 rounded-lg object-cover border border-border/60 shrink-0 bg-muted"
 />
 ) : (
 <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
 <Smartphone className="size-5" />
 </div>
 )}

 <div className="min-w-0 space-y-1">
 <p className="text-xs font-bold text-foreground truncate">
 App de {storeName}
 </p>
 <p className="text-[11px] text-muted-foreground truncate">
 Instale na tela inicial para acesso rápido
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <Button
 onClick={handleInstallClick}
 size="sm"
 className="min-h-11 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-xs cursor-pointer"
 >
 <Download className="size-4" />
 <span>Instalar</span>
 </Button>

 <button
 type="button"
 onClick={handleDismiss}
 className="min-h-11 min-w-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
 title="Fechar"
 aria-label="Fechar banner de instalação"
 >
 <X className="size-4" />
 </button>
 </div>
 </div>

 {/* ── Modal Guia de Instalação no iOS Safari ── */}
 {showIOSGuide && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
 <div className="w-full max-w-sm rounded-lg bg-card border border-border/80 p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-foreground">Como instalar no iPhone</h3>
 <button
 type="button"
 onClick={() => setShowIOSGuide(false)}
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
 >
 <X className="size-4" />
 </button>
 </div>

 <div className="space-y-3 text-xs text-muted-foreground">
 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
 <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
 1
 </div>
 <div className="space-y-1 pt-1">
 <p className="font-semibold text-foreground flex items-center gap-2">
 <span>Toque no botão Compartilhar</span>
 <Share className="size-3.5 text-primary" />
 </p>
 <p className="text-[11px]">Localizado na barra inferior do Safari.</p>
 </div>
 </div>

 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
 <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
 2
 </div>
 <div className="space-y-1 pt-1">
 <p className="font-semibold text-foreground flex items-center gap-2">
 <span>"Adicionar à Tela de Início"</span>
 <PlusSquare className="size-3.5 text-primary" />
 </p>
 <p className="text-[11px]">Role para baixo e selecione esta opção.</p>
 </div>
 </div>
 </div>

 <Button
 onClick={() => setShowIOSGuide(false)}
 className="w-full h-10 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
 >
 Entendido
 </Button>
 </div>
 </div>
 )}
 </>
 );
}
