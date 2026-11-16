import { useState } from "react";
import { Check, Copy, Globe, Server, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildGoDaddyDnsRecordsForSubsystems,
  type VerticalSubsystemDescriptor,
} from "@/lib/vertical-subsystems";

interface GoDaddyDnsGuideCardProps {
  subsystems: VerticalSubsystemDescriptor[];
  pagesOrigin?: string;
}

export function GoDaddyDnsGuideCard({
  subsystems,
  pagesOrigin = "usewaesy.pages.dev",
}: GoDaddyDnsGuideCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const records = buildGoDaddyDnsRecordsForSubsystems(subsystems, pagesOrigin);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Valor copiado para a área de transferência.");
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Server className="size-4 text-primary" />
            <span>Guia GoDaddy + Cloudflare Pages</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Siga esta ordem para ativar todos os subdomínios com SSL automático e sessão unificada.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs w-fit">
          Destino: {pagesOrigin}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-2 text-xs">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <span>Opção A — Recomendada (DNS na Cloudflare)</span>
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-muted-foreground leading-relaxed">
            <li>Crie a zona gratuita de <span className="font-mono text-foreground">waesy.com.br</span> no painel Cloudflare.</li>
            <li>Na GoDaddy, troque os 2 Nameservers pelos nameservers informados pela Cloudflare.</li>
            <li>No Cloudflare DNS, crie CNAME para <span className="font-mono text-foreground">@</span>, <span className="font-mono text-foreground">www</span> e cada subdomínio apontando para <span className="font-mono text-foreground">{pagesOrigin}</span> (Proxy laranja ativo).</li>
            <li>Em Cloudflare SSL/TLS, marque <span className="font-semibold text-foreground">Full (strict)</span> e adicione cada subdomínio em Pages &gt; usewaesy &gt; Custom Domains.</li>
          </ol>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-2 text-xs">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Opção B — Direto no DNS da GoDaddy + Auth</span>
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-muted-foreground leading-relaxed">
            <li>Na GoDaddy &gt; Meus Produtos &gt; DNS de <span className="font-mono text-foreground">waesy.com.br</span>, adicione um registro <span className="font-semibold text-foreground">CNAME</span> por subdomínio da tabela abaixo.</li>
            <li>Para o domínio raiz (<span className="font-mono text-foreground">@</span>), use Forwarding 301 para <span className="font-mono text-foreground">https://www.waesy.com.br</span> caso a GoDaddy não aceite CNAME no ápice.</li>
            <li>No Supabase Auth &gt; URL Configuration &gt; Redirect URLs, cadastre <span className="font-mono text-foreground">https://*.waesy.com.br/**</span> para login único (SSO) entre apps.</li>
          </ol>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 overflow-x-auto table-scroll-area">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase text-2xs font-semibold border-b border-border/60">
            <tr>
              <th className="p-3">Tipo</th>
              <th className="p-3">Nome / Host</th>
              <th className="p-3">Valor / Aponta para</th>
              <th className="p-3">Subsistemas / Uso</th>
              <th className="p-3 text-right">Copiar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {records.map((rec) => {
              const rowKey = `${rec.type}-${rec.host}`;
              const copyPayload = `${rec.type} ${rec.host} -> ${rec.value}`;
              return (
                <tr key={rowKey} className="hover:bg-muted/20">
                  <td className="p-3 font-mono font-semibold text-foreground">{rec.type}</td>
                  <td className="p-3 font-mono text-primary font-semibold">{rec.host}</td>
                  <td className="p-3 font-mono text-foreground">{rec.value}</td>
                  <td className="p-3 text-muted-foreground">{rec.purpose}</td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(rowKey, copyPayload)}
                      className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {copiedKey === rowKey ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      <span>{copiedKey === rowKey ? "Copiado" : "Copiar"}</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
