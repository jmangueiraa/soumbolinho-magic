import { supabase } from './supabase';

const BUCKET_NAME = 'products';

/**
 * Faz o upload de um arquivo de imagem para o bucket 'products' no Supabase Storage
 * e retorna a URL pública permanente da imagem.
 */
export async function uploadProductImage(file: File): Promise<{ url: string | null; error: string | null }> {
  console.log('[Supabase Storage] 📤 Iniciando upload do arquivo:', {
    name: file.name,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    type: file.type,
    bucket: BUCKET_NAME
  });

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const cleanFileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    console.log(`[Supabase Storage] 🚀 Enviando arquivo para o bucket "${BUCKET_NAME}" com o nome "${cleanFileName}"...`);

    // 1. Upload do arquivo bruto no bucket 'products'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png'
      });

    if (uploadError) {
      console.error('[Supabase Storage] ❌ Erro retornado pelo Supabase no upload:', uploadError);
      return { url: null, error: uploadError.message };
    }

    console.log('[Supabase Storage] ✅ Upload concluído no Supabase:', uploadData);

    // 2. Obter URL pública do arquivo
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
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
 * Remove um arquivo de imagem do Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<{ success: boolean; error: string | null }> {
  console.log('[Supabase Storage] 🗑️ Solicitando exclusão da imagem:', imageUrl);
  try {
    const urlParts = imageUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      console.warn('[Supabase Storage] URL não pertence ao bucket products:', imageUrl);
      return { success: true, error: null };
    }

    const filePath = urlParts[1];
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
      console.error('[Supabase Storage] Erro ao remover imagem:', error);
      return { success: false, error: error.message };
    }

    console.log('[Supabase Storage] Imagem removida do bucket:', filePath);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Storage] Exceção ao remover imagem:', err);
    return { success: false, error: err.message };
  }
}
