import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border transition-all duration-300 flex items-center gap-2",
        !isOnline
          ? "bg-amber-500/90 text-amber-950 border-amber-600/30 animate-in fade-in slide-in-from-top-2"
          : "bg-emerald-600/90 text-white border-emerald-500/30 animate-in fade-in"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="size-3.5 shrink-0 animate-pulse" />
          <span>Sem conexão à internet &bull; Modo offline</span>
        </>
      ) : (
        <>
          <Wifi className="size-3.5 shrink-0" />
          <span>Conexão restabelecida</span>
        </>
      )}
    </div>
  );
}
