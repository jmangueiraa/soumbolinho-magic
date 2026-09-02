import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface ProductImagePlaceholderProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
}

export const ProductImagePlaceholder: React.FC<ProductImagePlaceholderProps> = ({
  className = '',
  iconClassName = 'w-8 h-8',
  showText = false,
}) => {
  return (
    <div
      className={`w-full h-full bg-slate-50 flex flex-col items-center justify-center p-3 select-none text-center ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center">
        <ShoppingBag className={iconClassName || 'w-5 h-5'} />
      </div>
      {showText && (
        <span className="text-[10px] font-semibold text-slate-400 mt-2 tracking-wide uppercase">
          Sem foto
        </span>
      )}
    </div>
  );
};

export default ProductImagePlaceholder;
