import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Check, 
  FolderPlus 
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

  // Estado para controlar qual categoria está expandida
  const [expandedCat, setExpandedCat] = useState<string | null>(() => {
    return categories.length > 0 ? categories[0].id : null;
  });

  // Estado para controlar se o input de nova subcategoria está aberto
  const [addingSubCatTo, setAddingSubCatTo] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState('');

  // Criar nova categoria
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Renomear categoria inline
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Modal de confirmação de exclusão
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
    setAddingSubCatTo(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.type === 'category') {
      deleteCategory(deleteModal.categoryId);
      if (expandedCat === deleteModal.categoryId) {
        setExpandedCat(null);
      }
    } else if (deleteModal.type === 'subcategory' && deleteModal.subcatName) {
      deleteSubcategory(deleteModal.categoryId, deleteModal.subcatName);
    }
    setDeleteModal({ isOpen: false, type: 'category', categoryId: '', name: '' });
  };

  const getProductCountByCategory = (catId: string, catName: string) => {
    const cName = (catName || '').toLowerCase().trim();
    return products.filter((p) => {
      return (
        p.category_id === catId ||
        p.category === catId ||
        (p.category && p.category.toLowerCase().trim() === cName)
      );
    }).length;
  };

  return (
    <div className="space-y-6 font-sans text-gray-800">
      
      {/* CABEÇALHO */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shrink-0">
              <FolderTree size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Categorias</h1>
              <p className="text-xs text-gray-500 mt-1">Organize a árvore da sua loja</p>
            </div>
          </div>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {categories.length} {categories.length === 1 ? 'no total' : 'no total'}
          </span>
        </div>

        {/* Botão de Adicionar Categoria */}
        {!isAddingCategory ? (
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm shadow-xs"
          >
            <Plus size={18} /> 
            <span>Nova Categoria</span>
          </button>
        ) : (
          <form 
            onSubmit={handleCreateCategory}
            className="p-4 bg-gray-50 rounded-xl border border-blue-200 animate-in fade-in space-y-3"
          >
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Digite o nome da categoria (ex: Camisetas, Eletrônicos)..."
                className="w-full text-sm px-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCatName('');
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Salvar Categoria
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* LISTA DE CATEGORIAS */}
      {categories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
          <FolderPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-bold text-gray-800">Nenhuma categoria cadastrada</p>
          <p className="text-xs text-gray-400 mt-1">Crie a primeira categoria para organizar os produtos da sua loja.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const isExpanded = expandedCat === category.id;
            const productCount = getProductCountByCategory(category.id, category.name);
            const isEditing = editingCatId === category.id;
            const isAddingSub = addingSubCatTo === category.id;

            return (
              <div 
                key={category.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'border-blue-200 shadow-md ring-1 ring-blue-100' : 'border-gray-100 shadow-xs hover:border-gray-200'
                }`}
              >
                
                {/* LINHA PRINCIPAL SEMPRE VISÍVEL */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedCat(isExpanded ? null : category.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Seta de expansão interativa */}
                    <button 
                      type="button"
                      className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {isEditing ? (
                      <div 
                        className="flex items-center gap-2" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveRenameCategory(category.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingCatId(null);
                            }
                          }}
                          className="text-sm font-semibold px-2.5 py-1 bg-white border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          onClick={() => handleSaveRenameCategory(category.id)}
                          className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                          title="Salvar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        <span className="font-semibold text-gray-900 text-base truncate">
                          {category.name}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                          {productCount} {productCount === 1 ? 'PRODUTO' : 'PRODUTOS'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Ações (Editar / Excluir) não interferem no clique de expansão */}
                  <div 
                    className="flex items-center gap-1 shrink-0" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => {
                        setEditingCatId(category.id);
                        setEditCatName(category.name);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar nome da categoria"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteModal({
                        isOpen: true,
                        type: 'category',
                        categoryId: category.id,
                        name: category.name
                      })}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir categoria"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* ÁREA DE SUBCATEGORIAS (Só aparece se estiver expandido) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Subcategorias ({category.subcategories?.length || 0})
                      </span>
                      {!isAddingSub && (
                        <button
                          onClick={() => {
                            setAddingSubCatTo(category.id);
                            setNewSubcatName('');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Adicionar Subcategoria</span>
                        </button>
                      )}
                    </div>

                    {/* Form para Adicionar Subcategoria Inline */}
                    {isAddingSub && (
                      <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded-xl border border-blue-200 shadow-2xs animate-in fade-in">
                        <input
                          type="text"
                          autoFocus
                          value={newSubcatName}
                          onChange={(e) => setNewSubcatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubcategory(category.id);
                            }
                            if (e.key === 'Escape') {
                              setAddingSubCatTo(null);
                            }
                          }}
                          placeholder="Nome da subcategoria..."
                          className="flex-1 text-xs sm:text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleAddSubcategory(category.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Salvar</span>
                        </button>
                        <button
                          onClick={() => setAddingSubCatTo(null)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Lista de Chips / Badges de Subcategoria */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {category.subcategories && category.subcategories.length > 0 ? (
                        category.subcategories.map((subcat) => (
                          <span
                            key={subcat}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200 shadow-2xs group transition-colors hover:border-gray-300"
                          >
                            <span className="text-gray-400">•</span>
                            <span>{subcat}</span>
                            <button
                              onClick={() => setDeleteModal({
                                isOpen: true,
                                type: 'subcategory',
                                categoryId: category.id,
                                subcatName: subcat,
                                name: subcat
                              })}
                              className="text-gray-400 hover:text-red-500 ml-1 rounded p-0.5 transition-colors cursor-pointer"
                              title="Excluir subcategoria"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic py-1">
                          Nenhuma subcategoria cadastrada nesta categoria.
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
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

export default CategoriesManager;
