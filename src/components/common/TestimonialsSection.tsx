import React from 'react';
import { Star } from 'lucide-react';
import { DEFAULT_TESTIMONIALS, TestimonialItem } from '../../data/defaultTestimonials';

interface TestimonialsSectionProps {
  testimonials?: TestimonialItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  testimonials = DEFAULT_TESTIMONIALS,
  title = 'Clientas que quiseram deixar sua opinião sobre o material!',
  subtitle = 'PROVAS REAIS',
  className = '',
}) => {
  // Garante exibição perfeita dos 6 cards de alta conversão
  const items = testimonials && testimonials.length > 0 ? testimonials.slice(0, 6) : DEFAULT_TESTIMONIALS;

  return (
    <section className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 ${className}`}>
      <div className="text-center max-w-2xl mx-auto space-y-3">
        {/* Tag Superior */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-200/80 shadow-2xs">
          <span className="text-xs">💬</span>
          <span>{subtitle}</span>
        </div>

        {/* Título em destaque centralizado */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Veja o que quem já comprou e testou nossos arquivos tem a dizer sobre a qualidade e facilidade de uso.
        </p>
      </div>

      {/* Grid de Cards Responsivo (3 colunas no desktop, 2 colunas no tablet, 1 coluna no mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {items.map((testimonial, idx) => (
          <div
            key={testimonial.id || idx}
            className="bg-white rounded-3xl border border-pink-100/70 shadow-lg shadow-pink-500/5 p-6 sm:p-7 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1 group"
          >
            {/* 1. Foto de perfil redonda da cliente no topo */}
            <div className="relative mb-3.5">
              {testimonial.avatar ? (
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover shadow-md border-2 border-white ring-4 ring-pink-50 group-hover:ring-pink-100 transition-all"
                  loading="lazy"
                />
              ) : (
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-pink-400 to-rose-500 text-white font-black flex items-center justify-center text-lg shadow-md border-2 border-white ring-4 ring-pink-50">
                  {testimonial.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* 2. Nome Completo */}
            <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-1">
              {testimonial.name}
            </h3>

            {/* 3. Avaliação de 5 Estrelas Douradas */}
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-3">
              {[...Array(testimonial.rating || 5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* 4. Texto de Depoimento em Destaque */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal text-center">
              “{testimonial.text}”
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
