import { StoreConfig, BenefitCard } from '../types';

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

export const STORE_CONFIG: StoreConfig = {
  storeName: 'Encantando Festa - Papelaria Personalizada',
  slogan: 'Transformando momentos especiais em memórias inesquecíveis',
  whatsappNumber: '5521974975884', // 55 21 97497-5884
  whatsappDisplay: '(21) 97497-5884',
  instagram: '@encantandofesta.papelaria',
  address: 'Ateliê Criativo - Rio de Janeiro / RJ',
  city: 'Rio de Janeiro - RJ',
  workingHours: 'Segunda a Sábado das 09h às 18h',
  minOrderValue: 20.00,
  benefitCards: DEFAULT_BENEFIT_CARDS,
  themeLayout: 'classic',
  colorPalette: 'pink_pastel',
  primaryColor: '#FF1493',
  logoUrl: '',
};

