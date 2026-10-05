# Relatório de Investigação Forense: Erradicação Completa de Mocks, Placeholders e Unsplash (M1_3)

| Metadado | Detalhe |
|---|---|
| **Agente** | Explorer M1_3 (Mock & Unsplash Eradication Plan) |
| **Data** | 2026-10-03 |
| **Status** | Concluído (Hard Handoff) |
| **Escopo** | `MediaUploader.tsx:180`, `proposals.ts:139-197`, `proposal-storage.ts:51-72`, `StudioUnsplashPicker.tsx`, `SectionCover.tsx`, `SectionHotels.tsx`, `SectionItinerary.tsx`, `workspace.turismo.hoteis.tsx:1584` |

---

## 1. Observation (Observações Diretas e Evidências Empíricas)

### 1.1 `src/components/admin/builder/MediaUploader.tsx:180`
- **Linha 180**:
  ```tsx
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).src =
      "https://placehold.co/600x400/18181b/ffffff?text=Imagem+Indispon%C3%ADvel";
  }}
  ```
- **Problema**: Realiza requisição de rede externa para o serviço de terceiros `placehold.co` em tempo de execução quando a imagem falha ao carregar. Viola a regra B.1 de erradicação de dependências de mockup externas e gera risco de quebra quando offline ou bloqueado por firewalls.
- **Linha 23**: `const PRESET_DEMO_IMAGES: Array<{ label: string; url: string }> = [];` — array vazio associado a botão de "Exemplos" (linhas 251-288) que abre menu de presets sem itens.

### 1.2 `src/services/proposals.ts` (Linhas 139–197)
- **Linhas 139–156**: Declaração do tipo público `UnsplashPhoto`.
- **Linhas 161–197**: Implementação ativa de `searchUnsplash(query: string)` que executa `fetch` contra endpoint público:
  ```ts
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${clean}&per_page=16&orientation=landscape`, {
    headers: {
      Authorization: "Client-ID vK-9626D2bE9m4eE40eK47nU89X9Q_v88jX2o4wU07E",
    },
  });
  ```
- **Problema**: Credencial de API do Unsplash exposta no código frontend (`vK-9626D2bE9m4eE40eK47nU89X9Q_v88jX2o4wU07E`) e busca externa violando a diretriz de soberania de dados e zero dependências de fotos de banco de imagens gratuitas.

### 1.3 `src/services/proposal-storage.ts` (Linhas 48–72)
- **Linhas 51–72**: Função `saveUnsplashImageToStorage`:
  ```ts
  export async function saveUnsplashImageToStorage(
    _agencyId: string,
    _proposalId: string,
    slotOrUrl: string,
    imageUrl?: string,
    _itemId?: string
  ): Promise<string> {
    const actualUrl = (imageUrl || slotOrUrl) || "";
    if (actualUrl.includes("unsplash.com")) {
      try {
        const urlObj = new URL(actualUrl);
        urlObj.searchParams.set("auto", "format");
        urlObj.searchParams.set("fit", "crop");
        urlObj.searchParams.set("w", "1600");
        urlObj.searchParams.set("q", "80");
        return urlObj.toString();
      } catch {
        return actualUrl;
      }
    }
    return actualUrl;
  }
  ```
- **Problema**: A função declara salvar no storage da agência, mas na verdade apenas reescreve parâmetros de query da URL do Unsplash (`w=1600&q=80`) e retorna a URL externa sem persistir nenhum byte nos buckets do Supabase.

### 1.4 `src/components/tourism/studio/StudioUnsplashPicker.tsx` & Seções Consumidoras
- **`StudioUnsplashPicker.tsx`**: Modal interativo que consome `searchUnsplash` e `saveUnsplashImageToStorage`, exibindo grade de fotos externas do Unsplash com atribuição `📸 {photo.photographer}`.
- **`src/components/studio/StudioUnsplashPicker.tsx`**: Barrel file de 1 linha: `export * from "@/components/tourism/studio/StudioUnsplashPicker";`.
- **`SectionCover.tsx`**:
  - Linha 21: `const [showUnsplashCover, setShowUnsplashCover] = useState(false);`
  - Linhas 105–115: Botão com `title="Buscar no Unsplash"` e ícone `Search`.
  - Linhas 195–219: Bloco que renderiza `<StudioUnsplashPicker slot="cover" ... />`.
- **`SectionHotels.tsx`**:
  - Linha 45: `const [unsplashOpenIndex, setUnsplashOpenIndex] = useState<number | null>(null);`
  - Linhas 231–268: Bloco que renderiza `<StudioUnsplashPicker slot="hotel" ... />` e botão `<Search /> Buscar foto do hotel no Unsplash`.
- **`SectionItinerary.tsx`**:
  - Linha 27: `const [showUnsplash, setShowUnsplash] = useState<number | null>(null);`
  - Linhas 166–173: Botão com `title="Buscar no Unsplash"`.
  - Linhas 190–215: Bloco que renderiza `<StudioUnsplashPicker slot="itinerary-..." ... />`.

### 1.5 `src/routes/workspace.turismo.hoteis.tsx:1584`
- **Linha 1584**:
  ```tsx
  placeholder="Cole a URL da foto (Unsplash ou CDN) ou envie abaixo..."
  ```
- **Problema**: Exibe textualmente a marca "Unsplash" no placeholder de entrada de mídia, induzindo o usuário a buscar imagens em bancos externos.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio)

```
[Observação 1: placehold.co em MediaUploader.tsx:180]
  ↳ Dependência de rede externa instável para erro de imagem
  ↳ Solução: Substituição por State reativo (hasImageError) + SVG / Ícone nativo do Design System (tokens semânticos) + Data URI SVG honesto

[Observação 2: searchUnsplash e Client-ID em proposals.ts]
  ↳ Credencial estática no cliente + consulta à api.unsplash.com
  ↳ Solução: Erradicação de searchUnsplash e UnsplashPhoto; retorno de array vazio defensivo ou expurgo total

[Observação 3: saveUnsplashImageToStorage em proposal-storage.ts]
  ↳ Função simulada que não faz upload, apenas formata URL do Unsplash
  ↳ Solução: Remoção e convergência para uploadProposalMedia / uploadMediaUniversal com storage real

[Observação 4: StudioUnsplashPicker e seções do Studio de Turismo]
  ↳ Seções de Turismo dependem de modal que pesquisa Unsplash
  ↳ Seções já possuem upload nativo para Supabase Storage (uploadMediaUniversal) e entrada de URL
  ↳ Solução: Transformação de StudioUnsplashPicker em StudioAssetPicker (Governança Tripla de Mídia: Upload direto + URL + Ctrl+V) e limpeza dos botões/estados de Unsplash nas seções

[Observação 5: Placeholder em workspace.turismo.hoteis.tsx:1584]
  ↳ String textual induzindo uso de Unsplash
  ↳ Solução: Substituição para texto neutro profissional "Cole a URL direta da imagem (HTTPS) ou envie abaixo..."
```

---

## 3. Caveats (Ressalvas e Limitações do Diagnóstico)

1. **Fixtures de Teste**: Existem referências a `images.unsplash.com` em arquivos de teste unitário (`src/components/chat/structured-chat.test.ts:44`, `src/services/integrated-enhancements-phase16.test.ts:86`, `src/services/multimodal-onboarding.test.ts:49`, `src/services/market-radar.test.ts:22`). Estes arquivos são fixtures de teste locais e não impactam a execução em produção, mas podem ser higienizados em momento oportuno.
2. **Gatilhos de Proteção Anti-Unsplash Ativos**: Os arquivos `src/services/mining/integrity-gate.ts`, `src/services/mining.functions.ts`, `src/services/news.functions.ts` e `src/services/surface-cms.functions.ts` possuem filtros intencionais que bloqueiam o domínio `unsplash.com`. Esses filtros **NÃO DEVEM SER REMOVIDOS**, pois são barreiras ativas de proteção de integridade.
3. **Restrição Absoluta de Execução**: Não foram executados `npm run typecheck` ou `npm run build`, conforme restrição mandatória. Os diffs foram elaborados por análise estática estrita de tipos e contratos de interface.

---

## 4. Conclusion & Actionable Fix Strategy (Plano de Ação e Diffs Precisos)

### 4.1 Diff 1: `src/components/admin/builder/MediaUploader.tsx`
Substitui a URL de `placehold.co` por estado de erro honesto com ícone Lucide nativo e fallback de SVG inline silencioso em Data URI sem dependência de rede:

```diff
--- a/src/components/admin/builder/MediaUploader.tsx
+++ b/src/components/admin/builder/MediaUploader.tsx
@@ -37,6 +37,7 @@ export function MediaUploader({
   const [isUploading, setIsUploading] = useState(false);
   const [activeMode, setActiveMode] = useState<"upload" | "url">("upload");
   const [showPresets, setShowPresets] = useState(false);
+  const [hasImageError, setHasImageError] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
+  React.useEffect(() => {
+    setHasImageError(false);
+  }, [value]);
+
@@ -171,14 +176,19 @@ export function MediaUploader({
   {isVideo ? (
     <video src={value} className="w-full h-full object-cover rounded-lg" muted />
+  ) : hasImageError ? (
+    <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center select-none" role="status">
+      <ImageIcon className="size-8 stroke-[1.5] text-muted-foreground/60" />
+      <span className="text-[11px] font-medium text-muted-foreground">Imagem indisponível</span>
+    </div>
   ) : (
     <img
       src={value}
       alt="Media preview"
       className="max-h-30 w-auto max-w-full object-contain rounded-lg shadow-2xs"
-      onError={(e) => {
-        (e.currentTarget as HTMLImageElement).src =
-          "https://placehold.co/600x400/18181b/ffffff?text=Imagem+Indispon%C3%ADvel";
-      }}
+      onError={() => {
+        setHasImageError(true);
+      }}
     />
   )}
```

---

### 4.2 Diff 2: `src/services/proposals.ts`
Expurgo total da integração com Unsplash e remoção de credencial exposta:

```diff
--- a/src/services/proposals.ts
+++ b/src/services/proposals.ts
@@ -139,59 +139,12 @@ export type Proposal = {
-export type UnsplashPhoto = {
-  id: string;
-  urls: {
-    regular: string;
-    small: string;
-    thumb: string;
-  };
-  alt_description?: string | null;
-  description?: string | null;
-  user: {
-    name: string;
-    username: string;
-  };
-  url_full?: string;
-  url_thumb?: string;
-  alt?: string;
-  photographer?: string;
-};
-
-/**
- * Busca fotos no Unsplash com cache e fallback para imagens de alta resolução
- */
-export async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
-  const clean = encodeURIComponent(query.trim());
-  try {
-    const res = await fetch(`https://api.unsplash.com/search/photos?query=${clean}&per_page=16&orientation=landscape`, {
-      headers: {
-        Authorization: "Client-ID vK-9626D2bE9m4eE40eK47nU89X9Q_v88jX2o4wU07E",
-      },
-    });
-    if (res.ok) {
-      const data = await res.json();
-      if (Array.isArray(data.results) && data.results.length > 0) {
-        return data.results.map((r: any) => ({
-          id: r.id,
-          urls: {
-            regular: r.urls.regular,
-            small: r.urls.small,
-            thumb: r.urls.thumb,
-          },
-          url_full: r.urls.regular,
-          url_thumb: r.urls.thumb,
-          alt: r.alt_description || r.description || "Foto de viagem",
-          photographer: r.user?.name || "Unsplash Creator",
-          alt_description: r.alt_description,
-          description: r.description,
-          user: {
-            name: r.user?.name || "Unsplash Creator",
-            username: r.user?.username || "creator",
-          },
-        }));
-      }
-    }
-  } catch (err) {
-    console.warn("[searchUnsplash] Falha na busca de fotos externas:", err);
-  }
-
-  return [];
-}
```

---

### 4.3 Diff 3: `src/services/proposal-storage.ts`
Remoção da função espúria `saveUnsplashImageToStorage`:

```diff
--- a/src/services/proposal-storage.ts
+++ b/src/services/proposal-storage.ts
@@ -47,26 +47,2 @@ export async function uploadProposalMedia(
-/**
- * Salva uma imagem do Unsplash no storage da agência ou retorna a URL direta
- */
-export async function saveUnsplashImageToStorage(
-  _agencyId: string,
-  _proposalId: string,
-  slotOrUrl: string,
-  imageUrl?: string,
-  _itemId?: string
-): Promise<string> {
-  const actualUrl = (imageUrl || slotOrUrl) || "";
-  if (actualUrl.includes("unsplash.com")) {
-    try {
-      const urlObj = new URL(actualUrl);
-      urlObj.searchParams.set("auto", "format");
-      urlObj.searchParams.set("fit", "crop");
-      urlObj.searchParams.set("w", "1600");
-      urlObj.searchParams.set("q", "80");
-      return urlObj.toString();
-    } catch {
-      return actualUrl;
-    }
-  }
-  return actualUrl;
-}
```

---

### 4.4 Diff 4: `src/components/tourism/studio/StudioUnsplashPicker.tsx`
Refatoração para `StudioAssetPicker` com governança tripla de mídia nativa (Upload Direto ao Bucket + URL Externa + Clipboard Ctrl+V) e empty state honesto:

```diff
--- a/src/components/tourism/studio/StudioUnsplashPicker.tsx
+++ b/src/components/tourism/studio/StudioUnsplashPicker.tsx
@@ -1,131 +1,142 @@
-import { useState, useEffect, useCallback } from "react";
-import { Search, Loader2, Check } from "lucide-react";
-import { searchUnsplash, type UnsplashPhoto } from "@/services/proposals";
-import { saveUnsplashImageToStorage } from "@/services/proposal-storage";
+import { useState, useRef, useEffect, useCallback } from "react";
+import { Upload, Link as LinkIcon, Loader2, Image as ImageIcon, Clipboard } from "lucide-react";
+import { uploadMediaUniversal } from "@/services/storage.functions";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
-import { ScrollArea } from "@/components/ui/scroll-area";
 import { toast } from "sonner";
 
 type Props = {
   agencyId: string;
   proposalId: string;
   slot: string;
-  itemId?: string; // used if it's a specific hotel or tour
+  itemId?: string;
   onImageSelected: (url: string) => void;
   defaultQuery?: string;
 };
 
-export function StudioUnsplashPicker({
+export function StudioAssetPicker({
   agencyId,
   proposalId,
   slot,
-  itemId,
   onImageSelected,
-  defaultQuery = "travel destination",
 }: Props) {
-  const [query, setQuery] = useState(defaultQuery);
-  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
-  const [loading, setLoading] = useState(false);
-  const [savingId, setSavingId] = useState<string | null>(null);
+  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
+  const [externalUrl, setExternalUrl] = useState("");
+  const [uploading, setUploading] = useState(false);
+  const fileInputRef = useRef<HTMLInputElement>(null);
 
-  const handleSearch = useCallback(async () => {
-    if (!query) return;
-    setLoading(true);
+  const processFile = useCallback(async (file: File) => {
+    if (!file.type.startsWith("image/")) {
+      toast.error("Por favor, selecione um arquivo de imagem.");
+      return;
+    }
+    setUploading(true);
     try {
-      const results = await searchUnsplash(query);
-      setPhotos(results);
-    } catch (e) {
-      toast.error("Erro ao buscar imagens.");
+      const base64Data = await new Promise<string>((resolve, reject) => {
+        const reader = new FileReader();
+        reader.onload = () => resolve(reader.result as string);
+        reader.onerror = reject;
+        reader.readAsDataURL(file);
+      });
+      const res = await uploadMediaUniversal({
+        data: {
+          fileName: file.name,
+          fileType: file.type,
+          base64Data,
+          bucket: "public_media",
+          folder: `proposals/${agencyId || "general"}/${proposalId || "assets"}/${slot}`,
+        },
+      });
+      if (res?.url) {
+        onImageSelected(res.url);
+        toast.success("Imagem enviada com sucesso!");
+      }
+    } catch (err: any) {
+      toast.error(`Falha no upload: ${err?.message || "Erro desconhecido"}`);
     } finally {
-      setLoading(false);
+      setUploading(false);
     }
-  }, [query]);
+  }, [agencyId, proposalId, slot, onImageSelected]);
 
-  useEffect(() => {
-    handleSearch();
-  }, [handleSearch]);
+  const handlePaste = useCallback((e: React.ClipboardEvent) => {
+    const items = e.clipboardData?.items;
+    if (!items) return;
+    for (let i = 0; i < items.length; i++) {
+      if (items[i].type.indexOf("image") !== -1) {
+        const file = items[i].getAsFile();
+        if (file) {
+          e.preventDefault();
+          processFile(file);
+          return;
+        }
+      }
+    }
+  }, [processFile]);
 
-  async function handleSelect(photo: UnsplashPhoto) {
-    setSavingId(photo.id);
-    try {
-      const savedUrl = await saveUnsplashImageToStorage(
-        agencyId,
-        proposalId,
-        slot,
-        photo.url_full,
-        itemId,
-      );
-      onImageSelected(savedUrl);
-      toast.success("Imagem aplicada com sucesso!");
-    } catch (error) {
-      toast.error("Erro ao salvar imagem do Unsplash.");
-    } finally {
-      setSavingId(null);
-    }
+  function handleApplyUrl() {
+    const trimmed = externalUrl.trim();
+    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
+      toast.error("Insira uma URL válida iniciando com https://");
+      return;
+    }
+    onImageSelected(trimmed);
+    setExternalUrl("");
+    toast.success("URL de mídia aplicada!");
   }
 
   return (
-    <div className="flex flex-col gap-4 h-[400px]">
-      <div className="flex gap-2">
-        <Input
-          placeholder="Buscar no Unsplash..."
-          value={query}
-          onChange={(e) => setQuery(e.target.value)}
-          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
-          className="bg-surface/50"
-        />
-        <Button onClick={handleSearch} disabled={loading} size="icon" variant="secondary">
-          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
-        </Button>
-      </div>
+    <div className="flex flex-col gap-3 p-1" onPaste={handlePaste} tabIndex={0}>
+      <div className="flex gap-1 border-b border-border/60 pb-2">
+        <Button
+          type="button"
+          size="sm"
+          variant={activeTab === "upload" ? "default" : "ghost"}
+          onClick={() => setActiveTab("upload")}
+          className="text-xs h-8 gap-1.5"
+        >
+          <Upload className="size-3.5" /> Enviar Arquivo
+        </Button>
+        <Button
+          type="button"
+          size="sm"
+          variant={activeTab === "url" ? "default" : "ghost"}
+          onClick={() => setActiveTab("url")}
+          className="text-xs h-8 gap-1.5"
+        >
+          <LinkIcon className="size-3.5" /> URL Direta
+        </Button>
+      </div>
 
-      <ScrollArea className="flex-1 -mx-2 px-2">
-        {loading && photos.length === 0 ? (
-          <div className="flex justify-center py-8 text-muted-foreground">
-            <Loader2 className="h-6 w-6 animate-spin" />
-          </div>
-        ) : photos.length === 0 ? (
-          <div className="text-center py-8 text-sm text-muted-foreground">
-            Nenhuma imagem encontrada.
-          </div>
-        ) : (
-          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
-            {photos.map((photo) => (
-              <div
-                key={photo.id}
-                className="group relative aspect-video cursor-pointer overflow-hidden rounded-full bg-muted"
-                onClick={() => !savingId && handleSelect(photo)}
-              >
-                <img
-                  src={photo.url_thumb}
-                  alt={photo.alt}
-                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
-                />
-
-                {/* Overlay on hover */}
-                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
-                  <div className="flex justify-end">
-                    <span className="text-[9px] text-white/80 font-medium">
-                      📸 {photo.photographer}
-                    </span>
-                  </div>
-                  <span className="ds-meta font-medium text-white flex items-center justify-center h-6 w-full bg-primary/90 rounded-full scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all">
-                    Usar Imagem
-                  </span>
-                </div>
-
-                {savingId === photo.id && (
-                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-[2px]">
-                    <Loader2 className="h-5 w-5 animate-spin text-white" />
-                  </div>
-                )}
-              </div>
-            ))}
-          </div>
-        )}
-      </ScrollArea>
+      {activeTab === "upload" ? (
+        <div
+          onClick={() => fileInputRef.current?.click()}
+          className="h-32 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors p-4 text-center"
+        >
+          {uploading ? (
+            <Loader2 className="size-6 animate-spin text-primary" />
+          ) : (
+            <>
+              <ImageIcon className="size-6 text-muted-foreground" />
+              <p className="text-xs font-medium text-foreground">Clique para enviar ou cole (Ctrl+V)</p>
+              <p className="text-[10px] text-muted-foreground">PNG, JPG ou WEBP até 10MB</p>
+            </>
+          )}
+          <input
+            ref={fileInputRef}
+            type="file"
+            accept="image/*"
+            className="hidden"
+            onChange={(e) => {
+              const file = e.target.files?.[0];
+              if (file) processFile(file);
+            }}
+          />
+        </div>
+      ) : (
+        <div className="flex gap-2 pt-2">
+          <Input
+            placeholder="https://exemplo.com/imagem.jpg"
+            value={externalUrl}
+            onChange={(e) => setExternalUrl(e.target.value)}
+            onKeyDown={(e) => e.key === "Enter" && handleApplyUrl()}
+            className="text-xs h-9"
+          />
+          <Button type="button" size="sm" onClick={handleApplyUrl} className="h-9 text-xs">
+            Aplicar
+          </Button>
+        </div>
+      )}
     </div>
   );
 }
+
+export { StudioAssetPicker as StudioUnsplashPicker };
```

---

### 4.5 Diff 5: `src/components/tourism/studio/sections/SectionCover.tsx`
Higienização de referências a Unsplash:

```diff
--- a/src/components/tourism/studio/sections/SectionCover.tsx
+++ b/src/components/tourism/studio/sections/SectionCover.tsx
@@ -8,7 +8,7 @@ import { toast } from "sonner";
 import { useState } from "react";
-import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";
+import { StudioAssetPicker } from "@/components/tourism/studio/StudioUnsplashPicker";
 import { Button } from "@/components/ui/button";
@@ -21,3 +21,3 @@ export function SectionCover({ draft, save }: SectionCoverProps) {
   const [uploadingAgent, setUploadingAgent] = useState(false);
-  const [showUnsplashCover, setShowUnsplashCover] = useState(false);
+  const [showAssetPicker, setShowAssetPicker] = useState(false);
   const [showAiPrompt, setShowAiPrompt] = useState(false);
@@ -107,4 +107,4 @@ export function SectionCover({ draft, save }: SectionCoverProps) {
               <Button
                 type="button"
-                title="Buscar no Unsplash"
+                title="Mídia da Agência"
                 onClick={() => {
-                  setShowUnsplashCover(true);
+                  setShowAssetPicker(true);
                   setShowAiPrompt(false);
                 }}
@@ -195,5 +195,5 @@ export function SectionCover({ draft, save }: SectionCoverProps) {
-            {showUnsplashCover && (
+            {showAssetPicker && (
               <div className="mt-2 rounded-lg border border-border bg-surface p-3">
                 <div className="flex items-center justify-between mb-2">
                   <span className="ds-meta uppercase tracking-wide font-semibold">
-                    Buscar imagem
+                    Selecionar Mídia
                   </span>
                   <Button
-                    onClick={() => setShowUnsplashCover(false)}
+                    onClick={() => setShowAssetPicker(false)}
                     className="text-muted-foreground hover:text-foreground text-xs"
                   >
                     Fechar
                   </Button>
                 </div>
-                <StudioUnsplashPicker
+                <StudioAssetPicker
                   agencyId={draft.agency_id}
                   proposalId={draft.id}
                   slot="cover"
                   onImageSelected={(url) => {
                     save({ cover_image_url: url });
-                    setShowUnsplashCover(false);
+                    setShowAssetPicker(false);
                   }}
                 />
               </div>
             )}
```

---

### 4.6 Diff 6: `src/components/tourism/studio/sections/SectionHotels.tsx`
Substituição da busca no Unsplash por seletor/uploader de mídia da agência:

```diff
--- a/src/components/tourism/studio/sections/SectionHotels.tsx
+++ b/src/components/tourism/studio/sections/SectionHotels.tsx
@@ -9,3 +9,3 @@ import { useState, useEffect } from "react";
-import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";
+import { StudioAssetPicker } from "@/components/tourism/studio/StudioUnsplashPicker";
@@ -45,3 +45,3 @@ export function SectionHotels({ draft, save }: Props) {
-  const [unsplashOpenIndex, setUnsplashOpenIndex] = useState<number | null>(null);
+  const [assetPickerIndex, setAssetPickerIndex] = useState<number | null>(null);
@@ -231,34 +231,34 @@ export function SectionHotels({ draft, save }: Props) {
-          {/* Unsplash picker */}
+          {/* Asset picker */}
           <div className="mt-2">
-            {unsplashOpenIndex === i ? (
+            {assetPickerIndex === i ? (
               <div className="rounded-lg border border-border bg-surface p-3 mt-1">
                 <div className="flex items-center justify-between mb-2">
                   <span className="ds-meta uppercase tracking-wide font-semibold">
-                    Buscar imagem
+                    Adicionar foto do hotel
                   </span>
                   <Button
                     type="button"
-                    onClick={() => setUnsplashOpenIndex(null)}
+                    onClick={() => setAssetPickerIndex(null)}
                     className="text-xs text-muted-foreground hover:text-foreground"
                   >
                     Fechar
                   </Button>
                 </div>
-                <StudioUnsplashPicker
+                <StudioAssetPicker
                   agencyId={agency?.id ?? ""}
                   proposalId={draft.id}
                   slot="hotel"
                   itemId={h.id || String(i)}
-                  defaultQuery={h.name || h.city || "hotel"}
                   onImageSelected={(url) => {
                     upd(i, { images: [...(h.images ?? []), url] });
-                    setUnsplashOpenIndex(null);
+                    setAssetPickerIndex(null);
                   }}
                 />
               </div>
             ) : (
               <Button
                 type="button"
-                onClick={() => setUnsplashOpenIndex(i)}
+                onClick={() => setAssetPickerIndex(i)}
                 className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border py-2 ds-meta text-muted-foreground hover:bg-surface-alt transition-colors mt-1"
               >
-                <Search className="h-3 w-3" /> Buscar foto do hotel no Unsplash
+                <Plus className="h-3 w-3" /> Adicionar imagem ou URL
               </Button>
             )}
           </div>
```

---

### 4.7 Diff 7: `src/components/tourism/studio/sections/SectionItinerary.tsx`
Substituição da busca no Unsplash pelo `StudioAssetPicker`:

```diff
--- a/src/components/tourism/studio/sections/SectionItinerary.tsx
+++ b/src/components/tourism/studio/sections/SectionItinerary.tsx
@@ -6,3 +6,3 @@ import { replaceAt, SMALL_INPUT } from "@/components/proposals/ProposalFormFiel
 import { uploadMediaUniversal } from "@/services/storage.functions";
-import { StudioUnsplashPicker } from "@/components/studio/StudioUnsplashPicker";
+import { StudioAssetPicker } from "@/components/tourism/studio/StudioUnsplashPicker";
@@ -27,3 +27,3 @@ export function SectionItinerary({ draft, save }: Props) {
-  const [showUnsplash, setShowUnsplash] = useState<number | null>(null);
+  const [showAssetPicker, setShowAssetPicker] = useState<number | null>(null);
@@ -168,4 +168,4 @@ export function SectionItinerary({ draft, save }: Props) {
-                  onClick={() => setShowUnsplash(showUnsplash === i ? null : i)}
+                  onClick={() => setShowAssetPicker(showAssetPicker === i ? null : i)}
                   className="flex h-6 items-center justify-center rounded border border-border/60 bg-surface px-2 ds-meta hover:bg-surface-alt transition-colors"
-                  title="Buscar no Unsplash"
+                  title="Mídia da Agência"
                 >
-                  <Search className="h-3 w-3 mr-1" /> Buscar
+                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                 </Button>
@@ -190,26 +190,25 @@ export function SectionItinerary({ draft, save }: Props) {
-            {showUnsplash === i && (
+            {showAssetPicker === i && (
               <div className="rounded-lg border border-border bg-surface p-3 mb-2">
                 <div className="flex items-center justify-between mb-2">
                   <span className="ds-meta uppercase tracking-wide font-semibold">
-                    Buscar imagem para o dia
+                    Mídia para o dia
                   </span>
                   <Button
-                    onClick={() => setShowUnsplash(null)}
+                    onClick={() => setShowAssetPicker(null)}
                     className="text-muted-foreground hover:text-foreground ds-meta"
                   >
                     Fechar
                   </Button>
                 </div>
-                <StudioUnsplashPicker
+                <StudioAssetPicker
                   agencyId={draft.agency_id}
                   proposalId={draft.id}
                   slot={`itinerary-${i}`}
-                  defaultQuery={d.city || draft.destination || "travel destination"}
                   onImageSelected={(url) => {
                     const newImages = [...(d.images || []), url];
                     upd(i, { images: newImages });
-                    setShowUnsplash(null);
+                    setShowAssetPicker(null);
                   }}
                 />
               </div>
             )}
```

---

### 4.8 Diff 8: `src/routes/workspace.turismo.hoteis.tsx:1584`
Expurgo textual de "Unsplash":

```diff
--- a/src/routes/workspace.turismo.hoteis.tsx
+++ b/src/routes/workspace.turismo.hoteis.tsx
@@ -1581,7 +1581,7 @@ export function WorkspaceTurismoHoteis() {
   value={newPhotoUrl}
   onChange={(e) => setNewPhotoUrl(e.target.value)}
   onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPhoto())}
-  placeholder="Cole a URL da foto (Unsplash ou CDN) ou envie abaixo..."
+  placeholder="Cole a URL direta da imagem (HTTPS) ou envie abaixo..."
   className="h-9 rounded-lg text-xs bg-background flex-1"
 />
```

---

## 5. Verification Method (Método de Verificação Independente)

1. **Varredura Estática de Resíduos de Unsplash**:
   ```powershell
   git grep -in "placehold.co" src/
   git grep -in "api.unsplash.com" src/
   git grep -in "vK-9626D2bE9m4eE40eK47nU89X9Q_v88jX2o4wU07E" src/
   ```
   *Condição de Validação*: Nenhuma correspondência nos arquivos de produção de `src/`.
2. **Execução de Testes Unitários de Regressão (Vitest)**:
   ```powershell
   npx vitest run src/routes/_store.evento-turismo-detail.test.ts
   npx vitest run src/services/mining-forensic-quality.test.ts
   ```
   *Condição de Validação*: 100% de testes passando confirmando que `images.unsplash.com` e fallbacks sintéticos permanecem bloqueados.
3. **Auditoria de Design Lint**:
   ```powershell
   node scripts/design-lint.mjs
   ```
   *Condição de Validação*: 0 violações P0 e P1 nos componentes refatorados.
