import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Key, 
  Send, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Clock, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Link2
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { updateStoreDomain } from '../../services/storeManagementService';

export const ApiDomainManager: React.FC = () => {
  const { storeConfig, updateStoreConfig, showNotification } = useStoreData();
  const { currentStore } = useTenant();

  // Estados de Domínio
  const [customDomainInput, setCustomDomainInput] = useState(currentStore?.custom_domain || '');
  const [domainUpdating, setDomainUpdating] = useState(false);
  const [domainStatusMsg, setDomainStatusMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados de APIs
  const [mpAccessToken, setMpAccessToken] = useState(storeConfig.mpAccessToken || currentStore?.mp_access_token || '');
  const [showMpToken, setShowMpToken] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState(storeConfig.telegramBotToken || currentStore?.telegram_bot_token || '');
  const [showTgToken, setShowTgToken] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(storeConfig.telegramChatId || currentStore?.telegram_chat_id || '');
  
  const [isSavingApis, setIsSavingApis] = useState(false);
  const [apiSaveSuccess, setApiSaveSuccess] = useState(false);

  // Teste de Telegram
  const [testTelegramLoading, setTestTelegramLoading] = useState(false);
  const [testTelegramStatus, setTestTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (currentStore?.custom_domain) {
      setCustomDomainInput(currentStore.custom_domain);
    }
  }, [currentStore]);

  useEffect(() => {
    setMpAccessToken(storeConfig.mpAccessToken || currentStore?.mp_access_token || '');
    setTelegramBotToken(storeConfig.telegramBotToken || currentStore?.telegram_bot_token || '');
    setTelegramChatId(storeConfig.telegramChatId || currentStore?.telegram_chat_id || '');
  }, [storeConfig, currentStore]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveCustomDomain = async () => {
    if (!currentStore) return;
    setDomainUpdating(true);
    setDomainStatusMsg(null);

    let clean = customDomainInput.trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

    if (clean && !clean.startsWith('www.') && clean.split('.').length === 2) {
      clean = `www.${clean}`;
      setCustomDomainInput(clean);
    }

    const { success, error } = await updateStoreDomain(currentStore.id, clean || null);
    setDomainUpdating(false);

    if (success) {
      setDomainStatusMsg({
        success: true,
        message: 'Domínio salvo com sucesso! Configure as entradas de DNS abaixo.',
      });
      showNotification('Domínio da loja atualizado com sucesso!', 'success');
    } else {
      setDomainStatusMsg({
        success: false,
        message: error || 'Erro ao salvar o domínio próprio.',
      });
      showNotification(error || 'Erro ao salvar o domínio próprio.', 'error');
    }
  };

  const handleSaveApis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApis(true);
    setApiSaveSuccess(false);

    try {
      localStorage.setItem('encantando_festa_telegram_bot_token', telegramBotToken.trim());
      localStorage.setItem('encantando_festa_telegram_chat_id', telegramChatId.trim());
    } catch (e) {
      console.warn(e);
    }

    await updateStoreConfig({
      mpAccessToken: mpAccessToken.trim(),
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
    });

    setIsSavingApis(false);
    setApiSaveSuccess(true);
    setTimeout(() => setApiSaveSuccess(false), 3000);
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
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
          telegram_bot_token: telegramBotToken.trim(),
          telegram_chat_id: telegramChatId.trim(),
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

  const isDomainActive = currentStore?.domain_status === 'active' || currentStore?.domain_status === 'ativo';

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#FF1493]" />
            <span>Api e Dominio</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie o endereço web exclusivo da sua loja e credenciais de integração (Mercado Pago e Telegram)
          </p>
        </div>
      </div>

      {/* 1. SEÇÃO DE DOMÍNIO PRÓPRIO */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FFA6DF]/40 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-sm shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Meu Domínio Personalizado</h3>
              <p className="text-[11px] text-slate-500 font-normal">Use o seu próprio endereço .com ou .com.br</p>
            </div>
          </div>

          {currentStore?.custom_domain ? (
            isDomainActive ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Domínio Conectado e Ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                Aguardando Apontamento DNS
              </span>
            )
          ) : (
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold border border-slate-200">
              Nenhum domínio próprio vinculado
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Tenha seu site rodando no seu próprio endereço web exclusivo (ex: <code className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-sky-800 font-bold">www.sualoja.com.br</code>) sem menção a terceiros, garantindo máxima credibilidade e autoridade para sua marca.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Endereço do Domínio:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                placeholder="Ex: www.minhapapelaria.com.br"
                className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-mono text-slate-800"
              />
              <button
                type="button"
                onClick={handleSaveCustomDomain}
                disabled={domainUpdating}
                className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {domainUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Domínio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {domainStatusMsg && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in ${
              domainStatusMsg.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {domainStatusMsg.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{domainStatusMsg.message}</span>
            </div>
          )}

          {/* DNS Records Box */}
          <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-sky-700" />
                <span>Instruções de Apontamento DNS (no Registro.br, Hostinger, Cloudflare, etc.):</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* CNAME */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">1. CNAME (Subdomínio)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('cname.vercel-dns.com', 'cname')}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'cname' ? 'Copiado!' : 'Copiar Destino'}
                  </button>
                </div>
                <div className="text-[11px] space-y-0.5">
                  <div><span className="text-slate-400">Host:</span> <code className="font-bold text-slate-700">www</code></div>
                  <div><span className="text-slate-400">Destino:</span> <code className="font-bold text-sky-800 font-mono">cname.vercel-dns.com</code></div>
                </div>
              </div>

              {/* A Record */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">2. Tipo A (Apex / Raiz)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('76.76.21.21', 'a')}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'a' ? 'Copiado!' : 'Copiar IP'}
                  </button>
                </div>
                <div className="text-[11px] space-y-0.5">
                  <div><span className="text-slate-400">Host:</span> <code className="font-bold text-slate-700">@</code></div>
                  <div><span className="text-slate-400">IP:</span> <code className="font-bold text-sky-800 font-mono">76.76.21.21</code></div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>O certificado de segurança SSL (HTTPS) é ativado automaticamente assim que as entradas DNS propagarem.</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. FORMULÁRIO DE CHAVES DE API */}
      <form onSubmit={handleSaveApis} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FFA6DF]/40 shadow-sm space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#FF1493] text-white flex items-center justify-center text-sm shadow-xs">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Credenciais & Chaves de API</h3>
              <p className="text-[11px] text-slate-500">Conecte seus provedores de pagamento e notificações automáticas</p>
            </div>
          </div>
        </div>

        {/* 2.1 Mercado Pago Checkout Pro */}
        <div className="p-4 sm:p-5 bg-sky-50/70 rounded-3xl border border-sky-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-[#009EE3] text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                MP
              </span>
              <span>Mercado Pago Checkout Pro (Pagamentos Online)</span>
            </div>

            {mpAccessToken ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                <Check className="w-3 h-3" />
                Token Configurado
              </span>
            ) : (
              <span className="text-[11px] bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                Pendente
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Access Token de Produção (Mercado Pago)
            </label>
            <div className="relative flex items-center">
              <input
                type={showMpToken ? "text" : "password"}
                value={mpAccessToken}
                onChange={(e) => setMpAccessToken(e.target.value)}
                placeholder="APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-sky-300 rounded-2xl outline-none focus:ring-2 focus:ring-[#009EE3] font-mono text-slate-800 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowMpToken(!showMpToken)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showMpToken ? "Ocultar Token" : "Visualizar Token"}
              >
                {showMpToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Pegue seu Access Token em: <strong>Mercado Pago Developers &gt; Suas Aplicações &gt; Credenciais de Produção</strong>. 
              <br />
              💡 <em>Com o token preenchido, os pedidos pagos via Pix ou Cartão são aprovados e liberados de forma 100% automática na tela do cliente.</em>
            </p>
          </div>
        </div>

        {/* 2.2 Notificações Telegram Bot */}
        <div className="p-4 sm:p-5 bg-sky-50/50 rounded-3xl border border-sky-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
              <div className="w-6 h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-xs">
                <Send className="w-3.5 h-3.5" />
              </div>
              <span>Notificações Automáticas no Telegram Bot</span>
            </div>

            {telegramBotToken && telegramChatId ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                <Check className="w-3 h-3" />
                Telegram Configurado
              </span>
            ) : (
              <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                Opcional
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Receba notificações imediatas no seu celular sempre que um cliente realizar um pedido, aprovar um pagamento ou abandonar um carrinho na sua loja.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Token do Bot (Telegram)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showTgToken ? "text" : "password"}
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="Ex: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-sky-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#229ED9] font-mono text-slate-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTgToken(!showTgToken)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showTgToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Crie seu bot falando com o <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] underline font-semibold">@BotFather</a> no Telegram.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Chat ID (Seu ID de Usuário / Grupo)
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ex: 123456789 ou -100123456789"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-sky-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#229ED9] font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Descubra seu Chat ID enviando mensagem para <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] underline font-semibold">@userinfobot</a>.
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
              className="px-4 py-2 bg-white hover:bg-[#229ED9]/10 text-[#229ED9] border border-[#229ED9] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
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

        {/* Botão Salvar Chaves de API */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {apiSaveSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Chaves de API salvas com sucesso!
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSavingApis}
            className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingApis ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#FFD1EC]" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#FFD1EC]" />
                <span>Salvar Chaves de API</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
