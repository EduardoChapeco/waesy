import {
  SuitcaseRolling,
  AirplaneTilt,
  Bed,
  Sailboat,
  Car,
  ShieldCheck,
  Camera,
  Bus,
  Briefcase,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface CvcMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  iconName: string;
  badge?: string;
}

export const CANONICAL_CVC_MENU_ITEMS: CvcMenuItem[] = [
  {
    id: "pacotes",
    label: "Pacotes",
    subtitle: "Roteiros completos",
    iconName: "SuitcaseRolling",
    badge: "Mais Buscado",
  },
  {
    id: "aereos",
    label: "Passagens",
    subtitle: "Voos e GDS",
    iconName: "AirplaneTilt",
  },
  {
    id: "hospedagens",
    label: "Hotéis",
    subtitle: "Resorts e pousadas",
    iconName: "Bed",
  },
  {
    id: "cruzeiros",
    label: "Cruzeiros",
    subtitle: "Costa e MSC",
    iconName: "Sailboat",
  },
  {
    id: "aluguel",
    label: "Aluguel",
    subtitle: "Carros e frotas",
    iconName: "Car",
  },
  {
    id: "seguros",
    label: "Seguros",
    subtitle: "Proteção internacional",
    iconName: "ShieldCheck",
  },
  {
    id: "passeios",
    label: "Passeios",
    subtitle: "Experiências e tours",
    iconName: "Camera",
  },
  {
    id: "onibus",
    label: "Ônibus",
    subtitle: "Linhas rodoviárias",
    iconName: "Bus",
  },
  {
    id: "corporativo",
    label: "Corporativo",
    subtitle: "VOLL & Wooba B2B",
    iconName: "Briefcase",
    badge: "Empresas",
  },
];

interface CvcNavigationDockProps {
  items?: CvcMenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

const ICON_MAP: Record<string, { icon: PhosphorIcon; bg: string; text: string }> = {
  SuitcaseRolling: { icon: SuitcaseRolling, bg: "bg-amber-500/15", text: "text-amber-600" },
  AirplaneTilt: { icon: AirplaneTilt, bg: "bg-sky-500/15", text: "text-sky-600" },
  Bed: { icon: Bed, bg: "bg-rose-500/15", text: "text-rose-600" },
  Sailboat: { icon: Sailboat, bg: "bg-blue-500/15", text: "text-blue-600" },
  Car: { icon: Car, bg: "bg-violet-500/15", text: "text-violet-600" },
  ShieldCheck: { icon: ShieldCheck, bg: "bg-indigo-500/15", text: "text-indigo-600" },
  Camera: { icon: Camera, bg: "bg-teal-500/15", text: "text-teal-600" },
  Bus: { icon: Bus, bg: "bg-emerald-500/15", text: "text-emerald-600" },
  Briefcase: { icon: Briefcase, bg: "bg-orange-500/15", text: "text-orange-600" },
};

export function CvcNavigationDock({
  items = CANONICAL_CVC_MENU_ITEMS,
  activeId,
  onSelect,
  className,
}: CvcNavigationDockProps) {
  const menuList = items && items.length > 0 ? items : CANONICAL_CVC_MENU_ITEMS;

  return (
    <nav
      aria-label="Canais de Viagem e Turismo (CVC & Decolar)"
      className={cn("w-full py-1", className)}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory">
        {menuList.map((item) => {
          const isActive = activeId === item.id;
          const conf = ICON_MAP[item.iconName] || ICON_MAP.SuitcaseRolling;
          const IconComp = conf.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "relative group flex flex-col items-center justify-between p-2.5 rounded-2xl border text-center transition-all cursor-pointer select-none snap-start shrink-0 min-w-20 sm:min-w-24 h-24 sm:h-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-foreground text-background border-foreground shadow-sm scale-102"
                  : "bg-card text-foreground border-border/70 hover:border-foreground/30 hover:bg-muted/40"
              )}
            >
              {/* Badge de Destaque Opcional */}
              {item.badge && (
                <span
                  className={cn(
                    "absolute -top-1.5 px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider shadow-2xs whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-amber-500 text-white"
                  )}
                >
                  {item.badge}
                </span>
              )}

              {/* Ícone Squircle com Fundo Específico */}
              <div
                className={cn(
                  "size-11 sm:size-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-108",
                  isActive ? "bg-background/20 text-background" : cn(conf.bg, conf.text)
                )}
              >
                <IconComp size={24} weight="bold" />
              </div>

              {/* Rótulo e Subtítulo */}
              <div className="min-w-0 w-full px-0.5 mt-1">
                <span className="text-xs font-bold block truncate leading-tight">
                  {item.label}
                </span>
                {item.subtitle && (
                  <span className="text-3xs opacity-70 block truncate leading-tight mt-0.5 hidden sm:block">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
