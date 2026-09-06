import React, { useState, useEffect } from 'react';
import { 
  Store, 
  MessageCircle, 
  Instagram, 
  MapPin, 
  Clock, 
  Save, 
  RotateCcw,
  ShieldAlert,
  Send,
  Check,
  Loader2,
  AlertCircle
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
    mpAccessToken: storeConfig.mpAccessToken || localStorage.getItem('encantando_festa_mp_access_token') || import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '',
    telegramBotToken: storeConfig.telegramBotToken || localStorage.getItem('encantando_festa_telegram_bot_token') || '',
    telegramChatId: storeConfig.telegramChatId || localStorage.getItem('encantando_festa_telegram_chat_id') || '',
  });

  // Sincroniza o formulário sempre que storeConfig for carregado do Supabase
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      storeName: storeConfig.storeName || prev.storeName,
      slogan: storeConfig.slogan || prev.slogan,
      whatsappNumber: storeConfig.whatsappNumber || prev.whatsappNumber,
      whatsappDisplay: storeConfig.whatsappDisplay || prev.whatsappDisplay,
      instagram: storeConfig.instagram || prev.instagram,
      address: storeConfig.address || prev.address,
      city: storeConfig.city || prev.city,
      workingHours: storeConfig.workingHours || prev.workingHours,
      minOrderValue: storeConfig.minOrderValue ? storeConfig.minOrderValue.toString().replace('.', ',') : prev.minOrderValue,
      mpAccessToken: storeConfig.mpAccessToken || localStorage.getItem('encantando_festa_mp_access_token') || prev.mpAccessToken,
      telegramBotToken: storeConfig.telegramBotToken || localStorage.getItem('encantando_festa_telegram_bot_token') || prev.telegramBotToken,
      telegramChatId: storeConfig.telegramChatId || localStorage.getItem('encantando_festa_telegram_chat_id') || prev.telegramChatId,
    }));
  }, [storeConfig]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [testTelegramLoading, setTestTelegramLoading] = useState(false);
  const [testTelegramStatus, setTestTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWhatsApp = formData.whatsappNumber.replace(/\D/g, '');
    const numMin = parseFloat(formData.minOrderValue.replace(',', '.')) || 0;

    try {
      localStorage.setItem('encantando_festa_telegram_bot_token', formData.telegramBotToken.trim());
      localStorage.setItem('encantando_festa_telegram_chat_id', formData.telegramChatId.trim());
    } catch (e) {
      console.warn(e);
    }

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
      mpAccessToken: formData.mpAccessToken?.trim() || '',
      telegramBotToken: formData.telegramBotToken?.trim() || '',
      telegramChatId: formData.telegramChatId?.trim() || '',
    });
  };

  const handleTestTelegram = async () => {
    if (!formData.telegramBotToken.trim() || !formData.telegramChatId.trim()) {
      setTestTelegramStatus({
        success: false,
        message: 'Preencha o Token do Bot e o Chat ID antes de testar.',
      });
      return;
    }

    setTestTelegramLoading(true);
    setTestTelegramStatus(null);

    try {
      const res = await fetch('/api/notify-abandoned-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'test',
          telegram_bot_token: formData.telegramBotToken.trim(),
          telegram_chat_id: formData.telegramChatId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestTelegramStatus({
          success: true,
          message: 'Mensagem de teste enviada com sucesso! Verifique seu Telegram.',
        });
      } else {
        setTestTelegramStatus({
          success: false,
          message: data.error || data.warning || 'Não foi possível conectar ao Telegram.',
        });
      }
    } catch (err: any) {
      setTestTelegramStatus({
        success: false,
        message: err.message || 'Erro ao tentar enviar notificação para o Telegram.',
      });
    } finally {
      setTestTelegramLoading(false);
    }
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
      mpAccessToken: '',
      telegramBotToken: '',
      telegramChatId: '',
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

        {/* 5. Integração Telegram (Alertas de Carrinho Abandonado em Tempo Real) */}
        <div className="p-4 sm:p-5 bg-sky-50/50 rounded-3xl border border-sky-300 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
              <div className="w-6 h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center text-xs shadow-xs">
                <Send className="w-3.5 h-3.5 fill-white" />
              </div>
              <span>Bot do Telegram (Alertas de Carrinho Abandonado em Tempo Real)</span>
            </div>
            <span className="text-[10px] bg-[#229ED9]/15 text-[#229ED9] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
              Recuperação Ativa
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Receba uma notificação instantânea no seu Telegram com o <b>Nome</b>, <b>WhatsApp clicável</b> e os <b>Produtos do Carrinho</b> assim que um cliente preencher o checkout e sair sem pagar.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Token do Bot (via @BotFather)
              </label>
              <input
                type="text"
                value={formData.telegramBotToken}
                onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                placeholder="Ex: 7123456789:AAFl..."
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-sky-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#229ED9] font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Crie seu bot conversando com o <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] underline font-semibold">@BotFather</a> no Telegram.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Seu Chat ID (ou ID do Grupo/Canal)
              </label>
              <input
                type="text"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                placeholder="Ex: 123456789 ou -100123456789"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-sky-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#229ED9] font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Descubra seu Chat ID enviando mensagem para <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] underline font-semibold">@userinfobot</a> no Telegram.
              </span>
            </div>
          </div>

          {/* Feedback de Teste */}
          {testTelegramStatus && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
              testTelegramStatus.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testTelegramStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{testTelegramStatus.message}</span>
            </div>
          )}

          {/* Botão de Teste */}
          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={testTelegramLoading}
              className="px-4 py-2.5 bg-white hover:bg-[#229ED9]/10 text-[#229ED9] border border-[#229ED9] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {testTelegramLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando teste...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Testar Notificação no Telegram</span>
                </>
              )}
            </button>
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
