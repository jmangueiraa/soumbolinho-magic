import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Sparkles, Image as ImageIcon, FileText, Check } from 'lucide-react';
import { BannerSlide } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';

import { uploadProductImage } from '../../lib/storage';

interface BannerFormModalProps {
  isOpen: boolean;
  bannerToEdit: BannerSlide | null;
  onClose: () => void;
}

export const BannerFormModal: React.FC<BannerFormModalProps> = ({
  isOpen,
  bannerToEdit,
  onClose,
}) => {
  const { addBanner, updateBanner, banners } = useStoreData();

  const [formData, setFormData] = useState({
    type: 'image' as 'image' | 'text',
    imageUrl: '',
    altText: '',
    tag: '',
    title: '',
    subtitle: '',
    highlightText: '',
    themeColor: 'blue' as 'blue' | 'pink' | 'lilac' | 'yellow',
    linkUrl: '',
    order: 1,
    isActive: true,
  });

  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bannerToEdit) {
      setFormData({
        type: bannerToEdit.type || 'image',
        imageUrl: bannerToEdit.imageUrl || '',
        altText: bannerToEdit.altText || '',
        tag: bannerToEdit.tag || '',
        title: bannerToEdit.title || '',
        subtitle: bannerToEdit.subtitle || '',
        highlightText: bannerToEdit.highlightText || '',
        themeColor: bannerToEdit.themeColor || 'blue',
        linkUrl: bannerToEdit.linkUrl || '',
        order: bannerToEdit.order || 1,
        isActive: bannerToEdit.isActive,
      });
      setImagePreview(bannerToEdit.imageUrl || '');
    } else {
      setFormData({
        type: 'image',
        imageUrl: '',
        altText: 'Banner Soumbolinho',
        tag: '',
        title: '',
        subtitle: '',
        highlightText: '',
        themeColor: 'blue',
        linkUrl: '',
        order: 1,
        isActive: true,
      });
      setImagePreview('');
    }
    setError('');
  }, [bannerToEdit, banners.length, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setIsUploading(true);

    const { url, error: uploadErr } = await uploadProductImage(file);
    setIsUploading(false);

    if (url) {
      setImagePreview(url);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
    } else {
      console.warn('Fallback base64 para banner:', uploadErr);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData((prev) => ({ ...prev, imageUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type === 'text' && !formData.title.trim()) {
      setError('Por favor, informe ao menos o título/frase principal do slide.');
      return;
    }

    if (formData.type === 'image' && !formData.imageUrl.trim()) {
      setError('Por favor, forneça uma imagem (upload ou link URL).');
      return;
    }

    const payload: Omit<BannerSlide, 'id'> = {
      type: formData.type,
      imageUrl: formData.imageUrl.trim() || undefined,
      altText: formData.altText.trim() || undefined,
      tag: formData.tag.trim() || undefined,
      title: formData.title.trim() || undefined,
      subtitle: formData.subtitle.trim() || undefined,
      highlightText: formData.highlightText.trim() || undefined,
      themeColor: formData.themeColor,
      linkUrl: formData.linkUrl.trim() || undefined,
      order: Number(formData.order) || 1,
      isActive: formData.isActive,
    };

    if (bannerToEdit) {
      updateBanner(bannerToEdit.id, payload);
    } else {
      addBanner(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-pastel-pink-light via-pastel-lilac-light to-pastel-pink-light border-b border-[#FFA6DF]/40 flex items-center justify-between">
          <div>
            <h3 className="font-festive font-bold text-slate-900 text-lg">
              {bannerToEdit ? 'Editar Banner / Slide' : 'Novo Banner / Slide'}
            </h3>
            <p className="text-xs text-slate-500">
              Configure o conteúdo rotativo exibido no topo da página inicial
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Tipo de Slide (Texto ou Imagem) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Tipo de Conteúdo do Slide *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'text' })}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                  formData.type === 'text'
                    ? 'border-[#FF1493] bg-[#FFEBF6] ring-2 ring-[#FF1493]/20 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileText className={`w-4 h-4 ${formData.type === 'text' ? 'text-[#FF1493]' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Slide de Texto / Informativo</div>
                  <div className="text-[10px] text-slate-500 font-normal">3 frases e avisos em caixa suave</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'image' })}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                  formData.type === 'image'
                    ? 'border-[#FF1493] bg-[#FFEBF6] ring-2 ring-[#FF1493]/20 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ImageIcon className={`w-4 h-4 ${formData.type === 'image' ? 'text-[#FF1493]' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Banner com Imagem</div>
                  <div className="text-[10px] text-slate-500 font-normal">Foto de banner completa</div>
                </div>
              </button>
            </div>
          </div>

          {/* Campos se for TIPO TEXTO */}
          {formData.type === 'text' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tag / Etiqueta Superior
                  </label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="Ex: 🎀 Ateliê Encantando Festa"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#FF1493]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cor do Cartão Interno
                  </label>
                  <select
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="blue">Azul Suave (Padrão)</option>
                    <option value="pink">Rosa Suave</option>
                    <option value="lilac">Lilás Suave</option>
                    <option value="yellow">Amarelo Suave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Frase / Título Principal *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Personalizamos em Qualquer Tema para sua Festa!"
                  className="w-full text-xs sm:text-sm font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Frase / Subtítulo Explicativo
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Ex: Kits Só um Bolinho, topos de bolo shaker, caixinhas milk..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#FF1493]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. Frase de Destaque / Aviso
                </label>
                <input
                  type="text"
                  value={formData.highlightText}
                  onChange={(e) => setFormData({ ...formData, highlightText: e.target.value })}
                  placeholder="Ex: ✨ Enviamos a prévia da arte para aprovação no WhatsApp! 💕"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#FF1493] font-semibold text-[#FF1493]"
                />
              </div>
            </div>
          )}

          {/* Campos se for TIPO IMAGEM */}
          {formData.type === 'image' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-800">
                Imagem do Banner
              </label>

              {imagePreview && (
                <div className="w-full h-32 rounded-xl overflow-hidden bg-white border border-slate-200 mb-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  placeholder="Cole o link direto da imagem (URL)..."
                  className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#FF1493]"
                />

                <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-colors shrink-0 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Ordem, Link e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Ordem de Exibição
              </label>
              <input
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#FF1493]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Link de Destino ao Clicar (Opcional)
              </label>
              <input
                type="text"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="Ex: cat:kits-personalizados ou link externo"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#FF1493]"
              />
            </div>
          </div>

          {/* Toggle Ativo */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF1493] focus:ring-[#FF1493] border-slate-300 accent-[#FF1493]"
              />
              <span>Slide Ativo no Carrossel da Loja</span>
            </label>
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-medium animate-in fade-in">{error}</p>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-[#FFD1EC]" />
              <span>{bannerToEdit ? 'Salvar Alterações' : 'Criar Banner'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
