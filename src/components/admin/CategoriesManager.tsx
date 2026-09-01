import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  FolderPlus, 
  Layers, 
  Check, 
  X, 
  ChevronRight,
  FolderTree
} from 'lucide-react';
import { Category } from '../../types';
import { useStoreData } from '../../context/StoreDataContext';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const CategoriesManager: React.FC = () => {
  const { 
    categories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    addSubcategory, 
    deleteSubcategory,
    products
  } = useStoreData();

  // Criar nova categoria
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Renomear categoria
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Adicionar subcategoria
  const [subcatInputCatId, setSubcatInputCatId] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState('');

  // Modal de exclusão
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory';
    categoryId: string;
    subcatName?: string;
    name: string;
  }>({
    isOpen: false,
    type: 'category',
    categoryId: '',
    name: ''
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const handleSaveRenameCategory = (categoryId: string) => {
    if (!editCatName.trim()) return;
    updateCategory(categoryId, { name: editCatName.trim() });
    setEditingCatId(null);
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (!newSubcatName.trim()) return;
    addSubcategory(categoryId, newSubcatName.trim());
    setNewSubcatName('');
    setSubcatInputCatId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.type === 'category') {
      deleteCategory(deleteModal.categoryId);
    } else if (deleteModal.type === 'subcategory' && deleteModal.subcatName) {
      deleteSubcategory(deleteModal.categoryId, deleteModal.subcatName);
    }
    setDeleteModal({ isOpen: false, type: 'category', categoryId: '', name: '' });
  };

  const getProductCountByCategory = (catId: string) => {
    return products.filter((p) => p.category === catId).length;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm">
        <div>
          <h2 className="font-festive text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#FF1493]" />
            <span>Categorias & Subcategorias</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFEBF6] text-[#FF1493] font-bold">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie a árvore de categorias exibida no menu lateral e filtros da loja
          </p>
        </div>

        <button
          onClick={() => setIsAddingCategory(true)}
          className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 border border-black"
        >
          <FolderPlus className="w-4 h-4 text-[#FFD1EC]" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Form Nova Categoria Inline */}
      {isAddingCategory && (
        <form 
          onSubmit={handleCreateCategory}
          className="p-4 bg-white rounded-3xl border-2 border-[#FF1493] shadow-sm flex flex-col sm:flex-row items-center gap-3 animate-in fade-in"
        >
          <div className="flex-1 w-full">
            <input
              type="text"
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Digite o nome da nova categoria (ex: Topos de Bolo & Velas)..."
              className="w-full text-xs sm:text-sm px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF1493]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setIsAddingCategory(false);
                setNewCatName('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#FF1493] hover:bg-[#E6007A] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Salvar Categoria
            </button>
          </div>
        </form>
      )}

      {/* Grid / Lista de Categorias com Subcategorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map((category) => {
          const productCount = getProductCountByCategory(category.id);

          return (
            <div 
              key={category.id} 
              className="bg-white p-5 rounded-3xl border border-[#FFA6DF]/40 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#FFA6DF] transition-colors"
            >
              
              {/* Category Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex-1 min-w-0">
                  {editingCatId === category.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="w-full text-sm font-bold px-2 py-1 bg-slate-50 border border-[#FF1493] rounded-lg outline-none"
                      />
                      <button
                        onClick={() => handleSaveRenameCategory(category.id)}
                        className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#FF1493]" />
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {category.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">
                        {productCount} {productCount === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingCatId(category.id);
                      setEditCatName(category.name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                    title="Renomear Categoria"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteModal({
                      isOpen: true,
                      type: 'category',
                      categoryId: category.id,
                      name: category.name
                    })}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subcategories List */}
              <div className="space-y-2 flex-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Subcategorias ({category.subcategories.length}):</span>
                  {subcatInputCatId !== category.id && (
                    <button
                      onClick={() => {
                        setSubcatInputCatId(category.id);
                        setNewSubcatName('');
                      }}
                      className="text-[#FF1493] hover:underline font-bold flex items-center gap-0.5 text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>

                {/* Subcategory Input */}
                {subcatInputCatId === category.id && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-[#FFA6DF] animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      placeholder="Nome da subcategoria..."
                      className="flex-1 text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#FF1493]"
                    />
                    <button
                      onClick={() => handleAddSubcategory(category.id)}
                      className="px-3 py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setSubcatInputCatId(null)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Subcategory Badges / Items */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {category.subcategories.length > 0 ? (
                    category.subcategories.map((subcat) => (
                      <span
                        key={subcat}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFEBF6] text-[#2B3A8C] text-xs font-semibold rounded-xl border border-[#FFA6DF]/50 group/sub"
                      >
                        <span>° {subcat}</span>
                        <button
                          onClick={() => setDeleteModal({
                            isOpen: true,
                            type: 'subcategory',
                            categoryId: category.id,
                            subcatName: subcat,
                            name: subcat
                          })}
                          className="text-slate-400 hover:text-rose-600 ml-1 rounded-full"
                          title="Excluir subcategoria"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Nenhuma subcategoria cadastrada.
                    </span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'category' ? 'Excluir Categoria' : 'Excluir Subcategoria'}
        message={`Deseja realmente remover "${deleteModal.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'category', categoryId: '', name: '' })}
      />

    </div>
  );
};
