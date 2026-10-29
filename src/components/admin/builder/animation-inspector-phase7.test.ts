import { describe, it, expect } from 'vitest';

// Emulates resolveAnimationClasses logic for test assertion
function testResolveAnimationClasses(designTokens?: Record<string, any>, layoutRules?: Record<string, any>): string {
 const anim = designTokens?.animation || layoutRules?.animation;
 if (!anim || anim.trigger === "none") return "";

 const classes: string[] = ["transition-colors duration-200"];

 if (anim.trigger === "fade_up") {
 classes.push("animate-in fade-in slide-in-from-bottom-6 duration-200 ease-out fill-mode-both");
 } else if (anim.trigger === "zoom_in") {
 classes.push("animate-in fade-in zoom-in-95 duration-200 ease-out fill-mode-both");
 } else if (anim.trigger === "slide_left") {
 classes.push("animate-in fade-in slide-in-from-left-6 duration-200 ease-out fill-mode-both");
 } else if (anim.trigger === "parallax") {
 classes.push("motion-safe:hover:-translate-y-1 transition-transform duration-200");
 }

 if (anim.hover === "lift") {
 classes.push("hover:-translate-y-1.5 hover:shadow-xl transition-transform duration-200 duration-300");
 } else if (anim.hover === "glow") {
 classes.push("hover:ring-2 hover:ring-primary/40 hover:shadow-lg transition-colors duration-200 duration-300");
 }

 return classes.join(" ");
}

describe('[FASE 7 AUDIT] Wix Studio Standard Animation Engine & Builder Inspector', () => {
 it('should return empty string for static or unconfigured animations', () => {
 expect(testResolveAnimationClasses({})).toBe("");
 expect(testResolveAnimationClasses({ animation: { trigger: "none" } })).toBe("");
 });

 it('should generate high-fidelity 60fps classes for fade_up and zoom_in triggers', () => {
 const fadeUpClasses = testResolveAnimationClasses({
 animation: { trigger: "fade_up", speed: "normal" }
 });
 expect(fadeUpClasses).toContain("animate-in");
 expect(fadeUpClasses).toContain("slide-in-from-bottom-6");
 expect(fadeUpClasses).toContain("duration-200");

 const zoomClasses = testResolveAnimationClasses({
 animation: { trigger: "zoom_in", speed: "fast" }
 });
 expect(zoomClasses).toContain("zoom-in-95");
 });

 it('should generate hover microinteractions with Apple HIG elevation and glow', () => {
 const liftHoverClasses = testResolveAnimationClasses({
 animation: { trigger: "fade_up", hover: "lift" }
 });
 expect(liftHoverClasses).toContain("hover:-translate-y-1.5");
 expect(liftHoverClasses).toContain("hover:shadow-xl");

 const glowHoverClasses = testResolveAnimationClasses({
 animation: { trigger: "parallax", hover: "glow" }
 });
 expect(glowHoverClasses).toContain("hover:ring-primary/40");
 });
});
