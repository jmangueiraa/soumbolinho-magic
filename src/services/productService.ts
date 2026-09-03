import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { slugify, generateUniqueSlug } from '../utils/slug';

/**
 * Mapeia um registro bruto da tabela 'products' do Supabase para o modelo Product
 */
export function mapSupabaseProduct(item: any): Product {
  const rawImg = (
    item.image || 
    item.image_url || 
    item.imageUrl || 
    item.photo_url || 
    (Array.isArray(item.images) && item.images[0]) || 
    (Array.isArray(item.galleryImages) && item.galleryImages[0]) || 
    ''
  ).trim();

  const rawName = String(item.name || '').trim();
  const rawSlug = (item.slug || slugify(rawName) || String(item.id)).trim();

  return {
    id: String(item.id),
    name: rawName,
    slug: rawSlug,
    category: String(item.category || '').trim(),
    subcategory: item.subcategory || item.sub_category || undefined,
    price: Number(item.price) || 0,
    unitSuffix: item.unitSuffix || item.unit_suffix || '/Un',
    originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
    imageUrl: rawImg,
    image: rawImg,
    image_url: rawImg,
    photo_url: rawImg,
    description: item.description || undefined,
    delivery_url: item.delivery_url || item.deliveryUrl || undefined,
    deliveryUrl: item.delivery_url || item.deliveryUrl || undefined,
    inStock: item.inStock !== false && item.in_stock !== false && item.active !== false,
    isCustomizable: item.isCustomizable ?? item.is_customizable ?? true,
    customizationPlaceholder: item.customizationPlaceholder || item.customization_placeholder || undefined,
    badge: item.badge || undefined,
    tags: item.tags || undefined,
  };
}

/**
 * 1. Busca TODOS os produtos diretamente do Supabase
 */
export async function fetchAllProducts(): Promise<{ data: Product[]; error: string | null }> {
  try {
    console.log('[productService] 📦 Buscando catálogo completo de produtos no Supabase...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[productService] ❌ Erro ao buscar produtos:', error);
      return { data: [], error: error.message };
    }

    const mapped = (data || []).map(mapSupabaseProduct);
    console.log(`[productService] ✅ ${mapped.length} produtos carregados do Supabase.`);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Falha na requisição de produtos:', err);
    return { data: [], error: err.message || 'Erro inesperado ao consultar produtos.' };
  }
}

/**
 * 2. Insere um novo produto diretamente no Supabase
 */
export async function createProductInSupabase(
  productData: Omit<Product, 'id'>
): Promise<{ product: Product | null; error: string | null }> {
  const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const finalImg = (productData.imageUrl || productData.image_url || productData.image || '').trim();
  const numericPrice = Number(productData.price) || 0;
  const finalDeliveryUrl = (productData.delivery_url || productData.deliveryUrl || '').trim();
  const rawName = String(productData.name || '').trim();
  const finalSlug = (productData.slug || generateUniqueSlug(rawName)).trim();

  const dbPayload: any = {
    id: newId,
    name: rawName,
    slug: finalSlug,
    category: String(productData.category || '').trim(),
    subcategory: productData.subcategory ? String(productData.subcategory).trim() : null,
    price: numericPrice,
    unit_suffix: String(productData.unitSuffix || '/Un').trim(),
    image_url: finalImg || null,
    image: finalImg || null,
    delivery_url: finalDeliveryUrl || null,
    description: productData.description ? String(productData.description).trim() : null,
    in_stock: Boolean(productData.inStock ?? true),
    badge: productData.badge || null,
    is_customizable: Boolean(productData.isCustomizable ?? true),
    customization_placeholder: productData.customizationPlaceholder || null,
  };

  console.log('[productService] 💾 Inserindo produto no Supabase com slug:', finalSlug, dbPayload);

  try {
    let { data, error } = await supabase.from('products').insert([dbPayload]).select();

    // Se o banco ainda não possuir a coluna 'slug' criada, faz fallback sem quebrar a operação
    if (error && error.message && (error.message.includes('slug') || error.message.includes('column'))) {
      console.warn('[productService] ⚠️ Coluna "slug" ausente no Supabase. Tentando gravar sem a coluna slug:', error.message);
      const { slug, ...payloadWithoutSlug } = dbPayload;
      const retry = await supabase.from('products').insert([payloadWithoutSlug]).select();
      if (!retry.error && retry.data) {
        data = retry.data;
        error = null;
      } else if (retry.error) {
        error = retry.error;
      }
    }

    if (error) {
      console.error('[productService] ❌ Erro detalhado ao inserir produto no Supabase:', error);
      return { product: null, error: error.message || JSON.stringify(error) };
    }

    const createdProduct = data && data[0] ? mapSupabaseProduct(data[0]) : mapSupabaseProduct(dbPayload);
    console.log('[productService] ✅ Produto criado com sucesso no Supabase:', createdProduct);
    return { product: createdProduct, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao inserir produto no Supabase:', err);
    return { product: null, error: err.message || 'Erro de conexão com o banco de dados.' };
  }
}

/**
 * 3. Atualiza um produto diretamente no Supabase
 */
export async function updateProductInSupabase(
  id: string,
  updates: Partial<Product>
): Promise<{ success: boolean; error: string | null }> {
  const finalImg = updates.imageUrl || updates.image_url || updates.image;
  const numericPrice = updates.price !== undefined ? Number(updates.price) : undefined;
  const finalDeliveryUrl = updates.delivery_url !== undefined ? updates.delivery_url : updates.deliveryUrl;

  const dbUpdatePayload: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.name !== undefined) {
    const cleanName = String(updates.name).trim();
    dbUpdatePayload.name = cleanName;
    if (!updates.slug) {
      dbUpdatePayload.slug = slugify(cleanName);
    }
  }

  if (updates.slug !== undefined) {
    dbUpdatePayload.slug = slugify(updates.slug);
  }

  if (updates.category !== undefined) dbUpdatePayload.category = String(updates.category).trim();
  if (updates.subcategory !== undefined) dbUpdatePayload.subcategory = updates.subcategory ? String(updates.subcategory).trim() : null;
  if (numericPrice !== undefined) dbUpdatePayload.price = numericPrice;
  if (updates.unitSuffix !== undefined) dbUpdatePayload.unit_suffix = String(updates.unitSuffix).trim();
  if (finalImg !== undefined) {
    dbUpdatePayload.image_url = finalImg || null;
    dbUpdatePayload.image = finalImg || null;
  }
  if (finalDeliveryUrl !== undefined) {
    dbUpdatePayload.delivery_url = finalDeliveryUrl ? String(finalDeliveryUrl).trim() : null;
  }
  if (updates.description !== undefined) dbUpdatePayload.description = updates.description ? String(updates.description).trim() : null;
  if (updates.inStock !== undefined) dbUpdatePayload.in_stock = Boolean(updates.inStock);
  if (updates.badge !== undefined) dbUpdatePayload.badge = updates.badge || null;
  if (updates.isCustomizable !== undefined) dbUpdatePayload.is_customizable = Boolean(updates.isCustomizable);
  if (updates.customizationPlaceholder !== undefined) dbUpdatePayload.customization_placeholder = updates.customizationPlaceholder || null;

  console.log('[productService] 📝 Atualizando produto no Supabase:', id, dbUpdatePayload);

  try {
    const { error } = await supabase.from('products').update(dbUpdatePayload).eq('id', id);

    if (error) {
      console.error('[productService] ❌ Erro ao atualizar produto no Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('[productService] ✅ Produto atualizado no Supabase:', id);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao atualizar no Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Exclui um produto diretamente no Supabase
 */
export async function deleteProductFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  console.log('[productService] 🗑️ Excluindo produto do Supabase:', id);
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('[productService] ❌ Erro ao excluir produto no Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('[productService] ✅ Produto excluído do Supabase:', id);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao excluir no Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Alterna o status de estoque do produto no Supabase
 */
export async function toggleProductStockInSupabase(
  id: string,
  newStockStatus: boolean
): Promise<{ success: boolean; error: string | null }> {
  return updateProductInSupabase(id, { inStock: newStockStatus });
}

/**
 * 6. Atualização rápida de preço no Supabase
 */
export async function updateProductPriceInSupabase(
  id: string,
  newPrice: number
): Promise<{ success: boolean; error: string | null }> {
  return updateProductInSupabase(id, { price: newPrice });
}

/**
 * 7. Consulta um único produto diretamente no Supabase por slug ou ID/nome
 */
export async function fetchProductByIdOrSlug(
  identifier: string
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const cleanId = decodeURIComponent(identifier).trim();
    const cleanSlug = slugify(cleanId);
    console.log('[productService] 🔍 Consultando produto no Supabase por slug/id:', cleanId, cleanSlug);

    // 1. Tenta buscar pelo slug exato (formato amigável /:slug)
    if (cleanSlug) {
      const { data: bySlug } = await supabase
        .from('products')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (bySlug) {
        return { data: mapSupabaseProduct(bySlug), error: null };
      }
    }

    // 2. Tenta buscar pelo ID exato
    const { data: byId, error: errId } = await supabase
      .from('products')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (byId) {
      return { data: mapSupabaseProduct(byId), error: null };
    }

    // 3. Tenta buscar por correspondência no nome
    const normalizedQuery = cleanId.replace(/[-_]+/g, ' ');
    const { data: byName, error: errName } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${normalizedQuery}%`)
      .limit(1)
      .maybeSingle();

    if (byName) {
      return { data: mapSupabaseProduct(byName), error: null };
    }

    return { data: null, error: errId?.message || errName?.message || 'Produto não encontrado.' };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao consultar produto individual:', err);
    return { data: null, error: err.message || 'Erro ao conectar ao banco de dados.' };
  }
}
