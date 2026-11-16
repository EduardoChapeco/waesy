import React, { useEffect, useId, useMemo, useState } from "react";
import { Play, Copy, Check, Download, Terminal, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ArtifactCodeSandboxProps {
  title: string;
  language?: string;
  code?: string;
  filename?: string;
  files?: Record<string, string>;
  className?: string;
}

function buildSandboxRunnerHtml(runId: string, lang: "python" | "javascript", code: string): string {
  const safePayload = JSON.stringify({ runId, code }).replace(/<\/script/gi, "<\\/script");
  if (lang === "javascript") {
    return `<!doctype html><html><head><meta charset="utf-8" /></head><body><script>
(function(){
  var payload = ${safePayload};
  var logs = [];
  var send = function(type, data){
    try { window.parent.postMessage(Object.assign({ source: "waesy-code-sandbox", runId: payload.runId, type: type }, data), "*"); } catch(e){}
  };
  var fmt = function(a){
    return Array.prototype.slice.call(a).map(function(x){
      if (typeof x === "string") return x;
      try { return JSON.stringify(x); } catch(e){ return String(x); }
    }).join(" ");
  };
  console.log = function(){ logs.push(fmt(arguments)); };
  console.warn = function(){ logs.push("[WARN] " + fmt(arguments)); };
  console.error = function(){ logs.push("[ERR] " + fmt(arguments)); };
  var t0 = performance.now();
  try {
    var result = (0, eval)(payload.code);
    if (result !== undefined) logs.push("=> " + fmt([result]));
    send("result", { stdout: logs.join("\\n"), stderr: "", durationMs: Math.round(performance.now() - t0) });
  } catch (err) {
    send("result", { stdout: logs.join("\\n"), stderr: String(err && err.stack ? err.stack : err), durationMs: Math.round(performance.now() - t0) });
  }
})();
</script></body></html>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8" />
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"></script>
</head><body><script>
(async function(){
  var payload = ${safePayload};
  var send = function(type, data){
    try { window.parent.postMessage(Object.assign({ source: "waesy-code-sandbox", runId: payload.runId, type: type }, data), "*"); } catch(e){}
  };
  var t0 = performance.now();
  try {
    if (typeof loadPyodide !== "function") {
      throw new Error("Não foi possível carregar o runtime Python (Pyodide CDN).");
    }
    var pyodide = await loadPyodide();
    var out = [];
    var errOut = [];
    pyodide.setStdout({ batched: function(s){ out.push(s); } });
    pyodide.setStderr({ batched: function(s){ errOut.push(s); } });
    await pyodide.runPythonAsync(payload.code);
    send("result", { stdout: out.join("\\n"), stderr: errOut.join("\\n"), durationMs: Math.round(performance.now() - t0) });
  } catch (err) {
    send("result", { stdout: "", stderr: String(err && err.message ? err.message : err), durationMs: Math.round(performance.now() - t0) });
  }
})();
</script></body></html>`;
}

export function ArtifactCodeSandbox({
  title,
  language,
  code,
  filename,
  files,
  className,
}: ArtifactCodeSandboxProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const fileEntries = useMemo(() => {
    const map: Record<string, string> = { ...(files || {}) };
    if (Object.keys(map).length === 0) {
      const defName = filename || (language === "python" ? "main.py" : "script.js");
      map[defName] = code || "";
    }
    return map;
  }, [code, filename, files, language]);

  const fileNames = useMemo(() => Object.keys(fileEntries), [fileEntries]);
  const [selectedFile, setSelectedFile] = useState<string>(fileNames[0] || "main.py");
  const activeCode = fileEntries[selectedFile] || code || "";
  const resolvedLang: "python" | "javascript" =
    language === "python" || selectedFile.endsWith(".py") ? "python" : "javascript";

  const [runnerDoc, setRunnerDoc] = useState<string>("");
  const [activeRunId, setActiveRunId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [stdout, setStdout] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeRunId) return;
    const handler = (ev: MessageEvent) => {
      if (ev?.data?.source !== "waesy-code-sandbox" || ev?.data?.runId !== activeRunId) return;
      if (ev.data.type === "result") {
        setStdout(String(ev.data.stdout || ""));
        setStderr(String(ev.data.stderr || ""));
        setDurationMs(typeof ev.data.durationMs === "number" ? ev.data.durationMs : null);
        setIsRunning(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [activeRunId]);

  const handleRun = () => {
    const runId = `${uid}-${Date.now()}`;
    setActiveRunId(runId);
    setStdout("");
    setStderr("");
    setDurationMs(null);
    setIsRunning(true);
    setRunnerDoc(buildSandboxRunnerHtml(runId, resolvedLang, activeCode));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    toast.success(`Código de "${selectedFile}" copiado.`);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([activeCode], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: selectedFile || (resolvedLang === "python" ? "script.py" : "script.js"),
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {fileNames.map((fname) => (
            <Button key={fname} type="button" variant={selectedFile === fname ? "outline" : "ghost"} size="sm" onClick={() => setSelectedFile(fname)} className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-mono">
              {fname}
            </Button>
          ))}
          <Badge variant="secondary" className="text-2xs">
            {resolvedLang === "python" ? "Python Wasm Sandbox" : "JS Sandbox"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs gap-2">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs gap-2">
            <Download className="size-3.5" />
            <span>Baixar</span>
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleRun} disabled={isRunning} className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-semibold gap-2">
            {isRunning ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Play className="size-3.5" />}
            <span>{isRunning ? "Executando" : "Executar Código"}</span>
          </Button>
        </div>
      </div>

      <pre className="max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-background p-3 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
        {activeCode}
      </pre>

      {(stdout || stderr || isRunning) && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2 font-semibold text-foreground">
              <Terminal className="size-3.5" />
              <span>Saída do Sandbox ({title})</span>
            </span>
            {durationMs !== null && (
              <span className="font-mono text-2xs text-muted-foreground">{durationMs}ms</span>
            )}
          </div>
          {stdout && (
            <pre className="max-h-48 overflow-y-auto rounded-lg bg-background p-2 text-xs font-mono text-foreground whitespace-pre-wrap break-words border border-border/40">
              {stdout}
            </pre>
          )}
          {stderr && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs font-mono text-destructive flex items-start gap-2">
              <AlertTriangle className="size-3.5 shrink-0 mt-1" />
              <pre className="whitespace-pre-wrap break-words">{stderr}</pre>
            </div>
          )}
        </div>
      )}

      {runnerDoc && (
        <iframe
          title={`Sandbox ${title}`}
          srcDoc={runnerDoc}
          sandbox="allow-scripts"
          className="hidden"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
