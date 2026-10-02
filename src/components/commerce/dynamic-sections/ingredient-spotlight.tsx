import React from "react";
import { Layers, ShieldCheck } from 'lucide-react';

interface IngredientItem {
 title: string;
 benefit: string;
 description: string;
 image_url?: string;
}

interface IngredientSpotlightProps {
 title?: string;
 subtitle?: string;
 items?: IngredientItem[];
}

export function IngredientSpotlight({
 title = "Tecnologia & Ingredientes",
 subtitle = "Fórmulas puras e matérias-primas rigorosamente selecionadas",
 items = [],
}: IngredientSpotlightProps) {
 return (
 <section className="w-full py-12 px-4 md:px-8 max-w-7xl mx-auto bg-muted/40 my-8 ">
 {(title || subtitle) && (
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
 <Layers className="w-3.5 h-3.5" />
 Qualidade Garantida
 </div>
 {title && (
 <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
 {title}
 </h2>
 )}
 {subtitle && (
 <p className="text-muted-foreground text-base max-w-2xl mx-auto">{subtitle}</p>
 )}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {items.map((item, idx) => (
 <div key={idx} className="flex gap-4 p-6 bg-card items-start">
 {item.image_url ? (
 <img
 src={item.image_url}
 alt={item.title}
 className="w-16 h-16 object-cover flex-shrink-0 bg-muted"
 />
 ) : (
 <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
 <ShieldCheck className="w-6 h-6" />
 </div>
 )}
 <div>
 <h3 className="text-lg font-bold text-foreground mb-1">{item.title}</h3>
 <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
 {item.benefit}
 </span>
 <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
 </div>
 </div>
 ))}
 </div>
 </section>
 );
}
