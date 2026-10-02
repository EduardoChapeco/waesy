import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CREATOR_NICHE_GROUPS, getCreatorNicheLabel } from "@/lib/constants/creator-niches";
import { cn } from "@/lib/utils";

interface CreatorNicheSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CreatorNicheSelect({
  value,
  onValueChange,
  className,
  placeholder = "Selecione o nicho principal...",
  disabled = false,
}: CreatorNicheSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-11 rounded-lg text-xs bg-background", className)}>
        <SelectValue placeholder={placeholder}>
          {value ? getCreatorNicheLabel(value) : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 rounded-lg p-1 shadow-lg">
        {CREATOR_NICHE_GROUPS.map((group) => (
          <SelectGroup key={group.name} className="py-1">
            <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 bg-muted/30 rounded-md">
              {group.name}
            </SelectLabel>
            {group.niches.map((niche) => (
              <SelectItem
                key={niche.id}
                value={niche.id}
                className="text-xs py-2 px-3 rounded-lg cursor-pointer my-1"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{niche.label}</span>
                  {niche.description && (
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {niche.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
