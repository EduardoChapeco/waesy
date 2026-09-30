import React from "react";

export interface PwaSplashPreviewProps {
  appName: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  iconUrl?: string | null;
  splashImageUrl?: string | null;
  animationType?: "pulse" | "bounce" | "fade";
}

export const PwaSplashPreview: React.FC<PwaSplashPreviewProps> = ({
  appName,
  shortName,
  themeColor,
  backgroundColor,
  iconUrl,
  splashImageUrl,
  animationType = "pulse",
}) => {
  return (
    <div
      style={{ backgroundColor }}
      className="size-full flex flex-col items-center justify-between p-6 select-none transition-colors duration-300"
    >
      <div className="h-6" /> {/* Top spacing */}

      {/* Centro: Splash Icon ou Imagem */}
      <div className="flex flex-col items-center justify-center space-y-4 my-auto">
        {splashImageUrl ? (
          <img
            src={splashImageUrl}
            alt={appName}
            className="max-h-48 max-w-48 object-contain rounded-2xl shadow-sm transition-transform duration-500"
          />
        ) : iconUrl ? (
          <div className="size-24 rounded-3xl overflow-hidden shadow-lg border border-white/10 shrink-0">
            <img src={iconUrl} alt={shortName} className="size-full object-cover" />
          </div>
        ) : (
          <div
            style={{ backgroundColor: themeColor }}
            className="size-24 rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-lg border border-white/15"
          >
            {shortName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="space-y-1 text-center">
          <h3 className="font-bold text-lg text-white tracking-tight">{shortName}</h3>
          <p className="text-xs text-neutral-400 max-w-44 truncate">{appName}</p>
        </div>

        {/* Indicador de carregamento animado */}
        <div className="flex items-center justify-center gap-1.5 pt-3">
          <div
            style={{ backgroundColor: themeColor }}
            className={`size-2 rounded-full ${
              animationType === "bounce"
                ? "animate-bounce"
                : animationType === "pulse"
                ? "animate-pulse"
                : "opacity-80"
            }`}
          />
          <div
            style={{ backgroundColor: themeColor }}
            className={`size-2 rounded-full ${
              animationType === "bounce"
                ? "animate-bounce [animation-delay:0.2s]"
                : animationType === "pulse"
                ? "animate-pulse [animation-delay:0.2s]"
                : "opacity-80"
            }`}
          />
          <div
            style={{ backgroundColor: themeColor }}
            className={`size-2 rounded-full ${
              animationType === "bounce"
                ? "animate-bounce [animation-delay:0.4s]"
                : animationType === "pulse"
                ? "animate-pulse [animation-delay:0.4s]"
                : "opacity-80"
            }`}
          />
        </div>
      </div>

      {/* Rodapé do Splash */}
      <div className="text-center pb-2">
        <span className="text-xs font-medium text-neutral-500 tracking-wider uppercase">
          Powered by Waesy
        </span>
      </div>
    </div>
  );
};
