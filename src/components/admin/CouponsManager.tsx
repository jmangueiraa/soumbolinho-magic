import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Percent, 
  DollarSign, 
  Copy, 
  Check, 
  Trash2, 
  Power, 
  Flame, 
  Sparkles, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink,
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
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalUses = coupons.reduce((acc, c) => acc + (c.uses_count || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-theme-primary flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cupons de Desconto & Promoções
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gere cupons por porcentagem ou valor fixo em R$ para impulsionar lançamentos e queima de estoque.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCoupons}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenModal}
            className="px-4 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 text-theme-primary" />
            <span>Criar Novo Cupom</span>
          </button>
        </div>
      </div>

      {/* 2. Modelos Prontos de Campanha (1-Clique) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => handleQuickTemplate({
            code: 'LANCAMENTO20',
            type: 'percentage',
            val: '20',
            desc: 'Campanha de Lançamento (20% OFF)'
          })}
          className="p-4 rounded-3xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-pink-200/80 text-left hover:border-pink-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
              Campanha de Lançamento
            </span>
            <Zap className="w-4 h-4 text-theme-primary group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="font-black text-sm text-slate-900">20% de Desconto</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Clique para criar o cupom <strong>LANCAMENTO20</strong> em 1 clique.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTemplate({
            code: 'QUEIMATUDO',
            type: 'fixed',
            val: '15',
            min: '50',
            desc: 'Queima de Estoque (R$ 15 OFF acima de R$ 50)'
          })}
          className="p-4 rounded-3xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200/80 text-left hover:border-orange-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              Queima de Estoque
            </span>
            <Flame className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="font-black text-sm text-slate-900">R$ 15,00 OFF</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Clique para criar o cupom <strong>QUEIMATUDO</strong> para pedidos a partir de R$ 50.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTemplate({
            code: 'PRIMEIRACOMPRA',
            type: 'percentage',
            val: '10',
            desc: 'Boas-Vindas Primeira Compra (10% OFF)'
          })}
          className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 text-left hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Boas-Vindas
            </span>
            <Gift className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="font-black text-sm text-slate-900">10% OFF Primeira Compra</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Clique para criar o cupom <strong>PRIMEIRACOMPRA</strong> para novos clientes.
          </p>
        </button>
      </div>

      {/* 3. Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-pink-50 text-theme-primary flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total de Cupons</span>
            <span className="text-2xl font-black text-slate-900">{totalCoupons}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Cupons Ativos</span>
            <span className="text-2xl font-black text-emerald-700">{activeCoupons}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Vezes Utilizados</span>
            <span className="text-2xl font-black text-purple-700">{totalUses}</span>
          </div>
        </div>
      </div>

      {/* 4. Tabela / Grid de Cupons */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              Cupons Cadastrados na Loja
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {coupons.length} {coupons.length === 1 ? 'cupom' : 'cupons'}
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-pink-50 text-theme-primary flex items-center justify-center mx-auto">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Nenhum cupom cadastrado ainda
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Crie seu primeiro cupom para atrair clientes do WhatsApp e redes sociais com descontos exclusivos.
            </p>
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-theme-primary" />
              <span>Criar Primeiro Cupom</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Código do Cupom</th>
                  <th className="py-3 px-4">Desconto</th>
                  <th className="py-3 px-4">Compra Mínima</th>
                  <th className="py-3 px-4">Utilizações</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expires_at ? new Date(coupon.expires_at).getTime() < Date.now() : false;

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Código com estilo Ticket */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-white tracking-wider border border-dashed border-slate-700">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copiar código"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate max-w-xs">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      {/* Desconto */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {coupon.discount_type === 'percentage' ? (
                          <span className="inline-flex items-center gap-1 text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md">
                            <Percent className="w-3 h-3" />
                            <span>{coupon.discount_value}% OFF</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <DollarSign className="w-3 h-3" />
                            <span>R$ {coupon.discount_value.toFixed(2).replace('.', ',')} OFF</span>
                          </span>
                        )}
                      </td>

                      {/* Compra Mínima */}
                      <td className="py-3.5 px-4">
                        {coupon.min_order_value && coupon.min_order_value > 0 ? (
                          <span>R$ {coupon.min_order_value.toFixed(2).replace('.', ',')}</span>
                        ) : (
                          <span className="text-slate-400">Sem mínimo</span>
                        )}
                      </td>

                      {/* Utilizações */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{coupon.uses_count || 0}</span>
                        {coupon.max_uses ? (
                          <span className="text-slate-400"> / {coupon.max_uses} max</span>
                        ) : (
                          <span className="text-slate-400"> (ilimitado)</span>
                        )}
                      </td>

                      {/* Validade */}
                      <td className="py-3.5 px-4">
                        {coupon.expires_at ? (
                          <span className={`inline-flex items-center gap-1 ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                            {isExpired && ' (Expirado)'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sem validade</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(coupon)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            coupon.is_active && !isExpired
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${coupon.is_active && !isExpired ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{coupon.is_active && !isExpired ? 'Ativo' : 'Inativo'}</span>
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copiar Link Promocional */}
                          <button
                            type="button"
                            onClick={() => handleCopyPromoLink(coupon.code)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copiar link com cupom já aplicado"
                          >
                            {copiedLink === coupon.code ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3 h-3 text-slate-500" />
                                <span>Link Promo</span>
                              </>
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDelete(coupon)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir cupom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal de Criação de Cupom */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-theme-primary" />
                <h3 className="font-black text-base text-slate-900">
                  Criar Cupom de Desconto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Código do Cupom */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Código do Cupom:
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="text-[11px] font-bold text-theme-primary hover:underline cursor-pointer"
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
                  className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary outline-none uppercase"
                />
              </div>

              {/* Tipo de Desconto (% ou R$) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Desconto:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      discountType === 'percentage'
                        ? 'bg-pink-50 border-pink-500 text-theme-primary shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Porcentagem (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      discountType === 'fixed'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Valor Fixo (R$)</span>
                  </button>
                </div>
              </div>

              {/* Valor do Desconto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {discountType === 'percentage' ? 'Porcentagem de Desconto (%):' : 'Valor do Desconto (R$):'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">
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
                    className="w-full text-sm font-bold pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary outline-none"
                  />
                </div>
              </div>

              {/* Compra Mínima e Limite de Usos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Compra Mínima (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    placeholder="0 = Sem mínimo"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Limite de Usos:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Vazio = Ilimitado"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                </div>
              </div>

              {/* Data de Validade */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Válido até (opcional):
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-theme-primary"
                />
              </div>

              {/* Descrição Interna */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição ou Observação (opcional):
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Cupom especial para grupo VIP do WhatsApp"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-theme-primary"
                />
              </div>

              {/* Botões do Modal */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
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
