/**
 * Utilitário para compartilhamento e geração de link direto do produto
 */

export function getProductShareUrl(productId: string): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/produto/${encodeURIComponent(productId)}`;
  }
  return `https://www.editaveisdocanva.com.br/produto/${encodeURIComponent(productId)}`;
}

/**
 * Copia o link direto do produto para a área de transferência
 */
export async function copyProductLink(productId: string): Promise<boolean> {
  const url = getProductShareUrl(productId);
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
