import React from "react";
import { Link } from "@tanstack/react-router";

interface HitsLeadCardProps {
 actionTo: string;
 coverImage?: string;
 gradient?: string;
 ariaLabel?: string;
}

/**
 * HitsLeadCard — Card Líder de Seção 100% Limpo
 * Projetado para exibir banners verticais ou artes limpas cadastradas no admin.
 * Sem textos estáticos ou tags poluindo a arte.
 */
export function HitsLeadCard({
 actionTo,
 coverImage,
 gradient = "from-amber-500 via-orange-500 to-red-600",
 ariaLabel = "Destaque da Seção",
}: HitsLeadCardProps) {
 return (
 <Link
 to={actionTo as any}
 aria-label={ariaLabel}
 className="group relative overflow-hidden rounded-lg bg-card w-[150px] sm:w-[170px] h-[145px] sm:h-[155px] transition-transform duration-200 active:scale-[0.98] select-none block shrink-0 snap-start"
 >
 {coverImage ? (
 <img
 src={coverImage}
 alt={ariaLabel}
 className="size-full object-cover group-hover:scale-103 transition-transform duration-500"
 loading="lazy"
 />
 ) : (
 <div className={`size-full bg-linear-to-br ${gradient} flex items-center justify-center`}>
 <div className="size-16 rounded-lg bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
 <span className="text-white font-black text-xl font-mono">#1</span>
 </div>
 </div>
 )}
 </Link>
 );
}
