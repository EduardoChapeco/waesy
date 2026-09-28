import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createReview } from "@/services/cms.functions";

export interface ReviewModalProps {
 productId: string;
 productName: string;
 orderId?: string;
 alreadyReviewed?: boolean;
 onReviewed?: () => void;
}

export function ReviewModal({
 productId,
 productName,
 orderId,
 alreadyReviewed = false,
 onReviewed,
}: ReviewModalProps) {
 const [open, setOpen] = useState(false);
 const [rating, setRating] = useState(5);
 const [comment, setComment] = useState("");
 const [loading, setLoading] = useState(false);
 const [isDone, setIsDone] = useState(alreadyReviewed);

 if (isDone) {
 return (
 <Badge
 variant="outline"
 className="mt-2 text-xs font-bold text-success border-success/30 bg-success/10 py-1 px-2.5 flex items-center gap-1 shrink-0"
 >
 <CheckCircle className="size-3.5" />
 <span>Avaliado</span>
 </Badge>
 );
 }

 const handleSubmit = async () => {
 if (rating === 0) {
 toast.error("Por favor, selecione uma nota de 1 a 5 estrelas.");
 return;
 }
 setLoading(true);
 try {
 await createReview({ data: { productId, orderId, rating, comment } });
 toast.success("Avaliação de compra enviada com sucesso!");
 setIsDone(true);
 setOpen(false);
 onReviewed?.();
 } catch (e) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao enviar avaliação.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 className="mt-2 text-xs h-7 font-bold tracking-wide hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
 >
 <Star className="size-3.5 mr-1 fill-amber-400 text-amber-500" />
 Avaliar Produto
 </Button>
 </DialogTrigger>
 <DialogContent className=" bg-background rounded-2xl sm:max-w-md">
 <DialogHeader>
 <div className="flex items-center gap-2 text-xs font-bold text-success mb-1">
 <ShieldCheck className="size-4" />
 <span>Compra Verificada</span>
 </div>
 <DialogTitle className="font-bold text-xl text-foreground">
 Avaliar {productName}
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-5 py-3">
 <div className="flex flex-col items-center gap-2 bg-muted/40 rounded-2xl p-4">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
 Sua Nota para este produto
 </span>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 type="button"
 onClick={() => setRating(star)}
 className="p-1 transition-transform hover:scale-115 cursor-pointer focus:outline-none"
 aria-label={`Nota ${star} estrelas`}
 >
 <Star
 className={`size-8 transition-colors ${
 star <= rating ? "fill-amber-400 text-amber-500" : "text-border"
 }`}
 />
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">
 Comentário da sua experiência (opcional)
 </label>
 <Textarea
 placeholder="Conte como foi a sua experiência com a qualidade, entrega e atendimento..."
 value={comment}
 onChange={(e) => setComment(e.target.value)}
 className=" bg-card rounded-xl focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground resize-none font-medium h-28 text-xs"
 />
 </div>

 <Button
 className="w-full bg-primary text-primary-foreground font-bold text-sm h-11 rounded-xl cursor-pointer"
 onClick={handleSubmit}
 disabled={loading}
 >
 {loading ? "Enviando..." : "Publicar Avaliação"}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
