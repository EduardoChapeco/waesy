import { useState } from "react";
import { Users, Plus, Minus, Bed as BedDouble, Baby, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GuestRoomOccupancy {
  adults: number;
  childrenAges: number[];
}

export function summarizeRoomOccupancies(rooms: GuestRoomOccupancy[]): string {
  const safe = Array.isArray(rooms) && rooms.length > 0 ? rooms : [{ adults: 2, childrenAges: [] }];
  const adults = safe.reduce((acc, r) => acc + Math.max(1, Number(r.adults || 1)), 0);
  const children = safe.reduce((acc, r) => acc + (Array.isArray(r.childrenAges) ? r.childrenAges.length : 0), 0);
  const roomsLabel = safe.length === 1 ? "1 quarto" : `${safe.length} quartos`;
  const adultsLabel = adults === 1 ? "1 adulto" : `${adults} adultos`;
  if (children === 0) return `${adultsLabel} · ${roomsLabel}`;
  const childrenLabel = children === 1 ? "1 criança" : `${children} crianças`;
  return `${adultsLabel}, ${childrenLabel} · ${roomsLabel}`;
}

export interface TourismMultiRoomPickerProps {
  rooms: GuestRoomOccupancy[];
  onChange: (nextRooms: GuestRoomOccupancy[]) => void;
  className?: string;
}

export function TourismMultiRoomPicker({
  rooms,
  onChange,
  className,
}: TourismMultiRoomPickerProps) {
  const [open, setOpen] = useState(false);

  const safeRooms: GuestRoomOccupancy[] =
    Array.isArray(rooms) && rooms.length > 0 ? rooms : [{ adults: 2, childrenAges: [] }];

  const updateRoomsCount = (delta: number) => {
    const nextCount = Math.max(1, Math.min(6, safeRooms.length + delta));
    if (nextCount > safeRooms.length) {
      onChange([...safeRooms, { adults: 2, childrenAges: [] }]);
    } else if (nextCount < safeRooms.length) {
      onChange(safeRooms.slice(0, nextCount));
    }
  };

  const updateRoomAdults = (roomIdx: number, delta: number) => {
    onChange(
      safeRooms.map((r, i) =>
        i === roomIdx ? { ...r, adults: Math.max(1, Math.min(6, r.adults + delta)) } : r,
      ),
    );
  };

  const updateRoomChildrenCount = (roomIdx: number, delta: number) => {
    onChange(
      safeRooms.map((r, i) => {
        if (i !== roomIdx) return r;
        const nextLen = Math.max(0, Math.min(4, r.childrenAges.length + delta));
        if (nextLen > r.childrenAges.length) {
          return { ...r, childrenAges: [...r.childrenAges, 6] };
        }
        return { ...r, childrenAges: r.childrenAges.slice(0, nextLen) };
      }),
    );
  };

  const updateChildAge = (roomIdx: number, childIdx: number, age: number) => {
    onChange(
      safeRooms.map((r, i) => {
        if (i !== roomIdx) return r;
        const nextAges = [...r.childrenAges];
        nextAges[childIdx] = age;
        return { ...r, childrenAges: nextAges };
      }),
    );
  };

  const summaryText = summarizeRoomOccupancies(safeRooms);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-left flex items-center justify-between gap-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <Users className="size-4 text-primary shrink-0" weight="bold" />
          <span className="truncate">{summaryText}</span>
        </span>
        <CaretDown className="size-4 text-muted-foreground shrink-0" weight="bold" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-dvh overflow-y-auto pt-safe-modal">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <BedDouble className="size-5 text-primary" weight="bold" />
              <span>Quartos e Viajantes</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a distribuição exata por quarto e as idades das crianças para cálculo real no GDS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Controle de Quantidade de Quartos */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
              <div>
                <p className="text-xs font-extrabold text-foreground">Quantidade de Quartos</p>
                <p className="text-xs text-muted-foreground">Até 6 quartos por busca</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateRoomsCount(-1)}
                  disabled={safeRooms.length <= 1}
                  aria-label="Remover quarto"
                  className="size-11 min-h-11 min-w-11 rounded-xl p-0 cursor-pointer"
                >
                  <Minus className="size-4" weight="bold" />
                </Button>
                <span className="w-7 text-center text-sm font-black font-mono tabular-nums">
                  {safeRooms.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateRoomsCount(1)}
                  disabled={safeRooms.length >= 6}
                  aria-label="Adicionar quarto"
                  className="size-11 min-h-11 min-w-11 rounded-xl p-0 cursor-pointer"
                >
                  <Plus className="size-4" weight="bold" />
                </Button>
              </div>
            </div>

            {/* Lista de Quartos */}
            <div className="space-y-3">
              {safeRooms.map((room, roomIdx) => (
                <div
                  key={roomIdx}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <p className="text-xs font-extrabold text-foreground uppercase tracking-wide">
                    Quarto {roomIdx + 1}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Adultos */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Adultos</Label>
                      <div className="flex items-center justify-between gap-1 rounded-xl border border-border px-2 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => updateRoomAdults(roomIdx, -1)}
                          disabled={room.adults <= 1}
                          aria-label={`Diminuir adultos no quarto ${roomIdx + 1}`}
                          className="size-11 min-h-11 min-w-11 p-0 cursor-pointer"
                        >
                          <Minus className="size-3.5" weight="bold" />
                        </Button>
                        <span className="text-sm font-black font-mono tabular-nums">{room.adults}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => updateRoomAdults(roomIdx, 1)}
                          disabled={room.adults >= 6}
                          aria-label={`Aumentar adultos no quarto ${roomIdx + 1}`}
                          className="size-11 min-h-11 min-w-11 p-0 cursor-pointer"
                        >
                          <Plus className="size-3.5" weight="bold" />
                        </Button>
                      </div>
                    </div>

                    {/* Crianças */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Crianças (0–17)</Label>
                      <div className="flex items-center justify-between gap-1 rounded-xl border border-border px-2 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => updateRoomChildrenCount(roomIdx, -1)}
                          disabled={room.childrenAges.length <= 0}
                          aria-label={`Diminuir crianças no quarto ${roomIdx + 1}`}
                          className="size-11 min-h-11 min-w-11 p-0 cursor-pointer"
                        >
                          <Minus className="size-3.5" weight="bold" />
                        </Button>
                        <span className="text-sm font-black font-mono tabular-nums">
                          {room.childrenAges.length}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => updateRoomChildrenCount(roomIdx, 1)}
                          disabled={room.childrenAges.length >= 4}
                          aria-label={`Aumentar crianças no quarto ${roomIdx + 1}`}
                          className="size-11 min-h-11 min-w-11 p-0 cursor-pointer"
                        >
                          <Plus className="size-3.5" weight="bold" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Idade exata de cada criança */}
                  {room.childrenAges.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <Baby className="size-3.5 text-primary" weight="bold" />
                        <span>Idade de cada criança no embarque</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {room.childrenAges.map((age, cIdx) => (
                          <div key={cIdx} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Criança {cIdx + 1}</Label>
                            <Select
                              value={String(age)}
                              onValueChange={(v) => updateChildAge(roomIdx, cIdx, Number(v))}
                            >
                              <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 18 }, (_, y) => (
                                  <SelectItem key={y} value={String(y)}>
                                    {y === 0 ? "Colo (menor de 1 ano)" : `${y} ${y === 1 ? "ano" : "anos"}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
          >
            Confirmar Viajantes ({summaryText})
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
