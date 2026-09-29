/**
 * Utilitários para detecção e exibição de mídias de produtos (Foto ou Vídeo)
 */

export function isVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim().toLowerCase();
  
  // Extensões de arquivos de vídeo diretos
  if (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.includes('video/mp4') ||
    cleanUrl.includes('video/webm')
  ) {
    return true;
  }

  // Links de serviços de vídeo conhecidos
  if (
    cleanUrl.includes('youtube.com/watch') ||
    cleanUrl.includes('youtu.be/') ||
    cleanUrl.includes('vimeo.com/')
  ) {
    return true;
  }

  return false;
}

export function getProductMedia(product?: any): {
  url: string;
  isVideo: boolean;
} {
  if (!product) return { url: '', isVideo: false };

  // 1. Imagem principal / Capa do produto
  const rawMedia = 
    product.imageUrl || 
    product.image_url || 
    product.image || 
    product.photo_url || 
    (Array.isArray(product.images) && product.images[0]) || 
    (Array.isArray(product.galleryImages) && product.galleryImages[0]) || 
    '';

  const mediaUrl = typeof rawMedia === 'string' ? rawMedia.trim() : '';
  const explicitVideo = (product.videoUrl || product.video_url || '').trim();

  // Se a mídia for exclusivamente vídeo (sem foto de capa), usa o vídeo
  if (product.mediaType === 'video' && explicitVideo && !mediaUrl) {
    return { url: explicitVideo, isVideo: true };
  }

  // Se houver foto de capa e não for arquivo de vídeo, exibe a foto na vitrine
  if (mediaUrl && !isVideoUrl(mediaUrl)) {
    return { url: mediaUrl, isVideo: false };
  }

  // Se tiver vídeo cadastrado
  if (explicitVideo) {
    return { url: explicitVideo, isVideo: true };
  }

  if (mediaUrl) {
    return { url: mediaUrl, isVideo: isVideoUrl(mediaUrl) };
  }

  return {
    url: '',
    isVideo: false
  };
}
