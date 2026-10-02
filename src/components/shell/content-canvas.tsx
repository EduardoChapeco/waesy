import { type ReactNode } from "react";

export interface ContentCanvasProps {
 children: ReactNode;
 widthMode?: string;
 className?: string;
 aside?: ReactNode;
}

export function ContentCanvas({ children, className = "", aside }: ContentCanvasProps) {
 if (aside) {
 return (
 <div className={`flex flex-col xl:flex-row gap-8 items-start w-full ${className}`}>
 <div className="w-full max-w-[640px] shrink-0 space-y-6">{children}</div>
 <aside className="hidden xl:block w-80 shrink-0 sticky top-6 self-start space-y-6">
 {aside}
 </aside>
 </div>
 );
 }

 return <div className={`w-full ${className}`}>{children}</div>;
}
