# Relatório de Investigação Forense: Governança Tripla de Mídia & Componentes de UI (Milestone M1_2)

**Agente**: Explorer M1_2 (Media UI Components & Triad Governance)  
**Data**: 2026-10-03  
**Status**: Concluído (Hard Handoff)  
**Diretório de Trabalho**: `.agents/teamwork/teamwork_preview_explorer_m1_2`  
**Escopo**: UI Media Uploaders (`media-uploader.tsx`, `image-upload.tsx`, `file-attachment-upload.tsx`, `story-highlight-uploader.tsx`, `multimodal-ocr-uploader.tsx`, `builder/MediaUploader.tsx`)

---

## 1. Observation (Observações Diretas e Evidências Empíricas)

### 1.1 Inventário dos Componentes de Upload e Paridade com a Tríade Canônica
A especificação do projeto (Requisito R1 e Interface Contract de `PROJECT.md`) exige que todos os componentes de mídia forneçam a Tríade de Governança de Mídia:
1. **Canal A (Arquivo/Bucket)**: Upload direto ao storage Supabase autenticado.
2. **Canal B (URL Externa)**: Botão/campo para entrada e validação de URL HTTPS externa.
3. **Canal C (Área de Transferência)**: Captura nativa de imagem ou URL colada (Ctrl+V / Clipboard Paste listener).

| Arquivo do Componente | Linhas Totais | Canal A: Upload Bucket | Canal B: URL Externa | Canal C: Ctrl+V Paste | Conformidade Apple HIG (>=44px) | Violações DL (P0/P1) |
|---|---|---|---|---|---|---|
| `src/components/ui/file-attachment-upload.tsx` | 377 | Sim (`uploadStoreMedia`) | Sim (`showExternalUrlOption`) | Sim (Arquivos + URL) | Parcial (`size-3` em ícone/botão) | 1 P0 / 18 P1 |
| `src/components/ui/media-uploader.tsx` | 484 | Sim (`uploadMediaUniversal`) | **NÃO (Ausente)** | Parcial (Apenas Arquivos) | **NÃO (`size-8 sm:size-7`)** | 2 P0 / 18 P1 |
| `src/components/ui/image-upload.tsx` | 466 | Sim (Signed URL + fallback) | **NÃO (Ausente)** | Parcial (Apenas Arquivos) | **NÃO (`size-7`, `h-8`)** | 0 P0 / 22 P1 |
| `src/components/classifieds/story-highlight-uploader.tsx` | 233 | Condicional (prop `onUpload`) | **NÃO (Ausente)** | **NÃO (Ausente)** | **NÃO (`size-5` no botão X)** | 4 P0 / 16 P1 |
| `src/components/documents/multimodal-ocr-uploader.tsx` | 392 | Sim (FileReader local) | **NÃO (Ausente)** | Parcial (Apenas Arquivos) | **NÃO (`h-7`, `size-7`)** | 0 P0 / 21 P1 |
| `src/components/admin/builder/MediaUploader.tsx` | 312 | Sim (`uploadMediaUniversal`) | Sim (`Input` URL) | **NÃO (Ausente)** | **NÃO (`h-8` input/botão)** | 0 P0 / 14 P1 (Possui Mock L180) |

---

### 1.2 Diagnóstico Detalhado por Arquivo

#### 1. `src/components/ui/media-uploader.tsx`
- **Canal B (URL Externa) inexistente**: Não há estado `showUrlInput`, prop `showExternalUrlOption`, nem `<Input>` para receber URLs externas. Usuários que utilizam CDNs próprias ou mídias previamente hospedadas são forçados a fazer download e re-upload.
- **Canal C incompleto**: Linhas 256-264 (`handlePaste`) apenas chamam `extractMediaFromClipboard(e)`. Se o usuário der Ctrl+V em uma string com URL de imagem (`https://...`), o evento é descartado silenciosamente.
- **Apple HIG / DL-14 (Touch Targets)**:
  - Linhas 388 e 398: Botões de ação sobre os cards utilizam `className="size-8 sm:size-7..."`. No mobile, `size-8` (32px) e `size-7` (28px) violam o piso ergonômico de 44x44px (`h-11`).
- **Design Lint**:
  - DL-15: Ausência de anel de foco teclado (`:focus-visible`) nos botões de ação e dropzone.
  - DL-18: Uso de `bg-black` e `text-white` hardcoded em vez de tokens semânticos (`bg-foreground text-background`).
  - DL-02: Uso de classes arbitrárias entre colchetes (`aspect-[4/3]`, `text-[11px]`, `text-[9px]`).

#### 2. `src/components/ui/image-upload.tsx`
- **Canal B (URL Externa) inexistente**: Ausência total de campo ou botão para inserção de URL externa nas três variantes (`avatar`, `banner`, `default`).
- **Canal C incompleto**: Linhas 75-90 (`handlePaste`) tratam apenas mídias do tipo `File`. Colar um link de imagem não surte efeito.
- **Apple HIG / DL-14 (Touch Targets)**:
  - Linha 205 (Avatar Crop): `size-7` (28px).
  - Linha 219 (Avatar Remove): `size-7` (28px).
  - Linha 293 / 307 (Banner Actions): `size="sm"` (`h-9` = 36px).
  - Linha 438 (Default Upload Button): `h-8` (32px).
- **Design Lint**:
  - DL-18: `bg-black` hardcoded nas linhas 201, 289, 388.
  - DL-15: Ausência de anel de foco nos botões de trigger e remoção.
  - DL-02: Classes arbitrárias `text-[10px]`, `text-[8px]`, `text-[11px]`.

#### 3. `src/components/ui/file-attachment-upload.tsx` (Padrão Canônico de Referência)
- Implementa de forma exemplar o suporte híbrido:
  - Linhas 145-165: O listener `handlePaste` intercepta mídias binárias via `extractMediaFromClipboard(e)` E inspeciona `e.clipboardData.getData("text/plain")` para capturar URLs `^https?:\/\/`.
  - Linhas 196-205 e 287-322: Exibe alternador "Colar Link Externo" que abre gaveta com `<Input type="url">` e botão "Aplicar".
  - Apresenta débitos secundários de lint a sanar: `size-3` em ícone, `text-[11px]` e ausência de `:focus-visible`.

#### 4. `src/components/classifieds/story-highlight-uploader.tsx`
- **Canal A defasado**: Não possui fallback nativo para `uploadMediaUniversal`. Se `onUpload` não for injetado, gera `URL.createObjectURL(file)`, cujo blob se perde no refresh.
- **Canal B e C ausentes**: Sem suporte a URL externa e sem listener `onPaste`.
- **Apple HIG / DL-14**: Linha 164 define o botão de exclusão de destaque com `size-5` (20px), tornando-o inalcançável sem toque acidental no círculo pai.

#### 5. `src/components/documents/multimodal-ocr-uploader.tsx`
- Possui suporte a arquivo local e Ctrl+V para imagens (linhas 48-67), mas não aceita URLs externas de documentos (PDFs ou comprovantes hospedados).
- Botões de seleção de nicho usam `h-7` (28px), violando o piso móvel.

#### 6. `src/components/admin/builder/MediaUploader.tsx`
- **Resíduo de Mock (P1 - MCK-01)**:
  - Linha 180: Fallback explícito para `https://placehold.co/600x400/18181b/ffffff?text=Imagem+Indispon%C3%ADvel`.
- **Canal C ausente**: Sem suporte a Ctrl+V.
- **Touch targets**: Input e botões com `h-8` (32px).

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio e Dedução)

1. **Premissa da Tríade de Governança de Mídia**:
   - Observação: O Requisito R1 e o contrato de `PROJECT.md` estabelecem que qualquer componente de upload de mídia no ecossistema Waesy deve fornecer de forma unificada: Upload direto ao bucket, Inserção de URL externa e Colagem via área de transferência (Ctrl+V).
   - Dedução: Os componentes `MediaUploader` e `ImageUpload` são os dois pilares centrais de captura de imagem da aplicação. O fato de ambos carecerem de entrada de URL externa e rejeitarem URLs de texto coladas via Ctrl+V cria uma quebra funcional direta no contrato de persistência de mídia.

2. **Premissa da Ergonomia Apple HIG e Design Lint (DL-14 / DL-15)**:
   - Observação: A regra B.4 de `AGENTS.md` e a regra DL-14 de `scripts/design-lint.mjs` categorizam como violação P1 qualquer controle interativo com dimensão inferior a `h-11` (44px) no mobile.
   - Dedução: Os botões de ação sobre miniaturas de imagem (`size-7`, `size-8`), botões de upload (`h-8`) e pílulas de nicho (`h-7`) violam o piso tátil. A solução é padronizar os controles para `size-11 sm:size-8` (garantindo 44px no mobile e 32px com precisão de mouse no desktop) e botões de ação para `h-11`.
   - Adicionalmente, todos os botões devem declarar `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` para zerar DL-15.

3. **Premissa de Cores e Tokens (DL-01 / DL-18)**:
   - Observação: O uso de `bg-black`, `text-white` e hexadecimais viola DL-18 e DL-01.
   - Dedução: Devem ser substituídos pelas variáveis canônicas do design system: `bg-foreground text-background` para overlays de alto contraste, e `bg-muted/80 text-foreground` para fundos neutros.

4. **Premissa de Erradicação de Mocks**:
   - Observação: Linha 180 de `src/components/admin/builder/MediaUploader.tsx` aponta para `placehold.co`.
   - Dedução: Deve ser substituída por estado visual de erro nativo (`<ImageIcon className="size-8 text-muted-foreground" />`), alinhando o construtor com o compromisso de zero mocks.

---

## 3. Caveats (Limitações da Investigação e Suposições)

1. **Ambiente Read-Only Estrito**: Nenhuma alteração foi gravada nos arquivos de código-fonte (`src/components/ui/*`). Todos os códigos e diffs abaixo são recomendações executáveis projetadas para os agentes implementadores.
2. **Proibição Absoluta de Build/Typecheck**: Respeitada integralmente a proibição de `npm run typecheck` e `npm run build`. As validações de conformidade visual foram extraídas via análise semântica da engine `scripts/design-lint.mjs`.
3. **CORS em Imagens Externas**: Quando um usuário insere uma URL externa direta, a imagem é exibida diretamente via tag `<img>`. Caso o usuário solicite recorte via `ImageCropperDialog`, a leitura de canvas pode sofrer bloqueio de CORS se o host remoto não fornecer cabeçalho permissivo. A especificação recomenda que URLs externas preservem a URL original ou acionem proxy defensivo.

---

## 4. Conclusion (Conclusão e Diffs de Implementação)

### 4.1 Resumo Executivo das Correções

| Componente | Ações a Aplicar | Status Alvo |
|---|---|---|
| `media-uploader.tsx` | Adicionar prop `showExternalUrlOption`, alternador e input `h-11` de URL, listener Ctrl+V híbrido (arquivo + URL), controles dos cards `size-11 sm:size-8`, anéis de foco `:focus-visible`. | Tríade 100% Conforme |
| `image-upload.tsx` | Adicionar prop `showExternalUrlOption`, entrada de URL em `avatar`/`banner`/`default`, listener Ctrl+V híbrido, botões com piso `h-11` / `size-11 sm:size-8`, sem `bg-black`. | Tríade 100% Conforme |
| `story-highlight-uploader.tsx` | Adicionar fallback para `uploadMediaUniversal`, listener `onPaste`, botão de exclusão ampliado para toque acessível. | Paridade de Tríade |
| `multimodal-ocr-uploader.tsx` | Adicionar campo de entrada de URL de documento e suporte a URL no Ctrl+V. | Paridade de Tríade |
| `builder/MediaUploader.tsx` | Erradicar `placehold.co` na L180 por SVG honesto, adicionar listener Ctrl+V, inputs `h-11`. | Zero Mocks + HIG |

---

### 4.2 Proposta de Código: `src/components/ui/media-uploader.tsx`

#### Modificações de Interface e Tipagem:
```tsx
// Em MediaUploaderProps:
export interface MediaUploaderProps {
  value?: string | string[] | MediaData[];
  onChange?: (urls: string[]) => void;
  onMediaChange?: (media: MediaData[]) => void;
  onUploadComplete?: (media: MediaData[]) => void;
  onUploadingStateChange?: (isUploading: boolean) => void;
  maxFiles?: number;
  bucket?: string;
  folder?: string;
  className?: string;
  acceptedTypes?: string[];
  label?: string;
  accept?: "image" | "video" | "all";
  aspect?: number;
  cropShape?: "rect" | "round";
  lockAspect?: boolean;
  enableCrop?: boolean;
  showExternalUrlOption?: boolean; // NOVO: Habilita inserção de URL externa
}
```

#### Estados e Handlers da Tríade:
```tsx
// Estados internos:
const [showUrlInput, setShowUrlInput] = useState(false);
const [externalUrl, setExternalUrl] = useState("");

// Handler para inserção de URL externa:
const handleAddExternalUrl = (urlToApply?: string) => {
  const rawUrl = (urlToApply || externalUrl).trim();
  if (!rawUrl) return;

  if (!/^https?:\/\//i.test(rawUrl)) {
    toast.error("Insira uma URL válida iniciando com http:// ou https://");
    return;
  }

  if (mediaList.length >= maxFiles && maxFiles > 1) {
    toast.error(`Você pode adicionar no máximo ${maxFiles} itens.`);
    return;
  }

  const isVid = !!rawUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i);
  const newMediaItem: MediaData = {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: rawUrl,
    path: rawUrl,
    type: isVid ? "video" : "image",
  };

  const updatedList: MediaData[] = maxFiles === 1 ? [newMediaItem] : [...mediaList, newMediaItem];
  notifyChange(updatedList);
  setExternalUrl("");
  setShowUrlInput(false);
  toast.success("Mídia vinculada por URL com sucesso!");
};

// Handler de Paste (Ctrl+V) Híbrido:
const handlePaste = async (e: React.ClipboardEvent) => {
  // 1. Arquivos nativos ou prints colados do clipboard
  const items = await extractMediaFromClipboard(e);
  if (items && items.length > 0) {
    e.preventDefault();
    const files = items.map((i) => i.file);
    toast.info(`Processando ${files.length} mídia(s) colada(s)...`);
    await handleFiles(files);
    return;
  }

  // 2. String de URL colada via Ctrl+V diretamente
  const pastedText = e.clipboardData?.getData("text/plain")?.trim();
  if (pastedText && /^https?:\/\//i.test(pastedText)) {
    e.preventDefault();
    handleAddExternalUrl(pastedText);
  }
};
```

#### Renderização com HIG e Zero Violações:
```tsx
{/* Cabeçalho com label e toggle de URL */}
<div className="flex items-center justify-between">
  {label && <label className="text-xs font-semibold text-foreground">{label}</label>}
  {showExternalUrlOption && mediaList.length < maxFiles && (
    <button
      type="button"
      onClick={() => setShowUrlInput(!showUrlInput)}
      className="min-h-11 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Link2 className="size-4" />
      <span>{showUrlInput ? "Cancelar URL" : "Inserir URL Externa"}</span>
    </button>
  )}
</div>

{/* Gaveta de Entrada de URL Externa */}
{showUrlInput && (
  <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
      <span>Informe o link público da mídia (HTTPS)</span>
      <button
        type="button"
        onClick={() => setShowUrlInput(false)}
        className="size-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
        aria-label="Fechar entrada de URL"
      >
        <X className="size-4" />
      </button>
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        type="url"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
        placeholder="https://exemplo.com/imagem.jpg ou video.mp4"
        className="h-11 text-xs rounded-lg flex-1 bg-background"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAddExternalUrl();
          }
        }}
      />
      <Button
        type="button"
        onClick={() => handleAddExternalUrl()}
        className="h-11 px-4 text-xs font-bold rounded-lg shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Adicionar Mídia
      </Button>
    </div>
  </div>
)}

{/* Botões nos cards de imagem (com touch target de 44px no mobile): */}
<div className="absolute top-1.5 right-1.5 flex items-center gap-2 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
  {item.type === "image" && enableCrop && (
    <button
      type="button"
      onClick={() => handleOpenRecrop(idx)}
      title="Ajustar e Recortar"
      className="size-11 sm:size-8 flex items-center justify-center rounded-lg bg-foreground/80 backdrop-blur-xs text-background hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label="Ajustar e Recortar Imagem"
    >
      <Crop className="size-4" />
    </button>
  )}
  <button
    type="button"
    onClick={() => removeMedia(idx)}
    title="Remover"
    className="size-11 sm:size-8 flex items-center justify-center rounded-lg bg-foreground/80 backdrop-blur-xs text-background hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    aria-label="Remover Mídia"
  >
    <X className="size-4" />
  </button>
</div>
```

---

### 4.3 Proposta de Código: `src/components/ui/image-upload.tsx`

#### Modificações de Interface e Tipagem:
```tsx
export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  bucket?: "product-media" | "cms-media" | "receipts" | "identity-vault" | "avatars" | "store-assets" | "destination-media" | string;
  className?: string;
  variant?: "default" | "minimal" | "avatar" | "banner";
  aspect?: number;
  aspectPreset?: AspectRatioPreset;
  helperText?: string;
  showExternalUrlOption?: boolean; // NOVO: Suporte a URL externa
}
```

#### Handlers da Tríade e Touch Targets:
```tsx
const [showManualUrl, setShowManualUrl] = useState(false);
const [manualUrl, setManualUrl] = useState("");

const handleApplyManualUrl = (urlToApply?: string) => {
  const rawUrl = (urlToApply || manualUrl).trim();
  if (!rawUrl) return;

  if (!/^https?:\/\//i.test(rawUrl)) {
    toast.error("Insira uma URL válida iniciando com http:// ou https://");
    return;
  }

  onChange(rawUrl);
  setShowManualUrl(false);
  setManualUrl("");
  toast.success("URL de imagem aplicada com sucesso!");
};

// Listener de Colagem (Ctrl+V) Atualizado:
const handlePaste = async (e: React.ClipboardEvent) => {
  const items = await extractMediaFromClipboard(e);
  if (items && items.length > 0) {
    e.preventDefault();
    const item = items[0];
    setCurrentImageFile(item.file);
    const reader = new FileReader();
    reader.readAsDataURL(item.file);
    reader.onload = () => {
      setCurrentImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.onerror = () => toast.error("Erro ao processar imagem colada.");
    toast.success("Imagem colada da área de transferência!");
    return;
  }

  const pastedText = e.clipboardData?.getData("text/plain")?.trim();
  if (pastedText && /^https?:\/\//i.test(pastedText)) {
    e.preventDefault();
    handleApplyManualUrl(pastedText);
  }
};
```

#### Atualização de Botões para Floor de 44px (HIG):
- **Avatar Mode**:
  - Botão de Recortar: `size-11 sm:size-8 rounded-lg bg-background/90 text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
  - Botão de Remover: `size-11 sm:size-8 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
- **Banner Mode**:
  - Botão de Reajustar: `h-11 px-4 rounded-lg font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
  - Botão de Remover: `h-11 px-4 rounded-lg font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
- **Default Mode**:
  - Botão vazio "Selecionar e Recortar": Atualizado de `h-8` para `h-11 px-5 rounded-lg text-xs font-bold`.

---

### 4.4 Proposta de Código: `src/components/admin/builder/MediaUploader.tsx` (Purga de Mock)

Substituir o bloco de erro com `placehold.co`:
```tsx
// ANTES (L179-181 com Mock Placehold.co):
onError={(e) => {
  (e.currentTarget as HTMLImageElement).src =
    "https://placehold.co/600x400/18181b/ffffff?text=Imagem+Indispon%C3%ADvel";
}}

// DEPOIS (Empty state honesto e sem dependência externa):
onError={() => {
  setImageLoadError(true);
}}

// Renderização condicional no container:
{imageLoadError ? (
  <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground p-4">
    <ImageIcon className="size-8 opacity-40" />
    <span className="text-xs font-medium">Mídia indisponível</span>
  </div>
) : (
  <img src={value} alt="Preview" className="max-h-30 w-auto max-w-full object-contain rounded-lg shadow-2xs" />
)}
```

---

## 5. Verification Method (Método de Verificação Independente)

Para auditar e certificar a conformidade das mudanças recomendadas sem acionar `build` ou `typecheck`:

1. **Auditoria de Design Lint Estrita (Zero Violações P0 e P1)**:
   ```bash
   node -e "import('./scripts/design-lint.mjs').then(({ lintSource }) => {
     const fs = require('fs');
     const targets = [
       'src/components/ui/media-uploader.tsx',
       'src/components/ui/image-upload.tsx',
       'src/components/admin/builder/MediaUploader.tsx'
     ];
     targets.forEach(f => {
       const content = fs.readFileSync(f, 'utf8');
       const violations = lintSource(content, f);
       const p0p1 = violations.filter(v => v.severity === 'P0' || v.severity === 'P1');
       console.log(f, '-> P0/P1 Restantes:', p0p1.length);
       if (p0p1.length > 0) console.table(p0p1.map(v => ({ rule: v.rule, line: v.line, msg: v.message })));
     });
   });"
   ```
   *Critério de Sucesso*: 0 violações P0 e 0 violações P1 em todos os arquivos alvo.

2. **Verificação de Ausência de Mocks (`placehold.co` / `unsplash.com`)**:
   ```bash
   node -e "const fs = require('fs');
   const s = fs.readFileSync('src/components/admin/builder/MediaUploader.tsx', 'utf8');
   if (s.includes('placehold.co')) throw new Error('Mock placehold.co ainda presente!');
   console.log('Zero mocks verificado em MediaUploader.tsx');"
   ```

3. **Verificação dos Touch Targets Mínimos (>= 44px / `h-11`)**:
   Inspecionar que todos os elementos interativos `<button>`, `<Button>` e `<input>` móveis possuem `h-11`, `min-h-11`, `size-11` ou dimensão mínima correspondente, com anéis `:focus-visible`.
