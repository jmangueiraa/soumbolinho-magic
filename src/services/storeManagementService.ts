import { supabase } from '../lib/supabase';
import { Store, StoreUser, DomainStatus, SubscriptionStatus } from '../types';
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
  id: 'store_ajpstore',
  name: 'AJPSTORE',
  store_name: 'AJPSTORE',
  slug: 'ajpstore',
  custom_domain: 'ajpstore.com.br',
  domain_status: 'active',
  is_active: true,
  is_matriz: true,
  subscription_status: 'active',
  expires_at: '2099-12-31T23:59:59.000Z',
  monthly_fee: 0.00,
  owner_name: 'AJPSTORE',
  client_name: 'AJPSTORE',
  owner_email: 'ajpsotre@gmail.com',
  client_email: 'ajpsotre@gmail.com',
  admin_password: 'admin',
  whatsapp_number: '5511999999999',
  whatsapp_display: '(11) 99999-9999',
  instagram: 'ajpstore',
  slogan: 'Sua Loja Oficial',
  address: 'São Paulo, SP',
  working_hours: 'Segunda a Sábado, 09h às 18h',
  logo_url: '/ajpstore-logo.png',
  theme_settings: {
    logo_url: '/ajpstore-logo.png',
    primary_color: '#FF1493',
    secondary_color: '#00a8e8',
    color_palette: 'pink_pastel',
    theme_layout: 'classic'
  }
};

export const EDITAVEIS_MONTHLY_STORE_DATA: Partial<Store> = {
  id: 'store_editaveisdocanva',
  name: 'Editáveis do Canva',
  store_name: 'Editáveis do Canva',
  slug: 'editaveisdocanva',
  custom_domain: 'www.editaveisdocanva.com.br',
  domain_status: 'active',
  is_active: true,
  is_matriz: false,
  subscription_status: 'active',
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  monthly_fee: 50.00,
  owner_name: 'Editáveis do Canva',
  client_name: 'Editáveis do Canva',
  owner_email: 'contato@editaveisdocanva.com.br',
  client_email: 'contato@editaveisdocanva.com.br',
  admin_password: 'admin',
  whatsapp_number: '5521974975884',
  whatsapp_display: '(21) 97497-5884',
  instagram: 'editaveisdocanva',
  slogan: 'Templates e Artes Editáveis no Canva',
  address: 'Rio de Janeiro, RJ',
  working_hours: 'Segunda a Sábado, 09h às 19h',
  theme_settings: {
    primary_color: '#00c4cc',
    secondary_color: '#7d2ae8',
    color_palette: 'purple_elegant',
    theme_layout: 'classic'
  }
};

/**
 * Garante que a loja modelo oficial AJPSTORE esteja cadastrada, marcada como a única Matriz vitalícia
 * e presente na tabela stores do Supabase (removendo is_matriz de qualquer outra loja).
 */
export async function ensureMatrizStoreExists(): Promise<Store> {
  try {
    // 1. Procura se a loja AJPSTORE já existe por slug = 'ajpstore' ou nome ilike '%ajpstore%'
    const { data: existingStore } = await supabase
      .from('stores')
      .select('*')
      .or('slug.eq.ajpstore,name.ilike.%ajpstore%')
      .limit(1)
      .maybeSingle();

    if (existingStore) {
      // Garante que nenhuma outra loja seja matriz
      await supabase
        .from('stores')
        .update({ is_matriz: false })
        .neq('id', existingStore.id);

      // Força AJPSTORE a ser a Matriz Oficial Vitalícia (sem expiração, sem mensalidade)
      await supabase
        .from('stores')
        .update({
          is_matriz: true,
          slug: 'ajpstore',
          name: 'AJPSTORE',
          store_name: 'AJPSTORE',
          subscription_status: 'active',
          expires_at: '2099-12-31T23:59:59.000Z',
          monthly_fee: 0.00,
          updated_at: new Date().toISOString()
        })
      // Garante que a Matriz AJPSTORE possua os 4 produtos padrão cadastrados
      try {
        const { data: existingProds } = await supabase
          .from('products')
          .select('id')
          .or(`store_id.eq.${existingStore.id},store_id.eq.ajpstore,store_id.eq.store_ajpstore`)
          .limit(1);

        if (!existingProds || existingProds.length === 0) {
          console.log('[storeManagementService] 🏬 Matriz AJPSTORE sem produtos. Cadastrando os 4 produtos padrão...');
          await cloneStoreTemplate('ajpstore', existingStore.id, 'AJPSTORE');
        }
      } catch (prodErr) {
        console.warn('[storeManagementService] Aviso ao verificar produtos da matriz:', prodErr);
      }

      return {
        ...existingStore,
        is_matriz: true,
        slug: 'ajpstore',
        name: 'AJPSTORE',
        store_name: 'AJPSTORE',
        subscription_status: 'active',
        monthly_fee: 0.00,
        expires_at: '2099-12-31T23:59:59.000Z',
      } as Store;
    }

    // 2. Se não existir, insere a loja AJPSTORE como Matriz no Supabase
    console.log('[storeManagementService] 🏬 Cadastrando loja AJPSTORE como Matriz no Supabase...');
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

      console.warn(`[storeManagementService] Tentativa ${attempt + 1} de cadastrar AJPSTORE:`, res.error.message);
      const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        delete currentPayload[colMatch[1]];
        continue;
      }
      break;
    }

    if (insertedStore) {
      await supabase.from('stores').update({ is_matriz: false }).neq('id', insertedStore.id);
      console.log('[storeManagementService] ✅ Loja AJPSTORE cadastrada como Matriz:', insertedStore.id);
      try {
        await cloneStoreTemplate('ajpstore', insertedStore.id, 'AJPSTORE');
      } catch {}
      return insertedStore as Store;
    }
  } catch (err) {
    console.warn('[storeManagementService] Aviso ao garantir loja AJPSTORE no Supabase:', err);
  }

  return MATRIZ_DEFAULT_STORE_DATA as Store;
}

/**
 * Retorna a loja atualmente configurada como Matriz / Base no sistema (AJPSTORE).
 */
export async function getMatrizStore(): Promise<Store> {
  try {
    const { data: stores } = await supabase.from('stores').select('*');
    if (stores && stores.length > 0) {
      // 1. AJPSTORE oficial
      const ajp = stores.find((s) => s.slug === 'ajpstore' || (s.name || '').toUpperCase().includes('AJPSTORE'));
      if (ajp) return ajp as Store;

      // 2. Loja explicitamente marcada como matriz
      const explicit = stores.find((s) => Boolean(s.is_matriz));
      if (explicit) return explicit as Store;

      return stores[0] as Store;
    }
  } catch (err) {
    console.warn('[storeManagementService] Erro ao buscar loja matriz:', err);
  }
  return MATRIZ_DEFAULT_STORE_DATA as Store;
}

/**
 * Bloqueado: Apenas AJPSTORE é a Matriz oficial e permanente do sistema.
 * Nenhuma outra loja tem permissão para virar matriz.
 */
export async function setStoreAsMatriz(_storeId: string): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'A loja AJPSTORE é a Matriz fixa e permanente do sistema. Nenhuma outra loja pode ser definida como Matriz.'
  };
}

/**
 * Garante que a loja "Editáveis do Canva" (www.editaveisdocanva.com.br) esteja cadastrada
 * e configurada no Supabase como uma Loja Mensal (Assinatura Ativa de R$ 50,00/mês).
 */
export async function ensureEditaveisMonthlyStoreExists(): Promise<Store> {
  try {
    const now = Date.now();
    const thirtyDaysFromNow = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Procura se já existe por slug, id ou custom_domain
    const { data: existing } = await supabase
      .from('stores')
      .select('*')
      .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%')
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Força a desvinculação da matriz e garante status de Loja Mensal ativa
      const targetExpiresAt = (existing.expires_at && new Date(existing.expires_at).getFullYear() <= 2030 && new Date(existing.expires_at).getTime() > now)
        ? existing.expires_at
        : thirtyDaysFromNow;

      await supabase
        .from('stores')
        .update({
          is_matriz: false,
          subscription_status: 'active',
          monthly_fee: 50.00,
          custom_domain: 'www.editaveisdocanva.com.br',
          domain_status: 'active',
          expires_at: targetExpiresAt,
          name: 'Editáveis do Canva',
          store_name: 'Editáveis do Canva',
          slug: 'editaveisdocanva',
          owner_name: (existing.owner_name && existing.owner_name !== 'Super Admin') ? existing.owner_name : 'Editáveis do Canva',
          client_name: (existing.client_name && existing.client_name !== 'Super Admin') ? existing.client_name : 'Editáveis do Canva',
          owner_email: (existing.owner_email && existing.owner_email !== 'admin@suamarcaaqui.com.br') ? existing.owner_email : 'contato@editaveisdocanva.com.br',
          client_email: (existing.client_email && existing.client_email !== 'admin@suamarcaaqui.com.br') ? existing.client_email : 'contato@editaveisdocanva.com.br',
          admin_password: existing.admin_password || 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      return {
        ...existing,
        name: 'Editáveis do Canva',
        store_name: 'Editáveis do Canva',
        slug: 'editaveisdocanva',
        custom_domain: 'www.editaveisdocanva.com.br',
        domain_status: 'active',
        is_matriz: false,
        subscription_status: 'active',
        monthly_fee: 50.00,
        expires_at: targetExpiresAt,
      } as Store;
    }

    // 2. Se não existir, insere como nova loja mensal no Supabase
    console.log('[storeManagementService] 🏬 Inserindo loja mensal Editáveis do Canva no Supabase...');
    const payload: any = {
      ...EDITAVEIS_MONTHLY_STORE_DATA,
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

      console.warn(`[storeManagementService] Tentativa ${attempt + 1} de cadastrar Editáveis do Canva:`, res.error.message);
      const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        delete currentPayload[colMatch[1]];
        continue;
      }
      break;
    }

    if (insertedStore) {
      console.log('[storeManagementService] ✅ Loja mensal Editáveis do Canva cadastrada com sucesso no Supabase:', insertedStore.id);
      return insertedStore as Store;
    }
  } catch (err) {
    console.warn('[storeManagementService] Aviso ao garantir loja mensal Editáveis do Canva:', err);
  }

  return EDITAVEIS_MONTHLY_STORE_DATA as Store;
}

/**
 * 1. Lista todas as lojas cadastradas no SaaS para o Painel Master (incluindo a Loja Matriz Oficial SUAMARCAAQUI e a Loja Mensal Editáveis do Canva)
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

    let allStores = stores ? [...stores] : [];

    // Garante que a loja Editáveis do Canva esteja presente na listagem da plataforma
    const hasEditaveis = allStores.some((s) => {
      const sSlug = (s.slug || '').toLowerCase();
      const sId = (s.id || '').toLowerCase();
      const sDomain = (s.custom_domain || '').toLowerCase();
      const sName = (s.name || s.store_name || '').toLowerCase();
      return (
        sId === 'store_editaveisdocanva' ||
        sSlug === 'editaveisdocanva' ||
        sSlug === 'editaveis-do-canva' ||
        sDomain.includes('editaveisdocanva') ||
        sName.includes('editáveis do canva') ||
        sName.includes('editaveis do canva')
      );
    });

    if (!hasEditaveis) {
      try {
        const created = await ensureEditaveisMonthlyStoreExists();
        if (created) {
          allStores.push(created);
        }
      } catch (e) {
        console.warn('Fallback para Editáveis do Canva:', e);
        allStores.push(EDITAVEIS_MONTHLY_STORE_DATA as Store);
      }
    }

    // Busca contagem de produtos por loja
    const { data: productsData } = await supabase
      .from('products')
      .select('store_id');

    const countsMap: Record<string, number> = {};
    if (productsData) {
      productsData.forEach((p) => {
        const isBase = p.store_id === 'ajpstore' || p.store_id === 'store_ajpstore' || p.store_id === 'suamarcaaqui' || p.store_id === 'store_default' || !p.store_id;
        const sId = isBase ? 'ajpstore' : p.store_id;
        countsMap[sId] = (countsMap[sId] || 0) + 1;
      });
      // Agrega contagem para Editáveis do Canva
      countsMap['store_editaveisdocanva'] = 
        (countsMap['store_editaveisdocanva'] || 0) + 
        (countsMap['matriz'] || 0) + 
        (countsMap['editaveisdocanva'] || 0);
    }

    const now = Date.now();
    const withStats: StoreWithStats[] = allStores.map((st) => {
      const sSlug = (st.slug || '').toLowerCase();
      const sId = (st.id || '').toLowerCase();
      const sDomain = (st.custom_domain || '').toLowerCase();
      const sName = (st.name || st.store_name || '').toLowerCase();

      // Identifica AJPSTORE como a Matriz oficial e permanente do sistema
      const isAjpStore = 
        sSlug === 'ajpstore' || 
        sName.includes('ajpstore') || 
        sId === 'store_ajpstore';

      // Apenas AJPSTORE é a Matriz oficial e vitalícia. Nenhuma outra loja pode ser matriz.
      const isBaseStore = isAjpStore;

      // Normaliza Editáveis do Canva como Loja Mensal
      const isEditaveisCanva = !isAjpStore && (
        sSlug === 'editaveisdocanva' ||
        sId === 'store_editaveisdocanva' ||
        sDomain.includes('editaveisdocanva.com.br') ||
        sName.includes('editáveis do canva') ||
        sName.includes('editaveis do canva') ||
        sName.includes('editáveis') || 
        sName.includes('editaveis')
      );

      let daysRemaining: number | null = null;
      let isExpired = false;
      let isExpiringSoon = false;

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
        } else if (isEditaveisCanva) {
          daysRemaining = 30;
        }
      }

      // Se for AJPSTORE (Matriz Vitalícia):
      if (isBaseStore) {
        return {
          ...st,
          id: st.id || 'store_ajpstore',
          name: 'AJPSTORE',
          store_name: 'AJPSTORE',
          slug: 'ajpstore',
          custom_domain: st.custom_domain || 'ajpstore.com.br',
          domain_status: (st.domain_status || 'active') as DomainStatus,
          is_active: true,
          is_matriz: true,
          subscription_status: 'active' as SubscriptionStatus,
          isTrial: false,
          monthly_fee: 0.00,
          expires_at: '2099-12-31T23:59:59.000Z',
          daysRemaining: null,
          isExpired: false,
          isExpiringSoon: false,
          owner_name: st.owner_name || 'AJPSTORE',
          client_name: st.client_name || 'AJPSTORE',
          owner_email: st.owner_email || 'ajpsotre@gmail.com',
          client_email: st.client_email || 'ajpsotre@gmail.com',
          admin_password: st.admin_password || 'admin',
          productsCount: countsMap['ajpstore'] || countsMap['store_ajpstore'] || countsMap[st.id] || 0,
        };
      }

      // Se for a loja mensal Editáveis do Canva:
      if (isEditaveisCanva) {
        const target30DaysExp = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
        const validExpiresAt = (st.expires_at && new Date(st.expires_at).getFullYear() <= 2030 && new Date(st.expires_at).getTime() > now)
          ? st.expires_at
          : target30DaysExp;

        return {
          ...st,
          id: st.id || 'store_editaveisdocanva',
          name: 'Editáveis do Canva',
          store_name: 'Editáveis do Canva',
          slug: 'editaveisdocanva',
          custom_domain: 'www.editaveisdocanva.com.br',
          domain_status: 'active' as DomainStatus,
          is_active: st.is_active !== false,
          is_matriz: false,
          subscription_status: (st.subscription_status === 'suspended' ? 'suspended' : 'active') as SubscriptionStatus,
          isTrial: false,
          monthly_fee: (st.monthly_fee && Number(st.monthly_fee) > 0) ? Number(st.monthly_fee) : 50.00,
          expires_at: validExpiresAt,
          daysRemaining: daysRemaining ?? 30,
          isExpired,
          isExpiringSoon,
          owner_name: (st.owner_name && st.owner_name !== 'Super Admin') ? st.owner_name : 'Editáveis do Canva',
          client_name: (st.client_name && st.client_name !== 'Super Admin') ? st.client_name : 'Editáveis do Canva',
          owner_email: (st.owner_email && st.owner_email !== 'admin@suamarcaaqui.com.br') ? st.owner_email : 'contato@editaveisdocanva.com.br',
          client_email: (st.client_email && st.client_email !== 'admin@suamarcaaqui.com.br') ? st.client_email : 'contato@editaveisdocanva.com.br',
          admin_password: st.admin_password || 'admin',
          productsCount: countsMap['store_editaveisdocanva'] || countsMap['matriz'] || countsMap[st.id] || 0,
        };
      }

      // Demais lojas clientes (nunca matriz)
      const resolvedName = st.name || st.store_name || 'Loja sem nome';
      const resolvedId = st.id;
      const resolvedSlug = st.slug || 'loja';
      const resolvedOwnerName = st.owner_name || st.client_name || 'Cliente';
      const resolvedClientName = resolvedOwnerName;
      const resolvedOwnerEmail = st.owner_email || st.client_email || null;
      const resolvedClientEmail = resolvedOwnerEmail;
      const resolvedPassword = st.admin_password || 'admin';
      const storeIdKey = resolvedId;

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
        is_matriz: false,
        domain_status: st.domain_status || 'active',
        subscription_status: st.subscription_status || 'trial',
        isTrial: st.subscription_status === 'trial',
        monthly_fee: (st.monthly_fee !== undefined && st.monthly_fee !== null ? Number(st.monthly_fee) : 50.00),
        daysRemaining,
        isExpired,
        isExpiringSoon,
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

    // 1. Validar duplicidade de domínio e gerar subdomínio automático (${storeSlug}.ajpstore.com.br)
    let domainToSave: string = `${storeSlug}.ajpstore.com.br`;
    const isCustomExternalDomain = Boolean(
      finalDomain && 
      finalDomain !== 'seudominio' && 
      !finalDomain.includes('seudominio') && 
      !finalDomain.endsWith('ajpstore.com.br')
    );

    if (isCustomExternalDomain) {
      const { data: existingDomain } = await supabase
        .from('stores')
        .select('id, name')
        .eq('custom_domain', finalDomain)
        .maybeSingle();

      if (existingDomain) {
        return { store: null, error: `O endereço de domínio "${finalDomain}" já está associado à loja "${existingDomain.name}".` };
      }
      domainToSave = finalDomain;
    } else {
      // Subdomínio automático no padrão oficial da plataforma
      domainToSave = `${storeSlug}.ajpstore.com.br`;
    }

    // 2. Inserir a nova loja na tabela stores copiando todas as configurações da matriz AJPSTORE
    const resolvedStoreName = storeName;
    const resolvedClientName = input.clientName.trim();
    const resolvedClientEmail = input.clientEmail.toLowerCase().trim();
    const resolvedPassword = (input.clientPassword && input.clientPassword.trim()) || 'admin';

    const days = input.initialDays !== undefined ? input.initialDays : 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const monthlyFee = input.monthlyFee !== undefined ? input.monthlyFee : 50.00;

    // Consultar a loja matriz no Supabase (slug === 'ajpstore')
    const matriz = await getMatrizStore();
    const matrizTheme = matriz?.theme_settings
      ? (typeof matriz.theme_settings === 'string' ? JSON.parse(matriz.theme_settings) : matriz.theme_settings)
      : null;

    const resolvedPrimaryColor = matriz?.primary_color || matrizTheme?.primary_color || '#FF1493';
    const resolvedSecondaryColor = matriz?.secondary_color || matrizTheme?.secondary_color || '#00a8e8';
    const resolvedColorPalette = matriz?.color_palette || matrizTheme?.color_palette || 'pink_pastel';
    const resolvedLayoutStyle = matriz?.layout_style || matrizTheme?.theme_layout || 'classic';
    const resolvedLogoUrl = matriz?.logo_url || matrizTheme?.logo_url || '/ajpstore-logo.png';
    const resolvedBannerUrl = matriz?.banner_url || matrizTheme?.banner_url || null;
    const resolvedBannerDesktop = matriz?.banner_desktop || null;
    const resolvedBannerMobile = matriz?.banner_mobile || null;
    const resolvedBannersConfig = matriz?.banners_config || matrizTheme?.banners_config || null;
    const resolvedButtonsConfig = matriz?.buttons_config || matrizTheme?.buttons_config || null;
    const resolvedBenefitCards = matriz?.benefit_cards || matrizTheme?.benefit_cards || null;

    const storePayload: any = {
      id: newStoreId,
      name: resolvedStoreName,
      store_name: resolvedStoreName,
      slug: storeSlug,
      custom_domain: domainToSave,
      domain_status: isCustomExternalDomain ? 'pending_dns' : 'ativo',
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
      // Copiar layout, banners, logo, cores e botões exatos da matriz:
      logo_url: resolvedLogoUrl,
      banner_url: resolvedBannerUrl,
      banner_desktop: resolvedBannerDesktop,
      banner_mobile: resolvedBannerMobile,
      banners_config: resolvedBannersConfig,
      buttons_config: resolvedButtonsConfig,
      benefit_cards: resolvedBenefitCards,
      layout_style: resolvedLayoutStyle,
      primary_color: resolvedPrimaryColor,
      secondary_color: resolvedSecondaryColor,
      color_palette: resolvedColorPalette,
      theme_settings: {
        ...(matrizTheme || {}),
        logo_url: resolvedLogoUrl,
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        color_palette: resolvedColorPalette,
        theme_layout: resolvedLayoutStyle,
        layout_style: resolvedLayoutStyle,
        buttons_config: resolvedButtonsConfig,
        banners_config: resolvedBannersConfig,
        benefit_cards: resolvedBenefitCards
      },
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let currentPayload = { ...storePayload };
    let insertedStore: any = null;
    let storeError: any = null;

    // Tenta inserir o payload completo. Se alguma coluna não existir na tabela stores do banco,
    // salva o valor dentro de theme_settings para não perder a informação e tenta novamente.
    for (let attempt = 0; attempt < 25; attempt++) {
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

      // Detecta se o erro foi coluna ausente no cache de schema do Supabase ou banco
      const colMatch = 
        res.error.message?.match(/Could not find the '([^']+)' column/i) ||
        res.error.message?.match(/Could not find the "([^"]+)" column/i) ||
        res.error.message?.match(/column "([^"]+)" of relation "stores" does not exist/i) ||
        res.error.message?.match(/column "([^"]+)" does not exist/i) ||
        res.error.message?.match(/column '([^']+)' does not exist/i);

      if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
        const missingCol = colMatch[1];
        console.warn(`[storeManagementService] Coluna "${missingCol}" ausente em stores, movendo para theme_settings...`);
        // Preserva o valor no objeto JSON theme_settings para não perder o dado
        if (currentPayload[missingCol] !== undefined && currentPayload[missingCol] !== null) {
          currentPayload.theme_settings = {
            ...(currentPayload.theme_settings || {}),
            [missingCol]: currentPayload[missingCol]
          };
        }
        delete currentPayload[missingCol];
        continue;
      }

      // Detecta se houve colisão de restrição UNIQUE em custom_domain
      if (res.error.code === '23505' || res.error.message?.toLowerCase().includes('custom_domain')) {
        currentPayload.custom_domain = `${storeSlug}-${Date.now().toString(36)}.ajpstore.com.br`;
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
        sourceStoreId = matriz?.id || matriz?.slug || 'ajpstore';
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
 * 3. Atualiza domínio personalizado ou status de DNS da loja no Supabase
 * e adiciona o domínio automaticamente ao projeto na Vercel API via backend.
 */
export async function updateStoreDomain(
  storeId: string,
  customDomain?: string | null,
  domainStatus: DomainStatus = 'pending_dns'
): Promise<{ success: boolean; error: string | null; vercelResult?: any }> {
  try {
    const cleanDomain = customDomain 
      ? customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
      : null;
    
    // 1. Salva o domínio na coluna correspondente da tabela stores no Supabase
    const { error: dbError } = await supabase
      .from('stores')
      .update({
        custom_domain: cleanDomain || null,
        domain_status: cleanDomain ? domainStatus : 'pending_dns',
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId);

    if (dbError) {
      console.error('[storeManagementService] Erro ao atualizar domínio no Supabase:', dbError);
      return { success: false, error: dbError.message };
    }

    // 2. Fazer requisição POST para o backend da Vercel API (/api/add-vercel-domain)
    let vercelResult = null;
    const isCustomExternal = Boolean(
      cleanDomain && 
      cleanDomain !== 'seudominio' && 
      !cleanDomain.includes('seudominio') && 
      !cleanDomain.endsWith('.ajpstore.com.br') &&
      cleanDomain !== 'ajpstore.com.br' &&
      !cleanDomain.includes('localhost')
    );

    if (isCustomExternal) {
      try {
        console.log(`[storeManagementService] 🌐 Sincronizando domínio "${cleanDomain}" com a Vercel API...`);
        const res = await fetch('/api/add-vercel-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: cleanDomain, storeId }),
        });

        vercelResult = await res.json();
        console.log('[storeManagementService] Resposta da sincronização com a Vercel:', vercelResult);
      } catch (apiErr: any) {
        console.warn('[storeManagementService] Aviso ao sincronizar com Vercel:', apiErr);
        vercelResult = { 
          success: false, 
          error: apiErr?.message || 'Não foi possível conectar à API de automação da Vercel.' 
        };
      }
    }

    return { 
      success: true, 
      error: null, 
      vercelResult 
    };
  } catch (err: any) {
    console.error('[storeManagementService] Exceção em updateStoreDomain:', err);
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

    // A loja AJPSTORE é a Matriz fixa e vitalícia do sistema e não pode ser excluída
    if (storeId === 'ajpstore' || storeId === 'store_ajpstore' || resolvedSlug === 'ajpstore') {
      return { success: false, error: 'A loja AJPSTORE é a Matriz vitalícia do sistema e não pode ser excluída.' };
    }

    const identifiers = [storeId];
    if (resolvedSlug && !identifiers.includes(resolvedSlug)) {
      identifiers.push(resolvedSlug);
    }
    if (storeId === 'suamarcaaqui' || resolvedSlug === 'suamarcaaqui') {
      if (!identifiers.includes('store_default')) identifiers.push('store_default');
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
