import { Link } from "@tanstack/react-router";

export function AnnouncementBar({ content }: { content: Record<string, unknown> }) {
 const text = String(content.text || "");
 const link = content.link ? String(content.link) : null;
 const bgColor = String(content.bg_color || "var(--primary)");
 const textColor = String(content.text_color || "var(--primary-foreground)");

 if (!text) return null;

 return (
 <div
 className="py-2 text-center text-xs font-medium"
 style={{ backgroundColor: bgColor, color: textColor }}
 >
 {link ? (
 <Link to={link as never} className="underline-offset-2 hover:underline">
 {text}
 </Link>
 ) : (
 <span>{text}</span>
 )}
 </div>
 );
}
