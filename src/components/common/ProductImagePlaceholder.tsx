import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface ProductImagePlaceholderProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
}

export const ProductImagePlaceholder: React.FC<ProductImagePlaceholderProps> = ({
  className = '',
  iconClassName = 'w-10 h-10',
  showText = true,
}) => {
  return (
    <div
      className={`w-full h-full bg-white flex flex-col items-center justify-center p-3 select-none text-center ${className}`}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FFEBF6] text-[#FF1493] flex items-center justify-center shadow-xs border border-[#FFA6DF]/40 transition-transform group-hover:scale-105 duration-200">
        <ShoppingCart className={iconClassName || 'w-6 h-6 sm:w-7 sm:h-7'} />
      </div>
      {showText && (
        <span className="text-[10px] sm:text-[11px] font-semibold text-[#2B3A8C]/70 mt-2 tracking-wide uppercase">
          Sem imagem
        </span>
      )}
    </div>
  );
};
