import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ExternalLink, MessageCircle } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useFilter } from '../../context/FilterContext';

export const BannerSlider: React.FC = () => {
  const { banners } = useStoreData();
  const { setSelectedCategory } = useFilter();

  const activeBanners = banners
    .filter((b) => b.isActive)
    .sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play a cada 5 segundos se houver mais de 1 slide
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isPaused]);

  if (activeBanners.length === 0) return null;

  const currentSlide = activeBanners[currentIndex] || activeBanners[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handleSlideClick = () => {
    if (currentSlide.linkUrl) {
      if (currentSlide.linkUrl.startsWith('cat:')) {
        const catId = currentSlide.linkUrl.replace('cat:', '');
        setSelectedCategory(catId);
      } else if (currentSlide.linkUrl.startsWith('http')) {
        window.open(currentSlide.linkUrl, '_blank');
      } else {
        window.location.href = currentSlide.linkUrl;
      }
    }
  };

  // Cores de fundo do cartão de texto
  const themeBgMap = {
    blue: 'bg-[#EBF5FF] border-[#BAE0FF] text-[#1E3A8A]',
    pink: 'bg-[#FFF0F7] border-[#FFA6DF] text-[#831843]',
    lilac: 'bg-[#F3EAFF] border-[#D8B4F8] text-[#581C87]',
    yellow: 'bg-[#FEFCE8] border-[#FEF08A] text-[#713F12]',
  };

  const currentTheme = themeBgMap[currentSlide.themeColor || 'blue'];

  return (
    <section 
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Outer Banner Frame with festive stars and organic gradient border */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFD1EC] via-[#F3EAFF] to-[#FFD1EC] p-3 sm:p-5 shadow-sm border border-[#FFA6DF]/60">
        
        {/* Background Decorative Organic Shapes and Stars */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#FF1493]/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-[#D8B4F8]/30 blur-2xl pointer-events-none" />
        
        {/* Festive Stars Pattern (SVG Overlay) */}
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#FF1493_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Slide Content Box */}
        <div 
          onClick={handleSlideClick}
          className={`relative z-10 w-full min-h-[140px] sm:min-h-[170px] rounded-2xl flex items-center justify-center p-5 sm:p-7 text-center transition-all duration-300 ${
            currentSlide.linkUrl ? 'cursor-pointer hover:scale-[1.008]' : ''
          }`}
        >
          {currentSlide.type === 'image' && currentSlide.imageUrl ? (
            /* Slide de Imagem Completa */
            <div className="w-full h-full min-h-[140px] sm:min-h-[180px] rounded-2xl overflow-hidden relative shadow-inner">
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.altText || 'Banner Encantando Festa'}
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
          ) : (
            /* Slide de Texto / Informativo com Fundo Suave e Texto Centralizado */
            <div className={`w-full max-w-3xl mx-auto rounded-2xl p-5 sm:p-6 shadow-xs border transition-all ${currentTheme}`}>
              
              {/* Tag / Badge superior */}
              {currentSlide.tag && (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/90 shadow-2xs text-[11px] sm:text-xs font-bold text-[#FF1493] uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3 text-[#FF1493]" />
                  <span>{currentSlide.tag}</span>
                </div>
              )}

              {/* Título Principal */}
              {currentSlide.title && (
                <h3 className="font-festive font-extrabold text-base sm:text-xl lg:text-2xl text-slate-900 leading-tight">
                  {currentSlide.title}
                </h3>
              )}

              {/* Frase / Parágrafo Secundário */}
              {currentSlide.subtitle && (
                <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1.5 leading-relaxed max-w-2xl mx-auto">
                  {currentSlide.subtitle}
                </p>
              )}

              {/* Frase de Destaque 3 */}
              {currentSlide.highlightText && (
                <div className="mt-2.5 pt-2 border-t border-black/10 text-xs sm:text-sm font-bold text-[#FF1493] flex items-center justify-center gap-1.5">
                  <span>{currentSlide.highlightText}</span>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Setas de Navegação (Anterior / Próximo) */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#FF1493] shadow-md flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 border border-[#FFA6DF]/40"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#FF1493] shadow-md flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 border border-[#FFA6DF]/40"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Paginação por Pontinhos (Dots) */}
        {activeBanners.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 relative z-20">
            {activeBanners.map((slide, index) => (
              <button
                key={slide.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-6 bg-[#FF1493] shadow-xs'
                    : 'w-2 bg-[#2B3A8C]/30 hover:bg-[#2B3A8C]/60'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
