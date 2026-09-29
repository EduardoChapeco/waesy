import { useMemo } from "react";
import { getNicheTranslation, NicheTermKey, NicheDictionaryTerms } from "@/lib/niche-dictionary";
import { NicheSemantics } from "@/lib/niche-semantics";

/**
 * useNicheTaxonomy() — Hook Canônico para Taxonomia, Micro-Copy & Design Tokenization (MASTER PROMPT V138)
 *
 * Fornece a tradução semântica de entidades, micro-interações (Toasts, Modais de Exclusão, Empty States)
 * e o tema camaleônico de cores e bordas por nicho.
 */
export function useNicheTaxonomy(storeData?: any): {
  nicheId: string;
  semantics: NicheSemantics;
  t: (key: NicheTermKey, fallback?: string) => string;
  terms: NicheDictionaryTerms;
  themeClass: string;
  toasts: {
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
  };
  confirmations: {
    deleteTitle: string;
    deleteDescription: string;
  };
  emptyStates: {
    catalogTitle: string;
    catalogDescription: string;
    ordersTitle: string;
    ordersDescription: string;
  };
  notifications: {
    confirmedTitle: string;
    confirmedBody: string;
  };
} {
  return useMemo(() => {
    const translation = getNicheTranslation(storeData);
    const { terms, themeClass } = translation;

    return {
      ...translation,
      toasts: {
        createSuccess: terms.createSuccessToast,
        updateSuccess: terms.updateSuccessToast,
        deleteSuccess: terms.deleteSuccessToast,
      },
      confirmations: {
        deleteTitle: terms.deleteConfirmTitle,
        deleteDescription: terms.deleteConfirmDescription,
      },
      emptyStates: {
        catalogTitle: terms.emptyStateCatalogTitle,
        catalogDescription: terms.emptyStateCatalogDescription,
        ordersTitle: terms.emptyStateOrdersTitle,
        ordersDescription: terms.emptyStateOrdersDescription,
      },
      notifications: {
        confirmedTitle: terms.notificationConfirmedTitle,
        confirmedBody: terms.notificationConfirmedBody,
      },
    };
  }, [storeData]);
}

export type { NicheTermKey, NicheDictionaryTerms };
