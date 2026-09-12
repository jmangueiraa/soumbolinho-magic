import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Lock, 
  ArrowLeft, 
  Copy, 
  Check, 
  MessageCircle, 
  ShieldAlert, 
  ExternalLink,
  Calendar,
  CreditCard
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';

interface SubscriptionBlockedScreenProps {
  onBackToStore: () => void;
}

export const SubscriptionBlockedScreen: React.FC<SubscriptionBlockedScreenProps> = ({
  onBackToStore,
}) => {
  const { currentStore, expiresAt, monthlyFee, isTrial } = useTenant();
  const { storeConfig } = useStoreData();
  const [copiedPix, setCopiedPix] = useState(false);

  // Chave Pix do Super Admin (configurável ou e-mail de suporte)
  const masterPixKey = import.meta.env.VITE_MASTER_PIX_KEY || 'admin@editaveisdocanva.com.br';
  const masterWhatsApp = import.meta.env.VITE_MASTER_WHATSAPP || '5521974975884';

  const storeName = currentStore.name || storeConfig.storeName || 'Sua Loja';
  const feeFormatted = (monthlyFee || 50).toFixed(2).replace('.', ',');

  const expiryDateFormatted = expiresAt 
    ? new Date(expiresAt).toLocaleDateString('pt-BR') 
    : 'Data não informada';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(masterPixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const isTrialExpired = isTrial || currentStore.subscription_status === 'trial';

  const whatsappMessage = encodeURIComponent(
    `👋 Olá! Sou o proprietário da loja *${storeName}*.\n\nMeu ciclo de 30 dias de mensalidade encerrou e fiz o pagamento da renovação no valor de *R$ ${feeFormatted}* para reativar o acesso ao meu painel administrativo.\n\nSegue o comprovante em anexo:`
  );

  const whatsappUrl = `https://wa.me/${masterWhatsApp.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-200/80 animate-in zoom-in-95 duration-200 relative">
        
        {/* Top Back Link */}
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a vitrine</span>
        </button>

        {/* Warning Icon & Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 shadow-rose-200/50 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Mensalidade Vencida</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Acesso ao Painel Suspenso
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            O ciclo de <strong>30 dias de mensalidade</strong> da loja <strong>{storeName}</strong> completou em <strong>{expiryDateFormatted}</strong>. O painel administrativo e a edição de produtos encontram-se temporariamente bloqueados até a confirmação do pagamento de <strong>R$ {feeFormatted}</strong>.
          </p>
        </div>

        {/* Details Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/70">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data de Vencimento:
            </span>
            <span className="font-bold text-rose-600">
              {expiryDateFormatted}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Valor da Renovação (30 dias):
            </span>
            <span className="font-black text-slate-900 text-sm">
              R$ {feeFormatted} / mês
            </span>
          </div>
        </div>

        {/* Pix Key Box */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Chave Pix para Pagamento:</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded-full">
              Ativação Imediata
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={masterPixKey}
              className="flex-1 text-xs font-mono font-bold bg-white px-3 py-2 rounded-xl border border-emerald-300 text-slate-800 select-all outline-none"
            />
            <button
              onClick={handleCopyPix}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
              title="Copiar Chave Pix"
            >
              {copiedPix ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar Comprovante no WhatsApp para Reativação</span>
          </a>

          <button
            onClick={onBackToStore}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Voltar para a Loja Pública
          </button>
        </div>

      </div>
    </div>
  );
};
