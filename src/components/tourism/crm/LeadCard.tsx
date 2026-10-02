import React, { useMemo } from 'react';
import { MessageSquare, Clock, MapPin, Calendar, Users, CheckCircle2, ChevronRight, ChevronLeft, DollarSign, User, ExternalLink, Archive, UserCheck, MoreVertical, Edit3, FileText, Calculator, Plane, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export interface LeadCardProps {
  lead: any;
  currentStageId?: string;
  stages?: Array<{ id: string; title: string }>;
  team?: Array<{ profile_id?: string; id?: string; name?: string; full_name?: string }>;
  onOpenDetails?: (lead: any) => void;
  onGenerateProposal?: (lead: any) => void;
  onCalculateCommission?: (lead: any) => void;
  onOpenFlightGrid?: (lead: any) => void;
  onStageChange?: (leadId: string, newStage: string) => void;
  onPromote?: (leadId: string) => void;
  onDelete?: (leadId: string) => void;
  prevStageId?: string | null;
  nextStageId?: string | null;
}

export function LeadCard({
  lead,
  currentStageId,
  stages = [],
  team = [],
  onOpenDetails,
  onGenerateProposal,
  onCalculateCommission,
  onOpenFlightGrid,
  onStageChange,
  onPromote,
  onDelete,
  prevStageId,
  nextStageId,
}: LeadCardProps) {
  const initials = useMemo(() => {
    if (!lead?.full_name) return 'L';
    return lead.full_name
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [lead?.full_name]);

  // Staleness calculation (inactivity since last contact)
  const staleness = useMemo(() => {
    const lastDate = lead.last_contacted_at || lead.created_at;
    if (!lastDate) return { isStale: false, isCold: false, days: 0 };
    const diffMs = Math.abs(new Date().getTime() - new Date(lastDate).getTime());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      days,
      isStale: days >= 5 && days < 10,
      isCold: days >= 10,
    };
  }, [lead.last_contacted_at, lead.created_at]);

  // Pax formatting
  const paxBreakdown = useMemo(() => {
    const adults = lead.pax_adults || 1;
    const children = lead.pax_children || 0;
    const infants = lead.pax_infants || 0;
    const total = adults + children + infants;
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} ADT`);
    if (children > 0) parts.push(`${children} CHD`);
    if (infants > 0) parts.push(`${infants} INF`);
    return {
      total: `${total} Pax`,
      detail: parts.join(', '),
    };
  }, [lead.pax_adults, lead.pax_children, lead.pax_infants]);

  // Travel dates formatting
  const travelPeriod = useMemo(() => {
    if (lead.interest_period) return lead.interest_period;
    if (!lead.travel_start) return null;
    const start = new Date(lead.travel_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!lead.travel_end) return start;
    const end = new Date(lead.travel_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${start} a ${end}`;
  }, [lead.interest_period, lead.travel_start, lead.travel_end]);

  // Checklist completion
  const checklistStats = useMemo(() => {
    const items = Array.isArray(lead.checklist) ? lead.checklist : [];
    const total = items.length;
    const done = items.filter((i: any) => i.done).length;
    return { total, done };
  }, [lead.checklist]);

  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
        `Olá ${lead.full_name}, tudo bem? Sou da equipe comercial da agência de viagens. Gostaria de dar andamento à sua viagem ${
          lead.destination ? `para ${lead.destination}` : ''
        }.`
      )}`
    : null;

  const assignedMember = team.find((m) => (m.profile_id || m.id) === lead.assigned_to);

  return (
    <div
      onClick={() => onOpenDetails?.(lead)}
      className={cn(
        'p-4 rounded-lg border bg-card hover:border-primary/50 transition-all shadow-xs hover:shadow-md space-y-3 text-xs group cursor-pointer relative',
        staleness.isCold
          ? 'border-rose-500/40 bg-rose-500/[0.02]'
          : staleness.isStale
          ? 'border-amber-500/40 bg-amber-500/[0.02]'
          : 'border-border/70'
      )}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="size-7 rounded-lg shrink-0 border border-border/60">
            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-foreground text-xs truncate group-hover:text-primary transition-colors">
              {lead.full_name}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
              {lead.phone && <span>{lead.phone}</span>}
              {lead.lead_source_detail && (
                <>
                  <span>•</span>
                  <span className="font-mono uppercase font-semibold text-primary/80">
                    {lead.lead_source_detail}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu de Ações e WhatsApp */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="size-6 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
              title="Iniciar conversa no WhatsApp"
            >
              <MessageSquare className="size-3" />
            </a>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-52 p-2 rounded-lg">
              <DropdownMenuItem onClick={() => onOpenDetails?.(lead)} className="cursor-pointer font-medium">
                <Edit3 className="size-3.5 mr-2" />
                Abrir Ficha 360°
              </DropdownMenuItem>
              {onGenerateProposal && (
                <DropdownMenuItem onClick={() => onGenerateProposal(lead)} className="cursor-pointer font-medium text-primary">
                  <FileText className="size-3.5 mr-2" />
                  Gerar Proposta Visual
                </DropdownMenuItem>
              )}
              {onCalculateCommission && (
                <DropdownMenuItem onClick={() => onCalculateCommission(lead)} className="cursor-pointer font-medium text-amber-500">
                  <Calculator className="size-3.5 mr-2" />
                  Calcular Comissão
                </DropdownMenuItem>
              )}
              {onOpenFlightGrid && (
                <DropdownMenuItem onClick={() => onOpenFlightGrid(lead)} className="cursor-pointer font-medium text-sky-500">
                  <Plane className="size-3.5 mr-2" />
                  Malha Aérea e Voos
                </DropdownMenuItem>
              )}

              {stages.length > 0 && onStageChange && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase font-mono">
                    Mover para Estágio:
                  </div>
                  {stages
                    .filter((s) => s.id !== currentStageId)
                    .map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => onStageChange(lead.id, s.id)}
                        className="cursor-pointer text-[11px]"
                      >
                        → {s.title}
                      </DropdownMenuItem>
                    ))}
                </>
              )}

              {onPromote && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onPromote(lead.id)}
                    className="text-emerald-600 font-bold cursor-pointer"
                  >
                    <UserCheck className="size-3.5 mr-2" />
                    Converter em Cliente
                  </DropdownMenuItem>
                </>
              )}

              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(lead.id)}
                  className="text-rose-600 font-medium cursor-pointer"
                >
                  <Trash2 className="size-3.5 mr-2" />
                  Excluir Lead
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alerta de Inatividade / Staleness */}
      {staleness.isStale && (
        <div
          className={cn(
            'text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md inline-flex items-center gap-1 border',
            staleness.isCold
              ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
          )}
        >
          <AlertTriangle className="size-2.5 shrink-0" />
          <span>
            {staleness.isCold ? 'Inativo há' : 'Sem Resposta há'} {staleness.days} dias
          </span>
        </div>
      )}

      {/* Bloco de Destino, Período & Passageiros */}
      <div className="p-2 rounded-lg bg-muted/40 border border-border/40 space-y-1 text-[11px]">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 text-foreground font-semibold truncate">
            <MapPin className="size-3 text-primary shrink-0" />
            <span className="truncate">{lead.destination || 'Destino a definir'}</span>
          </div>
          {lead.estimated_value_cents > 0 && (
            <span className="font-mono font-bold text-xs text-foreground shrink-0">
              {formatMoney(lead.estimated_value_cents)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground pl-4">
          {travelPeriod && <span>{travelPeriod}</span>}
          {travelPeriod && <span>•</span>}
          <span className="font-medium text-foreground/80">{paxBreakdown.total}</span>
        </div>
      </div>

      {/* Tags com Cores */}
      {lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.map((tag: string) => {
            const [name, color] = tag.split(':');
            return (
              <span
                key={tag}
                className="px-2 py-1 rounded-md text-[9px] font-semibold border"
                style={{
                  backgroundColor: color ? `${color}15` : 'var(--muted)',
                  borderColor: color ? `${color}40` : 'var(--border)',
                  color: color || 'var(--foreground)',
                }}
              >
                {name}
              </span>
            );
          })}
        </div>
      )}

      {/* Rodapé do Card: Checklist & Membro Atribuído & Mudança de Estágio */}
      <div className="flex items-center justify-between pt-1 text-[10px] border-t border-border/50">
        <div className="flex items-center gap-2">
          {checklistStats.total > 0 && (
            <span
              className={cn(
                'font-mono flex items-center gap-1',
                checklistStats.done === checklistStats.total ? 'text-emerald-600 font-bold' : 'text-muted-foreground'
              )}
            >
              <CheckCircle2 className="size-3" />
              {checklistStats.done}/{checklistStats.total}
            </span>
          )}

          {assignedMember && (
            <span className="text-muted-foreground font-mono truncate max-w-[90px]">
              @{assignedMember.name || assignedMember.full_name}
            </span>
          )}
        </div>

        {/* Ações de Avanço Rápido no Funil */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {prevStageId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStageChange?.(lead.id, prevStageId)}
              className="size-6 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              title="Voltar etapa"
            >
              <ChevronLeft className="size-3" />
            </Button>
          )}
          {nextStageId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStageChange?.(lead.id, nextStageId)}
              className="size-6 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              title="Avançar etapa"
            >
              <ChevronRight className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

