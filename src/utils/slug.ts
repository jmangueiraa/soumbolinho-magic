/**
 * Utilitário de geração e normalização de slugs amigáveis
 */

export function slugify(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .toString()
    .normalize('NFD') // remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // troca espaços e símbolos por hífen
    .replace(/^-+|-+$/g, ''); // remove hífens das pontas
}

/**
 * Gera o slug limpo apenas com base no nome do produto (estritamente sem sufixo numérico)
 * Ex: "Topo de Bolo Shaker" -> "topo-de-bolo-shaker"
 */
export function generateSlug(name?: string | null): string {
  return slugify(name);
}

// Mantido como alias para garantir compatibilidade
export const generateUniqueSlug = generateSlug;
