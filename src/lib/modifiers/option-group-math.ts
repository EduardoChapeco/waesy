export type ModifierGroupMode = "single" | "multiple" | "quantity" | "pizza";

export interface ModifierSelectionItem {
  groupId: string;
  groupTitle: string;
  modifierId: string;
  title: string;
  priceDeltaCents: number;
  quantity?: number;
}

export interface ModifierGroupShape {
  id: string;
  title?: string | null;
  description?: string | null;
  selection_type?: string | null;
  max_selections?: number | null;
  pizza_pricing_mode?: "max" | "average" | null;
}

export function inferModifierGroupMode(
  group: ModifierGroupShape
): ModifierGroupMode {
  const explicit = String(group.selection_type || "").toLowerCase();
  if (
    explicit === "single" ||
    explicit === "multiple" ||
    explicit === "quantity" ||
    explicit === "pizza"
  ) {
    return explicit;
  }

  const maxSel = Number(group.max_selections) || 1;
  const text = `${group.title || ""} ${group.description || ""}`.toLowerCase();

  if (maxSel >= 2 && maxSel <= 4 && /\b(pizza|sabores?|metades?)\b/.test(text)) {
    return "pizza";
  }
  if (maxSel > 1 && /\b(qtd|quantidade|por[cç][aã]o|por[cç][oõ]es|unidades?|doses?)\b/.test(text)) {
    return "quantity";
  }
  return maxSel === 1 ? "single" : "multiple";
}

/**
 * Calcula o adicional em centavos por grupo respeitando:
 * - "pizza": cobra o maior valor entre os sabores escolhidos (ou média fracionada se configurada).
 * - "quantity": multiplica preço unitário pela quantidade escolhida no item.
 * - "single" / "multiple": soma simples dos deltas.
 */
export function calcModifiersTotalCents(
  groups: ModifierGroupShape[],
  selections: ModifierSelectionItem[]
): number {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const byGroup = new Map<string, ModifierSelectionItem[]>();

  for (const sel of selections) {
    const list = byGroup.get(sel.groupId) || [];
    list.push(sel);
    byGroup.set(sel.groupId, list);
  }

  let totalCents = 0;

  for (const [groupId, items] of byGroup.entries()) {
    const group = groupById.get(groupId);
    const mode = group ? inferModifierGroupMode(group) : "multiple";

    if (mode === "pizza" && items.length > 0) {
      const prices = items.map((it) => Math.max(0, Math.round(it.priceDeltaCents || 0)));
      if (group?.pizza_pricing_mode === "average") {
        const sum = prices.reduce((acc, p) => acc + p, 0);
        totalCents += Math.round(sum / prices.length);
      } else {
        totalCents += Math.max(...prices);
      }
      continue;
    }

    for (const item of items) {
      const qty = Math.max(1, Math.round(item.quantity || 1));
      totalCents += Math.max(0, Math.round(item.priceDeltaCents || 0)) * qty;
    }
  }

  return totalCents;
}
