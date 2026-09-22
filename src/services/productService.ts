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
    } catch {
      const lines = rawTestimonials.split('\n').map((s) => s.trim()).filter(Boolean);
      if (lines.length > 0) {
        testimonialsList = lines.map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          return {
            name: parts[0] || 'Cliente',
            text: parts[1] || parts[0],
            avatar: parts[2] || '',
            rating: 5,
          };
        });
      }
    }
  }

  // Normalização de bônus exclusivos com suporte a envelope de metadados e localStorage
  let bonusesList: any[] = [];
  let rawBonuses = item.bonuses || item.bonus;

  // 1. Se a coluna bonuses/bonus não veio ou veio vazia, busca no customization_placeholder (envelope de metadados)
  let extractedPlaceholder = item.customizationPlaceholder || item.customization_placeholder || undefined;
  if (typeof extractedPlaceholder === 'string' && extractedPlaceholder.trim().startsWith('{')) {
    try {
      const meta = JSON.parse(extractedPlaceholder);
      if (meta && typeof meta === 'object') {
        if ((!rawBonuses || (Array.isArray(rawBonuses) && rawBonuses.length === 0)) && meta.bonuses) {
          rawBonuses = meta.bonuses;
        }
        if (meta.__meta__) {
          extractedPlaceholder = meta.placeholder || undefined;
        }
      }
    } catch {}
  }

  // 2. Se ainda assim não encontrar, busca no backup do localStorage do navegador
  if ((!rawBonuses || (Array.isArray(rawBonuses) && rawBonuses.length === 0)) && typeof window !== 'undefined' && window.localStorage && item.id) {
    try {
      const cached = localStorage.getItem(`soumbolinho_bonuses_${item.id}`);
      if (cached) {
        rawBonuses = JSON.parse(cached);
      }
    } catch {}
  }

  if (Array.isArray(rawBonuses)) {
    bonusesList = rawBonuses;
  } else if (typeof rawBonuses === 'string' && rawBonuses.trim()) {
    try {
      const parsed = JSON.parse(rawBonuses);
      if (Array.isArray(parsed)) bonusesList = parsed;
    } catch {
      bonusesList = rawBonuses
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => {
          const parts = line.split('|').map((p) => p.trim());
          return {
            title: parts[0] || 'Bônus Especial',
            description: parts[1] || 'Acesso exclusivo incluso',
            originalPrice: parts[2] ? parseFloat(parts[2].replace(/[^0-9.,]/g, '').replace(',', '.')) : 29.9,
            imageUrl: parts[3] || '',
          };
        });
    }
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
    product_type: (item.product_type === 'digital' || item.is_digital === true || Boolean(item.delivery_url || item.deliveryUrl)) ? 'digital' : 'fisico',
    is_digital: item.product_type === 'digital' || (item.is_digital !== undefined && item.is_digital !== null ? Boolean(item.is_digital) : Boolean(item.delivery_url || item.deliveryUrl)),
    isDigital: item.product_type === 'digital' || (item.is_digital !== undefined && item.is_digital !== null ? Boolean(item.is_digital) : Boolean(item.delivery_url || item.deliveryUrl)),
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
    bonuses: bonusesList.length > 0 ? bonusesList : undefined,
    delivery_url: item.delivery_url || item.deliveryUrl || undefined,
    deliveryUrl: item.delivery_url || item.deliveryUrl || undefined,
    inStock: item.inStock !== false && item.in_stock !== false && item.active !== false,
    isCustomizable: item.isCustomizable ?? item.is_customizable ?? true,
    customizationPlaceholder: extractedPlaceholder,
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
  return s === 'ajpstore' || s === 'store_ajpstore' || s === 'suamarcaaqui' || s === 'store_default';
}

/**
 * 1. Busca TODOS os produtos diretamente do Supabase (filtrado rigorosamente por loja)
 * - O site modelo (ajpstore/suamarcaaqui) carrega apenas produtos da matriz base.
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

    // Identifica se a loja é a Matriz fixa AJPSTORE
    const isBaseStore = 
      currentStoreId === 'ajpstore' || 
      currentStoreId === 'store_ajpstore' || 
      currentStoreId === 'suamarcaaqui' || 
      currentStoreId === 'store_default' ||
      (!currentStoreId && (hostname.includes('ajpstore.com.br') || hostname === 'localhost' || hostname === '127.0.0.1'));

    console.log(`[productService] 📦 Buscando produtos no Supabase (currentStoreId: "${currentStoreId}" | isBaseStore: ${isBaseStore})...`);
    
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (isBaseStore) {
      query = query.or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
    } else if (currentStoreId) {
      const isEditaveisAlias = currentStoreId.includes('editaveis') || hostname.includes('editaveis');
      if (isEditaveisAlias) {
        query = query.or(`store_id.eq.${currentStoreId},store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva,store_id.eq.editaveis-do-canva,store_id.eq.store_default`);
      } else {
        query = query.eq('store_id', currentStoreId);
      }
    } else {
      query = query.eq('store_id', 'INEXISTENTE'); 
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('[productService] ❌ Erro ao buscar produtos:', error);
      return { data: [], error: error.message };
    }

    let mapped = (products || []).map(mapSupabaseProduct);

    // AUTO-CLONAGEM INSTANTÂNEA: Se uma loja cliente (como Editáveis do Canva ou qualquer cliente novo)
    // não possuir produtos cadastrados, clona fielmente os produtos da Matriz AJPSTORE na hora!
    if (currentStoreId && mapped.length === 0) {
      console.log(`[productService] 🧬 Loja cliente "${currentStoreId}" sem produtos. Realizando auto-clonagem imediata da Matriz AJPSTORE...`);
      
      const { data: matrizProds } = await supabase
        .from('products')
        .select('*')
        .or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null')
        .order('price', { ascending: true });

      const prodsSource = (matrizProds && matrizProds.length > 0)
        ? matrizProds
        : [
            { name: 'PRODUTO 1', price: 1.00, category: 'Categoria 1', description: 'Produto de exemplo configurado para sua loja.' },
            { name: 'PRODUTO 2', price: 2.00, category: 'Categoria 2', description: 'Produto de exemplo configurado para sua loja.' },
            { name: 'PRODUTO 3', price: 3.00, category: 'Categoria 3', description: 'Produto de exemplo configurado para sua loja.' },
            { name: 'PRODUTO 4', price: 4.00, category: 'Categoria 4', description: 'Produto de exemplo configurado para sua loja.' },
          ];

      const clonedList: Product[] = [];
      for (const p of prodsSource) {
        try {
          const img = (p.image_url || p.imageUrl || p.image || '/default-product.jpg').trim();
          const { product: created } = await createProductInSupabase({
            name: p.name,
            price: Number(p.price) || 0,
            category: p.category || 'Categoria 1',
            imageUrl: img,
            image_url: img,
            description: p.description || '',
            inStock: true,
            unitSuffix: p.unit_suffix || p.unitSuffix || '/Un',
            tags: p.tags || ['Destaque'],
            isCustomizable: false,
            slug: `${(p.name || 'produto').toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`,
            store_id: currentStoreId
          }, currentStoreId);

          if (created) clonedList.push(created);
        } catch (cloneErr) {
          console.warn('[productService] Aviso ao clonar produto individual da matriz:', cloneErr);
        }
      }

      if (clonedList.length > 0) {
        console.log(`[productService] 🎉 ${clonedList.length} produtos clonados da Matriz para "${currentStoreId}".`);
        return { data: clonedList, error: null };
      } else if (prodsSource && prodsSource.length > 0) {
        console.log(`[productService] 🛍️ Exibindo ${prodsSource.length} produtos da Matriz como catálogo visual para "${currentStoreId}".`);
        const fallbackList = prodsSource.map(mapSupabaseProduct).map((p) => ({ ...p, store_id: currentStoreId }));
        return { data: fallbackList, error: null };
      }
    }

    console.log(`[productService] ✅ ${mapped.length} produtos carregados para "${currentStoreId}".`);
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
    product_type: (productData as any).product_type || (Boolean((productData as any).is_digital ?? (productData as any).isDigital ?? Boolean(finalDeliveryUrl)) ? 'digital' : 'fisico'),
    is_digital: Boolean((productData as any).is_digital ?? (productData as any).isDigital ?? Boolean(finalDeliveryUrl)),
    delivery_url: Boolean((productData as any).is_digital ?? (productData as any).isDigital ?? Boolean(finalDeliveryUrl)) ? (finalDeliveryUrl || null) : null,
    description: productData.description ? String(productData.description).trim() : null,
    in_stock: Boolean(productData.inStock ?? true),
    badge: productData.badge || null,
    is_customizable: Boolean(productData.isCustomizable ?? true),
    customization_placeholder: (() => {
      const rawBonusesToSave = (productData as any).bonuses || null;
      let placeholderVal = productData.customizationPlaceholder || null;
      if (rawBonusesToSave && (Array.isArray(rawBonusesToSave) ? rawBonusesToSave.length > 0 : true)) {
        try {
          placeholderVal = JSON.stringify({
            __meta__: true,
            bonuses: rawBonusesToSave,
            placeholder: productData.customizationPlaceholder || null,
          });
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(`soumbolinho_bonuses_${newId}`, JSON.stringify(rawBonusesToSave));
          }
        } catch {}
      }
      return placeholderVal;
    })(),
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
    bonuses: (productData as any).bonuses || null,
  };

  console.log('[productService] 💾 Inserindo produto no Supabase com slug:', finalSlug, dbPayload);

  try {
    let { data, error } = await supabase.from('products').insert([dbPayload]).select();

    // Se o banco ainda não possuir as colunas opcionais criadas, faz fallback progressivo sem quebrar a operação
    if (error && error.message && (
      error.message.includes('slug') || 
      error.message.includes('upsell') || 
      error.message.includes('column') || 
      error.message.includes('product_type') || 
      error.message.includes('is_digital') ||
      error.message.includes('detailed_description') ||
      error.message.includes('gallery_images') ||
      error.message.includes('benefits') ||
      error.message.includes('checkout_url') ||
      error.message.includes('testimonials') ||
      error.message.includes('faq') ||
      error.message.includes('guarantee_days') ||
      error.message.includes('bonuses')
    )) {
      console.warn('[productService] ⚠️ Coluna opcional ausente no Supabase. Gravando versão compatível:', error.message);
      const { 
        slug, 
        product_type,
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
        bonuses,
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
  if ((updates as any).product_type !== undefined || (updates as any).is_digital !== undefined || (updates as any).isDigital !== undefined) {
    const isDigital = (updates as any).product_type === 'digital' || Boolean((updates as any).is_digital ?? (updates as any).isDigital);
    const prodType = (updates as any).product_type || (isDigital ? 'digital' : 'fisico');
    dbUpdatePayload.product_type = prodType;
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
  if ((updates as any).bonuses !== undefined) {
    const rawBonusesToSave = (updates as any).bonuses;
    dbUpdatePayload.bonuses = rawBonusesToSave || null;

    // Atualiza o backup no localStorage para sincronização imediata no cliente
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (rawBonusesToSave && (Array.isArray(rawBonusesToSave) ? rawBonusesToSave.length > 0 : true)) {
          localStorage.setItem(`soumbolinho_bonuses_${id}`, JSON.stringify(rawBonusesToSave));
        } else {
          localStorage.removeItem(`soumbolinho_bonuses_${id}`);
        }
      } catch {}
    }

    // Envelope de persistência resiliente em customization_placeholder
    try {
      const existingPlaceholder = updates.customizationPlaceholder !== undefined 
        ? updates.customizationPlaceholder 
        : (dbUpdatePayload.customization_placeholder || null);
      
      dbUpdatePayload.customization_placeholder = JSON.stringify({
        __meta__: true,
        bonuses: rawBonusesToSave || [],
        placeholder: existingPlaceholder,
      });
    } catch {}
  } else if (updates.customizationPlaceholder !== undefined) {
    dbUpdatePayload.customization_placeholder = updates.customizationPlaceholder || null;
  }

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
      error.message.includes('product_type') || 
      error.message.includes('is_digital') ||
      error.message.includes('detailed_description') ||
      error.message.includes('gallery_images') ||
      error.message.includes('benefits') ||
      error.message.includes('checkout_url') ||
      error.message.includes('testimonials') ||
      error.message.includes('faq') ||
      error.message.includes('guarantee_days') ||
      error.message.includes('bonuses')
    )) {
      console.warn('[productService] ⚠️ Colunas ausentes na atualização. Gravando sem opcionais:', error.message);
      const { 
        product_type,
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
        bonuses,
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
    if (!identifier || typeof identifier !== 'string') {
      return { data: null, error: 'Identificador inválido.' };
    }

    const cleanId = decodeURIComponent(identifier).trim();
    if (!cleanId || cleanId === 'null' || cleanId === 'undefined') {
      return { data: null, error: 'Identificador vazio.' };
    }

    const cleanSlug = slugify(cleanId);
    const targetStoreId = (storeId || '').trim();

    console.log(`[productService] 🔍 Consultando produto no Supabase: id/slug="${cleanId}" (slugify="${cleanSlug}"), store_id="${targetStoreId || 'global'}"`);

    // ETAPA 1: Busca prioritária no escopo da loja ativa (se informada e pronta)
    if (targetStoreId && targetStoreId !== '__resolving_tenant__') {
      // 1.1 Busca por slug no escopo da loja (case-insensitive)
      if (cleanSlug) {
        let slugQuery = supabase
          .from('products')
          .select('*')
          .or(`slug.ilike.${cleanSlug},slug.ilike.${cleanId}`);

        if (targetStoreId === 'ajpstore' || targetStoreId === 'store_ajpstore') {
          slugQuery = slugQuery.or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
        } else if (targetStoreId === 'suamarcaaqui' || targetStoreId === 'store_default') {
          slugQuery = slugQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
        } else if (targetStoreId === 'matriz' || targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'editaveisdocanva' || targetStoreId === 'editaveis-do-canva') {
          slugQuery = slugQuery.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva,store_id.eq.editaveis-do-canva');
        } else {
          slugQuery = slugQuery.eq('store_id', targetStoreId);
        }

        const { data: byStoreSlug } = await slugQuery.maybeSingle();
        if (byStoreSlug) {
          console.log('[productService] ✅ Produto encontrado por slug na loja ativa:', byStoreSlug.name);
          return { data: mapSupabaseProduct(byStoreSlug), error: null };
        }
      }

      // 1.2 Busca por ID exato no escopo da loja
      let idQuery = supabase
        .from('products')
        .select('*')
        .eq('id', cleanId);

      if (targetStoreId === 'ajpstore' || targetStoreId === 'store_ajpstore') {
        idQuery = idQuery.or('store_id.eq.ajpstore,store_id.eq.store_ajpstore,store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
      } else if (targetStoreId === 'suamarcaaqui' || targetStoreId === 'store_default') {
        idQuery = idQuery.or('store_id.eq.suamarcaaqui,store_id.eq.store_default,store_id.is.null');
      } else if (targetStoreId === 'matriz' || targetStoreId === 'store_editaveisdocanva' || targetStoreId === 'editaveisdocanva' || targetStoreId === 'editaveis-do-canva') {
        idQuery = idQuery.or('store_id.eq.matriz,store_id.eq.store_editaveisdocanva,store_id.eq.editaveisdocanva,store_id.eq.editaveis-do-canva');
      } else {
        idQuery = idQuery.eq('store_id', targetStoreId);
      }

      const { data: byStoreId } = await idQuery.maybeSingle();
      if (byStoreId) {
        console.log('[productService] ✅ Produto encontrado por ID na loja ativa:', byStoreId.name);
        return { data: mapSupabaseProduct(byStoreId), error: null };
      }
    }

    // ETAPA 2 (FALLBACK GLOBAL RESILIENTE):
    // Se o produto não foi encontrado pelo filtro de loja ou se a rota foi aberta diretamente sem storeId,
    // busca diretamente na tabela de produtos pelo slug ou ID!
    if (cleanSlug) {
      const { data: byGlobalSlug } = await supabase
        .from('products')
        .select('*')
        .or(`slug.ilike.${cleanSlug},slug.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (byGlobalSlug) {
        console.log('[productService] ✅ Produto encontrado por busca global de slug no Supabase:', byGlobalSlug.name);
        return { data: mapSupabaseProduct(byGlobalSlug), error: null };
      }
    }

    // 2.2 Busca global por ID
    const { data: byGlobalId } = await supabase
      .from('products')
      .select('*')
      .eq('id', cleanId)
      .limit(1)
      .maybeSingle();

    if (byGlobalId) {
      console.log('[productService] ✅ Produto encontrado por busca global de ID no Supabase:', byGlobalId.name);
      return { data: mapSupabaseProduct(byGlobalId), error: null };
    }

    // 2.3 Busca global aproximada por nome
    const normalizedQuery = cleanId.replace(/[-_]+/g, ' ').trim();
    if (normalizedQuery.length >= 3) {
      const { data: byGlobalName } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${normalizedQuery}%`)
        .limit(1)
        .maybeSingle();

      if (byGlobalName) {
        console.log('[productService] ✅ Produto encontrado por busca global aproximada no Supabase:', byGlobalName.name);
        return { data: mapSupabaseProduct(byGlobalName), error: null };
      }
    }

    console.warn('[productService] ⚠️ Produto não localizado no Supabase para o identificador:', cleanId);
    return { data: null, error: 'Produto não encontrado.' };
  } catch (err: any) {
    console.error('[productService] ❌ Exceção ao consultar produto individual:', err);
    return { data: null, error: err.message || 'Erro ao conectar ao banco de dados.' };
  }
}
