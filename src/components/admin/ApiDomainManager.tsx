import React, { useState, useEffect, useRef } from 'react';
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
  Link2,
  Truck,
  MapPin,
  Sparkles,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../lib/supabase';
import { updateStoreDomain } from '../../services/storeManagementService';
import { fetchShippingConfig, saveShippingConfig, lookupCep } from '../../services/shippingService';
import { testWhatsAppNotification } from '../../services/whatsappNotificationService';

export const ApiDomainManager: React.FC = () => {
  const { storeConfig, updateStoreConfig, showNotification } = useStoreData();
  const { currentStore, refreshTenant, updateCurrentStore } = useTenant();

  // Estados de Domínio
  const [customDomainInput, setCustomDomainInput] = useState(currentStore?.custom_domain || '');
  const [domainUpdating, setDomainUpdating] = useState(false);
  const [domainStatusMsg, setDomainStatusMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados de APIs com inicialização resiliente
  const [mpAccessToken, setMpAccessToken] = useState(() => {
    return (
      storeConfig.mpAccessToken ||
      currentStore?.mp_access_token ||
      currentStore?.theme_settings?.mp_access_token ||
      (currentStore?.id ? localStorage.getItem(`store_${currentStore.id}_mp_access_token`) : null) ||
      (typeof window !== 'undefined' ? localStorage.getItem('mp_access_token') : null) ||
      localStorage.getItem('encantando_festa_mp_access_token') ||
      ''
    );
  });
  const [showMpToken, setShowMpToken] = useState(false);
  const [isSavingMpOnly, setIsSavingMpOnly] = useState(false);
  const [mpSaveSuccess, setMpSaveSuccess] = useState(false);
  const [mpSaveError, setMpSaveError] = useState<string | null>(null);

  const hasLoadedStoreIdRef = useRef<string | null>(null);

  const [telegramBotToken, setTelegramBotToken] = useState(() => {
    return (
      storeConfig.telegramBotToken ||
      currentStore?.telegram_bot_token ||
      currentStore?.theme_settings?.telegram_bot_token ||
      (currentStore?.id ? localStorage.getItem(`store_${currentStore.id}_telegram_bot_token`) : null) ||
      localStorage.getItem('encantando_festa_telegram_bot_token') ||
      ''
    );
  });
  const [showTgToken, setShowTgToken] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(() => {
    return (
      storeConfig.telegramChatId ||
      currentStore?.telegram_chat_id ||
      currentStore?.theme_settings?.telegram_chat_id ||
      (currentStore?.id ? localStorage.getItem(`store_${currentStore.id}_telegram_chat_id`) : null) ||
      localStorage.getItem('encantando_festa_telegram_chat_id') ||
      ''
    );
  });
  
  const [isSavingApis, setIsSavingApis] = useState(false);
  const [apiSaveSuccess, setApiSaveSuccess] = useState(false);

  // Estados Melhor Envio & Frete via API
  const [originCep, setOriginCep] = useState('01001-000');
  const [originCityState, setOriginCityState] = useState('');
  const [melhorEnvioEnabled, setMelhorEnvioEnabled] = useState(true);
  const [melhorEnvioToken, setMelhorEnvioToken] = useState('');
  const [showMeToken, setShowMeToken] = useState(false);
  const [testMeLoading, setTestMeLoading] = useState(false);
  const [testMeResults, setTestMeResults] = useState<{
    success: boolean;
    message: string;
    quotes?: any[];
  } | null>(null);

  const handleOriginCepChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    const masked = clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
    setOriginCep(masked);

    if (clean.length === 8) {
      const { address } = await lookupCep(clean);
      if (address) {
        setOriginCityState(`${address.city} - ${address.state}`);
      }
    } else {
      setOriginCityState('');
    }
  };

  const handleTestMelhorEnvio = async () => {
    if (!melhorEnvioToken.trim()) {
      setTestMeResults({
        success: false,
        message: 'Cole o Token do Melhor Envio antes de testar.',
      });
      return;
    }

    setTestMeLoading(true);
    setTestMeResults(null);

    try {
      const res = await fetch('/api/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_cep: '01310100', // Av. Paulista, SP
          origin_cep: originCep.replace(/\D/g, '') || '01001000',
          melhor_envio_token: melhorEnvioToken.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.options) && data.options.length > 0) {
          setTestMeResults({
            success: true,
            message: `API conectada com sucesso! ${data.options.length} opções cotadas para CEP 01310-100:`,
            quotes: data.options,
          });
        } else {
          setTestMeResults({
            success: false,
            message: data.error || 'Não foi possível cotar com o token fornecido.',
          });
        }
      } else {
        setTestMeResults({
          success: false,
          message: 'Falha ao consultar a API do Melhor Envio. Verifique se o token é válido.',
        });
      }
    } catch (err: any) {
      setTestMeResults({
        success: false,
        message: 'Erro ao conectar ao serviço de cotação.',
      });
    } finally {
      setTestMeLoading(false);
    }
  };

  // Teste de Telegram
  const [testTelegramLoading, setTestTelegramLoading] = useState(false);
  const [testTelegramStatus, setTestTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Estados de WhatsApp API
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [whatsappApiProvider, setWhatsappApiProvider] = useState<'evolution' | 'zapi' | 'callmebot' | 'meta' | 'webhook'>('evolution');
  const [whatsappApiUrl, setWhatsappApiUrl] = useState('');
  const [whatsappApiToken, setWhatsappApiToken] = useState('');
  const [whatsappNotifyPhone, setWhatsappNotifyPhone] = useState('');
  const [showWaToken, setShowWaToken] = useState(false);
  const [testWaLoading, setTestWaLoading] = useState(false);
  const [testWaStatus, setTestWaStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestWhatsApp = async () => {
    setTestWaLoading(true);
    setTestWaStatus(null);
    try {
      const res = await testWhatsAppNotification({
        storeId: currentStore?.id,
        storeName: currentStore?.name || storeConfig?.storeName || 'Minha Loja',
        provider: whatsappApiProvider,
        apiUrl: whatsappApiUrl,
        apiToken: whatsappApiToken,
        notifyPhone: whatsappNotifyPhone,
      });
      setTestWaStatus(res);
    } catch (err: any) {
      setTestWaStatus({
        success: false,
        message: err.message || 'Erro inesperado ao testar notificação via WhatsApp.',
      });
    } finally {
      setTestWaLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore?.custom_domain) {
      setCustomDomainInput(currentStore.custom_domain);
    }
  }, [currentStore]);

  useEffect(() => {
    const storeKey = currentStore?.id;
    if (!storeKey || storeKey === '__resolving_tenant__') return;

    // Sincroniza do banco/contexto apenas na carga inicial ou quando mudar a loja ativa
    if (hasLoadedStoreIdRef.current !== storeKey) {
      hasLoadedStoreIdRef.current = storeKey;

      const mp = storeConfig.mpAccessToken || currentStore?.mp_access_token || currentStore?.theme_settings?.mp_access_token || localStorage.getItem(`store_${storeKey}_mp_access_token`) || localStorage.getItem('mp_access_token') || localStorage.getItem('encantando_festa_mp_access_token') || '';
      const tg = storeConfig.telegramBotToken || currentStore?.telegram_bot_token || currentStore?.theme_settings?.telegram_bot_token || localStorage.getItem(`store_${storeKey}_telegram_bot_token`) || localStorage.getItem('encantando_festa_telegram_bot_token') || '';
      const chat = storeConfig.telegramChatId || currentStore?.telegram_chat_id || currentStore?.theme_settings?.telegram_chat_id || localStorage.getItem(`store_${storeKey}_telegram_chat_id`) || localStorage.getItem('encantando_festa_telegram_chat_id') || '';

      const waProv = currentStore?.whatsapp_api_provider || currentStore?.theme_settings?.whatsapp_api_provider || localStorage.getItem(`store_${storeKey}_whatsapp_api_provider`) || 'evolution';
      const waUrl = currentStore?.whatsapp_api_url || currentStore?.theme_settings?.whatsapp_api_url || localStorage.getItem(`store_${storeKey}_whatsapp_api_url`) || '';
      const waTok = currentStore?.whatsapp_api_token || currentStore?.theme_settings?.whatsapp_api_token || localStorage.getItem(`store_${storeKey}_whatsapp_api_token`) || '';
      const waPhone = currentStore?.whatsapp_notify_phone || currentStore?.theme_settings?.whatsapp_notify_phone || currentStore?.whatsapp_number || storeConfig?.whatsappNumber || localStorage.getItem(`store_${storeKey}_whatsapp_notify_phone`) || '';

      if (mp) setMpAccessToken(mp);
      if (tg) setTelegramBotToken(tg);
      if (chat) setTelegramChatId(chat);

      if (waProv) setWhatsappApiProvider(waProv as any);
      if (waUrl) setWhatsappApiUrl(waUrl);
      if (waTok) setWhatsappApiToken(waTok);
      if (waPhone) setWhatsappNotifyPhone(waPhone);
    }
  }, [currentStore?.id]);

  // Carrega configurações de frete (Melhor Envio) associadas à loja
  useEffect(() => {
    async function loadShipping() {
      const storeId = currentStore?.id || 'suamarcaaqui';
      try {
        const sc = await fetchShippingConfig(storeId);
        if (sc) {
          setMelhorEnvioEnabled(sc.melhorEnvioEnabled !== false);
          setMelhorEnvioToken(sc.melhorEnvioToken || '');
          if (sc.originCep) {
            setOriginCep(sc.originCep);
            const { address } = await lookupCep(sc.originCep);
            if (address) {
              setOriginCityState(`${address.city} - ${address.state}`);
            }
          }
        }
      } catch (err) {
        console.warn('[ApiDomainManager] Erro ao carregar config de frete/Melhor Envio:', err);
      }
    }
    loadShipping();
  }, [currentStore?.id]);

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

  const handleSaveMpOnly = async () => {
    setIsSavingMpOnly(true);
    setMpSaveSuccess(false);
    setMpSaveError(null);

    const cleanMpToken = mpAccessToken.trim();
    const storeKey = currentStore?.id || 'default';
    const storeSlug = currentStore?.slug;
    const storeDomain = currentStore?.custom_domain;
    const cleanHostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase().trim().replace(/^www\./, '') : '';
    const isEditaveisContext = 
      cleanHostname.includes('editaveisdocanva') || 
      (storeDomain && storeDomain.toLowerCase().includes('editaveisdocanva')) ||
      storeSlug === 'editaveisdocanva' ||
      storeKey === 'store_editaveisdocanva';

    try {
      console.log(`[ApiDomainManager] 💾 Salvando exclusivamente Access Token do Mercado Pago para loja: ${storeKey}...`);

      // 1. Grava no localStorage imediatamente sob todas as chaves redundantes
      if (cleanMpToken) {
        localStorage.setItem(`store_${storeKey}_mp_access_token`, cleanMpToken);
        if (storeSlug) localStorage.setItem(`store_${storeSlug}_mp_access_token`, cleanMpToken);
        localStorage.setItem('store_store_editaveisdocanva_mp_access_token', cleanMpToken);
        localStorage.setItem('store_editaveisdocanva_mp_access_token', cleanMpToken);
        localStorage.setItem('mp_access_token', cleanMpToken);
        localStorage.setItem('encantando_festa_mp_access_token', cleanMpToken);
      } else {
        localStorage.removeItem(`store_${storeKey}_mp_access_token`);
        if (storeSlug) localStorage.removeItem(`store_${storeSlug}_mp_access_token`);
        localStorage.removeItem('store_store_editaveisdocanva_mp_access_token');
        localStorage.removeItem('store_editaveisdocanva_mp_access_token');
        localStorage.removeItem('mp_access_token');
        localStorage.removeItem('encantando_festa_mp_access_token');
      }

      // 2. Grava diretamente na tabela stores do Supabase
      if (storeKey && storeKey !== '__resolving_tenant__') {
        const storePayload: any = {
          mp_access_token: cleanMpToken || null,
          theme_settings: {
            ...(currentStore?.theme_settings || {}),
            mp_access_token: cleanMpToken || null,
          },
          updated_at: new Date().toISOString(),
        };

        // Salva por ID com adaptação de colunas
        let idPayload = { ...storePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { error: errId } = await supabase
            .from('stores')
            .update(idPayload)
            .eq('id', storeKey);

          if (!errId) {
            console.log('[ApiDomainManager] ✅ Mercado Pago atualizado em stores por ID!');
            break;
          }
          const colMatch = errId.message?.match(/Could not find the '([^']+)' column/i);
          if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
            delete idPayload[colMatch[1]];
            continue;
          }
          break;
        }

        // Salva por slug se disponível
        if (storeSlug) {
          let slugPayload = { ...storePayload };
          for (let attempt = 0; attempt < 8; attempt++) {
            const { error: errSlug } = await supabase
              .from('stores')
              .update(slugPayload)
              .eq('slug', storeSlug);

            if (!errSlug) {
              console.log('[ApiDomainManager] ✅ Mercado Pago atualizado em stores por slug!');
              break;
            }
            const colMatch = errSlug.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete slugPayload[colMatch[1]];
              continue;
            }
            break;
          }
        }

        // Se for contexto de Editáveis do Canva, salva em todas as variantes da loja no Supabase
        if (isEditaveisContext) {
          let editPayload = { ...storePayload };
          for (let attempt = 0; attempt < 8; attempt++) {
            const { error: errEdit } = await supabase
              .from('stores')
              .update(editPayload)
              .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%,slug.eq.editaveis-do-canva');

            if (!errEdit) {
              console.log('[ApiDomainManager] ✅ Mercado Pago atualizado em stores via variantes Editáveis!');
              break;
            }
            const colMatch = errEdit.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete editPayload[colMatch[1]];
              continue;
            }
            break;
          }
        }
      }

      // 3. Atualiza via StoreDataContext (que persiste em store_config e site_settings)
      await updateStoreConfig({
        mpAccessToken: cleanMpToken,
      });

      // 4. Atualiza tenant context em memória sem recarregar a interface
      try {
        if (updateCurrentStore) {
          updateCurrentStore({
            mp_access_token: cleanMpToken || null,
            theme_settings: {
              ...(currentStore?.theme_settings || {}),
              mp_access_token: cleanMpToken || null,
            }
          });
        }
        await refreshTenant(true); // silent refresh
      } catch (e) {}

      setMpSaveSuccess(true);
      showNotification('Token do Mercado Pago salvo com sucesso no banco de dados!', 'success');
      setTimeout(() => setMpSaveSuccess(false), 4500);
    } catch (err: any) {
      console.error('[ApiDomainManager] ❌ Erro ao salvar Mercado Pago:', err);
      setMpSaveError(err.message || 'Erro ao salvar token');
      showNotification(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
      setIsSavingMpOnly(false);
    }
  };

  const handleSaveApis = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setIsSavingApis(true);
    setApiSaveSuccess(false);

    const cleanMpToken = mpAccessToken.trim();
    const cleanTgToken = telegramBotToken.trim();
    const cleanChatId = telegramChatId.trim();
    const cleanMeToken = melhorEnvioToken.trim();
    const cleanWaProvider = whatsappApiProvider;
    const cleanWaUrl = whatsappApiUrl.trim();
    const cleanWaToken = whatsappApiToken.trim();
    const cleanWaPhone = whatsappNotifyPhone.trim();
    const storeKey = currentStore?.id || 'default';
    const storeSlug = currentStore?.slug;
    const storeDomain = currentStore?.custom_domain;
    const cleanHostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase().trim().replace(/^www\./, '') : '';
    const isEditaveisContext = 
      cleanHostname.includes('editaveisdocanva') || 
      (storeDomain && storeDomain.toLowerCase().includes('editaveisdocanva')) ||
      storeSlug === 'editaveisdocanva' ||
      storeKey === 'store_editaveisdocanva';

    // Salva configuração do Melhor Envio via shippingService
    try {
      const currentShipping = await fetchShippingConfig(storeKey);
      const updatedShipping = {
        ...currentShipping,
        originCep: originCep.trim() || '01001-000',
        melhorEnvioEnabled,
        melhorEnvioToken: cleanMeToken,
      };
      await saveShippingConfig(storeKey, updatedShipping);
    } catch (meErr) {
      console.warn('[ApiDomainManager] Erro ao salvar Melhor Envio:', meErr);
    }

    // 1. Grava no localStorage imediatamente para persistência garantida no navegador
    try {
      if (cleanMpToken) {
        localStorage.setItem(`store_${storeKey}_mp_access_token`, cleanMpToken);
        if (storeSlug) localStorage.setItem(`store_${storeSlug}_mp_access_token`, cleanMpToken);
        localStorage.setItem('store_store_editaveisdocanva_mp_access_token', cleanMpToken);
        localStorage.setItem('store_editaveisdocanva_mp_access_token', cleanMpToken);
        localStorage.setItem('mp_access_token', cleanMpToken);
        localStorage.setItem('encantando_festa_mp_access_token', cleanMpToken);
      } else {
        localStorage.removeItem(`store_${storeKey}_mp_access_token`);
        if (storeSlug) localStorage.removeItem(`store_${storeSlug}_mp_access_token`);
        localStorage.removeItem('store_store_editaveisdocanva_mp_access_token');
        localStorage.removeItem('store_editaveisdocanva_mp_access_token');
        localStorage.removeItem('mp_access_token');
        localStorage.removeItem('encantando_festa_mp_access_token');
      }

      if (cleanTgToken) {
        localStorage.setItem('encantando_festa_telegram_bot_token', cleanTgToken);
        localStorage.setItem(`store_${storeKey}_telegram_bot_token`, cleanTgToken);
      } else {
        localStorage.removeItem('encantando_festa_telegram_bot_token');
        localStorage.removeItem(`store_${storeKey}_telegram_bot_token`);
      }

      if (cleanChatId) {
        localStorage.setItem('encantando_festa_telegram_chat_id', cleanChatId);
        localStorage.setItem(`store_${storeKey}_telegram_chat_id`, cleanChatId);
      } else {
        localStorage.removeItem('encantando_festa_telegram_chat_id');
        localStorage.removeItem(`store_${storeKey}_telegram_chat_id`);
      }

      // Salva WhatsApp API no localStorage
      localStorage.setItem(`store_${storeKey}_whatsapp_api_provider`, cleanWaProvider);
      localStorage.setItem(`store_${storeKey}_whatsapp_api_url`, cleanWaUrl);
      localStorage.setItem(`store_${storeKey}_whatsapp_api_token`, cleanWaToken);
      localStorage.setItem(`store_${storeKey}_whatsapp_notify_phone`, cleanWaPhone);
      localStorage.setItem('encantando_festa_whatsapp_api_provider', cleanWaProvider);
      localStorage.setItem('encantando_festa_whatsapp_api_url', cleanWaUrl);
      localStorage.setItem('encantando_festa_whatsapp_api_token', cleanWaToken);
      localStorage.setItem('encantando_festa_whatsapp_notify_phone', cleanWaPhone);
    } catch (e) {
      console.warn('[ApiDomainManager] LocalStorage indisponível:', e);
    }

    // 2. Atualiza diretamente na tabela stores com tratamento adaptativo de colunas
    if (storeKey && storeKey !== '__resolving_tenant__') {
      try {
        const storePayload: any = {
          mp_access_token: cleanMpToken || null,
          telegram_bot_token: cleanTgToken || null,
          telegram_chat_id: cleanChatId || null,
          whatsapp_api_provider: cleanWaProvider || null,
          whatsapp_api_url: cleanWaUrl || null,
          whatsapp_api_token: cleanWaToken || null,
          whatsapp_notify_phone: cleanWaPhone || null,
          theme_settings: {
            ...(currentStore.theme_settings || {}),
            mp_access_token: cleanMpToken || null,
            telegram_bot_token: cleanTgToken || null,
            telegram_chat_id: cleanChatId || null,
            whatsapp_api_provider: cleanWaProvider || null,
            whatsapp_api_url: cleanWaUrl || null,
            whatsapp_api_token: cleanWaToken || null,
            whatsapp_notify_phone: cleanWaPhone || null,
            shipping_config: {
              ...(currentStore.theme_settings?.shipping_config || {}),
              originCep: originCep.trim() || '01001-000',
              melhorEnvioEnabled,
              melhorEnvioToken: cleanMeToken,
            },
          },
          updated_at: new Date().toISOString(),
        };

        // Salva por ID com loop adaptativo
        let idPayload = { ...storePayload };
        for (let attempt = 0; attempt < 8; attempt++) {
          const { error: errId } = await supabase
            .from('stores')
            .update(idPayload)
            .eq('id', storeKey);

          if (!errId) {
            console.log('[ApiDomainManager] ✅ Tabela stores atualizada por ID com sucesso!');
            break;
          }

          const colMatch = errId.message?.match(/Could not find the '([^']+)' column/i);
          if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
            delete idPayload[colMatch[1]];
            continue;
          }
          break;
        }

        // Salva também por slug se disponível
        if (storeSlug) {
          let slugPayload = { ...storePayload };
          for (let attempt = 0; attempt < 8; attempt++) {
            const { error: errSlug } = await supabase
              .from('stores')
              .update(slugPayload)
              .eq('slug', storeSlug);

            if (!errSlug) {
              console.log('[ApiDomainManager] ✅ Tabela stores atualizada por slug com sucesso!');
              break;
            }

            const colMatch = errSlug.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete slugPayload[colMatch[1]];
              continue;
            }
            break;
          }
        }

        // Salva também por variantes de Editáveis se aplicável
        if (isEditaveisContext) {
          let editPayload = { ...storePayload };
          for (let attempt = 0; attempt < 8; attempt++) {
            const { error: errEdit } = await supabase
              .from('stores')
              .update(editPayload)
              .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%,slug.eq.editaveis-do-canva');

            if (!errEdit) {
              console.log('[ApiDomainManager] ✅ Tabela stores atualizada via variantes Editáveis!');
              break;
            }

            const colMatch = errEdit.message?.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
              delete editPayload[colMatch[1]];
              continue;
            }
            break;
          }
        }
      } catch (storeErr) {
        console.warn('[ApiDomainManager] Erro ao salvar credenciais diretamente em stores:', storeErr);
      }
    }

    // 3. Atualiza via StoreDataContext (que persiste em stores, site_settings e store_config)
    await updateStoreConfig({
      mpAccessToken: cleanMpToken,
      telegramBotToken: cleanTgToken,
      telegramChatId: cleanChatId,
      whatsappApiProvider: cleanWaProvider,
      whatsappApiUrl: cleanWaUrl,
      whatsappApiToken: cleanWaToken,
      whatsappNotifyPhone: cleanWaPhone,
    });

    // 4. Atualiza o TenantContext silenciosamente sem recarregar a tela
    try {
      if (updateCurrentStore) {
        updateCurrentStore({
          mp_access_token: cleanMpToken || null,
          telegram_bot_token: cleanTgToken || null,
          telegram_chat_id: cleanChatId || null,
          whatsapp_api_provider: cleanWaProvider || null,
          whatsapp_api_url: cleanWaUrl || null,
          whatsapp_api_token: cleanWaToken || null,
          whatsapp_notify_phone: cleanWaPhone || null,
          theme_settings: {
            ...(currentStore?.theme_settings || {}),
            mp_access_token: cleanMpToken || null,
            telegram_bot_token: cleanTgToken || null,
            telegram_chat_id: cleanChatId || null,
            whatsapp_api_provider: cleanWaProvider || null,
            whatsapp_api_url: cleanWaUrl || null,
            whatsapp_api_token: cleanWaToken || null,
            whatsapp_notify_phone: cleanWaPhone || null,
          }
        });
      }
      await refreshTenant(true); // silent refresh
    } catch (rErr) {
      console.warn('[ApiDomainManager] Aviso ao atualizar tenant:', rErr);
    }

    // Mantém os estados locais preenchidos
    setMpAccessToken(cleanMpToken);
    setTelegramBotToken(cleanTgToken);
    setTelegramChatId(cleanChatId);
    setWhatsappApiProvider(cleanWaProvider);
    setWhatsappApiUrl(cleanWaUrl);
    setWhatsappApiToken(cleanWaToken);
    setWhatsappNotifyPhone(cleanWaPhone);

    setIsSavingApis(false);
    setApiSaveSuccess(true);
    showNotification('Chaves de API salvas com sucesso!', 'success');
    setTimeout(() => setApiSaveSuccess(false), 3500);
  };

  const handleTestTelegram = async () => {
    const cleanToken = telegramBotToken.trim();
    const cleanChat = telegramChatId.trim();

    if (!cleanToken || !cleanChat) {
      setTestTelegramStatus({
        success: false,
        message: 'Preencha o Token do Bot e o Chat ID antes de testar.',
      });
      return;
    }

    setTestTelegramLoading(true);
    setTestTelegramStatus(null);

    let sendSuccess = false;
    let feedbackMsg = '';

    // 1. Tenta via endpoint serverless (/api/notify-abandoned-cart)
    try {
      const res = await fetch('/api/notify-abandoned-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'test',
          telegram_bot_token: cleanToken,
          telegram_chat_id: cleanChat,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          sendSuccess = true;
          feedbackMsg = 'Mensagem de teste enviada com sucesso! Verifique seu Telegram.';
        } else {
          feedbackMsg = data.error || data.warning || 'Não foi possível conectar ao Telegram.';
        }
      }
    } catch (apiErr) {
      console.warn('[ApiDomainManager] Endpoint /api/notify-abandoned-cart indisponível, tentando envio direto...', apiErr);
    }

    // 2. Fallback direto via Telegram Bot API (útil no desenvolvimento local ou caso a API serverless não esteja ativa)
    if (!sendSuccess) {
      try {
        const directRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChat,
            text: `🔔 *TESTE DE INTEGRAÇÃO DO TELEGRAM*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ *Status:* Bot conectado com sucesso!\n🏪 *Loja:* ${currentStore?.name || 'Sua Loja'}\n📅 *Data/Hora:* ${new Date().toLocaleString('pt-BR')}\n\nTudo pronto! Suas notificações automáticas de pedidos, pagamentos e carrinhos abandonados funcionarão perfeitamente.`,
            parse_mode: 'Markdown',
          }),
        });

        const directData = await directRes.json();
        if (directData.ok) {
          sendSuccess = true;
          feedbackMsg = 'Mensagem de teste enviada com sucesso! Verifique seu Telegram.';
        } else {
          feedbackMsg = directData.description || feedbackMsg || 'Erro retornado pela API do Telegram.';
        }
      } catch (directErr: any) {
        feedbackMsg = directErr.message || feedbackMsg || 'Falha ao conectar com o Telegram.';
      }
    }

    setTestTelegramStatus({
      success: sendSuccess,
      message: feedbackMsg || (sendSuccess ? 'Mensagem de teste enviada com sucesso!' : 'Falha no teste do Telegram.'),
    });
    setTestTelegramLoading(false);
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
            Gerencie o endereço web exclusivo da sua loja e credenciais de integração (Mercado Pago, Telegram e Melhor Envio)
          </p>
        </div>
      </div>

      {/* 0. SEÇÃO DO SUBDOMÍNIO AUTOMÁTICO OFICIAL */}
      {(() => {
        const rawCustom = currentStore?.custom_domain;
        const defaultSubdomain = currentStore?.slug ? `${currentStore.slug}.ajpstore.com.br` : 'sualoja.ajpstore.com.br';
        const activeWebDomain = (rawCustom && !rawCustom.startsWith('seudominio')) ? rawCustom.replace(/^https?:\/\//, '') : defaultSubdomain;
        const fullStoreUrl = `https://${activeWebDomain}`;

        return (
          <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-sky-500/30 shadow-lg text-white space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center text-base font-black shadow-md shadow-cyan-500/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Endereço Oficial da Sua Loja</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ativo e Online
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Subdomínio automático gerado para o seu negócio na infraestrutura AJPSTORE
                  </p>
                </div>
              </div>

              {/* Botões de Ação Imediata */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(fullStoreUrl);
                      setCopiedKey('store_url');
                      setTimeout(() => setCopiedKey(null), 2500);
                      showNotification('Link da loja copiado com sucesso!', 'success');
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === 'store_url' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                <a
                  href={fullStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 group cursor-pointer"
                >
                  <span>Visitar Loja</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-950 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>

            {/* Caixa em Destaque com o Domínio Clicável */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-sky-500/20 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 tracking-wider">
                  Link Público para Clientes:
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={fullStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm sm:text-base font-bold text-white hover:text-cyan-300 hover:underline flex items-center gap-2 group transition-colors"
                  >
                    <span>{fullStoreUrl}</span>
                    <ExternalLink className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SSL Automático • Sem Taxas por Pedido</span>
              </div>
            </div>
          </div>
        );
      })()}

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
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#FFA6DF]/40 shadow-sm space-y-6">
        
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

            <div className="flex items-center gap-2">
              {mpAccessToken ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  Token Preenchido
                </span>
              ) : (
                <span className="text-[11px] bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                  Pendente
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveMpOnly}
                disabled={isSavingMpOnly}
                className="px-3.5 py-1.5 bg-[#009EE3] hover:bg-[#0082ba] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                title="Salvar Access Token do Mercado Pago imediatamente"
              >
                {isSavingMpOnly ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
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

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Access Token de Produção (Mercado Pago)
            </label>
            <div className="relative flex items-center">
              <input
                type={showMpToken ? "text" : "password"}
                value={mpAccessToken}
                onChange={(e) => setMpAccessToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveMpOnly();
                  }
                }}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                name="mp_token_field"
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pegue seu Access Token em: <strong>Mercado Pago Developers &gt; Suas Aplicações &gt; Credenciais de Produção</strong>. 
                <br />
                💡 <em>Com o token preenchido e salvo, os pedidos pagos via Pix ou Cartão são aprovados e liberados de forma 100% automática na tela do cliente.</em>
              </p>

              {mpSaveSuccess && (
                <span className="text-[11px] text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shrink-0 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Salvo com Sucesso no Banco!
                </span>
              )}
              {mpSaveError && (
                <span className="text-[11px] text-rose-700 bg-rose-100 border border-rose-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shrink-0 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  {mpSaveError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2.2 Notificações Automáticas: WhatsApp API & Telegram */}
        <div className="p-4 sm:p-6 bg-slate-50/80 rounded-3xl border border-slate-200 space-y-5">
          {/* Seletor de Canal de Notificação */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Canal de Alertas:</span>
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setNotificationChannel('whatsapp')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    notificationChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp API</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationChannel('telegram')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    notificationChannel === 'telegram'
                      ? 'bg-[#229ED9] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#229ED9] hover:bg-white/60'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram Bot</span>
                </button>
              </div>
            </div>

            {notificationChannel === 'whatsapp' ? (
              whatsappNotifyPhone && (whatsappApiProvider === 'callmebot' ? whatsappApiToken : whatsappApiUrl) ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  WhatsApp Configurado
                </span>
              ) : (
                <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  Recomendado
                </span>
              )
            ) : (
              telegramBotToken && telegramChatId ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-100 border border-sky-300 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  Telegram Configurado
                </span>
              ) : (
                <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                  Opcional
                </span>
              )
            )}
          </div>

          {/* PAINEL WHATSAPP API */}
          {notificationChannel === 'whatsapp' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-sm">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Notificações Automáticas no WhatsApp (WhatsApp API)</h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Receba notificações imediatas no seu próprio WhatsApp a cada novo pedido, pagamento aprovado ou carrinho abandonado.
                  </p>
                </div>
              </div>

              {/* Seletor de Provedor de WhatsApp */}
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 space-y-2">
                <label className="block text-xs font-bold text-emerald-950">
                  Provedor / Tipo de Integração WhatsApp:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsappApiProvider('evolution')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      whatsappApiProvider === 'evolution'
                        ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <span className="font-bold block text-slate-900">Evolution API / Z-API</span>
                    <span className="text-[10px] text-slate-500">Gateway Próprio / Instância (Recomendado)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappApiProvider('callmebot')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      whatsappApiProvider === 'callmebot'
                        ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <span className="font-bold block text-slate-900">CallMeBot (Grátis)</span>
                    <span className="text-[10px] text-slate-500">Sem servidor, ativação em 15 segundos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappApiProvider('webhook')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      whatsappApiProvider === 'webhook'
                        ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <span className="font-bold block text-slate-900">Webhook / n8n / Zapier</span>
                    <span className="text-[10px] text-slate-500">Disparo via URL POST customizada</span>
                  </button>
                </div>
              </div>

              {/* Formulário de Configuração WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo: Número de WhatsApp do Lojista */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Seu Número de WhatsApp (com DDD) *
                  </label>
                  <input
                    type="text"
                    value={whatsappNotifyPhone}
                    onChange={(e) => setWhatsappNotifyPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999 ou 5511999999999"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Número onde você receberá as notificações de vendas e clientes.
                  </span>
                </div>

                {/* Campos dependendo do provedor */}
                {whatsappApiProvider !== 'callmebot' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      URL da API / Endpoint (POST) *
                    </label>
                    <input
                      type="text"
                      value={whatsappApiUrl}
                      onChange={(e) => setWhatsappApiUrl(e.target.value)}
                      placeholder="Ex: https://api.z-api.io/instances/.../send-text"
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Compatível com Evolution API, Z-API, WPPConnect, Baileys ou Webhook.
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      API Key do CallMeBot *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showWaToken ? "text" : "password"}
                        value={whatsappApiToken}
                        onChange={(e) => setWhatsappApiToken(e.target.value)}
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        name="wa_token_callmebot"
                        placeholder="Ex: 123456"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken(!showWaToken)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showWaToken ? "Ocultar" : "Visualizar"}
                      >
                        {showWaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Chave gerada pelo bot gratuito do CallMeBot.
                    </span>
                  </div>
                )}

                {whatsappApiProvider !== 'callmebot' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Token de Autenticação / API Key (Opcional ou Conforme sua API)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showWaToken ? "text" : "password"}
                        value={whatsappApiToken}
                        onChange={(e) => setWhatsappApiToken(e.target.value)}
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        name="wa_token_custom"
                        placeholder="Ex: B610C739281... ou Bearer Token"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken(!showWaToken)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showWaToken ? "Ocultar" : "Visualizar"}
                      >
                        {showWaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Enviado automaticamente nos headers <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">apikey</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">Client-Token</code> e <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">Authorization: Bearer</code>.
                    </span>
                  </div>
                )}
              </div>

              {/* Dica do CallMeBot se selecionado */}
              {whatsappApiProvider === 'callmebot' && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-emerald-800">
                    💡 Como obter sua API Key Grátis do CallMeBot em 15 segundos:
                  </span>
                  <ol className="list-decimal list-inside text-[11px] text-emerald-900/90 space-y-0.5 pl-1">
                    <li>Envie uma mensagem para o número internacional do CallMeBot: <a href="https://wa.me/34911980460?text=I%20allow%20callmebot%20to%20send%20me%20messages" target="_blank" rel="noopener noreferrer" className="underline font-bold text-emerald-700">+34 911 98 04 60</a></li>
                    <li>Envie exatamente o texto: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">I allow callmebot to send me messages</code></li>
                    <li>O bot responderá imediatamente com sua <strong>API Key</strong> de 6 dígitos. Cole-a no campo acima e teste!</li>
                  </ol>
                </div>
              )}

              {/* Feedback de Teste WhatsApp */}
              {testWaStatus && (
                <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in ${
                  testWaStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {testWaStatus.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium">{testWaStatus.message}</span>
                </div>
              )}

              {/* Botão de Teste WhatsApp */}
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testWaLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                >
                  {testWaLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando teste no WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 text-emerald-100" />
                      <span>Testar Notificação no WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PAINEL TELEGRAM BOT */}
          {notificationChannel === 'telegram' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                <div className="w-6 h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-xs">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <span>Notificações Automáticas no Telegram Bot</span>
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
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      name="tg_token_field"
                      placeholder="Ex: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-sky-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#229ED9] font-mono text-slate-800 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTgToken(!showTgToken)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showTgToken ? "Ocultar Token" : "Visualizar Token"}
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

              {/* Feedback de Teste Telegram */}
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

              {/* Botão de Teste Telegram */}
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
          )}
        </div>

        {/* 2.3 Integração Melhor Envio (Cotação 100% via API) */}
        <div className="p-4 sm:p-5 bg-orange-50/60 rounded-3xl border border-orange-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                ME
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Integração Melhor Envio</span>
                  <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                    Cotação 100% via API
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cálculo automático em tempo real com Jadlog, Correios (PAC/SEDEX), Loggi e Latam Cargo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {melhorEnvioToken ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  API Conectada
                </span>
              ) : (
                <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                  Pendente
                </span>
              )}

              {/* Interruptor Liga / Desliga */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={melhorEnvioEnabled}
                  onChange={(e) => setMelhorEnvioEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CEP de Origem da Loja */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span>CEP de Origem (Postagem da Loja) *</span>
              </label>
              <input
                type="text"
                value={originCep}
                onChange={(e) => handleOriginCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-orange-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
              />
              {originCityState ? (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{originCityState}</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1">
                  Endereço de onde suas encomendas saem para entrega.
                </p>
              )}
            </div>

            {/* Token da API */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Token da API do Melhor Envio (Bearer Token)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showMeToken ? "text" : "password"}
                  value={melhorEnvioToken}
                  onChange={(e) => setMelhorEnvioToken(e.target.value)}
                  placeholder="Cole o seu Token de Acesso gerado no Melhor Envio..."
                  className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-orange-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMeToken(!showMeToken)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showMeToken ? "Ocultar Token" : "Visualizar Token"}
                >
                  {showMeToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Gere em: <a href="https://melhorenvio.com.br/painel/gerenciar/tokens" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline font-bold">Painel do Melhor Envio &gt; Tokens</a>.
              </p>
            </div>
          </div>

          {/* Feedback de Teste da API do Melhor Envio */}
          {testMeResults && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
              testMeResults.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {testMeResults.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testMeResults.message}</span>
              </div>
              {testMeResults.quotes && testMeResults.quotes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {testMeResults.quotes.map((q: any, idx: number) => (
                    <div key={idx} className="bg-white/80 border border-emerald-200/80 p-2.5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold block text-slate-900">{q.name}</span>
                        <span className="text-[10px] text-slate-500">{q.deadline}</span>
                      </div>
                      <span className="font-black text-emerald-700">
                        R$ {Number(q.price).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botão de Teste da API */}
          <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-slate-500">
              💡 Todas as cotações no carrinho e na página do produto serão calculadas <strong>100% via API</strong>.
            </p>
            <button
              type="button"
              onClick={handleTestMelhorEnvio}
              disabled={testMeLoading}
              className="px-4 py-2 bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {testMeLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cotando via API...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Testar Cotação da API</span>
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
            type="button"
            onClick={() => handleSaveApis()}
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

      </div>

    </div>
  );
};
