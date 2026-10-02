import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextProps {
  content?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    content?: string;
    text?: string;
    align?: "left" | "center" | "right";
    max_width?: "sm" | "md" | "lg" | "xl" | "full";
    button_text?: string;
    button_link?: string;
  };
  design_tokens?: any;
}

export function RichText({ content, design_tokens }: RichTextProps) {
  const rawText = String(content?.content || content?.text || "");
  const badge = content?.badge || "";
  const title = content?.title || "";
  const subtitle = content?.subtitle || "";
  const align = content?.align || "center";
  const maxWidth = content?.max_width || "lg";
  const buttonText = content?.button_text || "";
  const buttonLink = content?.button_link || "";

  if (!rawText && !title && !badge) return null;

  const maxWidthClass =
    maxWidth === "sm"
      ? "max-w-xl"
      : maxWidth === "md"
      ? "max-w-2xl"
      : maxWidth === "lg"
      ? "max-w-3xl"
      : maxWidth === "xl"
      ? "max-w-5xl"
      : "max-w-full";

  const alignClass =
    align === "left"
      ? "text-left items-start"
      : align === "right"
      ? "text-right items-end"
      : "text-center items-center";

  // Lightweight markdown-like parser for bold, italics, links, quotes, and line breaks
  const formatText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-3xl sm:text-4xl font-black text-foreground mt-4 mb-2 tracking-tight">
            {line.replace("# ", "")}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3 mb-2 tracking-tight">
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-xl sm:text-2xl font-bold text-foreground mt-2 mb-2 tracking-tight">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            className="border-l-2 border-primary pl-4 py-1 my-3 text-muted-foreground italic bg-muted/20 rounded-r-lg"
          >
            {line.replace("> ", "")}
          </blockquote>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-foreground/90 my-1">
            {parseInlineMarkdown(line.substring(2))}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-3" />;
      }
      return (
        <p key={idx} className="text-base sm:text-lg text-foreground/80 leading-relaxed my-2">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (line: string): React.ReactNode => {
    // Basic bold **text** and italic *text* handling
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={pIdx} className="italic text-foreground/90">{part.slice(1, -1)}</em>;
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={pIdx}
            href={linkMatch[2]}
            className="text-primary underline font-medium hover:opacity-80 transition-opacity"
            target={linkMatch[2].startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <section
      className={cn("w-full py-10 md:py-16 px-4 sm:px-6", design_tokens?.className)}
      style={{
        backgroundColor: design_tokens?.backgroundColor,
        color: design_tokens?.textColor,
      }}
    >
      <div className={cn("mx-auto flex flex-col space-y-4", maxWidthClass, alignClass)}>
        {badge && (
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Star className="size-3" />
              {badge}
            </span>
          </div>
        )}

        {title && (
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
            {title}
          </h2>
        )}

        {subtitle && (
          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl">
            {subtitle}
          </p>
        )}

        {rawText && (
          <div className="w-full text-left pt-2 leading-relaxed space-y-1">
            {formatText(rawText)}
          </div>
        )}

        {buttonText && (
          <div className="pt-4">
            <Button asChild size="lg" className="rounded-lg h-11 px-6 font-bold text-xs gap-2">
              <Link to={buttonLink || "/explorar"}>
                <span>{buttonText}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
