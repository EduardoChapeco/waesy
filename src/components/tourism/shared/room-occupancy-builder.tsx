import * as React from "react";
import { BedDouble, Minus, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  classifyChildAgeBand,
  type StructuredRoomOccupancy,
} from "@/lib/travel/opportunity-matching-engine";

interface RoomOccupancyBuilderProps {
  value: StructuredRoomOccupancy[];
  onChange: (nextRooms: StructuredRoomOccupancy[]) => void;
  label?: string;
  disabled?: boolean;
}

const AGE_OPTIONS = Array.from({ length: 18 }, (_, age) => {
  if (age === 0) return { value: "0", label: "Menor de 1 ano (Colo)" };
  if (age === 1) return { value: "1", label: "1 ano (Colo)" };
  if (age <= 11) return { value: String(age), label: `${age} anos (CHD Aéreo + Transfer)` };
  return { value: String(age), label: `${age} anos (Tarifa Adulto)` };
});

export function RoomOccupancyBuilder({
  value,
  onChange,
  label = "Quartos, hóspedes e idades das crianças (0–17 anos)",
  disabled = false,
}: RoomOccupancyBuilderProps) {
  const baseId = React.useId();
  const rooms = React.useMemo<StructuredRoomOccupancy[]>(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.map((r, i) => {
        const count = Math.max(0, Math.min(6, Number(r.childrenCount ?? (r.childrenAges?.length || 0))));
        const ages = Array.isArray(r.childrenAges) ? [...r.childrenAges.slice(0, count)] : [];
        while (ages.length < count) ages.push(6);
        return {
          ...r,
          roomNumber: r.roomNumber || i + 1,
          roomLabel: r.roomLabel || `Quarto ${i + 1}`,
          adultsCount: Math.max(1, Number(r.adultsCount || 2)),
          childrenCount: count,
          childrenAges: ages,
        };
      });
    }
    return [{ roomNumber: 1, roomLabel: "Quarto 1", adultsCount: 2, childrenCount: 0, childrenAges: [] }];
  }, [value]);

  const totalAdults = rooms.reduce((sum, r) => sum + (r.adultsCount || 1), 0);
  const allChildAges = rooms.flatMap((r) => r.childrenAges || []);

  const updateRoom = (index: number, patch: Partial<StructuredRoomOccupancy>) => {
    const next = rooms.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  const handleAddRoom = () => {
    if (rooms.length >= 6) return;
    const nextIndex = rooms.length + 1;
    onChange([
      ...rooms,
      {
        roomNumber: nextIndex,
        roomLabel: `Quarto ${nextIndex}`,
        adultsCount: 2,
        childrenCount: 0,
        childrenAges: [],
      },
    ]);
  };

  const handleRemoveRoom = (index: number) => {
    if (rooms.length <= 1) return;
    const filtered = rooms
      .filter((_, i) => i !== index)
      .map((r, i) => ({
        ...r,
        roomNumber: i + 1,
        roomLabel: `Quarto ${i + 1}`,
      }));
    onChange(filtered);
  };

  const handleChildrenCountChange = (roomIndex: number, nextCount: number) => {
    const clamped = Math.max(0, Math.min(6, nextCount));
    const currentRoom = rooms[roomIndex];
    const nextAges = [...(currentRoom.childrenAges || []).slice(0, clamped)];
    while (nextAges.length < clamped) {
      nextAges.push(6);
    }
    updateRoom(roomIndex, {
      childrenCount: clamped,
      childrenAges: nextAges,
    });
  };

  const handleChildAgeChange = (roomIndex: number, childIndex: number, age: number) => {
    const currentRoom = rooms[roomIndex];
    const nextAges = [...(currentRoom.childrenAges || [])];
    nextAges[childIndex] = Math.max(0, Math.min(17, age));
    updateRoom(roomIndex, {
      childrenCount: nextAges.length,
      childrenAges: nextAges,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <BedDouble className="size-3.5 text-primary" />
          <span>{label}</span>
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-medium tabular-nums">
            <Users className="size-3 mr-1" />
            {rooms.length} {rooms.length === 1 ? "qto" : "qtos"} · {totalAdults} adt
            {allChildAges.length > 0 ? ` · ${allChildAges.length} cri. (${allChildAges.join(", ")}a)` : ""}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || rooms.length >= 6}
            onClick={handleAddRoom}
            className="h-11 min-h-11 gap-2 px-3 text-xs font-medium"
          >
            <Plus className="size-3.5" />
            Quarto
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rooms.map((room, roomIdx) => (
          <div key={roomIdx} className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {room.roomLabel || `Quarto ${roomIdx + 1}`}
              </span>
              {rooms.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleRemoveRoom(roomIdx)}
                  aria-label={`Remover Quarto ${roomIdx + 1}`}
                  className="h-11 min-h-11 min-w-11 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3 shadow-2xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Adultos</span>
                    <Badge variant="outline" className="text-3xs font-mono font-semibold py-0 px-2 h-4 text-muted-foreground">
                      18+ anos
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground">Ocupantes principais</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || room.adultsCount <= 1}
                    aria-label="Diminuir adultos"
                    onClick={() => updateRoom(roomIdx, { adultsCount: Math.max(1, room.adultsCount - 1) })}
                    className="size-11 min-h-11 min-w-11 rounded-lg p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
                    {room.adultsCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || room.adultsCount >= 10}
                    aria-label="Aumentar adultos"
                    onClick={() => updateRoom(roomIdx, { adultsCount: Math.min(10, room.adultsCount + 1) })}
                    className="size-11 min-h-11 min-w-11 rounded-lg p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3 shadow-2xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Crianças</span>
                    <Badge variant="outline" className="text-3xs font-mono font-semibold py-0 px-2 h-4 text-muted-foreground">
                      0 a 17 anos
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground">Tarifas CHD & Colo</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || room.childrenCount <= 0}
                    aria-label="Diminuir crianças"
                    onClick={() => handleChildrenCountChange(roomIdx, room.childrenCount - 1)}
                    className="size-11 min-h-11 min-w-11 rounded-lg p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
                    {room.childrenCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || room.childrenCount >= 6}
                    aria-label="Aumentar crianças"
                    onClick={() => handleChildrenCountChange(roomIdx, room.childrenCount + 1)}
                    className="size-11 min-h-11 min-w-11 rounded-lg p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {room.childrenAges.length > 0 && (
              <div className="grid grid-cols-1 gap-2 pt-1">
                {room.childrenAges.map((age, childIdx) => {
                  const band = classifyChildAgeBand(age);
                  const badgeVariant =
                    band.band === "infant_0_1"
                      ? "info"
                      : band.band === "chd_2_11"
                        ? "default"
                        : "warning";

                  const selectId = `${baseId}-r${roomIdx}-c${childIdx}`;
                  return (
                    <div key={childIdx} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={selectId} className="text-xs font-medium text-muted-foreground">
                          Criança {childIdx + 1} (Quarto {roomIdx + 1})
                        </Label>
                        <Badge variant={badgeVariant} className="text-xs">
                          {band.band === "infant_0_1"
                            ? "Colo"
                            : band.band === "chd_2_11"
                              ? "CHD"
                              : "Tarifa Adulto"}
                        </Badge>
                      </div>
                      <Select
                        disabled={disabled}
                        value={String(age)}
                        onValueChange={(val) => handleChildAgeChange(roomIdx, childIdx, Number(val))}
                      >
                        <SelectTrigger id={selectId}>
                          <SelectValue placeholder="Idade" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
