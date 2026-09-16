import { StoreConfig, BenefitCard, StoreFeatureItem } from '../types';

export const DEFAULT_BENEFIT_CARDS: BenefitCard[] = [
  {
    id: 'card_1',
    title: 'Arquivos Digitais',
    description: 'Modelos prontos para impressão',
    icon: 'heart',
  },
  {
    id: 'card_2',
    title: 'Compra Segura',
    description: 'Pix com liberação imediata',
    icon: 'shield',
  },
  {
    id: 'card_3',
    title: 'Link Imediato',
    description: 'Download direto na tela e e-mail',
    icon: 'truck',
  },
  {
    id: 'card_4',
    title: 'Atendimento WhatsApp',
    description: 'SeuWhatsAppWhatsApp',
    icon: 'message',
  },
];

export const DEFAULT_STORE_FEATURES: StoreFeatureItem[] = [
  {
    id: 'feat_1',
    title: 'Arquivos Editáveis',
    subtitle: '',
    icon: 'file-archive',
    link: '',
  },
  {
    id: 'feat_2',
    title: 'Compra Segura',
    subtitle: '',
    icon: 'shopping-basket',
    link: '',
  },
  {
    id: 'feat_3',
    title: 'Acesso Vitalício',
    subtitle: '',
    icon: 'users',
    link: '',
  },
];

export const DEFAULT_MAIN_CTA_TEXT = 'Toda loja com Download imediato!';

export const STORE_CONFIG: StoreConfig = {
  storeName: 'AJPSTORE',
  slogan: 'Sua Loja Online em Minutos',
  whatsappNumber: '5511999999999',
  whatsappDisplay: '(11) 99999-9999',
  instagram: '@ajpstore',
  address: 'São Paulo - SP',
  city: 'São Paulo - SP',
  workingHours: 'Segunda a Sábado das 09h às 18h',
  minOrderValue: 0.00,
  benefitCards: DEFAULT_BENEFIT_CARDS,
  storeFeatures: DEFAULT_STORE_FEATURES,
  mainCtaText: DEFAULT_MAIN_CTA_TEXT,
  mainCtaLink: '',
  themeLayout: 'classic',
  colorPalette: 'blue_cyan',
  primaryColor: '#0062FF',
  logoUrl: '/ajpstore-logo.png',
};

export interface DefaultCategoryTemplate {
  name: string;
  icon: string;
}

export const DEFAULT_TEMPLATE_CATEGORIES: DefaultCategoryTemplate[] = [
  { name: 'Categoria 1', icon: 'ShoppingBag' },
  { name: 'Categoria 2', icon: 'Gift' },
  { name: 'Categoria 3', icon: 'Sparkles' },
  { name: 'Categoria 4', icon: 'Star' },
];

export interface DefaultProductTemplate {
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  description: string;
  inStock: boolean;
  unitSuffix: string;
  tags?: string[];
}

export const DEFAULT_TEMPLATE_PRODUCTS: DefaultProductTemplate[] = [
  {
    name: 'PRODUTO 1',
    price: 1.00,
    category: 'Categoria 1',
    imageUrl: '/default-product.jpg',
    description: 'Produto de exemplo configurado para sua loja. Você pode editar nome, imagem, valor e descrição a qualquer momento no Painel Admin.',
    inStock: true,
    unitSuffix: '/Un',
    tags: ['Destaque']
  },
  {
    name: 'PRODUTO 2',
    price: 2.00,
    category: 'Categoria 2',
    imageUrl: '/default-product.jpg',
    description: 'Produto de exemplo configurado para sua loja. Você pode editar nome, imagem, valor e descrição a qualquer momento no Painel Admin.',
    inStock: true,
    unitSuffix: '/Un',
    tags: ['Destaque']
  },
  {
    name: 'PRODUTO 3',
    price: 3.00,
    category: 'Categoria 3',
    imageUrl: '/default-product.jpg',
    description: 'Produto de exemplo configurado para sua loja. Você pode editar nome, imagem, valor e descrição a qualquer momento no Painel Admin.',
    inStock: true,
    unitSuffix: '/Un',
    tags: ['Destaque']
  },
  {
    name: 'PRODUTO 4',
    price: 4.00,
    category: 'Categoria 4',
    imageUrl: '/default-product.jpg',
    description: 'Produto de exemplo configurado para sua loja. Você pode editar nome, imagem, valor e descrição a qualquer momento no Painel Admin.',
    inStock: true,
    unitSuffix: '/Un',
    tags: ['Destaque']
  },
];


