import { Link } from "@tanstack/react-router";
import { PlusCircle, Calendar, Tag, Package, PenTool, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { getIdentity } from "@/services/identity.functions";

export function PublishSheet() {
 const { data: identity } = useQuery({
 queryKey: ["identity"],
 queryFn: () => getIdentity(),
 });

 const hasBusiness = identity && identity.memberships && identity.memberships.length > 0;

 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="default"
 className="bg-foreground text-background font-semibold hover:opacity-90 w-full text-xs h-11 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
 >
 <PlusCircle className="size-4" />
 PUBLICAR
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-64 p-2 bg-background border-border">
 <DropdownMenuLabel className="font-mono text-xs uppercase text-muted-foreground font-bold tracking-wider">
 O que você vai postar?
 </DropdownMenuLabel>
 <DropdownMenuSeparator />

 {/* Funcionalidade livre para todos */}
 <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-lg">
 <Link to="/conta/classificados/novo">
 <Tag className="size-4 mr-3 text-primary" />
 <div>
 <p className="font-bold text-sm">Novo Classificado</p>
 <p className="text-[11px] text-muted-foreground mt-1">
 Anuncie desapego, serviço ou vaga
 </p>
 </div>
 </Link>
 </DropdownMenuItem>

 <DropdownMenuSeparator className="my-1 border-border" />
 <DropdownMenuLabel className="text-[11px] uppercase text-primary font-bold tracking-wider pt-2">
 Ferramentas de Negócios
 </DropdownMenuLabel>

 <DropdownMenuItem
 asChild
 disabled={!hasBusiness}
 className="p-3 cursor-pointer rounded-lg focus:bg-muted"
 >
 {hasBusiness ? (
 <Link to="/workspace/catalogo/produtos/novo">
 <Package className="size-4 mr-3 text-primary" />
 <div>
 <p className="font-bold text-sm">Mercadoria / Produto</p>
 <p className="text-[11px] text-muted-foreground mt-1">
 Cadastrar no catálogo da loja
 </p>
 </div>
 </Link>
 ) : (
 <div className="opacity-50">
 <Package className="size-4 mr-3 text-muted-foreground" />
 <div>
 <p className="font-bold text-sm">Mercadoria / Produto</p>
 <p className="text-[11px] text-muted-foreground mt-1">Requer uma loja ativa</p>
 </div>
 </div>
 )}
 </DropdownMenuItem>

 <DropdownMenuItem
 asChild
 disabled={!hasBusiness}
 className="p-3 cursor-pointer rounded-lg focus:bg-muted"
 >
 {hasBusiness ? (
 <Link to="/workspace/agenda">
 <Calendar className="size-4 mr-3 text-primary" />
 <div>
 <p className="font-bold text-sm">Evento ou Festa</p>
 <p className="text-[11px] text-muted-foreground mt-1">
 Criar lotes e vender ingressos
 </p>
 </div>
 </Link>
 ) : (
 <div className="opacity-50">
 <Calendar className="size-4 mr-3 text-muted-foreground" />
 <div>
 <p className="font-bold text-sm">Evento ou Festa</p>
 <p className="text-[11px] text-muted-foreground mt-1">Requer um coletivo</p>
 </div>
 </div>
 )}
 </DropdownMenuItem>

 {!hasBusiness && (
 <div className="p-3 mt-2 bg-primary/5 border border-primary/20 rounded-lg">
 <Button
 variant="default"
 size="sm"
 asChild
 className="w-full text-xs font-bold rounded-lg "
 >
 <Link to="/criar-negocio">Cadastrar Minha Loja</Link>
 </Button>
 </div>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 );
}
