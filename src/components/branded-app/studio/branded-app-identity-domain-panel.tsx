import { Globe, ShieldCheck, Users, MapPin } from "@phosphor-icons/react";
import { ImageUpload, type AppIconBundleUrls } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HostingDomainConnectContent } from "@/components/builder/HostingDomainConnectModal";
import { TOKEN_HEX } from "@/lib/design-tokens";
import type { AppEntryAnimation, PublishedOmniDocumentDTO } from "@/types/branded-app";

export interface BrandedAppIdentityDomainPanelProps {
  storeId: string;
  storeSlug: string;
  storeName: string;
  appName: string;
  onAppNameChange: (val: string) => void;
  shortName: string;
  onShortNameChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  themeColor: string;
  onThemeColorChange: (val: string) => void;
  backgroundColor: string;
  onBackgroundColorChange: (val: string) => void;
  logoSquareUrl: string | null;
  onLogoSquareUrlChange: (val: string | null) => void;
  coverUrl: string | null;
  onCoverUrlChange: (val: string | null) => void;
  onIconBundleUploaded: (urls: AppIconBundleUrls) => void;
  entryAnimation: AppEntryAnimation;
  onEntryAnimationChange: (val: AppEntryAnimation) => void;
  displayMode: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  onDisplayModeChange: (val: "standalone" | "fullscreen" | "minimal-ui" | "browser") => void;
  customDomain: string;
  onCustomDomainChange: (val: string) => void;
  customDomainStatus: string;
  onCustomDomainStatusChange: (val: string) => void;
  omniPageId: string | null;
  onOmniPageIdChange: (val: string | null) => void;
  omniDocuments: PublishedOmniDocumentDTO[];
  allowCustomerSelfSignup: boolean;
  onAllowCustomerSelfSignupChange: (val: boolean) => void;
  cityTargetingEnabled: boolean;
  onCityTargetingEnabledChange: (val: boolean) => void;
}

export function BrandedAppIdentityDomainPanel({
  storeId,
  storeSlug,
  storeName,
  appName,
  onAppNameChange,
  shortName,
  onShortNameChange,
  description,
  onDescriptionChange,
  themeColor,
  onThemeColorChange,
  backgroundColor,
  onBackgroundColorChange,
  logoSquareUrl,
  onLogoSquareUrlChange,
  coverUrl,
  onCoverUrlChange,
  onIconBundleUploaded,
  entryAnimation,
  onEntryAnimationChange,
  displayMode,
  onDisplayModeChange,
  customDomain,
  onCustomDomainChange,
  customDomainStatus,
  onCustomDomainStatusChange,
  omniPageId,
  onOmniPageIdChange,
  omniDocuments,
  allowCustomerSelfSignup,
  onAllowCustomerSelfSignupChange,
  cityTargetingEnabled,
  onCityTargetingEnabledChange,
}: BrandedAppIdentityDomainPanelProps) {
  const safeThemeHex = themeColor?.startsWith("#") ? themeColor : TOKEN_HEX.neutral900;
  const safeBgHex = backgroundColor?.startsWith("#") ? backgroundColor : TOKEN_HEX.white;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-foreground">
            Logo Oficial &amp; Recorte Proporcional (192px, 512px e Maskable)
          </h2>
          <p className="text-xs text-muted-foreground">
            Envie ou recorte sua marca com margem de segurança para nunca cortar o ícone na tela inicial do celular.
          </p>
          <ImageUpload
            value={logoSquareUrl || ""}
            onChange={(url) => onLogoSquareUrlChange(url)}
            bucket="store-assets"
            aspectPreset="square"
            appLogoMode
            initialLogoBgColor={safeBgHex}
            onAppIconBundleUploaded={onIconBundleUploaded}
            label="Recortar Logo do App"
            helperText="Gera automaticamente ícone quadrado, 192x192, 512x512 e Maskable"
          />

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold">Capa Principal do App (21:9)</Label>
            <ImageUpload
              value={coverUrl || ""}
              onChange={(url) => onCoverUrlChange(url)}
              bucket="store-assets"
              aspectPreset="banner"
              label="Enviar Capa do Topo"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-foreground">
            Identidade, Cores &amp; Comportamento do Aplicativo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nome do App</Label>
              <Input
                value={appName}
                onChange={(e) => onAppNameChange(e.target.value)}
                className="h-11 min-h-11 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nome Curto (Tela Inicial)</Label>
              <Input
                value={shortName}
                onChange={(e) => onShortNameChange(e.target.value)}
                maxLength={24}
                className="h-11 min-h-11 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Descrição Curta do Aplicativo</Label>
            <Input
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Ex: Catálogo oficial, pedidos e atendimento direto."
              className="h-11 min-h-11 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Cor da Marca</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={safeThemeHex}
                  onChange={(e) => onThemeColorChange(e.target.value)}
                  className="size-11 rounded-xl border border-border cursor-pointer shrink-0"
                />
                <Input
                  value={themeColor}
                  onChange={(e) => onThemeColorChange(e.target.value)}
                  className="h-11 min-h-11 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Cor de Fundo da Abertura</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={safeBgHex}
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  className="size-11 rounded-xl border border-border cursor-pointer shrink-0"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  className="h-11 min-h-11 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Animação de Entrada (Splash)</Label>
              <Select
                value={entryAnimation}
                onValueChange={(v) => onEntryAnimationChange(v as AppEntryAnimation)}
              >
                <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">Pulso Suave</SelectItem>
                  <SelectItem value="bounce">Salto Dinâmico</SelectItem>
                  <SelectItem value="fade">Fade Minimalista</SelectItem>
                  <SelectItem value="slide_up">Deslizar para Cima</SelectItem>
                  <SelectItem value="none">Desativada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Modo de Exibição</Label>
              <Select
                value={displayMode}
                onValueChange={(v) => onDisplayModeChange(v as any)}
              >
                <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">App Nativo (Standalone)</SelectItem>
                  <SelectItem value="fullscreen">Tela Cheia</SelectItem>
                  <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                  <SelectItem value="browser">Navegador Padrão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Página Inicial Avançada (Omni Builder Opcional)</Label>
            <Select
              value={omniPageId || "__none__"}
              onValueChange={(val) => onOmniPageIdChange(val === "__none__" ? null : val)}
            >
              <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                <SelectValue placeholder="Usar apenas seções modulares" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Usar apenas seções modulares padrão</SelectItem>
                {omniDocuments.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title} ({doc.slug || "página"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" weight="bold" />
                  <span>Cadastro no App</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Permitir autocadastro de clientes
                </p>
              </div>
              <Switch
                checked={allowCustomerSelfSignup}
                onCheckedChange={onAllowCustomerSelfSignupChange}
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-primary" weight="bold" />
                  <span>Filtro por Cidade</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Ativar segmentação georreferenciada
                </p>
              </div>
              <Switch
                checked={cityTargetingEnabled}
                onCheckedChange={onCityTargetingEnabledChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Domínio Próprio & Assistente DNS Integrado */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Globe className="size-4 text-primary" weight="bold" />
              <span>Domínio Próprio (White-Label na Raiz /)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Quando apontado e verificado, seu App carrega diretamente em <code>https://seudominio.com.br/</code> sem mencionar a Waesy.
            </p>
          </div>
          <Badge variant={customDomainStatus === "active" ? "secondary" : "outline"} className="gap-2">
            <ShieldCheck className="size-3.5" weight="bold" />
            <span>Status: {customDomainStatus || "pending_dns"}</span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs font-bold">Domínio / Subdomínio Próprio</Label>
            <Input
              value={customDomain}
              onChange={(e) => onCustomDomainChange(e.target.value)}
              placeholder="app.suaempresa.com.br"
              className="h-11 min-h-11 rounded-xl text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold">Estado de Propagação DNS</Label>
            <Select
              value={customDomainStatus || "pending_dns"}
              onValueChange={onCustomDomainStatusChange}
            >
              <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_dns">Aguardando DNS (pending_dns)</SelectItem>
                <SelectItem value="verifying">Em verificação</SelectItem>
                <SelectItem value="active">Ativo / Publicado na Raiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <HostingDomainConnectContent
            storeSlug={storeSlug}
            storeName={storeName}
            storeId={storeId}
            currentCustomDomain={customDomain}
            onConnectCustomDomain={async (domain) => {
              onCustomDomainChange(domain);
              onCustomDomainStatusChange("pending_dns");
            }}
          />
        </div>
      </div>
    </div>
  );
}
