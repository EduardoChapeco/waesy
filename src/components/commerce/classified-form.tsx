import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classifiedSchema, CLASSIFIED_CATEGORY_LABELS, type Classified } from "@/types/community";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { CurrencyField } from "@/components/ui/currency-field";
import { PhoneField } from "@/components/ui/phone-field";
import { AddressField } from "@/components/ui/address-field";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaUploader, MediaData } from "@/components/ui/media-uploader";

const formSchema = classifiedSchema.pick({
 title: true,
 content: true,
 category: true,
 price_cents: true,
 status: true,
 contact_whatsapp: true,
 location_text: true,
 condition: true,
 negotiable: true,
 images: true,
});

type FormValues = z.infer<typeof formSchema>;

interface ClassifiedFormProps {
 defaultValues?: Partial<Classified>;
 onSubmit: (values: FormValues) => Promise<void>;
 isSubmitting?: boolean;
}

export function ClassifiedForm({ defaultValues, onSubmit, isSubmitting }: ClassifiedFormProps) {
 const form = useForm<FormValues>({
 resolver: zodResolver(formSchema as any),
 defaultValues: {
 title: defaultValues?.title || "",
 content: defaultValues?.content || "",
 category: defaultValues?.category || "service",
 price_cents: defaultValues?.price_cents || undefined,
 status: defaultValues?.status || "active",
 contact_whatsapp: defaultValues?.contact_whatsapp || "",
 location_text: defaultValues?.location_text || "",
 condition: defaultValues?.condition || undefined,
 negotiable: defaultValues?.negotiable ?? true,
 images: defaultValues?.images || [],
 },
 });

 return (
 <div className="bg-background rounded-lg p-6 md:p-8">
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
 {/* Informações Principais */}
 <div className="space-y-4">
 <h2 className="text-lg font-semibold tracking-tight">Informações Principais</h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="title"
 render={({ field }) => (
 <FormItem>
 <FormLabel>Título do Anúncio</FormLabel>
 <FormControl>
 <Input placeholder="Ex: Aulas de Guitarra ou Bicicleta Aro 29" {...field} />
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
 <FormLabel>Categoria</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="Selecione uma categoria" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 {Object.entries(CLASSIFIED_CATEGORY_LABELS).map(([val, label]) => (
 <SelectItem key={val} value={val}>
 {label}
 </SelectItem>
 ))}
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
 <FormLabel>Descrição</FormLabel>
 <FormControl>
 <Textarea
 placeholder="Descreva o que você está anunciando em detalhes..."
 className="min-h-[120px]"
 {...field}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <hr className="border-border" />

 {/* Fotos e Mídia */}
 <div className="space-y-4">
 <h2 className="text-lg font-semibold tracking-tight">Fotos</h2>
 <FormField
 control={form.control}
 name="images"
 render={({ field }) => {
 // Converte urls simples do form state para o formato do MediaUploader
 const mediaValues: MediaData[] = (field.value || []).map((url, i) => ({
 id: String(i),
 url,
 path: url.split("/").pop() || "",
 type: "image",
 }));

 return (
 <FormItem>
 <FormControl>
 <MediaUploader
 value={mediaValues}
 onChange={(val: any) => {
 field.onChange(val.map((m: any) => (typeof m === "string" ? m : m.url)));
 }}
 maxFiles={5}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 );
 }}
 />
 </div>

 <hr className="border-border" />

 {/* Preço e Condição */}
 <div className="space-y-4">
 <h2 className="text-lg font-semibold tracking-tight">Preço e Condição</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="price_cents"
 render={({ field }) => (
 <FormItem>
 <FormLabel>Preço (Opcional)</FormLabel>
 <FormControl>
 <CurrencyField
 value={field.value ?? undefined}
 onChange={field.onChange}
 placeholder="0,00"
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="condition"
 render={({ field }) => (
 <FormItem>
 <FormLabel>Condição</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="Não se aplica" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 <SelectItem value="new">Novo</SelectItem>
 <SelectItem value="used_like_new">Usado - Como Novo</SelectItem>
 <SelectItem value="used_good">Usado - Em bom estado</SelectItem>
 <SelectItem value="used_fair">Usado - Aceitável</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <FormField
 control={form.control}
 name="negotiable"
 render={({ field }) => (
 <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg p-4 bg-muted/50 ">
 <FormControl>
 <Checkbox checked={field.value} onCheckedChange={field.onChange} />
 </FormControl>
 <div className="space-y-1 leading-none">
 <FormLabel>Preço negociável</FormLabel>
 <p className="text-sm text-muted-foreground">
 Permitir que os interessados enviem propostas diferentes do valor anunciado.
 </p>
 </div>
 </FormItem>
 )}
 />
 </div>

 <hr className="border-border" />

 {/* Contato e Localização */}
 <div className="space-y-4">
 <h2 className="text-lg font-semibold tracking-tight">Contato e Local</h2>

 <FormField
 control={form.control}
 name="contact_whatsapp"
 render={({ field }) => (
 <FormItem>
 <FormLabel>WhatsApp para Contato (Opcional)</FormLabel>
 <FormControl>
 <PhoneField value={field.value || undefined} onChange={field.onChange} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="location_text"
 render={({ field }) => (
 <FormItem>
 <FormLabel>Localização Aproximada</FormLabel>
 <FormControl>
 <AddressField
 value={{ text: field.value || "" }}
 onChange={(val) => field.onChange(val.text)}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 {/* Ações */}
 <div className="pt-4 flex items-center justify-end gap-4">
 <Button type="button" variant="ghost">
 Cancelar
 </Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? "Salvando..." : "Publicar Anúncio"}
 </Button>
 </div>
 </form>
 </Form>
 </div>
 );
}
