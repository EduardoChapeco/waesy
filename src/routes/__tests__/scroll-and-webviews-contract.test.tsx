import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(".");

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("Scroll Global, Sticky Headers e Contratos Web-View", () => {
  it("__root.tsx libera scroll nativo do documento (sem viewport-lock no body)", () => {
    const src = readRel("src/routes/__root.tsx");
    const bodyMatch = src.match(/<body\s+className="([^"]+)"/);
    expect(bodyMatch, "<body> deve declarar className").toBeTruthy();
    const bodyClasses = bodyMatch![1];
    expect(bodyClasses).not.toContain("viewport-lock");
    expect(bodyClasses).toContain("min-h-dvh");
    expect(bodyClasses).toContain("overflow-x-clip");
  });

  it("styles.css preserva sticky/scroll do documento (overflow-x: clip, scroll lock restrito a dialogs, scrollbar visível no desktop)", () => {
    const css = readRel("src/styles.css");

    const htmlBlock = css.match(/^[^\S\r\n]*html\s*\{[\s\S]*?\r?\n[^\S\r\n]*\}/m)?.[0] ?? "";
    expect(htmlBlock).toContain("overflow-x: clip;");
    expect(htmlBlock).not.toContain("overflow-x: hidden;");
    expect(htmlBlock).not.toContain("height: 100%;");

    const bodyBlocks = [...css.matchAll(/^[^\S\r\n]*body\s*\{[\s\S]*?\r?\n[^\S\r\n]*\}/gm)].map((m) => m[0]);
    expect(bodyBlocks.length).toBeGreaterThan(0);
    const joinedBody = bodyBlocks.join("\n");
    expect(joinedBody).toContain("overflow-x: clip;");
    expect(joinedBody).not.toContain("overflow-x: hidden;");

    expect(css).not.toMatch(/body:has\(\[data-state="open"\]\)/);
    expect(css).toContain('body:has([role="dialog"][data-state="open"])');
    expect(css).toContain('body:has([role="alertdialog"][data-state="open"])');

    expect(css).toContain("@media (max-width: 839px)");
    expect(css).toContain("@media (min-width: 840px)");
    expect(css).toMatch(/scrollbar-color:\s*var\(--color-border\)\s+transparent/);
  });

  it("AppShell preserva min-h-0, scrollbar-waesy em <main> e overflow-x-clip em standalone web-views", () => {
    const src = readRel("src/components/shell/app-shell.tsx");
    expect(src).toContain("min-h-dvh w-full bg-background text-foreground flex flex-col overflow-x-clip");
    expect(src).toContain('"size-full min-h-0 flex flex-col relative overflow-hidden canvas-push-transition"');
    expect(src).toContain("flex-1 min-h-0 flex min-w-0 w-full max-w-full relative overflow-hidden");
    expect(src).toContain("main-container-query flex-1 flex flex-col min-w-0 min-h-0 h-full w-full max-w-full");
    expect(src).toContain("overflow-y-auto scrollbar-waesy overflow-x-hidden");
    expect(src).not.toMatch(/<main[\s\S]{0,600}overflow-y-auto no-scrollbar/);
  });

  it("WorkspaceShell, AdminMaster e StudioFrame liberam scroll vertical/desktop sem aprisionar layout", () => {
    const workspaceSrc = readRel("src/components/workspace/workspace-shell.tsx");
    expect(workspaceSrc).toContain("min-h-0 overflow-y-auto scrollbar-waesy");
    expect(workspaceSrc).not.toContain("overflow-y-auto no-scrollbar flex flex-col bg-background");

    const adminSrc = readRel("src/routes/admin-master.tsx");
    expect(adminSrc).not.toMatch(/["'\s]w-screen["'\s]/);
    expect(adminSrc).toContain("flex-1 overflow-y-auto scrollbar-waesy min-h-0");
    expect(adminSrc).not.toContain("flex-1 overflow-y-auto no-scrollbar min-h-0");

    const studioSrc = readRel("src/components/tourism/studio/studio-frame.tsx");
    expect(studioSrc).toContain("flex-1 min-h-0 w-full h-full overflow-auto scrollbar-waesy");
    expect(studioSrc).not.toContain("overflow-y-auto no-scrollbar overflow-x-hidden");
  });

  it("_store.contrato.$token e _store.proposta.$token atendem contraste semântico e alvos táteis >= 44px no mobile", () => {
    const contratoSrc = readRel("src/routes/_store.contrato.$token.tsx");
    expect(contratoSrc).not.toContain("bg-emerald-600 text-foreground");
    expect(contratoSrc).not.toContain("bg-slate-900 text-foreground");
    expect(contratoSrc).toContain("bg-success text-success-foreground");
    expect(contratoSrc).toContain("bg-foreground text-background");

    const propostaSrc = readRel("src/routes/_store.proposta.$token.tsx");
    expect(propostaSrc).toContain("h-11 sm:h-10 text-base md:text-sm rounded-lg flex-1");
    expect(propostaSrc).toContain("size-11 min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0");
  });
});
