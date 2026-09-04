import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { slugify, generateUniqueSlug } from '../utils/slug';
import { isVideoUrl } from '../utils/media';

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
  const rawVideo = (item.video_url || item.videoUrl || (isVideoUrl(rawImg) ? rawImg : '')).trim();
  const isVideo = item.media_type === 'video' || item.mediaType === 'video' || Boolean(rawVideo);

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
    videoUrl: rawVideo || undefined,
    video_url: rawVideo || undefined,
    mediaType: isVideo ? 'video' : 'image',
    description: item.description || undefined,
    delivery_url: item.delivery_url || item.deliveryUrl || undefined,
    deliveryUrl: item.delivery_url || item.deliveryUrl || undefined,
    inStock: item.inStock !== false && item.in_stock !== false && item.active !== false,
    isCustomizable: item.isCustomizable ?? item.is_customizable ?? true,
    customizationPlaceholder: item.customizationPlaceholder || item.customization_placeholder || undefined,
    badge: item.badge || undefined,
    tags: item.tags || undefined,
    upsell_product_id: item.upsell_product_id || item.upsellProductId || undefined,
    upsellProductId: item.upsell_product_id || item.upsellProductId || undefined,
    upsell_price: item.upsell_price !== null && item.upsell_price !== undefined ? Number(item.upsell_price) : undefined,
    upsellPrice: item.upsell_price !== null && item.upsell_price !== undefined ? Number(item.upsell_price) : undefined,
    upsell_discount_percent: item.upsell_discount_percent !== null && item.upsell_discount_percent !== undefined ? Number(item.upsell_discount_percent) : undefined,
    upsellDiscountPercent: item.upsell_discount_percent !== null && item.upsell_discount_percent !== undefined ? Number(item.upsell_discount_percent) : undefined,
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
  const finalSlug = slugify(productData.slug || rawName);

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
    upsell_product_id: (productData as any).upsell_product_id || (productData as any).upsellProductId || null,
    upsell_price: (productData as any).upsell_price !== undefined && (productData as any).upsell_price !== null && (productData as any).upsell_price !== ''
      ? Number((productData as any).upsell_price)
      : ((productData as any).upsellPrice !== undefined && (productData as any).upsellPrice !== null && (productData as any).upsellPrice !== '' ? Number((productData as any).upsellPrice) : null),
    upsell_discount_percent: (productData as any).upsell_discount_percent !== undefined && (productData as any).upsell_discount_percent !== null && (productData as any).upsell_discount_percent !== ''
      ? Number((productData as any).upsell_discount_percent)
      : ((productData as any).upsellDiscountPercent !== undefined && (productData as any).upsellDiscountPercent !== null && (productData as any).upsellDiscountPercent !== '' ? Number((productData as any).upsellDiscountPercent) : null),
  };

  console.log('[productService] 💾 Inserindo produto no Supabase com slug:', finalSlug, dbPayload);

  try {
    let { data, error } = await supabase.from('products').insert([dbPayload]).select();

    // Se o banco ainda não possuir as colunas 'slug' ou 'upsell' criadas, faz fallback sem quebrar a operação
    if (error && error.message && (error.message.includes('slug') || error.message.includes('upsell') || error.message.includes('column'))) {
      console.warn('[productService] ⚠️ Coluna ausente no Supabase. Tentando gravar sem colunas opcionais:', error.message);
      const { slug, upsell_product_id, upsell_price, upsell_discount_percent, ...payloadClean } = dbPayload;
      const retry = await supabase.from('products').insert([payloadClean]).select();
      if (!retry.error && retry.data) {
        data = retry.data;
        error = null;
      } else if (retry.error) {
        error = retry.error;
      }
    }

    if (error) {
      console.error('[productService] ❌ Erro detalhado ao inserir produto no Supabase:', error);
      const errMsg = (error as any).code === '23505' 
        ? '23505: Já existe um produto cadastrado com este nome ou slug.' 
        : (error.message || JSON.stringify(error));
      return { product: null, error: errMsg };
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

  if ((updates as any).upsell_product_id !== undefined || (updates as any).upsellProductId !== undefined) {
    dbUpdatePayload.upsell_product_id = (updates as any).upsell_product_id || (updates as any).upsellProductId || null;
  }
  if ((updates as any).upsell_price !== undefined || (updates as any).upsellPrice !== undefined) {
    const rawVal = (updates as any).upsell_price ?? (updates as any).upsellPrice;
    dbUpdatePayload.upsell_price = rawVal !== null && rawVal !== '' && !isNaN(Number(rawVal)) ? Number(rawVal) : null;
  }
  if ((updates as any).upsell_discount_percent !== undefined || (updates as any).upsellDiscountPercent !== undefined) {
    const rawPct = (updates as any).upsell_discount_percent ?? (updates as any).upsellDiscountPercent;
    dbUpdatePayload.upsell_discount_percent = rawPct !== null && rawPct !== '' && !isNaN(Number(rawPct)) ? Number(rawPct) : null;
  }

  console.log('[productService] 📝 Atualizando produto no Supabase:', id, dbUpdatePayload);

  try {
    let { error } = await supabase.from('products').update(dbUpdatePayload).eq('id', id);

    if (error && error.message && (error.message.includes('upsell') || error.message.includes('column'))) {
      console.warn('[productService] ⚠️ Colunas de upsell ausentes na atualização. Gravando sem upsell:', error.message);
      const { upsell_product_id, upsell_price, upsell_discount_percent, ...cleanUpdate } = dbUpdatePayload;
      const retry = await supabase.from('products').update(cleanUpdate).eq('id', id);
      error = retry.error;
    }

    if (error) {
      console.error('[productService] ❌ Erro ao atualizar produto no Supabase:', error);
      const errMsg = (error as any).code === '23505'
        ? '23505: Já existe um produto cadastrado com este nome ou slug.'
        : error.message;
      return { success: false, error: errMsg };
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
 * 5. Alterna o status de disponibilidade/estoque do produto no Supabase
 */
export async function toggleProductStockInSupabase(
  id: string,
  newStockStatus: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`[productService] 🔄 Alternando status do produto "${id}" para:`, newStockStatus);
    
    // Envia is_active e in_stock para sincronizar qualquer padrão de coluna
    let { error } = await supabase
      .from('products')
      .update({ in_stock: newStockStatus, is_active: newStockStatus })
      .eq('id', id);

    // Se o banco não tiver a coluna is_active, atualiza apenas in_stock
    if (error && error.message && error.message.includes('is_active')) {
      console.warn('[productService] ⚠️ Coluna is_active ausente, atualizando via in_stock...');
      const retry = await supabase
        .from('products')
        .update({ in_stock: newStockStatus })
        .eq('id', id);
      error = retry.error;
    }

    if (error) {
      console.error('[productService] ❌ Erro ao alterar status no Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log(`[productService] ✅ Status do produto "${id}" salvo com sucesso no Supabase.`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao alterar status:', err);
    return { success: false, error: err.message };
  }
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
