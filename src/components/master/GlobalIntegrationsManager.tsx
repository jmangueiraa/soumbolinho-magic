import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Send, 
  Eye, 
  EyeOff, 
  Check, 
  Copy, 
  Save, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Database, 
  Sparkles,
  Key,
  Info
} from 'lucide-react';
import { 
  fetchGlobalSettings, 
  saveGlobalSettings, 
  testMercadoPagoToken, 
  testTelegramNotification 
} from '../../services/globalSettingsService';

export const GlobalIntegrationsManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Mercado Pago
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [showMpToken, setShowMpToken] = useState(false);
  const [isSavingMp, setIsSavingMp] = useState(false);
  const [isTestingMp, setIsTestingMp] = useState(false);

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Feedbacks
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // Carrega configurações existentes
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchGlobalSettings();
      setMpAccessToken(data.mp_access_token || '');
      setMpPublicKey(data.mp_public_key || '');
      setTelegramBotToken(data.telegram_bot_token || '');
      setTelegramChatId(data.telegram_chat_id || '');
    } catch (e) {
      console.warn('[GlobalIntegrationsManager] Erro ao carregar configurações:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  // 1. Salvar Mercado Pago
  const handleSaveMp = async () => {
    setIsSavingMp(true);
    try {
      const res = await saveGlobalSettings({
        mp_access_token: mpAccessToken,
        mp_public_key: mpPublicKey,
      });

      if (res.success) {
        showNotification('success', 'Credenciais do Mercado Pago salvas e sincronizadas com sucesso no banco de dados!');
      } else {
        showNotification('error', res.error || 'Erro ao gravar credenciais do Mercado Pago.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Falha ao salvar Mercado Pago.');
    } finally {
      setIsSavingMp(false);
    }
  };

  // 2. Testar Token do Mercado Pago
  const handleTestMp = async () => {
    setIsTestingMp(true);
    try {
      const res = await testMercadoPagoToken(mpAccessToken);
      if (res.success) {
        showNotification('success', res.message);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Erro ao testar Mercado Pago.');
    } finally {
      setIsTestingMp(false);
    }
  };

  // 3. Salvar Telegram
  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    try {
      const res = await saveGlobalSettings({
        telegram_bot_token: telegramBotToken,
        telegram_chat_id: telegramChatId,
      });

      if (res.success) {
        showNotification('success', 'Credenciais do Telegram salvas e sincronizadas com sucesso no banco de dados!');
      } else {
        showNotification('error', res.error || 'Erro ao gravar credenciais do Telegram.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Falha ao salvar Telegram.');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // 4. Testar Telegram
  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await testTelegramNotification(telegramBotToken, telegramChatId);
      if (res.success) {
        showNotification('success', res.message);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Erro ao enviar notificação de teste.');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const sqlCreateCode = `-- Criação da tabela de configurações globais no Supabase
CREATE TABLE IF NOT EXISTS public.global_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  mp_access_token TEXT,
  mp_public_key TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões de RLS seguras
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read global_settings" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Allow upsert global_settings" ON public.global_settings FOR ALL USING (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCreateCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isMpConfigured = Boolean(mpAccessToken && mpAccessToken.length > 15);
  const isTelegramConfigured = Boolean(telegramBotToken && telegramChatId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
        <RefreshCw className="w-7 h-7 text-pink-500 animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Carregando integrações globais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Banner de Feedback Global */}
      {feedback && (
        <div 
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {feedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {feedback.type === 'info' && <Info className="w-5 h-5 text-sky-600 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho da Seção */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-pink-500" />
            <span>Integrações & Credenciais Globais (APIs)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Configure as credenciais centrais da plataforma AJPSTORE. Essas chaves alimentam o processamento das mensalidades das lojas clientes e o disparo de notificações administrativas automáticas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadSettings}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200"
            title="Recarregar dados do banco"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-gray-200"
          >
            <Database className="w-3.5 h-3.5 text-gray-600" />
            <span>{showSqlGuide ? 'Ocultar SQL' : 'Estrutura SQL'}</span>
          </button>
        </div>
      </div>

      {/* Caixa Expansível com o Script SQL */}
      {showSqlGuide && (
        <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Tabela de Configurações no Supabase (global_settings)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            O sistema salva automaticamente na tabela <code>global_settings</code> e espelha na matriz <code>stores</code>. Caso queira criar a tabela explicitamente no SQL Editor do Supabase, execute o código abaixo:
          </p>
          <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800">
            {sqlCreateCode}
          </pre>
        </div>
      )}

      {/* GRID COM OS DOIS FORMULÁRIOS PRINCIPAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. CARD MERCADO PAGO */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            
            {/* Top Header Card */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">API do Mercado Pago</h3>
                  <p className="text-[11px] text-gray-500">Cobrança de mensalidades e Pix automático</p>
                </div>
              </div>

              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                isMpConfigured 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMpConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{isMpConfigured ? 'Conectado' : 'Pendente'}</span>
              </span>
            </div>

            {/* Campo 1: Access Token */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span>Access Token de Produção</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400">Privado (Backend)</span>
              </div>
              <div className="relative">
                <input
                  type={showMpToken ? 'text' : 'password'}
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  placeholder="APP_USR-0000000000000000-000000-..."
                  className="w-full text-xs font-mono bg-gray-50 hover:bg-white focus:bg-white px-3 py-2.5 pr-10 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowMpToken(!showMpToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  title={showMpToken ? 'Ocultar token' : 'Exibir token'}
                >
                  {showMpToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Utilizado na geração instantânea de QR Code Pix e verificação de pagamentos das lojas.
              </p>
            </div>

            {/* Campo 2: Public Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800">
                  Public Key (Chave Pública)
                </label>
                <span className="text-[10px] text-gray-400">Opcional</span>
              </div>
              <input
                type="text"
                value={mpPublicKey}
                onChange={(e) => setMpPublicKey(e.target.value)}
                placeholder="APP_USR-00000000-0000-0000-0000-000000000000"
                className="w-full text-xs font-mono bg-gray-50 hover:bg-white focus:bg-white px-3 py-2.5 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all text-gray-800"
              />
              <p className="text-[11px] text-gray-500 leading-normal">
                Necessária caso utilize componentes visuais e SDK frontend do Mercado Pago.
              </p>
            </div>

            {/* Link de Apoio */}
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 hover:text-sky-800 transition-colors pt-1"
            >
              <span>Obter credenciais no Portal de Desenvolvedores do Mercado Pago</span>
              <ExternalLink className="w-3 h-3" />
            </a>

          </div>

          {/* Botões de Ação do Mercado Pago */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestMp}
              disabled={isTestingMp || !mpAccessToken}
              className="w-full sm:w-auto px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTestingMp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Testar Token</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveMp}
              disabled={isSavingMp}
              className="w-full sm:flex-1 py-2.5 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSavingMp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no Banco...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Mercado Pago</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. CARD TELEGRAM */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            
            {/* Top Header Card */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">API do Telegram</h3>
                  <p className="text-[11px] text-gray-500">Notificações automáticas para a administração</p>
                </div>
              </div>

              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                isTelegramConfigured 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isTelegramConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{isTelegramConfigured ? 'Conectado' : 'Pendente'}</span>
              </span>
            </div>

            {/* Campo 1: Token do Bot */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span>Token do Bot (BotFather)</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400">Telegram Bot API</span>
              </div>
              <div className="relative">
                <input
                  type={showTelegramToken ? 'text' : 'password'}
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full text-xs font-mono bg-gray-50 hover:bg-white focus:bg-white px-3 py-2.5 pr-10 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowTelegramToken(!showTelegramToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  title={showTelegramToken ? 'Ocultar token' : 'Exibir token'}
                >
                  {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Criado conversando com o <strong>@BotFather</strong> no Telegram.
              </p>
            </div>

            {/* Campo 2: Chat ID Principal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span>Chat ID Principal</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400">Destino dos alertas</span>
              </div>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ex: 123456789 ou -100123456789"
                className="w-full text-xs font-mono bg-gray-50 hover:bg-white focus:bg-white px-3 py-2.5 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all text-gray-800"
              />
              <p className="text-[11px] text-gray-500 leading-normal">
                ID do seu usuário ou canal/grupo. Dica: use o bot <strong>@userinfobot</strong> para descobrir o seu ID.
              </p>
            </div>

            {/* Instrução Rápida */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1 text-[11px] text-indigo-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1 text-indigo-950">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Importante para o teste:</span>
              </p>
              <p>
                Antes de testar, abra seu Telegram e dê <strong>/start</strong> no seu bot recém-criado para autorizar o recebimento de mensagens.
              </p>
            </div>

          </div>

          {/* Botões de Ação do Telegram */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram || !telegramBotToken || !telegramChatId}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTestingTelegram ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enviar Mensagem de Teste</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveTelegram}
              disabled={isSavingTelegram}
              className="w-full sm:flex-1 py-2.5 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSavingTelegram ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no Banco...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Telegram</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
