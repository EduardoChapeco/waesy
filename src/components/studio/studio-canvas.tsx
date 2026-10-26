import React, { useState } from 'react';
import { Layers, Type, Image as ImageIcon, Square, Download, Send, RefreshCw, Palette, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface CanvasLayer {
 id: string;
 type: 'text' | 'shape' | 'image' | 'sticker';
 text?: string;
 fontSize?: number;
 color?: string;
 x: number;
 y: number;
 width?: number;
 height?: number;
 imageUrl?: string;
 stickerEmoji?: string;
}

interface StudioCanvasProps {
  onExportToHero?: (imageUrl: string) => void;
  className?: string;
  aspectRatio?: any;
  background?: any;
  elements?: any[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElementPosition?: (id: any, pos: any) => void;
  zoom?: number;
}

export function StudioCanvas({ onExportToHero, className = '', aspectRatio, background, elements, selectedElementId, onSelectElement, onUpdateElementPosition, zoom }: StudioCanvasProps) {
 const [aspect, setAspect] = useState<'1:1' | '16:9' | '9:16'>('16:9');
 const [bgColor, setBgColor] = useState('#0f172a');
 const [layers, setLayers] = useState<CanvasLayer[]>([
 {
 id: 'l-1',
 type: 'text',
 text: 'OFERTA ESPECIAL DA SEMANA',
 fontSize: 24,
 color: '#38bdf8',
 x: 30,
 y: 40,
 },
 {
 id: 'l-2',
 type: 'text',
 text: 'Até 40% OFF em toda a linha de produtos selecionados',
 fontSize: 16,
 color: '#ffffff',
 x: 30,
 y: 80,
 },
 ]);
 const [selectedLayerId, setSelectedLayerId] = useState<string | null>('l-1');

 const selectedLayer = layers.find((l) => l.id === selectedLayerId);

 const addTextLayer = () => {
 const newL: CanvasLayer = {
 id: 'l-' + Date.now(),
 type: 'text',
 text: 'Novo Texto',
 fontSize: 18,
 color: '#ffffff',
 x: 50,
 y: 120,
 };
 setLayers((prev) => [...prev, newL]);
 setSelectedLayerId(newL.id);
 };

 const addStickerLayer = (stickerText: string = "⭐ DESTAQUE") => {
   const newL: CanvasLayer = {
     id: 'l-' + Date.now(),
     type: 'sticker',
     text: stickerText,
     fontSize: 16,
     color: '#f59e0b',
     x: 60,
     y: 160,
   };
   setLayers((prev) => [...prev, newL]);
   setSelectedLayerId(newL.id);
 };

  const handleExport = () => {
    try {
      const width = aspect === '16:9' ? 1200 : aspect === '9:16' ? 720 : 1080;
      const height = aspect === '16:9' ? 675 : aspect === '9:16' ? 1280 : 1080;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // 1. Renderiza fundo real
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // 2. Fator de escala proporcional
        const scale = width / (aspect === '16:9' ? 672 : aspect === '9:16' ? 320 : 384);

        // 3. Renderiza cada camada real com fidelidade tipográfica
        for (const l of layers) {
          if ((l.type === 'text' || l.type === 'sticker') && l.text) {
            ctx.fillStyle = l.color || '#ffffff';
            const scaledFontSize = Math.round((l.fontSize || 18) * scale);
            ctx.font = `bold ${scaledFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(l.text, l.x * scale, l.y * scale);
          }
        }

        const realDataUrl = canvas.toDataURL("image/png");
        if (onExportToHero) onExportToHero(realDataUrl);
      }
    } catch (err) {
      console.error("[studio-canvas] Falha ao exportar canvas:", err);
    }
  };

 return (
 <div className={'p-6 rounded-lg bg-card border border-border shadow-xl space-y-5 ' + className}>
 {/* Toolbar */}
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
 <div className="flex items-center gap-2">
 <div className="flex items-center bg-muted/60 p-1 rounded-lg gap-1">
 {(['16:9', '1:1', '9:16'] as const).map((r) => (
 <button
 key={r}
 type="button"
 onClick={() => setAspect(r)}
 className={'px-3 py-2 rounded-lg text-xs font-bold transition-colors duration-200 ' + (
 aspect === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
 )}
 >
 {r}
 </button>
 ))}
 </div>

 <div className="flex items-center gap-2 pl-2">
 <span className="text-xs text-muted-foreground">Fundo:</span>
 <input
 type="color"
 value={bgColor}
 onChange={(e) => setBgColor(e.target.value)}
 className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent"
 />
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={addTextLayer}
 className="h-11 min-h-11 px-4 rounded-lg text-xs flex items-center gap-2 cursor-pointer"
 >
 <Type className="size-4" />
 Adicionar Texto
 </Button>

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => addStickerLayer("⭐ DESTAQUE")}
 className="h-11 min-h-11 px-4 rounded-lg text-xs flex items-center gap-2 cursor-pointer"
 >
 <Sparkles className="size-4 text-amber-500" />
 Adicionar Sticker
 </Button>

 {onExportToHero && (
 <Button
 type="button"
 size="sm"
 onClick={handleExport}
 className="h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer"
 >
 <Send className="size-3.5" />
 Aplicar ao Hero Banner
 </Button>
 )}
 </div>
 </div>

 {/* Canvas Area */}
 <div className="flex justify-center items-center p-6 bg-muted/20 rounded-lg overflow-hidden min-h-72">
 <div
 style={{ backgroundColor: bgColor }}
 className={'w-full max-w-2xl rounded-lg relative shadow-2xl overflow-hidden border border-white/10 ' + (
 aspect === '16:9' ? 'aspect-video' : aspect === '9:16' ? 'aspect-9/16 max-w-xs' : 'aspect-square max-w-sm'
 )}
 >
 {layers.map((l) => (
 <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
 key={l.id}
 onClick={() => setSelectedLayerId(l.id)}
 style={{
 position: 'absolute',
 left: l.x,
 top: l.y,
 color: l.color,
 fontSize: l.fontSize,
 }}
 className={'cursor-pointer p-1 border rounded transition-colors duration-200 ' + (
 selectedLayerId === l.id ? 'border-primary bg-primary/10' : 'border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
 )}
 >
 {l.text}
 </div>
 ))}
 </div>
 </div>

 {/* Selected Layer Properties */}
 {selectedLayer && (
 <div className="p-4 rounded-lg bg-muted/30 border border-border flex flex-wrap items-center gap-4 text-xs">
 <span className="font-bold text-foreground">Editar Camada:</span>
 <Input
 value={selectedLayer.text || ''}
 onChange={(e) => {
 const val = e.target.value;
 setLayers((prev) =>
 prev.map((l) => (l.id === selectedLayerId ? { ...l, text: val } : l))
 );
 }}
 className="h-11 min-h-11 max-w-xs text-base sm:text-xs rounded-lg"
 />
 <div className="flex items-center gap-2">
 <span className="text-muted-foreground">Cor:</span>
 <input
 type="color"
 value={selectedLayer.color || '#ffffff'}
 onChange={(e) => {
 const val = e.target.value;
 setLayers((prev) =>
 prev.map((l) => (l.id === selectedLayerId ? { ...l, color: val } : l))
 );
 }}
 className="size-7 rounded cursor-pointer bg-transparent border border-border"
 />
 </div>
 </div>
 )}
 </div>
 );
}
