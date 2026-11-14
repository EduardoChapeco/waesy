import * as React from "react";
import { cn } from "@/lib/utils";
import { MapPin, Phone, MessageCircle, Mail, Globe, ExternalLink, Navigation } from "lucide-react";

type ActionType = "whatsapp" | "phone" | "email" | "maps" | "website" | "catalog" | "custom";

interface ActionButton {
 id: string;
 label: string;
 url: string;
 icon: ActionType;
}

interface StoreContactData {
 name?: string;
 phone?: string;
 whatsapp?: string;
 email?: string;
 address?: string;
 city?: string;
 state?: string;
 latitude?: string;
 longitude?: string;
 website?: string;
 action_buttons?: ActionButton[];
}

interface StoreContactProps {
 // Flat content fields (spread by ExperienceRenderer from node.content)
 title?: string;
 show_map_link?: boolean;
 show_address?: boolean;
 show_phone?: boolean;
 show_whatsapp?: boolean;
 show_email?: boolean;
 show_action_buttons?: boolean;
 design_tokens?: {
 backgroundColor?: string;
 textColor?: string;
 className?: string;
 };
 // Canonical: storeData injected by ExperienceRenderer
 storeData?: StoreContactData;
 // Legacy compat
 transient_data?: {
 store_contact?: StoreContactData;
 };
}

const ICON_MAP: Record<ActionType, React.FC<{ className?: string }>> = {
 whatsapp: MessageCircle,
 phone: Phone,
 email: Mail,
 maps: Navigation,
 website: Globe,
 catalog: ExternalLink,
 custom: ExternalLink,
};

export function StoreContact({
 title,
 show_map_link,
 show_address,
 show_phone,
 show_whatsapp,
 show_email,
 show_action_buttons,
 design_tokens,
 storeData,
 transient_data,
}: StoreContactProps) {
 const store = storeData ?? transient_data?.store_contact;
 const resolvedTitle = title ?? "Fale Conosco";
 const showMapLink = show_map_link !== false;
 const showAddress = show_address !== false;
 const showPhone = show_phone !== false;
 const showWhatsapp = show_whatsapp !== false;
 const showEmail = show_email !== false;
 const showActionButtons = show_action_buttons !== false;

 if (!store) {
 return (
 <div className="w-full py-10 px-4 text-center text-muted-foreground text-sm">
 <MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />
 Contato não configurado
 </div>
 );
 }

 const mapsUrl =
 store.latitude && store.longitude
 ? `https://www.google.com/maps?q=${store.latitude},${store.longitude}`
 : store.address
 ? `https://www.google.com/maps/search/${encodeURIComponent(`${store.address} ${store.city ?? ""} ${store.state ?? ""}`)}`
 : null;

 const whatsappUrl = store.whatsapp
 ? `https://wa.me/${store.whatsapp.replace(/\D/g, "")}`
 : store.phone
 ? `https://wa.me/${store.phone.replace(/\D/g, "")}`
 : null;

 const contactItems: {
 show: boolean;
 icon: React.FC<{ className?: string }>;
 label: string;
 value: string;
 href: string;
 }[] = [
 {
 show: !!(showWhatsapp && (store.whatsapp || store.phone) && whatsappUrl),
 icon: MessageCircle,
 label: "WhatsApp",
 value: store.whatsapp || store.phone || "",
 href: whatsappUrl || "#",
 },
 {
 show: !!(showPhone && store.phone),
 icon: Phone,
 label: "Telefone",
 value: store.phone || "",
 href: `tel:${(store.phone || "").replace(/\D/g, "")}`,
 },
 {
 show: !!(showEmail && store.email),
 icon: Mail,
 label: "E-mail",
 value: store.email || "",
 href: `mailto:${store.email}`,
 },
 {
 show: !!(showAddress && store.address),
 icon: MapPin,
 label: "Endereço",
 value: [store.address, store.city, store.state].filter(Boolean).join(", "),
 href: showMapLink && mapsUrl ? mapsUrl : "#",
 },
 ].filter((item) => item.show);

 return (
 <div
 className={cn("w-full py-10 overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-xl px-4 @md:px-6">
 <h2 className="text-xl font-semibold mb-6">{title}</h2>

 {contactItems.length === 0 ? (
 <div className="py-6 text-center text-muted-foreground text-sm">
 Nenhum canal de contato disponível.
 </div>
 ) : (
 <div className="divide-y divide-border border overflow-hidden mb-6">
 {contactItems.map((item, i) => {
 const Icon = item.icon;
 const isLink = item.href !== "#";
 const Tag = isLink ? "a" : "div";
 return (
 <Tag
 key={i}
 {...(isLink
 ? {
 href: item.href,
 target: "_blank",
 rel: "noopener noreferrer",
 }
 : {})}
 className={cn(
 "flex items-center gap-4 px-4 py-3 text-sm",
 isLink && "hover:bg-muted/50 transition-colors cursor-pointer",
 )}
 >
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
 <Icon className="h-4 w-4" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
 {item.label}
 </p>
 <p className="font-medium truncate">{item.value}</p>
 </div>
 {isLink && (
 <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
 )}
 </Tag>
 );
 })}
 </div>
 )}

 {showActionButtons && store.action_buttons && store.action_buttons.length > 0 && (
 <div className="flex flex-wrap gap-2">
 {store.action_buttons.map((btn) => {
 const Icon = ICON_MAP[btn.icon] ?? ExternalLink;
 return (
 <a
 key={btn.id}
 href={btn.url}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-2 px-4 py-2 rounded-full bg-background hover:bg-muted transition-colors text-sm font-medium"
 >
 <Icon className="h-4 w-4 text-primary" />
 {btn.label}
 </a>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}
