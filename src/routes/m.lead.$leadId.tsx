import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Phone,
  User,
  HeartPulse,
  Send,
  Plus,
  Trash2,
  Users,
  Edit3,
  Upload,
  FileText,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/state/states";
import { maskCpfProgressive, formatPhone } from "@/lib/document-validator";
import {
  calculateAgeFromDateOnly,
  formatDateOnlyBr,
  normalizeDateOnlyInput,
  parseDateOnlyParts,
} from "@/lib/datetime";
import {
  deletePublicLeadDocument,
  getPublicLeadByToken,
  submitPublicLeadForm,
  uploadPublicLeadDocument,
} from "@/services/crm.functions";

export const Route = createFileRoute("/m/lead/$leadId")({
  head: () => ({
    meta: [
      {
        title: "Central do Passageiro | Ficha de Viagem e Documentos",
      },
    ],
  }),
  loader: async ({ params }: { params: { leadId: string } }) => {
    try {
      const leadData = await getPublicLeadByToken({
        data: { token: params.leadId },
      });
      return { leadData, loadError: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Link inválido ou não encontrado.";
      console.error("[loader:m.lead.$leadId] loader error:", err);
      return { leadData: null, loadError: message };
    }
  },
  component: PublicLeadPassageirosPage,
});

interface PaxItem {
  id?: string;
  full_name: string;
  document?: string;
  rg?: string;
  birth_date?: string;
  relationship: string;
  phone?: string;
  email?: string;
  passport_number?: string;
  passport_expiry_date?: string;
  seat_preference?: string;
  dietary_restrictions?: string;
}

interface CustomerDocumentItem {
  id: string;
  doc_type: string;
  title?: string | null;
  doc_number?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  file_url?: string | null;
  notes?: string | null;
  traveler_id?: string | null;
  traveler_name?: string | null;
  expiryStatus?: "valid" | "soon" | "expired";
  created_at?: string;
}

const PUBLIC_DOC_TYPE_OPTIONS = [
  { value: "passport", label: "Passaporte" },
  { value: "cnh", label: "CNH" },
  { value: "rg", label: "RG (Identidade)" },
  { value: "cpf", label: "CPF" },
  { value: "visa", label: "Visto Consular" },
  { value: "vaccination_card", label: "Cartão de Vacina (CIVP)" },
  { value: "proof_of_residence", label: "Comprovante de Residência" },
  { value: "other", label: "Outro Documento" },
] as const;

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: "Cônjuge",
  child: "Filho(a)",
  parent: "Pai / Mãe",
  friend: "Amigo(a)",
  other: "Outro",
};

const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

function PublicLeadPassageirosPage() {
  const router = useRouter();
  const { leadData, loadError } = (Route.useLoaderData as any)() || {};

  // Dados do Titular e Logística (sempre antes de returns para preservar Rules of Hooks)
  const [fullName, setFullName] = useState(leadData?.full_name || "");
  const [documentCpf, setDocumentCpf] = useState(
    leadData?.document ? maskCpfProgressive(String(leadData.document)) : "",
  );
  const [rgNumber, setRgNumber] = useState(leadData?.rg || "");
  const [birthDate, setBirthDate] = useState(normalizeDateOnlyInput(leadData?.birth_date));
  const [phone, setPhone] = useState(leadData?.phone ? formatPhone(String(leadData.phone)) : "");
  const [email, setEmail] = useState(leadData?.email || "");
  const [address, setAddress] = useState(leadData?.address || "");
  const [city, setCity] = useState(leadData?.city || "");
  const [stateUf, setStateUf] = useState(leadData?.state || "");
  const [zipcode, setZipcode] = useState(leadData?.zipcode || "");

  const [destination, setDestination] = useState(leadData?.destination || "");
  const [departureCity, setDepartureCity] = useState(leadData?.departure_city || "");
  const [travelStart, setTravelStart] = useState(normalizeDateOnlyInput(leadData?.travel_start));
  const [travelEnd, setTravelEnd] = useState(normalizeDateOnlyInput(leadData?.travel_end));
  const [interestPeriod, setInterestPeriod] = useState(leadData?.interest_period || "");
  const [accommodationPref, setAccommodationPref] = useState(leadData?.accommodation_pref || "");
  const [mealPlan, setMealPlan] = useState(leadData?.meal_plan || "");

  const [passportNumber, setPassportNumber] = useState(leadData?.passport_number || "");
  const [passportExpiryDate, setPassportExpiryDate] = useState(
    normalizeDateOnlyInput(leadData?.passport_expiry_date),
  );
  const [seatPreference, setSeatPreference] = useState(leadData?.seat_preference || "Indiferente");
  const [emergencyContactName, setEmergencyContactName] = useState(
    leadData?.emergency_contact_name || "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    leadData?.emergency_contact_phone ? formatPhone(String(leadData.emergency_contact_phone)) : "",
  );

  const [paxList, setPaxList] = useState<PaxItem[]>(
    Array.isArray(leadData?.pax_list)
      ? leadData.pax_list.map((p: any, idx: number) => ({
          id: p.id || `pax-acc-${idx + 1}`,
          full_name: p.full_name || "",
          document: p.document ? maskCpfProgressive(String(p.document)) : "",
          rg: p.rg || "",
          birth_date: normalizeDateOnlyInput(p.birth_date),
          relationship: p.relationship || "other",
          phone: p.phone ? formatPhone(String(p.phone)) : "",
          email: p.email || "",
          passport_number: p.passport_number || "",
          passport_expiry_date: normalizeDateOnlyInput(p.passport_expiry_date),
          seat_preference: p.seat_preference || "Indiferente",
          dietary_restrictions: p.dietary_restrictions || "",
        }))
      : [],
  );

  const [documents, setDocuments] = useState<CustomerDocumentItem[]>(
    Array.isArray(leadData?.customer_documents) ? leadData.customer_documents : [],
  );

  const [lgpdAccepted, setLgpdAccepted] = useState(Boolean(leadData?.lgpd_accepted));
  const [healthNotes, setHealthNotes] = useState(leadData?.health_notes || "");
  const [pcd, setPcd] = useState(Boolean(leadData?.pcd));
  const [reducedMobility, setReducedMobility] = useState(Boolean(leadData?.reduced_mobility));
  const [autism, setAutism] = useState(Boolean(leadData?.autism));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Estado do Upload de Documentos ligado ao cadastro do cliente
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docsSectionRef = useRef<HTMLDivElement>(null);
  const [docTravelerId, setDocTravelerId] = useState<string>("pax-primary");
  const [docType, setDocType] = useState<string>("passport");
  const [docNumber, setDocNumber] = useState("");
  const [docExpiresAt, setDocExpiresAt] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Modal de Adicionar / Editar Passageiro
  const [isPaxModalOpen, setIsPaxModalOpen] = useState(false);
  const [editingPaxIndex, setEditingPaxIndex] = useState<number | null>(null);
  const [paxForm, setPaxForm] = useState<PaxItem>({
    full_name: "",
    document: "",
    rg: "",
    birth_date: "",
    relationship: "spouse",
    phone: "",
    email: "",
    passport_number: "",
    passport_expiry_date: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paxParam = params.get("pax");
    if (paxParam) {
      setDocTravelerId(paxParam);
    }
    const tabParam = params.get("tab");
    if (tabParam === "documentos" || tabParam === "docs") {
      docsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const travelerChoices = useMemo(() => {
    const items = [
      {
        id: "pax-primary",
        label: `${fullName.trim() || "Passageiro Titular"} (Titular)`,
        name: fullName.trim() || "Passageiro Titular",
      },
    ];
    paxList.forEach((p, idx) => {
      const id = p.id || `pax-acc-${idx + 1}`;
      items.push({
        id,
        label: `${p.full_name.trim() || `Acompanhante ${idx + 1}`} (${RELATIONSHIP_LABELS[p.relationship] || "Acompanhante"})`,
        name: p.full_name.trim() || `Acompanhante ${idx + 1}`,
      });
    });
    return items;
  }, [fullName, paxList]);

  const passportValidityWarning = useMemo(() => {
    if (!passportExpiryDate) return null;
    const expParts = parseDateOnlyParts(passportExpiryDate);
    const depParts = parseDateOnlyParts(travelStart || new Date());
    if (!expParts || !depParts) return null;
    const expMs = Date.UTC(expParts.year, expParts.month - 1, expParts.day, 15, 0, 0);
    const depMs = Date.UTC(depParts.year, depParts.month - 1, depParts.day, 15, 0, 0);
    const diffMonths = (expMs - depMs) / (1000 * 60 * 60 * 24 * 30);
    if (diffMonths < 6) {
      return `Passaporte vence em ${formatDateOnlyBr(passportExpiryDate)} (menos de 6 meses da data de ida).`;
    }
    return null;
  }, [passportExpiryDate, travelStart]);

  const formattedTravelPeriod = useMemo(() => {
    if (travelStart && travelEnd) {
      return `${formatDateOnlyBr(travelStart)} a ${formatDateOnlyBr(travelEnd)}`;
    }
    if (travelStart) {
      return `A partir de ${formatDateOnlyBr(travelStart)}`;
    }
    return interestPeriod || "A combinar";
  }, [travelStart, travelEnd, interestPeriod]);

  const titularAge = useMemo(() => calculateAgeFromDateOnly(birthDate), [birthDate]);

  if (loadError || !leadData || leadData.error) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-card border border-border p-6">
          <ErrorState
            title="Formulário Indisponível"
            description={
              loadError ||
              leadData?.error ||
              "Este link de formulário não foi encontrado ou expirou. Solicite um novo link à agência."
            }
            onRetry={() => router.invalidate()}
          />
        </div>
      </div>
    );
  }

  const openNewPaxModal = () => {
    setEditingPaxIndex(null);
    setPaxForm({
      full_name: "",
      document: "",
      rg: "",
      birth_date: "",
      relationship: "spouse",
      phone: "",
      email: "",
      passport_number: "",
      passport_expiry_date: "",
    });
    setIsPaxModalOpen(true);
  };

  const openEditPaxModal = (index: number) => {
    const existing = paxList[index];
    if (!existing) return;
    setEditingPaxIndex(index);
    setPaxForm({ ...existing });
    setIsPaxModalOpen(true);
  };

  const handleSavePax = () => {
    if (!paxForm.full_name.trim() || paxForm.full_name.trim().length < 2) {
      toast.error("Informe o nome completo do passageiro.");
      return;
    }
    const sanitized: PaxItem = {
      ...paxForm,
      id: paxForm.id || `pax-acc-${Date.now()}`,
      full_name: paxForm.full_name.trim(),
      birth_date: normalizeDateOnlyInput(paxForm.birth_date),
      passport_expiry_date: normalizeDateOnlyInput(paxForm.passport_expiry_date),
    };
    if (editingPaxIndex !== null) {
      setPaxList((prev) => prev.map((item, idx) => (idx === editingPaxIndex ? sanitized : item)));
      toast.success("Dados do acompanhante atualizados.");
    } else {
      setPaxList((prev) => [...prev, sanitized]);
      toast.success("Acompanhante adicionado à lista.");
    }
    setIsPaxModalOpen(false);
    setEditingPaxIndex(null);
  };

  const handleRemovePax = (index: number) => {
    setPaxList((prev) => prev.filter((_, i) => i !== index));
    toast.success("Acompanhante removido.");
  };

  const handleUploadDocumentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 15 MB.");
      e.target.value = "";
      return;
    }

    setIsUploadingDoc(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || "");
          resolve(raw.includes(",") ? (raw.split(",")[1] || "") : raw);
        };
        reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
        reader.readAsDataURL(file);
      });

      const selectedTraveler = travelerChoices.find((t) => t.id === docTravelerId) || travelerChoices[0];
      const result = await uploadPublicLeadDocument({
        data: {
          token: leadData.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          base64Data,
          docType: docType as any,
          docNumber: docNumber.trim() || null,
          expiresAt: normalizeDateOnlyInput(docExpiresAt) || null,
          travelerId: selectedTraveler?.id || "pax-primary",
          travelerName: selectedTraveler?.name || fullName || "Passageiro Titular",
        },
      });

      if (result?.document) {
        setDocuments((prev) => [result.document, ...prev]);
      }
      setDocNumber("");
      setDocExpiresAt("");
      toast.success("Documento enviado e vinculado ao seu cadastro!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar documento.");
    } finally {
      e.target.value = "";
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deletePublicLeadDocument({
        data: { token: leadData.id, documentId },
      });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast.success("Documento removido.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover documento.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Informe o nome completo do passageiro titular.");
      return;
    }

    if (travelStart && travelEnd && travelEnd < travelStart) {
      toast.error("A data de volta prevista não pode ser anterior à data de ida.");
      return;
    }

    if (!lgpdAccepted) {
      toast.error("Por favor, autorize o tratamento dos dados conforme a LGPD para prosseguir.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPublicLeadForm({
        data: {
          token: leadData.id,
          fullName: fullName.trim(),
          document: documentCpf.trim() || null,
          rg: rgNumber.trim() || null,
          birthDate: normalizeDateOnlyInput(birthDate) || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateUf.trim().toUpperCase() || null,
          zipcode: zipcode.trim() || null,
          destination: destination.trim() || null,
          departureCity: departureCity.trim() || null,
          travelStart: normalizeDateOnlyInput(travelStart) || null,
          travelEnd: normalizeDateOnlyInput(travelEnd) || null,
          interestPeriod: interestPeriod.trim() || null,
          accommodationPref: accommodationPref || null,
          mealPlan: mealPlan || null,
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null,
          passportNumber: passportNumber.trim().toUpperCase() || null,
          passportExpiryDate: normalizeDateOnlyInput(passportExpiryDate) || null,
          seatPreference: seatPreference || "Indiferente",
          dietaryRestrictions: healthNotes.trim() || null,
          paxList: paxList.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            document: p.document || null,
            rg: p.rg || null,
            birth_date: normalizeDateOnlyInput(p.birth_date) || null,
            relationship: p.relationship || "other",
            phone: p.phone || null,
            email: p.email || null,
            passport_number: p.passport_number || null,
            passport_expiry_date: normalizeDateOnlyInput(p.passport_expiry_date) || null,
            seat_preference: p.seat_preference || "Indiferente",
            dietary_restrictions: p.dietary_restrictions || null,
          })),
          lgpdAccepted: true,
          healthNotes: healthNotes.trim() || null,
          pcd,
          reducedMobility,
          autism,
        },
      });

      setIsSubmitted(true);
      toast.success("Ficha salva e sincronizada com a agência!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-card border border-border text-center space-y-5 animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none">
          <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Tudo pronto, {fullName.trim().split(" ")[0] || "Viajante"}!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suas informações, datas, documentos e acompanhantes foram gravados com segurança para{" "}
              <strong className="text-foreground font-semibold">
                {leadData.store_name || "sua agência"}
              </strong>
              .
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-left space-y-2">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Destino</span>
              <span className="font-semibold text-foreground text-right">
                {destination || "Em definição"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Período Previsto</span>
              <span className="font-semibold text-foreground text-right">
                {formattedTravelPeriod}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Viajantes</span>
              <Badge variant="outline" className="font-mono text-xs">
                {paxList.length + 1} pessoa(s)
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Documentos vinculados</span>
              <Badge variant="outline" className="font-mono text-xs">
                {documents.length} anexo(s)
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Consentimento LGPD</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> Aceito
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSubmitted(false)}
            className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Revisar ou Editar Dados
          </Button>
        </div>
      </div>
    );
  }

  const whatsappHref = leadData.store_whatsapp
    ? `https://wa.me/${String(leadData.store_whatsapp).replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-dvh bg-background text-foreground pt-4 sm:pt-8 pb-36 pb-safe px-3 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full space-y-5">
        {/* Cabeçalho da Agência */}
        <header className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {leadData.store_logo ? (
              <img
                src={leadData.store_logo}
                alt={leadData.store_name || "Agência"}
                className="size-12 rounded-xl object-cover border border-border/60 shrink-0"
              />
            ) : (
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold flex items-center justify-center text-lg shrink-0">
                {leadData.store_name?.charAt(0).toUpperCase() || "W"}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground block">
                Central do Passageiro
              </span>
              <h1 className="text-base font-semibold text-foreground truncate">
                {leadData.store_name || "Agência de Turismo"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 min-h-11 px-3 rounded-xl border border-border/60 bg-background text-xs font-medium text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Phone className="size-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Atendimento</span>
              </a>
            )}
            <Badge variant="outline" className="text-2xs font-medium py-1 px-3 rounded-full border-primary/30 text-primary bg-primary/5 hidden sm:inline-flex">
              Formulário Seguro
            </Badge>
          </div>
        </header>

        {/* Resumo do Titular */}
        <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-2xs font-mono uppercase font-semibold text-primary">
              Titular da Viagem
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              Olá, {fullName.trim() || "Viajante"}!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Confira e atualize suas datas previstas, dados pessoais, acompanhantes e documentos para emissão segura dos bilhetes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-2xs uppercase font-medium text-muted-foreground block">
                  Destino
                </span>
                <span className="text-xs font-semibold text-foreground truncate block">
                  {destination || "Em definição"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-warning/10 text-warning-strong flex items-center justify-center shrink-0">
                <Calendar className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-2xs uppercase font-medium text-muted-foreground block">
                  Período Previsto
                </span>
                <span className="text-xs font-semibold text-foreground truncate block">
                  {formattedTravelPeriod}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário Principal */}
        <form id="public-lead-intake-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Seção 1: Destino e Datas Editáveis da Viagem */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <span>Destino e Datas Previstas</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Ajuste a data exata de ida e retorno sem deslocamento de fuso horário.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead-destination" className="text-xs font-medium">
                  Destino Desejado
                </Label>
                <Input
                  id="lead-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: Porto Seguro, BA"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-departure-city" className="text-xs font-medium">
                  Cidade de Embarque
                </Label>
                <Input
                  id="lead-departure-city"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  placeholder="Ex: São Miguel do Oeste / Florianópolis"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-travel-start" className="text-xs font-medium">
                  Data de Ida Prevista
                </Label>
                <Input
                  id="lead-travel-start"
                  type="date"
                  value={travelStart}
                  onChange={(e) => setTravelStart(normalizeDateOnlyInput(e.target.value))}
                  onWheel={blurOnWheel}
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-travel-end" className="text-xs font-medium">
                  Data de Volta Prevista
                </Label>
                <Input
                  id="lead-travel-end"
                  type="date"
                  min={travelStart || undefined}
                  value={travelEnd}
                  onChange={(e) => setTravelEnd(normalizeDateOnlyInput(e.target.value))}
                  onWheel={blurOnWheel}
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-interest-period" className="text-xs font-medium">
                  Flexibilidade / Observação de Datas
                </Label>
                <Input
                  id="lead-interest-period"
                  value={interestPeriod}
                  onChange={(e) => setInterestPeriod(e.target.value)}
                  placeholder="Ex: Flexível ±2 dias ou férias escolares"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Padrão de Hospedagem</Label>
                <Select value={accommodationPref || "unset"} onValueChange={(v) => setAccommodationPref(v === "unset" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl text-base sm:text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="unset" className="text-xs">Indiferente</SelectItem>
                    <SelectItem value="economica" className="text-xs">Pousada / Econômica</SelectItem>
                    <SelectItem value="conforto_3" className="text-xs">Hotel 3 Estrelas Conforto</SelectItem>
                    <SelectItem value="superior_4" className="text-xs">Hotel 4 Estrelas Superior</SelectItem>
                    <SelectItem value="resort_5" className="text-xs">Hotel 5 Estrelas / Resort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Regime Alimentar</Label>
                <Select value={mealPlan || "unset"} onValueChange={(v) => setMealPlan(v === "unset" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl text-base sm:text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="unset" className="text-xs">Sem preferência</SelectItem>
                    <SelectItem value="cafe_manha" className="text-xs">Café da Manhã</SelectItem>
                    <SelectItem value="meia_pensao" className="text-xs">Meia Pensão (Café + Jantar)</SelectItem>
                    <SelectItem value="pensao_completa" className="text-xs">Pensão Completa</SelectItem>
                    <SelectItem value="all_inclusive" className="text-xs">All-Inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Preferência de Assento Aéreo</Label>
                <Select value={seatPreference || "Indiferente"} onValueChange={setSeatPreference}>
                  <SelectTrigger className="h-11 rounded-xl text-base sm:text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Indiferente" className="text-xs">Indiferente</SelectItem>
                    <SelectItem value="Janela" className="text-xs">Janela</SelectItem>
                    <SelectItem value="Corredor" className="text-xs">Corredor</SelectItem>
                    <SelectItem value="Mais Espaço / Saída" className="text-xs">Mais Espaço / Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Cadastrais do Titular (sincroniza direto em customers_crm) */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <User className="size-4 text-primary" />
                <span>Dados Cadastrais do Titular</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Preencha conforme o documento oficial que será apresentado no embarque.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lead-full-name" className="text-xs font-medium">
                  Nome Completo (sem abreviações) *
                </Label>
                <Input
                  id="lead-full-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome exatamente como consta no documento"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-cpf" className="text-xs font-medium">
                  CPF
                </Label>
                <Input
                  id="lead-cpf"
                  inputMode="numeric"
                  value={documentCpf}
                  onChange={(e) => setDocumentCpf(maskCpfProgressive(e.target.value))}
                  placeholder="000.000.000-00"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-rg" className="text-xs font-medium">
                  RG (Identidade)
                </Label>
                <Input
                  id="lead-rg"
                  value={rgNumber}
                  onChange={(e) => setRgNumber(e.target.value)}
                  placeholder="Número e órgão emissor"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="lead-birth-date" className="text-xs font-medium">
                    Data de Nascimento
                  </Label>
                  {titularAge !== null && (
                    <span className="text-2xs font-medium text-muted-foreground">
                      {titularAge} anos
                    </span>
                  )}
                </div>
                <Input
                  id="lead-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(normalizeDateOnlyInput(e.target.value))}
                  onWheel={blurOnWheel}
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-phone" className="text-xs font-medium">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lead-email" className="text-xs font-medium">
                  E-mail para Envio de Vouchers e Bilhetes
                </Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lead-address" className="text-xs font-medium">
                  Endereço Residencial (para emissão de Nota Fiscal e Seguro)
                </Label>
                <Input
                  id="lead-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número e complemento"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:col-span-2">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="lead-zipcode" className="text-xs font-medium">CEP</Label>
                  <Input
                    id="lead-zipcode"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    placeholder="00000-000"
                    className="h-11 rounded-xl text-base sm:text-xs font-mono"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="lead-city" className="text-xs font-medium">Cidade</Label>
                  <Input
                    id="lead-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="h-11 rounded-xl text-base sm:text-xs"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="lead-state" className="text-xs font-medium">UF</Label>
                  <Input
                    id="lead-state"
                    maxLength={2}
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                    placeholder="SC"
                    className="h-11 rounded-xl text-base sm:text-xs uppercase font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-passport" className="text-xs font-medium">
                  Passaporte (Viagem Internacional)
                </Label>
                <Input
                  id="lead-passport"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                  placeholder="Opcional: BR000000"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-passport-exp" className="text-xs font-medium">
                  Validade do Passaporte
                </Label>
                <Input
                  id="lead-passport-exp"
                  type="date"
                  value={passportExpiryDate}
                  onChange={(e) => setPassportExpiryDate(normalizeDateOnlyInput(e.target.value))}
                  onWheel={blurOnWheel}
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              {passportValidityWarning && (
                <div className="sm:col-span-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 flex items-center gap-2 text-xs font-medium">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{passportValidityWarning}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="lead-emergency-name" className="text-xs font-medium">
                  Contato de Emergência (Nome)
                </Label>
                <Input
                  id="lead-emergency-name"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Pessoa para emergências no Brasil"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-emergency-phone" className="text-xs font-medium">
                  Telefone de Emergência
                </Label>
                <Input
                  id="lead-emergency-phone"
                  type="tel"
                  inputMode="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Lista de Acompanhantes */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span>Acompanhantes e Familiares</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Quem viajará com você ({paxList.length} cadastrado(s))
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openNewPaxModal}
                className="rounded-xl h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>Adicionar</span>
              </Button>
            </div>

            {paxList.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border space-y-2">
                <Users className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  Nenhum acompanhante cadastrado ainda
                </p>
                <p className="text-2xs text-muted-foreground max-w-xs mx-auto">
                  Adicione cônjuge, filhos ou amigos para emissão conjunta dos bilhetes e seguro.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paxList.map((pax, index) => {
                  const age = calculateAgeFromDateOnly(pax.birth_date);
                  return (
                    <div
                      key={pax.id || index}
                      className="p-4 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                          {pax.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {pax.full_name}
                            </span>
                            <Badge variant="outline" className="text-3xs py-0 px-2">
                              {RELATIONSHIP_LABELS[pax.relationship] || "Outro"}
                            </Badge>
                            {age !== null && (
                              <span className="text-2xs text-muted-foreground">{age} anos</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground pt-1">
                            {pax.birth_date && (
                              <span>Nasc: {formatDateOnlyBr(pax.birth_date)}</span>
                            )}
                            {pax.document && <span>CPF: {pax.document}</span>}
                            {pax.rg && <span>RG: {pax.rg}</span>}
                            {pax.passport_number && <span>Passaporte: {pax.passport_number}</span>}
                            {pax.phone && <span>Tel: {pax.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Editar acompanhante"
                          onClick={() => openEditPaxModal(index)}
                          className="size-11 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remover acompanhante"
                          onClick={() => handleRemovePax(index)}
                          className="size-11 text-muted-foreground hover:text-rose-500 rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 4: Upload de Documentos Ligados ao Cadastro do Cliente */}
          <div
            ref={docsSectionRef}
            id="documentos-passageiros"
            className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span>Documentos Digitalizados</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Envie fotos ou PDFs de RG, CNH, Passaporte, Visto ou Cartão de Vacina. Os arquivos ficam vinculados diretamente à ficha do viajante na agência.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Passageiro</Label>
                  <Select value={docTravelerId} onValueChange={setDocTravelerId}>
                    <SelectTrigger className="h-11 rounded-xl text-base sm:text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {travelerChoices.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tipo de Documento</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="h-11 rounded-xl text-base sm:text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {PUBLIC_DOC_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-upload-number" className="text-xs font-medium">
                    Número do Documento (Opcional)
                  </Label>
                  <Input
                    id="doc-upload-number"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="Ex: BR123456 ou 0000000"
                    className="h-11 rounded-xl text-base sm:text-xs bg-card font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-upload-expires" className="text-xs font-medium">
                    Data de Validade (Opcional)
                  </Label>
                  <Input
                    id="doc-upload-expires"
                    type="date"
                    value={docExpiresAt}
                    onChange={(e) => setDocExpiresAt(normalizeDateOnlyInput(e.target.value))}
                    onWheel={blurOnWheel}
                    className="h-11 rounded-xl text-base sm:text-xs bg-card"
                  />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleUploadDocumentFile}
              />

              <Button
                type="button"
                variant="outline"
                disabled={isUploadingDoc}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold gap-2 border-dashed border-primary/40 bg-card hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isUploadingDoc ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Enviando arquivo para o cofre seguro...</span>
                  </>
                ) : (
                  <>
                    <Upload className="size-4 text-primary" />
                    <span>Selecionar Foto ou PDF do Documento (até 15 MB)</span>
                  </>
                )}
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border space-y-2">
                <FileText className="size-7 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  Nenhum documento enviado ainda
                </p>
                <p className="text-2xs text-muted-foreground">
                  Você pode anexar agora ou enviar posteriormente pelo mesmo link.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const typeLabel =
                    PUBLIC_DOC_TYPE_OPTIONS.find((t) => t.value === doc.doc_type)?.label ||
                    doc.doc_type ||
                    "Documento";
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {doc.title || typeLabel}
                          </span>
                          {doc.expiryStatus === "expired" && (
                            <Badge variant="destructive" className="text-3xs py-0 h-4">
                              VENCIDO
                            </Badge>
                          )}
                          {doc.expiryStatus === "soon" && (
                            <Badge variant="secondary" className="text-3xs py-0 h-4 bg-warning/20 text-warning-strong">
                              VENCE EM BREVE
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                          {doc.traveler_name && <span>Viajante: {doc.traveler_name}</span>}
                          {doc.doc_number && <span className="font-mono">Nº {doc.doc_number}</span>}
                          {doc.expires_at && <span>Validade: {formatDateOnlyBr(doc.expires_at)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Visualizar documento"
                            className="inline-flex items-center justify-center size-11 rounded-xl text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remover documento"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="size-11 text-muted-foreground hover:text-rose-500 rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 5: Saúde, Acessibilidade & Restrições */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <HeartPulse className="size-4 text-rose-500" />
                <span>Acessibilidade e Cuidados Especiais</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Informações essenciais para reserva de assentos, hotéis acessíveis e assistência aeroportuária.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-3 min-h-11 p-3 rounded-xl border border-border/60 bg-muted/40 cursor-pointer hover:border-primary/40 transition-colors">
                <Checkbox
                  checked={pcd}
                  onCheckedChange={(c) => setPcd(Boolean(c))}
                />
                <span className="text-xs font-medium text-foreground">Passageiro PCD</span>
              </label>

              <label className="flex items-center gap-3 min-h-11 p-3 rounded-xl border border-border/60 bg-muted/40 cursor-pointer hover:border-primary/40 transition-colors">
                <Checkbox
                  checked={reducedMobility}
                  onCheckedChange={(c) => setReducedMobility(Boolean(c))}
                />
                <span className="text-xs font-medium text-foreground">Mobilidade Reduzida</span>
              </label>

              <label className="flex items-center gap-3 min-h-11 p-3 rounded-xl border border-border/60 bg-muted/40 cursor-pointer hover:border-primary/40 transition-colors">
                <Checkbox
                  checked={autism}
                  onCheckedChange={(c) => setAutism(Boolean(c))}
                />
                <span className="text-xs font-medium text-foreground">Espectro Autista (TEA)</span>
              </label>
            </div>

            <div className="space-y-2 pt-1">
              <Label htmlFor="lead-health-notes" className="text-xs font-medium">
                Observações de Saúde, Alergias ou Preferências Alimentares
              </Label>
              <Textarea
                id="lead-health-notes"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="Ex: Alergia a frutos do mar, necessidade de cadeira de rodas no aeroporto, quarto no térreo..."
                className="text-base sm:text-xs rounded-xl resize-none min-h-24"
                rows={3}
              />
            </div>
          </div>

          {/* Seção 6: Termo LGPD & Consentimento */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">
                Termo de Proteção de Dados (LGPD)
              </h3>
            </div>

            <p className="text-2xs text-muted-foreground leading-relaxed">
              Em cumprimento à Lei nº 13.709/2018 (LGPD), seus dados, documentos e os dos acompanhantes serão utilizados estritamente para cotação, emissão de bilhetes, reservas e seguros de viagem.
            </p>

            <label className="flex items-start gap-3 min-h-11 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer">
              <Checkbox
                checked={lgpdAccepted}
                onCheckedChange={(c) => setLgpdAccepted(Boolean(c))}
                className="mt-1"
              />
              <span className="text-xs font-medium text-foreground leading-snug">
                Autorizo a coleta e o tratamento das informações e documentos acima para organização da viagem.
              </span>
            </label>
          </div>
        </form>

        {/* Rodapé institucional silencioso (acima da barra fixa) */}
        <footer className="text-center text-2xs text-muted-foreground/70 py-4">
          Plataforma Segura Waesy · Central do Passageiro
        </footer>
      </div>

      {/* Barra Fixa Inferior de Ação (z-30 < Dialog z-50, nunca sobrepõe o conteúdo graças a pb-36 pb-safe) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:flex flex-col text-left min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {paxList.length + 1} viajante(s) · {documents.length} documento(s)
            </span>
            <span className="text-2xs text-muted-foreground truncate">
              {formattedTravelPeriod}
            </span>
          </div>

          <Button
            type="submit"
            form="public-lead-intake-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:min-w-60 h-11 min-h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Salvando Ficha...</span>
              </>
            ) : (
              <>
                <Send className="size-4" />
                <span>Enviar Preferências à Agência</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal para Adicionar / Editar Passageiro */}
      <Dialog open={isPaxModalOpen} onOpenChange={setIsPaxModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 max-h-modal overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingPaxIndex !== null ? "Editar Acompanhante" : "Adicionar Acompanhante"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome Completo *</Label>
              <Input
                value={paxForm.full_name}
                onChange={(e) =>
                  setPaxForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Nome completo conforme documento"
                className="h-11 rounded-xl text-base sm:text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Parentesco</Label>
                <Select
                  value={paxForm.relationship}
                  onValueChange={(val) =>
                    setPaxForm((prev) => ({ ...prev, relationship: val }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl text-base sm:text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="spouse" className="text-xs">Cônjuge</SelectItem>
                    <SelectItem value="child" className="text-xs">Filho(a)</SelectItem>
                    <SelectItem value="parent" className="text-xs">Pai / Mãe</SelectItem>
                    <SelectItem value="friend" className="text-xs">Amigo(a)</SelectItem>
                    <SelectItem value="other" className="text-xs">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={paxForm.birth_date}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, birth_date: normalizeDateOnlyInput(e.target.value) }))
                  }
                  onWheel={blurOnWheel}
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">CPF</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={paxForm.document}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, document: maskCpfProgressive(e.target.value) }))
                  }
                  placeholder="000.000.000-00"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">RG (Identidade)</Label>
                <Input
                  type="text"
                  value={paxForm.rg || ""}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, rg: e.target.value }))
                  }
                  placeholder="Nº RG"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Telefone / WhatsApp</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={paxForm.phone}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                  }
                  placeholder="(00) 00000-0000"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">E-mail</Label>
                <Input
                  type="email"
                  value={paxForm.email || ""}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Passaporte</Label>
                <Input
                  type="text"
                  value={paxForm.passport_number || ""}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, passport_number: e.target.value.toUpperCase() }))
                  }
                  placeholder="Opcional"
                  className="h-11 rounded-xl text-base sm:text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Validade Passaporte</Label>
                <Input
                  type="date"
                  value={paxForm.passport_expiry_date || ""}
                  onChange={(e) =>
                    setPaxForm((prev) => ({ ...prev, passport_expiry_date: normalizeDateOnlyInput(e.target.value) }))
                  }
                  onWheel={blurOnWheel}
                  className="h-11 rounded-xl text-base sm:text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaxModalOpen(false)}
              className="h-11 min-h-11 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSavePax}
              className="h-11 min-h-11 rounded-xl text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              {editingPaxIndex !== null ? "Salvar Alterações" : "Adicionar à Lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
