import { supabase } from '../lib/supabase';
import { Store, StoreUser, DomainStatus } from '../types';
import { slugify } from '../utils/slug';
import { cloneStoreTemplate } from './storeCloneService';
import { saveStoreConfigInSupabase } from './storeConfigService';

export interface CreateStoreInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientPassword?: string;
  storeName?: string;
  customDomain?: string;
  whatsappNumber?: string;
  whatsappDisplay?: string;
  instagram?: string;
  slogan?: string;
  address?: string;
  workingHours?: string;
  mpAccessToken?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  cloneBaseCatalog?: boolean;
  sourceMatrizStoreId?: string;
  monthlyFee?: number;
  initialDays?: number;
  subscriptionStatus?: 'active' | 'trial' | 'suspended';
}

export interface StoreWithStats extends Store {
  productsCount?: number;
  ordersCount?: number;
}

export const MATRIZ_DEFAULT_STORE_DATA: Partial<Store> = {
  id: 'suamarcaaqui',
  name: 'SUAMARCAAQUI',
  store_name: 'SUAMARCAAQUI',
  slug: 'suamarcaaqui',
  custom_domain: 'suamarcaaqui.com.br',
  domain_status: 'active',
  is_active: true,
  subscription_status: 'active',
  expires_at: '2099-12-31T23:59:59.000Z',
  monthly_fee: 0.00,
  owner_name: 'Super Admin',
  client_name: 'Super Admin',
  owner_email: 'admin@suamarcaaqui.com.br',
  client_email: 'admin@suamarcaaqui.com.br',
  admin_password: 'admin',
  whatsapp_number: '5511999999999',
  whatsapp_display: '(11) 99999-9999',
  instagram: 'suamarcaaqui',
  slogan: 'Papelaria & Festas Personalizadas',
  address: 'São Paulo, SP',
  working_hours: 'Segunda a Sábado, 09h às 18h',
  theme_settings: {
    primary_color: '#FF1493',
    secondary_color: '#00a8e8',
    color_palette: 'pink_pastel',
    theme_layout: 'classic'
  }
};

/**
 * Garante que a loja modelo oficial SUAMARCAAQUI esteja cadastrada e presente na tabela stores do Supabase
 */
export async function ensureMatrizStoreExists(): Promise<Store> {
  try {
    // 1. Verifica se já existe por slug = 'suamarcaaqui', id = 'suamarcaaqui' ou id = 'store_default'
    const { data: existingStore } = await supabase
      .from('stores')
      .select('*')
      .or('slug.eq.suamarcaaqui,id.eq.suamarcaaqui,id.eq.store_default')
      .limit(1)
      .maybeSingle();

    if (existingStore) {
      if (existingStore.subscription_status !== 'active' || existingStore.expires_at !== '2099-12-31T23:59:59.000Z' || existingStore.monthly_fee !== 0) {
        supabase
          .from('stores')
          .update({
            subscription_status: 'active',
            expires_at: '2099-12-31T23:59:59.000Z',
            monthly_fee: 0.00
          })
          .eq('id', existingStore.id)
          .then();
      }
      return {
        ...existingStore,
        slug: 'suamarcaaqui',
        name: existingStore.name || 'SUAMARCAAQUI',
        store_name: existingStore.store_name || 'SUAMARCAAQUI',
        subscription_status: 'active',
        monthly_fee: 0.00,
        expires_at: '2099-12-31T23:59:59.000Z',
      } as Store;
    }

    // 2. Se não existir, insere a loja oficial modelo SUAMARCAAQUI na tabela stores do Supabase
    console.log('[storeManagementService] 🏬 Cadastrando loja modelo SUAMARCAAQUI na tabela stores do Supabase...');
    const payload: any = {
      ...MATRIZ_DEFAULT_STORE_DATA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let currentPayload = { ...payload };
    let insertedStore: any = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await supabase
        .from('stores')
        .insert([currentPayload])
        .select()
        .single();

      if (!res.error) {
        insertedStore = res.data;
        break;
      }

      console.warn(`[storeManagementService] Tentativa ${attempt + 1} de cadastrar SUAMARCAAQUI:`, res.error.message);
      const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        delete currentPayload[colMatch[1]];
        continue;
      }
      break;
    }

    if (insertedStore) {
      console.log('[storeManagementService] ✅ Loja modelo SUAMARCAAQUI cadastrada com sucesso no Supabase:', insertedStore.id);
      return insertedStore as Store;
    }
  } catch (err) {
    console.warn('[storeManagementService] Aviso ao garantir loja modelo SUAMARCAAQUI no Supabase:', err);
  }

  return MATRIZ_DEFAULT_STORE_DATA as Store;
}

/**
 * Retorna a loja atualmente configurada como Matriz / Base no sistema.
 */
export async function getMatrizStore(): Promise<Store> {
  try {
    const { data: stores } = await supabase.from('stores').select('*');
    if (stores && stores.length > 0) {
      // 1. Loja explicitamente marcada como matriz
      const explicit = stores.find((s) => Boolean(s.is_matriz));
      if (explicit) return explicit as Store;

      // 2. Loja oficial base SUAMARCAAQUI
      const suamarca = stores.find(
        (s) => s.slug === 'suamarcaaqui' || s.id === 'suamarcaaqui' || s.id === 'store_default'
      );
      if (suamarca) return suamarca as Store;

      return stores[0] as Store;
    }
  } catch (err) {
    console.warn('[storeManagementService] Erro ao buscar loja matriz:', err);
  }
  return MATRIZ_DEFAULT_STORE_DATA as Store;
}

/**
 * Define qualquer loja como Matriz / Base do sistema (removendo a marcação das demais).
 */
export async function setStoreAsMatriz(storeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[storeManagementService] 👑 Definindo loja "${storeId}" como Matriz...`);

    // 1. Remove is_matriz das outras lojas
    await supabase
      .from('stores')
      .update({ is_matriz: false })
      .neq('id', storeId);

    // 2. Marca a loja escolhida como matriz vitalícia
    const { error } = await supabase
      .from('stores')
      .update({
        is_matriz: true,
        subscription_status: 'active',
        monthly_fee: 0.00,
        expires_at: '2099-12-31T23:59:59.000Z'
      })
      .eq('id', storeId);

    if (error) {
      console.warn('[storeManagementService] Aviso ao persistir is_matriz:', error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[storeManagementService] Erro ao definir matriz:', err);
    return { success: false, error: err.message || 'Erro ao definir matriz.' };
  }
}

/**
 * 1. Lista todas as lojas cadastradas no SaaS para o Painel Master (incluindo a Loja Matriz Oficial SUAMARCAAQUI)
 */
export async function fetchAllStores(): Promise<{ data: StoreWithStats[]; error: string | null }> {
  try {
    console.log('[storeManagementService] 📋 Buscando lista de lojas no Supabase...');
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storeManagementService] ❌ Erro ao listar lojas:', error);
      return { data: [], error: error.message };
    }

    // Retorna as lojas cadastradas no banco sem recriar artificialmente lojas excluídas
    let allStores = stores ? [...stores] : [];

    // Busca contagem de produtos por loja
    const { data: productsData } = await supabase
      .from('products')
      .select('store_id');

    const countsMap: Record<string, number> = {};
    if (productsData) {
      productsData.forEach((p) => {
        const isBase = p.store_id === 'suamarcaaqui' || p.store_id === 'store_default' || !p.store_id;
        const sId = isBase ? 'suamarcaaqui' : p.store_id;
        countsMap[sId] = (countsMap[sId] || 0) + 1;
      });
      // Agrega contagem para Editáveis do Canva
      countsMap['store_editaveisdocanva'] = (countsMap['store_editaveisdocanva'] || 0) + (countsMap['matriz'] || 0);
    }

    const now = Date.now();
    const withStats: StoreWithStats[] = allStores.map((st) => {
      // Identifica a loja matriz/base (por is_matriz ou slug/id suamarcaaqui)
      const isBaseStore = Boolean(st.is_matriz) || st.slug === 'suamarcaaqui' || st.id === 'suamarcaaqui' || st.id === 'store_default';
      let daysRemaining: number | null = null;
      let isExpired = false;
      let isExpiringSoon = false;

      // Normaliza Editáveis do Canva como loja comum (slug: editaveisdocanva, id: store_editaveisdocanva, remove Super Admin)
      const isEditaveisCanva = 
        st.slug === 'matriz' || 
        st.id === 'matriz' || 
        st.slug === 'editaveisdocanva' ||
        st.name?.toLowerCase().includes('editáveis') || 
        st.name?.toLowerCase().includes('editaveis');

      if (isEditaveisCanva) {
        if (st.expires_at) {
          const expYear = new Date(st.expires_at).getFullYear();
          if (expYear > 2030) {
            const target180DaysExp = new Date(now + 180 * 24 * 60 * 60 * 1000).toISOString();
            st.expires_at = target180DaysExp;
          }
        }
        if (st.id === 'matriz' || st.slug === 'matriz' || st.owner_name === 'Super Admin' || st.client_name === 'Super Admin') {
          migrateMatrizToRegularStore(st.id);
        }
      }

      if (!isBaseStore) {
        if (st.subscription_status === 'suspended') {
          isExpired = true;
        } else if (st.expires_at) {
          const expTime = new Date(st.expires_at).getTime();
          const diffMs = expTime - now;
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffMs <= 0) {
            isExpired = true;
          } else if (daysRemaining <= 5) {
            isExpiringSoon = true;
          }
        }
      }

      const resolvedName = isBaseStore ? (st.name || st.store_name || 'SUAMARCAAQUI') : (st.name || st.store_name || 'Loja sem nome');
      const resolvedId = isBaseStore 
        ? 'suamarcaaqui' 
        : (isEditaveisCanva && (st.id === 'matriz' || !st.id) ? 'store_editaveisdocanva' : st.id);
      const resolvedSlug = isBaseStore 
        ? 'suamarcaaqui' 
        : (isEditaveisCanva && st.slug === 'matriz' ? 'editaveisdocanva' : (st.slug || (st.name || st.store_name || 'loja').toLowerCase().replace(/[^a-z0-9]/g, '') || 'loja'));

      const resolvedOwnerName = isBaseStore
        ? 'Super Admin'
        : (isEditaveisCanva && (st.owner_name === 'Super Admin' || !st.owner_name)
          ? 'Editáveis do Canva'
          : (st.owner_name || st.client_name || 'Cliente'));
      const resolvedClientName = resolvedOwnerName;

      const resolvedOwnerEmail = isBaseStore
        ? 'admin@suamarcaaqui.com.br'
        : (isEditaveisCanva && (st.owner_email === 'admin@editaveisdocanva.com.br' || !st.owner_email)
          ? 'contato@editaveisdocanva.com.br'
          : (st.owner_email || st.client_email || null));
      const resolvedClientEmail = resolvedOwnerEmail;

      const resolvedPassword = st.admin_password || 'admin';
      const storeIdKey = isBaseStore ? 'suamarcaaqui' : resolvedId;

      return {
        ...st,
        id: resolvedId,
        name: resolvedName,
        store_name: st.store_name || resolvedName,
        slug: resolvedSlug,
        owner_name: resolvedOwnerName,
        client_name: resolvedClientName,
        owner_email: resolvedOwnerEmail,
        client_email: resolvedClientEmail,
        admin_password: resolvedPassword,
        is_matriz: isBaseStore,
        domain_status: st.domain_status || 'active',
        subscription_status: isBaseStore ? 'active' : (st.subscription_status || 'trial'),
        isTrial: !isBaseStore && st.subscription_status === 'trial',
        monthly_fee: isBaseStore ? 0.00 : (st.monthly_fee !== undefined && st.monthly_fee !== null ? Number(st.monthly_fee) : 50.00),
        daysRemaining: isBaseStore ? null : daysRemaining,
        isExpired: isBaseStore ? false : isExpired,
        isExpiringSoon: isBaseStore ? false : isExpiringSoon,
        productsCount: countsMap[storeIdKey] || countsMap[st.id] || 0,
      };
    });

    return { data: withStats, error: null };
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Exceção ao consultar lojas:', err);
    return { data: [], error: err.message };
  }
}

/**
 * 2. Cadastra uma nova loja / cliente com clonagem de catálogo opcional
 */
export async function createStoreWithClient(
  input: CreateStoreInput
): Promise<{ 
  store: Store | null; 
  error: string | null; 
  dnsInfo?: { cnameRecord: string; aRecord: string; domain: string };
  cloneResult?: any;
}> {
  try {
    // 1. Extração garantida e prévia do nome da loja a partir do formulário / input
    const storeName = (input.storeName && input.storeName.trim()) || 'suamarcaaqui';

    // 2. Criação do slug e domínio padrão garantindo que storeName já foi declarado
    const storeSlug = slugify(storeName) || (storeName ? storeName.toLowerCase().replace(/[^a-z0-9]/g, '') : '') || `loja${Date.now()}`;

    const rawDomain = input.customDomain 
      ? input.customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
      : '';

    // URL base de hospedagem da plataforma (via .env ou hostname atual do navegador)
    const baseHost = (import.meta as any).env?.VITE_BASE_DOMAIN || 
      (typeof window !== 'undefined' && window.location.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)
        ? window.location.hostname.replace(/^www\./, '')
        : 'editaveisdocanva.com.br');

    const defaultDomain = `${storeSlug}.${baseHost}`;
    const finalDomain = rawDomain && rawDomain.trim() !== '' 
      ? rawDomain 
      : defaultDomain;

    const newStoreId = `store_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    console.log('[storeManagementService] 🚀 Criando nova loja:', {
      id: newStoreId,
      name: storeName,
      slug: storeSlug,
      customDomain: finalDomain,
      isCustom: Boolean(rawDomain)
    });

    // 1. Validar duplicidade de domínio (se for um domínio real customizado)
    let domainToSave: string | null = finalDomain;
    if (finalDomain && finalDomain !== 'seudominio') {
      const { data: existingDomain } = await supabase
        .from('stores')
        .select('id, name')
        .eq('custom_domain', finalDomain)
        .maybeSingle();

      if (existingDomain) {
        return { store: null, error: `O endereço de domínio "${finalDomain}" já está associado à loja "${existingDomain.name}".` };
      }
    } else if (finalDomain === 'seudominio') {
      // Se 'seudominio' já existir em outra loja, evita colisão de restrição UNIQUE no banco
      const { data: existingDefault } = await supabase
        .from('stores')
        .select('id')
        .eq('custom_domain', 'seudominio')
        .maybeSingle();

      if (existingDefault) {
        domainToSave = `seudominio-${storeSlug}`;
      }
    }

    // 2. Inserir a nova loja na tabela stores com exatamente os dados digitados pelo Super Admin
    const resolvedStoreName = storeName;
    const resolvedClientName = input.clientName.trim();
    const resolvedClientEmail = input.clientEmail.toLowerCase().trim();
    const resolvedPassword = (input.clientPassword && input.clientPassword.trim()) || 'admin';

    const days = input.initialDays !== undefined ? input.initialDays : 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const monthlyFee = input.monthlyFee !== undefined ? input.monthlyFee : 50.00;

    const storePayload: any = {
      id: newStoreId,
      name: resolvedStoreName,
      store_name: resolvedStoreName,
      slug: storeSlug,
      custom_domain: domainToSave,
      domain_status: rawDomain && rawDomain !== 'seudominio' ? 'pending_dns' : 'ativo',
      is_active: true,
      subscription_status: input.subscriptionStatus || 'trial',
      expires_at: expiresAt,
      monthly_fee: monthlyFee,
      owner_name: resolvedClientName,
      client_name: resolvedClientName,
      owner_email: resolvedClientEmail,
      client_email: resolvedClientEmail,
      owner_phone: input.whatsappNumber?.trim() || input.clientPhone?.trim() || 'SeuWhatsApp',
      admin_password: resolvedPassword,
      // Propriedades padrão / digitadas pelo Super Admin:
      whatsapp_number: input.whatsappNumber?.trim() || 'SeuWhatsApp',
      whatsapp_display: input.whatsappDisplay?.trim() || 'SeuWhatsAppWhatsApp',
      instagram: input.instagram?.trim() || 'suamarcaaqui',
      slogan: input.slogan?.trim() || 'subtitulo da sua loja',
      address: input.address?.trim() || 'seuendereço',
      working_hours: input.workingHours?.trim() || 'SEMPRE ABERTO',
      mp_access_token: input.mpAccessToken?.trim() || null,
      telegram_bot_token: input.telegramBotToken?.trim() || null,
      telegram_chat_id: input.telegramChatId?.trim() || null,
      clone_catalog: input.cloneBaseCatalog !== false,
      theme_settings: {
        primary_color: '#ff3399',
        secondary_color: '#00a8e8'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let currentPayload = { ...storePayload };
    let insertedStore: any = null;
    let storeError: any = null;

    // Tenta inserir o payload completo. Se alguma coluna não existir na tabela stores do banco,
    // remove apenas a coluna específica não encontrada e tenta novamente dinamicamente.
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await supabase
        .from('stores')
        .insert([currentPayload])
        .select()
        .single();

      if (!res.error) {
        insertedStore = res.data;
        storeError = null;
        break;
      }

      storeError = res.error;
      console.warn(`[storeManagementService] Tentativa ${attempt + 1} de insert falhou:`, res.error.message);

      // Detecta se o erro foi coluna ausente no cache de schema do Supabase
      const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        const missingCol = colMatch[1];
        console.warn(`[storeManagementService] Coluna "${missingCol}" ausente em stores, adaptando payload...`);
        delete currentPayload[missingCol];
        continue;
      }

      // Detecta se houve colisão de restrição UNIQUE em custom_domain
      if (res.error.code === '23505' || res.error.message?.toLowerCase().includes('custom_domain')) {
        currentPayload.custom_domain = `seudominio-${storeSlug}-${Date.now().toString(36)}`;
        continue;
      }

      break;
    }

    if (storeError || !insertedStore) {
      console.error('[storeManagementService] ❌ Erro ao criar loja no Supabase:', storeError);
      return { store: null, error: storeError?.message || 'Erro ao gravar loja no banco de dados.' };
    }

    // 3. Salva ou atualiza a tabela store_config exclusivamente com os dados da nova loja
    try {
      await saveStoreConfigInSupabase({
        id: `cfg_${newStoreId}`,
        store_id: newStoreId,
        storeName: resolvedStoreName,
        slogan: input.slogan?.trim() || 'subtitulo da sua loja',
        whatsappNumber: input.whatsappNumber?.trim() || 'SeuWhatsApp',
        whatsappDisplay: input.whatsappDisplay?.trim() || 'SeuWhatsAppWhatsApp',
        instagram: input.instagram?.trim() || 'suamarcaaqui',
        address: input.address?.trim() || 'seuendereço',
        city: 'Brasil',
        workingHours: input.workingHours?.trim() || 'SEMPRE ABERTO',
        minOrderValue: 0.00,
        mpAccessToken: input.mpAccessToken?.trim() || undefined,
        telegramBotToken: input.telegramBotToken?.trim() || undefined,
        telegramChatId: input.telegramChatId?.trim() || undefined,
      }, newStoreId);
    } catch (cfgErr) {
      console.warn('[storeManagementService] Aviso ao inicializar store_config:', cfgErr);
    }

    // 4. Cadastrar usuário na tabela store_users com a senha digitada pelo Super Admin
    try {
      await supabase.from('store_users').insert([{
        store_id: newStoreId,
        email: resolvedClientEmail,
        password_hash: resolvedPassword,
        role: 'owner',
        created_at: new Date().toISOString()
      }]);
    } catch (uErr: any) {
      console.warn('[storeManagementService] Aviso ao cadastrar em store_users:', uErr);
    }

    // 4. Clonar catálogo da loja que está como matriz
    let cloneRes = null;
    if (input.cloneBaseCatalog !== false) {
      let sourceStoreId = input.sourceMatrizStoreId;
      if (!sourceStoreId) {
        const matriz = await getMatrizStore();
        sourceStoreId = matriz?.id || matriz?.slug || 'suamarcaaqui';
      }

      console.log(`[storeManagementService] 🧬 Disparando rotina de clonagem fiel da loja matriz "${sourceStoreId}"...`);
      cloneRes = await cloneStoreTemplate(sourceStoreId, newStoreId, storeName, {
        storeName: storeName,
        slogan: input.slogan?.trim() || 'subtitulo da sua loja',
        whatsappNumber: input.whatsappNumber?.trim() || 'SeuWhatsApp',
        whatsappDisplay: input.whatsappDisplay?.trim() || 'SeuWhatsAppWhatsApp',
        instagram: input.instagram?.trim() || 'suamarcaaqui',
        address: input.address?.trim() || 'seuendereço',
        workingHours: input.workingHours?.trim() || 'SEMPRE ABERTO',
        minOrderValue: 0.00,
        mpAccessToken: input.mpAccessToken?.trim() || undefined,
        telegramBotToken: input.telegramBotToken?.trim() || undefined,
        telegramChatId: input.telegramChatId?.trim() || undefined,
      });
    }

    const dnsInfo = {
      domain: rawDomain,
      cnameRecord: 'cname.vercel-dns.com',
      aRecord: '76.76.21.21'
    };

    return { 
      store: insertedStore as Store, 
      error: null,
      dnsInfo,
      cloneResult: cloneRes
    };
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Falha ao criar loja:', err);
    return { store: null, error: err.message || 'Erro inesperado ao criar loja.' };
  }
}

/**
 * 3. Atualiza domínio personalizado ou status de DNS da loja
 */
export async function updateStoreDomain(
  storeId: string,
  customDomain?: string | null,
  domainStatus: DomainStatus = 'pending_dns'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanDomain = customDomain 
      ? customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
      : null;
    
    const { error } = await supabase
      .from('stores')
      .update({
        custom_domain: cleanDomain || null,
        domain_status: cleanDomain ? domainStatus : 'pending_dns',
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Ativa ou desativa uma loja
 */
export async function toggleStoreActive(
  storeId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('stores')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', storeId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Exclui uma loja e todos os seus dados vinculados (CASCADE seguro)
 * Permite a exclusão de qualquer conta/loja (incluindo matriz/suamarcaaqui) solicitada pelo Super Admin.
 */
export async function deleteStore(
  storeId: string,
  storeSlug?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`[storeManagementService] 🗑️ Iniciando exclusão completa da conta/loja "${storeId}"...`);

    // Coleta identificadores associados (id e slug) para garantir limpeza total
    let resolvedSlug = storeSlug;
    if (!resolvedSlug) {
      const { data: st } = await supabase
        .from('stores')
        .select('id, slug')
        .eq('id', storeId)
        .maybeSingle();
      if (st) {
        resolvedSlug = st.slug;
      }
    }

    const identifiers = [storeId];
    if (resolvedSlug && !identifiers.includes(resolvedSlug)) {
      identifiers.push(resolvedSlug);
    }
    if (storeId === 'suamarcaaqui' || resolvedSlug === 'suamarcaaqui') {
      if (!identifiers.includes('store_default')) identifiers.push('store_default');
      if (!identifiers.includes('store_editaveisdocanva')) identifiers.push('store_editaveisdocanva');
      if (!identifiers.includes('matriz')) identifiers.push('matriz');
    }

    console.log('[storeManagementService] 🧹 Identificadores para exclusão em cascata:', identifiers);

    // 1. Limpeza em cascata de todas as tabelas filhas vinculadas a estes identificadores
    for (const id of identifiers) {
      try { await supabase.from('products').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('categories').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('banners').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('coupons').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('orders').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('store_users').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('store_config').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('store_config').delete().eq('id', `cfg_${id}`); } catch (e) {}
      try { await supabase.from('store_analytics').delete().eq('store_id', id); } catch (e) {}
      try { await supabase.from('site_settings').delete().eq('store_id', id); } catch (e) {}
    }

    // 2. Exclui o registro da tabela stores
    let deleteError: any = null;
    for (const id of identifiers) {
      const { error } = await supabase
        .from('stores')
        .delete()
        .or(`id.eq.${id},slug.eq.${id}`);

      if (error && error.code !== 'PGRST116') {
        deleteError = error;
      }
    }

    // Tentativa direta por ID
    const { error: directErr } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (directErr && deleteError) {
      console.error('[storeManagementService] ❌ Erro ao deletar loja de stores:', directErr);
      return { success: false, error: directErr.message || deleteError.message };
    }

    // 3. Se a loja excluída era a Matriz, promove a próxima loja disponível para ser a nova Matriz
    try {
      const { data: remainingStores } = await supabase
        .from('stores')
        .select('id, is_matriz')
        .order('created_at', { ascending: false });

      if (remainingStores && remainingStores.length > 0) {
        const hasMatriz = remainingStores.some((s) => Boolean(s.is_matriz));
        if (!hasMatriz) {
          await supabase
            .from('stores')
            .update({ is_matriz: true })
            .eq('id', remainingStores[0].id);
        }
      }
    } catch (promErr) {
      console.warn('[storeManagementService] Aviso ao promover nova matriz:', promErr);
    }

    // Limpa identificadores temporários de preview local
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('preview_store_id');
        sessionStorage.removeItem('current_store_slug');
        localStorage.removeItem(`store_${storeId}_mp_access_token`);
      }
    } catch (e) {}

    console.log(`[storeManagementService] ✅ Loja "${storeId}" excluída com sucesso de todas as tabelas!`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Erro inesperado ao excluir loja:', err);
    return { success: false, error: err.message || 'Erro ao excluir loja.' };
  }
}

/**
 * 6. Renova a mensalidade da loja por mais X dias (padrão 30 dias)
 */
export async function renewStoreSubscription(
  storeId: string,
  daysToAdd = 30
): Promise<{ success: boolean; error: string | null; newExpiresAt?: string }> {
  try {
    console.log(`[storeManagementService] 💳 Renovando mensalidade da loja ${storeId} por +${daysToAdd} dias...`);
    
    // 1. Tenta via procedure RPC renew_store_subscription
    const { data: rpcData, error: rpcError } = await supabase.rpc('renew_store_subscription', {
      p_store_id: storeId,
      p_days: daysToAdd
    });

    if (!rpcError && rpcData?.success) {
      return { success: true, error: null, newExpiresAt: rpcData.new_expires_at };
    }

    // 2. Fallback client-side caso a RPC ainda não esteja criada
    const { data: store, error: fetchErr } = await supabase
      .from('stores')
      .select('expires_at')
      .eq('id', storeId)
      .single();

    if (fetchErr || !store) {
      return { success: false, error: fetchErr?.message || 'Loja não encontrada.' };
    }

    const now = Date.now();
    let baseTime = now;
    if (store.expires_at) {
      const currentExp = new Date(store.expires_at).getTime();
      if (currentExp > now) {
        baseTime = currentExp; // Adiciona aos dias restantes
      }
    }

    const newExpiresAt = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from('stores')
      .update({
        expires_at: newExpiresAt,
        subscription_status: 'active',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, error: null, newExpiresAt };
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Erro ao renovar assinatura:', err);
    return { success: false, error: err.message || 'Erro ao renovar assinatura.' };
  }
}

/**
 * 7. Alterna status da assinatura entre ativo e suspenso
 */
export async function toggleStoreSubscription(
  storeId: string,
  newStatus: 'active' | 'suspended'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('stores')
      .update({
        subscription_status: newStatus,
        is_active: newStatus === 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 8. Busca uma loja específica pelo seu slug (ou subdomínio)
 */
export async function getStoreBySlug(
  storeSlug: string
): Promise<{ data: Store | null; error: string | null }> {
  try {
    const cleanSlug = storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (error) {
      console.error('[storeManagementService] ❌ Erro ao consultar loja por slug:', error);
      return { data: null, error: error.message };
    }

    return { data: store as Store | null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * 9. Estende o período de teste/prazo da loja por mais X dias (padrão 30 dias)
 */
export async function extendStoreTrial(
  storeId: string,
  daysToAdd = 30
): Promise<{ success: boolean; error: string | null; newExpiresAt?: string }> {
  try {
    console.log(`[storeManagementService] 🎁 Estendendo prazo da loja ${storeId} por +${daysToAdd} dias...`);
    
    // Tenta via procedure RPC se disponível
    const { data: rpcData, error: rpcError } = await supabase.rpc('extend_store_trial', {
      p_store_id: storeId,
      p_days: daysToAdd
    });

    if (!rpcError && rpcData?.success) {
      return { success: true, error: null, newExpiresAt: rpcData.new_expires_at };
    }

    // Fallback client-side
    const { data: store, error: fetchErr } = await supabase
      .from('stores')
      .select('expires_at, subscription_status')
      .eq('id', storeId)
      .single();

    if (fetchErr || !store) {
      return { success: false, error: fetchErr?.message || 'Loja não encontrada.' };
    }

    const now = Date.now();
    let baseTime = now;
    if (store.expires_at) {
      const currentExp = new Date(store.expires_at).getTime();
      if (currentExp > now) {
        baseTime = currentExp;
      }
    }

    const newExpiresAt = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from('stores')
      .update({
        expires_at: newExpiresAt,
        subscription_status: 'trial',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, error: null, newExpiresAt };
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Erro ao estender período de teste:', err);
    return { success: false, error: err.message || 'Erro ao estender período de teste.' };
  }
}

/**
 * 10. Ativa a assinatura paga da loja (converte de trial/suspenso para active por 30 dias)
 */
export async function activatePaidSubscription(
  storeId: string,
  daysToAdd = 30
): Promise<{ success: boolean; error: string | null; newExpiresAt?: string }> {
  try {
    console.log(`[storeManagementService] 💎 Ativando assinatura paga da loja ${storeId} (+${daysToAdd} dias)...`);
    return await renewStoreSubscription(storeId, daysToAdd);
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Erro ao ativar assinatura:', err);
    return { success: false, error: err.message || 'Erro ao ativar assinatura.' };
  }
}

/**
 * 11. Define diretamente os dias restantes ou data de vencimento da loja a partir de hoje
 */
export async function setStoreExpirationDays(
  storeId: string,
  daysFromNow?: number,
  exactIsoDate?: string
): Promise<{ success: boolean; error: string | null; newExpiresAt?: string }> {
  try {
    let newExpiresAt: string;
    if (exactIsoDate) {
      newExpiresAt = exactIsoDate;
    } else {
      const days = daysFromNow !== undefined ? daysFromNow : 30;
      newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    console.log(`[storeManagementService] 📅 Definindo expiração da loja ${storeId} para: ${newExpiresAt}...`);

    const { error } = await supabase
      .from('stores')
      .update({
        expires_at: newExpiresAt,
        subscription_status: 'active',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (error) {
      console.error('[storeManagementService] ❌ Erro ao atualizar expiração da loja:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null, newExpiresAt };
  } catch (err: any) {
    console.error('[storeManagementService] ❌ Exceção ao atualizar expiração:', err);
    return { success: false, error: err.message || 'Erro ao definir dias de validade.' };
  }
}

/**
 * 12. Migra a loja "matriz" (Editáveis do Canva) para loja normal de cliente com ID e slug próprios
 */
export async function migrateMatrizToRegularStore(currentId: string = 'matriz'): Promise<void> {
  try {
    const targetId = 'store_editaveisdocanva';
    const targetSlug = 'editaveisdocanva';

    console.log('[storeManagementService] 🔄 Atualizando loja Editáveis do Canva no Supabase para loja cliente normal...');

    // 1. Tenta atualizar ID, Slug e remover Super Admin
    const { error: err } = await supabase
      .from('stores')
      .update({
        id: targetId,
        slug: targetSlug,
        name: 'Editáveis do Canva',
        store_name: 'Editáveis do Canva',
        owner_name: 'Editáveis do Canva',
        client_name: 'Editáveis do Canva',
        owner_email: 'contato@editaveisdocanva.com.br',
        client_email: 'contato@editaveisdocanva.com.br',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentId);

    if (!err) {
      console.log('[storeManagementService] ✅ Loja atualizada no Supabase com ID:', targetId);
      await Promise.allSettled([
        supabase.from('products').update({ store_id: targetId }).eq('store_id', currentId),
        supabase.from('categories').update({ store_id: targetId }).eq('store_id', currentId),
        supabase.from('banners').update({ store_id: targetId }).eq('store_id', currentId),
        supabase.from('orders').update({ store_id: targetId }).eq('store_id', currentId),
        supabase.from('store_config').update({ store_id: targetId }).eq('store_id', currentId),
        supabase.from('site_settings').update({ store_id: targetId }).eq('store_id', currentId),
        supabase.from('store_users').update({ store_id: targetId }).eq('store_id', currentId),
      ]);
      return;
    }

    // Se falhar ao atualizar o id (ex: FK restrição), atualiza slug e remove Super Admin
    console.warn('[storeManagementService] Aviso ao atualizar ID (possível FK):', err.message);
    await supabase
      .from('stores')
      .update({
        slug: targetSlug,
        name: 'Editáveis do Canva',
        store_name: 'Editáveis do Canva',
        owner_name: 'Editáveis do Canva',
        client_name: 'Editáveis do Canva',
        owner_email: 'contato@editaveisdocanva.com.br',
        client_email: 'contato@editaveisdocanva.com.br',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentId);
  } catch (e) {
    console.warn('[storeManagementService] Erro na migração para loja normal:', e);
  }
}
