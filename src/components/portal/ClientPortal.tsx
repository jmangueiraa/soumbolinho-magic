import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  HelpCircle, 
  Store as StoreIcon, 
  KeyRound, 
  Sparkles, 
  MessageCircle, 
  Copy, 
  Check, 
  Loader2, 
  ArrowRight, 
  FileText,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AJP_OFFICIAL_LOGO_BASE64 } from '../../assets/officialLogo';
import { formatCurrency } from '../../utils/formatters';

export interface ClientPortalProps {
  initialTab?: 'pedidos' | 'arquivos' | 'lojista' | 'ajuda';
}

interface OrderResult {
  id: string;
  store_id?: string;
  created_at: string;
  status: string;
  total: number;
  items?: any[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  tracking_code?: string;
  payment_method?: string;
  shipping_address?: any;
  delivery_url?: string;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ initialTab = 'pedidos' }) => {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'arquivos' | 'lojista' | 'ajuda'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

  // Lojista Search / Redirection
  const [storeSlugInput, setStoreSlugInput] = useState('');

  useEffect(() => {
    document.title = 'Portal do Cliente | AJPSTORE';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchOrders = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    setIsSearching(true);
    setSearched(true);

    try {
      // Busca ampla por id exato, email parcial/exato ou telefone
      const cleanPhone = term.replace(/\D/g, '');
      
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (cleanPhone.length >= 8) {
        query = query.or(`customer_phone.ilike.%${cleanPhone}%,customer_email.ilike.%${term}%,id.ilike.%${term}%,tracking_code.ilike.%${term}%`);
      } else {
        query = query.or(`customer_email.ilike.%${term}%,id.ilike.%${term}%,tracking_code.ilike.%${term}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.warn('[ClientPortal] Erro na busca de pedidos:', error);
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.warn('[ClientPortal] Falha inesperada ao consultar pedidos:', err);
      setOrders([]);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrackingId(id);
    setTimeout(() => setCopiedTrackingId(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'paid' || s === 'pago' || s === 'approved' || s === 'aprovado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Pagamento Aprovado</span>
        </span>
      );
    }
    if (s === 'shipped' || s === 'enviado' || s === 'in_transit') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Truck className="w-3.5 h-3.5" />
          <span>A Caminho / Enviado</span>
        </span>
      );
    }
    if (s === 'delivered' || s === 'entregue') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Package className="w-3.5 h-3.5" />
          <span>Entregue</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3.5 h-3.5" />
        <span>Aguardando Pagamento</span>
      </span>
    );
  };

  // Coleta todos os arquivos digitais liberados
  const digitalFilesList = orders
    .filter(o => {
      const s = (o.status || '').toLowerCase().trim();
      return s === 'paid' || s === 'pago' || s === 'approved' || s === 'aprovado' || s === 'delivered';
    })
    .flatMap(o => {
      const list: Array<{ title: string; url: string; orderId: string; date: string }> = [];
      if (o.delivery_url) {
        list.push({
          title: `Arquivos do Pedido #${o.id.slice(0, 8)}`,
          url: o.delivery_url,
          orderId: o.id,
          date: o.created_at,
        });
      }
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const dUrl = item.delivery_url || item.deliveryUrl || item.product?.delivery_url || item.product?.deliveryUrl;
          if (dUrl) {
            list.push({
              title: item.name || item.title || 'Arquivo Digital',
              url: dUrl,
              orderId: o.id,
              date: o.created_at,
            });
          }
        });
      }
      return list;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-[#FF1493] selection:text-white font-sans flex flex-col">
      {/* 1. Header do Portal */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="https://ajpstore.com.br" className="flex items-center gap-2.5 group">
              <img 
                src={AJP_OFFICIAL_LOGO_BASE64 || '/ajpstore-logo.png'} 
                alt="AJPSTORE Logo" 
                className="w-9 h-9 object-contain rounded-xl shadow-md group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="font-black text-base tracking-tight text-white block leading-tight">
                  AJP<span className="text-[#FF1493]">STORE</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                  Portal do Cliente
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ambiente Seguro</span>
            </div>
            <a 
              href="https://ajpstore.com.br"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Voltar ao Início
            </a>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'pedidos'
                ? 'bg-gradient-to-r from-[#FF1493] to-purple-600 text-white shadow-md shadow-[#FF1493]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Meus Pedidos & Rastreamento</span>
          </button>

          <button
            onClick={() => setActiveTab('arquivos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'arquivos'
                ? 'bg-gradient-to-r from-[#FF1493] to-purple-600 text-white shadow-md shadow-[#FF1493]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Arquivos Digitais</span>
            {digitalFilesList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-slate-950 text-[10px] font-black flex items-center justify-center">
                {digitalFilesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('lojista')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'lojista'
                ? 'bg-gradient-to-r from-[#FF1493] to-purple-600 text-white shadow-md shadow-[#FF1493]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Acesso Lojista (Painel da Loja)</span>
          </button>

          <button
            onClick={() => setActiveTab('ajuda')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'ajuda'
                ? 'bg-gradient-to-r from-[#FF1493] to-purple-600 text-white shadow-md shadow-[#FF1493]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Atendimento & Suporte</span>
          </button>
        </div>
      </header>

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ABA 1: MEUS PEDIDOS & RASTREAMENTO */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Bloco de Busca */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF1493] to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-[#FF1493]/25 mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Consulte e Rastreie seu Pedido
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Digite o seu <strong>e-mail</strong>, <strong>WhatsApp</strong> ou <strong>código do pedido</strong> para acompanhar a entrega e downloads.
              </p>

              <form onSubmit={handleSearchOrders} className="mt-6 flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ex: seuemail@gmail.com ou (11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1493] focus:ring-1 focus:ring-[#FF1493] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchTerm.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-[#FF1493] to-purple-600 hover:from-[#e01282] hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#FF1493]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Buscar</span>
                </button>
              </form>
            </div>

            {/* Resultados da Busca */}
            {searched && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-200">
                    {orders.length === 0 ? 'Nenhum pedido localizado' : `Pedidos encontrados (${orders.length})`}
                  </h2>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                    <h3 className="text-base font-bold text-white">Não encontramos pedidos com esses dados</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Verifique se digitou o e-mail ou telefone idêntico ao informado na finalização da compra, ou fale com o nosso atendimento no WhatsApp.
                    </p>
                    <a
                      href="https://wa.me/5511999999999?text=Ol%C3%A1%2C+preciso+de+ajuda+para+localizar+meu+pedido"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl mt-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Falar com o Suporte</span>
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {orders.map((order) => {
                      const isPaid = ['paid', 'pago', 'approved', 'aprovado', 'delivered'].includes((order.status || '').toLowerCase().trim());
                      const deliveryUrl = order.delivery_url;

                      return (
                        <div 
                          key={order.id} 
                          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 hover:border-slate-700 transition-all shadow-lg"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">Pedido</span>
                                <span className="text-sm font-black text-white font-mono">#{order.id.slice(0, 10)}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {getStatusBadge(order.status)}
                            </div>
                          </div>

                          {/* Dados do Cliente e Valor */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 text-xs">
                            <div>
                              <span className="text-slate-500 block font-medium">Cliente:</span>
                              <span className="text-slate-200 font-semibold">{order.customer_name || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">E-mail:</span>
                              <span className="text-slate-200 font-semibold">{order.customer_email || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">Total Pago:</span>
                              <span className="text-emerald-400 font-black text-sm">{formatCurrency(order.total || 0)}</span>
                            </div>
                          </div>

                          {/* Código de Rastreamento (se houver) */}
                          {order.tracking_code && (
                            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5">
                                <Truck className="w-4 h-4 text-blue-400" />
                                <div>
                                  <span className="text-blue-200 font-bold block">Código de Rastreamento:</span>
                                  <span className="font-mono text-white text-sm font-black tracking-wider">{order.tracking_code}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyToClipboard(order.tracking_code!, order.id)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  {copiedTrackingId === order.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedTrackingId === order.id ? 'Copiado!' : 'Copiar'}</span>
                                </button>
                                <a
                                  href={`https://rastreamento.correios.com.br/app/index.php?codigo=${order.tracking_code}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                  <span>Rastrear</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Arquivos Digitais Disponíveis para Download */}
                          {isPaid && deliveryUrl && (
                            <div className="p-4 bg-gradient-to-r from-purple-900/30 to-[#FF1493]/20 border border-[#FF1493]/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#FF1493]/20 text-[#FF1493] flex items-center justify-center">
                                  <Download className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white">Arquivos Digitais Liberados</h4>
                                  <p className="text-[11px] text-slate-300">Seus moldes, artes e arquivos comprados já estão prontos para download.</p>
                                </div>
                              </div>
                              <a
                                href={deliveryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gradient-to-r from-[#FF1493] to-purple-600 hover:from-[#e01282] hover:to-purple-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <span>Acessar Arquivos</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                          {/* Itens do Pedido */}
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <span className="text-xs font-bold text-slate-400 block">Itens do Pedido:</span>
                              <div className="space-y-1.5">
                                {order.items.map((it: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-950/40 rounded-lg border border-slate-800/40">
                                    <span className="text-slate-300 font-medium">
                                      {it.quantity || 1}x {it.name || it.title || 'Produto'}
                                    </span>
                                    <span className="text-slate-400 font-mono">
                                      {formatCurrency((it.price || it.unit_price || 0) * (it.quantity || 1))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: ARQUIVOS DIGITAIS */}
        {activeTab === 'arquivos' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Seus Arquivos Digitais</h2>
                  <p className="text-xs text-slate-400">Acesse e baixe os arquivos digitais de todas as suas compras aprovadas.</p>
                </div>
              </div>

              {digitalFilesList.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Nenhum arquivo digital carregado ainda</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Faça uma busca na aba <strong>Meus Pedidos</strong> com seu e-mail para localizar e carregar automaticamente seus links de download.
                  </p>
                  <button
                    onClick={() => setActiveTab('pedidos')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Ir para Busca de Pedidos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {digitalFilesList.map((file, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{file.title}</h4>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Liberado em {new Date(file.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF1493] to-purple-600 hover:from-[#e01282] hover:to-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: ACESSO LOJISTA (PAINEL DA LOJA) */}
        {activeTab === 'lojista' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/25">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white">Acesso do Lojista</h2>
                <p className="text-xs text-slate-400">
                  Gerencie produtos, pedidos, catálogo e configurações da sua loja AJPSTORE.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nome ou Subdomínio da sua Loja:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={storeSlugInput}
                      onChange={(e) => setStoreSlugInput(e.target.value.toLowerCase().trim())}
                      placeholder="Ex: sualoja"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <a
                      href={storeSlugInput ? `https://${storeSlugInput}.ajpstore.com.br/admin` : '/admin'}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                    >
                      <span>Acessar Painel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Destino: {storeSlugInput ? `https://${storeSlugInput}.ajpstore.com.br/admin` : '/admin'}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
                  <a
                    href="/admin"
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>Login Administrativo Direto</span>
                  </a>

                  <a
                    href="https://ajpstore.com.br/#criar-loja"
                    className="w-full py-2.5 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 text-xs font-bold text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Ainda não tem loja? Crie grátis por 7 dias</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: ATENDIMENTO & SUPORTE */}
        {activeTab === 'ajuda' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white">Central de Atendimento</h2>
                <p className="text-xs text-slate-400">
                  Dúvidas sobre seu pedido, entrega ou pagamento? Estamos prontos para ajudar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="https://wa.me/5511999999999?text=Ol%C3%A1%2C+preciso+de+ajuda+com+meu+pedido+na+AJPSTORE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl flex flex-col justify-between space-y-3 transition-colors group"
                >
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">WhatsApp Oficial</span>
                    <p className="text-xs text-slate-300 mt-1">Fale direto com um de nossos atendentes no WhatsApp.</p>
                  </div>
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Iniciar Conversa &rarr;
                  </span>
                </a>

                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-200 block">Horário de Atendimento</span>
                  <p className="text-xs text-slate-400">Segunda a Sábado, das 09:00 às 18:00 (Horário de Brasília).</p>
                  <span className="text-[11px] text-slate-500 block">Mensagens enviadas fora do horário são respondidas no próximo dia útil.</span>
                </div>
              </div>

              {/* Dúvidas Frequentes Rápidas */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white">Perguntas Frequentes:</h3>
                
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                    <strong className="text-slate-200 block mb-1">Como recebo os produtos digitais?</strong>
                    <span className="text-slate-400">Assim que o pagamento via Pix ou Cartão for aprovado, o link de acesso aos arquivos é liberado nesta página e também enviado ao seu WhatsApp/e-mail.</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                    <strong className="text-slate-200 block mb-1">Como acompanhar o rastreio de produtos físicos?</strong>
                    <span className="text-slate-400">Assim que seu pedido for despachado nos Correios ou transportadora, o código de rastreamento aparecerá na aba "Meus Pedidos & Rastreamento".</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Rodapé Oficial */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4">
          <p>© {new Date().getFullYear()} AJPSTORE — Todos os direitos reservados.</p>
          <p className="text-[11px] text-slate-600 mt-1">Plataforma Multi-Tenant para E-commerce e Produtos Digitais.</p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortal;
