import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getBrowserClient } from "@/lib/supabase";

export interface UseStoreAppRealtimeOptions {
  storeId: string;
  slug: string;
  cacheVersion?: number;
  enabled?: boolean;
}

export function useStoreAppRealtime({
  storeId,
  slug,
  cacheVersion,
  enabled = true,
}: UseStoreAppRealtimeOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVersionRef = useRef<number | undefined>(cacheVersion);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      prevVersionRef.current !== undefined &&
      cacheVersion !== undefined &&
      cacheVersion > prevVersionRef.current
    ) {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "PURGE_APP_CACHE",
          slug,
          version: cacheVersion,
        });
      }
    }
    prevVersionRef.current = cacheVersion;
  }, [cacheVersion, slug]);

  useEffect(() => {
    if (!enabled || !storeId || typeof window === "undefined") return;

    let isDisposed = false;
    const supabase = getBrowserClient();

    const triggerSync = (purgeSwCache: boolean) => {
      if (isDisposed) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (isDisposed) return;

        if (purgeSwCache && "serviceWorker" in navigator) {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "PURGE_APP_CACHE",
              slug,
            });
          }
          navigator.serviceWorker.getRegistration?.().then((reg) => {
            reg?.update().catch(() => {});
          });
        }

        queryClient.invalidateQueries({ queryKey: ["branded-app", slug] });
        queryClient.invalidateQueries({ queryKey: ["branded-app-infinite", storeId] });
        queryClient.invalidateQueries({ queryKey: ["client-store-portal", storeId] });
        router.invalidate().catch(() => {});
      }, 280);
    };

    const channel = supabase
      .channel(`branded-app-sync-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_pwa_configs", filter: `store_id=eq.${storeId}` },
        () => triggerSync(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_page_sections", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores", filter: `id=eq.${storeId}` },
        () => triggerSync(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banners", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_forms", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tourism_experiences", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_services", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classifieds", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brand_dna_profiles", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brand_kits", filter: `store_id=eq.${storeId}` },
        () => triggerSync(false),
      )
      .subscribe();

    const handleOnline = () => triggerSync(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["branded-app", slug] });
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isDisposed = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [enabled, storeId, slug, queryClient, router]);
}
