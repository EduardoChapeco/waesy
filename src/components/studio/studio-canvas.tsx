import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Type,
  Square,
  Send,
  Sparkles,
  QrCode,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  AlignCenter,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { generateQrCodeDataUri } from '@/lib/qr-code';

export interface CanvasLayer {
  id: string;
  type: 'text' | 'shape' | 'sticker' | 'qr';
  text?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'black';
  color?: string;
  backgroundColor?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  qrUrl?: string;
  zIndex?: number;
  isLocked?: boolean;
}

interface StudioCanvasProps {
  onExportToHero?: (imageUrl: string) => void;
  className?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '1.91:1';
  background?: { type: string; value: string };
  elements?: any[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElementPosition?: (id: any, pos: any) => void;
  zoom?: number;
}

const INITIAL_LAYERS: CanvasLayer[] = [
  {
    id: 'l-1',
    type: 'sticker',
    text: 'DESTAQUE EXCLUSIVO',
    fontSize: 14,
    // design-lint-ignore DL-01 reason:"Canvas sticker text color" expiry:"2030-01-01"
    color: '#0f172a',
    // design-lint-ignore DL-01 reason:"Canvas sticker background color" expiry:"2030-01-01"
    backgroundColor: '#38bdf8',
    x: 40,
    y: 40,
    zIndex: 1,
  },
  {
    id: 'l-2',
    type: 'text',
    text: 'SUPER PROMOÇÃO',
    fontSize: 28,
    fontWeight: 'black',
    // design-lint-ignore DL-01 reason:"Canvas headline color" expiry:"2030-01-01"
    color: '#ffffff',
    x: 40,
    y: 80,
    zIndex: 2,
  },
  {
    id: 'l-3',
    type: 'text',
    text: 'Até 40% OFF em itens selecionados para pronta entrega',
    fontSize: 16,
    // design-lint-ignore DL-01 reason:"Canvas subheadline color" expiry:"2030-01-01"
    color: '#cbd5e1',
    x: 40,
    y: 130,
    zIndex: 3,
  },
];

export function StudioCanvas({
  onExportToHero,
  className = '',
  aspectRatio = '16:9',
  background,
  elements,
  selectedElementId: externalSelectedId,
  onSelectElement,
  onUpdateElementPosition,
}: StudioCanvasProps) {
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '9:16' | '1.91:1'>(aspectRatio);
  // design-lint-ignore DL-01 reason:"HTML5 canvas default background color initialization" expiry:"2030-01-01"
  const [bgColor, setBgColor] = useState(background?.value || '#0f172a');

  // Histórico Transacional (LidoJS Architecture)
  const [history, setHistory] = useState<{
    past: CanvasLayer[][];
    present: CanvasLayer[];
    future: CanvasLayer[][];
  }>({
    past: [],
    present: INITIAL_LAYERS,
    future: [],
  });

  const layers = history.present;
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(externalSelectedId || 'l-2');

  // Guias de Snap Central
  const [snapGuides, setSnapGuides] = useState<{ horizontal: boolean; vertical: boolean }>({
    horizontal: false,
    vertical: false,
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    layerId: string | null;
    startX: number;
    startY: number;
    layerStartX: number;
    layerStartY: number;
  }>({
    isDragging: false,
    layerId: null,
    startX: 0,
    startY: 0,
    layerStartX: 0,
    layerStartY: 0,
  });

  const pushState = useCallback((newLayers: CanvasLayer[]) => {
    setHistory((curr) => ({
      past: [...curr.past.slice(-20), curr.present],
      present: newLayers,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Atalhos de Teclado (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerId) {
          e.preventDefault();
          deleteSelectedLayer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, undo, redo]);

  // Sincronização de props externas
  useEffect(() => {
    if (aspectRatio) setAspect(aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    if (background?.value) setBgColor(background.value);
  }, [background?.value]);

  useEffect(() => {
    if (elements && elements.length > 0) {
      const converted: CanvasLayer[] = elements.map((el, i) => ({
        id: el.id || `el-${i}`,
        type: el.type === 'text' ? 'text' : 'shape',
        text: el.properties?.content || el.text || 'Texto',
        fontSize: el.properties?.fontSize || 20,
        // design-lint-ignore DL-01 reason:"Canvas element conversion fallback color" expiry:"2030-01-01"
        color: el.properties?.color || el.color || '#ffffff',
        x: (el.position?.x ?? 5) * 4,
        y: (el.position?.y ?? 5) * 4,
        zIndex: i + 1,
      }));
      setHistory({
        past: [],
        present: converted,
        future: [],
      });
    }
  }, [elements]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // Ações de Camadas (LidoJS Pattern)
  const addTextLayer = () => {
    const newL: CanvasLayer = {
      id: 'l-' + Date.now(),
      type: 'text',
      text: 'Novo Texto',
      fontSize: 20,
      // design-lint-ignore DL-01 reason:"Canvas new text color" expiry:"2030-01-01"
      color: '#ffffff',
      x: 50,
      y: 100,
      zIndex: layers.length + 1,
    };
    pushState([...layers, newL]);
    setSelectedLayerId(newL.id);
    onSelectElement?.(newL.id);
  };

  const addStickerLayer = (stickerText: string = 'NOVIDADE') => {
    const newL: CanvasLayer = {
      id: 'l-' + Date.now(),
      type: 'sticker',
      text: stickerText,
      fontSize: 14,
      // design-lint-ignore DL-01 reason:"Canvas sticker text color" expiry:"2030-01-01"
      color: '#0f172a',
      // design-lint-ignore DL-01 reason:"Canvas sticker bg color" expiry:"2030-01-01"
      backgroundColor: '#f59e0b',
      x: 50,
      y: 60,
      zIndex: layers.length + 1,
    };
    pushState([...layers, newL]);
    setSelectedLayerId(newL.id);
    onSelectElement?.(newL.id);
  };

  const addQrCodeLayer = () => {
    const newL: CanvasLayer = {
      id: 'l-' + Date.now(),
      type: 'qr',
      qrUrl: 'https://waesy.com',
      width: 100,
      height: 100,
      x: 50,
      y: 150,
      zIndex: layers.length + 1,
    };
    pushState([...layers, newL]);
    setSelectedLayerId(newL.id);
    onSelectElement?.(newL.id);
  };

  const duplicateSelectedLayer = () => {
    if (!selectedLayer) return;
    const duplicated: CanvasLayer = {
      ...selectedLayer,
      id: 'l-' + Date.now(),
      x: selectedLayer.x + 16,
      y: selectedLayer.y + 16,
      zIndex: layers.length + 1,
    };
    pushState([...layers, duplicated]);
    setSelectedLayerId(duplicated.id);
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    const remaining = layers.filter((l) => l.id !== selectedLayerId);
    pushState(remaining);
    setSelectedLayerId(remaining[0]?.id || null);
  };

  const centerSelectedLayer = (axis: 'both' | 'x' | 'y') => {
    if (!selectedLayer || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current.getBoundingClientRect();
    let newX = selectedLayer.x;
    let newY = selectedLayer.y;

    if (axis === 'both' || axis === 'x') {
      newX = Math.round(container.width / 2 - (selectedLayer.width || 120) / 2);
    }
    if (axis === 'both' || axis === 'y') {
      newY = Math.round(container.height / 2 - (selectedLayer.height || 40) / 2);
    }

    const updated = layers.map((l) => (l.id === selectedLayer.id ? { ...l, x: newX, y: newY } : l));
    pushState(updated);
  };

  const reorderLayer = (direction: 'up' | 'down') => {
    if (!selectedLayerId) return;
    const index = layers.findIndex((l) => l.id === selectedLayerId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    const reordered = [...layers];
    const temp = reordered[index];
    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;
    pushState(reordered);
  };

  // Dragging com Pontaria e Snap Guides
  const handlePointerDown = (e: React.PointerEvent, layer: CanvasLayer) => {
    if (layer.isLocked) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setSelectedLayerId(layer.id);
    onSelectElement?.(layer.id);

    dragRef.current = {
      isDragging: true,
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      layerStartX: layer.x,
      layerStartY: layer.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !dragRef.current.layerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    let targetX = Math.round(dragRef.current.layerStartX + dx);
    let targetY = Math.round(dragRef.current.layerStartY + dy);

    // Snap Guides (Detecção de Centro Magnético)
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const layerMidX = targetX + 50;
      const layerMidY = targetY + 20;

      const snapX = Math.abs(layerMidX - centerX) < 8;
      const snapY = Math.abs(layerMidY - centerY) < 8;

      if (snapX) targetX = Math.round(centerX - 50);
      if (snapY) targetY = Math.round(centerY - 20);

      setSnapGuides({ horizontal: snapY, vertical: snapX });
    }

    setHistory((curr) => ({
      ...curr,
      present: curr.present.map((l) =>
        l.id === dragRef.current.layerId ? { ...l, x: targetX, y: targetY } : l
      ),
    }));
  };

  const handlePointerUp = () => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.layerId = null;
      setSnapGuides({ horizontal: false, vertical: false });
      // Registra no histórico ao soltar o mouse
      setHistory((curr) => ({
        past: [...curr.past.slice(-20), curr.present],
        present: curr.present,
        future: [],
      }));
    }
  };

  // Exportação Full HD Vetorial Nativa
  const handleExport = () => {
    try {
      const width = aspect === '16:9' ? 1920 : aspect === '9:16' ? 1080 : 1080;
      const height = aspect === '16:9' ? 1080 : aspect === '9:16' ? 1920 : 1080;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx && canvasContainerRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const scaleX = width / containerRect.width;
        const scaleY = height / containerRect.height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        for (const l of layers) {
          if (l.type === 'sticker' && l.text) {
            const fontPx = Math.round((l.fontSize || 14) * scaleX);
            ctx.font = `bold ${fontPx}px Inter, -apple-system, sans-serif`;
            const textMetrics = ctx.measureText(l.text);
            const padX = 14 * scaleX;
            const padY = 8 * scaleY;
            const boxW = textMetrics.width + padX * 2;
            const boxH = fontPx + padY * 2;

            // design-lint-ignore DL-01 reason:"Canvas sticker export background color fallback" expiry:"2030-01-01"
            ctx.fillStyle = l.backgroundColor || '#f59e0b';
            ctx.beginPath();
            ctx.roundRect(l.x * scaleX, l.y * scaleY, boxW, boxH, 8 * scaleX);
            ctx.fill();

            // design-lint-ignore DL-01 reason:"Canvas sticker export text color fallback" expiry:"2030-01-01"
            ctx.fillStyle = l.color || '#0f172a';
            ctx.textBaseline = 'middle';
            ctx.fillText(l.text, l.x * scaleX + padX, l.y * scaleY + boxH / 2);
          } else if (l.type === 'text' && l.text) {
            const fontPx = Math.round((l.fontSize || 20) * scaleX);
            const weight = l.fontWeight === 'black' ? '900' : l.fontWeight === 'bold' ? 'bold' : 'normal';
            ctx.font = `${weight} ${fontPx}px Inter, -apple-system, sans-serif`;
            // design-lint-ignore DL-01 reason:"Canvas text export color fallback" expiry:"2030-01-01"
            ctx.fillStyle = l.color || '#ffffff';
            ctx.textBaseline = 'top';
            ctx.fillText(l.text, l.x * scaleX, l.y * scaleY);
          } else if (l.type === 'qr' && l.qrUrl) {
            const qrUri = generateQrCodeDataUri(l.qrUrl, { border: 1 });
            const img = new Image();
            img.src = qrUri;
            img.onload = () => {
              ctx.drawImage(img, l.x * scaleX, l.y * scaleY, (l.width || 100) * scaleX, (l.height || 100) * scaleY);
            };
          }
        }

        const realDataUrl = canvas.toDataURL('image/png');
        if (onExportToHero) onExportToHero(realDataUrl);
      }
    } catch (err) {
      console.error('[studio-canvas] Falha na exportação nativa:', err);
    }
  };

  return (
    <div className={cn('p-6 rounded-lg bg-card border border-border space-y-5', className)}>
      {/* ── Toolbar Superior: Proporção, Histórico e Ferramentas ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Proporção */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg gap-1">
            {(['16:9', '1:1', '9:16'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setAspect(r)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-bold transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  aspect === r ? 'bg-card text-foreground border border-border/80' : 'text-muted-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Desfazer / Refazer */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={history.past.length === 0}
              onClick={undo}
              title="Desfazer (Ctrl+Z)"
              className="size-11 min-h-11 rounded-lg text-xs p-0 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={history.future.length === 0}
              onClick={redo}
              title="Refazer (Ctrl+Y)"
              className="size-11 min-h-11 rounded-lg text-xs p-0 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Redo2 className="size-4" />
            </Button>
          </div>

          {/* Cor de Fundo */}
          <div className="flex items-center gap-2 border-l border-border pl-2">
            <span className="text-xs text-muted-foreground">Fundo:</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="size-9 rounded-lg border border-border cursor-pointer bg-transparent focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Adição de Camadas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTextLayer}
            className="h-11 min-h-11 px-4 rounded-lg text-xs flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Type className="size-4" />
            Texto
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStickerLayer('DESTAQUE')}
            className="h-11 min-h-11 px-4 rounded-lg text-xs flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Sparkles className="size-4 text-amber-500" />
            Selo / Badge
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQrCodeLayer}
            className="h-11 min-h-11 px-4 rounded-lg text-xs flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <QrCode className="size-4 text-primary" />
            QR Code
          </Button>

          {onExportToHero && (
            <Button
              type="button"
              size="sm"
              onClick={handleExport}
              className="h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Send className="size-3.5" />
              Aplicar ao Hero
            </Button>
          )}
        </div>
      </div>

      {/* ── Área do Canvas com Manipulação Direta e Guias de Snap ── */}
      <div
        className="flex justify-center items-center p-6 bg-muted/20 rounded-lg overflow-hidden min-h-80 select-none relative"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          /* design-lint-ignore DL-05 reason:"Dynamic background color on canvas artboard" expiry:"2030-01-01" */
          style={{ backgroundColor: bgColor }}
          ref={canvasContainerRef}
          className={cn(
            'w-full max-w-2xl rounded-lg relative overflow-hidden border border-border/80 transition-opacity',
            aspect === '16:9' ? 'aspect-video' : aspect === '9:16' ? 'aspect-9/16 max-w-xs' : 'aspect-square max-w-sm'
          )}
        >
          {/* Linhas Guia Magnéticas (Smart Snap) */}
          {snapGuides.vertical && (
            <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-primary pointer-events-none z-30" />
          )}
          {snapGuides.horizontal && (
            <div className="absolute left-0 right-0 top-1/2 h-px border-t border-dashed border-primary pointer-events-none z-30" />
          )}

          {/* Camadas Renderizadas */}
          {layers.map((l) => (
            <button
              type="button"
              key={l.id}
              onPointerDown={(e) => handlePointerDown(e, l)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLayerId(l.id);
                onSelectElement?.(l.id);
              }}
              /* design-lint-ignore DL-05 reason:"Absolute coordinates and dynamic layer positioning" expiry:"2030-01-01" */
              style={{
                position: 'absolute',
                left: l.x,
                top: l.y,
                color: l.color,
                zIndex: l.zIndex || 1,
              }}
              className={cn(
                'cursor-move rounded select-none text-left p-0 border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                selectedLayerId === l.id
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50'
                  : 'hover:ring-1 hover:ring-muted-foreground/40'
              )}
            >
              {l.type === 'sticker' ? (
                /* design-lint-ignore DL-05 reason:"Dynamic font size and badge color styling" expiry:"2030-01-01" */
                <span
                  style={{
                    backgroundColor: l.backgroundColor || 'var(--primary)',
                    color: l.color || 'var(--primary-foreground)',
                    fontSize: l.fontSize || 14,
                  }}
                  className="px-3 py-1 rounded-full font-bold uppercase tracking-wider block"
                >
                  {l.text}
                </span>
              ) : l.type === 'qr' ? (
                <div className="p-2 bg-card rounded-lg border border-border">
                  <img
                    src={generateQrCodeDataUri(l.qrUrl || 'https://waesy.com', { border: 1 })}
                    alt="QR Code"
                    className="size-20 pointer-events-none"
                  />
                </div>
              ) : (
                /* design-lint-ignore DL-05 reason:"Dynamic font size and weight styling on text layer" expiry:"2030-01-01" */
                <span
                  style={{
                    fontSize: l.fontSize || 20,
                    fontWeight: l.fontWeight === 'black' ? 900 : l.fontWeight === 'bold' ? 700 : 400,
                  }}
                  className="block px-1 leading-tight"
                >
                  {l.text}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Painel de Propriedades da Camada Selecionada ── */}
      {selectedLayer && (
        <div className="p-4 rounded-lg bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-foreground">
              {selectedLayer.type === 'qr' ? 'Link do QR Code:' : 'Texto da Camada:'}
            </span>

            {selectedLayer.type === 'qr' ? (
              <Input
                value={selectedLayer.qrUrl || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  pushState(layers.map((l) => (l.id === selectedLayerId ? { ...l, qrUrl: val } : l)));
                }}
                className="h-11 min-h-11 w-64 text-xs rounded-lg"
              />
            ) : (
              <Input
                value={selectedLayer.text || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  pushState(layers.map((l) => (l.id === selectedLayerId ? { ...l, text: val } : l)));
                }}
                className="h-11 min-h-11 w-64 text-xs font-semibold rounded-lg"
              />
            )}

            {selectedLayer.type !== 'qr' && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Tamanho:</span>
                  <Input
                    type="number"
                    min={12}
                    max={72}
                    value={selectedLayer.fontSize || 18}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 18;
                      pushState(layers.map((l) => (l.id === selectedLayerId ? { ...l, fontSize: val } : l)));
                    }}
                    className="h-11 min-h-11 w-16 text-xs text-center rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Cor:</span>
                  <input
                    type="color"
                    /* design-lint-ignore DL-01 reason:"Canvas input color fallback" expiry:"2030-01-01" */
                    value={selectedLayer.color || '#ffffff'}
                    onChange={(e) => {
                      const val = e.target.value;
                      pushState(layers.map((l) => (l.id === selectedLayerId ? { ...l, color: val } : l)));
                    }}
                    className="size-8 rounded cursor-pointer bg-transparent border border-border"
                  />
                </div>
              </>
            )}
          </div>

          {/* Ações Rápidas de Alinhamento, Camadas e Clonagem */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => centerSelectedLayer('x')}
              title="Centralizar Horizontalmente"
              className="size-11 min-h-11 rounded-lg p-0 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <AlignCenter className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => reorderLayer('up')}
              title="Trazer para Frente"
              className="size-11 min-h-11 rounded-lg p-0 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => reorderLayer('down')}
              title="Enviar para Trás"
              className="size-11 min-h-11 rounded-lg p-0 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={duplicateSelectedLayer}
              title="Duplicar Camada (Ctrl+D)"
              className="size-11 min-h-11 rounded-lg p-0 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={deleteSelectedLayer}
              title="Excluir Camada (Delete)"
              className="size-11 min-h-11 rounded-lg p-0 flex items-center justify-center text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
