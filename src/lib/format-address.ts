/**
 * format-address.ts — Formatador Canônico Universal de Endereços (Waesy Platform)
 * 
 * Regras Estritas:
 * 1. Zero separadores órfãos (vírgulas, hífens, pontos soltos).
 * 2. Deduplicação automática de Cidade/Estado (elimina "SMO - SC • SMO - SC").
 * 3. Se número estiver ausente ou "S/N", não gera vírgulas vazias.
 * 4. Suporte a string bruta, objeto estruturado ou partes separadas.
 */

export interface CanonicalAddressInput {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
}

export interface FormattedAddressResult {
  display: string;
  mapsQuery: string;
  short: string;
}

function cleanSegment(text: string): string {
  if (!text) return "";
  return text
    .replace(/,\s*,+/g, ", ")
    .replace(/-\s*-+/g, " - ")
    .replace(/,\s*-\s*,?/g, " - ")
    .replace(/^[,\s•\-\/]+|[,\s•\-\/]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatCanonicalAddress(
  rawInput?: string | CanonicalAddressInput | null,
  fallbackCity?: string | null,
  fallbackState?: string | null
): FormattedAddressResult | null {
  if (!rawInput && !fallbackCity) return null;

  let street = "";
  let number = "";
  let complement = "";
  let neighborhood = "";
  let city = (fallbackCity || "").trim();
  let state = (fallbackState || "").trim();

  if (typeof rawInput === "string") {
    let cleanRaw = cleanSegment(rawInput);
    if (!cleanRaw) {
      if (!city) return null;
      const cityState = [city, state].filter(Boolean).join(" - ");
      return {
        display: cityState,
        mapsQuery: cityState,
        short: cityState,
      };
    }

    // Se a string já tiver vírgula ou separadores, limpar pontuações bizarras
    // Ex: ", S/N - , São Miguel do Oeste - SC"
    cleanRaw = cleanRaw
      .replace(/^[,\s•\-]+/, "")
      .replace(/[,\s•\-]+$/, "");

    // Se começar com "S/N - ,", remove o prefixo quebrado se não houver rua
    if (/^S\/N\s*[-,\s]+/i.test(cleanRaw)) {
      cleanRaw = cleanRaw.replace(/^S\/N\s*[-,\s]+/i, "").trim();
    }

    // Se após limpar só sobrou cidade/estado ou vazio
    if (!cleanRaw) {
      if (!city) return null;
      const cityState = [city, state].filter(Boolean).join(" - ");
      return {
        display: cityState,
        mapsQuery: cityState,
        short: cityState,
      };
    }

    // Deduplica cidade/estado se repetidos na string
    // Ex: "Rua X, 100, SMO - SC, 89900 • SMO - SC"
    if (city) {
      const cityRegex = new RegExp(`(?:•|,|\\s-)?\\s*${city}\\s*[-/]?\\s*${state || ""}`, "gi");
      const matches = cleanRaw.match(cityRegex);
      if (matches && matches.length > 1) {
        // Mantém apenas a primeira ocorrência
        let first = true;
        cleanRaw = cleanRaw.replace(cityRegex, (m) => {
          if (first) {
            first = false;
            return m;
          }
          return "";
        });
      }
    }

    cleanRaw = cleanSegment(cleanRaw);
    if (!cleanRaw) return null;

    // Se a string limpa não inclui a cidade informada no fallback, adiciona
    if (city && !cleanRaw.toLowerCase().includes(city.toLowerCase())) {
      const cityState = [city, state].filter(Boolean).join(" - ");
      cleanRaw = `${cleanRaw} • ${cityState}`;
    }

    const finalDisplay = cleanSegment(cleanRaw);
    return {
      display: finalDisplay,
      mapsQuery: finalDisplay.replace(/•/g, ", "),
      short: finalDisplay.split("•")[0]?.trim() || finalDisplay,
    };
  }

  if (typeof rawInput === "object" && rawInput !== null) {
    street = cleanSegment(rawInput.street || "");
    number = cleanSegment(rawInput.number || "");
    complement = cleanSegment(rawInput.complement || "");
    neighborhood = cleanSegment(rawInput.neighborhood || "");
    city = cleanSegment(rawInput.city || city);
    state = cleanSegment(rawInput.state || state);
  }

  // Montagem estruturada limpa
  const segments: string[] = [];

  // 1. Rua + Número (sem vírgulas órfãs se um dos dois faltar)
  let streetPart = "";
  if (street) {
    if (number && number.toUpperCase() !== "S/N") {
      streetPart = `${street}, ${number}`;
    } else {
      streetPart = street;
    }
    if (complement) {
      streetPart += ` (${complement})`;
    }
  } else if (number && number.toUpperCase() !== "S/N") {
    streetPart = `Nº ${number}`;
  }

  if (streetPart) {
    segments.push(streetPart);
  }

  // 2. Bairro
  if (neighborhood && !streetPart.toLowerCase().includes(neighborhood.toLowerCase())) {
    segments.push(neighborhood);
  }

  // 3. Cidade - Estado
  const cityStateParts = [city, state].filter(Boolean);
  if (cityStateParts.length > 0) {
    const cityState = cityStateParts.join(" - ");
    segments.push(cityState);
  }

  const cleanSegments = segments.map(cleanSegment).filter(Boolean);
  if (cleanSegments.length === 0) return null;

  return {
    display: cleanSegments.join(" • "),
    mapsQuery: cleanSegments.join(", "),
    short: cleanSegments[0] || "",
  };
}
