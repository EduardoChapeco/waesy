import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classifiedSchema, type Classified } from "@/types/community";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Surface } from "@/components/ui/surface";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/money";

const formSchema = classifiedSchema.pick({
 title: true,
 content: true,
 category: true,
 price_cents: true,
 status: true,
});

type FormValues = z.infer<typeof formSchema>;

interface ClassifiedFormProps {
 defaultValues?: Partial<Classified>;
 onSubmit: (values: FormValues) => Promise<void>;
 isSubmitting?: boolean;
}

export function ClassifiedForm({ defaultValues, onSubmit, isSubmitting }: ClassifiedFormProps) {
 const form = useForm<FormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 title: defaultValues?.title || "",
 content: defaultValues?.content || "",
 category: defaultValues?.category || "service",
 price_cents: defaultValues?.price_cents || undefined,
 status: defaultValues?.status || "active",
 },
 });

 return (
 <div className=" bg-card rounded-xl p-8">
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="title"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-foreground">Título do Anúncio</FormLabel>
 <FormControl>
 <Input
 placeholder="Ex: Aulas de Guitarra"
 className=" rounded-none focus-visible:ring-0"
 {...field}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="category"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-foreground">Categoria</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger className=" rounded-none">
 <SelectValue placeholder="Selecione uma categoria" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 <SelectItem value="job">Vaga / Emprego</SelectItem>
 <SelectItem value="sale">Venda</SelectItem>
 <SelectItem value="trade">Troca / Escambo</SelectItem>
 <SelectItem value="service">Serviço</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <FormField
 control={form.control}
 name="content"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-foreground">Descrição</FormLabel>
 <FormControl>
 <Textarea
 placeholder="Descreva o que você está anunciando..."
 className="min-h-[150px] rounded-none focus-visible:ring-0"
 {...field}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="price_cents"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-foreground">Preço (Opcional)</FormLabel>
 <FormControl>
 <div className="relative">
 <span className="absolute left-3 top-2.5 font-mono text-foreground/50">
 R$
 </span>
 <Input
 type="number"
 step="0.01"
 className="pl-9 rounded-none focus-visible:ring-0"
 placeholder="0,00"
 value={field.value ? (field.value / 100).toFixed(2) : ""}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 field.onChange(isNaN(val) ? undefined : Math.round(val * 100));
 }}
 />
 </div>
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="status"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-foreground">Status</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger className=" rounded-none">
 <SelectValue placeholder="Selecione o status" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 <SelectItem value="active">Ativo (Público)</SelectItem>
 <SelectItem value="resolved">Resolvido / Fechado</SelectItem>
 <SelectItem value="expired">Expirado</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <div className="flex justify-end pt-4 border-t-2 border-border/10">
 <Button
 type="submit"
 className="bg-primary text-foreground font-bold px-8"
 disabled={isSubmitting}
 >
 {isSubmitting ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Salvando...
 </>
 ) : (
 "Salvar Classificado"
 )}
 </Button>
 </div>
 </form>
 </Form>
 </div>
 );
}
