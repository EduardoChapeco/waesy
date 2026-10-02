import { Instagram, Heart, MessageCircle } from "lucide-react";

interface SocialGridProps {
 content: {
 username: string;
 title?: string;
 posts?: Array<{
 image_url: string;
 link?: string;
 likes?: string;
 comments?: string;
 }>;
 };
}

export function SocialGrid({ content }: SocialGridProps) {
 const posts = content.posts || [];
 const title = content.title || "Galeria de Fotos da Loja";
 const username = content.username || "waesy";

 // As métricas de engajamento agora vêm diretamente dos campos definidos no painel
 // de administração (via CMS Builder), permitindo total flexibilidade sem mock data.

 return (
 <section className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
 <div className="flex flex-col @sm:flex-row @sm:items-center @sm:justify-between gap-2 border-b pb-4">
 <div>
 <h2 className="text-xl @md:text-2xl font-black text-foreground tracking-tight">
 {title}
 </h2>
 <a
 href={`https://instagram.com/${username}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-semibold text-primary hover:underline flex items-center gap-2 mt-1"
 >
 <Instagram className="size-4" />@{username}
 </a>
 </div>
 </div>

 {posts.length === 0 ? (
 <div className="p-8 text-center text-xs text-muted-foreground border border-dashed">
 Nenhuma publicação vinculada ao feed social.
 </div>
 ) : (
 <div className="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-6 gap-4">
 {posts.slice(0, 6).map((post, idx) => {
 const metrics = { likes: post.likes, comments: post.comments };
 const Wrapper = post.link ? "a" : "div";
 const wrapperProps = post.link
 ? { href: post.link, target: "_blank", rel: "noopener noreferrer" }
 : {};

 return (
 <Wrapper
 key={idx}
 {...wrapperProps}
 className="group relative aspect-square overflow-hidden bg-muted block "
 >
 <img
 src={post.image_url}
 alt={`Galeria de fotos ${idx + 1}`}
 className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
 loading="lazy"
 />

 {/* Overlay Hover para Engajamento */}
 {(metrics.likes || metrics.comments) && (
 <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center gap-4 text-white">
 {metrics.likes && (
 <div className="flex items-center gap-2 text-sm font-semibold">
 <Heart className="size-5 fill-white" />
 <span>{metrics.likes}</span>
 </div>
 )}
 {metrics.comments && (
 <div className="flex items-center gap-2 text-sm font-semibold">
 <MessageCircle className="size-5 fill-white" />
 <span>{metrics.comments}</span>
 </div>
 )}
 </div>
 )}
 </Wrapper>
 );
 })}
 </div>
 )}
 </section>
 );
}
