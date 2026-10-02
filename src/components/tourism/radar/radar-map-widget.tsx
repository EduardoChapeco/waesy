import React from 'react';
import { Globe, Plane, Users, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface ActiveTravelerLocation {
 id: string;
 clientName: string;
 destination: string;
 status: 'flight_boarding' | 'in_flight' | 'hotel_checked_in' | 'returning';
 countryCode: string;
 flag: string;
}


export interface RadarMapWidgetProps {
  travelers?: ActiveTravelerLocation[];
}

export function RadarMapWidget({ travelers = [] }: RadarMapWidgetProps) {
  return (
    <div className="p-6 rounded-lg bg-card border border-border shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600">
            <Globe className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Radar Global de Operações</h3>
            <p className="text-[11px] text-muted-foreground">Monitoramento de viajantes e excursões ativas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Ativo</span>
        </div>
      </div>

      {travelers.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <MapPin className="size-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground">Nenhum viajante em trânsito no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {travelers.map((t) => (
            <div key={t.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xl">{t.flag}</span>
                <Badge variant="outline" className="text-[9px] font-mono uppercase py-0">
                  {t.status === 'in_flight' ? 'Em Voo' : 'No Hotel'}
                </Badge>
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground truncate">{t.clientName}</h4>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="size-3 text-primary shrink-0" /> {t.destination}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
