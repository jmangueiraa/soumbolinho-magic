export interface Product {
  id: string;
  store_id?: string;
  name: string;
  slug?: string;
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
  is_digital?: boolean;
  isDigital?: boolean;
  delivery_url?: string;
  deliveryUrl?: string;
  galleryImages?: string[];
  gallery_images?: string[];
  description?: string;
  detailed_description?: string;
  detailedDescription?: string;
  benefits?: string[] | string;
  checkout_url?: string;
  checkoutUrl?: string;
  testimonials?: Array<{ name: string; text: string; rating?: number; role?: string; avatar?: string }> | string;
  faq?: Array<{ question: string; answer: string }> | string;
  guarantee_days?: number;
  bonuses?: Array<{ title: string; description: string; originalPrice?: number; imageUrl?: string; badge?: string }> | string;
  inStock: boolean;
  isCustomizable?: boolean;
  customizationPlaceholder?: string;
  badge?: 'Mais Vendido' | 'Lançamento' | 'Personalizado' | 'Destaque' | 'Pronta Entrega';
  tags?: string[];
  minQuantity?: number;
  upsell_product_id?: string;
  upsellProductId?: string;
  upsell_price?: number;
  upsellPrice?: number;
  upsell_discount_percent?: number;
  upsellDiscountPercent?: number;
  weight_kg?: number;
  height_cm?: number;
  width_cm?: number;
  length_cm?: number;
  custom_shipping_price?: number;
}

export interface Category {
  id: string;
  store_id?: string;
  name: string;
  icon?: string;
  subcategories: string[];
}

export interface BannerSlide {
  id: string;
  store_id?: string;
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
  customPrice?: number;
  isUpsell?: boolean;
}

export interface DeliveryAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deadline: string;
  carrier?: string;
  isFree?: boolean;
  description?: string;
}

export interface StoreShippingConfig {
  originCep: string;
  melhorEnvioEnabled?: boolean;
  melhorEnvioToken?: string;
  economicEnabled?: boolean;
  economicName?: string;
  economicPrice?: number;
  economicDeadline?: string;
  expressEnabled?: boolean;
  expressName?: string;
  expressPrice?: number;
  expressDeadline?: string;
  freeShippingEnabled?: boolean;
  freeShippingMinAmount?: number;
  pickupEnabled?: boolean;
  pickupName?: string;
  pickupPrice?: number;
  pickupDeadline?: string;
  pickupAddress?: string;
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
  state?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  shippingMethod?: string;
  shippingCost?: number;
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

export interface BenefitCard {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export type ThemeLayoutType = 'classic' | 'modern' | 'minimal' | 'featured_grid';
export type ColorPaletteType = 'pink_pastel' | 'blue_corporate' | 'purple_elegant' | 'green_nature';

export interface StoreConfig {
  id?: string;
  store_id?: string;
  storeName: string;
  slogan: string;
  logoUrl?: string;
  whatsappNumber: string; // ex: 5521974975884
  whatsappDisplay: string;
  instagram: string;
  address: string;
  city: string;
  workingHours: string;
  minOrderValue: number;
  mpAccessToken?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  shippingConfig?: StoreShippingConfig;
  benefitCards?: BenefitCard[];
  primaryColor?: string;
  whatsappDefaultMessage?: string;
  themeLayout?: ThemeLayoutType;
  colorPalette?: ColorPaletteType;
  onlyLogo?: boolean;
}

export type DomainStatus = 'pending_dns' | 'active' | 'unconfigured' | 'ativo' | 'pendente';
export type SubscriptionStatus = 'active' | 'suspended' | 'trial';

export interface Store {
  id: string;
  name: string;
  store_name?: string;
  slug: string;
  custom_domain?: string | null;
  domain_status: DomainStatus;
  logo_url?: string;
  theme_settings?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    benefit_cards?: BenefitCard[];
    whatsapp_default_message?: string;
    theme_layout?: ThemeLayoutType;
    color_palette?: ColorPaletteType;
  };
  is_active: boolean;
  is_matriz?: boolean;
  subscription_status?: SubscriptionStatus;
  expires_at?: string | null;
  monthly_fee?: number;
  daysRemaining?: number | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  isTrial?: boolean;
  owner_name?: string | null;
  client_name?: string | null;
  owner_email?: string | null;
  client_email?: string | null;
  admin_password?: string | null;
  clone_catalog?: boolean;
  owner_phone?: string | null;
  whatsapp_number?: string | null;
  whatsapp_display?: string | null;
  instagram?: string | null;
  slogan?: string | null;
  address?: string | null;
  working_hours?: string | null;
  mp_access_token?: string | null;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoreUser {
  id: string;
  store_id: string;
  user_id?: string | null;
  email: string;
  role: 'owner' | 'admin';
  created_at?: string;
}

export interface MasterAdmin {
  id: string;
  email: string;
  created_at?: string;
}

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_uses?: number | null;
  uses_count?: number;
  expires_at?: string | null;
  is_active: boolean;
  description?: string;
  created_at?: string;
}
