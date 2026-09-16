import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";

export const SMALL_INPUT =
  "w-full h-11 sm:h-9 px-3.5 rounded-xl border border-border/60 bg-background text-sm sm:text-xs font-medium outline-none transition-all hover:bg-muted/30 focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export function replaceAt<T>(arr: T[], i: number, item: T): T[] {
  const c = arr.slice();
  c[i] = item;
  return c;
}

export function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-4 overflow-hidden rounded-[var(--radius-card)] bg-surface  ring-1 ring-border/50 transition-all">
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left ds-label-caps text-muted-foreground hover:bg-surface-alt/50 transition-colors shadow-none min-h-[44px]"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
      {open && <div className="border-t border-border/50 p-4">{children}</div>}
    </div>
  );
}

export function NumField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="block">
      <span className="mb-1 block ds-meta uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        min={0}
        className={SMALL_INPUT}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onSave(parseInt(v) || 0)}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <label className="block">
      <span className="mb-1 block ds-meta uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Input
        type={type}
        className={SMALL_INPUT}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onSave(v)}
      />
    </label>
  );
}

export function Inp({
  value,
  onChange,
  ph,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  ph?: string;
  type?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <Input
      type={type}
      placeholder={ph}
      className={SMALL_INPUT}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onChange(v)}
    />
  );
}

export function Sel({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <Select className={SMALL_INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  );
}

export function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block ds-meta uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Card({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative mb-3 rounded-[var(--radius-card)] border border-border/60 bg-surface-alt/20 p-4">
      <Button
        variant="ghost"
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 size-10 sm:size-8 rounded-xl p-1 text-muted-foreground hover:bg-surface hover:text-danger transition-colors shadow-none cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {children}
    </div>
  );
}

import { uploadMediaUniversal } from "@/services/storage.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";

export function FileUploadList({
  agencyId,
  images,
  onChange,
}: {
  agencyId: string;
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await uploadMediaUniversal({
          data: {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            base64Data: base64,
            bucket: "public_media",
            folder: `proposals/${agencyId || "general"}`,
          },
        });
        if (res?.url) urls.push(res.url);
      }
      onChange([...images, ...urls]);
      toast.success("Arquivos enviados com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="mt-2">
      <div className="mb-1 flex flex-wrap gap-1">
        {images.map((u, i) => (
          <div key={i} className="relative">
            <img src={u} alt="" className="h-12 w-12 rounded object-cover" />
            <Button
              type="button"
              onClick={() => onChange(images.filter((_, x) => x !== i))}
              className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 ds-meta text-destructive-foreground hover:bg-destructive/80 transition-colors"
            >
              ×
            </Button>
          </div>
        ))}
      </div>
      <label className="ds-meta text-primary hover:underline cursor-pointer">
        {uploading ? "Enviando…" : "+ adicionar imagens"}
        <Input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </label>
    </div>
  );
}

export function PhotoUpload({
  url,
  onUpload,
  prompt,
}: {
  url?: string;
  onUpload: (u: string) => void;
  prompt?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || !files[0]) return;
    setLoading(true);
    try {
      const file = files[0];
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadMediaUniversal({
        data: {
          fileName: file.name,
          fileType: file.type || "image/jpeg",
          base64Data: base64,
          bucket: "public_media",
          folder: "proposals/covers",
        },
      });
      if (res?.url) {
        onUpload(res.url);
      }
    } catch {
      toast.error("Falha ao enviar imagem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {url && (
        <img
          src={url}
          alt={prompt || "Foto"}
          className="h-14 w-20 rounded object-cover ring-1 ring-border/50"
        />
      )}
      <label className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-border/60 bg-surface px-4 h-11 sm:h-8 text-xs font-semibold hover:bg-surface-alt transition-colors">
        {loading ? "Enviando…" : url ? "Trocar foto" : "Adicionar foto"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </label>
    </div>
  );
}

export function AddBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={onClick}
      className="flex h-11 sm:h-8 items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-4 text-xs font-semibold hover:bg-surface-alt transition-colors shadow-none cursor-pointer"
    >
      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      {children}
    </Button>
  );
}

export function TagsEditor({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState("");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {tags.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded bg-surface-alt px-2 py-0.5 ds-meta"
          >
            {t}
            <Button
              variant="ghost"
              type="button"
              onClick={() => onChange(tags.filter((_, x) => x !== i))}
              className="text-muted-foreground hover:text-danger shadow-none p-0.5"
            >
              ×
            </Button>
          </span>
        ))}
      </div>
      <Input
        className={SMALL_INPUT}
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            e.preventDefault();
            onChange([...tags, v.trim()]);
            setV("");
          }
        }}
      />
    </div>
  );
}
