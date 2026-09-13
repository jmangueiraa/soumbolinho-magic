import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';

interface SoumbolinhoLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  storeName?: string;
  slogan?: string;
  logoUrl?: string;
  onlyLogo?: boolean;
}

export const SoumbolinhoLogo: React.FC<SoumbolinhoLogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
  storeName: propStoreName,
  slogan: propSlogan,
  logoUrl: propLogoUrl,
  onlyLogo = false,
}) => {
  let currentStore: any = null;
  let storeConfig: any = null;

  try {
    const tenant = useTenant();
    currentStore = tenant?.currentStore;
  } catch {}

  try {
    const storeData = useStoreData();
    storeConfig = storeData?.storeConfig;
  } catch {}

  const isLight = variant === 'light';
  const isBaseStore = currentStore?.id === 'suamarcaaqui' || currentStore?.id === 'store_default' || currentStore?.slug === 'suamarcaaqui';

  const customLogoUrl = (
    propLogoUrl ||
    storeConfig?.logoUrl ||
    currentStore?.logo_url ||
    currentStore?.theme_settings?.logo_url ||
    ''
  ).trim();

  // Nome da loja individual da foto da logo
  const rawName = propStoreName !== undefined
    ? propStoreName
    : (storeConfig?.storeName !== undefined ? storeConfig.storeName : (currentStore?.name || currentStore?.store_name || ''));

  const resolvedName = (rawName || (customLogoUrl ? '' : (isBaseStore ? 'SOUMBOLINHO' : 'SUAMARCAAQUI'))).trim();

  const rawSlogan = propSlogan !== undefined
    ? propSlogan
    : (storeConfig?.slogan !== undefined ? storeConfig.slogan : (currentStore?.slogan || ''));

  const resolvedSlogan = (rawSlogan || (customLogoUrl ? '' : (isBaseStore ? 'Papelaria & Festas Digitais' : 'PAPELARIA & FESTAS DIGITAIS'))).trim();

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [customLogoUrl]);

  const sizeClasses = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11',
    lg: 'w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2.5 select-none bg-transparent min-w-0 ${className}`}>
      {/* Ícone da Marca: Imagem enviada pelo usuário (arredondada / circular) ou SVG Mini Bolo Festivo */}
      <div className="logo-container relative flex items-center justify-center shrink-0">
        {customLogoUrl && !imageError ? (
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/25 shadow-sm bg-white/10`}>
            <img
              src={customLogoUrl}
              alt={resolvedName}
              onError={() => setImageError(true)}
              className="logo-image w-full h-full object-cover rounded-full drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white/10 dark:bg-zinc-800 border border-white/15 shadow-sm p-0.5 sm:p-1`}>
            <svg
              className="w-full h-full aspect-square drop-shadow-sm"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
          {/* Brilhos / Estrelas Flutuantes */}
          <path
            d="M20 28L22 22L28 20L22 18L20 12L18 18L12 20L18 22L20 28Z"
            fill="#FBBF24"
            className="animate-pulse"
          />
          <path
            d="M82 32L83.5 27.5L88 26L83.5 24.5L82 20L80.5 24.5L76 26L80.5 27.5L82 32Z"
            fill="#F472B6"
          />
          <circle cx="28" cy="40" r="2" fill="#38BDF8" />
          <circle cx="75" cy="46" r="2.5" fill="#34D399" />

          {/* Chama da Vela Dourada */}
          <path
            d="M50 14C50 14 55 22 55 27C55 29.7614 52.7614 32 50 32C47.2386 32 45 29.7614 45 27C45 22 50 14 50 14Z"
            fill="url(#candleFlame)"
          />
          <circle cx="50" cy="27" r="2.5" fill="#FEF08A" />

          {/* Vela */}
          <rect x="47.5" y="32" width="5" height="15" rx="2.5" fill="#E2E8F0" />
          <path d="M47.5 36L52.5 39" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M47.5 41L52.5 44" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" />

          {/* Cobertura Ondulada / Chantilly do Bolinho */}
          <path
            d="M26 58C26 50 34 46 50 46C66 46 74 50 74 58C74 62 70 65 66 65C62 65 60 62 56 62C52 62 50 65 46 65C42 65 40 62 36 62C32 62 30 65 26 58Z"
            fill="url(#frostingGradient)"
          />

          {/* Granulados Coloridos */}
          <rect x="36" y="52" width="4" height="2" rx="1" transform="rotate(25 36 52)" fill="#38BDF8" />
          <rect x="52" y="50" width="4" height="2" rx="1" transform="rotate(-30 52 50)" fill="#FBBF24" />
          <rect x="62" y="53" width="4" height="2" rx="1" transform="rotate(45 62 53)" fill="#F43F5E" />

          {/* Base / Forminha do Bolinho Só Um Bolinho */}
          <path
            d="M29 64L35 84C35.5 86 37.5 88 40 88H60C62.5 88 64.5 86 65 84L71 64C68 66 64 66 61 64C58 62 54 62 50 64C46 66 42 66 39 64C36 62 32 62 29 64Z"
            fill="url(#baseGradient)"
          />

          {/* Linhas da Forminha */}
          <path d="M41 66L44 86" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M50 66L50 87" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M59 66L56 86" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />

          {/* Definições de Gradientes */}
          <defs>
            <linearGradient id="candleFlame" x1="50" y1="14" x2="50" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#EF4444" />
            </linearGradient>
            <linearGradient id="frostingGradient" x1="26" y1="46" x2="74" y2="65" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F472B6" />
              <stop offset="0.5" stopColor="#FB7185" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="baseGradient" x1="29" y1="64" x2="71" y2="88" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E293B" />
              <stop offset="1" stopColor="#0F172A" />
            </linearGradient>
          </defs>
        </svg>
          </div>
        )}
      </div>

      {/* Tipografia da Marca com Subtítulo Festivo (Alinhamento perfeito sem quebras ou distorções) */}
      {!onlyLogo && !storeConfig?.onlyLogo && resolvedName && (
        <div className="flex flex-col text-left leading-none min-w-0">
          <div className="flex items-center tracking-tight whitespace-nowrap">
            {(() => {
              const upper = resolvedName.toUpperCase().replace(/\s+/g, ' ').trim();

              // 1. Caso Base Oficial: SOUMBOLINHO
              if (upper === 'SOUMBOLINHO' || upper === 'SOUM BOLINHO') {
                return (
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    <span className={`font-sans text-xs sm:text-base md:text-xl font-black ${isLight ? 'text-white' : 'text-slate-900'}`}>
                      SOUM
                    </span>
                    <span className="font-sans text-xs sm:text-base md:text-xl font-black text-theme-primary ml-0.5">
                      BOLINHO
                    </span>
                  </div>
                );
              }

              // 2. Caso Nova Loja: SUAMARCAAQUI ou SUA MARCA AQUI
              if (upper.replace(/\s+/g, '') === 'SUAMARCAAQUI') {
                return (
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    <span className={`font-sans text-xs sm:text-base md:text-xl font-black ${isLight ? 'text-white' : 'text-slate-900'}`}>
                      SUAMARCA
                    </span>
                    <span className="font-sans text-xs sm:text-base md:text-xl font-black text-theme-primary">
                      AQUI
                    </span>
                  </div>
                );
              }

              // 3. Caso Nome com mais de uma palavra (ex: "EDITÁVEIS DO CANVA")
              const words = resolvedName.split(' ').filter(Boolean);
              if (words.length > 1) {
                const firstPart = words.slice(0, -1).join(' ').toUpperCase();
                const lastPart = words[words.length - 1].toUpperCase();
                return (
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    <span className={`font-sans text-xs sm:text-base md:text-xl font-black ${isLight ? 'text-white' : 'text-slate-900'}`}>
                      {firstPart}
                    </span>
                    <span className="font-sans text-xs sm:text-base md:text-xl font-black text-theme-primary ml-1">
                      {lastPart}
                    </span>
                  </div>
                );
              }

              // 4. Caso Nome de Palavra Única
              return (
                <span className="font-sans text-xs sm:text-base md:text-xl font-black text-theme-primary whitespace-nowrap">
                  {resolvedName.toUpperCase()}
                </span>
              );
            })()}
          </div>
          {resolvedSlogan && (
            <span className={`text-[7px] sm:text-[8.5px] md:text-[9.5px] font-bold tracking-wider sm:tracking-[0.16em] uppercase mt-0.5 whitespace-nowrap truncate max-w-[130px] sm:max-w-[240px] md:max-w-none ${
              isLight ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              {resolvedSlogan}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SoumbolinhoLogo;
