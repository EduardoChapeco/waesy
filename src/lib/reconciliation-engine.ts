import type {
  IFoodOrderDetails,
  ReconciliationCandidate,
  ReconciliationResult,
  ReconciliationScoreBreakdown,
  ReconciliationConfidence,
} from "./ifood-merchant.types";

/**
 * Motor de Reconciliação Multi-Fatorial para Casamento de Pedidos Externos (iFood)
 * com Clientes, Perfis e Conversas de Chat no Waesy.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calcula a distância geodésica em metros utilizando a fórmula de Haversine.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Infinity;
  }

  const toRad = (degree: number) => (degree * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Normaliza textos de endereço para comparação determinística.
 */
export function normalizeAddressString(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(^|\s)r\.(\s|$)/gi, "$1rua$2")
    .replace(/(^|\s)av\.(\s|$)/gi, "$1avenida$2")
    .replace(/(^|\s)(tr\.|trav\.)(\s|$)/gi, "$1travessa$2")
    .replace(/(^|\s)al\.(\s|$)/gi, "$1alameda$2")
    .replace(/(^|\s)rod\.(\s|$)/gi, "$1rodovia$2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza strings de nomes de pessoas (remove acentos, títulos, pontuação).
 */
export function normalizeName(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

/**
 * Distância de Levenshtein simples para fuzzy matching em palavras curtas.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Camada 1: Proximidade Geoespacial (Peso Máximo: 35)
 */
export function scoreGeoProximity(
  orderCoords?: { latitude: number; longitude: number },
  candidateCoords?: { lat: number; lng: number },
): { score: number; reason?: string } {
  if (!orderCoords || !candidateCoords) {
    return { score: 0 };
  }

  const distance = calculateHaversineDistanceMeters(
    orderCoords.latitude,
    orderCoords.longitude,
    candidateCoords.lat,
    candidateCoords.lng,
  );

  if (distance <= 50) {
    return {
      score: 35,
      reason: `Geolocalização altamente precisa (distância de ${Math.round(distance)}m)`,
    };
  }
  if (distance <= 150) {
    return {
      score: 25,
      reason: `Geolocalização muito próxima (${Math.round(distance)}m)`,
    };
  }
  if (distance <= 500) {
    return {
      score: 10,
      reason: `Geolocalização na mesma micro-região (${Math.round(distance)}m)`,
    };
  }

  return { score: 0 };
}

/**
 * Camada 2: Comparação Textual de Endereço (Peso Máximo: 25)
 */
export function scoreAddressText(
  orderAddr: IFoodOrderDetails["delivery"]["deliveryAddress"],
  candidateAddr?: ReconciliationCandidate["address"],
): { score: number; reasons: string[] } {
  if (!candidateAddr) return { score: 0, reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  const normOrderStreet = normalizeAddressString(orderAddr.streetName);
  const normCandidateStreet = normalizeAddressString(candidateAddr.street);

  const orderNum = String(orderAddr.streetNumber || "").trim().toLowerCase();
  const candidateNum = String(candidateAddr.number || "").trim().toLowerCase();

  // Equivalência do número residencial
  if (orderNum && candidateNum && (orderNum === candidateNum || orderNum.includes(candidateNum))) {
    score += 15;
    reasons.push(`Número residencial idêntico (Nº ${orderNum})`);
  }

  // Similaridade de Logradouro
  if (normOrderStreet && normCandidateStreet) {
    if (normOrderStreet === normCandidateStreet) {
      score += 7;
      reasons.push("Logradouro idêntico");
    } else if (
      normOrderStreet.includes(normCandidateStreet) ||
      normCandidateStreet.includes(normOrderStreet)
    ) {
      score += 5;
      reasons.push("Logradouro compatível");
    }
  }

  // Equivalência de CEP / Bairro
  const cleanZipOrder = String(orderAddr.postalCode || "").replace(/\D/g, "");
  const cleanZipCandidate = String(candidateAddr.zipcode || "").replace(/\D/g, "");
  if (cleanZipOrder && cleanZipCandidate && cleanZipOrder === cleanZipCandidate) {
    score += 3;
    reasons.push("CEP convergente");
  }

  return { score: Math.min(25, score), reasons };
}

/**
 * Camada 3: Nome do Cliente (Peso Máximo: 20)
 */
export function scoreCustomerName(
  orderName: string,
  candidateName: string,
): { score: number; reason?: string } {
  const orderTokens = normalizeName(orderName);
  const candidateTokens = normalizeName(candidateName);

  if (orderTokens.length === 0 || candidateTokens.length === 0) {
    return { score: 0 };
  }

  // Primeiro nome coincide exatamente
  const firstNameMatches =
    orderTokens[0] === candidateTokens[0] ||
    levenshteinDistance(orderTokens[0], candidateTokens[0]) <= 1;

  if (!firstNameMatches) {
    return { score: 0 };
  }

  // Sobrenomes compartilhados
  const sharedTokens = orderTokens.filter((token) => candidateTokens.includes(token));

  if (sharedTokens.length >= 2) {
    return {
      score: 20,
      reason: `Nome e sobrenome coincidentes (${candidateName})`,
    };
  }

  if (firstNameMatches) {
    return {
      score: 10,
      reason: `Primeiro nome idêntico (${orderTokens[0]})`,
    };
  }

  return { score: 0 };
}

/**
 * Camada 4: Janela Temporal e Atividade no Chat (Peso Máximo: 15)
 */
export function scoreTemporalChat(
  orderCreatedAt: string,
  recentChatActivity?: Array<{ text: string; createdAt: string }>,
): { score: number; reason?: string } {
  if (!recentChatActivity || recentChatActivity.length === 0) {
    return { score: 0 };
  }

  const orderTime = Date.parse(orderCreatedAt) || Date.now();

  // Encontra a mensagem mais recente próxima ao horário do pedido
  let closestMinutes = Infinity;

  for (const msg of recentChatActivity) {
    const msgTime = Date.parse(msg.createdAt) || 0;
    if (msgTime > 0) {
      const diffMinutes = Math.abs(orderTime - msgTime) / 60000;
      if (diffMinutes < closestMinutes) {
        closestMinutes = diffMinutes;
      }
    }
  }

  if (closestMinutes <= 30) {
    return {
      score: 15,
      reason: `Interação no chat da loja há menos de 30 min do pedido (~${Math.round(closestMinutes)} min)`,
    };
  }
  if (closestMinutes <= 120) {
    return {
      score: 8,
      reason: `Interação no chat da loja recente (~${Math.round(closestMinutes)} min)`,
    };
  }

  return { score: 0 };
}

/**
 * Camada 5: Observações e Itens / Produtos (Peso Máximo: 5)
 */
export function scoreNotesAndItems(
  order: IFoodOrderDetails,
  recentChatActivity?: Array<{ text: string; createdAt: string }>,
): { score: number; reason?: string } {
  if (!recentChatActivity || recentChatActivity.length === 0) {
    return { score: 0 };
  }

  const chatCorpus = recentChatActivity
    .map((msg) => msg.text.toLowerCase())
    .join(" ");

  let matched = false;

  // Verifica termos em observações do pedido (ex: "apartamento", "bloco", "interfone")
  if (order.extraInfo) {
    const extraTokens = order.extraInfo.toLowerCase().split(/\s+/);
    for (const token of extraTokens) {
      if (token.length >= 4 && chatCorpus.includes(token)) {
        matched = true;
        break;
      }
    }
  }

  // Verifica menções a nomes de produtos no chat
  if (!matched && order.items.length > 0) {
    for (const item of order.items) {
      const itemTitle = item.name.toLowerCase();
      if (chatCorpus.includes(itemTitle)) {
        matched = true;
        break;
      }
    }
  }

  if (matched) {
    return {
      score: 5,
      reason: "Correspondência de itens ou instruções de entrega discutidas no chat",
    };
  }

  return { score: 0 };
}

/**
 * Executa o cálculo determinístico do Score de Reconciliação Multi-Fatorial.
 */
export function calculateOrderReconciliationScore(
  order: IFoodOrderDetails,
  candidate: ReconciliationCandidate,
): ReconciliationResult {
  const breakdown: ReconciliationScoreBreakdown = {
    geoProximityScore: 0,
    addressTextScore: 0,
    customerNameScore: 0,
    temporalChatScore: 0,
    notesAndItemsScore: 0,
  };

  const matchedReasons: string[] = [];

  // 1. Geoespacial
  const geo = scoreGeoProximity(
    order.delivery.deliveryAddress.coordinates,
    candidate.address?.coordinates,
  );
  breakdown.geoProximityScore = geo.score;
  if (geo.reason) matchedReasons.push(geo.reason);

  // 2. Endereço Textual
  const addr = scoreAddressText(
    order.delivery.deliveryAddress,
    candidate.address,
  );
  breakdown.addressTextScore = addr.score;
  matchedReasons.push(...addr.reasons);

  // 3. Nome do Cliente
  const name = scoreCustomerName(order.customer.name, candidate.customerName);
  breakdown.customerNameScore = name.score;
  if (name.reason) matchedReasons.push(name.reason);

  // 4. Janela Temporal Chat
  const temporal = scoreTemporalChat(order.createdAt, candidate.recentChatActivity);
  breakdown.temporalChatScore = temporal.score;
  if (temporal.reason) matchedReasons.push(temporal.reason);

  // 5. Observações / Produtos
  const notes = scoreNotesAndItems(order, candidate.recentChatActivity);
  breakdown.notesAndItemsScore = notes.score;
  if (notes.reason) matchedReasons.push(notes.reason);

  // Soma Total
  const totalScore = Math.min(
    100,
    breakdown.geoProximityScore +
      breakdown.addressTextScore +
      breakdown.customerNameScore +
      breakdown.temporalChatScore +
      breakdown.notesAndItemsScore,
  );

  let confidence: ReconciliationConfidence = "LOW_CONFIDENCE";
  if (totalScore >= 80) {
    confidence = "HIGH_CONFIDENCE";
  } else if (totalScore >= 50) {
    confidence = "PROBABLE_MATCH";
  }

  return {
    score: totalScore,
    confidence,
    breakdown,
    matchedReasons,
    candidate,
  };
}

/**
 * Ordena e encontra os melhores candidatos para um pedido externo.
 */
export function rankOrderReconciliations(
  order: IFoodOrderDetails,
  candidates: ReconciliationCandidate[],
): ReconciliationResult[] {
  return candidates
    .map((candidate) => calculateOrderReconciliationScore(order, candidate))
    .sort((a, b) => b.score - a.score);
}
