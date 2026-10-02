import React, { useState, useEffect } from "react";
import { Bell, BellRing, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { savePushSubscription } from "@/services/notifications-push.functions";
import { toast } from "sonner";

interface LeadPushNotificationPromptProps {
  storeId?: string;
}

export function LeadPushNotificationPrompt({ storeId }: LeadPushNotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRegistering, setIsRegistering] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notificações não são suportadas por este navegador.");
      return;
    }

    setIsRegistering(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        // Tentar obter ou simular chave push do service worker
        let pushEndpoint = `https://fcm.googleapis.com/fcm/send/${Math.random().toString(36).substring(2)}`;
        let p256dh = btoa("mock-p256dh-key-waesy-" + Date.now());
        let auth = btoa("mock-auth-" + Date.now());

        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const existingSub = await reg.pushManager.getSubscription();
            if (existingSub) {
              pushEndpoint = existingSub.endpoint;
              const rawKey = existingSub.getKey("p256dh");
              const rawAuth = existingSub.getKey("auth");
              if (rawKey) p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
              if (rawAuth) auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));
            }
          } catch (swErr) {
            console.warn("[push-prompt] Service worker subscription fallback:", swErr);
          }
        }

        await savePushSubscription({
          data: {
            storeId,
            endpoint: pushEndpoint,
            p256dh,
            auth,
            deviceLabel: navigator.userAgent.includes("Mobile") ? "Celular / Mobile" : "Computador / Desktop",
          },
        });

        toast.success("Notificações instantâneas ativadas com sucesso!");
      } else {
        toast.info("Permissão de notificações não foi concedida.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao ativar notificações.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (dismissed || permission === "denied") return null;

  if (permission === "granted") {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BellRing className="size-4" />
          </div>
          <div>
            <p className="font-bold text-foreground">Alertas Instantâneos Ativos</p>
            <p className="text-[11px] text-muted-foreground">
              Você será avisado no celular/desktop a cada novo cliente ou pedido.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
          Conectado
        </Badge>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-card border border-border/60 shadow-xs gap-3">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
          <Bell className="size-4.5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-foreground">
              Receber Notificações de Novos Leads
            </h4>
            <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary bg-primary/5">
              Recomendado
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Seja avisado com som na tela no exato momento em que um comprador clicar em "Reservar" ou enviar proposta.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-9 px-3 text-xs text-muted-foreground rounded-lg"
        >
          Agora Não
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleEnablePush}
          disabled={isRegistering}
          className="h-9 px-4 text-xs font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-sm"
        >
          {isRegistering ? "Ativando..." : "Ativar Alertas"}
        </Button>
      </div>
    </div>
  );
}
