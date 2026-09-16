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

  // Prioriza a logo personalizada enviada pelo cliente (URL do Supabase); caso não haja, usa a logo oficial AJPSTORE em Base64
  const customLogoUrl = rawLogo || AJP_OFFICIAL_LOGO_BASE64;

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
    sm: 'w-9 h-9 sm:w-11 sm:h-11',
    md: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
  }[size] || 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24';

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

  const showOnlyLogo = Boolean(
    onlyLogo || 
    storeConfig?.onlyLogo || 
    (currentStore as any)?.only_logo || 
    (currentStore as any)?.onlyLogo || 
    currentStore?.theme_settings?.only_logo || 
    currentStore?.theme_settings?.onlyLogo
  );

  return (
    <div className={`inline-flex items-center ${gapClasses} select-none bg-transparent min-w-0 ${className}`}>
      {/* Ícone da Marca: Imagem ou SVG Oficial AJPSTORE */}
      <div className="logo-container relative flex items-center justify-center shrink-0">
        {customLogoUrl && !imageError ? (
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 bg-white transition-all duration-300 group-hover:ring-emerald-400 group-hover:scale-105`}>
            <img
              src={customLogoUrl}
              alt={resolvedName}
              onError={(e) => {
                if (e.currentTarget.src !== AJP_OFFICIAL_LOGO_BASE64) {
                  e.currentTarget.src = AJP_OFFICIAL_LOGO_BASE64;
                } else {
                  setImageError(true);
                }
              }}
              className="logo-image w-full h-full object-contain rounded-full drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ) : (
          <div className={`${sizeClasses} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 bg-white`}>
            <img
              src={AJP_OFFICIAL_LOGO_BASE64}
              alt={resolvedName}
              className="logo-image w-full h-full object-contain rounded-full"
            />
          </div>
        )}
      </div>

      {/* Tipografia da Marca com Subtítulo AJPSTORE */}
      {!showOnlyLogo && resolvedName && (
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
