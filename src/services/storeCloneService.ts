import { supabase } from '../lib/supabase';
import { fetchAllCategories, createCategoryInSupabase } from './categoryService';
import { fetchAllProducts, createProductInSupabase } from './productService';
import { fetchAllBanners, createBannerInSupabase } from './bannerService';
import { fetchStoreConfig, saveStoreConfigInSupabase } from './storeConfigService';
import { StoreConfig } from '../types';

export interface CloneResult {
  success: boolean;
  error?: string;
  clonedCategories?: number;
  clonedProducts?: number;
  clonedBanners?: number;
}

/**
 * Clona produtos, categorias, banners e configurações da loja modelo (store_default)
 * para a nova loja recém-criada.
 */
export async function cloneStoreTemplate(
  sourceStoreId: string = 'suamarcaaqui',
  targetStoreId: string,
  targetStoreName?: string,
  initialConfig?: Partial<StoreConfig>
): Promise<{ success: boolean; error?: string; clonedCategories?: number; clonedProducts?: number; clonedBanners?: number }> {
  console.log(`[storeCloneService] 🧬 Iniciando clonagem da loja "${sourceStoreId}" para "${targetStoreId}"...`);

  try {
    // 1. Tentar executar a Stored Procedure SQL rápida do Supabase para produtos/categorias/banners
    let rpcDataResult: any = null;
    try {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('clone_store_template', {
        source_store_id: sourceStoreId,
        target_store_id: targetStoreId,
        target_store_name: targetStoreName || null
      });

      if (!rpcError && rpcData && rpcData.success) {
        console.log('[storeCloneService] ✅ Catálogo clonado via RPC com sucesso:', rpcData);
        rpcDataResult = rpcData;
      } else if (rpcError) {
        console.warn('[storeCloneService] ⚠️ RPC indisponível ou falhou, utilizando clonador via cliente:', rpcError.message);
      }
    } catch (err: any) {
      console.warn('[storeCloneService] ⚠️ Exceção ao chamar RPC:', err.message);
    }

    // SEMPRE consolida as configurações digitadas pelo Super Admin (NUNCA permite que dados da matriz persistam)
    await saveStoreConfigInSupabase({
      id: `cfg_${targetStoreId}`,
      store_id: targetStoreId,
      storeName: initialConfig?.storeName || targetStoreName || 'suamarcaaqui',
      slogan: initialConfig?.slogan || 'subtitulo da sua loja',
      whatsappNumber: initialConfig?.whatsappNumber || 'SeuWhatsApp',
      whatsappDisplay: initialConfig?.whatsappDisplay || 'SeuWhatsAppWhatsApp',
      instagram: initialConfig?.instagram || 'suamarcaaqui',
      address: initialConfig?.address || 'seuendereço',
      city: initialConfig?.city || 'Brasil',
      workingHours: initialConfig?.workingHours || 'SEMPRE ABERTO',
      minOrderValue: initialConfig?.minOrderValue ?? 0.00,
      mpAccessToken: initialConfig?.mpAccessToken || undefined,
      telegramBotToken: initialConfig?.telegramBotToken || undefined,
      telegramChatId: initialConfig?.telegramChatId || undefined,
    }, targetStoreId);

    if (rpcDataResult) {
      // Sanitização de segurança pós-RPC: garante que todas as categorias e subcategorias
      // criadas estejam estritamente padronizadas (Categoria 1, 2... e Subcategoria 1, 2...)
      await sanitizeStoreCategoriesAndProducts(targetStoreId, sourceStoreId);

      return {
        success: true,
        clonedCategories: rpcDataResult.cloned_categories,
        clonedProducts: rpcDataResult.cloned_products,
        clonedBanners: rpcDataResult.cloned_banners
      };
    }

    // 2. Fallback via Cliente: Garante que a clonagem ocorra perfeitamente mesmo sem a função SQL instalada
    console.log('[storeCloneService] 🔄 Executando clonagem via Client API com renomeação sequencial...');

    // A) Clona Categorias e Subcategorias com renomeação sequencial padronizada
    // Padrão:
    // Categoria 1
    //   - Subcategoria 1
    //   - Subcategoria 2
    // Categoria 2
    //   - Subcategoria 1
    // Categoria 3
    //   - Subcategoria 1
    //   - Subcategoria 2
    //   - Subcategoria 3
    const { data: categoriasOriginais } = await fetchAllCategories(sourceStoreId);
    let catsCloned = 0;
    const categoryNameMapping: Record<string, string> = {};
    const subcategoryMapping: Record<string, string> = {};
    const fallbackSubcategoryByName: Record<string, string> = {};

    if (categoriasOriginais && categoriasOriginais.length > 0) {
      const categoriasClonadas = categoriasOriginais.map((cat, catIndex) => {
        const newCatName = `Categoria ${catIndex + 1}`;
        categoryNameMapping[cat.name] = newCatName;

        const rawSubcats = normalizeSubcategoryArray(cat.subcategories);
        const mappedSubcategories: string[] = [];

        rawSubcats.forEach((sub, subIndex) => {
          const newSubName = `Subcategoria ${subIndex + 1}`;
          mappedSubcategories.push(newSubName);

          subcategoryMapping[`${cat.name}:::${sub.toLowerCase()}`] = newSubName;
          subcategoryMapping[`${newCatName}:::${sub.toLowerCase()}`] = newSubName;
          fallbackSubcategoryByName[sub.toLowerCase()] = newSubName;
        });

        return {
          id: `cat_${Date.now()}_${catIndex}_${Math.random().toString(36).substring(2, 6)}`,
          store_id: targetStoreId,
          name: newCatName,
          icon: cat.icon || 'Gift',
          subcategories: mappedSubcategories,
          created_at: new Date().toISOString()
        };
      });

      // Em seguida, faça o insert no Supabase:
      let { error: insertCatError } = await supabase
        .from('categories')
        .insert(categoriasClonadas);

      // Fallback de segurança caso a coluna id no banco exija inserção individual
      if (insertCatError) {
        console.warn('[storeCloneService] Tentando inserção individual de categorias padronizadas...', insertCatError.message);
        let insertedCount = 0;
        for (const cat of categoriasClonadas) {
          const { error: singleErr } = await supabase.from('categories').insert([cat]);
          if (!singleErr) insertedCount++;
        }
        catsCloned = insertedCount;
      } else {
        catsCloned = categoriasClonadas.length;
        console.log(`[storeCloneService] ✅ ${catsCloned} categorias e subcategorias padronizadas inseridas com sucesso.`);
      }
    }

    // B) Clona Produtos (atualizando a categoria para "Categoria X" e subcategoria para "Subcategoria Y")
    const { data: sourceProds } = await fetchAllProducts(sourceStoreId);
    let prodsCloned = 0;
    if (sourceProds && sourceProds.length > 0) {
      for (const prod of sourceProds) {
        const { id, ...prodData } = prod;

        // Mapeia categoria para "Categoria X"
        const targetCategoryName = (prod.category && categoryNameMapping[prod.category]) || 'Categoria 1';

        // Mapeia subcategoria para "Subcategoria Y" (nunca mantendo o nome original da matriz)
        let targetSubcategoryName: string | undefined = undefined;
        if (prod.subcategory && prod.subcategory.trim()) {
          const trimmedSub = prod.subcategory.trim().toLowerCase();
          targetSubcategoryName = subcategoryMapping[`${prod.category}:::${trimmedSub}`]
            || subcategoryMapping[`${targetCategoryName}:::${trimmedSub}`]
            || fallbackSubcategoryByName[trimmedSub]
            || 'Subcategoria 1';
        }

        await createProductInSupabase({
          ...prodData,
          category: targetCategoryName,
          subcategory: targetSubcategoryName,
          slug: `${prod.slug || prod.name}-${Math.random().toString(36).substring(2, 5)}`,
          store_id: targetStoreId
        }, targetStoreId);
        prodsCloned++;
      }
    }

    // C) Clona Banners
    const { data: sourceBanners } = await fetchAllBanners(sourceStoreId);
    let bannersCloned = 0;
    if (sourceBanners && sourceBanners.length > 0) {
      for (const ban of sourceBanners) {
        const { id, ...banData } = ban;
        await createBannerInSupabase({
          ...banData,
          store_id: targetStoreId
        }, targetStoreId);
        bannersCloned++;
      }
    }

    // D) Configurações Exclusivas da Nova Loja (NUNCA herda dados de contato ou nome da matriz)
    await saveStoreConfigInSupabase({
      id: `cfg_${targetStoreId}`,
      store_id: targetStoreId,
      storeName: initialConfig?.storeName || targetStoreName || 'suamarcaaqui',
      slogan: initialConfig?.slogan || 'subtitulo da sua loja',
      whatsappNumber: initialConfig?.whatsappNumber || 'SeuWhatsApp',
      whatsappDisplay: initialConfig?.whatsappDisplay || 'SeuWhatsAppWhatsApp',
      instagram: initialConfig?.instagram || 'suamarcaaqui',
      address: initialConfig?.address || 'seuendereço',
      city: initialConfig?.city || 'Brasil',
      workingHours: initialConfig?.workingHours || 'SEMPRE ABERTO',
      minOrderValue: initialConfig?.minOrderValue ?? 0.00,
      mpAccessToken: initialConfig?.mpAccessToken || undefined,
      telegramBotToken: initialConfig?.telegramBotToken || undefined,
      telegramChatId: initialConfig?.telegramChatId || undefined,
    }, targetStoreId);

    console.log(`[storeCloneService] ✅ Clonagem via Client concluída: ${prodsCloned} produtos, ${catsCloned} categorias, ${bannersCloned} banners.`);
    return {
      success: true,
      clonedCategories: catsCloned,
      clonedProducts: prodsCloned,
      clonedBanners: bannersCloned
    };
  } catch (err: any) {
    console.error('[storeCloneService] ❌ Erro durante a clonagem:', err);
    return {
      success: false,
      error: err.message || 'Erro inesperado durante a clonagem da loja.'
    };
  }
}

/**
 * Normaliza subcategorias de qualquer formato (array, string JSON, vírgula) em string[]
 */
function normalizeSubcategoryArray(subcategories: any): string[] {
  if (Array.isArray(subcategories)) {
    return subcategories.map((s: any) => String(s || '').trim()).filter(Boolean);
  }
  if (typeof subcategories === 'string') {
    try {
      const parsed = JSON.parse(subcategories);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => String(s || '').trim()).filter(Boolean);
      }
    } catch {
      return subcategories.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Garante que mesmo se a Stored Procedure do Supabase for de versão anterior,
 * todas as categorias e subcategorias da nova loja sejam renomeadas sequencialmente:
 * - Categoria 1 (Subcategoria 1, Subcategoria 2...)
 * - Categoria 2 (Subcategoria 1...)
 * - Categoria 3 (Subcategoria 1, Subcategoria 2, Subcategoria 3...)
 * E que nenhum produto permaneça com nomes da matriz.
 */
async function sanitizeStoreCategoriesAndProducts(
  targetStoreId: string,
  sourceStoreId: string = 'store_default'
): Promise<void> {
  try {
    const { data: targetCategories } = await fetchAllCategories(targetStoreId);
    if (!targetCategories || targetCategories.length === 0) return;

    // Busca categorias da matriz para saber os nomes originais de categorias e subcategorias
    const { data: sourceCategories } = await fetchAllCategories(sourceStoreId);
    const sourceCatMap = new Map<string, string[]>();
    if (sourceCategories) {
      sourceCategories.forEach(c => {
        sourceCatMap.set(c.name.trim().toLowerCase(), normalizeSubcategoryArray(c.subcategories));
      });
    }

    const catMapping: Record<string, string> = {};
    const subMapping: Record<string, string> = {};

    for (let i = 0; i < targetCategories.length; i++) {
      const cat = targetCategories[i];
      const newCatName = `Categoria ${i + 1}`;
      catMapping[cat.name] = newCatName;

      // Pega as subcategorias da categoria clonada ou da matriz
      const rawSubcats = normalizeSubcategoryArray(cat.subcategories);
      const originalSubcats = sourceCatMap.get(cat.name.trim().toLowerCase()) || rawSubcats;
      const effectiveSubcats = originalSubcats.length > 0 ? originalSubcats : rawSubcats;

      const newSubcats: string[] = [];
      effectiveSubcats.forEach((sub, j) => {
        const newSubName = `Subcategoria ${j + 1}`;
        newSubcats.push(newSubName);

        subMapping[`${cat.name}:::${sub.toLowerCase()}`] = newSubName;
        subMapping[`${newCatName}:::${sub.toLowerCase()}`] = newSubName;
        subMapping[sub.toLowerCase()] = newSubName;
      });

      // Atualiza a categoria na tabela categories
      await supabase
        .from('categories')
        .update({
          name: newCatName,
          subcategories: newSubcats
        })
        .eq('id', cat.id);
    }

    // Atualiza os produtos da nova loja
    const { data: targetProds } = await fetchAllProducts(targetStoreId);
    if (targetProds && targetProds.length > 0) {
      for (const prod of targetProds) {
        const currentCat = (prod.category || '').trim();
        const newCategory = catMapping[currentCat] || (currentCat.startsWith('Categoria ') ? currentCat : 'Categoria 1');

        let newSubcategory = prod.subcategory;
        if (prod.subcategory && prod.subcategory.trim()) {
          const rawSub = prod.subcategory.trim().toLowerCase();
          newSubcategory = subMapping[`${currentCat}:::${rawSub}`]
            || subMapping[`${newCategory}:::${rawSub}`]
            || subMapping[rawSub]
            || (rawSub.startsWith('subcategoria ') ? prod.subcategory : 'Subcategoria 1');
        }

        if (newCategory !== prod.category || newSubcategory !== prod.subcategory) {
          await supabase
            .from('products')
            .update({
              category: newCategory,
              subcategory: newSubcategory
            })
            .eq('id', prod.id);
        }
      }
    }
    console.log('[storeCloneService] ✅ Categorias e subcategorias pós-RPC padronizadas com sucesso.');
  } catch (err: any) {
    console.warn('[storeCloneService] ⚠️ Erro ao sanitizar categorias pós-RPC:', err);
  }
}
