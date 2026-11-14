import React from "react";
import type { ProposalCanvasFormat } from "@/services/travel-proposal.functions";

export function DocumentPage({
  children,
  format = "a4-portrait",
  className = "",
}: {
  children: React.ReactNode;
  format?: ProposalCanvasFormat;
  className?: string;
}) {
  let minHeight = "1123px";
  let pageClass = "a4-page";

  if (format === "a4-landscape") {
    minHeight = "794px";
    pageClass = "a4-landscape-page";
  } else if (format === "presentation-169") {
    minHeight = "1080px";
    pageClass = "presentation-page";
  } else if (format === "story-916") {
    minHeight = "1920px";
    pageClass = "pdf-page";
  } else if (format === "letter-portrait") {
    minHeight = "1056px";
    pageClass = "pdf-page";
  }

  const pageStyle: React.CSSProperties = {
    width: "100%",
    minHeight,
    pageBreakAfter: "always",
  };

  return (
    <div
      className={`relative p-canvas-root flex flex-col shrink-0 overflow-hidden box-border ${pageClass} ${className}`}
      style={pageStyle}
    >
      {children}
    </div>
  );
}
