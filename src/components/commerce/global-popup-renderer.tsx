import * as React from "react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExperienceRenderer } from "@/components/commerce/experience-renderer";

interface GlobalPopupRendererProps {
 popups: Array<{
 id: string;
 trigger_rules: any;
 tree: any[];
 }>;
}

export function GlobalPopupRenderer({ popups }: GlobalPopupRendererProps) {
 const [activePopupId, setActivePopupId] = useState<string | null>(null);

 useEffect(() => {
 if (!popups || popups.length === 0) return;

 // Check rules for each popup (Microphase 2 implementation logic)
 const timers: NodeJS.Timeout[] = [];

 popups.forEach((popup) => {
 // Check if already seen using localStorage
 const seenKey = `popup_seen_${popup.id}`;
 if (typeof window !== "undefined" && localStorage.getItem(seenKey)) {
 return; // Already seen
 }

 const rule = popup.trigger_rules?.trigger || "on_load";
 const delay = popup.trigger_rules?.delay_ms || 3000;

 if (rule === "on_load") {
 const timer = setTimeout(() => {
 setActivePopupId(popup.id);
 }, delay);
 timers.push(timer);
 }
 // exit_intent and others can be added here
 });

 return () => {
 timers.forEach(clearTimeout);
 };
 }, [popups]);

 const handleOpenChange = (open: boolean) => {
 if (!open && activePopupId) {
 // Mark as seen
 if (typeof window !== "undefined") {
 localStorage.setItem(`popup_seen_${activePopupId}`, "true");
 }
 setActivePopupId(null);
 }
 };

 const activePopup = popups.find((p) => p.id === activePopupId);

 if (!activePopup) return null;

 return (
 <Dialog open={!!activePopup} onOpenChange={handleOpenChange}>
 <DialogContent className="sm:max-w-3xl sm:w-[90vw] w-full p-0 overflow-hidden bg-background border-none">
 {/* Render the Tree built from the Builder Platform */}
 <div className="w-full max-h-vh-80 overflow-y-auto no-scrollbar">
 <ExperienceRenderer nodes={activePopup.tree} bindings={(activePopup as any).bindings} />
 </div>
 </DialogContent>
 </Dialog>
 );
}
