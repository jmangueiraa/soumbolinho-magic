/**
 * Gera um slug amigável para URLs a partir do nome de um produto
 * Ex: "Topo de Bolo Shaker (Personalizado!)" -> "topo-de-bolo-shaker-personalizado"
 */
export function slugify(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .toString()
    .normalize('NFD') // Separa caracteres e acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/[\s_]+/g, '-') // Substitui espaços e underlines por traço
    .replace(/-+/g, '-') // Remove traços repetidos
    .replace(/^-+|-+$/g, ''); // Remove traços do início e fim
}
