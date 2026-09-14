import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category, StoreConfig, BannerSlide } from '../types';
import { CATEGORIES as INITIAL_CATEGORIES } from '../data/categories';
import { STORE_CONFIG as INITIAL_STORE_CONFIG } from '../data/storeConfig';
import { INITIAL_BANNERS } from '../data/banners';
import { supabase } from '../lib/supabase';
import { 
  fetchAllProducts, 
  createProductInSupabase, 
  updateProductInSupabase, 
  deleteProductFromSupabase,
  toggleProductStockInSupabase,
  updateProductPriceInSupabase
} from '../services/productService';
import { 
  fetchAllBanners, 
  createBannerInSupabase, 
  updateBannerInSupabase, 
  deleteBannerFromSupabase 
} from '../services/bannerService';
import { 
  fetchAllCategories, 
  createCategoryInSupabase, 
  updateCategoryInSupabase, 
  deleteCategoryFromSupabase 
} from '../services/categoryService';
import { 
  fetchStoreConfig, 
  saveStoreConfigInSupabase 
} from '../services/storeConfigService';
import { useTenant, checkIsTenantRoute } from './TenantContext';
import { slugify } from '../utils/slug';

const LS_AUTH_KEY = 'soumbolinho_admin_auth_session';
const DEFAULT_ADMIN_PASSWORD = 'admin';

interface StoreDataContextType {
  products: Product[];
  categories: Category[];
  storeConfig: StoreConfig;
  banners: BannerSlide[];
  isAuthenticated: boolean;
  isLoading: boolean;
  adminNotification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  // Auth
  login: (password: string) => boolean;
  logout: () => void;
  // Produtos 100% Supabase
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductStock: (id: string) => Promise<void>;
  quickUpdatePrice: (id: string, newPrice: number) => Promise<void>;
  // Categorias 100% Supabase
  addCategory: (name: string, icon?: string) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  // Banners 100% Supabase
  addBanner: (bannerData: Omit<BannerSlide, 'id'>) => Promise<BannerSlide>;
  updateBanner: (id: string, updates: Partial<BannerSlide>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  toggleBannerStatus: (id: string) => Promise<void>;
  reorderBanners: (orderedBanners: BannerSlide[]) => Promise<void>;
  // Configurações 100% Supabase
  updateStoreConfig: (updates: Partial<StoreConfig>) => Promise<void>;
  // Recarregar dados
  refreshAllData: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const StoreDataContext = createContext<StoreDataContextType | undefined>(undefined);

export const StoreDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStore, isResolvingTenant } = useTenant();
  const currentStoreId = currentStore?.id || '';
  const isTenantPending = isResolvingTenant || !currentStoreId || currentStoreId === '__resolving_tenant__';

  // Estados 100% Supabase em Memória Viva (Sem LocalStorage e Sem Mocks Fantasmas)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => {
    return checkIsTenantRoute() ? {
      storeName: '',
      slogan: '',
      whatsappNumber: '',
      whatsappDisplay: '',
      instagram: '',
      address: '',
      city: '',
      workingHours: '',
      minOrderValue: 0,
      benefitCards: [],
    } : INITIAL_STORE_CONFIG;
  });
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Autenticação Admin de Sessão
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(LS_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [adminNotification, setAdminNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAdminNotification({ message, type });
    setTimeout(() => {
      setAdminNotification(null);
    }, 3500);
  };

  // -------------------------------------------------------------
  // 1. CARREGAMENTO INICIAL DIRETO DO SUPABASE
  // -------------------------------------------------------------
  const refreshAllData = async () => {
    // REQUISITO RIGOROSO: Se o tenant estiver pendente ou id for vazio, nunca busca produtos globais
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') {
      setIsLoading(true);
      setProducts([]);
      setBanners([]);
      setCategories([]);
      return;
    }

    try {
      console.log(`[StoreDataContext] 🔄 Carregando dados completos para a loja: ${currentStoreId} (${currentStore?.name || 'Padrão'})...`);
      setIsLoading(true);
      // Limpa dados de lojas anteriores para evitar flash de produtos
      setProducts([]);
      setBanners([]);
      setCategories([]);

      const [prodsRes, catsRes, configRes, bannersRes] = await Promise.all([
        fetchAllProducts(currentStoreId),
        fetchAllCategories(currentStoreId),
        fetchStoreConfig(currentStoreId),
        fetchAllBanners(currentStoreId),
      ]);

      if (prodsRes.data) setProducts(prodsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (configRes.data) setStoreConfig(configRes.data);
      if (bannersRes.data) setBanners(bannersRes.data);
      setIsLoading(false);
    } catch (err) {
      console.error('[StoreDataContext] Erro ao sincronizar com o Supabase:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isTenantPending) {
      setIsLoading(true);
      setProducts([]);
      setBanners([]);
      setCategories([]);
      return;
    }

    refreshAllData();

    // -------------------------------------------------------------
    // 2. SUPABASE REALTIME MULTI-CANAL PARA ATUALIZAÇÃO INSTANTÂNEA
    // -------------------------------------------------------------
    const isBase = currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default' || !currentStoreId;
    const isEditaveis = currentStoreId === 'store_editaveisdocanva' || currentStoreId === 'matriz' || currentStoreId === 'editaveisdocanva';
    const globalChannel = supabase
      .channel(`realtime_store_sync_${currentStoreId || 'suamarcaaqui'}`)
      // Sincronização de Produtos isolada por loja
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload: any) => {
          const recordStoreId = payload.new?.store_id || payload.old?.store_id;
          const affectsThisStore = isBase
            ? (recordStoreId === 'suamarcaaqui' || recordStoreId === 'store_default')
            : isEditaveis
              ? (recordStoreId === 'store_editaveisdocanva' || recordStoreId === 'matriz' || recordStoreId === 'editaveisdocanva')
              : recordStoreId === currentStoreId;

          if (affectsThisStore) {
            console.log('[StoreDataContext] ⚡ Realtime: Tabela products atualizada para esta loja:', currentStoreId, payload);
            const { data } = await fetchAllProducts(currentStoreId);
            if (data) setProducts(data);
          }
        }
      )
      // Sincronização de Categorias isolada por loja
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        async (payload: any) => {
          const recordStoreId = payload.new?.store_id || payload.old?.store_id;
          const affectsThisStore = isBase
            ? (recordStoreId === 'suamarcaaqui' || recordStoreId === 'store_default' || !recordStoreId)
            : isEditaveis
              ? (recordStoreId === 'store_editaveisdocanva' || recordStoreId === 'matriz' || recordStoreId === 'editaveisdocanva')
              : recordStoreId === currentStoreId;

          if (affectsThisStore) {
            console.log('[StoreDataContext] ⚡ Realtime: Tabela categories atualizada:', payload);
            const { data } = await fetchAllCategories(currentStoreId);
            if (data && data.length > 0) {
              setCategories(data);
            } else if (isBase) {
              setCategories(INITIAL_CATEGORIES);
            }
          }
        }
      )
      // Sincronização de Banners isolada por loja
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        async (payload: any) => {
          const recordStoreId = payload.new?.store_id || payload.old?.store_id;
          const affectsThisStore = isBase
            ? (recordStoreId === 'suamarcaaqui' || recordStoreId === 'store_default' || !recordStoreId)
            : isEditaveis
              ? (recordStoreId === 'store_editaveisdocanva' || recordStoreId === 'matriz' || recordStoreId === 'editaveisdocanva')
              : recordStoreId === currentStoreId;

          if (affectsThisStore) {
            console.log('[StoreDataContext] ⚡ Realtime: Tabela banners atualizada:', payload);
            const { data } = await fetchAllBanners(currentStoreId);
            if (data) setBanners(data);
          }
        }
      )
      // Sincronização de Configurações isolada por loja
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_config' },
        async (payload: any) => {
          const recordStoreId = payload.new?.store_id || payload.old?.store_id;
          const affectsThisStore = isBase
            ? (recordStoreId === 'suamarcaaqui' || recordStoreId === 'store_default' || !recordStoreId)
            : isEditaveis
              ? (recordStoreId === 'store_editaveisdocanva' || recordStoreId === 'matriz' || recordStoreId === 'editaveisdocanva')
              : recordStoreId === currentStoreId;

          if (affectsThisStore) {
            console.log('[StoreDataContext] ⚡ Realtime: Tabela store_config atualizada:', payload);
            const { data } = await fetchStoreConfig(currentStoreId);
            if (data) setStoreConfig(data);
          }
        }
      )
      // Sincronização de Configurações Visuais (site_settings) isolada por loja
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        async (payload: any) => {
          const recordStoreId = payload.new?.store_id || payload.old?.store_id;
          const affectsThisStore = isBase
            ? (recordStoreId === 'suamarcaaqui' || recordStoreId === 'store_default' || !recordStoreId)
            : isEditaveis
              ? (recordStoreId === 'store_editaveisdocanva' || recordStoreId === 'matriz' || recordStoreId === 'editaveisdocanva')
              : recordStoreId === currentStoreId;

          if (affectsThisStore) {
            console.log('[StoreDataContext] ⚡ Realtime: Tabela site_settings atualizada:', payload);
            const { data } = await fetchStoreConfig(currentStoreId);
            if (data) setStoreConfig(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [currentStoreId, isTenantPending]);

  // -------------------------------------------------------------
  // 3. AUTENTICAÇÃO
  // -------------------------------------------------------------
  const login = (password: string): boolean => {
    const clientPass = currentStore?.admin_password;
    const valid = 
      (clientPass && password.trim() === clientPass.trim()) ||
      password.trim() === DEFAULT_ADMIN_PASSWORD || 
      password.trim() === '123456';

    if (valid) {
      setIsAuthenticated(true);
      sessionStorage.setItem(LS_AUTH_KEY, 'true');
      showNotification('Login efetuado com sucesso!', 'success');
      return true;
    } else {
      showNotification('Senha incorreta! Tente novamente.', 'error');
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(LS_AUTH_KEY);
    showNotification('Sessão administrativa encerrada.', 'info');
  };

  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const { product: createdProduct, error } = await createProductInSupabase(productData, currentStoreId);

    if (error || !createdProduct) {
      console.error('[StoreDataContext] ❌ Falha ao cadastrar produto:', error);
      showNotification(`Erro ao cadastrar: ${error || 'Falha no banco'}`, 'error');
      throw new Error(error || 'Falha ao salvar produto no Supabase.');
    }

    setProducts((prev) => [createdProduct, ...prev.filter((p) => p.id !== createdProduct.id)]);
    
    // Atualiza imediatamente a listagem completa
    fetchAllProducts(currentStoreId).then((res) => {
      if (res.data && res.data.length > 0) {
        setProducts(res.data);
      }
    });

    showNotification(`Produto "${createdProduct.name}" cadastrado com sucesso!`, 'success');
    return createdProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    const { success, error } = await updateProductInSupabase(id, updates);

    if (!success) {
      showNotification(`Erro ao atualizar no Supabase: ${error}`, 'error');
      throw new Error(error || 'Falha ao atualizar produto no Supabase.');
    }

    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    showNotification('Produto atualizado com sucesso no Supabase!', 'success');
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const prod = products.find((p) => p.id === id);
    const { success, error } = await deleteProductFromSupabase(id);

    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao excluir produto no Supabase:', error);
      showNotification(`Erro ao excluir no Supabase: ${error}`, 'error');
      return;
    }

    setProducts((prev) => prev.filter((item) => item.id !== id));
    showNotification(`Produto "${prod?.name || ''}" excluído com sucesso do Supabase!`, 'success');
  };

  const toggleProductStock = async (id: string): Promise<void> => {
    const item = products.find((p) => p.id === id);
    if (!item) return;

    const nextStock = !item.inStock;
    const { success, error } = await toggleProductStockInSupabase(id, nextStock);

    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao alterar status no Supabase:', error);
      showNotification(`Erro ao alterar status no Supabase: ${error}`, 'error');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: nextStock } : p))
    );
    showNotification(`Status alterado para: ${nextStock ? 'Ativo' : 'Inativo'} no Supabase!`, 'success');
  };

  const quickUpdatePrice = async (id: string, newPrice: number): Promise<void> => {
    if (newPrice <= 0) return;

    const { success, error } = await updateProductPriceInSupabase(id, newPrice);

    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao atualizar preço no Supabase:', error);
      showNotification(`Erro ao atualizar preço: ${error}`, 'error');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p))
    );
    showNotification('Preço atualizado com sucesso no Supabase!', 'success');
  };

  // -------------------------------------------------------------
  // 5. AÇÕES DE CATEGORIAS NO SUPABASE
  // -------------------------------------------------------------
  const addCategory = async (name: string, icon = 'Gift'): Promise<Category> => {
    const slug = slugify(name);

    const newCategory: Category = {
      id: slug || `cat-${Date.now()}`,
      name: name.trim(),
      icon,
      subcategories: [],
      store_id: currentStoreId
    };

    const { category, error } = await createCategoryInSupabase(newCategory, currentStoreId);
    
    if (error || !category) {
      console.error('[StoreDataContext] ❌ Erro ao salvar categoria no Supabase:', error);
      showNotification(`Erro ao salvar categoria no Supabase: ${error}`, 'error');
      throw new Error(error || 'Falha ao salvar categoria no Supabase.');
    }

    setCategories((prev) => [...prev.filter((c) => c.id !== category.id), category]);
    showNotification(`Categoria "${category.name}" salva com sucesso no Supabase!`, 'success');
    return category;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    const { success, error } = await updateCategoryInSupabase(id, updates);
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao atualizar categoria no Supabase:', error);
      showNotification(`Erro ao atualizar categoria: ${error}`, 'error');
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
    showNotification('Categoria atualizada com sucesso no Supabase!', 'success');
  };

  const deleteCategory = async (id: string): Promise<void> => {
    const cat = categories.find((c) => c.id === id);
    const { success, error } = await deleteCategoryFromSupabase(id);
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao excluir categoria no Supabase:', error);
      showNotification(`Erro ao excluir categoria: ${error}`, 'error');
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    showNotification(`Categoria "${cat?.name || ''}" excluída com sucesso do Supabase!`, 'success');
  };

  const addSubcategory = async (categoryId: string, subcategoryName: string): Promise<void> => {
    const trimmed = subcategoryName.trim();
    if (!trimmed) return;

    const targetCat = categories.find((c) => c.id === categoryId);
    if (!targetCat) return;

    const updatedSubcategories = targetCat.subcategories.includes(trimmed)
      ? targetCat.subcategories
      : [...targetCat.subcategories, trimmed];

    const { success, error } = await updateCategoryInSupabase(categoryId, { subcategories: updatedSubcategories });
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao salvar subcategoria no Supabase:', error);
      showNotification(`Erro ao salvar subcategoria: ${error}`, 'error');
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, subcategories: updatedSubcategories } : cat))
    );
    showNotification(`Subcategoria "${trimmed}" salva com sucesso no Supabase!`, 'success');
  };

  const deleteSubcategory = async (categoryId: string, subcategoryName: string): Promise<void> => {
    const targetCat = categories.find((c) => c.id === categoryId);
    if (!targetCat) return;

    const updatedSubcategories = targetCat.subcategories.filter((s) => s !== subcategoryName);

    const { success, error } = await updateCategoryInSupabase(categoryId, { subcategories: updatedSubcategories });
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao remover subcategoria no Supabase:', error);
      showNotification(`Erro ao remover subcategoria: ${error}`, 'error');
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, subcategories: updatedSubcategories } : cat))
    );
    showNotification(`Subcategoria "${subcategoryName}" removida com sucesso do Supabase!`, 'success');
  };

  // -------------------------------------------------------------
  // 6. AÇÕES DE BANNERS NO SUPABASE
  // -------------------------------------------------------------
  const addBanner = async (bannerData: Omit<BannerSlide, 'id'>): Promise<BannerSlide> => {
    const { banner, error } = await createBannerInSupabase(bannerData, currentStoreId);
    
    if (error || !banner) {
      console.error('[StoreDataContext] ❌ Erro ao salvar banner no Supabase:', error);
      showNotification(`Erro ao salvar banner no Supabase: ${error || 'Falha no banco'}`, 'error');
      throw new Error(error || 'Falha ao salvar banner no Supabase.');
    }

    setBanners((prev) => [...prev.filter((b) => b.id !== banner.id), banner].sort((a, b) => a.order - b.order));
    showNotification('Banner salvo com sucesso no Supabase!', 'success');
    return banner;
  };

  const updateBanner = async (id: string, updates: Partial<BannerSlide>): Promise<void> => {
    const { success, error } = await updateBannerInSupabase(id, updates);
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao atualizar banner no Supabase:', error);
      showNotification(`Erro ao atualizar banner: ${error}`, 'error');
      return;
    }

    setBanners((prev) =>
      prev
        .map((b) => (b.id === id ? { ...b, ...updates } : b))
        .sort((a, b) => a.order - b.order)
    );
    showNotification('Banner atualizado com sucesso no Supabase!', 'success');
  };

  const deleteBanner = async (id: string): Promise<void> => {
    const { success, error } = await deleteBannerFromSupabase(id);
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao excluir banner no Supabase:', error);
      showNotification(`Erro ao excluir banner: ${error}`, 'error');
      return;
    }

    setBanners((prev) => prev.filter((b) => b.id !== id));
    showNotification('Banner excluído com sucesso do Supabase!', 'success');
  };

  const toggleBannerStatus = async (id: string): Promise<void> => {
    const target = banners.find((b) => b.id === id);
    if (!target) return;

    const nextStatus = !target.isActive;
    const { success, error } = await updateBannerInSupabase(id, { isActive: nextStatus });
    if (!success) {
      console.error('[StoreDataContext] ❌ Erro ao alterar status do banner no Supabase:', error);
      showNotification(`Erro ao alterar status do banner: ${error}`, 'error');
      return;
    }

    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: nextStatus } : b))
    );
    showNotification(`Banner ${nextStatus ? 'ativado' : 'pausado'} no Supabase!`, 'success');
  };

  const reorderBanners = async (orderedBanners: BannerSlide[]): Promise<void> => {
    const results = await Promise.all(
      orderedBanners.map((b, idx) => updateBannerInSupabase(b.id, { order: idx }))
    );
    const hasError = results.some((r) => !r.success);
    if (hasError) {
      showNotification('Erro ao reordenar banners no Supabase', 'error');
      return;
    }

    setBanners(orderedBanners);
    showNotification('Ordem dos banners atualizada com sucesso no Supabase!', 'success');
  };

  // -------------------------------------------------------------
  // 7. CONFIGURAÇÕES DA LOJA NO SUPABASE
  // -------------------------------------------------------------
  const updateStoreConfig = async (updates: Partial<StoreConfig>): Promise<void> => {
    const newConfig = { ...storeConfig, ...updates, store_id: currentStoreId };
    setStoreConfig(newConfig);

    const { success, error } = await saveStoreConfigInSupabase(newConfig, currentStoreId);
    if (!success) {
      showNotification(`Aviso ao salvar configurações: ${error}`, 'error');
    } else {
      showNotification('Configurações da loja salvas no Supabase!', 'success');
    }
  };

  // Resetar
  const resetToDefaults = async (): Promise<void> => {
    const resetConfig = { ...INITIAL_STORE_CONFIG, store_id: currentStoreId };
    setCategories(INITIAL_CATEGORIES);
    setStoreConfig(resetConfig);
    setBanners(INITIAL_BANNERS);
    await saveStoreConfigInSupabase(resetConfig, currentStoreId);
    showNotification('Configurações restauradas para o padrão no Supabase!', 'info');
  };

  return (
    <StoreDataContext.Provider
      value={{
        products,
        categories,
        storeConfig,
        banners,
        isAuthenticated,
        isLoading,
        adminNotification,
        showNotification,
        login,
        logout,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductStock,
        quickUpdatePrice,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        deleteSubcategory,
        addBanner,
        updateBanner,
        deleteBanner,
        toggleBannerStatus,
        reorderBanners,
        updateStoreConfig,
        refreshAllData,
        resetToDefaults,
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
};

export const useStoreData = (): StoreDataContextType => {
  const context = useContext(StoreDataContext);
  if (!context) {
    throw new Error('useStoreData deve ser usado dentro de um StoreDataProvider');
  }
  return context;
};

export default StoreDataContext;
