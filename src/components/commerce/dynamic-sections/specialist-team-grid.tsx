import * as React from "react";
import { UserCheck, Calendar, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SpecialistMember {
 id: string;
 name: string;
 role: string;
 registrationNumber?: string; // Ex: CRM 12345 / CRO 54321 / OAB
 bio: string;
 imageUrl?: string;
 specialties?: string[];
}

export interface SpecialistTeamGridProps {
 title?: string;
 subtitle?: string;
 members?: SpecialistMember[];
 storeData?: any;
 onBookAppointment?: (memberId: string) => void;
}

export function SpecialistTeamGridSection({
 title = "Corpo Clínico & Especialistas",
 subtitle = "Profissionais certificados com vasta experiência para cuidar de você.",
 members,
 storeData,
 onBookAppointment,
}: SpecialistTeamGridProps) {
 const displayMembers: SpecialistMember[] = React.useMemo(() => {
 if (members && members.length > 0) return members;
 if (storeData?.team && Array.isArray(storeData.team) && storeData.team.length > 0) {
 return storeData.team;
 }
 return [];
 }, [members, storeData]);

 if (displayMembers.length === 0) {
 return null;
 }
 return (
 <section className="py-12 bg-muted/20 w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
 <div className="text-center max-w-xl mx-auto space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Equipe Médica
 </Badge>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {displayMembers.map((member: SpecialistMember) => (
 <div
 key={member.id}
 className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs flex flex-col justify-between group hover:border-primary/40 transition-all p-5 space-y-4"
 >
 <div className="space-y-3">
 <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/60 relative">
 {member.imageUrl ? (
 <img
 src={member.imageUrl}
 alt={member.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <div className="size-full flex items-center justify-center">
 <UserCheck className="size-12 text-muted-foreground/40" />
 </div>
 )}

 {member.registrationNumber && (
 <div className="absolute bottom-2 left-2">
 <Badge variant="secondary" className="text-[10px] font-mono bg-background/90 backdrop-blur-md shadow-2xs">
 {member.registrationNumber}
 </Badge>
 </div>
 )}
 </div>

 <div className="space-y-1">
 <h3 className="font-bold text-base text-foreground">{member.name}</h3>
 <p className="text-xs font-semibold text-primary">{member.role}</p>
 <p className="text-xs text-muted-foreground leading-relaxed pt-1">
 {member.bio}
 </p>
 </div>

 {member.specialties && member.specialties.length > 0 && (
 <div className="flex flex-wrap gap-1 pt-1">
 {member.specialties.map((spec: string, idx: number) => (
 <span
 key={idx}
 className="px-2 py-1 rounded-md bg-muted/60 text-[10px] text-muted-foreground font-medium"
 >
 {spec}
 </span>
 ))}
 </div>
 )}
 </div>

 {onBookAppointment && (
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => onBookAppointment(member.id)}
 className="w-full rounded-lg text-xs font-bold gap-2 border-border/80 bg-background hover:bg-muted"
 >
 <Calendar className="size-3.5" />
 <span>Agendar Consulta</span>
 </Button>
 )}
 </div>
 ))}
 </div>
 </div>
 </section>
 );
}
