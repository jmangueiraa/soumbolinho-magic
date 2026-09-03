import { supabase } from '../lib/supabase';
import { StoreConfig } from '../types';
import { STORE_CONFIG as INITIAL_STORE_CONFIG } from '../data/storeConfig';

export function mapSupabaseConfig(item: any): StoreConfig {
  return {
    storeName: item.store_name || item.storeName || INITIAL_STORE_CONFIG.storeName,
    slogan: item.slogan || INITIAL_STORE_CONFIG.slogan,
    whatsappNumber: item.whatsapp_number || item.whatsappNumber || INITIAL_STORE_CONFIG.whatsappNumber,
    whatsappDisplay: item.whatsapp_display || item.whatsappDisplay || INITIAL_STORE_CONFIG.whatsappDisplay,
    instagram: item.instagram || INITIAL_STORE_CONFIG.instagram,
    address: item.address || INITIAL_STORE_CONFIG.address,
    city: item.city || INITIAL_STORE_CONFIG.city,
    workingHours: item.working_hours || item.workingHours || INITIAL_STORE_CONFIG.workingHours,
    minOrderValue: Number(item.min_order_value ?? item.minOrderValue ?? INITIAL_STORE_CONFIG.minOrderValue),
    mpAccessToken: item.mp_access_token || item.mpAccessToken || undefined,
  };
}

/**
 * 1. Busca as configurações da loja do Supabase (tabela site_settings ou store_config)
 */
export async function fetchStoreConfig(): Promise<{ data: StoreConfig; error: string | null }> {
  try {
    console.log('[storeConfigService] 🌐 Buscando configurações no Supabase...');
    
    // Tenta tabela store_config
    const { data, error } = await supabase
      .from('store_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Tenta tabela site_settings como alternativa
      const fallback = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fallback.data) {
        return { data: mapSupabaseConfig(fallback.data), error: null };
      }

      console.warn('[storeConfigService] Nenhuma configuração encontrada no Supabase, usando padrão.');
      return { data: INITIAL_STORE_CONFIG, error: null };
    }

    if (data) {
      console.log('[storeConfigService] ✅ Configurações carregadas do Supabase:', data);
      return { data: mapSupabaseConfig(data), error: null };
    }

    return { data: INITIAL_STORE_CONFIG, error: null };
  } catch (err: any) {
    console.error('[storeConfigService] ❌ Exceção ao consultar configurações:', err);
    return { data: INITIAL_STORE_CONFIG, error: null };
  }
}

/**
 * 2. Salva ou atualiza as configurações da loja no Supabase (UPSERT)
 */
export async function saveStoreConfigInSupabase(
  config: StoreConfig
): Promise<{ success: boolean; error: string | null }> {
  const payload = {
    id: 'default',
    store_name: config.storeName,
    slogan: config.slogan,
    whatsapp_number: config.whatsappNumber,
    whatsapp_display: config.whatsappDisplay,
    instagram: config.instagram,
    address: config.address,
    city: config.city,
    working_hours: config.workingHours,
    min_order_value: config.minOrderValue,
    mp_access_token: config.mpAccessToken || null,
    updated_at: new Date().toISOString(),
  };

  try {
    console.log('[storeConfigService] 💾 Executando UPSERT das configurações no Supabase:', payload);

    // 1. Tentar upsert na tabela store_config
    let { error } = await supabase
      .from('store_config')
      .upsert([payload], { onConflict: 'id' });

    // 2. Se falhar, tenta na tabela site_settings
    if (error) {
      console.warn('[storeConfigService] Tentando tabela site_settings...', error.message);
      const res = await supabase
        .from('site_settings')
        .upsert([payload], { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.error('[storeConfigService] ❌ Erro ao salvar configurações no Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('[storeConfigService] ✅ Configurações salvas no Supabase!');
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[storeConfigService] ❌ Exceção ao salvar configurações:', err);
    return { success: false, error: err.message };
  }
}
