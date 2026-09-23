import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Copy, 
  Check, 
  MessageCircle, 
  Calendar, 
  CreditCard,
  QrCode, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  X,
  ShieldCheck,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { supabase } from '../../lib/supabase';
import { 
  createMercadoPagoPixPayment, 
  checkMercadoPagoPaymentStatus, 
  PixPaymentResponse 
} from '../../lib/mercadopago';
import { notifyPaymentApproved } from '../../services/adminTelegramNotificationService';

interface SubscriptionBlockedScreenProps {
  onBackToStore?: () => void;
  isHardLock?: boolean;
  onClose?: () => void;
  initialTargetPlan?: 30 | 50;
}

export const SubscriptionBlockedScreen: React.FC<SubscriptionBlockedScreenProps> = ({
  onBackToStore,
  isHardLock = true,
  onClose,
  initialTargetPlan,
}) => {
  const { currentStore, expiresAt, monthlyFee, updateCurrentStore, refreshTenant, isExpired } = useTenant();
  const { storeConfig } = useStoreData();
  
  // Detecta o plano contratado da loja: se o monthly_fee for <= 30, é o Plano Iniciante (R$ 30); caso contrário, é o Plano Máximo (R$ 50)
  const contractedPlan: 30 | 50 = Number(monthlyFee || 0) <= 30 ? 30 : 50;

  // Plano selecionado para pagamento/renovação (permite migração se o plano contratado for 30)
  const [selectedPlan, setSelectedPlan] = useState<30 | 50>(() => {
    return initialTargetPlan || contractedPlan;
  });

  // Atualiza caso a prop initialTargetPlan mude
  useEffect(() => {
    if (initialTargetPlan) {
      setSelectedPlan(initialTargetPlan);
    }
  }, [initialTargetPlan]);

  // 'overview' = modal visual exatamente igual à referência (com opção de migração quando plano 30)
  // 'pix' = tela com QR Code e Pix Copia e Cola para pagamento
  const [viewMode, setViewMode] = useState<'overview' | 'pix'>('overview');

  const [copiedPix, setCopiedPix] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [manualCheckMsg, setManualCheckMsg] = useState<string | null>(null);

  // Chaves de fallback e suporte
  const masterPixKey = import.meta.env.VITE_MASTER_PIX_KEY || 'admin@editaveisdocanva.com.br';
  const masterWhatsApp = import.meta.env.VITE_MASTER_WHATSAPP || '5519981356505';

  const storeName = currentStore?.store_name || currentStore?.name || storeConfig.storeName || 'Sua Loja';
  
  // Valor a pagar baseado no plano selecionado
  const feeValue = selectedPlan;
  const feeFormatted = feeValue.toFixed(2).replace('.', ',');

  const expiryDateFormatted = expiresAt 
    ? new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
    : '18/12/2026';

  // Armazena a data inicial no momento em que o modal foi aberto
  const initialExpTimeRef = useRef<number>(expiresAt ? new Date(expiresAt).getTime() : 0);

  // Helper para liberar acesso no Supabase e no TenantContext estritamente quando aprovado
  const handleActivateStoreAccess = async (approvedDate?: string) => {
    try {
      setPaymentSuccess(true);
      const now = Date.now();
      const currentExpTime = expiresAt ? new Date(expiresAt).getTime() : now;
      const baseTime = currentExpTime > now ? currentExpTime : now;
      const newExpiresAt = approvedDate || new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();
      const newMonthlyFee = selectedPlan;

      console.log(`[SubscriptionBlockedScreen] 🎉 Pagamento Aprovado pelo Mercado Pago! Renovando loja para: ${newExpiresAt} | Plano: R$ ${newMonthlyFee}`);

      // Atualiza banco Supabase (por id e por slug se disponível) com a nova validade e o plano contratado/migrado
      try {
        await supabase
          .from('stores')
          .update({
            expires_at: newExpiresAt,
            monthly_fee: newMonthlyFee,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentStore.id);

        if (currentStore?.slug) {
          await supabase
            .from('stores')
            .update({
              expires_at: newExpiresAt,
              monthly_fee: newMonthlyFee,
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
        monthly_fee: newMonthlyFee,
        subscription_status: 'active'
      });

      // Disparo automático de notificação de Pagamento Aprovado no Telegram
      try {
        const renewedDateFormatted = new Date(newExpiresAt).toLocaleDateString('pt-BR');
        notifyPaymentApproved({
          store_name: currentStore.store_name || currentStore.name || storeName,
          client_name: currentStore.client_name || currentStore.owner_name || 'Lojista',
          whatsapp_number: currentStore.whatsapp_number || currentStore.owner_phone || (currentStore as any).whatsapp,
          valor: feeValue,
          forma: 'Pix',
          data_renovada: renewedDateFormatted,
          store_id: currentStore.id,
          slug: currentStore.slug
        });
      } catch (tgErr) {
        console.warn('[SubscriptionBlockedScreen] Aviso notificação Telegram:', tgErr);
      }

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

  // 1. Gerar Pix dinâmico via Mercado Pago para o plano selecionado
  const handleGeneratePix = async () => {
    if (isGeneratingPix) return;
    setIsGeneratingPix(true);
    setPixError(null);
    setManualCheckMsg(null);

    try {
      const payerName = currentStore?.owner_name || currentStore?.client_name || 'Lojista AJPSTORE';
      const payerEmail = currentStore?.owner_email || currentStore?.client_email || 'cobranca@ajpstore.com.br';
      const planLabel = selectedPlan === 50 ? 'Plano Maximo' : 'Plano Iniciante';

      const response = await createMercadoPagoPixPayment({
        amount: feeValue,
        customerName: payerName,
        customerEmail: payerEmail,
        description: `Renovacao AJPSTORE - ${storeName.slice(0, 22)} (${planLabel})`,
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

  // 2. Polling Mercado Pago (a cada 3.5 segundos enquanto houver paymentId ativo na tela de Pix)
  // REGRA RIGOROSA: NUNCA libera sozinho! Apenas libera se a API do Mercado Pago retornar 'approved'
  useEffect(() => {
    if (!pixData?.paymentId || paymentSuccess || viewMode !== 'pix') return;

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
  }, [pixData?.paymentId, paymentSuccess, viewMode, currentStore?.id, expiresAt, selectedPlan]);

  // 3. Checagem de contingência no Supabase: SOMENTE ativa se um administrador estendeu a data explicitamente no banco
  // APÓS o modal ter sido aberto (evitando falsos positivos se a loja já tiver data futura ativa)
  useEffect(() => {
    if (paymentSuccess || !currentStore?.id) return;

    const dbIntervalId = setInterval(async () => {
      try {
        const { data: storeDb } = await supabase
          .from('stores')
          .select('id, expires_at, subscription_status, monthly_fee')
          .eq('id', currentStore.id)
          .maybeSingle();

        if (storeDb) {
          const rawExp = storeDb.expires_at || (storeDb as any).vence_em || (storeDb as any).trial_ends_at;
          if (rawExp) {
            const expTime = new Date(rawExp).getTime();
            // Apenas se a nova data for expressivamente posterior à data em que o modal foi aberto (+12h)
            if (initialExpTimeRef.current > 0 && expTime > (initialExpTimeRef.current + 12 * 60 * 60 * 1000)) {
              console.log('[SubscriptionBlockedScreen] ⚡ Admin estendeu a validade no banco!');
              clearInterval(dbIntervalId);
              await handleActivateStoreAccess(rawExp);
            }
          }
        }
      } catch (err) {
        console.warn('[SubscriptionBlockedScreen] Erro no polling DB:', err);
      }
    }, 6000);

    return () => clearInterval(dbIntervalId);
  }, [paymentSuccess, currentStore?.id]);

  // 4. Verificação Manual Instantânea pelo botão
  const handleManualCheck = async () => {
    setIsCheckingPayment(true);
    setManualCheckMsg(null);

    try {
      if (pixData?.paymentId) {
        const check = await checkMercadoPagoPaymentStatus(pixData.paymentId, storeConfig);
        if (check && check.success && check.status === 'approved') {
          await handleActivateStoreAccess();
          return;
        }
      }

      setManualCheckMsg('Pagamento ainda não confirmado pelo Mercado Pago. Aguarde alguns instantes e tente novamente.');
      setTimeout(() => setManualCheckMsg(null), 4000);
    } catch (e: any) {
      setManualCheckMsg('Não foi possível verificar com o Mercado Pago no momento.');
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
    `👋 Olá! Sou da loja *${storeName}*.\n\nPreciso de suporte sobre a renovação/migração da minha assinatura (Plano R$ ${feeFormatted}).`
  );
  const cleanPhone = (masterWhatsApp || '5519981356505').replace(/\D/g, '');
  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${finalPhone}?text=${whatsappMessage}`;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans select-none overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full max-w-[540px] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* TELA DE SUCESSO INSTANTÂNEO (QUANDO O MERCADO PAGO CONFIRMAR O PAGAMENTO) */}
        {paymentSuccess ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Pagamento Aprovado pelo Mercado Pago!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                Sua assinatura foi renovada por mais <strong>30 dias</strong> no <strong>Plano {selectedPlan === 50 ? 'Máximo (R$ 50,00)' : 'Iniciante (R$ 30,00)'}</strong>. Liberando o acesso ao painel imediatamente...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 px-4 rounded-full max-w-xs mx-auto">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Desbloqueio instantâneo sem F5</span>
            </div>
          </div>
        ) : viewMode === 'overview' ? (
          /* ========================================================================= */
          /* MODO VISÃO GERAL: SELETOR DE PLANOS DINÂMICO E VISUAL DA REFERÊNCIA      */
          /* ========================================================================= */
          <div className="relative text-center">
            
            {/* Botão Fechar ('X') no Canto Superior Direito (Apenas quando não for Hard Lock) */}
            {!isHardLock && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute -top-2 -right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Ícone Laranja Superior */}
            <div className="w-14 h-14 rounded-2xl bg-[#FFF6ED] border border-[#FED7AA] text-[#F97316] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>

            {/* Badge Pílula */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF6ED] text-[#C2410C] border border-[#FED7AA] text-xs font-bold mb-2.5">
              <Lock className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>
                {isExpired 
                  ? 'Assinatura Mensal Vencida' 
                  : (selectedPlan === 50 && contractedPlan === 30 ? 'Upgrade para Plano Máximo' : 'Assinatura Mensal')}
              </span>
            </div>

            {/* Título Principal */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              {selectedPlan === 50 && contractedPlan === 30 
                ? 'Migrar para o Plano Máximo' 
                : 'Para continuar, renove seu plano'}
            </h2>

            {/* Subtítulo com Data Dinâmica */}
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
              {isExpired
                ? `Sua assinatura mensal encerrou em ${expiryDateFormatted}. Renove para continuar com acesso total à ferramenta.`
                : `Sua assinatura mensal encerra em ${expiryDateFormatted}. Renove para continuar com acesso total à ferramenta.`}
            </p>

            {/* SELETOR DE MIGRAÇÃO: Exibido quando a loja está no Plano de R$ 30 */}
            {contractedPlan === 30 && (
              <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-4 gap-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlan !== 30) {
                      setSelectedPlan(30);
                      setPixData(null);
                    }
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedPlan === 30 
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Plano Atual (R$ 30)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlan !== 50) {
                      setSelectedPlan(50);
                      setPixData(null);
                    }
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedPlan === 50 
                      ? 'bg-[#D9383A] text-white shadow-md shadow-red-500/20' 
                      : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/60'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${selectedPlan === 50 ? 'text-amber-300' : 'text-amber-600'}`} />
                  <span>Migrar p/ Máximo (R$ 50)</span>
                </button>
              </div>
            )}

            {/* Bloco de Preço e Botão Vermelho (Destaque Central) */}
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left mb-4">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#EF4444] tracking-wider uppercase block mb-0.5">
                  {selectedPlan === 50 && contractedPlan === 30 
                    ? 'PLANO MÁXIMO COMPLETO (MIGRAÇÃO)' 
                    : (selectedPlan === 30 ? 'PLANO MENSAL INICIANTE' : 'PLANO MENSAL COMPLETO')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    R$ {feeFormatted}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">/mês</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                  {selectedPlan === 50 && contractedPlan === 30 
                    ? 'Upgrade imediato e 30 dias de acesso com ativação via Pix.' 
                    : '30 dias de acesso com renovação automática via Pix.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewMode('pix');
                  if (!pixData && !isGeneratingPix) {
                    handleGeneratePix();
                  }
                }}
                className="bg-[#D9383A] hover:bg-[#C22E30] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-98 cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <QrCode className="w-4 h-4" />
                <span>
                  {selectedPlan === 50 && contractedPlan === 30 
                    ? `Migrar via Pix (R$ ${feeFormatted})` 
                    : `Pagar via Pix (R$ ${feeFormatted})`}
                </span>
              </button>
            </div>

            {/* Aviso informativo de upgrade */}
            {selectedPlan === 50 && contractedPlan === 30 && (
              <div className="text-center mb-4 animate-in fade-in">
                <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Ao pagar R$ 50,00, sua loja será atualizada automaticamente para o Plano Máximo.
                </span>
              </div>
            )}

            {/* Lista de Vantagens da Loja Virtual (2 Colunas com Checkmarks Verdes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left mb-6 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Produtos e Pedidos Ilimitados</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Checkout Próprio com Pix Automático</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Recuperação de Vendas e Carrinho</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Notificações e Suporte Prioritário</span>
              </div>
            </div>

            {/* Rodapé com Desenvolvedor e Link de Suporte WhatsApp (19981356505) */}
            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <span className="text-[11px] sm:text-xs">Desenvolvido por AJPSTORE</span>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#EF4444] hover:text-[#DC2626] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Falar com Suporte (WhatsApp)</span>
              </a>
            </div>

            {/* Botão de voltar à vitrine pública se for hardlock */}
            {isHardLock && onBackToStore && (
              <div className="mt-4 pt-2">
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Voltar para a página pública da loja
                </button>
              </div>
            )}

          </div>
        ) : (
          /* ========================================================================= */
          /* MODO PAGAMENTO PIX (QR CODE MERCADO PAGO COM POLLING E PROTEÇÃO RIGOROSA) */
          /* ========================================================================= */
          <div className="space-y-4">
            
            {/* Top Bar da tela de Pix */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <span className="text-xs font-bold text-slate-700">
                {selectedPlan === 50 && contractedPlan === 30 ? 'Migração' : 'Renovação'} via Pix (R$ {feeFormatted})
              </span>

              {!isHardLock && onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-6" />
              )}
            </div>

            {/* Container Principal do QR Code */}
            {isGeneratingPix ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-600">
                <RefreshCw className="w-8 h-8 animate-spin text-[#EF4444]" />
                <p className="text-sm font-bold text-slate-800">
                  Gerando cobrança Pix de R$ {feeFormatted} no Mercado Pago...
                </p>
                <p className="text-xs text-slate-400">Aguarde alguns segundos enquanto conectamos à API oficial.</p>
              </div>
            ) : pixData ? (
              <div className="space-y-4">
                
                {/* QR Code Imagem do Mercado Pago */}
                {(pixData.qrCodeImage || pixData.qrCodeBase64) && (
                  <div className="flex flex-col items-center justify-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200 max-w-[210px] mx-auto shadow-2xs">
                    <img 
                      src={pixData.qrCodeImage || `data:image/png;base64,${pixData.qrCodeBase64}`} 
                      alt="QR Code Pix Mercado Pago" 
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-slate-500 mt-1.5">
                      Abra o app do seu banco e escaneie
                    </span>
                  </div>
                )}

                {/* Campo Pix Copia e Cola */}
                {pixData.qrCode && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Código Pix Copia e Cola:</span>
                      <span className="text-[10px] text-slate-400 font-medium">1 clique para copiar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.qrCode}
                        className="flex-1 text-xs font-mono font-bold bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 select-all outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyCode(pixData.qrCode)}
                        className="px-4 py-2.5 bg-[#D9383A] hover:bg-[#C22E30] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
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

                {/* Radar de Confirmação Ativa (Aguardando verificação rigorosa do Mercado Pago) */}
                <div className="flex items-center justify-center gap-2.5 py-2.5 px-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 text-xs font-medium">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span>Aguardando confirmação do Mercado Pago... O painel libera assim que o pagamento for aprovado.</span>
                </div>

                {/* Feedback de verificação manual se houver */}
                {manualCheckMsg && (
                  <div className="p-2.5 text-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in">
                    {manualCheckMsg}
                  </div>
                )}

                {/* Botão de Verificação Manual com o Mercado Pago */}
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isCheckingPayment}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {isCheckingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
                      <span>Verificando com o Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Já Paguei! Verificar Pagamento Agora</span>
                    </>
                  )}
                </button>

              </div>
            ) : (
              /* Fallback caso falhe a geração da API */
              <div className="space-y-3 py-4">
                {pixError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{pixError}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Chave Pix de Suporte:</span>
                    <span className="text-[10px] text-slate-500">Pagamento manual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={masterPixKey}
                      className="flex-1 text-xs font-mono font-bold bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyCode(masterPixKey)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePix}
                  className="w-full py-2.5 bg-[#D9383A] hover:bg-[#C22E30] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Gerar QR Code Novamente</span>
                </button>
              </div>
            )}

            {/* Suporte WhatsApp (19981356505) */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Desenvolvido por AJPSTORE</span>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#EF4444] hover:text-[#DC2626] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Suporte via WhatsApp</span>
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
