/**
 * Utilitário de geração e normalização de slugs amigáveis
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

/**
 * Gera um slug amigável e único a partir do nome do produto:
 * Adiciona um sufixo curto de 4 dígitos para garantir unicidade e evitar rejeição no banco de dados.
 * Ex: "Topo de Bolo Shaker" -> "topo-de-bolo-shaker-4819"
 */
export function generateUniqueSlug(name?: string | null): string {
  const raw = String(name || '').trim();
  const baseSlug = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'produto';

  const suffix = Date.now().toString().slice(-4);
  return `${baseSlug}-${suffix}`;
}
