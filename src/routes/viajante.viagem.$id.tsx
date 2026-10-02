import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Compass, Plane, Hotel, Calendar, CreditCard, Camera, PhoneCall, MapPin, Clock, ShieldCheck, CheckCircle2, FileText, DollarSign, Utensils, Sun, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const Route = createFileRoute('/viajante/viagem/$id')({
  component: TripPortalPage,
});

type TabType = 'resumo' | 'explorar' | 'financeiro' | 'memorias' | 'contatos';

export default function TripPortalPage() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<TabType>('resumo');

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center">
      {/* Header Banner - Superfície Única Neutra */}
      <div className="w-full bg-card text-card-foreground py-8 px-6 border-b border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-2">
              <Compass className="size-3.5" />
              <span>Portal do Passageiro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Roteiro de Viagem</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Localizador #{id} · Embarque e acompanhamento em tempo real
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Reserva Confirmada
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-4xl w-full px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('resumo')}
            className={`h-11 px-4 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'resumo'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Compass className="size-4" />
            Resumo do Roteiro
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explorar')}
            className={`h-11 px-4 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'explorar'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Globe className="size-4" />
            Explorar Destino
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`h-11 px-4 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'financeiro'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <CreditCard className="size-4" />
            Carnê e Financeiro
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('memorias')}
            className={`h-11 px-4 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'memorias'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Camera className="size-4" />
            Galeria de Memórias
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contatos')}
            className={`h-11 px-4 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'contatos'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <PhoneCall className="size-4" />
            Plantão 24h e Emergência
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'resumo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Plane className="size-4" />
                  Voos Confirmados (Trecho de Ida)
                </div>
                <div className="p-3 rounded-lg bg-muted/40 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">LATAM LA 3214</p>
                    <p className="text-muted-foreground">GRU 23:30 &rarr; MIA 07:15</p>
                  </div>
                  <span className="font-mono text-primary font-semibold">PNR: XYZ987</span>
                </div>
              </div>

              <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Hotel className="size-4" />
                  Hospedagem Confirmada
                </div>
                <div className="p-3 rounded-lg bg-muted/40 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">Grand Beach Resort e Spa</p>
                    <p className="text-muted-foreground">7 Noites · Café da Manhã Incluso</p>
                  </div>
                  <Badge variant="outline">Voucher Ativo</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'explorar' && (
            <div className="p-6 rounded-lg border border-border bg-card flex flex-col gap-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Sun className="size-5 text-amber-500" />
                Guia e Inteligência de Destino
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Clima Médio:</span>
                  <p className="text-base font-semibold text-foreground mt-1 tabular-nums">26°C · Ensolarado</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Fuso Horário:</span>
                  <p className="text-base font-semibold text-foreground mt-1">GMT-4 (-1h de Brasília)</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Moeda Local:</span>
                  <p className="text-base font-semibold text-foreground mt-1">Dólar Americano (USD)</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="p-6 rounded-lg border border-border bg-card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="size-4 text-emerald-500" />
                  Carnê de Viagem Parcelada
                </h3>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Em Dia
                </span>
              </div>
              <div className="divide-y divide-border text-xs">
                <div className="flex justify-between py-3">
                  <span>Parcela 1/3 (Entrada)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">R$ 1.500,00 · PAGA (PIX)</span>
                </div>
                <div className="flex justify-between py-3">
                  <span>Parcela 2/3 (Vencimento 10/10)</span>
                  <span className="font-semibold text-foreground tabular-nums">R$ 1.500,00</span>
                </div>
                <div className="flex justify-between py-3">
                  <span>Parcela 3/3 (Vencimento 10/11)</span>
                  <span className="font-semibold text-foreground tabular-nums">R$ 1.500,00</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memorias' && (
            <div className="p-8 rounded-lg border border-dashed border-border bg-card text-center">
              <Camera className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h4 className="text-base font-semibold text-foreground">Álbum e Memórias da Viagem</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Envie suas fotos favoritas dos passeios para compor o diário visual da viagem.
              </p>
              <input
                type="file"
                id="album-file-input"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    toast.success(`${files.length} foto(s) selecionada(s) para o álbum.`);
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  document.getElementById('album-file-input')?.click();
                }}
                className="h-11 px-5 text-xs font-medium rounded-lg"
              >
                Adicionar Fotos ao Álbum
              </Button>
            </div>
          )}

          {activeTab === 'contatos' && (
            <div className="p-6 rounded-lg border border-border bg-card flex flex-col gap-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <PhoneCall className="size-4 text-primary" />
                Contatos de Emergência e Suporte 24 Horas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-lg bg-muted/40 flex flex-col gap-1">
                  <span className="font-semibold text-foreground">Plantão 24h da Agência (WhatsApp)</span>
                  <span className="text-muted-foreground tabular-nums">+55 (11) 99999-8888</span>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 flex flex-col gap-1">
                  <span className="font-semibold text-foreground">Seguradora Assist Card</span>
                  <span className="text-muted-foreground tabular-nums">0800 770 1660 (Ligação Gratuita)</span>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 flex flex-col gap-1">
                  <span className="font-semibold text-foreground">Consulado-Geral do Brasil em Miami</span>
                  <span className="text-muted-foreground tabular-nums">+1 (305) 285-6200</span>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 flex flex-col gap-1">
                  <span className="font-semibold text-foreground">LATAM Linhas Aéreas</span>
                  <span className="text-muted-foreground tabular-nums">0300 570 5700</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
