import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Store, DomainStatus, SubscriptionStatus } from '../types';
import { supabase } from '../lib/supabase';
import { DEFAULT_STORE_FEATURES, DEFAULT_MAIN_CTA_TEXT } from '../data/storeConfig';
import { EDITAVEIS_MONTHLY_STORE_DATA } from '../services/storeManagementService';

export const DEFAULT_STORE: Store = {
  id: 'store_ajpstore',
  name: 'AJPSTORE',
  slug: 'ajpstore',
  custom_domain: 'ajpstore.com.br',
  domain_status: 'active',
  layout_style: 'classic',
  primary_color: '#FF1493',
  color_palette: 'pink_pastel',
  logo_url: '/ajpstore-logo.png',
  store_features: DEFAULT_STORE_FEATURES,
  main_cta_text: DEFAULT_MAIN_CTA_TEXT,
  main_cta_link: '',
  theme_settings: {
    primary_color: '#FF1493',
    secondary_color: '#00a8e8',
    color_palette: 'pink_pastel',
    theme_layout: 'classic',
    layout_style: 'classic',
    logo_url: '/ajpstore-logo.png',
    store_features: DEFAULT_STORE_FEATURES,
    main_cta_text: DEFAULT_MAIN_CTA_TEXT,
    main_cta_link: '',
  },
  is_active: true,
  is_matriz: true,
  subscription_status: 'active',
  expires_at: '2099-12-31T23:59:59.000Z',
  monthly_fee: 0.00,
  owner_name: 'AJPSTORE',
  owner_email: 'ajpsotre@gmail.com'
};

export const INITIAL_TENANT_PENDING_STORE: Store = {
  id: '__resolving_tenant__',
  name: 'Carregando loja...',
  slug: '',
  domain_status: 'unconfigured',
  theme_settings: {},
  is_active: true,
  subscription_status: 'active',
  expires_at: '2099-12-31 23:59:59Z',
  monthly_fee: 0,
};

/**
 * Verifica se o host é estritamente o domínio raiz da plataforma AJPSTORE (sem subdomínio de loja).
 * Retorna true exclusivamente para:
 * - ajpstore.com.br
 * - www.ajpstore.com.br
 * - localhost / 127.0.0.1 (e IPs locais de desenvolvimento)
 */
export function isPlatformRootHostname(hostname: string): boolean {
  if (!hostname) return true;
  const clean = hostname.toLowerCase().trim().replace(/:\d+$/, '');
  return (
    clean === 'ajpstore.com.br' ||
    clean === 'www.ajpstore.com.br' ||
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean.startsWith('192.168.') ||
    clean.startsWith('10.') ||
    clean.startsWith('172.') ||
    clean.endsWith('.local') ||
    clean.endsWith('.internal') ||
    clean.endsWith('.vercel.app')
  );
}

/**
 * Extrai subdomínio de loja válido se houver (ex: 'lilika.ajpstore.com.br' -> 'lilika').
 */
export function extractStoreSubdomain(hostname: string): string | null {
  if (!hostname) return null;
  const clean = hostname.toLowerCase().trim().replace(/:\d+$/, '');

  if (isPlatformRootHostname(clean)) {
    return null;
  }

  if (clean.endsWith('.ajpstore.com.br')) {
    const sub = clean.slice(0, -'.ajpstore.com.br'.length).trim();
    const cleanSub = sub.replace(/^www\./, '');
    if (cleanSub && !['www', 'app', 'admin', 'api', 'painel', 'master'].includes(cleanSub)) {
      return cleanSub;
    }
    return null;
  }

  if (clean.endsWith('.localhost')) {
    const sub = clean.slice(0, -'.localhost'.length).trim();
    const cleanSub = sub.replace(/^www\./, '');
    if (cleanSub && cleanSub !== 'www') {
      return cleanSub;
    }
    return null;
  }

  return null;
}

/**
 * Verifica se o hostname é um domínio personalizado externo (ex: www.minhaloja.com.br).
 */
export function isCustomStoreDomain(hostname: string): boolean {
  if (!hostname) return false;
  const clean = hostname.toLowerCase().trim().replace(/:\d+$/, '');
  if (isPlatformRootHostname(clean)) return false;
  if (clean.endsWith('.ajpstore.com.br')) return false;
  if (clean.endsWith('.localhost')) return false;
  return true;
}

/**
 * Retorna true se a requisição é proveniente de um subdomínio válido ou domínio personalizado de loja.
 * Retorna estritamente FALSE para o domínio raiz principal da plataforma (ajpstore.com.br, www.ajpstore.com.br, localhost, vercel.app).
 */
export function isTenantHost(hostname: string): boolean {
  if (!hostname || isPlatformRootHostname(hostname)) {
    return false;
  }
  return Boolean(extractStoreSubdomain(hostname) || isCustomStoreDomain(hostname));
}

export function checkIsTenantRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase().trim();
  const isRoot = isPlatformRootHostname(hostname);
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const pathSlugMatch = pathname.match(/\/loja\/([^/?#]+)/i) || hash.match(/loja\/([^/?#]+)/i);
  const directEditaveisMatch = pathname.match(/^\/(editaveisdocanva|editaveis-do-canva)(?:\/|$)/i) || hash.match(/^#?\/?(editaveisdocanva|editaveis-do-canva)(?:\/|$)/i);
  const routeSlug = pathSlugMatch ? pathSlugMatch[1].toLowerCase().trim() : (directEditaveisMatch ? 'editaveisdocanva' : null);
  const searchParams = new URLSearchParams(window.location.search);
  const storeSlugParam = (searchParams.get('store')?.toLowerCase().trim()) || routeSlug;
  const domainParam = searchParams.get('domain')?.toLowerCase().trim();

  // No domínio raiz da plataforma, só é rota de tenant se houver parâmetro explícito de loja (/loja/:slug ou ?store=...)
  if (isRoot) {
    return Boolean(storeSlugParam || domainParam);
  }

  // Se houver parâmetro explícito de loja ou for um subdomínio/domínio customizado
  return Boolean(storeSlugParam || domainParam || isTenantHost(hostname));
}

export function normalizeStore(s: any): Store {
  if (!s) return DEFAULT_STORE;
  const isAjpStore = s.slug === 'ajpstore' || s.id === 'store_ajpstore' || (typeof s.name === 'string' && s.name.toLowerCase().includes('ajpstore'));
  const isSuamarcaaqui = s.slug === 'suamarcaaqui' || s.id === 'suamarcaaqui';
  const isEditaveis = 
    s.slug === 'editaveisdocanva' || 
    s.slug === 'editaveis-do-canva' || 
    s.id === 'store_editaveisdocanva' || 
    (typeof s.custom_domain === 'string' && s.custom_domain.toLowerCase().includes('editaveisdocanva')) ||
    (typeof s.name === 'string' && s.name.toLowerCase().includes('canva'));

  // Não sobrescreve o ID original do banco a menos que seja nulo
  const resolvedId = isAjpStore 
    ? (s.id || 'store_ajpstore') 
    : (isSuamarcaaqui 
        ? (s.id || 'suamarcaaqui') 
        : (isEditaveis 
            ? (s.id || 'store_editaveisdocanva') 
            : (s.id || 'default')));

  const resolvedSlug = isAjpStore 
    ? (s.slug || 'ajpstore') 
    : (isSuamarcaaqui 
        ? 'suamarcaaqui' 
        : (isEditaveis 
            ? (s.slug || 'editaveisdocanva') 
            : (s.slug || s.id || 'loja')));

  const resolvedName = s.name || s.store_name || (isAjpStore ? 'AJPSTORE' : (isEditaveis ? 'Editáveis do Canva' : (isSuamarcaaqui ? 'SUAMARCAAQUI' : 'Loja')));
  const isBase = isAjpStore || isSuamarcaaqui;

  // Garante que a loja matriz AJPSTORE seja estritamente vitalícia no banco caso esteja com trial antigo
  if (isAjpStore && (s.subscription_status !== 'active' || s.expires_at !== '2099-12-31T23:59:59.000Z' || s.monthly_fee !== 0 || !s.is_matriz)) {
    supabase
      .from('stores')
      .update({
        is_matriz: true,
        subscription_status: 'active',
        expires_at: '2099-12-31T23:59:59.000Z',
        monthly_fee: 0.00
      })
      .or('slug.eq.ajpstore,id.eq.store_ajpstore')
      .then();
  }

  const stTheme = s.theme_settings || {};
  let cachedLayout: any = undefined;
  let cachedPalette: any = undefined;
  let cachedPrimary: string | undefined = undefined;
  if (typeof window !== 'undefined') {
    try {
      const lsL = localStorage.getItem(`store_${resolvedId}_theme_layout`) || 
                  (isEditaveis ? localStorage.getItem('store_store_editaveisdocanva_theme_layout') || localStorage.getItem('store_editaveisdocanva_theme_layout') : null) ||
                  localStorage.getItem('soumbolinho_theme_layout');
      if (lsL && ['classic', 'modern', 'minimal', 'featured_grid'].includes(lsL)) {
        cachedLayout = lsL;
      }
      const lsP = localStorage.getItem(`store_${resolvedId}_color_palette`) || localStorage.getItem('soumbolinho_color_palette');
      if (lsP && ['pink_pastel', 'blue_corporate', 'purple_elegant', 'green_nature'].includes(lsP)) {
        cachedPalette = lsP;
      }
      const lsC = localStorage.getItem(`store_${resolvedId}_primary_color`) || localStorage.getItem('soumbolinho_primary_color');
      if (lsC && lsC.startsWith('#')) {
        cachedPrimary = lsC;
      }
    } catch {}
  }

  const dbLayout = s.layout_style || s.theme_layout || stTheme.layout_style || stTheme.theme_layout;
  const resolvedLayout = dbLayout || cachedLayout || 'classic';

  const dbPalette = s.color_palette || stTheme.color_palette;
  const resolvedPalette = dbPalette || cachedPalette || 'pink_pastel';

  const dbPrimary = s.primary_color || stTheme.primary_color;
  const resolvedPrimary = dbPrimary || cachedPrimary || '#FF1493';

  return {
    ...s,
    id: resolvedId,
    name: resolvedName,
    store_name: s.store_name || resolvedName,
    slug: resolvedSlug,
    is_matriz: isAjpStore,
    subscription_status: isBase ? 'active' : (s.subscription_status || 'active'),
    expires_at: isBase ? '2099-12-31T23:59:59.000Z' : s.expires_at,
    monthly_fee: isBase ? 0.00 : (s.monthly_fee !== undefined ? Number(s.monthly_fee) : 50.00),
    isTrial: isBase ? false : Boolean(s.subscription_status === 'trial' || s.isTrial),
    logo_url: s.logo_url || stTheme.logo_url || '/ajpstore-logo.png',
    only_logo: s.only_logo !== undefined ? Boolean(s.only_logo) : (stTheme.only_logo !== undefined ? Boolean(stTheme.only_logo) : (s.onlyLogo !== undefined ? Boolean(s.onlyLogo) : false)),
    onlyLogo: s.only_logo !== undefined ? Boolean(s.only_logo) : (stTheme.only_logo !== undefined ? Boolean(stTheme.only_logo) : (s.onlyLogo !== undefined ? Boolean(s.onlyLogo) : false)),
    whatsapp_number: s.whatsapp_number || s.owner_phone || null,
    whatsapp_display: s.whatsapp_display || null,
    slogan: s.slogan || null,
    address: s.address || null,
    working_hours: s.working_hours || null,
    owner_name: s.owner_name || s.client_name || null,
    client_name: s.client_name || s.owner_name || null,
    owner_email: s.owner_email || s.client_email || null,
    client_email: s.client_email || s.owner_email || null,
    admin_password: s.admin_password || (isBase ? 'admin' : null),
    layout_style: resolvedLayout,
    theme_layout: resolvedLayout,
    primary_color: resolvedPrimary,
    store_features: s.store_features || stTheme.store_features || (isAjpStore ? DEFAULT_STORE_FEATURES : []),
    main_cta_text: s.main_cta_text !== undefined ? s.main_cta_text : (stTheme.main_cta_text !== undefined ? stTheme.main_cta_text : (isAjpStore ? DEFAULT_MAIN_CTA_TEXT : '')),
    main_cta_link: s.main_cta_link !== undefined ? s.main_cta_link : (stTheme.main_cta_link || ''),
    theme_settings: {
      ...stTheme,
      layout_style: resolvedLayout,
      theme_layout: resolvedLayout,
      primary_color: resolvedPrimary,
      color_palette: resolvedPalette,
      logo_url: s.logo_url || stTheme.logo_url || '/ajpstore-logo.png',
      only_logo: s.only_logo !== undefined ? Boolean(s.only_logo) : (stTheme.only_logo !== undefined ? Boolean(stTheme.only_logo) : (s.onlyLogo !== undefined ? Boolean(s.onlyLogo) : false)),
      onlyLogo: s.only_logo !== undefined ? Boolean(s.only_logo) : (stTheme.only_logo !== undefined ? Boolean(stTheme.only_logo) : (s.onlyLogo !== undefined ? Boolean(s.onlyLogo) : false)),
      benefit_cards: stTheme.benefit_cards,
      store_features: s.store_features || stTheme.store_features || (isAjpStore ? DEFAULT_STORE_FEATURES : []),
      main_cta_text: s.main_cta_text !== undefined ? s.main_cta_text : (stTheme.main_cta_text !== undefined ? stTheme.main_cta_text : (isAjpStore ? DEFAULT_MAIN_CTA_TEXT : '')),
      main_cta_link: s.main_cta_link !== undefined ? s.main_cta_link : (stTheme.main_cta_link || ''),
      whatsapp_default_message: stTheme.whatsapp_default_message,
    },
    mp_access_token: s.mp_access_token || stTheme.mp_access_token || (typeof window !== 'undefined' ? (localStorage.getItem(`store_${resolvedId}_mp_access_token`) || localStorage.getItem(`store_${s.id}_mp_access_token`) || localStorage.getItem('store_store_editaveisdocanva_mp_access_token') || localStorage.getItem('store_editaveisdocanva_mp_access_token') || localStorage.getItem('mp_access_token') || localStorage.getItem('encantando_festa_mp_access_token')) : null) || null,
    telegram_bot_token: s.telegram_bot_token || stTheme.telegram_bot_token || (typeof window !== 'undefined' ? (localStorage.getItem(`store_${resolvedId}_telegram_bot_token`) || localStorage.getItem(`store_${s.id}_telegram_bot_token`) || localStorage.getItem('encantando_festa_telegram_bot_token')) : null) || null,
    telegram_chat_id: s.telegram_chat_id || stTheme.telegram_chat_id || (typeof window !== 'undefined' ? (localStorage.getItem(`store_${resolvedId}_telegram_chat_id`) || localStorage.getItem(`store_${s.id}_telegram_chat_id`) || localStorage.getItem('encantando_festa_telegram_chat_id')) : null) || null,
  };
}

export const SUPER_ADMIN_DEFAULT_EMAIL = 'admin@editaveisdocanva.com.br';

interface TenantContextType {
  currentStore: Store;
  isResolvingTenant: boolean;
  tenantNotFound: boolean;
  tenantError: string | null;
  detectedHost: string;
  isLocalhost: boolean;
  isMasterHost: boolean;
  isSuperAdmin: boolean;
  superAdminEmail: string;
  // Mensalidade & Controle de 30 dias / Trial
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  isExpiringSoon: boolean;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
  monthlyFee: number;
  refreshTenant: (silent?: boolean) => Promise<void>;
  updateCurrentStore: (updates: Partial<Store>) => void;
  switchStore: (store: Store) => void;
  setSuperAdminStatus: (isSuper: boolean, email?: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStore, setCurrentStore] = useState<Store>(() => {
    return checkIsTenantRoute() ? INITIAL_TENANT_PENDING_STORE : DEFAULT_STORE;
  });
  const [isResolvingTenant, setIsResolvingTenant] = useState<boolean>(true);
  const [tenantNotFound, setTenantNotFound] = useState<boolean>(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const [detectedHost, setDetectedHost] = useState<string>('');
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);
  const [isMasterHost, setIsMasterHost] = useState<boolean>(false);

  // Super admin session state
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('saas_super_admin_logged') === 'true';
    } catch {
      return false;
    }
  });

  const [superAdminEmail, setSuperAdminEmail] = useState<string>(() => {
    try {
      return sessionStorage.getItem('saas_super_admin_email') || SUPER_ADMIN_DEFAULT_EMAIL;
    } catch {
      return SUPER_ADMIN_DEFAULT_EMAIL;
    }
  });

  const setSuperAdminStatus = (isSuper: boolean, email?: string) => {
    setIsSuperAdmin(isSuper);
    const finalEmail = email || SUPER_ADMIN_DEFAULT_EMAIL;
    setSuperAdminEmail(finalEmail);
    try {
      if (isSuper) {
        sessionStorage.setItem('saas_super_admin_logged', 'true');
        sessionStorage.setItem('saas_super_admin_email', finalEmail);
      } else {
        sessionStorage.removeItem('saas_super_admin_logged');
        sessionStorage.removeItem('saas_super_admin_email');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  /**
   * Resolução da Loja por Domínio / Host
   */
  const resolveTenant = useCallback(async (silent = false) => {
    if (!silent) {
      setIsResolvingTenant(true);
      setTenantError(null);
    }

    try {
      const hostname = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase().trim();
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      const pathSlugMatch = pathname.match(/\/loja\/([^/?#]+)/i) || hash.match(/loja\/([^/?#]+)/i);
      const directEditaveisMatch = pathname.match(/^\/(editaveisdocanva|editaveis-do-canva)(?:\/|$)/i) || hash.match(/^#?\/?(editaveisdocanva|editaveis-do-canva)(?:\/|$)/i);
      const routeSlug = pathSlugMatch ? pathSlugMatch[1].toLowerCase().trim() : (directEditaveisMatch ? 'editaveisdocanva' : null);

      const search = typeof window !== 'undefined' ? window.location.search : '';
      const searchParams = new URLSearchParams(search);

      const storeSlugParam = (searchParams.get('store')?.toLowerCase().trim()) || routeSlug;
      const domainParam = searchParams.get('domain')?.toLowerCase().trim();
      const previewStoreId = typeof window !== 'undefined' ? sessionStorage.getItem('preview_store_id') : null;

      const isRootPlatform = isPlatformRootHostname(hostname);
      const storeSubdomain = extractStoreSubdomain(hostname);
      const isCustomDomain = isCustomStoreDomain(hostname);

      setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1');
      setDetectedHost(hostname);
      setIsMasterHost(isRootPlatform);

      console.log(`[TenantResolver] 🌐 Resolvendo tenant para host: "${hostname}" | isRoot: ${isRootPlatform} | subdomínio: "${storeSubdomain || ''}" | custom: ${isCustomDomain} | param: "${storeSlugParam || ''}"`);

      // =========================================================================
      // REGRA 1: Domínio Raiz da Plataforma (ajpstore.com.br, www.ajpstore.com.br ou localhost)
      // Se for o domínio raiz e o usuário NÃO estiver em uma rota explícita de loja (/loja/:slug ou ?store=...):
      // O SISTEMA NÃO CONSULTA A TABELA 'stores' E MANTÉM A PÁGINA DE MARKETING ATIVA!
      // =========================================================================
      if (isRootPlatform && !storeSlugParam && !domainParam) {
        console.log(`[TenantResolver] 🚀 Acesso ao domínio raiz da plataforma (${hostname}). Não consulta 'stores'. Página de marketing ativa.`);
        setCurrentStore(DEFAULT_STORE);
        setTenantNotFound(false);
        setTenantError(null);
        setIsResolvingTenant(false);
        return;
      }

      // =========================================================================
      // REGRA 2: Rota explícita de loja por parâmetro / URL (/loja/:slug ou ?store=...)
      // =========================================================================
      if (storeSlugParam) {
        let { data: storeBySlug } = await supabase
          .from('stores')
          .select('*')
          .or(`slug.ilike.${storeSlugParam},id.eq.${storeSlugParam}`)
          .maybeSingle();

        // Se for editaveisdocanva e não encontrar diretamente, tenta variações
        if (!storeBySlug && (storeSlugParam === 'editaveisdocanva' || storeSlugParam === 'editaveis-do-canva')) {
          const { data: altStore } = await supabase
            .from('stores')
            .select('*')
            .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,custom_domain.ilike.%editaveisdocanva.com.br%')
            .maybeSingle();
          storeBySlug = altStore;
        }

        if (storeBySlug) {
          console.log('[TenantResolver] ✅ Loja identificada por slug:', storeBySlug.name);
          try {
            sessionStorage.setItem('current_store_slug', storeBySlug.slug);
          } catch {}
          setCurrentStore(normalizeStore(storeBySlug));
          setTenantNotFound(false);
          setTenantError(null);
          setIsResolvingTenant(false);
          return;
        } else {
          if (storeSlugParam === 'editaveisdocanva' || storeSlugParam === 'editaveis-do-canva') {
            console.log('[TenantResolver] 🏬 Ativando loja Editáveis do Canva via fallback garantido.');
            setCurrentStore(normalizeStore(EDITAVEIS_MONTHLY_STORE_DATA));
            setTenantNotFound(false);
            setTenantError(null);
            setIsResolvingTenant(false);
            return;
          }
          console.warn('[TenantResolver] ❌ Loja com slug não encontrada:', storeSlugParam);
          setTenantNotFound(true);
          setTenantError(`Loja "${storeSlugParam}" não encontrada.`);
          setIsResolvingTenant(false);
          return;
        }
      }

      // =========================================================================
      // REGRA 3: Subdomínio válido da plataforma (ex: lilika.ajpstore.com.br)
      // =========================================================================
      if (storeSubdomain) {
        console.log(`[TenantResolver] 🏬 Subdomínio de loja detectado: "${storeSubdomain}" no host "${hostname}"`);
        const { data: storeBySubdomain } = await supabase
          .from('stores')
          .select('*')
          .or(`slug.eq.${storeSubdomain},custom_domain.ilike.${hostname},custom_domain.ilike.${storeSubdomain}.ajpstore.com.br`)
          .maybeSingle();

        if (storeBySubdomain) {
          console.log('[TenantResolver] ✅ Loja identificada por subdomínio:', storeBySubdomain.name);
          if (!storeBySubdomain.is_active) {
            setTenantError('Esta loja encontra-se temporariamente desativada pelo administrador.');
          } else {
            setTenantError(null);
          }
          setCurrentStore(normalizeStore(storeBySubdomain));
          setTenantNotFound(false);
          setIsResolvingTenant(false);
          return;
        } else {
          console.warn('[TenantResolver] ❌ Subdomínio não associado a nenhuma loja cadastrada:', storeSubdomain);
          setTenantNotFound(true);
          setTenantError(`Nenhuma loja cadastrada para o subdomínio "${storeSubdomain}".`);
          setIsResolvingTenant(false);
          return;
        }
      }

      // =========================================================================
      // REGRA 4: Domínio personalizado mapeado (ex: www.minhaloja.com.br)
      // =========================================================================
      if (isCustomDomain || domainParam) {
        const targetDomain = domainParam || hostname;
        const cleanHost = targetDomain.replace(/^www\./, '');
        console.log(`[TenantResolver] 🌐 Domínio personalizado detectado: "${targetDomain}"`);

        const { data: matchedStore } = await supabase
          .from('stores')
          .select('*')
          .or(`custom_domain.ilike.${targetDomain},custom_domain.ilike.www.${cleanHost},custom_domain.ilike.${cleanHost}`)
          .maybeSingle();

        if (matchedStore) {
          console.log('[TenantResolver] ✅ Loja identificada por domínio personalizado:', matchedStore.name);
          if (!matchedStore.is_active) {
            setTenantError('Esta loja encontra-se temporariamente desativada pelo administrador.');
          } else {
            setTenantError(null);
          }
          setCurrentStore(normalizeStore(matchedStore));
          setTenantNotFound(false);
          setIsResolvingTenant(false);
          return;
        } else {
          if (cleanHost.includes('editaveisdocanva') || targetDomain.includes('editaveisdocanva')) {
            console.log('[TenantResolver] 🏬 Ativando loja Editáveis do Canva para o domínio personalizado via fallback garantido.');
            setCurrentStore(normalizeStore(EDITAVEIS_MONTHLY_STORE_DATA));
            setTenantNotFound(false);
            setTenantError(null);
            setIsResolvingTenant(false);
            return;
          }
          console.warn('[TenantResolver] ❌ Domínio personalizado não associado a nenhuma loja cadastrada:', targetDomain);
          setTenantNotFound(true);
          setTenantError(`Nenhuma loja cadastrada para o endereço "${targetDomain}".`);
          setIsResolvingTenant(false);
          return;
        }
      }

      // =========================================================================
      // REGRA 5: Fallback Seguro (sem consultas cegas a lojas aleatórias)
      // =========================================================================
      setCurrentStore(DEFAULT_STORE);
      setTenantNotFound(false);
      setTenantError(null);

    } catch (err: any) {
      console.error('[TenantResolver] ❌ Falha na resolução de tenant:', err);
      setCurrentStore(DEFAULT_STORE);
    } finally {
      if (!silent) {
        setIsResolvingTenant(false);
      }
    }
  }, []);

  useEffect(() => {
    resolveTenant();

    const handleLocationChange = () => {
      resolveTenant();
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [resolveTenant]);

  // Sincronização em tempo real da tabela 'stores' para refletir alterações visuais instantaneamente
  useEffect(() => {
    const storeId = currentStore?.id;
    if (!storeId || storeId === '__resolving_tenant__') return;

    const channelName = `realtime_stores_tenant_${storeId}`;
    const storesChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stores' },
        (payload: any) => {
          const updated = payload.new;
          if (!updated) return;

          const isMatch =
            updated.id === storeId ||
            (currentStore?.slug && updated.slug === currentStore.slug) ||
            (currentStore?.is_matriz && (updated.slug === 'ajpstore' || updated.id === 'store_ajpstore' || updated.is_matriz));

          if (isMatch) {
            console.log('[TenantContext] ⚡ Realtime: Tabela stores atualizada para a loja ativa:', updated.name, updated.id);
            setCurrentStore(prev => normalizeStore({ ...prev, ...updated }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storesChannel);
    };
  }, [currentStore?.id, currentStore?.slug, currentStore?.is_matriz]);

  const updateCurrentStore = useCallback((updates: Partial<Store>) => {
    setCurrentStore(prev => normalizeStore({ ...prev, ...updates }));
  }, []);

  const switchStore = (store: Store) => {
    console.log('[TenantContext] 🔄 Alternando loja em memória:', store.name);
    setCurrentStore(normalizeStore(store));
    setTenantNotFound(false);
    setTenantError(null);
    setIsResolvingTenant(false);
    try {
      sessionStorage.setItem('preview_store_id', store.id);
    } catch (e) {
      console.warn(e);
    }
  };

  // -------------------------------------------------------------
  // 4. CÁLCULO DINÂMICO DE VENCIMENTO DA MENSALIDADE
  // -------------------------------------------------------------
  // REQUISITO RIGOROSO 1: AJPSTORE é a loja matriz vitalícia (sem expiração)
  const isBaseStore = currentStore.is_matriz || currentStore.slug === 'ajpstore' || currentStore.id === 'store_ajpstore' || currentStore.slug === 'suamarcaaqui' || currentStore.id === 'suamarcaaqui' || currentStore.id === 'store_default';
  const isEditaveisStore = 
    currentStore.slug === 'editaveisdocanva' || 
    currentStore.slug === 'editaveis-do-canva' || 
    currentStore.id === 'store_editaveisdocanva' ||
    Boolean(currentStore.custom_domain && currentStore.custom_domain.toLowerCase().includes('editaveisdocanva'));
  const now = Date.now();
  let daysRemaining: number | null = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (!isBaseStore && !isEditaveisStore && currentStore.id !== '__resolving_tenant__') {
    if (currentStore.subscription_status === 'suspended') {
      isExpired = true;
    } else if (currentStore.expires_at) {
      const expTime = new Date(currentStore.expires_at).getTime();
      const diffMs = expTime - now;
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffMs <= 0) {
        isExpired = true;
      } else if (daysRemaining <= 5) {
        isExpiringSoon = true;
      }
    }
  } else if (isEditaveisStore) {
    daysRemaining = 30;
    isExpired = false;
    isExpiringSoon = false;
  }

  const monthlyFee = isBaseStore
    ? 0.00
    : (currentStore.monthly_fee !== undefined && currentStore.monthly_fee !== null ? Number(currentStore.monthly_fee) : 50.00);
  const subscriptionStatus: SubscriptionStatus = isBaseStore ? 'active' : (currentStore.subscription_status || 'active');
  const isTrial = !isBaseStore && (currentStore.subscription_status === 'trial' || Boolean((currentStore as any).isTrial));
  const expiresAt = isBaseStore ? null : (currentStore.expires_at || null);

  return (
    <TenantContext.Provider
      value={{
        currentStore,
        isResolvingTenant,
        tenantNotFound,
        tenantError,
        detectedHost,
        isLocalhost,
        isMasterHost,
        isSuperAdmin,
        superAdminEmail,
        isTrial,
        isExpired,
        daysRemaining,
        isExpiringSoon,
        subscriptionStatus,
        expiresAt,
        monthlyFee,
        refreshTenant: resolveTenant,
        updateCurrentStore,
        switchStore,
        setSuperAdminStatus,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve ser utilizado dentro de um TenantProvider');
  }
  return context;
}