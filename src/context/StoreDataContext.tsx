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
  // Estados 100% Supabase em Memória Viva (Sem LocalStorage para dados)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(INITIAL_STORE_CONFIG);
  const [banners, setBanners] = useState<BannerSlide[]>(INITIAL_BANNERS);
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
    try {
      console.log('[StoreDataContext] 🔄 Carregando dados completos diretamente do Supabase...');
      const [prodsRes, catsRes, configRes, bannersRes] = await Promise.all([
        fetchAllProducts(),
        fetchAllCategories(),
        fetchStoreConfig(),
        fetchAllBanners(),
      ]);

      if (prodsRes.data) setProducts(prodsRes.data);
      if (catsRes.data && catsRes.data.length > 0) {
        setCategories(catsRes.data);
      } else {
        console.log('[StoreDataContext] ℹ️ Categorias vazias no Supabase, aplicando categorias padrão (fallback).');
        setCategories(INITIAL_CATEGORIES);
      }
      if (configRes.data) setStoreConfig(configRes.data);
      if (bannersRes.data) setBanners(bannersRes.data);
      setIsLoading(false);
    } catch (err) {
      console.error('[StoreDataContext] Erro ao sincronizar com o Supabase:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();

    // -------------------------------------------------------------
    // 2. SUPABASE REALTIME MULTI-CANAL PARA ATUALIZAÇÃO INSTANTÂNEA
    // -------------------------------------------------------------
    const globalChannel = supabase
      .channel('realtime_store_sync_v3')
      // Sincronização de Produtos
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload) => {
          console.log('[StoreDataContext] ⚡ Realtime: Tabela products atualizada:', payload);
          const { data } = await fetchAllProducts();
          if (data) setProducts(data);
        }
      )
      // Sincronização de Categorias
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        async (payload) => {
          console.log('[StoreDataContext] ⚡ Realtime: Tabela categories atualizada:', payload);
          const { data } = await fetchAllCategories();
          if (data && data.length > 0) {
            setCategories(data);
          } else {
            setCategories(INITIAL_CATEGORIES);
          }
        }
      )
      // Sincronização de Banners
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        async (payload) => {
          console.log('[StoreDataContext] ⚡ Realtime: Tabela banners atualizada:', payload);
          const { data } = await fetchAllBanners();
          if (data) setBanners(data);
        }
      )
      // Sincronização de Configurações
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_config' },
        async (payload) => {
          console.log('[StoreDataContext] ⚡ Realtime: Tabela store_config atualizada:', payload);
          const { data } = await fetchStoreConfig();
          if (data) setStoreConfig(data);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        async (payload) => {
          console.log('[StoreDataContext] ⚡ Realtime: Tabela site_settings atualizada:', payload);
          const { data } = await fetchStoreConfig();
          if (data) setStoreConfig(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, []);

  // -------------------------------------------------------------
  // 3. AUTENTICAÇÃO
  // -------------------------------------------------------------
  const login = (password: string): boolean => {
    const valid = password.trim() === DEFAULT_ADMIN_PASSWORD || password.trim() === '123456';
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
    const { product: createdProduct, error } = await createProductInSupabase(productData);

    if (error || !createdProduct) {
      console.error('[StoreDataContext] ❌ Falha ao cadastrar produto:', error);
      showNotification(`Erro ao cadastrar: ${error || 'Falha no banco'}`, 'error');
      throw new Error(error || 'Falha ao salvar produto no Supabase.');
    }

    setProducts((prev) => [createdProduct, ...prev.filter((p) => p.id !== createdProduct.id)]);
    
    // Atualiza imediatamente a listagem completa
    fetchAllProducts().then((res) => {
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
      return;
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
      showNotification(`Erro ao excluir no Supabase: ${error}`, 'error');
      return;
    }

    setProducts((prev) => prev.filter((item) => item.id !== id));
    showNotification(`Produto "${prod?.name || ''}" excluído do Supabase!`, 'info');
  };

  const toggleProductStock = async (id: string): Promise<void> => {
    const item = products.find((p) => p.id === id);
    if (!item) return;

    const nextStock = !item.inStock;
    const { success, error } = await toggleProductStockInSupabase(id, nextStock);

    if (!success) {
      showNotification(`Erro ao alterar status: ${error}`, 'error');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: nextStock } : p))
    );
    showNotification(`Status alterado para: ${nextStock ? 'Disponível' : 'Indisponível'}`, 'info');
  };

  const quickUpdatePrice = async (id: string, newPrice: number): Promise<void> => {
    if (newPrice <= 0) return;

    const { success, error } = await updateProductPriceInSupabase(id, newPrice);

    if (!success) {
      showNotification(`Erro ao atualizar preço: ${error}`, 'error');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p))
    );
    showNotification('Preço atualizado no Supabase!', 'success');
  };

  // -------------------------------------------------------------
  // 5. AÇÕES DE CATEGORIAS NO SUPABASE
  // -------------------------------------------------------------
  const addCategory = async (name: string, icon = 'Gift'): Promise<Category> => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newCategory: Category = {
      id: slug || `cat-${Date.now()}`,
      name: name.trim(),
      icon,
      subcategories: []
    };

    setCategories((prev) => [...prev.filter((c) => c.id !== newCategory.id), newCategory]);
    const { error } = await createCategoryInSupabase(newCategory);
    
    if (error) {
      showNotification(`Aviso: salvo em memória (${error})`, 'info');
    } else {
      showNotification(`Categoria "${name}" salva no Supabase!`, 'success');
    }

    return newCategory;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
    const { error } = await updateCategoryInSupabase(id, updates);
    if (!error) {
      showNotification('Categoria atualizada no Supabase!', 'success');
    }
  };

  const deleteCategory = async (id: string): Promise<void> => {
    const cat = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteCategoryFromSupabase(id);
    showNotification(`Categoria "${cat?.name || ''}" excluída do Supabase!`, 'info');
  };

  const addSubcategory = async (categoryId: string, subcategoryName: string): Promise<void> => {
    const trimmed = subcategoryName.trim();
    if (!trimmed) return;

    const targetCat = categories.find((c) => c.id === categoryId);
    if (!targetCat) return;

    const updatedSubcategories = targetCat.subcategories.includes(trimmed)
      ? targetCat.subcategories
      : [...targetCat.subcategories, trimmed];

    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, subcategories: updatedSubcategories } : cat))
    );

    await updateCategoryInSupabase(categoryId, { subcategories: updatedSubcategories });
    showNotification(`Subcategoria "${trimmed}" salva no Supabase!`, 'success');
  };

  const deleteSubcategory = async (categoryId: string, subcategoryName: string): Promise<void> => {
    const targetCat = categories.find((c) => c.id === categoryId);
    if (!targetCat) return;

    const updatedSubcategories = targetCat.subcategories.filter((s) => s !== subcategoryName);

    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, subcategories: updatedSubcategories } : cat))
    );

    await updateCategoryInSupabase(categoryId, { subcategories: updatedSubcategories });
    showNotification(`Subcategoria "${subcategoryName}" removida do Supabase!`, 'info');
  };

  // -------------------------------------------------------------
  // 6. AÇÕES DE BANNERS NO SUPABASE
  // -------------------------------------------------------------
  const addBanner = async (bannerData: Omit<BannerSlide, 'id'>): Promise<BannerSlide> => {
    const { banner, error } = await createBannerInSupabase(bannerData);
    const finalBanner = banner || { ...bannerData, id: `banner_${Date.now()}` };

    setBanners((prev) => [...prev.filter((b) => b.id !== finalBanner.id), finalBanner].sort((a, b) => a.order - b.order));
    
    if (error) {
      showNotification(`Aviso ao salvar banner: ${error}`, 'info');
    } else {
      showNotification('Banner salvo no Supabase com sucesso!', 'success');
    }

    return finalBanner;
  };

  const updateBanner = async (id: string, updates: Partial<BannerSlide>): Promise<void> => {
    setBanners((prev) =>
      prev
        .map((b) => (b.id === id ? { ...b, ...updates } : b))
        .sort((a, b) => a.order - b.order)
    );
    const { error } = await updateBannerInSupabase(id, updates);
    if (!error) {
      showNotification('Banner atualizado no Supabase!', 'success');
    }
  };

  const deleteBanner = async (id: string): Promise<void> => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    await deleteBannerFromSupabase(id);
    showNotification('Banner excluído do Supabase!', 'info');
  };

  const toggleBannerStatus = async (id: string): Promise<void> => {
    const target = banners.find((b) => b.id === id);
    if (!target) return;

    const nextStatus = !target.isActive;
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: nextStatus } : b))
    );

    await updateBannerInSupabase(id, { isActive: nextStatus });
    showNotification('Status do banner atualizado no Supabase!', 'info');
  };

  const reorderBanners = async (orderedBanners: BannerSlide[]): Promise<void> => {
    setBanners(orderedBanners);
    await Promise.all(
      orderedBanners.map((b, idx) => updateBannerInSupabase(b.id, { order: idx }))
    );
    showNotification('Ordem dos banners atualizada no Supabase!', 'success');
  };

  // -------------------------------------------------------------
  // 7. CONFIGURAÇÕES DA LOJA NO SUPABASE
  // -------------------------------------------------------------
  const updateStoreConfig = async (updates: Partial<StoreConfig>): Promise<void> => {
    const newConfig = { ...storeConfig, ...updates };
    setStoreConfig(newConfig);

    const { success, error } = await saveStoreConfigInSupabase(newConfig);
    if (!success) {
      showNotification(`Aviso ao salvar configurações: ${error}`, 'error');
    } else {
      showNotification('Configurações da loja salvas no Supabase!', 'success');
    }
  };

  // Resetar
  const resetToDefaults = async (): Promise<void> => {
    setCategories(INITIAL_CATEGORIES);
    setStoreConfig(INITIAL_STORE_CONFIG);
    setBanners(INITIAL_BANNERS);
    await saveStoreConfigInSupabase(INITIAL_STORE_CONFIG);
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
