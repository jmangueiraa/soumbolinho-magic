import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertOctagon, 
  Lock, 
  Copy, 
  Check, 
  MessageCircle, 
  Calendar, 
  CreditCard,
  QrCode,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { supabase } from '../../lib/supabase';
import { 
  createMercadoPagoPixPayment, 
  checkMercadoPagoPaymentStatus, 
  PixPaymentResponse 
} from '../../lib/mercadopago';

interface SubscriptionBlockedScreenProps {
  onBackToStore?: () => void;
  isHardLock?: boolean;
  onClose?: () => void;
}

export const SubscriptionBlockedScreen: React.FC<SubscriptionBlockedScreenProps> = ({
  onBackToStore,
  isHardLock = true,
  onClose,
}) => {
  const { currentStore, expiresAt, monthlyFee, updateCurrentStore, refreshTenant } = useTenant();
  const { storeConfig } = useStoreData();
  
  const [copiedPix, setCopiedPix] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [manualCheckMsg, setManualCheckMsg] = useState<string | null>(null);

  // Chaves de fallback e suporte
  const masterPixKey = import.meta.env.VITE_MASTER_PIX_KEY || 'admin@editaveisdocanva.com.br';
  const masterWhatsApp = import.meta.env.VITE_MASTER_WHATSAPP || '5521974975884';

  const storeName = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'Sua Loja';
  const feeValue = Number(monthlyFee || 50);
  const feeFormatted = feeValue.toFixed(2).replace('.', ',');

  const expiryDateFormatted = expiresAt 
    ? new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
    : 'Data não informada';

  // Helper para liberar acesso no Supabase e no TenantContext
  const handleActivateStoreAccess = async (approvedDate?: string) => {
    try {
      setPaymentSuccess(true);
      const now = Date.now();
      const currentExpTime = expiresAt ? new Date(expiresAt).getTime() : now;
      const baseTime = currentExpTime > now ? currentExpTime : now;
      const newExpiresAt = approvedDate || new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();

      console.log('[SubscriptionBlockedScreen] 🎉 Pagamento Aprovado! Renovando loja para:', newExpiresAt);

      // Atualiza banco Supabase (por id e por slug se disponível)
      try {
        await supabase
          .from('stores')
          .update({
            expires_at: newExpiresAt,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentStore.id);

        if (currentStore?.slug) {
          await supabase
            .from('stores')
            .update({
              expires_at: newExpiresAt,
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('slug', currentStore.slug);
        }
      } catch (errDb) {
        console.warn('[SubscriptionBlockedScreen] Aviso ao atualizar stores:', errDb);
      }

      // Atualiza estado local React na hora sem precisar de F5
      updateCurrentStore({
        expires_at: newExpiresAt,
        subscription_status: 'active'
      });

      if (refreshTenant) {
        refreshTenant();
      }

      // Aguarda 1.5s para o usuário ver o feedback de sucesso antes de fechar
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);

    } catch (e: any) {
      console.error('[SubscriptionBlockedScreen] Erro ao ativar loja:', e);
    }
  };

  // 1. Gerar Pix dinâmico via Mercado Pago
  const handleGeneratePix = async () => {
    if (isGeneratingPix) return;
    setIsGeneratingPix(true);
    setPixError(null);
    setManualCheckMsg(null);

    try {
      const payerName = currentStore?.owner_name || currentStore?.client_name || 'Lojista AJPSTORE';
      const payerEmail = currentStore?.owner_email || currentStore?.client_email || 'cobranca@ajpstore.com.br';

      const response = await createMercadoPagoPixPayment({
        amount: feeValue,
        customerName: payerName,
        customerEmail: payerEmail,
        description: `Renovacao Mensalidade AJPSTORE - ${storeName.slice(0, 30)}`,
        storeConfig
      });

      if (response && response.success && (response.qrCode || response.qrCodeImage)) {
        setPixData(response);
      } else {
        throw new Error(response?.error || 'Não foi possível gerar a cobrança Pix no Mercado Pago.');
      }
    } catch (err: any) {
      console.warn('[SubscriptionBlockedScreen] Erro na geração Pix Mercado Pago:', err);
      setPixError(err.message || 'Erro de comunicação ao gerar cobrança automática.');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  // Gera o Pix automaticamente ao abrir o modal para agilidade máxima
  const hasAutoRequestedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoRequestedRef.current && !pixData) {
      hasAutoRequestedRef.current = true;
      handleGeneratePix();
    }
  }, []);

  // 2. Polling Mercado Pago (a cada 3.5 segundos enquanto houver paymentId)
  useEffect(() => {
    if (!pixData?.paymentId || paymentSuccess) return;

    const intervalId = setInterval(async () => {
      try {
        const check = await checkMercadoPagoPaymentStatus(pixData.paymentId!, storeConfig);
        if (check && check.success && check.status === 'approved') {
          clearInterval(intervalId);
          await handleActivateStoreAccess();
        }
      } catch (err) {
        console.warn('[SubscriptionBlockedScreen] Erro no polling de pagamento MP:', err);
      }
    }, 3500);

    return () => clearInterval(intervalId);
  }, [pixData?.paymentId, paymentSuccess, currentStore?.id, expiresAt]);

  // 3. Polling de Fallback no Supabase (a cada 5 segundos para checar se a data foi estendida externamente)
  useEffect(() => {
    if (paymentSuccess || !currentStore?.id) return;

    const dbIntervalId = setInterval(async () => {
      try {
        const { data: storeDb } = await supabase
          .from('stores')
          .select('id, expires_at, subscription_status')
          .eq('id', currentStore.id)
          .maybeSingle();

        if (storeDb) {
          const rawExp = storeDb.expires_at || (storeDb as any).vence_em || (storeDb as any).trial_ends_at;
          if (rawExp) {
            const expTime = new Date(rawExp).getTime();
            if (expTime > Date.now() && storeDb.subscription_status !== 'suspended') {
              console.log('[SubscriptionBlockedScreen] ⚡ Polling DB detectou renovação externa!');
              clearInterval(dbIntervalId);
              await handleActivateStoreAccess(rawExp);
            }
          }
        }
      } catch (err) {
        console.warn('[SubscriptionBlockedScreen] Erro no polling DB:', err);
      }
    }, 5000);

    return () => clearInterval(dbIntervalId);
  }, [paymentSuccess, currentStore?.id]);

  // 4. Verificação Manual Instantânea pelo botão
  const handleManualCheck = async () => {
    setIsCheckingPayment(true);
    setManualCheckMsg(null);

    try {
      // 1) Verifica pelo paymentId no MP
      if (pixData?.paymentId) {
        const check = await checkMercadoPagoPaymentStatus(pixData.paymentId, storeConfig);
        if (check && check.success && check.status === 'approved') {
          await handleActivateStoreAccess();
          return;
        }
      }

      // 2) Verifica no banco Supabase
      const { data: storeDb } = await supabase
        .from('stores')
        .select('id, expires_at, subscription_status')
        .eq('id', currentStore.id)
        .maybeSingle();

      if (storeDb) {
        const rawExp = storeDb.expires_at || (storeDb as any).vence_em || (storeDb as any).trial_ends_at;
        if (rawExp && new Date(rawExp).getTime() > Date.now() && storeDb.subscription_status !== 'suspended') {
          await handleActivateStoreAccess(rawExp);
          return;
        }
      }

      setManualCheckMsg('Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.');
      setTimeout(() => setManualCheckMsg(null), 4000);
    } catch (e: any) {
      setManualCheckMsg('Não foi possível verificar no momento.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCopyCode = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `👋 Olá! Sou da loja *${storeName}* (ID: ${currentStore.id}).\n\nEstou regularizando a mensalidade de *R$ ${feeFormatted}* para desbloquear meu painel administrativo.\n\nSegue comprovante:`
  );
  const whatsappUrl = `https://wa.me/${masterWhatsApp.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans select-none overflow-y-auto"
      // Trava de segurança: impede fechar ao clicar no fundo
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full max-w-xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-rose-300 relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* TELA DE SUCESSO INSTANTÂNEO (QUANDO O PIX É APROVADO) */}
        {paymentSuccess ? (
          <div className="py-10 text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">
                Pagamento Aprovado com Sucesso!
              </h2>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Sua assinatura foi renovada por mais <strong>30 dias</strong>. Liberando o acesso ao painel imediatamente...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 px-4 rounded-full max-w-xs mx-auto">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Desbloqueio automático sem F5</span>
            </div>
          </div>
        ) : (
          <>
            {/* Header de Bloqueio */}
            <div className="text-center space-y-2 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 shadow-rose-200/50 flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-7 h-7" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold uppercase tracking-wider">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Assinatura Vencida • Acesso Bloqueado</span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Renove sua Assinatura Mensal
              </h1>

              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                O ciclo de <strong>30 dias</strong> da loja <strong>{storeName}</strong> encerrou em <strong>{expiryDateFormatted}</strong>. Para continuar usando o painel administrativo e gerenciando seus produtos, efetue o pagamento da mensalidade de <strong>R$ {feeFormatted}</strong>.
              </p>
            </div>

            {/* Card com Detalhes do Vencimento */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80">
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

            {/* SEÇÃO PRINCIPAL: QR CODE E COPIA E COLA PIX (MERCADO PAGO) */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Pagamento Instantâneo via Pix</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Liberação Automática</span>
                </span>
              </div>

              {isGeneratingPix ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-emerald-800">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-xs font-bold">Gerando cobrança Pix no Mercado Pago...</p>
                </div>
              ) : pixData ? (
                <div className="space-y-3.5">
                  {/* QR Code Imagem */}
                  {(pixData.qrCodeImage || pixData.qrCodeBase64) && (
                    <div className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-emerald-200 shadow-2xs max-w-[210px] mx-auto">
                      <img 
                        src={pixData.qrCodeImage || `data:image/png;base64,${pixData.qrCodeBase64}`} 
                        alt="QR Code Pix Mercado Pago" 
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                      <span className="text-[10px] font-bold text-slate-500 mt-1">
                        Abra o app do banco e escaneie
                      </span>
                    </div>
                  )}

                  {/* Campo Copia e Cola */}
                  {pixData.qrCode && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Código Pix Copia e Cola:</span>
                        <span className="text-[10px] font-normal text-slate-500">1 clique para copiar</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixData.qrCode}
                          className="flex-1 text-xs font-mono font-bold bg-white px-3 py-2.5 rounded-xl border border-emerald-300 text-slate-800 select-all outline-none truncate"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyCode(pixData.qrCode)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                          title="Copiar Código Copia e Cola"
                        >
                          {copiedPix ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-200" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Indicador de Espera Ativa (Radar de confirmação) */}
                  <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-white/80 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span>Aguardando banco... O painel libera sozinho ao pagar.</span>
                  </div>
                </div>
              ) : (
                /* Fallback caso falhe a geração automática */
                <div className="space-y-3">
                  {pixError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{pixError}</span>
                    </div>
                  )}

                  <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Chave Pix Direta:</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                        Chave Cadastrada
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={masterPixKey}
                        className="flex-1 text-xs font-mono font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 text-slate-800 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyCode(masterPixKey)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePix}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar Gerar QR Code Novamente</span>
                  </button>
                </div>
              )}
            </div>

            {/* Feedback de verificação manual */}
            {manualCheckMsg && (
              <div className="mb-3 p-2 text-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in">
                {manualCheckMsg}
              </div>
            )}

            {/* Ações Inferiores */}
            <div className="space-y-2.5">
              {/* Botão de checagem manual imediata */}
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isCheckingPayment}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isCheckingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
                    <span>Verificando pagamento...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Já Paguei! Verificar Liberação Agora</span>
                  </>
                )}
              </button>

              {/* Botão WhatsApp em caso de suporte ou comprovante */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Precisa de ajuda? Suporte via WhatsApp</span>
              </a>

              {/* Se for apenas um modal preventivo aberto pelo banner, permite fechar; se for HARD LOCK, não há botão de fechar */}
              {!isHardLock && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Fechar janela
                </button>
              )}

              {/* Link para voltar à vitrine pública (sem dar acesso ao admin) */}
              {onBackToStore && (
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Ver vitrine pública da loja
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
