import { supabase } from '../lib/supabase';
import { Product } from '../types';

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

  return {
    id: String(item.id),
    name: String(item.name || '').trim(),
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
    console.log('[productService] 🌐 Consultando tabela "products" do Supabase: select * order by created_at desc...');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[productService] Falha na busca com created_at, tentando select geral:', error.message);
      const fallbackQuery = await supabase.from('products').select('*');
      
      if (fallbackQuery.error) {
        console.error('[productService] ❌ Erro ao buscar produtos do Supabase:', fallbackQuery.error);
        return { data: [], error: fallbackQuery.error.message };
      }

      const mapped = (fallbackQuery.data || []).map(mapSupabaseProduct);
      return { data: mapped, error: null };
    }

    const mapped = (data || []).map(mapSupabaseProduct);
    console.log(`[productService] ✅ ${mapped.length} produtos carregados diretamente do Supabase.`);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao consultar Supabase:', err);
    return { data: [], error: err.message || 'Falha na conexão com o Supabase' };
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

  const dbPayload = {
    id: newId,
    name: String(productData.name || '').trim(),
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

  console.log('[productService] 💾 Inserindo produto no Supabase:', dbPayload);

  try {
    const { data, error } = await supabase.from('products').insert([dbPayload]).select();

    if (error) {
      console.error('[productService] ❌ Erro ao inserir produto no Supabase:', error);
      return { product: null, error: error.message };
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

  if (updates.name !== undefined) dbUpdatePayload.name = String(updates.name).trim();
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
