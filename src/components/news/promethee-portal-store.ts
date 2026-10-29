import React, { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { NormalizedPrometheeArticle } from "@/lib/news/news-studio-templates";

export interface PrometheePortalSharedState {
  storeId?: string;
  selectedCity: string;
  selectedTab: string;
  searchQuery: string;
  isSearchOpen: boolean;
  isLocationSheetOpen: boolean;
  isCitizenModalOpen: boolean;
  isStudioModalOpen: boolean;
  activeArticle: NormalizedPrometheeArticle | null;
  studioArticle: NormalizedPrometheeArticle | null;
  likedIds: Record<string, boolean>;
  savedIds: Record<string, boolean>;
  citizenArticles: NormalizedPrometheeArticle[];
}

export interface PrometheePortalActions {
  setSelectedCity: (city: string) => void;
  setSelectedTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsLocationSheetOpen: (open: boolean) => void;
  setIsCitizenModalOpen: (open: boolean) => void;
  openArticle: (article: NormalizedPrometheeArticle | null, subpageHref?: string) => void;
  openStudio: (article: NormalizedPrometheeArticle | null) => void;
  closeStudio: () => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  publishCitizenArticle: (article: NormalizedPrometheeArticle) => void;
}

export type PrometheePortalController = PrometheePortalSharedState & PrometheePortalActions;

const DEFAULT_SHARED_STATE: PrometheePortalSharedState = {
  selectedCity: "Todas as Cidades",
  selectedTab: "Para você",
  searchQuery: "",
  isSearchOpen: false,
  isLocationSheetOpen: false,
  isCitizenModalOpen: false,
  isStudioModalOpen: false,
  activeArticle: null,
  studioArticle: null,
  likedIds: {},
  savedIds: {},
  citizenArticles: [],
};

let moduleState: PrometheePortalSharedState = { ...DEFAULT_SHARED_STATE };
const listeners = new Set<() => void>();

function emitModuleChange() {
  listeners.forEach((fn) => fn());
}

function updateModuleState(updater: (prev: PrometheePortalSharedState) => PrometheePortalSharedState) {
  moduleState = updater(moduleState);
  emitModuleChange();
}

function subscribeModule(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getModuleSnapshot() {
  return moduleState;
}

function getServerSnapshot() {
  return DEFAULT_SHARED_STATE;
}

function syncArticleSlugInUrl(slug: string | null) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set("artigo", slug);
    } else {
      url.searchParams.delete("artigo");
    }
    window.history.replaceState({}, "", url.toString());
  } catch {
    // Ignora em ambientes sem histórico navegável
  }
}

const PrometheePortalContext = createContext<PrometheePortalController | null>(null);

export function PrometheePortalProvider({
  initialCity = "Todas as Cidades",
  children,
}: {
  initialCity?: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PrometheePortalSharedState>({
    ...DEFAULT_SHARED_STATE,
    selectedCity: initialCity,
  });

  const controller = useMemo<PrometheePortalController>(
    () => ({
      ...state,
      setSelectedCity: (city) => setState((p) => ({ ...p, selectedCity: city })),
      setSelectedTab: (tab) => setState((p) => ({ ...p, selectedTab: tab, activeArticle: null })),
      setSearchQuery: (searchQuery) => setState((p) => ({ ...p, searchQuery })),
      setIsSearchOpen: (open) =>
        setState((p) => ({
          ...p,
          isSearchOpen: typeof open === "function" ? open(p.isSearchOpen) : open,
        })),
      setIsLocationSheetOpen: (isLocationSheetOpen) => setState((p) => ({ ...p, isLocationSheetOpen })),
      setIsCitizenModalOpen: (isCitizenModalOpen) => setState((p) => ({ ...p, isCitizenModalOpen })),
      openArticle: (article, subpageHref) => {
        if (article && subpageHref && typeof window !== "undefined") {
          const sep = subpageHref.includes("?") ? "&" : "?";
          window.location.assign(`${subpageHref}${sep}artigo=${encodeURIComponent(article.slug || article.id)}`);
          return;
        }
        syncArticleSlugInUrl(article ? article.slug || article.id : null);
        setState((p) => ({ ...p, activeArticle: article }));
      },
      openStudio: (article) =>
        setState((p) => ({ ...p, studioArticle: article, isStudioModalOpen: Boolean(article) })),
      closeStudio: () => setState((p) => ({ ...p, isStudioModalOpen: false })),
      toggleLike: (id) =>
        setState((p) => ({ ...p, likedIds: { ...p.likedIds, [id]: !p.likedIds[id] } })),
      toggleSave: (id) =>
        setState((p) => ({ ...p, savedIds: { ...p.savedIds, [id]: !p.savedIds[id] } })),
      publishCitizenArticle: (article) =>
        setState((p) => ({
          ...p,
          citizenArticles: [article, ...p.citizenArticles],
          isCitizenModalOpen: false,
        })),
    }),
    [state],
  );

  return React.createElement(PrometheePortalContext.Provider, { value: controller }, children);
}

/**
 * Permite que blocos modulares independentes no Omni Builder compartilhem filtro de cidade,
 * categoria ativa, busca, leitura de artigo e canal participativo sem acoplamento rígido.
 */
export function usePrometheePortalController(): PrometheePortalController {
  const ctx = useContext(PrometheePortalContext);
  const shared = useSyncExternalStore(subscribeModule, getModuleSnapshot, getServerSnapshot);

  return useMemo<PrometheePortalController>(() => {
    if (ctx) return ctx;

    return {
      ...shared,
      setSelectedCity: (city) => updateModuleState((p) => ({ ...p, selectedCity: city })),
      setSelectedTab: (tab) => updateModuleState((p) => ({ ...p, selectedTab: tab, activeArticle: null })),
      setSearchQuery: (searchQuery) => updateModuleState((p) => ({ ...p, searchQuery })),
      setIsSearchOpen: (open) =>
        updateModuleState((p) => ({
          ...p,
          isSearchOpen: typeof open === "function" ? open(p.isSearchOpen) : open,
        })),
      setIsLocationSheetOpen: (isLocationSheetOpen) =>
        updateModuleState((p) => ({ ...p, isLocationSheetOpen })),
      setIsCitizenModalOpen: (isCitizenModalOpen) =>
        updateModuleState((p) => ({ ...p, isCitizenModalOpen })),
      openArticle: (article, subpageHref) => {
        if (article && subpageHref && typeof window !== "undefined") {
          const sep = subpageHref.includes("?") ? "&" : "?";
          window.location.assign(`${subpageHref}${sep}artigo=${encodeURIComponent(article.slug || article.id)}`);
          return;
        }
        syncArticleSlugInUrl(article ? article.slug || article.id : null);
        updateModuleState((p) => ({ ...p, activeArticle: article }));
      },
      openStudio: (article) =>
        updateModuleState((p) => ({ ...p, studioArticle: article, isStudioModalOpen: Boolean(article) })),
      closeStudio: () => updateModuleState((p) => ({ ...p, isStudioModalOpen: false })),
      toggleLike: (id) =>
        updateModuleState((p) => ({ ...p, likedIds: { ...p.likedIds, [id]: !p.likedIds[id] } })),
      toggleSave: (id) =>
        updateModuleState((p) => ({ ...p, savedIds: { ...p.savedIds, [id]: !p.savedIds[id] } })),
      publishCitizenArticle: (article) =>
        updateModuleState((p) => ({
          ...p,
          citizenArticles: [article, ...p.citizenArticles],
          isCitizenModalOpen: false,
        })),
    };
  }, [ctx, shared]);
}
