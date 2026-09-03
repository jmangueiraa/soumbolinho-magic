/**
 * Utilitário para compartilhamento e geração de link amigável do produto na raiz (/:slug)
 */
import { Product } from '../types';
import { slugify } from './slug';

export function getProductSlug(productOrSlug: Product | string, fallbackName?: string): string {
  if (typeof productOrSlug === 'object' && productOrSlug !== null) {
    if (productOrSlug.slug && productOrSlug.slug.trim().length > 0) {
      return productOrSlug.slug.trim();
    }
    if (productOrSlug.name) {
      return slugify(productOrSlug.name);
    }
    return productOrSlug.id;
  }

  if (typeof productOrSlug === 'string') {
    const clean = productOrSlug.trim();
    // Se for um ID que começa com prod_ e tivermos um fallbackName
    if (clean.startsWith('prod_') && fallbackName) {
      return slugify(fallbackName);
    }
    return clean;
  }

  return '';
}

/**
 * Retorna a URL absoluta amigável direta na raiz do site:
 * https://www.editaveisdocanva.com.br/:slug (ex: /topo-de-bolo-shaker)
 */
export function getProductShareUrl(productOrSlug: Product | string, fallbackName?: string): string {
  const finalSlug = getProductSlug(productOrSlug, fallbackName);
  
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/${encodeURIComponent(finalSlug)}`;
  }
  return `https://www.editaveisdocanva.com.br/${encodeURIComponent(finalSlug)}`;
}

/**
 * Copia o link direto amigável do produto para a área de transferência
 */
export async function copyProductLink(productOrSlug: Product | string, fallbackName?: string): Promise<boolean> {
  const url = getProductShareUrl(productOrSlug, fallbackName);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (err) {
    console.error('Falha ao copiar link para o clipboard:', err);
    return false;
  }
}
