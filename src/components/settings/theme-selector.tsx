import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeSelector({ className }: { className?: string }) {
 const { theme, setTheme } = useTheme();

 const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
 { mode: "system", label: "Automático (Sistema)", icon: Monitor },
 { mode: "light", label: "Claro", icon: Sun },
 { mode: "dark", label: "Escuro", icon: Moon },
 ];

 return (
 <div className={cn("space-y-2", className)}>
 <div className="flex flex-col sm:flex-row gap-2">
 {options.map((opt) => {
 const Icon = opt.icon;
 const isSelected = theme === opt.mode;

 return (
 <button
 key={opt.mode}
 type="button"
 onClick={() => setTheme(opt.mode)}
 className={cn(
 "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-xs font-medium transition-all",
 isSelected
 ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
 : "bg-card hover:bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground"
 )}
 >
 <Icon className="size-3.5" />
 <span>{opt.label}</span>
 </button>
 );
 })}
 </div>
 <p className="text-[11px] text-muted-foreground">
 Por padrão, o tema se adapta automaticamente à preferência do seu dispositivo ou sistema operacional.
 </p>
 </div>
 );
}
