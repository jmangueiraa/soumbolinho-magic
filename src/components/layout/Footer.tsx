import React from 'react';
import { Heart, MessageCircle, Instagram, MapPin, Clock, ShieldCheck, Truck, Lock } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useStoreData } from '../../context/StoreDataContext';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';

export const Footer: React.FC = () => {
  const { storeConfig, categories } = useStoreData();
  const { setSelectedCategory } = useFilter();

  const handleOpenAdmin = () => {
    window.location.hash = '/admin';
  };

  return (
    <footer className="bg-black text-zinc-300 mt-20 border-t border-zinc-800">
      {/* Benefit Highlights */}
      <div className="border-b border-zinc-800/80 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Arquivos Digitais</h4>
                <p className="text-xs text-zinc-400">Modelos prontos para impressão</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Compra Segura</h4>
                <p className="text-xs text-zinc-400">Pix com liberação imediata</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Link Imediato</h4>
                <p className="text-xs text-zinc-400">Download direto na tela e e-mail</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Atendimento WhatsApp</h4>
                <p className="text-xs text-zinc-400">{storeConfig.whatsappDisplay || '(00) 00000-0000'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <SoumbolinhoLogo variant="light" size="md" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {storeConfig.slogan || 'Sua loja de moldes, papelaria e arquivos digitais'}.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {storeConfig.instagram && (
                <a
                  href={`https://instagram.com/${storeConfig.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-white text-zinc-300 hover:text-black flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {storeConfig.whatsappNumber && (
                <a
                  href={`https://wa.me/${storeConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Categorias</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Informações */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Informações</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>Compra 100% Segura</li>
              <li>Acesso Imediato aos Arquivos</li>
              <li>Suporte no WhatsApp</li>
              <li>Pagamento via Pix ou Cartão</li>
            </ul>
          </div>

          {/* Atendimento */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white mb-4">Atendimento</h4>
            <div className="text-xs text-zinc-400 space-y-2">
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>Segunda a Sábado • 09h às 18h</span>
              </p>
              <p className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp: {storeConfig.whatsappDisplay}</span>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {storeConfig.storeName || 'Soumbolinho'} • Todos os direitos reservados.</p>
          <button
            onClick={handleOpenAdmin}
            className="hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Lock className="w-3 h-3" />
            <span>Área Administrativa</span>
          </button>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
