import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe,
  Server,
  Mail,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";

export interface HostingDomainConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  storeName: string;
  currentCustomDomain?: string | null;
  onConnectCustomDomain?: (domain: string) => Promise<void>;
}

export const HostingDomainConnectContent: React.FC<Omit<HostingDomainConnectModalProps, "isOpen" | "onClose">> = ({
  storeSlug,
  storeName,
  currentCustomDomain,
  onConnectCustomDomain,
}) => {
  const [activeTab, setActiveTab] = useState<"subdomain" | "custom" | "email">("subdomain");
  const [customDomainInput, setCustomDomainInput] = useState(currentCustomDomain || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);

  const freeUrl = `https://${storeSlug || "sua-loja"}.waesy.com.br`;

  const handleCopySubdomain = async () => {
    try {
      await navigator.clipboard.writeText(freeUrl);
      setCopiedSubdomain(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopiedSubdomain(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleanDomain || cleanDomain.length < 4 || !cleanDomain.includes(".")) {
      toast.error("Informe um domínio válido (ex: meusite.com.br)");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onConnectCustomDomain) {
        await onConnectCustomDomain(cleanDomain);
      }
      toast.success(`Domínio ${cleanDomain} registrado com sucesso para provisionamento!`);
      setActiveTab("custom");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar domínio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Globe className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Domínios & Hospedagem
            </h2>
            <p className="text-xs text-muted-foreground">
              Gerencie a publicação do site e contas de e-mail corporativo de {storeName}.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Seleção de Abas (Horizontal e Acessível) */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/60 mt-2">
        <button
          type="button"
          onClick={() => setActiveTab("subdomain")}
          className={`flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === "subdomain"
              ? "bg-background text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="size-3.5" />
          Link Grátis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={`flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === "custom"
              ? "bg-background text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Server className="size-3.5" />
          Domínio Próprio
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === "email"
              ? "bg-background text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="size-3.5" />
          E-mails
        </button>
      </div>

      {/* Conteúdo Aba 1: Link Grátis */}
      {activeTab === "subdomain" && (
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Endereço Web Ativo</span>
              <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pronto para Acessar
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={freeUrl}
                className="h-11 min-h-11 text-xs font-mono bg-background border-border"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopySubdomain}
                className="h-11 min-h-11 px-4 gap-2 text-xs font-medium shrink-0 focus-visible:ring-2"
              >
                {copiedSubdomain ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                {copiedSubdomain ? "Copiado" : "Copiar"}
              </Button>
              <a
                href={freeUrl}
                target="_blank"
                rel="noreferrer"
                className="h-11 min-h-11 px-3.5 rounded-md border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Abrir em nova aba"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              Certificado SSL gratuito pré-instalado com entrega em alta velocidade e cache global automático.
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Domínio Próprio na Hospedagem */}
      {activeTab === "custom" && (
        <form onSubmit={handleSaveDomain} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="custom-domain-field" className="text-xs font-semibold text-foreground">
              Seu Domínio Personalizado
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="custom-domain-field"
                placeholder="ex: meusite.com.br"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                className="h-11 min-h-11 text-sm bg-background border-border"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 min-h-11 px-5 text-xs font-semibold shrink-0 focus-visible:ring-2"
              >
                {isSubmitting ? "Vinculando..." : "Conectar"}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
            <p className="text-xs font-bold text-foreground">
              Apontamento DNS Master da Hospedagem (LiteSpeed SSD):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground block text-[10px] font-sans font-medium uppercase">DNS Primário</span>
                <span className="font-bold text-foreground">ns1.cloudweby.com</span>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground block text-[10px] font-sans font-medium uppercase">DNS Secundário</span>
                <span className="font-bold text-foreground">ns2.cloudweby.com</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ao alterar os nameservers no Registro.br ou provedor do domínio, a hospedagem assume o tráfego do site, ativa SSL Let's Encrypt automático e libera a criação de e-mails corporativos.
            </p>
          </div>
        </form>
      )}

      {/* Conteúdo Aba 3: E-mails Corporativos */}
      {activeTab === "email" && (
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Mail className="size-4 text-primary" />
              <span>E-mails Ilimitados Inclusos na Hospedagem</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cada domínio próprio vinculado à sua hospedagem conta com criação ilimitada de caixas postais corporativas (ex: contato@{customDomainInput || "seusite.com.br"}).
            </p>
            <div className="p-3 rounded-lg bg-background border border-border text-xs space-y-1.5">
              <p className="font-semibold text-foreground">Recursos do CloudMail:</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
                <li>Interface webmail limpa e responsiva</li>
                <li>Compatível com Outlook, Apple Mail e Gmail (POP3 / IMAP / SMTP)</li>
                <li>Proteção antispam inteligente e criptografia SSL/TLS ativa</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const HostingDomainConnectModal: React.FC<HostingDomainConnectModalProps> = ({
  isOpen,
  onClose,
  ...contentProps
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border/80 shadow-2xl rounded-2xl z-50">
        <HostingDomainConnectContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
};
