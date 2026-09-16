import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Percent, 
  DollarSign, 
  Copy, 
  Check, 
  Trash2, 
  Flame, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Share2, 
  RefreshCw, 
  Gift, 
  Zap, 
  Tag
} from 'lucide-react';
import { Coupon } from '../../types';
import { useTenant } from '../../context/TenantContext';
import { 
  fetchAllCoupons, 
  createCoupon, 
  deleteCoupon, 
  toggleCouponStatus,
  DEFAULT_INITIAL_COUPONS
} from '../../services/couponService';
import { formatCurrency } from '../../utils/formatters';

export const CouponsManager: React.FC = () => {
  const { currentStore } = useTenant();
  const currentStoreId = currentStore?.id || 'suamarcaaqui';

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [minOrderValue, setMinOrderValue] = useState<string>('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const { data } = await fetchAllCoupons(currentStoreId);
      setCoupons(data);
    } catch (err) {
      console.error('[CouponsManager] Erro ao carregar cupons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [currentStoreId]);

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('10');
    setMinOrderValue('');
    setMaxUses('');
    setExpiresAt('');
    setDescription('');
    setFormError(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleQuickTemplate = (template: {
    code: string;
    type: 'percentage' | 'fixed';
    val: string;
    min?: string;
    desc: string;
  }) => {
    setCode(template.code);
    setDiscountType(template.type);
    setDiscountValue(template.val);
    setMinOrderValue(template.min || '');
    setDescription(template.desc);
    setIsModalOpen(true);
  };

  const handleGenerateRandomCode = () => {
    const prefixes = ['PROMO', 'OFERTA', 'QUEIMA', 'FESTA', 'DESCONTO'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${num}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      setFormError('Informe o código do cupom (ex: PROMO10).');
      return;
    }

    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Informe um valor de desconto válido maior que zero.');
      return;
    }

    if (discountType === 'percentage' && val > 100) {
      setFormError('O desconto em porcentagem não pode ultrapassar 100%.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCoupon({
        store_id: currentStoreId,
        code: cleanCode,
        discount_type: discountType,
        discount_value: val,
        min_order_value: minOrderValue ? Number(minOrderValue) : 0,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
        description: description.trim() || undefined,
        is_active: true,
      });

      if (res.error) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        resetForm();
        loadCoupons();
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar cupom.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    await toggleCouponStatus(coupon.id, coupon.is_active, currentStoreId);
    loadCoupons();
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cupom "${coupon.code}"?`)) return;
    await deleteCoupon(coupon.id, currentStoreId);
    loadCoupons();
  };

  const handleCopyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCopyPromoLink = (couponCode: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/checkout?cupom=${couponCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(couponCode);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Estatísticas
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => {
    const isExpired = c.expires_at ? new Date(c.expires_at).getTime() < Date.now() : false;
    return c.is_active && !isExpired;
  }).length;
  const totalUses = coupons.reduce((acc, c) => acc + (c.uses_count || 0), 0);

  return (
    <div className="space-y-6 font-sans text-gray-800 animate-in fade-in duration-300">
      
      {/* 1. CABEÇALHO */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-gray-900">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-xl inline-flex items-center justify-center">
              <Ticket size={24} />
            </span>
            Cupons
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie descontos e promoções</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCoupons}
            disabled={isLoading}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={handleOpenModal}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 text-sm cursor-pointer active:scale-98"
          >
            <Plus size={18} /> Novo Cupom
          </button>
        </div>
      </header>

      {/* 2. MÉTRICAS EM GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* TOTAL */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
            <Ticket size={22} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">TOTAL</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{totalCoupons}</p>
          </div>
        </div>

        {/* ATIVOS */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">ATIVOS</p>
            <p className="text-2xl font-bold text-green-700 leading-tight">{activeCoupons}</p>
          </div>
        </div>

        {/* USADOS */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">USADOS</p>
            <p className="text-2xl font-bold text-purple-700 leading-tight">{totalUses}</p>
          </div>
        </div>
      </div>

      {/* 3. CRIAR EM 1 CLIQUE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Zap size={16} className="text-amber-500" />
            Criar em 1 Clique
          </h2>
          <span className="text-xs text-gray-400 font-medium">Modelos prontos para aplicar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: LANCAMENTO20 */}
          <button
            type="button"
            onClick={() => handleQuickTemplate({
              code: 'LANCAMENTO20',
              type: 'percentage',
              val: '20',
              desc: 'Campanha de lançamento geral (20% OFF)'
            })}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                  20% OFF
                </span>
                <Zap size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-mono font-bold text-sm text-gray-900">LANCAMENTO20</p>
              <p className="text-xs text-gray-500 mt-1">Campanha de lançamento geral</p>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-3 flex items-center gap-1">
              Usar modelo &rarr;
            </span>
          </button>

          {/* Card 2: QUEIMATUDO */}
          <button
            type="button"
            onClick={() => handleQuickTemplate({
              code: 'QUEIMATUDO',
              type: 'fixed',
              val: '15',
              min: '50',
              desc: 'Queima de estoque (R$ 15 OFF acima de R$ 50)'
            })}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                  R$ 15 OFF
                </span>
                <Flame size={16} className="text-orange-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-mono font-bold text-sm text-gray-900">QUEIMATUDO</p>
              <p className="text-xs text-gray-500 mt-1">Acima de R$ 50 em compras</p>
            </div>
            <span className="text-[11px] text-orange-600 font-semibold mt-3 flex items-center gap-1">
              Usar modelo &rarr;
            </span>
          </button>

          {/* Card 3: PRIMEIRACOMPRA */}
          <button
            type="button"
            onClick={() => handleQuickTemplate({
              code: 'PRIMEIRACOMPRA',
              type: 'percentage',
              val: '10',
              desc: 'Boas-vindas primeira compra (10% OFF)'
            })}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                  10% OFF
                </span>
                <Gift size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-mono font-bold text-sm text-gray-900">PRIMEIRACOMPRA</p>
              <p className="text-xs text-gray-500 mt-1">Boas-vindas para novos clientes</p>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-3 flex items-center gap-1">
              Usar modelo &rarr;
            </span>
          </button>
        </div>
      </div>

      {/* 4. CUPONS CADASTRADOS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Ticket size={16} className="text-blue-600" />
            Cupons Cadastrados
          </h2>
          <span className="text-xs text-gray-500 font-medium bg-white border border-gray-100 shadow-2xs px-2.5 py-0.5 rounded-full">
            {coupons.length} {coupons.length === 1 ? 'cupom' : 'cupons'}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Ticket className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Nenhum cupom cadastrado ainda
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Crie seu primeiro cupom para atrair clientes do WhatsApp e redes sociais com descontos exclusivos.
              </p>
              <button
                onClick={handleOpenModal}
                className="mt-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Criar Primeiro Cupom</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {coupons.map((coupon) => {
                const isExpired = coupon.expires_at ? new Date(coupon.expires_at).getTime() < Date.now() : false;
                const isItemActive = coupon.is_active && !isExpired;

                return (
                  <div 
                    key={coupon.id} 
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                  >
                    {/* LADO ESQUERDO: Código, Desconto, Detalhes */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1 rounded-xl font-mono font-bold text-xs tracking-wider shadow-2xs">
                          <span>{coupon.code}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1.5 hover:bg-gray-200/80 rounded-lg text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                          title="Copiar código"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Badge de Desconto */}
                        {coupon.discount_type === 'percentage' ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <Percent className="w-3 h-3" />
                            <span>{coupon.discount_value}% OFF</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <DollarSign className="w-3 h-3" />
                            <span>R$ {coupon.discount_value.toFixed(2).replace('.', ',')} OFF</span>
                          </span>
                        )}

                        {/* Status tag com alternância */}
                        <button
                          type="button"
                          onClick={() => handleToggle(coupon)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                            isItemActive
                              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title="Clique para alternar status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isItemActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                          <span>{isItemActive ? 'Ativo' : isExpired ? 'Expirado' : 'Pausado'}</span>
                        </button>
                      </div>

                      {/* Descrição & Metadados */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                        {coupon.description && (
                          <span className="text-gray-700 font-medium">{coupon.description}</span>
                        )}

                        {coupon.min_order_value && coupon.min_order_value > 0 ? (
                          <span>Mínimo: R$ {coupon.min_order_value.toFixed(2).replace('.', ',')}</span>
                        ) : (
                          <span>Sem valor mínimo</span>
                        )}

                        <span>
                          {coupon.uses_count || 0} {coupon.uses_count === 1 ? 'uso' : 'usos'}
                          {coupon.max_uses ? ` (limite: ${coupon.max_uses})` : ' (ilimitado)'}
                        </span>

                        {coupon.expires_at ? (
                          <span className={`inline-flex items-center gap-1 ${isExpired ? 'text-red-600 font-bold' : ''}`}>
                            <Clock className="w-3 h-3" />
                            Válido até {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span>Sem validade</span>
                        )}
                      </div>
                    </div>

                    {/* LADO DIREITO: Ações */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Botão Copiar Link Promo */}
                      <button
                        type="button"
                        onClick={() => handleCopyPromoLink(coupon.code)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copiar link com cupom aplicado automaticamente no checkout"
                      >
                        {copiedLink === coupon.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Link Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-gray-500" />
                            <span>Link Promo</span>
                          </>
                        )}
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                        title="Excluir cupom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                  <Ticket size={20} />
                </span>
                <h3 className="font-bold text-base text-gray-900">
                  Criar Cupom de Desconto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Código do Cupom */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Código do Cupom:
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Gerar Aleatório
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="EX: PROMO10, QUEIMA50"
                  className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase tracking-wider"
                />
              </div>

              {/* Tipo de Desconto (% ou R$) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tipo de Desconto:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      discountType === 'percentage'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Porcentagem (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      discountType === 'fixed'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Valor Fixo (R$)</span>
                  </button>
                </div>
              </div>

              {/* Valor do Desconto */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {discountType === 'percentage' ? 'Porcentagem de Desconto (%):' : 'Valor do Desconto (R$):'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-xs">
                    {discountType === 'percentage' ? '%' : 'R$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={discountType === 'percentage' ? 100 : 9999}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'Ex: 15' : 'Ex: 25.00'}
                    className="w-full text-sm font-bold pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Compra Mínima e Limite de Usos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Compra Mínima (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    placeholder="0 = Sem mínimo"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Limite de Usos:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Vazio = Ilimitado"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Data de Validade */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Válido até (opcional):
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>

              {/* Descrição Interna */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Descrição ou Observação (opcional):
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Cupom especial para grupo VIP do WhatsApp"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botões do Modal */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Cupom'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default CouponsManager;

