import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Star, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCourierBySlug } from "@/services/mobility.functions";

export const Route = createFileRoute("/_store/motorista/$slug")({
 head: ({ loaderData }: any) => ({
 meta: [
 {
 title: `${loaderData?.courier?.full_name || "Motorista Parceiro"} | Waesy`,
 },
 ],
 }),
 loader: async ({ params }) => {
   try {
 const courier = await getCourierBySlug({ data: { slug: params.slug } }).catch(() => null);
 return { courier, slug: params.slug };
   } catch (err) {
     console.error("[loader:_store.motorista.$slug] Unhandled error:", err);
     return { courier: null, slug: null };
   }
 },
 component: DriverDirectPage,
});

function DriverDirectPage() {
 const { courier } = ((Route.useLoaderData?.() as any) || {});

 if (!courier) {
 return (
 <div className="py-24 text-center space-y-4 max-w-md mx-auto">
 <Car className="size-10 text-muted-foreground/50 mx-auto" />
 <h1 className="text-base font-semibold text-foreground">Motorista não encontrado</h1>
 <p className="text-xs text-muted-foreground">O link do motorista é inválido ou foi desativado.</p>
 <Button asChild className="rounded-xl h-10 px-4 bg-foreground text-background">
 <Link to="/mobilidade">Voltar para Mobilidade</Link>
 </Button>
 </div>
 );
 }

 const phoneDigits = courier.phone ? courier.phone.replace(/\D/g, "") : "";

 return (
 <div className="w-full max-w-xl mx-auto space-y-6 pb-6">
 {/* Profile Card */}
 <div className="rounded-2xl bg-card p-6 text-center space-y-5">
 <div className="size-20 rounded-2xl mx-auto overflow-hidden bg-muted flex items-center justify-center font-bold text-xl text-foreground">
 {courier.avatar_url ? (
 <img
 src={courier.avatar_url}
 alt={courier.full_name}
 className="size-full object-cover"
 />
 ) : (
 courier.full_name.charAt(0)
 )}
 </div>

 <div className="space-y-1">
 <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
 <ShieldCheck className="size-4" />
 <span>Motorista Parceiro Verificado</span>
 </div>
 <h1 className="text-xl font-semibold text-foreground tracking-tight">
 {courier.full_name}
 </h1>
 <p className="text-xs text-muted-foreground">
 {courier.vehicle_model || courier.vehicle_type} • Placa {courier.vehicle_plate || "Verificada"}
 </p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 text-center">
 <div>
 <div className="flex items-center justify-center gap-1 font-semibold text-sm text-foreground">
 <Star className="size-3.5 fill-foreground text-foreground" />
 <span>{courier.rating.toFixed(1)}</span>
 </div>
 <span className="text-[10px] text-muted-foreground">Avaliação</span>
 </div>

 <div>
 <span className="font-semibold text-foreground text-sm">{courier.total_rides}</span>
 <p className="text-[10px] text-muted-foreground">Viagens</p>
 </div>

 <div>
 <Badge variant="secondary" className="text-[10px]">
 Disponível
 </Badge>
 <p className="text-[10px] text-muted-foreground mt-0.5">Status</p>
 </div>
 </div>

 {/* Actions */}
 <div className="space-y-2 pt-2">
 {phoneDigits && (
 <Button
 asChild
 className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity gap-2"
 >
 <a
 href={`https://wa.me/55${phoneDigits}?text=Ol%C3%A1%20${encodeURIComponent(courier.full_name)},%20encontrei%20seu%20perfil%20na%20JAH%20e%20gostaria%20de%20solicitar%20uma%20corrida/entrega!`}
 target="_blank"
 rel="noreferrer"
 >
 <Phone className="size-4" />
 <span>Chamar via WhatsApp</span>
 </a>
 </Button>
 )}

 <Button asChild variant="outline" className="w-full h-10 rounded-xl text-xs">
 <Link to="/mobilidade">Solicitar pelo App com Cálculo de Rota</Link>
 </Button>
 </div>
 </div>
 </div>
 );
}
