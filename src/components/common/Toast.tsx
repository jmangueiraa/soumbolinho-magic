import React from 'react';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const Toast: React.FC = () => {
  const { toastMessage } = useCart();

  if (!toastMessage) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <div className="pr-1">
        <p className="text-xs font-semibold text-white leading-tight">{toastMessage}</p>
      </div>
    </div>
  );
};
