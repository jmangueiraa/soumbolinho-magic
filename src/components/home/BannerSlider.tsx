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
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 select-none">
      <div 
        onClick={handleBannerClick}
        className={`relative overflow-hidden rounded-3xl shadow-sm border border-[#FFA6DF]/40 transition-all ${
          activeBanner.linkUrl ? 'cursor-pointer hover:opacity-95' : ''
        }`}
      >
        {activeBanner.imageUrl ? (
          <img
            src={activeBanner.imageUrl}
            alt={activeBanner.altText || 'Banner Principal'}
            className="w-full h-auto max-h-[360px] object-cover rounded-3xl block shadow-sm"
          />
        ) : (
          <div className="w-full min-h-[140px] sm:min-h-[170px] bg-gradient-to-r from-[#FFD1EC] via-[#F3EAFF] to-[#FFD1EC] p-6 text-center flex flex-col items-center justify-center rounded-3xl">
            {activeBanner.title && (
              <h3 className="font-festive font-extrabold text-xl sm:text-2xl text-slate-900">
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
    </section>
  );
};

export default BannerSlider;
