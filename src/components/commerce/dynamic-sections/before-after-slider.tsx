import React, { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
 title?: string;
 subtitle?: string;
 before_image: string;
 after_image: string;
 before_label?: string;
 after_label?: string;
}

export function BeforeAfterSlider({
 title = "Resultados Reais",
 subtitle = "Arraste a barra central para comparar a transformação",
 before_image,
 after_image,
 before_label = "Antes",
 after_label = "Depois",
}: BeforeAfterSliderProps) {
 const [sliderPosition, setSliderPosition] = useState(50);
 const [isDragging, setIsDragging] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 const handleMove = useCallback((clientX: number) => {
 if (!containerRef.current) return;
 const rect = containerRef.current.getBoundingClientRect();
 const x = clientX - rect.left;
 let percentage = (x / rect.width) * 100;
 if (percentage < 0) percentage = 0;
 if (percentage > 100) percentage = 100;
 setSliderPosition(percentage);
 }, []);

 const handleTouchMove = useCallback(
 (e: React.TouchEvent) => {
 handleMove(e.touches[0].clientX);
 },
 [handleMove],
 );

 const handleMouseMove = useCallback(
 (e: React.MouseEvent) => {
 if (!isDragging) return;
 handleMove(e.clientX);
 },
 [isDragging, handleMove],
 );

 // Honest empty state — never show fallback images
 if (!before_image || !after_image) {
 return (
 <section className="w-full py-12 px-4 md:px-8 max-w-5xl mx-auto">
 <div className="flex flex-col items-center justify-center py-16 text-center gap-4 text-muted-foreground border-0">
 <span className="text-3xl opacity-40">&#8596;</span>
 <div>
 <p className="font-medium">Comparador não configurado</p>
 <p className="text-sm mt-1">
 Adicione as imagens "Antes" e "Depois" no editor para ativar o slider.
 </p>
 </div>
 </div>
 </section>
 );
 }

 return (
 <section className="w-full py-12 px-4 md:px-8 max-w-5xl mx-auto">
 {(title || subtitle) && (
 <div className="text-center mb-8">
 {title && (
 <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
 {title}
 </h2>
 )}
 {subtitle && (
 <p className="text-muted-foreground text-base max-w-2xl mx-auto">{subtitle}</p>
 )}
 </div>
 )}

 <div
 ref={containerRef}
 className="relative w-full h-[350px] md:h-[500px] overflow-hidden select-none cursor-ew-resize "
 onMouseDown={() => setIsDragging(true)}
 onMouseUp={() => setIsDragging(false)}
 onMouseLeave={() => setIsDragging(false)}
 onMouseMove={handleMouseMove}
 onTouchMove={handleTouchMove}
 >
 {/* Background: After Image */}
 <img
 src={after_image}
 alt={after_label}
 className="absolute inset-0 w-full h-full object-cover"
 />
 <span className="absolute top-4 right-4 bg-background/80 backdrop-blur-md text-foreground text-xs font-bold px-3 py-2 rounded-full shadow ">
 {after_label}
 </span>

 {/* Foreground: Before Image (Clipped) */}
 <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
 <img
 src={before_image}
 alt={before_label}
 className="absolute inset-0 w-full h-full object-cover"
 style={{
 width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%",
 maxWidth: "none",
 }}
 />
 <span className="absolute top-4 left-4 bg-background/80 backdrop-blur-md text-foreground text-xs font-bold px-3 py-2 rounded-full shadow ">
 {before_label}
 </span>
 </div>

 {/* Slider Divider Line */}
 <div
 className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
 style={{ left: `${sliderPosition}%` }}
 >
 <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-foreground flex items-center justify-center border border-primary font-bold text-xs">
 ↔
 </div>
 </div>
 </div>
 </section>
 );
}
