import React, { useState } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Package, 
  Truck, 
  CreditCard, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Printer, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  Share2, 
  Clock,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { Order, updateOrderStatusInSupabase, updateOrderTrackingInSupabase, updateOrderNotesInSupabase } from '../../services/orderService';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderUpdated: (updated: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onOrderUpdated,
}) => {
  const { currentStore } = useTenant();
  const { storeConfig } = useStoreData();

  if (!order) return null;

  // Estados locais para edição rápida e rastreio
  const [currentStatus, setCurrentStatus] = useState<Order['status']>(order.status || 'pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);

  // Rastreio & Etiqueta
  const [trackingCode, setTrackingCode] = useState(order.tracking_code || '');
  const [shippingLabelUrl, setShippingLabelUrl] = useState(order.shipping_label_url || '');
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [trackingSavedSuccess, setTrackingSavedSuccess] = useState(false);

  // Geração Melhor Envio
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelSuccess, setLabelSuccess] = useState<string | null>(null);
  const [inlineToken, setInlineToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  // CPF / Documento editável caso precise para emissão
  const [customerDoc, setCustomerDoc] = useState(order.customer_document || '');
  const [isEditingDoc, setIsEditingDoc] = useState(false);

  // Anotações internas
  const [notes, setNotes] = useState(order.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Atualização do status do pedido
  const handleStatusChange = async (newStatus: Order['status']) => {
    setIsUpdatingStatus(true);
    setStatusSuccess(false);
    try {
      const res = await updateOrderStatusInSupabase(order.id, newStatus);
      if (res.success) {
        setCurrentStatus(newStatus);
        setStatusSuccess(true);
        const updated = { ...order, status: newStatus };
        onOrderUpdated(updated);
        setTimeout(() => setStatusSuccess(false), 2500);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Salvamento manual de código de rastreio
  const handleSaveManualTracking = async () => {
    if (!trackingCode.trim()) return;
    setIsSavingTracking(true);
    setTrackingSavedSuccess(false);
    try {
      const res = await updateOrderTrackingInSupabase(order.id, trackingCode, shippingLabelUrl);
      if (res.success) {
        setTrackingSavedSuccess(true);
        const updated = { ...order, tracking_code: trackingCode, shipping_label_url: shippingLabelUrl };
        onOrderUpdated(updated);
        setTimeout(() => setTrackingSavedSuccess(false), 2500);
      }
    } finally {
      setIsSavingTracking(false);
    }
  };

  // Salvamento de anotações
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setNotesSuccess(false);
    try {
      const res = await updateOrderNotesInSupabase(order.id, notes);
      if (res.success) {
        setNotesSuccess(true);
        const updated = { ...order, notes };
        onOrderUpdated(updated);
        setTimeout(() => setNotesSuccess(false), 2500);
      }
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Disparo da API de Geração de Etiqueta no Melhor Envio
  const handleGenerateMelhorEnvioLabel = async () => {
    setIsGeneratingLabel(true);
    setLabelError(null);
    setLabelSuccess(null);

    // Obtém o token do Melhor Envio das configurações da loja
    const token =
      currentStore?.theme_settings?.shipping_config?.melhorEnvioToken ||
      storeConfig?.shippingConfig?.melhorEnvioToken ||
      (currentStore?.id ? localStorage.getItem(`store_${currentStore.id}_melhor_envio_token`) : null) ||
      '';

    if (!token) {
      setLabelError('Token da API do Melhor Envio não encontrado. Configure seu token na aba "API e Domínio".');
      setIsGeneratingLabel(false);
      return;
    }

    // Extrai dados de endereço de entrega
    const rawAddress = order.delivery_address || '';
    const cepMatch = rawAddress.match(/\b\d{5}-?\d{3}\b/) || [order.shipping_address_data?.cep || '01001000'];
    const destCep = (cepMatch[0] || '01001000').replace(/\D/g, '');

    // Dados do remetente (a loja)
    const originCep = (
      currentStore?.theme_settings?.shipping_config?.originCep ||
      storeConfig?.shippingConfig?.originCep ||
      '01001000'
    ).replace(/\D/g, '');

    const senderPerson = {
      name: currentStore?.store_name || currentStore?.name || storeConfig?.storeName || 'Loja Virtual',
      phone: currentStore?.whatsapp_number || storeConfig?.whatsappNumber || '11999999999',
      email: currentStore?.owner_email || currentStore?.client_email || 'contato@loja.com',
      document: '00000000000',
      address: currentStore?.address || 'Rua Principal',
      number: '100',
      district: 'Centro',
      city: 'São Paulo',
      state_abbr: 'SP',
      postal_code: originCep,
    };

    // Dados do destinatário (o cliente)
    const recipientPerson = {
      name: order.customer_name,
      phone: order.customer_phone || '11999999999',
      email: order.customer_email,
      document: customerDoc.replace(/\D/g, '') || '00000000000',
      address: order.shipping_address_data?.street || rawAddress.split('-')[0]?.trim() || 'Endereço',
      number: order.shipping_address_data?.number || 'S/N',
      complement: order.shipping_address_data?.complement || '',
      district: order.shipping_address_data?.neighborhood || 'Bairro',
      city: order.shipping_address_data?.city || 'Cidade',
      state_abbr: order.shipping_address_data?.state || 'SP',
      postal_code: destCep,
    };

    // Produtos do pedido
    const itemsPayload = (order.items && order.items.length > 0 ? order.items : [
      {
        name: order.product_name || 'Produto',
        quantity: 1,
        price: order.amount,
      }
    ]).map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitary_value: it.price,
    }));

    try {
      const response = await fetch('/api/generate-shipping-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          store_id: order.store_id,
          melhor_envio_token: token,
          service_id: order.shipping_service_id || 1, // 1 = PAC, 2 = SEDEX
          agency_id: order.shipping_agency_id,
          from: senderPerson,
          to: recipientPerson,
          products: itemsPayload,
          package: {
            height: 10,
            width: 15,
            length: 20,
            weight: 0.5,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLabelSuccess(data.message || 'Etiqueta gerada com sucesso!');
        if (data.tracking_code) setTrackingCode(data.tracking_code);
        if (data.label_url) setShippingLabelUrl(data.label_url);
        setCurrentStatus('shipped');

        const updated = {
          ...order,
          tracking_code: data.tracking_code || trackingCode,
          shipping_label_url: data.label_url || shippingLabelUrl,
          status: 'shipped' as const,
        };
        onOrderUpdated(updated);
      } else {
        setLabelError(data.error || 'Falha ao gerar etiqueta no Melhor Envio.');
      }
    } catch (err: any) {
      setLabelError(err.message || 'Erro de conexão ao tentar gerar etiqueta no Melhor Envio.');
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  // Abre conversa no WhatsApp com o cliente
  const handleOpenWhatsApp = (customMsg?: string) => {
    const rawPhone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : '';
    if (!rawPhone) return;
    const phoneWithCountry = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const defaultMsg = `Olá ${order.customer_name}! Aqui é da loja ${currentStore?.name || 'AJPSTORE'} referente ao seu pedido #${order.id.slice(-6).toUpperCase()}.`;
    const message = encodeURIComponent(customMsg || defaultMsg);
    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
  };

  // Enviar código de rastreamento no WhatsApp com 1 clique
  const handleSendTrackingViaWhatsApp = () => {
    if (!trackingCode) return;
    const msg = `Olá *${order.customer_name}*! 👋\n\nSeu pedido *#${order.id.slice(-6).toUpperCase()}* já foi despachado e está a caminho! 📦🚀\n\n🔎 *Código de Rastreamento:* ${trackingCode}\n🔗 *Acompanhe a entrega:* https://melhorrastreio.com.br/rastreio/${trackingCode}\n\nObrigado pela preferência! Qualquer dúvida, estamos à disposição por aqui.`;
    handleOpenWhatsApp(msg);
  };

  const statusConfig = {
    pending: { label: 'Pendente', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
    approved: { label: 'Aprovado / Pago', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    paid: { label: 'Pago', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    shipped: { label: 'Enviado', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    delivered: { label: 'Entregue', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
    cancelled: { label: 'Cancelado', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  };

  const currentBadge = statusConfig[currentStatus] || statusConfig.pending;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="px-6 py-4 sm:py-5 border-b border-gray-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 font-mono">
                  Pedido #{order.id.slice(-8).toUpperCase()}
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentBadge.bg}`}>
                  {currentBadge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Clock size={12} />
                <span>{new Date(order.created_at).toLocaleString('pt-BR')}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPO COM SCROLL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
          
          {/* BARRA DE ATUALIZAÇÃO RÁPIDA DE STATUS */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-xs text-slate-300 font-medium">Status Operacional do Pedido:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-indigo-300">Alterar para:</span>
                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
                  disabled={isUpdatingStatus}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  <option value="pending">🟡 Pendente (Aguardando Pagamento)</option>
                  <option value="paid">🟢 Pago / Aprovado</option>
                  <option value="shipped">🚀 Enviado (A caminho)</option>
                  <option value="delivered">✅ Entregue ao Cliente</option>
                  <option value="cancelled">🔴 Cancelado</option>
                </select>
                {isUpdatingStatus && <Loader2 size={16} className="animate-spin text-indigo-400" />}
                {statusSuccess && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 size={14} /> Atualizado!
                  </span>
                )}
              </div>
            </div>

            {order.customer_phone && (
              <button
                type="button"
                onClick={() => handleOpenWhatsApp()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
              >
                <MessageCircle size={16} />
                <span>Falar com o Cliente</span>
              </button>
            )}
          </div>

          {/* GRID DE 2 COLUNAS: CLIENTE & ENTREGA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* 1. DADOS DO CLIENTE */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <User size={18} className="text-indigo-600" />
                  <span>Dados do Comprador</span>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                  ID: {order.id.slice(0, 10)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Nome Completo</span>
                  <span className="font-bold text-gray-900 text-sm">{order.customer_name}</span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">E-mail para Acesso</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-gray-800 truncate">{order.customer_email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.customer_email, 'email')}
                      className="text-gray-400 hover:text-indigo-600 cursor-pointer p-1"
                      title="Copiar e-mail"
                    >
                      {copiedKey === 'email' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">WhatsApp / Telefone</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-gray-800 font-mono">
                      {order.customer_phone || 'Não informado'}
                    </span>
                    {order.customer_phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(order.customer_phone!, 'phone')}
                        className="text-gray-400 hover:text-indigo-600 cursor-pointer p-1"
                        title="Copiar WhatsApp"
                      >
                        {copiedKey === 'phone' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 block text-[11px]">CPF / Documento</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingDoc(!isEditingDoc)}
                      className="text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Edit2 size={10} />
                      <span>{isEditingDoc ? 'Fechar' : 'Editar'}</span>
                    </button>
                  </div>
                  {isEditingDoc ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={customerDoc}
                        onChange={(e) => setCustomerDoc(e.target.value)}
                        placeholder="000.000.000-00"
                        className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-lg outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingDoc(false);
                          const updated = { ...order, customer_document: customerDoc };
                          onOrderUpdated(updated);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-gray-800 font-medium">
                      {customerDoc || 'Não cadastrado'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. DADOS DE ENTREGA & FRETE (INTEGRAÇÃO MELHOR ENVIO) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <Truck size={18} className="text-orange-600" />
                  <span>Entrega & Frete (Melhor Envio)</span>
                </div>
                {order.shipping_method && (
                  <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md font-bold">
                    {order.shipping_method}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Endereço Completo de Destino</span>
                  <p className="font-medium text-gray-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                    {order.delivery_address || 'Entrega Digital (sem envio físico)'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500">Custo do Frete:</span>
                  <span className="font-bold text-gray-900">
                    {order.shipping_cost && order.shipping_cost > 0
                      ? `R$ ${order.shipping_cost.toFixed(2).replace('.', ',')}`
                      : 'Grátis / Digital'}
                  </span>
                </div>

                {/* ÁREA MELHOR ENVIO: GERAÇÃO DE ETIQUETA E RASTREIO */}
                <div className="pt-2 border-t border-gray-100 space-y-2.5">
                  {/* Botões de Ação de Etiqueta */}
                  {shippingLabelUrl ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Etiqueta de Envio Pronta!
                        </span>
                        <a
                          href={shippingLabelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                        >
                          <Printer size={13} />
                          <span>Imprimir PDF</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={handleGenerateMelhorEnvioLabel}
                        disabled={isGeneratingLabel}
                        className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                      >
                        {isGeneratingLabel ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span>Comunicando com Melhor Envio...</span>
                          </>
                        ) : (
                          <>
                            <Truck size={16} />
                            <span>Gerar Etiqueta de Envio (Melhor Envio)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {labelError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-xl flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle size={14} className="shrink-0 text-rose-600" />
                      <span>{labelError}</span>
                    </div>
                  )}

                  {labelSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xl flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                      <span>{labelSuccess}</span>
                    </div>
                  )}

                  {/* CAMPO DE CÓDIGO DE RASTREAMENTO */}
                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Código de Rastreio da Encomenda
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value.toUpperCase().trim())}
                        placeholder="Ex: BR123456789BR ou JD019283"
                        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 uppercase outline-none focus:bg-white focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveManualTracking}
                        disabled={isSavingTracking}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Salvar Código no Pedido"
                      >
                        {isSavingTracking ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Salvar</span>
                      </button>
                    </div>

                    {trackingSavedSuccess && (
                      <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                        ✓ Rastreio salvo no pedido!
                      </span>
                    )}

                    {trackingCode && (
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1">
                        <a
                          href={`https://melhorrastreio.com.br/rastreio/${trackingCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          <span>Rastrear no Melhor Rastreio</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleSendTrackingViaWhatsApp}
                          className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Share2 size={12} />
                          <span>Notificar WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 3. PRODUTOS COMPRADOS & RESUMO FINANCEIRO */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <FileText size={18} className="text-indigo-600" />
                <span>Itens Adquiridos no Pedido</span>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                {order.items?.length || 1} {order.items?.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {(order.items && order.items.length > 0 ? order.items : [
                {
                  id: order.id,
                  name: order.product_name || 'Produto da Loja',
                  price: order.amount,
                  quantity: 1,
                  delivery_url: order.delivery_url,
                  is_digital: Boolean(order.delivery_url),
                }
              ]).map((item, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-500">
                          {item.quantity}x de R$ {Number(item.price).toFixed(2).replace('.', ',')}
                        </span>
                        {item.is_digital && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">
                            Digital
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                    <span className="text-xs sm:text-sm font-black text-gray-900">
                      R$ {(Number(item.price) * (item.quantity || 1)).toFixed(2).replace('.', ',')}
                    </span>

                    {item.delivery_url && (
                      <a
                        href={item.delivery_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Acessar link digital do produto"
                      >
                        <ExternalLink size={12} />
                        <span>Link de Download</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* TOTALIZADOR */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal dos Produtos:</span>
                <span>R$ {Number(order.amount).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Custo de Envio (Frete):</span>
                <span>
                  {order.shipping_cost && order.shipping_cost > 0
                    ? `+ R$ ${Number(order.shipping_cost).toFixed(2).replace('.', ',')}`
                    : 'Grátis / Não se aplica'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Geral Pago:</span>
                <span className="text-base text-emerald-700 font-mono">
                  R$ {(Number(order.amount) + Number(order.shipping_cost || 0)).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* 4. ANOTAÇÕES INTERNAS DO LOJISTA */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-slate-600" />
                <span>Anotações Internas (Visível apenas para o Administrador)</span>
              </span>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                <span>Salvar Nota</span>
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Embalado em 16/09 com brinde especial. Coleta solicitada nos Correios..."
              rows={2}
              className="w-full text-xs p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 text-gray-800 resize-none"
            />
            {notesSuccess && (
              <span className="text-[10px] text-emerald-600 font-bold block animate-in fade-in">
                ✓ Anotação salva com sucesso!
              </span>
            )}
          </div>

        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-mono">
            {order.payment_id ? `ID Transação: ${order.payment_id}` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
