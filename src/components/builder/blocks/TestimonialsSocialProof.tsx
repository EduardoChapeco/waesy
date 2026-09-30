import React from "react";
import { TestimonialsBlockData, OmniBlockStyling } from "../types";
import { Star, CheckCircle2, Quote } from "lucide-react";

export interface TestimonialsSocialProofProps {
  id: string;
  data: TestimonialsBlockData;
  styling?: OmniBlockStyling;
  className?: string;
}

export const TestimonialsSocialProof: React.FC<TestimonialsSocialProofProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const paddingYClasses = {
    none: "py-0",
    sm: "py-8",
    md: "py-16",
    lg: "py-24",
    xl: "py-32",
  }[styling?.paddingY || "md"];

  const radiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-3xl",
  }[styling?.borderRadius || "xl"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const testimonials = data.testimonials && data.testimonials.length > 0 ? data.testimonials : [
    {
      id: "t-1",
      name: "Dra. Carolina Mendes",
      role: "Sócia no Mendes & Associados",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      rating: 5,
      comment: "A plataforma transformou nossa presença digital. O site transmite sobriedade e segurança, e a captação de novos clientes aumentou significativamente.",
      verified: true,
    },
    {
      id: "t-2",
      name: "Rodrigo Silveira",
      role: "Diretor Comercial na NeoLog",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      rating: 5,
      comment: "A velocidade e o design limpo superaram qualquer ferramenta que usamos antes. Sem poluição visual, direto ao ponto.",
      verified: true,
    },
    {
      id: "t-3",
      name: "Mariana Vasconcelos",
      role: "Fundadora da Viva Turismo",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      rating: 5,
      comment: "Nossas lâminas de roteiros ficaram impecáveis. Os viajantes elogiam a clareza e facilidade de fechar contratos diretamente pelo celular.",
      verified: true,
    },
  ];

  return (
    <section
      id={id}
      style={customStyle}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
            {data.title || "O Que Nossos Clientes Dizem"}
          </h2>
          {data.subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Grade de Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className={`p-6 sm:p-8 bg-card border border-border/70 ${radiusClass} flex flex-col justify-between shadow-xs hover:border-foreground/20 transition-colors`}
            >
              <div>
                {/* Estrelas de Avaliação */}
                <div className="flex items-center gap-1 mb-5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${i < t.rating ? "fill-amber-500 text-amber-500" : "text-muted"}`}
                    />
                  ))}
                </div>

                {/* Comentário */}
                <p className="text-sm sm:text-base text-foreground/90 leading-relaxed italic mb-6">
                  "{t.comment}"
                </p>
              </div>

              {/* Autor */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-border/40">
                {t.avatarUrl ? (
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="size-11 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="size-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {t.name.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{t.name}</span>
                    {t.verified && (
                      <span title="Verificado" className="inline-flex items-center">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      </span>
                    )}
                  </div>
                  {t.role && (
                    <span className="text-xs text-muted-foreground">{t.role}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
