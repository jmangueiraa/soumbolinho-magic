import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Store as StoreIcon, 
  Globe, 
  Mail, 
  User, 
  KeyRound, 
  CopyCheck, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  CreditCard, 
  Calendar,
  MessageCircle,
  Instagram,
  MapPin,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Sliders,
  Crown
} from 'lucide-react';
import { createStoreWithClient } from '../../services/storeManagementService';
import { Store } from '../../types';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreCreated: (newStore: Store) => void;
  stores?: Store[];
}

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onStoreCreated,
  stores,
}) => {
  const matrizStore = stores?.find(
    (s) => Boolean(s.is_matriz) || s.slug === 'ajpstore' || s.id === 'store_ajpstore'
  ) || stores?.find((s) => s.slug === 'suamarcaaqui') || stores?.[0];
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    storeName: 'suamarcaaqui',
    slogan: 'subtitulo da sua loja',
    whatsappNumber: 'SeuWhatsApp',
    whatsappDisplay: 'SeuWhatsAppWhatsApp',
    instagram: 'suamarcaaqui',
    address: 'seuendereço',
    workingHours: 'SEMPRE ABERTO',
    customDomain: 'seudominio',
    mpAccessToken: '',
    telegramBotToken: '',
    telegramChatId: '',
    password: 'admin',
    cloneCatalog: true,
    monthlyFee: '50,00',
    initialDays: '30',
  });

  const [showIntegrations, setShowIntegrations] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resolvedStoreName = formData.storeName.trim() || 'suamarcaaqui';

    if (!formData.clientName.trim() || !formData.clientEmail.trim()) {
      setError('Preencha os campos obrigatórios (Nome do Cliente e E-mail).');
      return;
    }

    // Normaliza domínio (remove https://, http://, barras finais)
    let domainFormatted = formData.customDomain.trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

    // Se o cliente colocou domínio sem www e não é subdomínio nem 'seudominio', sugere/aplica www
    if (domainFormatted && domainFormatted !== 'seudominio' && !domainFormatted.startsWith('www.') && domainFormatted.split('.').length === 2) {
      domainFormatted = `www.${domainFormatted}`;
    }

    setIsLoading(true);

    try {
      const { store, error: createError } = await createStoreWithClient({
        clientName: formData.clientName.trim(),
        clientEmail: formData.clientEmail.trim().toLowerCase(),
        storeName: resolvedStoreName,
        slogan: formData.slogan.trim() || 'subtitulo da sua loja',
        whatsappNumber: formData.whatsappNumber.trim() || 'SeuWhatsApp',
        whatsappDisplay: formData.whatsappDisplay.trim() || 'SeuWhatsAppWhatsApp',
        instagram: formData.instagram.trim() || 'suamarcaaqui',
        address: formData.address.trim() || 'seuendereço',
        workingHours: formData.workingHours.trim() || 'SEMPRE ABERTO',
        customDomain: domainFormatted || undefined,
        mpAccessToken: formData.mpAccessToken.trim() || undefined,
        telegramBotToken: formData.telegramBotToken.trim() || undefined,
        telegramChatId: formData.telegramChatId.trim() || undefined,
        clientPassword: formData.password.trim() || 'admin',
        cloneBaseCatalog: formData.cloneCatalog,
        sourceMatrizStoreId: matrizStore?.id || matrizStore?.slug || 'ajpstore',
        monthlyFee: parseFloat(formData.monthlyFee.replace(',', '.')) || 50.00,
        initialDays: parseInt(formData.initialDays) || 7,
      });

      if (createError || !store) {
        setError(createError || 'Erro ao criar nova loja. Tente novamente.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onStoreCreated(store);
      onClose();
    } catch (err: any) {
      console.error('Erro ao cadastrar loja:', err);
      setError(err?.message || 'Erro inesperado ao criar loja.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF1493] to-pink-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-[#FF1493]/20">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Cadastrar Nova Loja & Cliente
            </h2>
            <p className="text-xs text-slate-500">
              Crie uma nova loja com dados padrão pré-preenchidos e catálogo sincronizado
            </p>
          </div>
        </div>

        {/* Banner Loja Matriz a ser Clonada */}
        <div className="mb-4 p-3 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/80 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF1493] to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Crown className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                Loja Matriz a ser Clonada:
              </span>
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                {matrizStore?.name || matrizStore?.store_name || 'AJPSTORE'}
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                  Matriz Ativa
                </span>
              </span>
            </div>
          </div>
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            ✓ Catálogo Pronto
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SEÇÃO 1: DADOS DO CLIENTE & ACESSO */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-[#FF1493]" />
              Dados do Cliente & Acesso
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Cliente: *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Ex: Maria Souza"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail do Cliente: *
                </label>
                <input
                  type="email"
                  required
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="maria@email.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#FF1493]" />
                  Senha Inicial:
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="admin"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493] font-mono"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: IDENTIDADE DA LOJA */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <StoreIcon className="w-3.5 h-3.5 text-[#FF1493]" />
              Identidade da Loja
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="store_name_input" className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Loja: *
                </label>
                <input
                  id="store_name_input"
                  name="storeName"
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Nome da Loja do Cliente"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493] font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Slogan / Subtítulo:
                </label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="subtitulo da sua loja"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Instagram className="w-3 h-3 text-[#FF1493]" />
                  Instagram:
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="suamarcaaqui"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: WHATSAPP DE RECEBIMENTO */}
          <div className="p-4 bg-pink-50/50 border border-pink-200/60 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-[#FF1493] flex items-center gap-1.5 uppercase tracking-wider">
              <MessageCircle className="w-3.5 h-3.5 text-[#FF1493]" />
              WhatsApp de Recebimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número (DDI e DDD):
                </label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="SeuWhatsApp"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493] font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ex: SeuWhatsApp ou número numérico com DDD
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exibição Visual do Telefone:
                </label>
                <input
                  type="text"
                  value={formData.whatsappDisplay}
                  onChange={(e) => setFormData({ ...formData, whatsappDisplay: e.target.value })}
                  placeholder="SeuWhatsAppWhatsApp"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493] font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Formato exibido no rodapé e cabeçalho da loja
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: ENDEREÇO E ATENDIMENTO */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#FF1493]" />
              Endereço e Atendimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço do Ateliê:
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="seuendereço"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FF1493]" />
                  Horário de Funcionamento:
                </label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  placeholder="SEMPRE ABERTO"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: DOMÍNIO E INTEGRAÇÕES */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-[#FF1493]" />
              Domínio & Integrações
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Endereço do Domínio:
              </label>
              <input
                type="text"
                value={formData.customDomain}
                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                placeholder="seudominio"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Valor padrão: <code className="text-slate-700 font-bold">seudominio</code> (ou insira domínio próprio como www.sualoja.com.br).
              </span>
            </div>

            {/* Toggle Integrações (Mercado Pago & Telegram) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowIntegrations(!showIntegrations)}
                className="text-xs font-bold text-[#FF1493] hover:text-pink-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configurar Mercado Pago & Bot do Telegram (Opcional)</span>
                {showIntegrations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showIntegrations && (
                <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-purple-600" />
                      Mercado Pago Access Token:
                    </label>
                    <input
                      type="password"
                      value={formData.mpAccessToken}
                      onChange={(e) => setFormData({ ...formData, mpAccessToken: e.target.value })}
                      placeholder="APP_USR-xxxx... (deixe vazio para configurar depois)"
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Send className="w-3 h-3 text-sky-500" />
                        Bot do Telegram (Token):
                      </label>
                      <input
                        type="password"
                        value={formData.telegramBotToken}
                        onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                        placeholder="Token do bot ou vazio"
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Send className="w-3 h-3 text-sky-500" />
                        Bot do Telegram (Chat ID):
                      </label>
                      <input
                        type="text"
                        value={formData.telegramChatId}
                        onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                        placeholder="Chat ID ou vazio"
                        className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 6: MENSALIDADE E ATIVAÇÃO INICIAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                Valor da Mensalidade (R$):
              </label>
              <input
                type="text"
                value={formData.monthlyFee}
                onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                placeholder="50,00"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Período Inicial / Mensalidade (Dias):
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.initialDays}
                onChange={(e) => setFormData({ ...formData, initialDays: e.target.value })}
                placeholder="30"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] font-mono font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Padrão: 30 dias iniciais. Mensalidade de R$ 50,00/mês.
              </span>
            </div>
          </div>

          {/* Checkbox Clonar Catálogo */}
          <div className="p-3 bg-pink-50/60 border border-pink-100 rounded-2xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cloneCatalog}
                onChange={(e) => setFormData({ ...formData, cloneCatalog: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-[#FF1493] focus:ring-[#FF1493] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-yellow-500" />
                  Clonar catálogo completo da loja matriz ({matrizStore?.name || matrizStore?.store_name || 'AJPSTORE'})
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Copia com fidelidade total todos os produtos reais (com fotos, descrições, preços e links), categorias originais, subcategorias e banners da loja marcada como matriz.
                </span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-pink-300" />
                  <span>Criando e Clonando Loja...</span>
                </>
              ) : (
                <>
                  <CopyCheck className="w-4 h-4 text-[#FFD1EC]" />
                  <span>Criar Nova Loja</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
