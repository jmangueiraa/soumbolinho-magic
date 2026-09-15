import { ColorPaletteType, ThemeLayoutType } from '../types';

export interface ColorPaletteConfig {
  id: ColorPaletteType;
  name: string;
  description: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primarySubtle: string;
  accent: string;
  headerBg: string;
  headerBorder: string;
  previewColors: [string, string, string];
}

export const COLOR_PALETTES: Record<ColorPaletteType, ColorPaletteConfig> = {
  pink_pastel: {
    id: 'pink_pastel',
    name: 'Rosa Pastel / Festa',
    description: 'Tons vibrantes e festivos, perfeito para papelaria, festas e sublimação.',
    primary: '#FF1493',
    primaryHover: '#e61e80',
    primaryLight: '#FFEBF6',
    primarySubtle: '#FFF5F9',
    accent: '#ff3399',
    headerBg: '#000000',
    headerBorder: '#27272a',
    previewColors: ['#FF1493', '#ff3399', '#FFEBF6'],
  },
  blue_corporate: {
    id: 'blue_corporate',
    name: 'Azul Corporativo / Confiança',
    description: 'Visual moderno e profissional, ideal para produtos corporativos e tecnologia.',
    primary: '#0284C7',
    primaryHover: '#0369A1',
    primaryLight: '#E0F2FE',
    primarySubtle: '#F0F9FF',
    accent: '#38BDF8',
    headerBg: '#0F172A',
    headerBorder: '#1E293B',
    previewColors: ['#0284C7', '#38BDF8', '#E0F2FE'],
  },
  purple_elegant: {
    id: 'purple_elegant',
    name: 'Roxo Elegante / Criativo',
    description: 'Sofisticação e criatividade com toques luxuosos e refinados.',
    primary: '#8B5CF6',
    primaryHover: '#7C3AED',
    primaryLight: '#F3E8FF',
    primarySubtle: '#FAF5FF',
    accent: '#A855F7',
    headerBg: '#1E1B4B',
    headerBorder: '#2E1065',
    previewColors: ['#8B5CF6', '#A855F7', '#F3E8FF'],
  },
  green_nature: {
    id: 'green_nature',
    name: 'Verde Natureza / Frescor',
    description: 'Sensação orgânica e acolhedora, ideal para artesanato, convites e lembrancinhas.',
    primary: '#10B981',
    primaryHover: '#059669',
    primaryLight: '#D1FAE5',
    primarySubtle: '#ECFDF5',
    accent: '#34D399',
    headerBg: '#064E3B',
    headerBorder: '#065F46',
    previewColors: ['#10B981', '#34D399', '#D1FAE5'],
  },
};

export interface ThemeLayoutConfig {
  id: ThemeLayoutType;
  name: string;
  tag: string;
  description: string;
  features: string[];
}

export const THEME_LAYOUTS: Record<ThemeLayoutType, ThemeLayoutConfig> = {
  classic: {
    id: 'classic',
    name: 'Clássico',
    tag: 'Tradicional',
    description: 'Barra lateral de categorias à esquerda, banner topo tradicional e barra de destaques.',
    features: ['Menu lateral vertical completo', 'Destaques com ícones circulares', 'Grid balanceado de 3-4 colunas'],
  },
  modern: {
    id: 'modern',
    name: 'Moderno',
    tag: 'Mais Popular',
    description: 'Navegação por chips horizontais de categorias no topo, cantos arredondados e cards modernos.',
    features: ['Pills horizontais de categorias rápidas', 'Cards com sombras suaves e cantos modernos', 'Visual fluido'],
  },
  minimal: {
    id: 'minimal',
    name: 'Minimalista',
    tag: 'Clean',
    description: 'Design limpo e sem distrações decorativas, priorizando a arte do produto e tipografia sóbria.',
    features: ['Foco direto na vitrine de produtos', 'Bordas sutis e tipografia refinada', 'Navegação rápida'],
  },
  featured_grid: {
    id: 'featured_grid',
    name: 'Grid em Destaque',
    tag: 'Alta Conversão',
    description: 'Produtos em largura total (sem barra lateral fixa ocupando espaço), com filtros horizontais no topo.',
    features: ['Grade de 4 a 5 colunas no desktop', 'Filtros rápidos no topo da página', 'Máximo aproveitamento de tela'],
  },
};

/**
 * Injeta variáveis de cores e atributos no documento em tempo real
 */
export function applyThemeToDocument(
  colorPaletteId: ColorPaletteType = 'pink_pastel',
  customPrimaryColor?: string,
  themeLayout: ThemeLayoutType = 'classic'
) {
  if (typeof document === 'undefined') return;

  const palette = COLOR_PALETTES[colorPaletteId] || COLOR_PALETTES.pink_pastel;
  const primary = customPrimaryColor && customPrimaryColor.trim().length > 0 
    ? customPrimaryColor 
    : palette.primary;

  const root = document.documentElement;

  // Variável CSS global solicitada (--primary-color)
  root.style.setProperty('--primary-color', primary);

  // Variáveis derivadas do tema
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-hover', palette.primaryHover);
  root.style.setProperty('--color-primary-light', palette.primaryLight);
  root.style.setProperty('--color-primary-subtle', palette.primarySubtle);
  root.style.setProperty('--color-accent', palette.accent);
  root.style.setProperty('--header-bg', palette.headerBg);
  root.style.setProperty('--header-border', palette.headerBorder);

  root.setAttribute('data-theme', colorPaletteId);
  root.setAttribute('data-layout', themeLayout);
  if (document.body) {
    document.body.setAttribute('data-theme', colorPaletteId);
    document.body.setAttribute('data-layout', themeLayout);
  }
}
