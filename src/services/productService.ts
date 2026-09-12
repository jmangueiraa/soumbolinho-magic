import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { slugify, generateSlug, generateUniqueSlug } from '../utils/slug';
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

  // Normalização de imagens da galeria (array, string JSON ou delimitado por vírgulas)
  let galleryImages: string[] = [];
  const rawGallery = item.gallery_images || item.galleryImages || item.images;
  if (Array.isArray(rawGallery)) {
    galleryImages = rawGallery.map((g: any) => String(g || '').trim()).filter(Boolean);
  } else if (typeof rawGallery === 'string' && rawGallery.trim()) {
    try {
      const parsed = JSON.parse(rawGallery);
      if (Array.isArray(parsed)) {
        galleryImages = parsed.map((g: any) => String(g || '').trim()).filter(Boolean);
      }
    } catch {
      galleryImages = rawGallery.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Normalização de benefícios
  let benefits: string[] = [];
  const rawBenefits = item.benefits || item.beneficios;
  if (Array.isArray(rawBenefits)) {
    benefits = rawBenefits.map((b: any) => String(b || '').trim()).filter(Boolean);
  } else if (typeof rawBenefits === 'string' && rawBenefits.trim()) {
    try {
      const parsed = JSON.parse(rawBenefits);
      if (Array.isArray(parsed)) {
        benefits = parsed.map((b: any) => String(b || '').trim()).filter(Boolean);
      } else {
        benefits = rawBenefits.split('\n').map((s: string) => s.trim()).filter(Boolean);
      }
    } catch {
      benefits = rawBenefits.split('\n').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Normalização de FAQ
  let faqList: Array<{ question: string; answer: string }> = [];
  const rawFaq = item.faq;
  if (Array.isArray(rawFaq)) {
    faqList = rawFaq;
  } else if (typeof rawFaq === 'string' && rawFaq.trim()) {
    try {
      const parsed = JSON.parse(rawFaq);
      if (Array.isArray(parsed)) faqList = parsed;
    } catch {}
  }

  // Normalização de depoimentos
  let testimonialsList: any[] = [];
  const rawTestimonials = item.testimonials || item.depoimentos;
  if (Array.isArray(rawTestimonials)) {
    testimonialsList = rawTestimonials;
  } else if (typeof rawTestimonials === 'string' && rawTestimonials.trim()) {
    try {
      const parsed = JSON.parse(rawTestimonials);
      if (Array.isArray(parsed)) testimonialsList = parsed;
    } catch {}
  }

  const detailedDesc = item.detailed_description || item.detailedDescription || item.description || undefined;
  const checkoutUrl = (item.checkout_url || item.checkoutUrl || '').trim() || undefined;
  const guaranteeDays = item.guarantee_days !== undefined && item.guarantee_days !== null ? Number(item.guarantee_days) : 7;

  return {
    id: String(item.id),
    store_id: item.store_id || undefined,
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
    is_digital: item.is_digital !== undefined && item.is_digital !== null ? Boolean(item.is_digital) : Boolean(item.delivery_url || item.deliveryUrl),
    isDigital: item.is_digital !== undefined && item.is_digital !== null ? Boolean(item.is_digital) : Boolean(item.delivery_url || item.deliveryUrl),
    description: item.description || undefined,
    detailed_description: detailedDesc,
    detailedDescription: detailedDesc,
    galleryImages: galleryImages.length > 0 ? galleryImages : (rawImg ? [rawImg] : []),
    gallery_images: galleryImages.length > 0 ? galleryImages : (rawImg ? [rawImg] : []),
    benefits: benefits.length > 0 ? benefits : undefined,
    checkout_url: checkoutUrl,
    checkoutUrl: checkoutUrl,
    testimonials: testimonialsList.length > 0 ? testimonialsList : undefined,
    faq: faqList.length > 0 ? faqList : undefined,
    guarantee_days: guaranteeDays,
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

export function isMatrizStoreId(storeId?: string): boolean {
  if (!storeId) return false;
  const s = storeId.trim().toLowerCase();
  return s === 'suamarcaaqui' || s === 'store_default';
}

/**
 * 1. Busca TODOS os produtos diretamente do Supabase (filtrado rigorosamente por loja)
 * - O site modelo (suamarcaaqui) carrega apenas produtos da matriz base.
 * - Lojas clientes (incluindo Editáveis do Canva) filtram 100% estritamente pelo seu próprio store_id.
 */
export async function fetchAllProducts(storeId?: string): Promise<{ data: Product[]; error: string | null }> {
  try {
    const currentStoreId = (storeId || '').trim();

    // Se estiver em resolução de tenant, retorna [] imediatamente
    if (currentStoreId === '__resolving_tenant__') {
      console.log('[productService] ⏸️ store_id em resolução de tenant. Retornando lista vazia [].');
      return { data: [], error: null };
    }

    // 1. Identifica se a rota atual acessada é de uma loja específica (/loja/...)
    const pathname = (typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '');
    const hash = (typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '');
    const hostname = (typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '');
    const isSpecificStoreRoute = pathname.includes('/loja/') || hash.includes('/loja/');

    // REQUISITO 1: Se a página acessada for a raiz (editaveisdocanva.com.br ou sem slug de loja)
    const isEditaveisHost = hostname.includes('editaveisdocanva.com.br') || hostname.includes('soumbolinho');
    const isEditaveisStore = currentStoreId === 'matriz' || currentStoreId === 'store_editaveisdocanva' || currentStoreId === 'editaveisdocanva';
    const isBaseStore = currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default';

    // A matriz oficial só é assumida se estivermos no domínio da matriz ou se a loja for a matriz
    const isRootMatriz = !isSpecificStoreRoute && (isEditaveisStore || (isEditaveisHost && !isBaseStore));

    console.log(`[productService] 📦 Buscando produtos no Supabase (currentStoreId: "${currentStoreId}" | isRootMatriz: ${isRootMatriz})...`);
    
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // REQUISITO 1: Se a página acessada for a raiz (editaveisdocanva.com.br), busca EXCLUSIVAMENTE produtos da matriz
    if (isRootMatriz) {
      query = query.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva');
    } 
    // REQUISITO 2: Quando a rota for de uma loja específica (ex: /loja/suamarcaaqui), filtra OBRIGATORIAMENTE por .eq('store_id', currentStoreId)
    else if (currentStoreId) {
      if (currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default') {
        query = query.or('store_id.eq.suamarcaaqui,store_id.eq.store_default');
      } else {
        query = query.eq('store_id', currentStoreId);
      }
    } 
    else {
      // Se por acaso o storeId não carregar, impede que traga tudo da base
      query = query.eq('store_id', 'INEXISTENTE'); 
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('[productService] ❌ Erro ao buscar produtos:', error);
      return { data: [], error: error.message };
    }

    let mapped = (products || []).map(mapSupabaseProduct);

    // Proteção rigorosa e isolamento estrito em memória
    if (isRootMatriz) {
      mapped = mapped.filter(p => {
        const sId = (p.store_id || '').toLowerCase().trim();
        return sId === 'matriz' || sId === 'store_editaveisdocanva' || sId === 'editaveisdocanva';
      });
    } else if (currentStoreId) {
      mapped = mapped.filter(p => {
        const sId = (p.store_id || '').toLowerCase().trim();
        if (currentStoreId === 'suamarcaaqui' || currentStoreId === 'store_default') {
          return sId === 'suamarcaaqui' || sId === 'store_default';
        }
        return sId === currentStoreId.toLowerCase().trim();
      });
    }

    // Se for loja cliente e houver produtos com categorias da matriz, ajusta dinamicamente
    if (!isRootMatriz && mapped.length > 0) {
      const matrizMap: Record<string, string> = {
        'kits personalizados': 'Categoria 1',
        'apliques & adesivos': 'Categoria 2',
        'sacolinhas': 'Categoria 3',
        'itens para centro de mesa': 'Categoria 4',
        'formas & porta bis duplo': 'Categoria 5',
        'livrinho de colorir & tags de agradecimento': 'Categoria 6',
        'lembrancinhas': 'Categoria 7',
        'decoração de mesa e parede': 'Categoria 8',
      };

      mapped = mapped.map(p => {
        const catLower = (p.category || '').toLowerCase().trim();
        if (matrizMap[catLower]) {
          return {
            ...p,
            category: matrizMap[catLower],
            subcategory: p.subcategory ? 'Subcategoria 1' : undefined
          };
        }
        return p;
      });
    }

    console.log(`[productService] ✅ ${mapped.length} produtos carregados estritamente para "${isRootMatriz ? 'matriz' : currentStoreId}".`);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error('[productService] ❌ Falha na requisição de produtos:', err);
    return { data: [], error: err.message || 'Erro inesperado ao consultar produtos.' };
  }
}

/**
 * 2. Insere um novo produto diretamente no Supabase vinculado à loja
 */
export async function createProductInSupabase(
  productData: Omit<Product, 'id'>,
  storeId?: string
): Promise<{ product: Product | null; error: string | null }> {
  const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const finalImg = (productData.imageUrl || productData.image_url || productData.image || '').trim();
  const numericPrice = Number(productData.price) || 0;
  const finalDeliveryUrl = (productData.delivery_url || productData.deliveryUrl || '').trim();
  const rawName = String(productData.name || '').trim();
  
  // REQUISITO 3: Garante que o salvamento pegue dinamicamente o store_id exato da sessão ativa
  const targetStoreId = (storeId || productData.store_id || '').trim();

  // REQUISITO RIGOROSO: Garante que os produtos fiquem restritos exclusivamente ao store_id da respectiva loja
  if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
    console.error('[productService] ❌ Tentativa de criar produto sem store_id válido!');
    return { product: null, error: 'Identificador de loja (store_id) ausente. Não é possível cadastrar o produto.' };
  }

  // Garante que o slug do produto está definido antes do insert/upsert
  const finalSlug = productData.slug ? productData.slug.toLowerCase().replace(/\s+/g, '-') : generateSlug(productData.name);

  const dbPayload: any = {
    id: newId,
    store_id: targetStoreId,
    name: rawName,
    slug: finalSlug, // <-- Variável injetada corretamente
    category: String(productData.category || '').trim(),
    subcategory: productData.subcategory ? String(productData.subcategory).trim() : null,
    price: numericPrice,
    unit_suffix: String(productData.unitSuffix || '/Un').trim(),
    image_url: finalImg || null,
    image: finalImg || null,
    is_digital: Boolean((productData as any).is_digital ?? (productData as any).isDigital ?? Boolean(finalDeliveryUrl)),
    delivery_url: Boolean((productData as any).is_digital ?? (productData as any).isDigital ?? Boolean(finalDeliveryUrl)) ? (finalDeliveryUrl || null) : null,
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
    detailed_description: (productData as any).detailed_description || (productData as any).detailedDescription || productData.description || null,
    gallery_images: (productData as any).gallery_images || (productData as any).galleryImages || null,
    benefits: (productData as any).benefits || null,
    checkout_url: ((productData as any).checkout_url || (productData as any).checkoutUrl || '').trim() || null,
    testimonials: (productData as any).testimonials || null,
    faq: (productData as any).faq || null,
    guarantee_days: (productData as any).guarantee_days !== undefined && (productData as any).guarantee_days !== null ? Number((productData as any).guarantee_days) : 7,
  };

  console.log('[productService] 💾 Inserindo produto no Supabase com slug:', finalSlug, dbPayload);

  try {
    let { data, error } = await supabase.from('products').insert([dbPayload]).select();

    // Se o banco ainda não possuir as colunas opcionais criadas, faz fallback progressivo sem quebrar a operação
    if (error && error.message && (
      error.message.includes('slug') || 
      error.message.includes('upsell') || 
      error.message.includes('column') || 
      error.message.includes('is_digital') ||
      error.message.includes('detailed_description') ||
      error.message.includes('gallery_images') ||
      error.message.includes('benefits') ||
      error.message.includes('checkout_url') ||
      error.message.includes('testimonials') ||
      error.message.includes('faq') ||
      error.message.includes('guarantee_days')
    )) {
      console.warn('[productService] ⚠️ Coluna opcional ausente no Supabase. Gravando versão compatível:', error.message);
      const { 
        slug, 
        upsell_product_id, 
        upsell_price, 
        upsell_discount_percent, 
        is_digital, 
        detailed_description, 
        gallery_images, 
        benefits, 
        checkout_url, 
        testimonials, 
        faq, 
        guarantee_days, 
        ...payloadClean 
      } = dbPayload;
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
  if ((updates as any).is_digital !== undefined || (updates as any).isDigital !== undefined) {
    const isDigital = Boolean((updates as any).is_digital ?? (updates as any).isDigital);
    dbUpdatePayload.is_digital = isDigital;
    if (!isDigital) {
      dbUpdatePayload.delivery_url = null;
    }
  }
  if (finalDeliveryUrl !== undefined) {
    dbUpdatePayload.delivery_url = finalDeliveryUrl ? String(finalDeliveryUrl).trim() : null;
  }
  if (updates.description !== undefined) dbUpdatePayload.description = updates.description ? String(updates.description).trim() : null;
  if ((updates as any).detailed_description !== undefined || (updates as any).detailedDescription !== undefined) {
    dbUpdatePayload.detailed_description = (updates as any).detailed_description || (updates as any).detailedDescription || null;
  }
  if ((updates as any).gallery_images !== undefined || (updates as any).galleryImages !== undefined) {
    dbUpdatePayload.gallery_images = (updates as any).gallery_images || (updates as any).galleryImages || null;
  }
  if ((updates as any).benefits !== undefined) {
    dbUpdatePayload.benefits = (updates as any).benefits || null;
  }
  if ((updates as any).checkout_url !== undefined || (updates as any).checkoutUrl !== undefined) {
    dbUpdatePayload.checkout_url = ((updates as any).checkout_url || (updates as any).checkoutUrl || '').trim() || null;
  }
  if ((updates as any).testimonials !== undefined) {
    dbUpdatePayload.testimonials = (updates as any).testimonials || null;
  }
  if ((updates as any).faq !== undefined) {
    dbUpdatePayload.faq = (updates as any).faq || null;
  }
  if ((updates as any).guarantee_days !== undefined) {
    dbUpdatePayload.guarantee_days = (updates as any).guarantee_days !== null ? Number((updates as any).guarantee_days) : 7;
  }
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

    if (error && error.message && (
      error.message.includes('upsell') || 
      error.message.includes('column') || 
      error.message.includes('is_digital') ||
      error.message.includes('detailed_description') ||
      error.message.includes('gallery_images') ||
      error.message.includes('benefits') ||
      error.message.includes('checkout_url') ||
      error.message.includes('testimonials') ||
      error.message.includes('faq') ||
      error.message.includes('guarantee_days')
    )) {
      console.warn('[productService] ⚠️ Colunas ausentes na atualização. Gravando sem opcionais:', error.message);
      const { 
        upsell_product_id, 
        upsell_price, 
        upsell_discount_percent, 
        is_digital, 
        detailed_description, 
        gallery_images, 
        benefits, 
        checkout_url, 
        testimonials, 
        faq, 
        guarantee_days, 
        ...cleanUpdate 
      } = dbUpdatePayload;
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
 * 7. Consulta um único produto diretamente no Supabase por slug ou ID/nome (filtrado por loja)
 */
export async function fetchProductByIdOrSlug(
  identifier: string,
  storeId?: string
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const cleanId = decodeURIComponent(identifier).trim();
    const cleanSlug = slugify(cleanId);
    const targetStoreId = (storeId || '').trim();

    // REQUISITO RIGOROSO: Se storeId não fornecido ou resolvendo, não busca produtos
    if (!targetStoreId || targetStoreId === '__resolving_tenant__') {
      console.log('[productService] ⏸️ store_id não fornecido em fetchProductByIdOrSlug. Retornando null.');
      return { data: null, error: null };
    }

    // 1. Identifica se a rota atual acessada é de uma loja específica (/loja/...)
    const pathname = (typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '');
    const hash = (typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '');
    const hostname = (typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '');
    const isSpecificStoreRoute = pathname.includes('/loja/') || hash.includes('/loja/');

    const isEditaveisHost = hostname.includes('editaveisdocanva.com.br') || hostname.includes('soumbolinho');
    const isEditaveisStore = targetStoreId === 'matriz' || targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'editaveisdocanva';
    const isBaseStore = targetStoreId === 'suamarcaaqui' || targetStoreId === 'store_default';

    const isRootMatriz = !isSpecificStoreRoute && (isEditaveisStore || (isEditaveisHost && !isBaseStore));

    console.log(`[productService] 🔍 Consultando produto no Supabase para store_id: "${isRootMatriz ? 'matriz' : targetStoreId}":`, cleanId, cleanSlug);

    // 1. Tenta buscar pelo slug exato
    if (cleanSlug) {
      let slugQuery = supabase
        .from('products')
        .select('*')
        .eq('slug', cleanSlug);

      if (isRootMatriz) {
        slugQuery = slugQuery.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva');
      } else if (targetStoreId === 'suamarcaaqui' || targetStoreId === 'store_default') {
        slugQuery = slugQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default');
      } else {
        slugQuery = slugQuery.eq('store_id', targetStoreId);
      }

      const { data: bySlug } = await slugQuery.maybeSingle();

      if (bySlug) {
        return { data: mapSupabaseProduct(bySlug), error: null };
      }
    }

    // 2. Tenta buscar pelo ID exato
    let idQuery = supabase
      .from('products')
      .select('*')
      .eq('id', cleanId);

    if (isRootMatriz) {
      idQuery = idQuery.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva');
    } else if (targetStoreId === 'suamarcaaqui' || targetStoreId === 'store_default') {
      idQuery = idQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default');
    } else {
      idQuery = idQuery.eq('store_id', targetStoreId);
    }

    const { data: byId, error: errId } = await idQuery.maybeSingle();

    if (byId) {
      return { data: mapSupabaseProduct(byId), error: null };
    }

    // 3. Tenta buscar por correspondência no nome
    const normalizedQuery = cleanId.replace(/[-_]+/g, ' ');
    let nameQuery = supabase
      .from('products')
      .select('*')
      .ilike('name', `%${normalizedQuery}%`);

    if (isRootMatriz) {
      nameQuery = nameQuery.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva');
    } else if (targetStoreId === 'suamarcaaqui' || targetStoreId === 'store_default') {
      nameQuery = nameQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default');
    } else {
      nameQuery = nameQuery.eq('store_id', targetStoreId);
    }

    const { data: byName, error: errName } = await nameQuery
      .limit(1)
      .maybeSingle();

    if (byName) {
      return { data: mapSupabaseProduct(byName), error: null };
    }

    return { data: null, error: errId?.message || errName?.message || 'Produto não encontrado nesta loja.' };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao consultar produto individual:', err);
    return { data: null, error: err.message || 'Erro ao conectar ao banco de dados.' };
  }
}
