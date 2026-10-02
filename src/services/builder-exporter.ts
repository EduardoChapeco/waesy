import type { ExperienceNode } from '@/lib/builder-types';

export interface ExportHtmlOptions {
 title?: string;
 storeName?: string;
 description?: string;
 faviconUrl?: string;
}

export function exportStaticHtml(
 nodes: Partial<ExperienceNode>[],
 options: ExportHtmlOptions = {}
): string {
 const title = options.title || 'Experiência Interativa Waesy';
 const storeName = options.storeName || 'Loja Certificada Waesy';
 const desc = options.description || 'Página de alta conversão gerada com Waesy Universal Experience Builder';

 const serializedNodes = JSON.stringify(nodes).replace(/</g, '\\u003c');

 return `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>${title} · ${storeName}</title>
 <meta name="description" content="${desc}">
 <meta name="generator" content="Waesy Universal Experience Builder">
 <!-- Fonts -->
 <link rel="preconnect" href="https://fonts.googleapis.com">
 <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
 <!-- Tailwind CSS -->
 <script src="https://cdn.tailwindcss.com"></script>
 <script>
 tailwind.config = {
 theme: {
 extend: {
 fontFamily: {
 sans: ['Inter', 'sans-serif'],
 heading: ['Outfit', 'sans-serif'],
 },
 colors: {
 brand: '#0284c7',
 }
 }
 }
 }
 </script>
</head>
<body class="bg-slate-950 text-slate-50 min-h-screen antialiased selection:bg-brand selection:text-white">
 <div id="waesy-root" class="w-full flex flex-col items-center">
 <!-- Header Standalone -->
 <header class="w-full max-w-6xl py-6 px-4 flex items-center justify-between border-b border-slate-800/80">
 <div class="flex items-center gap-2">
 <span class="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
 <span class="font-heading font-extrabold text-lg tracking-tight">${storeName}</span>
 </div>
 <div class="text-xs text-slate-400 font-mono">Certificado Waesy 360</div>
 </header>

 <!-- Main Content Container -->
 <main id="waesy-experience-container" class="w-full max-w-6xl py-8 px-4 space-y-8">
 <div class="p-8 rounded-lg bg-slate-900/60 border border-slate-800 text-center space-y-4 shadow-2xl">
 <h1 class="text-3xl sm:text-5xl font-heading font-black tracking-tight">${title}</h1>
 <p class="text-sm text-slate-400 max-w-xl mx-auto">${desc}</p>
 <div class="pt-4 flex justify-center gap-3">
 <a href="#contato" class="px-6 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wide uppercase transition-all shadow-lg">
 Acessar Atendimento
 </a>
 </div>
 </div>
 </main>

 <!-- Footer Standalone -->
 <footer class="w-full max-w-6xl py-8 px-4 mt-auto border-t border-slate-800/60 text-center text-xs text-slate-500">
 <p>© ${new Date().getFullYear()} ${storeName}. Desenvolvido com tecnologia Waesy Universal Experience.</p>
 </footer>
 </div>

 <script>
 window.__WAESY_EXPERIENCE_NODES__ = ${serializedNodes};
 console.log("Waesy Standalone Experience Loaded", window.__WAESY_EXPERIENCE_NODES__.length, "nodes");
 </script>
</body>
</html>`;
}

export interface DeployHookResponse {
 success: boolean;
 message: string;
 statusCode?: number;
}

export async function triggerDeployHook(
 platform: 'github' | 'vercel' | 'cloudflare',
 hookUrl: string,
 payload: Record<string, any> = {}
): Promise<DeployHookResponse> {
 try {
 const response = await fetch(hookUrl, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 platform,
 triggeredAt: new Date().toISOString(),
 ...payload,
 }),
 });

 return {
 success: response.ok,
 message: response.ok
 ? `Deploy disparado com sucesso para ${platform.toUpperCase()}!`
 : `Falha ao disparar deploy para ${platform.toUpperCase()}: ${response.statusText}`,
 statusCode: response.status,
 };
 } catch (error: any) {
 return {
 success: false,
 message: `Erro de conexão no deploy hook: ${error.message}`,
 };
 }
}
