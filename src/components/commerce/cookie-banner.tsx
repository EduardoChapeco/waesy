import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Cookie, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordConsentLog } from "@/services/legal.functions";

export function CookieBanner() {
 const [show, setShow] = useState(false);

 useEffect(() => {
 if (typeof window === "undefined") return;

 // 1. Checa se o consentimento já foi aceito no localStorage
 const localConsent = localStorage.getItem("waesy_cookie_consent");
 if (localConsent === "accepted") {
 return;
 }

 // 2. Checa se existe cookie persistente de consentimento
 const cookies = document.cookie.split(";").map((c) => c.trim());
 const hasConsentCookie = cookies.some((c) => c.startsWith("waesy_cookie_consent=accepted"));
 if (hasConsentCookie) {
 localStorage.setItem("waesy_cookie_consent", "accepted");
 return;
 }

 // 3. Se o usuário já está autenticado (tem token do Supabase), o consentimento dos termos já foi dado no cadastro
 const hasAuthToken = Object.keys(localStorage).some((k) => k.includes("-auth-token"));
 const hasAuthCookie = cookies.some((c) => c.includes("sb-") || c.includes("waesy_active_tenant"));
 if (hasAuthToken || hasAuthCookie) {
 localStorage.setItem("waesy_cookie_consent", "accepted");
 const isHttps = window.location.protocol === "https:";
 const secureFlag = isHttps ? "; Secure" : "";
 document.cookie = `waesy_cookie_consent=accepted; path=/; max-age=315360000; SameSite=Lax${secureFlag}`;
 return;
 }

 // 4. Se for visitante novo, exibe o aviso suavemente
 setShow(true);
 }, []);

 const handleAccept = async () => {
 // 1. Oculta imediatamente da UI para melhor percepção de velocidade
 setShow(false);

 if (typeof window !== "undefined") {
 // 2. Grava no localStorage
 localStorage.setItem("waesy_cookie_consent", "accepted");

 // 3. Grava cookie com validade de 10 anos em path=/
 const isHttps = window.location.protocol === "https:";
 const secureFlag = isHttps ? "; Secure" : "";
 document.cookie = `waesy_cookie_consent=accepted; path=/; max-age=315360000; SameSite=Lax${secureFlag}`;
 }

 // 4. Dispara a gravação do log forense imutável no banco com IP, User-Agent e Hash SHA-256
 try {
 await recordConsentLog({
 data: {
 term_type: "cookie_policy",
 version: "2.0",
 metadata: {
 source: "cookie_banner_acceptance",
 url: typeof window !== "undefined" ? window.location.href : "",
 },
 },
 });
 } catch {
 // Non-blocking for UI
 }
 };

 if (!show) return null;

 return (
 <aside
 aria-label="Aviso de Privacidade e Cookies"
 className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-5 pb-safe pb-24 sm:pb-6 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300"
 >
 <div className="mx-auto max-w-4xl bg-card/95 backdrop-blur-md rounded-2xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-auto ">
 <div className="flex items-start gap-3 flex-1 min-w-0">
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
 <Cookie className="size-4" />
 </div>
 <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
 <div className="flex items-center gap-2 mb-0.5">
 <span className="font-bold text-foreground text-xs sm:text-sm">Privacidade e Cookies LGPD</span>
 <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
 <ShieldCheck className="size-3" /> Seguro
 </span>
 </div>
 <p className="text-xs">
 Utilizamos cookies essenciais para autenticação, segurança e personalização. Ao navegar, você concorda com nossos{" "}
 <Link to="/termos" className="underline font-semibold hover:text-foreground inline-flex items-center gap-0.5">
 Termos de Uso
 </Link>
 ,{" "}
 <Link to="/privacidade" className="underline font-semibold hover:text-foreground inline-flex items-center gap-0.5">
 Privacidade
 </Link>
 ,{" "}
 <Link to="/politicas/$slug" params={{ slug: "cookies" }} className="underline font-semibold hover:text-foreground">
 Cookies
 </Link>{" "}
 e{" "}
 <Link to="/politicas/$slug" params={{ slug: "isencao" }} className="underline font-semibold hover:text-foreground">
 Isenção de Negociações
 </Link>
 .
 </p>
 </div>
 </div>

 <div className="flex shrink-0 gap-2 w-full sm:w-auto">
 <Button
 onClick={handleAccept}
 className="w-full sm:w-auto font-bold rounded-xl bg-primary text-primary-foreground text-xs h-9 px-5 hover:scale-[1.02] active:scale-[0.98] transition-all"
 >
 Entendi e Aceito
 </Button>
 </div>
 </div>
 </aside>
 );
}
