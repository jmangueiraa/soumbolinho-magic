import React, { useState } from 'react';
import { 
  Store, 
  MessageCircle, 
  Instagram, 
  MapPin, 
  Clock, 
  Save, 
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const StoreSettingsManager: React.FC = () => {
  const { storeConfig, updateStoreConfig, resetToDefaults } = useStoreData();

  const [formData, setFormData] = useState({
    storeName: storeConfig.storeName,
    slogan: storeConfig.slogan,
    whatsappNumber: storeConfig.whatsappNumber,
    whatsappDisplay: storeConfig.whatsappDisplay,
    instagram: storeConfig.instagram,
    address: storeConfig.address,
    city: storeConfig.city,
    workingHours: storeConfig.workingHours,
    minOrderValue: storeConfig.minOrderValue.toString().replace('.', ','),
    mpAccessToken: localStorage.getItem('encantando_festa_mp_access_token') || import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '',
  });

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWhatsApp = formData.whatsappNumber.replace(/\D/g, '');
    const numMin = parseFloat(formData.minOrderValue.replace(',', '.')) || 0;

    updateStoreConfig({
      storeName: formData.storeName.trim(),
      slogan: formData.slogan.trim(),
      whatsappNumber: cleanWhatsApp,
      whatsappDisplay: formData.whatsappDisplay.trim(),
      instagram: formData.instagram.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      workingHours: formData.workingHours.trim(),
      minOrderValue: numMin,
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    setIsResetModalOpen(false);
    // Sync local state
    setFormData({
      storeName: 'Encantando Festa - Papelaria Personalizada',
      slogan: 'Transformando momentos especiais em memórias inesquecíveis',
      whatsappNumber: '5521974975884',
      whatsappDisplay: '(21) 97497-5884',
      instagram: '@encantandofesta.papelaria',
      address: 'Ateliê Criativo - Rio de Janeiro / RJ',
      city: 'Rio de Janeiro - RJ',
      workingHours: 'Segunda a Sábado das 09h às 18h',
      minOrderValue: '20,00',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-[#FF1493]" />
            <span>Configurações Gerais da Loja</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure o número de WhatsApp que recebe os pedidos, dados de contato e políticas
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FFA6DF]/40 shadow-sm space-y-6">
        
        {/* 1. WhatsApp para Recebimento de Pedidos */}
        <div className="p-4 sm:p-5 bg-[#FFEBF6]/60 rounded-3xl border border-[#FFA6DF] space-y-4">
          <div className="flex items-center gap-2 text-[#FF1493] font-bold text-sm">
            <MessageCircle className="w-5 h-5 fill-[#FF1493]" />
            <span>WhatsApp de Recebimento dos Pedidos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Número do WhatsApp (com DDI e DDD) *
              </label>
              <input
                type="text"
                required
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="5521974975884"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-[#FF1493] font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Formato numérico internacional sem espaços (ex: 5521974975884)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Exibição Visual do Telefone *
              </label>
              <input
                type="text"
                required
                value={formData.whatsappDisplay}
                onChange={(e) => setFormData({ ...formData, whatsappDisplay: e.target.value })}
                placeholder="(21) 97497-5884"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-[#FF1493]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Como o telefone será exibido no rodapé e botões
              </p>
            </div>
          </div>
        </div>

        {/* 2. Dados Institucionais */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Identidade da Loja
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nome da Loja *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Instagram
              </label>
              <div className="relative flex items-center">
                <Instagram className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@encantandofesta.papelaria"
                  className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Slogan / Subtítulo
            </label>
            <input
              type="text"
              value={formData.slogan}
              onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
            />
          </div>
        </div>

        {/* 3. Atendimento e Localização */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Endereço & Atendimento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Endereço do Ateliê (para retirada)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Horário de Funcionamento
              </label>
              <input
                type="text"
                value={formData.workingHours}
                onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
              />
            </div>
          </div>
        </div>

        {/* 4. Integração Mercado Pago Checkout Pro */}
        <div className="p-4 sm:p-5 bg-sky-50/70 rounded-3xl border border-sky-200 space-y-4">
          <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-[#009EE3] text-white flex items-center justify-center text-[10px] font-black">MP</span>
            <span>Mercado Pago Checkout Pro (Pagamentos Online)</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Access Token do Mercado Pago (Bearer Token)
            </label>
            <input
              type="password"
              value={formData.mpAccessToken || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, mpAccessToken: val });
                localStorage.setItem('encantando_festa_mp_access_token', val);
              }}
              placeholder="APP_USR-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxx..."
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-sky-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#009EE3] font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Obtenha suas credenciais de produção ou teste no painel de desenvolvedores: <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-[#009EE3] underline font-semibold">mercadopago.com.br/developers</a>
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Dados Originais de Fábrica</span>
          </button>

          <button
            type="submit"
            className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 active:scale-98 transition-all"
          >
            <Save className="w-4 h-4 text-[#FFD1EC]" />
            <span>Salvar Configurações</span>
          </button>
        </div>

      </form>

      {/* Confirmation Reset Modal */}
      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        title="Restaurar Configurações Originais"
        message="Esta ação irá restaurar todos os produtos, categorias e configurações para o estado original de fábrica. Deseja continuar?"
        onConfirm={handleResetDefaults}
        onCancel={() => setIsResetModalOpen(false)}
      />

    </div>
  );
};
