import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';

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

const LOCAL_STORAGE_CART_KEY = 'soumbolinho_cart_items_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Falha ao recuperar carrinho do localStorage', e);
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Falha ao salvar carrinho no localStorage', e);
    }
  }, [items]);

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
    setItems((prevItems) => {
      // Se houver um item idêntico (mesmo produto, mesma observação e mesmo status de upsell)
      const existingItemIndex = prevItems.findIndex(
        (item) =>
          item.product.id === product.id &&
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
        id: `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product,
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
