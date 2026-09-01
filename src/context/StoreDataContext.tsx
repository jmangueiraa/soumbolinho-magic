import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category, StoreConfig, BannerSlide } from '../types';
import { PRODUCTS as INITIAL_PRODUCTS } from '../data/products';
import { CATEGORIES as INITIAL_CATEGORIES } from '../data/categories';
import { STORE_CONFIG as INITIAL_STORE_CONFIG } from '../data/storeConfig';
import { INITIAL_BANNERS } from '../data/banners';
import { supabase } from '../lib/supabase';

const LS_PRODUCTS_KEY = 'encantando_festa_products_v2';
const LS_CATEGORIES_KEY = 'encantando_festa_categories_v2';
const LS_CONFIG_KEY = 'encantando_festa_config_v2';
const LS_BANNERS_KEY = 'encantando_festa_banners_v2';
const LS_AUTH_KEY = 'encantando_festa_admin_auth_v2';

const DEFAULT_ADMIN_PASSWORD = 'admin';

interface StoreDataContextType {
  products: Product[];
  categories: Category[];
  storeConfig: StoreConfig;
  banners: BannerSlide[];
  isAuthenticated: boolean;
  adminNotification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  // Auth
  login: (password: string) => boolean;
  logout: () => void;
  // Produtos
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductStock: (id: string) => void;
  quickUpdatePrice: (id: string, newPrice: number) => void;
  // Categorias
  addCategory: (name: string, icon?: string) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (categoryId: string, subcategoryName: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => void;
  // Banners / Carrossel
  addBanner: (bannerData: Omit<BannerSlide, 'id'>) => BannerSlide;
  updateBanner: (id: string, updates: Partial<BannerSlide>) => void;
  deleteBanner: (id: string) => void;
  toggleBannerStatus: (id: string) => void;
  reorderBanners: (orderedBanners: BannerSlide[]) => void;
  // Configurações
  updateStoreConfig: (updates: Partial<StoreConfig>) => void;
  // Reset
  resetToDefaults: () => void;
}

const StoreDataContext = createContext<StoreDataContextType | undefined>(undefined);

export const StoreDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Produtos
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(LS_PRODUCTS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // 2. Categorias
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(LS_CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // 3. Configurações da Loja
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => {
    try {
      const saved = localStorage.getItem(LS_CONFIG_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STORE_CONFIG;
    } catch {
      return INITIAL_STORE_CONFIG;
    }
  });

  // 4. Banners do Topo
  const [banners, setBanners] = useState<BannerSlide[]>(() => {
    try {
      const saved = localStorage.getItem(LS_BANNERS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_BANNERS;
    } catch {
      return INITIAL_BANNERS;
    }
  });

  // 5. Autenticação Admin
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

  // Sincronizar produtos com o Supabase na inicialização (select *)
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        console.log('[StoreDataContext] 🔄 Buscando produtos do Supabase com select("*")...');
        const { data, error } = await supabase.from('products').select('*');

        if (error) {
          console.log('[StoreDataContext] Tabela Supabase não configurada ou erro (usando LocalStorage):', error.message);
          return;
        }

        if (data && data.length > 0) {
          console.log('[StoreDataContext] ✅ Produtos encontrados no Supabase:', data.length);
          const mappedProducts: Product[] = data.map((item: any) => {
            const rawImg = 
              item.image || 
              item.image_url || 
              item.imageUrl || 
              item.photo_url || 
              (Array.isArray(item.images) && item.images[0]) || 
              '';

            const cleanImg = typeof rawImg === 'string' ? rawImg.trim() : '';

            return {
              id: String(item.id),
              name: item.name,
              category: item.category,
              subcategory: item.subcategory || item.sub_category || undefined,
              price: Number(item.price) || 0,
              unitSuffix: item.unitSuffix || item.unit_suffix || '/Un',
              originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
              imageUrl: cleanImg,
              image: cleanImg,
              image_url: cleanImg,
              photo_url: cleanImg,
              description: item.description || undefined,
              inStock: item.inStock !== false && item.in_stock !== false,
              isCustomizable: item.isCustomizable ?? item.is_customizable ?? true,
              customizationPlaceholder: item.customizationPlaceholder || item.customization_placeholder || undefined,
              badge: item.badge || undefined,
              tags: item.tags || undefined,
            };
          });

          setProducts(mappedProducts);
        }
      } catch (err) {
        console.error('[StoreDataContext] Erro ao sincronizar com Supabase:', err);
      }
    }

    loadFromSupabase();
  }, []);

  // Sincronizar produtos no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Falha ao salvar produtos no LocalStorage', e);
    }
  }, [products]);

  // Sincronizar categorias
  useEffect(() => {
    try {
      localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Falha ao salvar categorias no LocalStorage', e);
    }
  }, [categories]);

  // Sincronizar configurações
  useEffect(() => {
    try {
      localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(storeConfig));
    } catch (e) {
      console.error('Falha ao salvar configurações no LocalStorage', e);
    }
  }, [storeConfig]);

  // Sincronizar banners
  useEffect(() => {
    try {
      localStorage.setItem(LS_BANNERS_KEY, JSON.stringify(banners));
    } catch (e) {
      console.error('Falha ao salvar banners no LocalStorage', e);
    }
  }, [banners]);

  // Login / Logout
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

  // Ações de Produtos
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalImg = productData.imageUrl || productData.image_url || productData.image || '';

    const newProduct: Product = {
      ...productData,
      id: newId,
      imageUrl: finalImg,
      image: finalImg,
      image_url: finalImg,
      photo_url: finalImg,
    };

    setProducts((prev) => [newProduct, ...prev]);
    showNotification(`Produto "${newProduct.name}" cadastrado com sucesso!`, 'success');

    // Persistência no Supabase Database
    supabase
      .from('products')
      .upsert({
        id: newId,
        name: newProduct.name,
        category: newProduct.category,
        subcategory: newProduct.subcategory,
        price: newProduct.price,
        unit_suffix: newProduct.unitSuffix,
        image_url: finalImg,
        image: finalImg,
        description: newProduct.description,
        in_stock: newProduct.inStock,
        badge: newProduct.badge,
        is_customizable: newProduct.isCustomizable,
        customization_placeholder: newProduct.customizationPlaceholder,
      })
      .then(({ error }) => {
        if (error) {
          console.log('[StoreDataContext] Nota: produto gravado no LocalStorage. (Supabase DB:', error.message, ')');
        } else {
          console.log('[StoreDataContext] ✅ Produto gravado no Supabase DB com sucesso!');
        }
      })
      .catch((e) => console.warn(e));

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const finalImg = updates.imageUrl || updates.image_url || updates.image;
    const finalUpdates = {
      ...updates,
      ...(finalImg ? { imageUrl: finalImg, image: finalImg, image_url: finalImg, photo_url: finalImg } : {})
    };

    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...finalUpdates } : item))
    );
    showNotification('Produto atualizado com sucesso!', 'success');

    // Atualizar no Supabase
    supabase
      .from('products')
      .update({
        name: updates.name,
        category: updates.category,
        subcategory: updates.subcategory,
        price: updates.price,
        unit_suffix: updates.unitSuffix,
        ...(finalImg ? { image_url: finalImg, image: finalImg } : {}),
        description: updates.description,
        in_stock: updates.inStock,
        badge: updates.badge,
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.log('[StoreDataContext] Atualização Supabase DB:', error.message);
      })
      .catch((e) => console.warn(e));
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((item) => item.id !== id));
    showNotification(`Produto "${prod?.name || ''}" removido!`, 'info');

    // Remover do Supabase
    supabase.from('products').delete().eq('id', id).then().catch();
  };

  const toggleProductStock = (id: string) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStock = !item.inStock;
          showNotification(`Status alterado para: ${nextStock ? 'Disponível' : 'Indisponível'}`, 'info');
          
          supabase.from('products').update({ in_stock: nextStock }).eq('id', id).then().catch();
          return { ...item, inStock: nextStock };
        }
        return item;
      })
    );
  };

  const quickUpdatePrice = (id: string, newPrice: number) => {
    if (newPrice <= 0) return;
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: newPrice } : item))
    );
    showNotification('Preço atualizado com sucesso!', 'success');

    supabase.from('products').update({ price: newPrice }).eq('id', id).then().catch();
  };

  // Ações de Categorias
  const addCategory = (name: string, icon = 'Gift'): Category => {
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

    setCategories((prev) => [...prev, newCategory]);
    showNotification(`Categoria "${name}" criada com sucesso!`, 'success');
    return newCategory;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
    showNotification('Categoria atualizada!', 'success');
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showNotification(`Categoria "${cat?.name || ''}" excluída!`, 'info');
  };

  const addSubcategory = (categoryId: string, subcategoryName: string) => {
    const trimmed = subcategoryName.trim();
    if (!trimmed) return;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          if (cat.subcategories.includes(trimmed)) return cat;
          return {
            ...cat,
            subcategories: [...cat.subcategories, trimmed]
          };
        }
        return cat;
      })
    );
    showNotification(`Subcategoria "${trimmed}" adicionada!`, 'success');
  };

  const deleteSubcategory = (categoryId: string, subcategoryName: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            subcategories: cat.subcategories.filter((s) => s !== subcategoryName)
          };
        }
        return cat;
      })
    );
    showNotification(`Subcategoria "${subcategoryName}" removida!`, 'info');
  };

  // Ações de Banners / Carrossel
  const addBanner = (bannerData: Omit<BannerSlide, 'id'>): BannerSlide => {
    const newId = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBanner: BannerSlide = {
      ...bannerData,
      id: newId,
    };
    setBanners((prev) => [...prev, newBanner].sort((a, b) => a.order - b.order));
    showNotification('Novo banner adicionado com sucesso!', 'success');
    return newBanner;
  };

  const updateBanner = (id: string, updates: Partial<BannerSlide>) => {
    setBanners((prev) =>
      prev
        .map((b) => (b.id === id ? { ...b, ...updates } : b))
        .sort((a, b) => a.order - b.order)
    );
    showNotification('Banner atualizado!', 'success');
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    showNotification('Banner excluído!', 'info');
  };

  const toggleBannerStatus = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
    showNotification('Status do banner alterado!', 'info');
  };

  const reorderBanners = (orderedBanners: BannerSlide[]) => {
    setBanners(orderedBanners);
    showNotification('Ordem dos banners atualizada!', 'success');
  };

  // Configurações
  const updateStoreConfig = (updates: Partial<StoreConfig>) => {
    setStoreConfig((prev) => ({ ...prev, ...updates }));
    showNotification('Configurações da loja salvas com sucesso!', 'success');
  };

  // Restaurar dados padrão de fábrica
  const resetToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setStoreConfig(INITIAL_STORE_CONFIG);
    setBanners(INITIAL_BANNERS);
    localStorage.removeItem(LS_PRODUCTS_KEY);
    localStorage.removeItem(LS_CATEGORIES_KEY);
    localStorage.removeItem(LS_CONFIG_KEY);
    localStorage.removeItem(LS_BANNERS_KEY);
    showNotification('Dados restaurados para o padrão!', 'info');
  };

  return (
    <StoreDataContext.Provider
      value={{
        products,
        categories,
        storeConfig,
        banners,
        isAuthenticated,
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
