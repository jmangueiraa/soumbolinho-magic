import React from 'react';

interface SoumbolinhoLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const SoumbolinhoLogo: React.FC<SoumbolinhoLogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
}) => {
  const isLight = variant === 'light';

  const sizeClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none bg-transparent ${className}`}>
      {/* Ícone Festivo Minimalista sem Fundo: Mini Bolo Festivo com Vela & Estrelas */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          className={`${sizeClasses} w-auto aspect-square drop-shadow-sm`}
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

      {/* Tipografia da Marca com Subtítulo Festivo */}
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center tracking-tight">
          <span className={`font-sans text-lg sm:text-2xl font-black ${isLight ? 'text-white' : 'text-slate-900'}`}>
            SOUM
          </span>
          <span className="font-sans text-lg sm:text-2xl font-black text-[#65bc45] ml-0.5">
            BOLINHO
          </span>
        </div>
        <span className={`text-[8px] sm:text-[9.5px] font-bold tracking-[0.18em] uppercase mt-0.5 ${
          isLight ? 'text-zinc-400' : 'text-slate-500'
        }`}>
          Papelaria & Festas Digitais
        </span>
      </div>
    </div>
  );
};

export default SoumbolinhoLogo;
