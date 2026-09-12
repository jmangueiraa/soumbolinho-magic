import React, { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';

interface ScarcityCountdownBannerProps {
  className?: string;
  durationMinutes?: number;
}

const STORAGE_KEY = 'soumbolinho_lp_urgency_timer_target';
const DEFAULT_DURATION_MINUTES = 15;

export const ScarcityCountdownBanner: React.FC<ScarcityCountdownBannerProps> = ({
  className = '',
  durationMinutes = DEFAULT_DURATION_MINUTES,
}) => {
  const durationMs = durationMinutes * 60 * 1000;

  // Formatação dinâmica da data atual em português maiúsculo
  const dynamicDateText = useMemo(() => {
    try {
      const now = new Date();
      const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
      const day = now.toLocaleDateString('pt-BR', { day: '2-digit' });
      const month = now.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
      return `A OFERTA TERMINA HOJE, ${weekday}, ${day} DE ${month}`;
    } catch {
      return 'A OFERTA TERMINA HOJE';
    }
  }, []);

  // Inicialização resiliente do timer com persistência no localStorage
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();
      if (stored) {
        const target = parseInt(stored, 10);
        const diff = Math.floor((target - now) / 1000);
        if (diff > 0 && diff <= durationMinutes * 60) {
          return {
            minutes: Math.floor(diff / 60),
            seconds: diff % 60,
          };
        }
      }
      const newTarget = now + durationMs;
      localStorage.setItem(STORAGE_KEY, String(newTarget));
      return { minutes: durationMinutes - 1, seconds: 59 };
    } catch {
      return { minutes: durationMinutes - 1, seconds: 59 };
    }
  });

  useEffect(() => {
    const updateCountdown = () => {
      try {
        const now = Date.now();
        let target = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

        // Se o tempo acabou ou está corrompido, reinicia novo ciclo contínuo de urgência
        if (!target || target <= now || (target - now) > durationMs) {
          target = now + durationMs;
          localStorage.setItem(STORAGE_KEY, String(target));
        }

        const remainingSeconds = Math.max(0, Math.floor((target - now) / 1000));
        setTimeLeft({
          minutes: Math.floor(remainingSeconds / 60),
          seconds: remainingSeconds % 60,
        });
      } catch {
        setTimeLeft((prev) => {
          if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
          if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
          return { minutes: durationMinutes - 1, seconds: 59 };
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [durationMs, durationMinutes]);

  const formattedMinutes = String(timeLeft.minutes).padStart(2, '0');
  const formattedSeconds = String(timeLeft.seconds).padStart(2, '0');

  return (
    <aside
      role="banner"
      aria-label="Aviso de escassez e tempo restante da oferta"
      className={`sticky top-0 z-50 w-full bg-[#dc2626] text-white shadow-md border-b border-red-700/80 transition-all ${className}`}
    >
      <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
        {/* Ícone de Alerta e Frase Dinâmica */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white select-none">
          <span className="text-sm sm:text-base leading-none drop-shadow-xs" aria-hidden="true">
            ⚠️
          </span>
          <span>{dynamicDateText}</span>
        </div>

        {/* Bloco translúcido/arredondado com ícone de relógio e cronômetro em tempo real */}
        <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-xs border border-white/20 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-inner select-none">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse shrink-0" aria-hidden="true" />
          <span className="font-mono font-black text-xs sm:text-sm tracking-widest text-white drop-shadow-xs">
            {formattedMinutes}:{formattedSeconds}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default ScarcityCountdownBanner;
