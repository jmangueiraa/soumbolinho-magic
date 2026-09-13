import React from 'react';
import { useStoreData } from '../../context/StoreDataContext';
import { useFilter } from '../../context/FilterContext';

export const BannerSlider: React.FC = () => {
  const { banners } = useStoreData();
  const { setSelectedCategory } = useFilter();

  const activeBanner = banners.find((b) => b.isActive && (b.type === 'image' || b.imageUrl)) || banners.find((b) => b.isActive) || banners[0];

  if (!activeBanner || !activeBanner.isActive) return null;

  const handleBannerClick = () => {
    if (activeBanner.linkUrl) {
      if (activeBanner.linkUrl.startsWith('cat:')) {
        const catId = activeBanner.linkUrl.replace('cat:', '');
        setSelectedCategory(catId);
      } else if (activeBanner.linkUrl.startsWith('http')) {
        window.open(activeBanner.linkUrl, '_blank');
      } else {
        window.location.href = activeBanner.linkUrl;
      }
    }
  };

  return (
    <section 
      className="relative w-full max-w-full mx-auto select-none overflow-hidden bg-white"
      style={{
        boxShadow: '0 6px 24px -8px color-mix(in srgb, var(--primary-color, #FF1493) 18%, transparent)',
      }}
    >
      <div 
        onClick={handleBannerClick}
        className={`relative w-full overflow-hidden transition-all group ${
          activeBanner.linkUrl ? 'cursor-pointer hover:opacity-98' : ''
        }`}
      >
        {activeBanner.imageUrl ? (
          <div className="relative w-full overflow-hidden">
            {/* Imagem do Banner com filtro visual sutil */}
            <img
              src={activeBanner.imageUrl}
              alt={activeBanner.altText || 'Banner Principal'}
              className="w-full h-auto max-h-[520px] object-contain block mx-auto transition-transform duration-700 group-hover:scale-[1.01]"
              style={{
                filter: 'contrast(1.02) saturate(1.04)',
              }}
              loading="eager"
            />

            {/* 1. Camada de Sobreposição Dinâmica (Overlay) baseada na variável CSS --primary-color */}
            <div 
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none transition-all duration-300"
              style={{
                backgroundColor: 'var(--primary-color, #FF1493)',
                opacity: 0.06,
                mixBlendMode: 'color',
              }}
            />

            {/* 2. Filtro de vinheta radial suave para realce das bordas da loja */}
            <div 
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none transition-all duration-300"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, var(--primary-color, #FF1493) 125%)',
                opacity: 0.12,
                mixBlendMode: 'soft-light',
              }}
            />

            {/* 3. Gradiente inferior para transição harmônica com os botões e títulos da loja */}
            <div 
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-16 sm:h-24 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, color-mix(in srgb, var(--primary-color, #FF1493) 16%, transparent), transparent)',
              }}
            />
          </div>
        ) : (
          <div 
            className="w-full min-h-[140px] sm:min-h-[200px] p-6 text-center flex flex-col items-center justify-center transition-all duration-300 relative"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #FF1493) 10%, white) 0%, white 50%, color-mix(in srgb, var(--primary-color, #FF1493) 14%, white) 100%)',
            }}
          >
            {activeBanner.title && (
              <h3 className="font-sans font-black text-xl sm:text-2xl text-slate-900">
                {activeBanner.title}
              </h3>
            )}
            {activeBanner.subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {activeBanner.subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. Moldura/Linha de detalhe inferior elegante com a cor primária da loja */}
      <div 
        aria-hidden="true"
        className="w-full h-[2px] transition-all duration-300"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--primary-color, #FF1493) 25%, var(--primary-color, #FF1493) 75%, transparent 100%)',
          opacity: 0.45,
        }}
      />
    </section>
  );
};

export default BannerSlider;
