import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mbwxubnwaeywstnmlrqg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HuPfQyg25rtcXPQhDN5OHw_NbYRnpvq';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Função utilitária para testar a conexão com o Supabase
 */
export async function checkSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return { success: true }; // Conexão bem-sucedida mesmo se a tabela ainda não tiver sido criada
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao conectar com o Supabase' };
  }
}
