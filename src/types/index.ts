export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  unitSuffix?: string; // ex: '/Un', '/Kit 10un', '/Pacote'
  originalPrice?: number;
  imageUrl?: string;
  image?: string;
  image_url?: string;
  photo_url?: string;
  videoUrl?: string;
  video_url?: string;
  mediaType?: 'image' | 'video';
  delivery_url?: string;
  deliveryUrl?: string;
  galleryImages?: string[];
  description?: string;
  inStock: boolean;
  isCustomizable?: boolean;
  customizationPlaceholder?: string;
  badge?: 'Mais Vendido' | 'Lançamento' | 'Personalizado' | 'Destaque' | 'Pronta Entrega';
  tags?: string[];
  minQuantity?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  subcategories: string[];
}

export interface BannerSlide {
  id: string;
  type: 'image' | 'text';
  // Se for imagem completa
  imageUrl?: string;
  altText?: string;
  // Se for texto / informativo
  tag?: string; // ex: "Atendimento & Encomendas"
  title?: string; // Frase / Título principal 1
  subtitle?: string; // Frase / Parágrafo 2
  highlightText?: string; // Frase de destaque 3 / aviso
  themeColor?: 'blue' | 'pink' | 'lilac' | 'yellow'; // Cor do cartão interno
  // Geral
  linkUrl?: string; // Link de redirecionamento opcional
  order: number;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  observations?: string; // ex: Nome do aniversariante, idade ou tema personalizado
}

export interface OrderCustomerInfo {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  eventDate?: string;
  deliveryType: 'retirada' | 'entrega';
  address?: string;
  neighborhood?: string;
  city?: string;
  paymentMethod: 'pix' | 'cartao' | 'dinheiro';
  generalNotes?: string;
}

export type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'relevance';

export interface FilterState {
  search: string;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: SortOption;
}

export interface StoreConfig {
  storeName: string;
  slogan: string;
  whatsappNumber: string; // ex: 5521974975884
  whatsappDisplay: string;
  instagram: string;
  address: string;
  city: string;
  workingHours: string;
  minOrderValue: number;
  mpAccessToken?: string;
}
