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

