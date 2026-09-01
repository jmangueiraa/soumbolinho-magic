import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Sparkles, Image as ImageIcon, Check, Loader2, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { uploadProductImage } from '../../lib/storage';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit: Product | null;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  onClose,
}) => {
  const { categories, addProduct, updateProduct } = useStoreData();

  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.id || '',
    subcategory: '',
    price: '',
    unitSuffix: '/Un',
    imageUrl: '',
    description: '',
    inStock: true,
    badge: '' as any,
    isCustomizable: true,
    customizationPlaceholder: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string }>({});

  useEffect(() => {
    if (productToEdit) {
      const existingImg = (productToEdit.imageUrl || productToEdit.image_url || productToEdit.image || productToEdit.photo_url || '').trim();
      setFormData({
        name: productToEdit.name,
        category: productToEdit.category,
        subcategory: productToEdit.subcategory || '',
        price: productToEdit.price.toString().replace('.', ','),
        unitSuffix: productToEdit.unitSuffix || '/Un',
        imageUrl: existingImg,
        description: productToEdit.description || '',
        inStock: productToEdit.inStock,
        badge: productToEdit.badge || '',
        isCustomizable: productToEdit.isCustomizable ?? true,
        customizationPlaceholder: productToEdit.customizationPlaceholder || '',
      });
      setImagePreview(existingImg);
    } else {
      setFormData({
        name: '',
        category: categories[0]?.id || '',
        subcategory: categories[0]?.subcategories[0] || '',
        price: '',
        unitSuffix: '/Un',
        imageUrl: '',
        description: '',
        inStock: true,
        badge: '',
        isCustomizable: true,
        customizationPlaceholder: '',
      });
      setImagePreview('');
    }
    setSelectedFile(null);
    setUploadError(null);
    setIsUploading(false);
    setIsSubmitting(false);
    setErrors({});
  }, [productToEdit, categories, isOpen]);

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === formData.category);

  // Manipular seleção e upload imediato no Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[ProductFormModal] 📁 Arquivo de imagem selecionado:', file.name, `(${file.size} bytes)`);
    setSelectedFile(file);
    setUploadError(null);

    // Preview local imediato
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);

    // Iniciar upload no Supabase
    setIsUploading(true);
    const { url, error } = await uploadProductImage(file);
    setIsUploading(false);

    if (url) {
      console.log('[ProductFormModal] ✅ Imagem persistida no Supabase com URL:', url);
      setImagePreview(url);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
    } else {
      console.error('[ProductFormModal] ❌ Falha no upload para o Supabase Storage:', error);
      setUploadError(`Erro no Supabase: ${error || 'Não foi possível salvar a imagem no bucket.'}`);
      
      // Fallback para Base64 para não perder a foto do usuário
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData((prev) => ({ ...prev, imageUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    console.log('[ProductFormModal] 🔗 URL manual informada:', url);
    setSelectedFile(null);
    setUploadError(null);
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  };

  const validate = () => {
    const newErrors: { name?: string; price?: string; category?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Informe o nome do produto.';
    
    const parsedPrice = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Informe um preço válido maior que 0.';
    }
    if (!formData.category) newErrors.category = 'Selecione uma categoria.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    let finalImageUrl = formData.imageUrl.trim();

    // Se houver um arquivo selecionado e ainda não tiver uma URL pública do Supabase, tenta o upload antes de salvar
    if (selectedFile && (!finalImageUrl || finalImageUrl.startsWith('blob:'))) {
      console.log('[ProductFormModal] ⏳ Aguardando conclusão do upload para o Supabase antes de salvar...');
      setIsUploading(true);
      const { url, error } = await uploadProductImage(selectedFile);
      setIsUploading(false);

      if (url) {
        finalImageUrl = url;
      } else {
        console.warn('[ProductFormModal] ⚠️ Upload falhou no envio final, mantendo preview atual:', error);
      }
    }

    const numericPrice = parseFloat(formData.price.replace(',', '.'));

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      subcategory: formData.subcategory.trim() || undefined,
      price: numericPrice,
      unitSuffix: formData.unitSuffix.trim() || '/Un',
      imageUrl: finalImageUrl,
      image: finalImageUrl,
      image_url: finalImageUrl,
      photo_url: finalImageUrl,
      description: formData.description.trim() || undefined,
      inStock: formData.inStock,
      badge: formData.badge || undefined,
      isCustomizable: formData.isCustomizable,
      customizationPlaceholder: formData.customizationPlaceholder.trim() || undefined,
    };

    console.log('[ProductFormModal] 💾 Salvando produto com payload:', payload);

    if (productToEdit) {
      updateProduct(productToEdit.id, payload);
    } else {
      addProduct(payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-pastel-pink-light via-pastel-lilac-light to-pastel-pink-light border-b border-[#FFA6DF]/40 flex items-center justify-between">
          <div>
            <h3 className="font-festive font-bold text-slate-900 text-lg">
              {productToEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>
            <p className="text-xs text-slate-500">
              Preencha os dados e fotos do item para o catálogo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Caixa Milk Personalizada com Laço"
              className={`w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] transition-all ${
                errors.name ? 'border-rose-500' : 'border-slate-200'
              }`}
            />
            {errors.name && <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.name}</span>}
          </div>

          {/* Categoria e Subcategoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Categoria *
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const catObj = categories.find((c) => c.id === newCat);
                  setFormData({
                    ...formData,
                    category: newCat,
                    subcategory: catObj?.subcategories[0] || ''
                  });
                }}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Subcategoria (opcional)
              </label>
              {currentCategory && currentCategory.subcategories.length > 0 ? (
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] cursor-pointer"
                >
                  <option value="">Nenhuma / Geral</option>
                  {currentCategory.subcategories.map((subcat) => (
                    <option key={subcat} value={subcat}>
                      {subcat}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Nome da subcategoria"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
                />
              )}
            </div>
          </div>

          {/* Preço e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Preço Unitário (R$) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-slate-500">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] font-bold ${
                    errors.price ? 'border-rose-500' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.price && <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.price}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Sufixo de Unidade
              </label>
              <input
                type="text"
                value={formData.unitSuffix}
                onChange={(e) => setFormData({ ...formData, unitSuffix: e.target.value })}
                placeholder="Ex: /Un, /Kit, /Pct 30un"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493]"
              />
            </div>
          </div>

          {/* Imagem do Produto com Upload do Supabase */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#FF1493]" />
              Foto / Imagem do Produto (Supabase Storage)
            </label>

            <div className="flex gap-4 items-start">
              {/* Preview Thumbnail */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#FFA6DF] bg-[#FFEBF6] shrink-0 flex items-center justify-center relative shadow-xs">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ProductImagePlaceholder showText={false} iconClassName="w-6 h-6" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload or Link Input */}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Cole o link direto da imagem (URL) ou faça upload..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#FF1493]"
                />

                <label className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-xs ${
                  isUploading 
                    ? 'bg-[#FFEBF6] text-[#FF1493] cursor-wait border border-[#FF1493]/30' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FF1493]" />
                      <span>Enviando para o bucket 'products'...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#FF1493]" />
                      <span>Fazer upload de foto (Supabase)</span>
                    </>
                  )}
                  <input
                    type="file"
                    disabled={isUploading}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Descrição / Detalhes do Produto
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Confeccionado em papel fotográfico fosco 230g, acompanha laço de cetim."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FF1493] resize-none"
            />
          </div>

          {/* Opções de Status e Destaque */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Etiqueta / Badge de Destaque
              </label>
              <select
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value as any })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                <option value="">Nenhum</option>
                <option value="Mais Vendido">Mais Vendido</option>
                <option value="Lançamento">Lançamento</option>
                <option value="Personalizado">Personalizado</option>
                <option value="Destaque">Destaque</option>
                <option value="Pronta Entrega">Pronta Entrega</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={formData.inStock}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  className="w-4 h-4 rounded text-[#FF1493] focus:ring-[#FF1493] border-slate-300 accent-[#FF1493]"
                />
                <span>Disponível no Catálogo (Ativo)</span>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading || isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isUploading || isSubmitting}
              className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFD1EC]" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#FFD1EC]" />
                  <span>{productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
