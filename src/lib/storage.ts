import { supabase } from './supabase';

export const PRODUCT_BUCKET = 'products';
export const SITE_ASSETS_BUCKET = 'site-assets';
export const BANNERS_BUCKET = 'banners';

/**
 * Faz o upload de um arquivo de mídia (imagem ou vídeo) para o Supabase Storage
 * e retorna a URL pública permanente gerada.
 */
export async function uploadMediaToSupabase(
  file: File, 
  bucket: string = PRODUCT_BUCKET
): Promise<{ url: string | null; error: string | null }> {
  console.log(`[Supabase Storage] 📤 Iniciando upload no bucket "${bucket}":`, {
    name: file.name,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    type: file.type
  });

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const cleanFileName = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    // 1. Tentar upload no bucket desejado
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png'
      });

    // Se o bucket não existir, tenta fallback para 'products'
    if (uploadError && bucket !== PRODUCT_BUCKET) {
      console.warn(`[Supabase Storage] Falha no bucket "${bucket}", tentando fallback para "${PRODUCT_BUCKET}"...`, uploadError.message);
      const fallbackResult = await supabase.storage
        .from(PRODUCT_BUCKET)
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/png'
        });

      if (!fallbackResult.error) {
        uploadData = fallbackResult.data;
        uploadError = null;
        bucket = PRODUCT_BUCKET;
      }
    }

    if (uploadError) {
      console.error('[Supabase Storage] ❌ Erro retornado pelo Supabase no upload:', uploadError);
      return { url: null, error: uploadError.message };
    }

    // 2. Obter URL pública permanente
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(cleanFileName);

    const publicUrl = publicUrlData?.publicUrl || null;
    console.log('[Supabase Storage] 🔗 URL pública gerada com sucesso:', publicUrl);

    return { url: publicUrl, error: null };
  } catch (err: any) {
    console.error('[Supabase Storage] ❌ Exceção inesperada durante o upload:', err);
    return { url: null, error: err.message || 'Erro inesperado durante o upload.' };
  }
}

/**
 * Atalho compatível para upload de imagem de produto
 */
export async function uploadProductImage(file: File): Promise<{ url: string | null; error: string | null }> {
  return uploadMediaToSupabase(file, PRODUCT_BUCKET);
}

/**
 * Atalho para upload de imagem/banner da loja
 */
export async function uploadBannerImage(file: File): Promise<{ url: string | null; error: string | null }> {
  return uploadMediaToSupabase(file, SITE_ASSETS_BUCKET);
}

/**
 * Remove um arquivo do Supabase Storage
 */
export async function deleteProductImage(imageUrl: string, bucket: string = PRODUCT_BUCKET): Promise<{ success: boolean; error: string | null }> {
  try {
    const urlParts = imageUrl.split(`/storage/v1/object/public/${bucket}/`);
    if (urlParts.length < 2) {
      return { success: true, error: null };
    }

    const filePath = urlParts[1];
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('[Supabase Storage] Erro ao remover mídia:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Storage] Exceção ao remover mídia:', err);
    return { success: false, error: err.message };
  }
}
