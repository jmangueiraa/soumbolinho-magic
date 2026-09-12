export interface ProductBonusItem {
  title: string;
  description: string;
  originalPrice: number;
  imageUrl?: string;
  badge?: string;
}

export const DEFAULT_BONUSES: ProductBonusItem[] = [
  {
    title: 'Pack com +100 Fontes Mais Usadas em Festas e Toppers',
    description: 'As tipografias infantis e comemorativas mais procuradas do momento, prontas para usar no Canva ou computador.',
    originalPrice: 47.0,
    imageUrl: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&q=80',
    badge: 'BÔNUS #1',
  },
  {
    title: 'Guia Secreto de Fornecedores de Papéis, Acetato e Shaker',
    description: 'Lista exclusiva com os melhores fornecedores do Brasil para comprar papéis especiais, lamicote e lantejoulas a preço de atacado.',
    originalPrice: 37.0,
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80',
    badge: 'BÔNUS #2',
  },
  {
    title: 'Planilha Automática de Precificação de Papelaria Personalizada',
    description: 'Descubra exatamente quanto cobrar por cada topo de bolo e lembrancinha para nunca mais ter prejuízo e lucrar de verdade.',
    originalPrice: 49.0,
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    badge: 'BÔNUS #3',
  },
];
