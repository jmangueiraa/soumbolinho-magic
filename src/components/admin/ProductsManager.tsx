import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  DollarSign, 
  Sparkles, 
  Package, 
  Check, 
  X,
  Filter
} from 'lucide-react';
import { Product } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';
import { formatCurrency } from '../../utils/formatters';
import { ProductImagePlaceholder } from '../common/ProductImagePlaceholder';
import { ProductFormModal } from './ProductFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const ProductsManager: React.FC = () => {
  const { products, categories, deleteProduct, toggleProductStock, quickUpdatePrice } = useStoreData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Exclusão com confirmação
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; product: Product | null }>({
    isOpen: false,
    product: null,
  });

  // Edição rápida de preço em linha
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');

  // Filtragem na tabela
  const filteredProducts = products.filter((p) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSub = p.subcategory?.toLowerCase().includes(q);
      if (!matchName && !matchSub) return false;
    }
    if (selectedCategoryFilter && p.category !== selectedCategoryFilter) {
      return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setProductToEdit(product);
    setIsFormModalOpen(true);
  };

  const handleStartQuickPrice = (product: Product) => {
    setEditingPriceId(product.id);
    setNewPriceValue(product.price.toString().replace('.', ','));
  };

  const handleSaveQuickPrice = (productId: string) => {
    const num = parseFloat(newPriceValue.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      quickUpdatePrice(productId, num);
    }
    setEditingPriceId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteModalState.product) {
      deleteProduct(deleteModalState.product.id);
    }
    setDeleteModalState({ isOpen: false, product: null });
  };

  const getCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || catId;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>📦 Catálogo de Produtos</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFEBF6] text-[#FF1493] font-bold">
              {products.length} {products.length === 1 ? 'item' : 'itens'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre, edite preços, altere fotos e ative/desative itens do catálogo
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 border border-black"
        >
          <Plus className="w-4 h-4 text-[#FFD1EC]" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {/* Search & Category Filter Inside Table */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome de produto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1493] shadow-2xs"
          />
        </div>

        {/* Category Select */}
        <div className="w-full sm:w-64 shrink-0">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF1493] cursor-pointer shadow-2xs"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table Container */}
      <div className="bg-white rounded-3xl border border-[#FFA6DF]/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Categoria / Subcategoria</th>
                <th className="py-3 px-4">Preço Unitário</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#FFEBF6]/30 transition-colors">
                    
                    {/* Thumbnail & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-[#FFA6DF]/40 shrink-0 flex items-center justify-center">
                          {(() => {
                            const img = (product.image || product.image_url || product.imageUrl || product.photo_url || '').trim();
                            return img ? (
                              <img src={img} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <ProductImagePlaceholder showText={false} iconClassName="w-5 h-5" />
                            );
                          })()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 line-clamp-1">{product.name}</div>
                          {product.badge && (
                            <span className="inline-block text-[9px] font-bold px-2 py-0.2 rounded-full bg-[#FF1493] text-white mt-0.5">
                              {product.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category / Subcategory */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2B3A8C]">{getCategoryName(product.category)}</div>
                      {product.subcategory && (
                        <div className="text-[11px] text-slate-400 font-medium">{product.subcategory}</div>
                      )}
                    </td>

                    {/* Price (with quick edit support) */}
                    <td className="py-3.5 px-4">
                      {editingPriceId === product.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={newPriceValue}
                            onChange={(e) => setNewPriceValue(e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-[#FF1493] rounded-lg text-xs font-bold outline-none"
                          />
                          <button
                            onClick={() => handleSaveQuickPrice(product.id)}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPriceId(null)}
                            className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/price">
                          <span className="font-extrabold text-[#FF1493] text-sm">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {product.unitSuffix || '/Un'}
                          </span>
                          <button
                            onClick={() => handleStartQuickPrice(product)}
                            className="opacity-0 group-hover/price:opacity-100 p-1 text-slate-400 hover:text-black transition-opacity"
                            title="Alterar preço rápido"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Stock Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleProductStock(product.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          product.inStock
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        }`}
                        title="Clique para alternar disponibilidade"
                      >
                        <span className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{product.inStock ? 'Ativo' : 'Pausado'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-2 text-slate-600 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
                          title="Editar dados completos"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModalState({ isOpen: true, product })}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        productToEdit={productToEdit}
        onClose={() => setIsFormModalOpen(false)}
      />

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title="Excluir Produto"
        message={`Deseja realmente remover o produto "${deleteModalState.product?.name}" do catálogo? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalState({ isOpen: false, product: null })}
      />

    </div>
  );
};
