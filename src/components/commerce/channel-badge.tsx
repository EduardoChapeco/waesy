import React from "react";

export type ChannelSource =
  | "mercadolivre"
  | "mercado_livre"
  | "ifood"
  | "shopee"
  | "amazon"
  | "magalu"
  | "magazine_luiza"
  | "99food"
  | "amodelivery"
  | "amo_delivery"
  | "classifieds"
  | "classificados"
  | "online_store"
  | "store"
  | "vitrine"
  | "pos"
  | "pdv"
  | "balcao"
  | "manual"
  | string;

export interface ChannelInfo {
  id: string;
  label: string;
  badgeClass: string;
}

export function getChannelInfo(source?: string | null): ChannelInfo {
  const norm = (source || "").toLowerCase().replace(/[\s-]/g, "_");

  if (norm.includes("mercadolivre") || norm.includes("mercado_livre") || norm === "ml") {
    return {
      id: "mercadolivre",
      label: "Mercado Livre",
      badgeClass: "text-amber-600 dark:text-amber-400",
    };
  }
  if (norm.includes("ifood")) {
    return {
      id: "ifood",
      label: "iFood",
      badgeClass: "text-red-600 dark:text-red-400",
    };
  }
  if (norm.includes("shopee")) {
    return {
      id: "shopee",
      label: "Shopee",
      badgeClass: "text-orange-600 dark:text-orange-400",
    };
  }
  if (norm.includes("amazon")) {
    return {
      id: "amazon",
      label: "Amazon",
      badgeClass: "text-neutral-700 dark:text-neutral-300",
    };
  }
  if (norm.includes("magalu") || norm.includes("magazine_luiza")) {
    return {
      id: "magalu",
      label: "Magalu",
      badgeClass: "text-blue-600 dark:text-blue-400",
    };
  }
  if (norm.includes("99food")) {
    return {
      id: "99food",
      label: "99Food",
      badgeClass: "text-yellow-600 dark:text-yellow-400",
    };
  }
  if (norm.includes("amodelivery") || norm.includes("amo_delivery")) {
    return {
      id: "amodelivery",
      label: "Amo Delivery",
      badgeClass: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (norm.includes("classificados") || norm.includes("classifieds")) {
    return {
      id: "classifieds",
      label: "Classificados",
      badgeClass: "text-sky-600 dark:text-sky-400",
    };
  }
  if (
    norm.includes("online_store") ||
    norm.includes("store") ||
    norm.includes("vitrine") ||
    norm.includes("ecommerce")
  ) {
    return {
      id: "online_store",
      label: "Loja Online",
      badgeClass: "text-emerald-600 dark:text-emerald-400",
    };
  }

  return {
    id: "pos",
    label: "Balcão / PDV",
    badgeClass: "text-muted-foreground",
  };
}

export function ChannelBadge({
  source,
  className = "",
}: {
  source?: string | null;
  className?: string;
}) {
  const info = getChannelInfo(source);

  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-wider ${info.badgeClass} ${className}`}
    >
      {info.label}
    </span>
  );
}
