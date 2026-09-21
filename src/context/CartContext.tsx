import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';
import { useTenant } from './TenantContext';

interface CartContextType {
  items: CartItem[];
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  toastMessage: string | null;
  addToCart: (
    product: Product, 
    quantity?: number, 
    observations?: string, 
    customPrice?: number, 
    isUpsell?: boolean
  ) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  updateObservations: (itemId: string, observations: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  totalItemsCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStore } = useTenant();
  const currentStoreId = currentStore?.id || '';
  const isBaseStore = currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default' || !currentStoreId;
  const storageKey = isBaseStore ? 'soumbolinho_cart_items_suamarcaaqui' : `soumbolinho_cart_items_${currentStoreId}`;

  const loadStoreCart = (sId: string): CartItem[] => {
    if (!sId || sId === '__resolving_tenant__') return [];
    try {
      const isBase = sId === 'suamarcaaqui' || sId === 'store_default';
      const key = isBase ? 'soumbolinho_cart_items_suamarcaaqui' : `soumbolinho_cart_items_${sId}`;
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      const parsed: CartItem[] = JSON.parse(saved);
      // Filtra estritamente itens que pertençam a esta loja
      return parsed.filter((item) => {
        const itemStoreId = (item.product.store_id || 'suamarcaaqui').toLowerCase();
        const isEditaveis = sId === 'store_editaveisdocanva' || sId === 'editaveisdocanva' || sId === 'editaveis-do-canva';
        return isBase 
          ? (itemStoreId === 'suamarcaaqui' || itemStoreId === 'store_default')
          : (itemStoreId === sId || (isEditaveis && (itemStoreId === 'matriz' || itemStoreId === 'store_editaveisdocanva' || itemStoreId === 'editaveisdocanva' || itemStoreId === 'editaveis-do-canva')));
      });
    } catch (e) {
      console.error('Falha ao recuperar carrinho do localStorage', e);
      return [];
    }
  };

  const [items, setItems] = useState<CartItem[]>(() => loadStoreCart(currentStoreId));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ao alternar de loja, recarrega estritamente o carrinho da loja ativa
  useEffect(() => {
    setItems(loadStoreCart(currentStoreId));
  }, [currentStoreId]);

  // Salvar no localStorage sempre que o carrinho mudar para a loja ativa
  useEffect(() => {
    if (!currentStoreId || currentStoreId === '__resolving_tenant__') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Falha ao salvar carrinho no localStorage', e);
    }
  }, [items, storageKey, currentStoreId]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const addToCart = (
    product: Product, 
    quantity: number = 1, 
    observations: string = '', 
    customPrice?: number, 
    isUpsell?: boolean
  ) => {
    const productWithStore: Product = {
      ...product,
      store_id: product.store_id || currentStoreId,
    };

    setItems((prevItems) => {
      // Se houver um item idêntico (mesmo produto, mesma observação e mesmo status de upsell)
      const existingItemIndex = prevItems.findIndex(
        (item) =>
          item.product.id === productWithStore.id &&
          (item.observations || '').trim() === (observations || '').trim() &&
          Boolean(item.isUpsell) === Boolean(isUpsell)
      );

      if (existingItemIndex > -1) {
        const updated = [...prevItems];
        updated[existingItemIndex] = {
          ...updated[existingItemIndex],
          quantity: updated[existingItemIndex].quantity + quantity,
          customPrice: customPrice !== undefined ? customPrice : updated[existingItemIndex].customPrice,
          isUpsell: isUpsell ?? updated[existingItemIndex].isUpsell,
        };
        return updated;
      }

      // Novo item no carrinho
      const newItem: CartItem = {
        id: `${productWithStore.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product: productWithStore,
        quantity,
        observations: observations.trim() || undefined,
        customPrice,
        isUpsell,
      };
      return [...prevItems, newItem];
    });

    // Abre a gaveta do carrinho direto
    setIsCartOpen(true);
    showToast(`"${product.name}" adicionado ao carrinho!`);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const updateObservations = (itemId: string, observations: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, observations: observations.trim() || undefined } : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const unitPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        isCheckoutOpen,
        toastMessage,
        addToCart,
        updateQuantity,
        updateObservations,
        removeFromCart,
        clearCart,
        openCart,
        closeCart,
        openCheckout,
        closeCheckout,
        totalItemsCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};
