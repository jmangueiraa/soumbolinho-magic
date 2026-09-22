import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Store as StoreIcon, 
  Gift, 
  Clock,
  X 
} from 'lucide-react';
import { ShippingOption, DeliveryAddress } from '../../types';
import { calculateShippingOptions, lookupCep } from '../../services/shippingService';
import { formatCurrency } from '../../utils/formatters';

export interface ShippingCalculatorProps {
  cartTotal: number;
  storeId?: string;
  onShippingSelected?: (option: ShippingOption, address: DeliveryAddress) => void;
  selectedOptionId?: string;
  initialCep?: string;
  isCompact?: boolean;
  hideHeader?: boolean;
}

export const ShippingCalculator: React.FC<ShippingCalculatorProps> = ({
  cartTotal,
  storeId,
  onShippingSelected,
  selectedOptionId,
  initialCep = '',
  isCompact = false,
  hideHeader = false,
}) => {
  const [cep, setCep] = useState<string>(() => {
    try {
      return initialCep || sessionStorage.getItem('last_searched_cep') || localStorage.getItem('last_searched_cep') || '';
    } catch {
      return initialCep || '';
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [activeSelectedId, setActiveSelectedId] = useState<string>(selectedOptionId || '');

  // Sincroniza seleção externa
  useEffect(() => {
    if (selectedOptionId && selectedOptionId !== activeSelectedId) {
      setActiveSelectedId(selectedOptionId);
    }
  }, [selectedOptionId]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    const masked = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setCep(masked);
    if (error) setError(null);

    // Auto-busca ao completar 8 dígitos
    if (raw.length === 8) {
      executeCalculation(raw);
    }
  };

  const executeCalculation = async (cleanCep: string) => {
    if (cleanCep.length !== 8) {
      setError('Digite o CEP completo com 8 números.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      try {
        sessionStorage.setItem('last_searched_cep', cleanCep);
        localStorage.setItem('last_searched_cep', cleanCep);
      } catch {}

      const res = await calculateShippingOptions({
        destinationCep: cleanCep,
        cartTotal,
        storeId,
      });

      if (res.error) {
        setError(res.error);
        setOptions([]);
        setAddress(null);
      } else {
        setOptions(res.options);
        setAddress(res.address);

        // Se houver opções e nenhuma selecionada, pré-seleciona a mais econômica
        if (res.options.length > 0 && (!activeSelectedId || !res.options.some((o) => o.id === activeSelectedId))) {
          const defaultOpt = res.options[0];
          setActiveSelectedId(defaultOpt.id);
          if (onShippingSelected && res.address) {
            onShippingSelected(defaultOpt, res.address);
          }
        } else if (activeSelectedId && onShippingSelected && res.address) {
          const current = res.options.find((o) => o.id === activeSelectedId);
          if (current) {
            onShippingSelected(current, res.address);
          }
        }
      }
    } catch (err) {
      setError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cep.replace(/\D/g, '');
    executeCalculation(clean);
  };

  const handleClearCep = () => {
    setCep('');
    setOptions([]);
    setAddress(null);
    setError(null);
    setActiveSelectedId('');
    try {
      sessionStorage.removeItem('last_searched_cep');
      localStorage.removeItem('last_searched_cep');
    } catch {}
  };

  const handleSelectOption = (opt: ShippingOption) => {
    setActiveSelectedId(opt.id);
    if (onShippingSelected && address) {
      onShippingSelected(opt, address);
    }
  };

  // Se já veio com initialCep, roda 1 vez ao montar
  useEffect(() => {
    const clean = (initialCep || cep).replace(/\D/g, '');
    if (clean.length === 8 && options.length === 0) {
      executeCalculation(clean);
    }
  }, []);

  const getOptionIcon = (opt: ShippingOption) => {
    if (opt.id === 'free' || opt.isFree) return <Gift className="w-4 h-4 text-emerald-600" />;
    if (opt.id === 'express') return <Zap className="w-4 h-4 text-amber-500" />;
    if (opt.id === 'pickup') return <StoreIcon className="w-4 h-4 text-purple-600" />;
    return <Truck className="w-4 h-4 text-sky-600" />;
  };

  return (
    <div className={`space-y-3 ${isCompact ? '' : 'p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80'}`}>
      
      {/* Header / Título - Oculto quando hideHeader=true para evitar duplicidade */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-theme-primary" />
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              Calcular Frete e Prazo de Entrega
            </span>
          </div>
          {address && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{address.city}/{address.state}</span>
            </span>
          )}
        </div>
      )}

      {/* Input de CEP e Botão com Botão Limpar */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={cep}
            onChange={handleCepChange}
            placeholder="00000-000"
            className="w-full text-xs font-mono font-bold px-3.5 py-2.5 pr-8 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
          />
          {isLoading ? (
            <div className="absolute right-3 top-3">
              <Loader2 className="w-3.5 h-3.5 text-theme-primary animate-spin" />
            </div>
          ) : cep ? (
            <button
              type="button"
              onClick={handleClearCep}
              className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Limpar CEP"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isLoading || cep.replace(/\D/g, '').length < 8}
          className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
        >
          {isLoading ? 'Calculando...' : 'Calcular'}
        </button>
      </form>

      {/* Mensagem de Erro */}
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-[11px] font-medium animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Endereço Encontrado */}
      {address && (
        <div className="text-[11px] text-slate-600 flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-theme-primary shrink-0" />
            <span className="truncate">
              {address.street ? `${address.street}, ` : ''}{address.neighborhood ? `${address.neighborhood} - ` : ''}<strong>{address.city}/{address.state}</strong>
            </span>
          </div>
          {hideHeader && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{address.city}/{address.state}</span>
            </span>
          )}
        </div>
      )}

      {/* Opções de Frete */}
      {options.length > 0 && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
          {options.map((opt) => {
            const isSelected = activeSelectedId === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  isSelected
                    ? 'bg-white border-theme-primary shadow-xs ring-2 ring-theme-primary/10'
                    : 'bg-white/60 hover:bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-theme-primary bg-theme-primary' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">{opt.name}</span>
                      {opt.isFree && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          Grátis
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{opt.deadline}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-extrabold ${opt.price === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {opt.price === 0 ? 'Grátis' : formatCurrency(opt.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
