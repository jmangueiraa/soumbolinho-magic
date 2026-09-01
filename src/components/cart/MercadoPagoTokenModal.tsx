import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useCart } from '../../context/CartContext';

interface MercadoPagoTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const MercadoPagoTokenModal: React.FC<MercadoPagoTokenModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { storeConfig, updateStoreConfig } = useStoreData();
  const { openCheckout, closeCart } = useCart();

  const [tokenInput, setTokenInput] = useState(() => {
    return localStorage.getItem('encantando_festa_mp_access_token') || storeConfig.mpAccessToken || '';
  });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSaveAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();

    if (!cleanToken) {
      setError('Por favor, informe seu Access Token do Mercado Pago.');
      return;
    }

    if (!cleanToken.startsWith('APP_USR-') && !cleanToken.startsWith('TEST-')) {
      setError('O token deve começar com "APP_USR-" (produção) ou "TEST-" (testes).');
      return;
    }

    // Salvar no LocalStorage e no StoreConfig
    localStorage.setItem('encantando_festa_mp_access_token', cleanToken);
    updateStoreConfig({ mpAccessToken: cleanToken });

    onSuccess(cleanToken);
    onClose();
  };

  const handleFallbackToWhatsApp = () => {
    onClose();
    closeCart();
    openCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 border-b border-sky-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#009EE3] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              MP
            </div>
            <div>
              <h3 className="font-festive font-bold text-slate-900 text-base">
                Configurar Mercado Pago
              </h3>
              <p className="text-[11px] text-slate-500">
                Ative pagamentos online instantâneos via Pix e Cartão
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-6 space-y-4">
          
          <div className="bg-sky-50/80 rounded-2xl p-4 border border-sky-200 space-y-2 text-xs text-sky-900">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#009EE3]" />
              Como obter seu Access Token:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>Acesse o painel: <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-[#009EE3] font-bold underline inline-flex items-center gap-0.5">mercadopago.com.br/developers <ExternalLink className="w-3 h-3" /></a></li>
              <li>Vá em <strong>Suas integrações</strong> &gt; selecione sua aplicação.</li>
              <li>Copie o <strong>Access Token de Produção</strong> (ou Teste) e cole abaixo.</li>
            </ol>
          </div>

          <form onSubmit={handleSaveAndProceed} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#009EE3]" />
                Access Token do Mercado Pago *
              </label>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setError('');
                }}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxx..."
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#009EE3] transition-all"
              />
              {error && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-600 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-[#009EE3] hover:bg-[#0082BD] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Chave e Gerar Pagamento</span>
            </button>
          </form>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-slate-400 uppercase font-semibold">ou</span>
          </div>

          {/* Fallback to WhatsApp Button */}
          <button
            type="button"
            onClick={handleFallbackToWhatsApp}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Finalizar Pedido pelo WhatsApp sem configurar agora</span>
          </button>

        </div>

      </div>
    </div>
  );
};
