/**
 * @fileoverview Tipos canônicos para Digital Companion Card e OCR Multimodal (Waesy BigTech).
 */

export type CompanionCardNiche =
  | "tourism"
  | "real_estate"
  | "service"
  | "auto"
  | "retail"
  | "health";

export interface CompanionDetailItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface CompanionCardSectionItem {
  id?: string;
  type: "flight" | "hotel" | "transport" | "tour" | "insurance" | "service_item" | "custom";
  badge?: string;
  title: string;
  subtitle?: string;
  details: CompanionDetailItem[];
}

export interface CompanionRuleItem {
  title: string;
  description: string;
  badge?: string;
  highlight?: boolean;
}

export interface CompanionContactItem {
  name: string;
  category: string;
  phone: string;
  whatsapp?: boolean;
  is24h?: boolean;
}
