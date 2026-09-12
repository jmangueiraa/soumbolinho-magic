import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Store, DomainStatus, SubscriptionStatus } from '../types';
import { supabase } from '../lib/supabase';

export const DEFAULT_STORE: Store = {
  id: 'suamarcaaqui',
  name: 'SUAMARCAAQUI',
  slug: 'suamarcaaqui',
  custom_domain: 'suamarcaaqui.com.br',
  domain_status: 'active',
  theme_settings: {
    primary_color: '#FF1493',
    secondary_color: '#00a8e8',
    color_palette: 'pink_pastel',
    theme_layout: 'classic'
  },
  is_active: true,
  subscription_status: 'active',
  expires_at: '2099-12-31 23:59:59Z',
  monthly_fee: 0.00,
  owner_name: 'Super Admin',
  owner_email: 'admin@suamarcaaqui.com.br'
};

export const INITIAL_TENANT_PENDING_STORE: Store = {
  id: '__resolving_tenant__',
  name: 'Carregando loja...',
  slug: '',
  theme_settings: {},
  is_active: true,
  subscription_status: 'active',
  expires_at: '2099-12-31 23:59:59Z',
  monthly_fee: 0,
};

export function checkIsTenantRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase().trim();
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const pathSlugMatch = pathname.match(/\/loja\/([^/?#]+)/i) || hash.match(/loja\/([^/?#]+)/i);
  const routeSlug = pathSlugMatch ? pathSlugMatch[1].toLowerCase().trim() : null;
  const searchParams = new URLSearchParams(window.location.search);
  const storeSlugParam = (searchParams.get('store')?.toLowerCase().trim()) || routeSlug;
  const domainParam = searchParams.get('domain')?.toLowerCase().trim();
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.') || 
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal');
  const isBaseDomain = 
    hostname === 'editaveisdocanva.com.br' || 
    hostname === 'www.editaveisdocanva.com.br' ||
    hostname.includes('soumbolinho');

  const isMatrizSlug = storeSlugParam === 'suamarcaaqui';
  if (isMatrizSlug) {
    return false;
  }

  return Boolean(storeSlugParam || domainParam || (!isLocal && !isBaseDomain));
}

export function normalizeStore(s: any): Store {
  if (!s) return DEFAULT_STORE;
  const isBase = s.slug === 'suamarcaaqui' || s.id === 'suamarcaaqui' || s.id === 'store_default';
  const resolvedId = isBase ? (s.id || 'suamarcaaqui') : s.id;
  const resolvedSlug = isBase ? 'suamarcaaqui' : s.slug;
  const resolvedName = isBase ? (s.name || s.store_name || 'SUAMARCAAQUI') : (s.name || s.store_name || 'Loja');
  // Garante que a loja matriz SUAMARCAAQUI seja estritamente vitalícia no banco caso esteja com trial antigo
  if (isBase && (s.subscription_status !== 'active' || s.expires_at !== '2099-12-31T23:59:59.000Z' || s.monthly_fee !== 0)) {
    supabase
      .from('stores')
      .update({
        subscription_status: 'active',
        expires_at: '2099-12-31T23:59:59.000Z',
        monthly_fee: 0.00
      })
      .or('slug.eq.suamarcaaqui,id.eq.suamarcaaqui')
      .then();
  }

  return {
    ...s,
    id: resolvedId,
    name: resolvedName,
    store_name: s.store_name || resolvedName,
    slug: resolvedSlug,
    subscription_status: isBase ? 'active' : (s.subscription_status || 'active'),
    expires_at: isBase ? '2099-12-31T23:59:59.000Z' : s.expires_at,
    monthly_fee: isBase ? 0.00 : (s.monthly_fee !== undefined ? Number(s.monthly_fee) : 50.00),
    isTrial: isBase ? false : Boolean(s.subscription_status === 'trial' || s.isTrial),
    logo_url: s.logo_url || s.theme_settings?.logo_url || null,
    owner_name: s.owner_name || s.client_name || null,
    client_name: s.client_name || s.owner_name || null,
    owner_email: s.owner_email || s.client_email || null,
    client_email: s.client_email || s.owner_email || null,
    admin_password: s.admin_password || (isBase ? 'admin' : null),
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
  refreshTenant: () => Promise<void>;
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
  const resolveTenant = useCallback(async () => {
    setIsResolvingTenant(true);
    setTenantError(null);

    try {
      const hostname = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase().trim();
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      const pathSlugMatch = pathname.match(/\/loja\/([^/?#]+)/i) || hash.match(/loja\/([^/?#]+)/i);
      const routeSlug = pathSlugMatch ? pathSlugMatch[1].toLowerCase().trim() : null;

      const search = typeof window !== 'undefined' ? window.location.search : '';
      const searchParams = new URLSearchParams(search);

      const storeSlugParam = (searchParams.get('store')?.toLowerCase().trim()) || routeSlug;
      const domainParam = searchParams.get('domain')?.toLowerCase().trim();
      const previewStoreId = typeof window !== 'undefined' ? sessionStorage.getItem('preview_store_id') : null;

      const isLocal = 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.startsWith('172.') || 
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal');
      setIsLocalhost(isLocal);
      setDetectedHost(hostname);

      const isBaseDomain = 
        hostname === 'editaveisdocanva.com.br' || 
        hostname === 'www.editaveisdocanva.com.br' ||
        hostname.includes('soumbolinho');
      setIsMasterHost(isBaseDomain || isLocal);

      console.log(`[TenantResolver] 🌐 Resolvendo loja para host: "${hostname}" | Slug da rota/param: "${storeSlugParam || ''}"`);

      if (storeSlugParam) {
        const { data: storeBySlug } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', storeSlugParam)
          .maybeSingle();

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
          if (storeSlugParam === 'suamarcaaqui' || storeSlugParam === 'store_default') {
            const { ensureMatrizStoreExists } = await import('../services/storeManagementService');
            const createdMatriz = await ensureMatrizStoreExists();
            setCurrentStore(normalizeStore(createdMatriz));
            setTenantNotFound(false);
            setTenantError(null);
            setIsResolvingTenant(false);
            return;
          }
          if (storeSlugParam === 'editaveisdocanva' || storeSlugParam === 'matriz' || storeSlugParam === 'store_editaveisdocanva') {
            const { data: matrizDb } = await supabase
              .from('stores')
              .select('*')
              .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,id.eq.matriz,slug.eq.matriz')
              .limit(1)
              .maybeSingle();
            if (matrizDb) {
              setCurrentStore(normalizeStore(matrizDb));
              setTenantNotFound(false);
              setTenantError(null);
              setIsResolvingTenant(false);
              return;
            }
          }
          console.warn('[TenantResolver] ❌ Loja com slug não encontrada:', storeSlugParam);
          setTenantNotFound(true);
          setTenantError(`Loja "${storeSlugParam}" não encontrada.`);
          setIsResolvingTenant(false);
          return;
        }
      }

      if (domainParam) {
        const { data: storeByDomainParam } = await supabase
          .from('stores')
          .select('*')
          .ilike('custom_domain', domainParam)
          .maybeSingle();

        if (storeByDomainParam) {
          console.log('[TenantResolver] ✅ Loja identificada pelo parâmetro ?domain:', storeByDomainParam.name);
          setCurrentStore(normalizeStore(storeByDomainParam));
          setTenantNotFound(false);
          setTenantError(null);
          setIsResolvingTenant(false);
          return;
        } else {
          console.warn('[TenantResolver] ❌ Domínio não encontrado via parâmetro ?domain:', domainParam);
          setTenantNotFound(true);
          setTenantError(`Domínio "${domainParam}" não encontrado.`);
          setIsResolvingTenant(false);
          return;
        }
      }

      if (previewStoreId && isLocal) {
        const { data: storeByPreviewId } = await supabase
          .from('stores')
          .select('*')
          .eq('id', previewStoreId)
          .maybeSingle();

        if (storeByPreviewId) {
          console.log('[TenantResolver] ✅ Loja identificada por preview de sessão:', storeByPreviewId.name);
          setCurrentStore(normalizeStore(storeByPreviewId));
          setTenantNotFound(false);
          setTenantError(null);
          setIsResolvingTenant(false);
          return;
        }
      }

      // 2. Resolução padrão por Host da requisição
      if (!isLocal && hostname && !isBaseDomain) {
        const cleanHost = hostname.replace(/^www\./, '');
        
        // Extrai subdomínio caso seja acessado como subdomínio da plataforma (ex: loja.seudominio.com)
        const hostParts = cleanHost.split('.');
        const possibleSubdomain = hostParts.length >= 3 && !['www', 'app', 'admin', 'api'].includes(hostParts[0])
          ? hostParts[0]
          : '';

        const orFilters = [
          `custom_domain.ilike.${hostname}`,
          `custom_domain.ilike.www.${cleanHost}`,
          `custom_domain.ilike.${cleanHost}`,
          `slug.eq.${cleanHost}`
        ];
        if (possibleSubdomain) {
          orFilters.push(`slug.eq.${possibleSubdomain}`);
        }

        const { data: matchedStore, error } = await supabase
          .from('stores')
          .select('*')
          .or(orFilters.join(','))
          .maybeSingle();

        if (matchedStore) {
          console.log('[TenantResolver] ✅ Loja identificada por domínio personalizado:', matchedStore.name, matchedStore.custom_domain);
          if (!matchedStore.is_active) {
            setTenantError('Esta loja encontra-se temporariamente desativada pelo administrador.');
          } else {
            setTenantError(null);
          }
          setTenantNotFound(false);
          setCurrentStore(normalizeStore(matchedStore));
          setIsResolvingTenant(false);
          return;
        } else {
          console.warn('[TenantResolver] ❌ Domínio não associado a nenhuma loja cadastrada:', hostname);
          setTenantNotFound(true);
          setTenantError(`Nenhuma loja cadastrada para o endereço "${hostname}".`);
          setIsResolvingTenant(false);
          return;
        }
      }

      // 3. Raiz da plataforma / Matriz (editaveisdocanva.com.br ou acesso sem slug de loja)
      setTenantNotFound(false);
      const { data: matrizFromDb } = await supabase
        .from('stores')
        .select('*')
        .or('slug.eq.editaveisdocanva,id.eq.store_editaveisdocanva,id.eq.matriz,slug.eq.matriz,custom_domain.ilike.editaveisdocanva.com.br')
        .limit(1)
        .maybeSingle();

      if (matrizFromDb) {
        console.log('[TenantResolver] 🏬 Loja Matriz Oficial carregada diretamente do Supabase:', matrizFromDb.name);
        setCurrentStore(normalizeStore(matrizFromDb));
      } else {
        const { data: defaultFromDb } = await supabase
          .from('stores')
          .select('*')
          .or('slug.eq.suamarcaaqui,id.eq.suamarcaaqui,custom_domain.ilike.suamarcaaqui.com.br,id.eq.store_default')
          .limit(1)
          .maybeSingle();

        if (defaultFromDb) {
          console.log('[TenantResolver] 🏬 Loja Modelo carregada diretamente do Supabase:', defaultFromDb.name);
          setCurrentStore(normalizeStore(defaultFromDb));
        } else {
          const { ensureMatrizStoreExists } = await import('../services/storeManagementService');
          const createdMatriz = await ensureMatrizStoreExists();
          setCurrentStore(normalizeStore(createdMatriz));
        }
      }

    } catch (err: any) {
      console.error('[TenantResolver] ❌ Falha na resolução de tenant:', err);
      setCurrentStore(DEFAULT_STORE);
    } finally {
      setIsResolvingTenant(false);
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
  // REQUISITO RIGOROSO 1: SUAMARCAAQUI é a loja matriz vitalícia (sem expiração)
  const isBaseStore = currentStore.slug === 'suamarcaaqui' || currentStore.id === 'suamarcaaqui' || currentStore.id === 'store_default';
  const now = Date.now();
  let daysRemaining: number | null = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (!isBaseStore && currentStore.id !== '__resolving_tenant__') {
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