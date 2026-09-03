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

  // Verifica campos explícitos de vídeo primeiro
  const explicitVideo = (product.videoUrl || product.video_url || '').trim();
  if (explicitVideo) {
    return { url: explicitVideo, isVideo: true };
  }

  // Verifica imagem ou mídia geral
  const rawMedia = 
    product.image || 
    product.image_url || 
    product.imageUrl || 
    product.photo_url || 
    (Array.isArray(product.images) && product.images[0]) || 
    (Array.isArray(product.galleryImages) && product.galleryImages[0]) || 
    '';

  const mediaUrl = typeof rawMedia === 'string' ? rawMedia.trim() : '';
  const isVideo = product.mediaType === 'video' || isVideoUrl(mediaUrl);

  return {
    url: mediaUrl,
    isVideo
  };
}
