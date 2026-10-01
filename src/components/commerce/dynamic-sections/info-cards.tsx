import { Truck, RotateCcw, Shield, CreditCard, Tag, Star, HelpCircle } from "lucide-react";

interface InfoCardsProps {
 content: {
 cards?: Array<{
 icon?: "truck" | "rotate-ccw" | "shield" | "credit-card" | "tag" | "star";
 title: string;
 description?: string;
 }>;
 };
}

const ICON_MAP = {
 truck: Truck,
 "rotate-ccw": RotateCcw,
 shield: Shield,
 "credit-card": CreditCard,
 tag: Tag,
 star: Star,
};

export function InfoCards({ content }: InfoCardsProps) {
 const cards = content.cards || [];

 return (
 <section className="w-full max-w-7xl mx-auto px-4 py-8">
 {cards.length === 0 ? (
 <div className="p-8 text-center text-xs text-muted-foreground border border-dashed">
 Nenhum cartão de informação cadastrado.
 </div>
 ) : (
 <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-6">
 {cards.map((card, idx) => {
 const IconComponent = card.icon ? ICON_MAP[card.icon] : HelpCircle;

 return (
 <div
 key={idx}
 className="flex items-start gap-4 p-5 bg-card transition-all duration-300 hover: hover:border-primary/20"
 >
 <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
 {IconComponent && <IconComponent className="size-5" />}
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground leading-none line-clamp-1">{card.title}</h3>
 {card.description && (
 <p className="text-xs text-muted-foreground leading-relaxed">
 {card.description}
 </p>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </section>
 );
}
