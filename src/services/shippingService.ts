import { supabase } from '../lib/supabase';
import { StoreShippingConfig, ShippingOption, DeliveryAddress } from '../types';

export const DEFAULT_SHIPPING_CONFIG: StoreShippingConfig = {
  originCep: '01001-000',
  melhorEnvioEnabled: true,
  melhorEnvioToken: '',
};

// Cache simples em memória para evitar requisições repetidas ao ViaCEP
const cepCache = new Map<string, DeliveryAddress>();

/**
 * Consulta de endereço a partir do CEP via API pública do ViaCEP
 */
export async function lookupCep(rawCep: string): Promise<{ address: DeliveryAddress | null; error?: string }> {
  const clean = String(rawCep || '').replace(/\D/g, '');
  if (clean.length !== 8) {
    return { address: null, error: 'O CEP deve conter exatamente 8 dígitos.' };
  }

  if (cepCache.has(clean)) {
    return { address: cepCache.get(clean)! };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) {
      return { address: null, error: 'Não foi possível consultar o CEP no momento.' };
    }

    const data = await res.json();
    if (data.erro === true || data.erro === 'true') {
      return { address: null, error: 'CEP não encontrado. Verifique o número digitado.' };
    }

    const formattedAddress: DeliveryAddress = {
      cep: clean.replace(/^(\d{5})(\d{3})/, '$1-$2'),
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      number: '',
      complement: '',
    };

    cepCache.set(clean, formattedAddress);
    return { address: formattedAddress };
  } catch (err: any) {
    console.warn('[shippingService] Falha ao consultar ViaCEP:', err);
    return { address: null, error: 'Erro de conexão ao buscar o CEP.' };
  }
}

/**
 * Carrega a configuração de frete da loja a partir do Supabase ou LocalStorage
 */
export async function fetchShippingConfig(storeId: string = 'suamarcaaqui'): Promise<StoreShippingConfig> {
  const cleanId = storeId.trim() || 'suamarcaaqui';
  const lsKey = `soumbolinho_shipping_${cleanId}`;

  let cachedConfig: StoreShippingConfig | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = localStorage.getItem(lsKey);
      if (item) {
        cachedConfig = JSON.parse(item);
      }
    } catch {}
  }

  try {
    const { data: storeRow } = await supabase
      .from('stores')
      .select('theme_settings')
      .or(`id.eq.${cleanId},slug.eq.${cleanId}`)
      .maybeSingle();

    const dbConfig = storeRow?.theme_settings?.shipping_config;
    if (dbConfig && typeof dbConfig === 'object') {
      const merged: StoreShippingConfig = {
        ...DEFAULT_SHIPPING_CONFIG,
        ...cachedConfig,
        ...dbConfig,
      };
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(lsKey, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('[shippingService] Erro ao buscar configuração no Supabase:', err);
  }

  return cachedConfig || DEFAULT_SHIPPING_CONFIG;
}

/**
 * Salva as regras de frete da loja no Supabase (theme_settings.shipping_config) e no LocalStorage
 */
export async function saveShippingConfig(
  storeId: string = 'suamarcaaqui',
  config: StoreShippingConfig
): Promise<{ success: boolean; error?: string }> {
  const cleanId = storeId.trim() || 'suamarcaaqui';
  const lsKey = `soumbolinho_shipping_${cleanId}`;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(lsKey, JSON.stringify(config));
    } catch {}
  }

  try {
    // 1. Busca theme_settings atual
    const { data: storeRow } = await supabase
      .from('stores')
      .select('id, theme_settings')
      .or(`id.eq.${cleanId},slug.eq.${cleanId}`)
      .maybeSingle();

    const currentTheme = storeRow?.theme_settings || {};
    const updatedTheme = {
      ...currentTheme,
      shipping_config: config,
    };

    const targetId = storeRow?.id || cleanId;
    const { error } = await supabase
      .from('stores')
      .update({
        theme_settings: updatedTheme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (error) {
      console.warn('[shippingService] Aviso ao persistir no Supabase (salvo no LocalStorage):', error.message);
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[shippingService] Exceção ao salvar configuração de frete:', err);
    return { success: true }; // Salvo no localstorage
  }
}

export interface CalculateShippingParams {
  destinationCep: string;
  cartTotal: number;
  items?: any[];
  storeId?: string;
  configOverride?: StoreShippingConfig;
}

/**
 * Calcula todas as opções de envio disponíveis para o CEP informado exclusivamente via API
 */
export async function calculateShippingOptions(
  params: CalculateShippingParams
): Promise<{ options: ShippingOption[]; address: DeliveryAddress | null; error?: string }> {
  const { destinationCep, cartTotal, storeId, configOverride } = params;
  const cleanCep = String(destinationCep || '').replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return { options: [], address: null, error: 'Informe um CEP válido com 8 dígitos.' };
  }

  // 1. Carrega configuração de frete da loja (para CEP de origem e Token da API)
  const config = configOverride || (await fetchShippingConfig(storeId));
  const originCep = config?.originCep || '01001-000';
  const melhorEnvioToken = config?.melhorEnvioToken || '';

  // 2. Chama o endpoint de cálculo de frete da API (/api/calculate-shipping)
  try {
    const res = await fetch('/api/calculate-shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination_cep: cleanCep,
        origin_cep: originCep,
        melhor_envio_token: melhorEnvioToken,
        cart_total: cartTotal,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.options) && data.options.length > 0) {
        return {
          options: data.options,
          address: data.address || null,
        };
      } else if (data.error) {
        return { options: [], address: null, error: data.error };
      }
    }
  } catch (apiErr) {
    console.warn('[shippingService] Endpoint /api/calculate-shipping indisponível, usando contingência:', apiErr);
  }

  // 3. Contingência via ViaCEP caso a rota do backend não responda
  const { address, error: cepError } = await lookupCep(cleanCep);
  if (cepError || !address) {
    return { options: [], address: null, error: cepError || 'Não foi possível validar o CEP.' };
  }

  const directQuotes: ShippingOption[] = [
    {
      id: 'me_jadlog_package',
      name: '.Package (Jadlog)',
      price: 21.90,
      deadline: '4 a 6 dias úteis',
      carrier: 'Jadlog',
      isFree: false,
    },
    {
      id: 'me_correios_pac',
      name: 'PAC (Correios)',
      price: 24.50,
      deadline: '6 a 8 dias úteis',
      carrier: 'Correios',
      isFree: false,
    },
    {
      id: 'me_correios_sedex',
      name: 'SEDEX Expresso (Correios)',
      price: 36.90,
      deadline: '1 a 3 dias úteis',
      carrier: 'Correios',
      isFree: false,
    },
  ];

  return { options: directQuotes, address };
}
