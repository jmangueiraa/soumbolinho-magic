import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { AJP_OFFICIAL_LOGO_BASE64 } from '../../assets/officialLogo';

interface SoumbolinhoLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
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

  // Identifica se estamos no contexto da plataforma oficial / matriz AJPSTORE
  const storeSlug = (currentStore?.slug || '').toLowerCase();
  const storeId = (currentStore?.id || '').toLowerCase();
  const isAjpStore = 
    storeSlug === 'ajpstore' || 
    storeId === 'store_ajpstore' || 
    Boolean(currentStore?.is_matriz) ||
    !currentStore ||
    storeSlug === 'suamarcaaqui';

  // Logo Oficial AJPSTORE: usa o Base64 embutido para carregamento instantâneo sem depender de rede
  const defaultAjpLogo = AJP_OFFICIAL_LOGO_BASE64;

  const rawLogo = (
    propLogoUrl ||
    storeConfig?.logoUrl ||
    currentStore?.logo_url ||
    currentStore?.theme_settings?.logo_url ||
    ''
  ).trim();

  // Se o contexto for AJPSTORE e a logo apontar para caminhos padrão/antigos, prioriza a logo oficial em Base64
  const isAjpDefaultPath = isAjpStore && (!rawLogo || rawLogo.includes('ajpstore-logo') || rawLogo.includes('logo.jpg') || rawLogo.includes('logo.png'));
  const customLogoUrl = isAjpDefaultPath ? AJP_OFFICIAL_LOGO_BASE64 : (rawLogo || (isAjpStore ? AJP_OFFICIAL_LOGO_BASE64 : ''));

  // Nome da loja
  const rawName = propStoreName !== undefined
    ? propStoreName
    : (storeConfig?.storeName !== undefined ? storeConfig.storeName : (currentStore?.name || currentStore?.store_name || ''));

  // Sanitiza caso ainda venha texto de templates antigos
  const isLegacyTemplate = (rawName || '').toLowerCase().includes('encantando festa') || (rawName || '').toLowerCase().includes('soumbolinho');
  const resolvedName = (isLegacyTemplate || !rawName ? (isAjpStore ? 'AJPSTORE' : 'SUAMARCAAQUI') : rawName).trim();

  // Slogan da loja
  const rawSlogan = propSlogan !== undefined
    ? propSlogan
    : (storeConfig?.slogan !== undefined ? storeConfig.slogan : (currentStore?.slogan || ''));

  const isLegacySlogan = (rawSlogan || '').toLowerCase().includes('transformando momentos');
  const resolvedSlogan = (isLegacySlogan || !rawSlogan ? (isAjpStore ? 'Sua Loja Online em Minutos' : 'SUA LOJA ONLINE EM MINUTOS') : rawSlogan).trim();

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [customLogoUrl]);

  const sizeClasses = {
    sm: 'w-8 h-8 sm:w-9 sm:h-9',
    md: 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14',
    lg: 'w-12 h-12 sm:w-15 sm:h-15 md:w-18 md:h-18 lg:w-20 lg:h-20',
    xl: 'w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 lg:w-24 lg:h-24',
  }[size] || 'w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 lg:w-24 lg:h-24';

  const titleClasses = {
    sm: 'text-xs sm:text-sm font-black tracking-tight',
    md: 'text-sm sm:text-lg md:text-xl font-black tracking-tight',
    lg: 'text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight',
    xl: 'text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight',
  }[size] || 'text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight';

  const sloganClasses = {
    sm: 'text-[7px] sm:text-[8px] font-bold tracking-wider',
    md: 'text-[8px] sm:text-[9.5px] md:text-[11px] font-bold tracking-wider sm:tracking-[0.14em]',
    lg: 'text-[9.5px] sm:text-[11.5px] md:text-[13px] font-bold tracking-wider sm:tracking-[0.18em]',
    xl: 'text-[10px] sm:text-[12px] md:text-[14px] font-bold tracking-wider sm:tracking-[0.2em]',
  }[size] || 'text-[10px] sm:text-[12px] md:text-[14px] font-bold tracking-wider sm:tracking-[0.2em]';

  const gapClasses = {
    sm: 'gap-1.5',
    md: 'gap-2 sm:gap-2.5',
    lg: 'gap-2.5 sm:gap-3.5',
    xl: 'gap-3 sm:gap-4 md:gap-5',
  }[size] || 'gap-3 sm:gap-4 md:gap-5';

  const sloganMaxWClasses = {
    sm: 'max-w-[120px] sm:max-w-none',
    md: 'max-w-[160px] sm:max-w-[260px] md:max-w-none',
    lg: 'max-w-[200px] sm:max-w-[320px] md:max-w-none',
    xl: 'max-w-[260px] sm:max-w-[400px] md:max-w-none',
  }[size] || 'max-w-[260px] sm:max-w-[400px] md:max-w-none';

  return (
    <div className={`inline-flex items-center ${gapClasses} select-none bg-transparent min-w-0 ${className}`}>
      {/* Ícone da Marca: Imagem ou SVG Oficial AJPSTORE */}
      <div className="logo-container relative flex items-center justify-center shrink-0">
        {customLogoUrl && !imageError ? (
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 bg-white transition-all duration-300 group-hover:ring-emerald-400 group-hover:scale-105`}>
            <img
              src={customLogoUrl}
              alt={resolvedName}
              onError={() => setImageError(true)}
              className="logo-image w-full h-full object-contain rounded-full drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ) : isAjpStore ? (
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 bg-white`}>
            <img
              src={AJP_OFFICIAL_LOGO_BASE64}
              alt={resolvedName}
              className="logo-image w-full h-full object-contain rounded-full"
            />
          </div>
        ) : (
          /* SVG Oficial Vetorial da Marca AJPSTORE (Sacola Azul + Foguete + Seta Verde) */
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 p-1 transition-all duration-300 group-hover:ring-emerald-400 group-hover:scale-105`}>
            <svg
              className="w-full h-full aspect-square drop-shadow-sm"
              viewBox="0 0 500 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="logoRingGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#0062FF" />
                  <stop offset="50%" stopColor="#00A3FF" />
                  <stop offset="100%" stopColor="#00C853" />
                </linearGradient>
                <linearGradient id="logoBagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0072FF" />
                  <stop offset="100%" stopColor="#0052D4" />
                </linearGradient>
              </defs>

              {/* Anel Externo Degradê */}
              <circle cx="250" cy="250" r="226" fill="none" stroke="url(#logoRingGrad)" strokeWidth="22" strokeLinecap="round" />

              {/* Alça da Sacola */}
              <path d="M195 130 C195 85, 305 85, 305 130" fill="none" stroke="url(#logoBagGrad)" strokeWidth="24" strokeLinecap="round" />

              {/* Corpo da Sacola de Compras */}
              <path d="M182 130 L145 305 C142 318 152 328 165 328 L335 328 C348 328 358 318 355 305 L318 130 C315 122 308 118 298 118 L202 118 C192 118 185 122 182 130 Z" fill="url(#logoBagGrad)" />

              {/* Rastro de Fogo do Foguete (Barras Verdes) */}
              <rect x="220" y="270" width="14" height="40" rx="7" fill="#00C853" />
              <rect x="243" y="260" width="14" height="60" rx="7" fill="#00C853" />
              <rect x="266" y="270" width="14" height="40" rx="7" fill="#00C853" />

              {/* Foguete em Decolagem */}
              <path d="M250 145 C260 175 272 215 272 258 L228 258 C228 215 240 175 250 145 Z" fill="#FFFFFF" />
              <path d="M228 215 L204 258 L228 250 Z" fill="#FFFFFF" />
              <path d="M272 215 L296 258 L272 250 Z" fill="#FFFFFF" />
              <circle cx="250" cy="182" r="11" fill="#0062FF" />

              {/* Seta Verde Curva em Órbita */}
              <path d="M115 255 C110 300 165 315 235 285 C295 258 360 195 385 140" fill="none" stroke="#00C853" strokeWidth="22" strokeLinecap="round" />
              <path d="M362 138 L398 130 L390 168 L376 150 Z" fill="#00C853" />
            </svg>
          </div>
        )}
      </div>

      {/* Tipografia da Marca com Subtítulo AJPSTORE */}
      {!onlyLogo && !storeConfig?.onlyLogo && resolvedName && (
        <div className="flex flex-col text-left leading-none min-w-0">
          <div className="flex items-center tracking-tight whitespace-nowrap">
            {(() => {
              const clean = resolvedName.replace(/\s+/g, '').toUpperCase();

              // 1. Caso AJPSTORE Oficial
              if (clean === 'AJPSTORE') {
                return (
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    <span className={`font-sans ${titleClasses} text-[#0062FF] font-black`}>
                      AJP
                    </span>
                    <span className={`font-sans ${titleClasses} text-[#00C853] font-black ml-0.5`}>
                      STORE
                    </span>
                  </div>
                );
              }

              // 2. Caso Nova Loja: SUAMARCAAQUI
              if (clean === 'SUAMARCAAQUI') {
                return (
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    <span className={`font-sans ${titleClasses} ${isLight ? 'text-white' : 'text-slate-900'}`}>
                      SUAMARCA
                    </span>
                    <span className={`font-sans ${titleClasses} text-[#00C853] ml-0.5`}>
                      AQUI
                    </span>
                  </div>
                );
              }

              // 3. Caso Nome com mais de uma palavra
              const words = resolvedName.split(' ').filter(Boolean);
              if (words.length > 1) {
                const firstPart = words.slice(0, -1).join(' ').toUpperCase();
                const lastPart = words[words.length - 1].toUpperCase();
                return (
                  <div className="flex items-center tracking-tight whitespace-nowrap">
                    <span className={`font-sans ${titleClasses} ${isLight ? 'text-white' : 'text-slate-900'}`}>
                      {firstPart}
                    </span>
                    <span className={`font-sans ${titleClasses} text-[#00C853] ml-1`}>
                      {lastPart}
                    </span>
                  </div>
                );
              }

              // 4. Caso Nome de Palavra Única
              return (
                <span className={`font-sans ${titleClasses} text-white whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]`}>
                  {resolvedName.toUpperCase()}
                </span>
              );
            })()}
          </div>
          {resolvedSlogan && (
            <span className={`${sloganClasses} uppercase mt-1 sm:mt-1.5 whitespace-nowrap truncate ${sloganMaxWClasses} ${
              isLight ? 'text-emerald-400' : 'text-emerald-600'
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
