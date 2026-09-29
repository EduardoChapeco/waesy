import { useMemo } from "react";
import { getNicheTranslation, NicheTermKey, NicheDictionaryTerms } from "@/lib/niche-dictionary";
import { NicheSemantics } from "@/lib/niche-semantics";

export { useNicheTaxonomy } from "./use-niche-taxonomy";

/**
 * Hook React Canônico para Metamorfose Semântica por Nicho (Waesy Omni-Niche)
 *
 * Exemplo de Uso:
 * ```tsx
 * const { t, semantics, nicheId, themeClass } = useNicheTranslation(store);
 *
 * return (
 *   <div className={themeClass}>
 *     <h2>{t("catalog")}</h2>
 *     <Button>{t("newItem")}</Button>
 *     <TableHead>{t("client")}</TableHead>
 *   </div>
 * );
 * ```
 */
export function useNicheTranslation(storeData?: any): {
  nicheId: string;
  semantics: NicheSemantics;
  t: (key: NicheTermKey, fallback?: string) => string;
  terms: NicheDictionaryTerms;
  themeClass: string;
} {
  return useMemo(() => {
    return getNicheTranslation(storeData);
  }, [storeData]);
}

export type { NicheTermKey, NicheDictionaryTerms };
