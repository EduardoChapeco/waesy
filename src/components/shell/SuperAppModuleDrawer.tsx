/**
 * ============================================================================
 * Waesy Platform — SuperAppModuleDrawer (Apple HIG & Paridade iFood Lateral Push)
 * ============================================================================
 * Menu lateral mobile do SuperApp estilo iFood e Threads com empurrão de página,
 * alternância Grade Squircle vs Lista, seções semânticas e sincronização bilateral
 * via listDrawerModules() do Admin Master.
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { VitrineLateralMenuSheet } from "@/design-system/vitrine/vitrine-lateral-sheet";
import { listDrawerModules, CANONICAL_DRAWER_MODULES, type HotpageDTO } from "@/services/hotpage.functions";
import { DEFAULT_BRAND_NAME } from "@/lib/brand";

export interface SuperAppModuleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: any;
  userRole?: string | null;
  activeCity?: string;
  brandName?: string;
}

export function SuperAppModuleDrawer({
  open,
  onOpenChange,
  session,
  userRole,
  activeCity,
  brandName,
}: SuperAppModuleDrawerProps) {
  const navigate = useNavigate();
  const [modules, setModules] = useState<HotpageDTO[]>(CANONICAL_DRAWER_MODULES as any);

  const isAdmin =
    userRole === "platform_admin" ||
    session?.role === "platform_admin" ||
    session?.user?.app_metadata?.role === "platform_admin";

  // Carrega módulos do Admin Master de forma bilateral
  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    listDrawerModules({ data: { city: activeCity } } as any)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setModules(data);
        }
      })
      .catch(() => {
        if (isMounted) setModules(CANONICAL_DRAWER_MODULES as any);
      });

    return () => {
      isMounted = false;
    };
  }, [open, activeCity]);

  const handleNavigate = (route: string) => {
    onOpenChange(false);
    navigate({ to: route as any });
  };

  const displayName = brandName || DEFAULT_BRAND_NAME;

  return (
    <VitrineLateralMenuSheet
      open={open}
      onClose={() => onOpenChange(false)}
      greetingTitle={`Aproveite o ${displayName}!`}
      greetingSubtitle="SuperApp de comércio, mobilidade e serviços locais"
      showViewModeToggle={true}
      defaultViewMode="grid"
      items={modules as any}
      session={session}
      userRole={userRole}
      isAdmin={isAdmin}
      onItemClick={handleNavigate}
      activeCity={activeCity}
    />
  );
}
