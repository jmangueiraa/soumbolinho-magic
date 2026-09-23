import React, { useState, useEffect, useRef } from 'react';
import { 
  Rocket, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Star, 
  Globe, 
  CreditCard, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  Check, 
  ShoppingBag, 
  TrendingUp, 
  ChevronDown,
  Menu,
  X,
  Smartphone,
  Layers,
  Shield,
  QrCode,
  ShoppingCart,
  Bell,
  Play,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from '../../lib/router';
import { cloneStoreTemplate } from '../../services/storeCloneService';
import { notifyNewStoreCreated } from '../../services/adminTelegramNotificationService';
import { slugify } from '../../utils/slug';
import { AJP_OFFICIAL_LOGO_BASE64 } from '../../assets/officialLogo';

export const MarketingLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Estados do Formulário de Onboarding
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    storeName: '',
    slug: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'iniciante' | 'escala'>('escala');

  // FAQ Accordion State (primeira dúvida aberta por padrão)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Menu Mobile Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // CTA Flutuante Mobile: visível apenas quando o formulário não estiver no campo de visão
  const [showFloatingCta, setShowFloatingCta] = useState(true);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Quando o formulário estiver visível na tela, esconde o botão flutuante para não obstruir
          setShowFloatingCta(!entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rolagem automática para a seção quando a URL carregar com hash ou path específico (ex: #recursos, #precos, /cadastro)
  useEffect(() => {
    const handleScrollToTarget = () => {
      if (typeof window === 'undefined') return;
      const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
      const rawPath = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase().trim();
      const targetId = rawHash || (['recursos', 'como-funciona', 'beneficios', 'precos', 'faq', 'cadastro', 'planos', 'comecar', 'onboarding'].includes(rawPath) ? rawPath : '');

      if (targetId) {
        const mappedId = (targetId === 'planos' || targetId === 'comecar' || targetId === 'onboarding') ? 'cadastro' : targetId;
        const targetEl = document.getElementById(mappedId);
        if (targetEl) {
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (mappedId === 'cadastro') {
              firstInputRef.current?.focus();
            }
          }, 200);
        }
      }
    };

    handleScrollToTarget();
    window.addEventListener('hashchange', handleScrollToTarget);
    return () => window.removeEventListener('hashchange', handleScrollToTarget);
  }, []);

  // Auto-gera o slug a partir do nome da loja caso o usuário ainda não tenha editado manualmente
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => {
      const newSlug = slugManuallyEdited ? prev.slug : slugify(name);
      return {
        ...prev,
        storeName: name,
        slug: newSlug
      };
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    const clean = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, slug: clean }));
  };

  const scrollToRegistration = () => {
    setMobileMenuOpen(false);
    const el = formRef.current || document.getElementById('cadastro');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 500);
    }
  };

  const handleChoosePlan = (plan: 'iniciante' | 'escala') => {
    setSelectedPlan(plan);
    scrollToRegistration();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanSlug = formData.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');

    if (!cleanSlug || cleanSlug.length < 3) {
      setErrorMessage('Por favor, informe um endereço válido (mínimo de 3 caracteres, letras e números).');
      return;
    }

    if (!formData.password || formData.password.length < 4) {
      setErrorMessage('A senha de acesso administrativo deve ter no mínimo 4 caracteres.');
      return;
    }

    // Validação contra rotas reservadas do sistema
    const reservedSlugs = [
      'admin', 'master', 'super-admin', 'api', 'checkout', 'cart', 'carrinho', 
      'finalizar-compra', 'pagamento-cartao', 'cartao', 'login', 'produtos', 
      'produto', 'loja', 'arquivos', 'cadastro', 'criar-loja', 'planos', 'comecar'
    ];

    if (reservedSlugs.includes(cleanSlug)) {
      setErrorMessage(`O endereço "${cleanSlug}" é um termo reservado da plataforma. Por favor, escolha outro nome.`);
      return;
    }

    setLoading(true);

    try {
      console.log(`[Cadastro Loja] 🚀 Iniciando processo de criação da loja "${cleanSlug}"...`);

      // 1. Verifica se já existe uma loja com este slug no Supabase
      const { data: existingStore, error: checkError } = await supabase
        .from('stores')
        .select('id, slug, name')
        .or(`slug.eq.${cleanSlug},id.eq.store_${cleanSlug}`)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Aviso ao checar duplicidade de slug:', checkError);
      }

      if (existingStore) {
        throw new Error(`O subdomínio "${cleanSlug}.ajpstore.com.br" já está sendo usado por outro lojista. Por favor, escolha outro nome para sua loja.`);
      }

      // 2. Separação de Autenticação: Criação do usuário no Supabase Auth (se aplicável)
      const cleanEmail = formData.clientEmail.toLowerCase().trim();
      const cleanPassword = formData.password.trim();
      let authUserId: string | null = null;

      try {
        console.log(`[Cadastro Loja] 🔑 Criando usuário no Supabase Auth para "${cleanEmail}"...`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              client_name: formData.clientName.trim(),
              store_name: formData.storeName.trim(),
              slug: cleanSlug,
              whatsapp_number: formData.clientPhone.trim() || ''
            }
          }
        });

        if (authError) {
          console.log('[Cadastro Loja] Aviso no Supabase Auth:', authError.message);
        } else if (authData?.user?.id) {
          authUserId = authData.user.id;
          console.log('[Cadastro Loja] ✅ Usuário registrado no Supabase Auth com ID:', authUserId);
        }
      } catch (authEx: any) {
        console.log('[Cadastro Loja] Exceção tratada no Supabase Auth:', authEx);
      }

      // 3. Consultar a loja matriz no Supabase (slug === 'ajpstore') para obter configurações de layout
      const { data: matrizStore } = await supabase
        .from('stores')
        .select('*')
        .or('slug.eq.ajpstore,id.eq.store_ajpstore,is_matriz.eq.true')
        .limit(1)
        .maybeSingle();

      const matrizTheme = matrizStore?.theme_settings
        ? (typeof matrizStore.theme_settings === 'string' ? JSON.parse(matrizStore.theme_settings) : matrizStore.theme_settings)
        : null;

      const resolvedPrimaryColor = matrizStore?.primary_color || matrizTheme?.primary_color || '#FF1493';
      const resolvedSecondaryColor = matrizStore?.secondary_color || matrizTheme?.secondary_color || '#00a8e8';
      const resolvedColorPalette = matrizStore?.color_palette || matrizTheme?.color_palette || 'pink_pastel';
      const resolvedLayoutStyle = matrizStore?.layout_style || matrizTheme?.theme_layout || 'classic';
      const resolvedLogoUrl = matrizStore?.logo_url || matrizTheme?.logo_url || '/ajpstore-logo.png';

      // 4. Inserção na tabela stores contendo apenas as colunas corretas
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newStoreId = `store_${cleanSlug}`;

      const storePayload: any = {
        id: newStoreId,
        name: formData.storeName.trim(),
        store_name: formData.storeName.trim(),
        slug: cleanSlug,
        client_name: formData.clientName.trim(),
        client_email: cleanEmail,
        whatsapp_number: formData.clientPhone.trim() || '',
        whatsapp_display: formData.clientPhone.trim() || '',
        custom_domain: `${cleanSlug}.ajpstore.com.br`,
        admin_password: cleanPassword,
        subscription_status: 'trial',
        is_active: true,
        is_matriz: false,
        domain_status: 'ativo',
        expires_at: trialEndsAt,
        monthly_fee: selectedPlan === 'iniciante' ? 30.00 : 50.00,
        layout_style: resolvedLayoutStyle,
        primary_color: resolvedPrimaryColor,
        color_palette: resolvedColorPalette,
        logo_url: resolvedLogoUrl,
        theme_settings: {
          logo_url: resolvedLogoUrl,
          primary_color: resolvedPrimaryColor,
          secondary_color: resolvedSecondaryColor,
          color_palette: resolvedColorPalette,
          theme_layout: resolvedLayoutStyle,
          layout_style: resolvedLayoutStyle
        }
      };

      // Inserção adaptativa e resiliente na tabela stores
      let currentPayload = { ...storePayload };
      let insertedStore = null;

      for (let attempt = 0; attempt < 25; attempt++) {
        const res = await supabase
          .from('stores')
          .insert([currentPayload])
          .select()
          .single();

        if (!res.error) {
          insertedStore = res.data;
          console.log('[Cadastro Loja] ✅ Loja registrada com sucesso na tabela stores:', insertedStore?.id || newStoreId);
          break;
        }

        console.log(`[Cadastro Loja] Tentativa ${attempt + 1} de inserção em stores:`, res.error);

        // Se o erro for de coluna inexistente no schema cache do Supabase, remove e tenta novamente
        const colMatch =
          res.error.message?.match(/Could not find the '([^']+)' column/i) ||
          res.error.message?.match(/Could not find the "([^"]+)" column/i) ||
          res.error.message?.match(/column "([^"]+)" of relation "stores" does not exist/i) ||
          res.error.message?.match(/column "([^"]+)" does not exist/i) ||
          res.error.message?.match(/column '([^']+)' does not exist/i);

        if (colMatch && colMatch[1] && colMatch[1] !== 'theme_settings') {
          console.log(`[Cadastro Loja] Coluna '${colMatch[1]}' não existe em stores. Removendo do payload...`);
          delete currentPayload[colMatch[1]];
          continue;
        }

        throw new Error(res.error.message || 'Erro ao registrar a loja no Supabase.');
      }

      if (!insertedStore) {
        throw new Error('Não foi possível registrar a loja no banco de dados. Tente novamente.');
      }

      // 5. Vincula usuário na tabela store_users caso exista
      try {
        await supabase.from('store_users').insert([{
          store_id: newStoreId,
          email: cleanEmail,
          password_hash: cleanPassword,
          role: 'owner',
          ...(authUserId ? { user_id: authUserId } : {})
        }]);
      } catch (storeUserErr) {
        console.log('[Cadastro Loja] Aviso store_users:', storeUserErr);
      }

      // 6. Sessão administrativa local para entrada imediata
      try {
        sessionStorage.setItem('soumbolinho_admin_auth_session', 'true');
        sessionStorage.setItem('current_store_slug', cleanSlug);
        sessionStorage.setItem('last_created_store_id', newStoreId);
      } catch (err) {
        console.log('[Cadastro Loja] Aviso sessionStorage:', err);
      }

      // 6.1. Disparo imediato da notificação de Nova Loja Criada para o Telegram Super Admin
      try {
        notifyNewStoreCreated({
          store_name: formData.storeName.trim(),
          client_name: (cleanOwnerName || formData.clientName || '').trim(),
          whatsapp_number: cleanWhatsApp,
          client_email: cleanEmail,
          slug: cleanSlug,
          status: 'Período de Testes (Trial)'
        });
      } catch (tgErr) {
        console.warn('[Cadastro Loja] Aviso notificação Telegram:', tgErr);
      }

      // 7. Proteção da Clonagem: bloco seguro garantindo que a loja principal continue registrada mesmo se a cópia falhar
      try {
        console.log(`[Cadastro Loja] 📦 Iniciando clonagem da matriz ajpstore para "${newStoreId}"...`);
        await cloneStoreTemplate(matrizStore?.id || 'ajpstore', newStoreId, formData.storeName.trim());
        console.log('[Cadastro Loja] ✅ Clonagem da matriz concluída com sucesso.');
      } catch (cloneErr: any) {
        console.log('[Cadastro Loja] Aviso de clonagem (a loja principal foi registrada com sucesso):', cloneErr);
      }

      setSuccessMessage('🎉 Loja criada com sucesso! Seus 7 dias grátis foram ativados. Redirecionando...');

      // 8. Redirecionamento Correto: envia o usuário exatamente para https://${slug}.ajpstore.com.br/admin
      const redirectUrl = `https://${cleanSlug}.ajpstore.com.br/admin`;
      console.log(`[Cadastro Loja] 🚀 Redirecionando para: ${redirectUrl}`);

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);

    } catch (error: any) {
      console.log('[Cadastro Loja] Erro capturado:', error);
      console.error('Erro ao criar loja:', error);

      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Erro inesperado ao criar a loja.');
      setErrorMessage(errorMsg);
      setLoading(false);

      // Exibe alerta na tela para que o erro do Supabase fique visível
      alert(`Erro ao cadastrar loja: ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER STICKY & MOBILE DRAWER */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Oficial AJPSTORE Direta (sem depender de config no admin) */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group focus:outline-none select-none">
              <div className="w-11 h-11 sm:w-12 sm:h-12 aspect-square rounded-full overflow-hidden shrink-0 border-2 border-white/40 ring-2 sm:ring-4 ring-emerald-500/60 shadow-lg shadow-emerald-500/25 bg-white transition-all duration-300 group-hover:scale-105 flex items-center justify-center p-0.5">
                <img
                  src={AJP_OFFICIAL_LOGO_BASE64}
                  alt="AJPSTORE"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="flex flex-col text-left leading-none min-w-0">
                <div className="flex items-center tracking-tight text-lg sm:text-xl md:text-2xl font-black">
                  <span className="text-[#0062FF]">AJP</span>
                  <span className="text-[#00C853] ml-0.5">STORE</span>
                </div>
                <span className="text-[8px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-400 tracking-wider uppercase mt-1">
                  Sua Loja Online em Minutos
                </span>
              </div>
            </a>
          </div>

          {/* Links Centrais (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#recursos" className="hover:text-cyan-400 transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-cyan-400 transition-colors">Como funciona</a>
            <a href="#beneficios" className="hover:text-cyan-400 transition-colors">Benefícios</a>
            <a href="#precos" className="hover:text-cyan-400 transition-colors">Preços</a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          </nav>

          {/* Botões de Ação (Desktop) */}
          <div className="hidden sm:flex items-center gap-3">
            <a 
              href="/admin"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-all"
            >
              Entrar
            </a>
            <button
              onClick={scrollToRegistration}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Começar grátis</span>
            </button>
          </div>

          {/* Botão Menu Hamburger (Mobile) */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={scrollToRegistration}
              className="sm:hidden px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20"
            >
              Criar loja
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors focus:outline-none"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-cyan-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Menu Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/95 border-b border-slate-800 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-3 duration-200">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-200">
              <a 
                href="#recursos" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                Recursos
              </a>
              <a 
                href="#como-funciona" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                Como funciona
              </a>
              <a 
                href="#beneficios" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                Benefícios
              </a>
              <a 
                href="#precos" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                Preços
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                Dúvidas Frequentes (FAQ)
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
              <a
                href="/admin"
                className="w-full text-center py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold text-sm hover:bg-slate-700 transition-colors"
              >
                Entrar no Painel Admin
              </a>
              <button
                onClick={scrollToRegistration}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                <span>Começar grátis por 7 dias</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO PRINCIPAL & FORMULÁRIO DE CADASTRO INTEGRADO */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
        {/* Glows de Fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[380px] h-[380px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Coluna Esquerda: Proposta de Valor, Headline & Benefícios Rápidos */}
            <div className="lg:col-span-7 text-center lg:text-left">
              
              {/* Pequeno Selo */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-6 shadow-inner">
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                <span>🚀 7 DIAS GRÁTIS • SEM CARTÃO DE CRÉDITO</span>
              </div>

              {/* Título Principal Requisitado */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
                Crie sua loja online <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">em minutos</span>.
              </h1>

              {/* Subtítulo Requisitado */}
              <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
                Venda com sua própria marca, seu próprio domínio e receba diretamente pelo Mercado Pago. Tenha tudo o que precisa para vender online em uma única plataforma.
              </p>

              {/* 4 Benefícios Rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-8 text-left max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-200 font-semibold">7 dias grátis</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-200 font-semibold">Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-200 font-semibold">Sem comissão por pedido</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-200 font-semibold">Gerencie pelo celular</span>
                </div>
              </div>

              {/* CTAs do Hero */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={scrollToRegistration}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>🚀 Criar minha loja grátis</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="#como-funciona"
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm transition-all text-center flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-cyan-400" />
                  <span>▶ Ver como funciona</span>
                </a>
              </div>

              {/* Mensagem de Apoio */}
              <p className="text-xs sm:text-sm text-slate-400 mt-4 flex items-center justify-center lg:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Comece grátis por 7 dias. Planos a partir de apenas <strong>R$ 30/mês</strong>.</span>
              </p>
            </div>

            {/* Coluna Direita: FORMULÁRIO DE CADASTRO (ONBOARDING) */}
            <div className="lg:col-span-5" id="cadastro" ref={formRef}>
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-950/60">
                <div className="bg-slate-900/95 rounded-[22px] p-6 sm:p-7 backdrop-blur-xl">
                  
                  {/* Cabeçalho do Formulário */}
                  <div className="mb-5 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2.5">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Comece seu Teste Grátis
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Preencha os dados e sua loja será gerada em segundos.
                    </p>
                  </div>

                  {/* Alertas */}
                  {errorMessage && (
                    <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Formulário Principal */}
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    
                    {/* Escolha do Plano */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Plano Escolhido (7 Dias Grátis)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPlan('iniciante')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedPlan === 'iniciante'
                              ? 'bg-cyan-500/15 border-cyan-400 text-white ring-1 ring-cyan-400/60 shadow-xs'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Iniciante</span>
                            <span className="text-[11px] font-black text-cyan-400 font-mono">R$ 30/mês</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Até 50 produtos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlan('escala')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedPlan === 'escala'
                              ? 'bg-emerald-500/15 border-emerald-400 text-white ring-1 ring-emerald-400/60 shadow-xs'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Escala</span>
                            <span className="text-[11px] font-black text-emerald-400 font-mono">R$ 50/mês</span>
                          </div>
                          <span className="text-[10px] text-emerald-400/90 font-medium block mt-0.5">Ilimitado</span>
                        </button>
                      </div>
                    </div>

                    {/* Campo 1: Nome Completo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Seu Nome Completo *
                      </label>
                      <input
                        ref={firstInputRef}
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      />
                    </div>

                    {/* Campo 2: E-mail */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        E-mail de Acesso *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      />
                    </div>

                    {/* Campo 3: Nome da Loja */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Nome da sua Loja / Negócio *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Doce Sonho Confeitaria"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.storeName}
                        onChange={handleStoreNameChange}
                      />
                    </div>

                    {/* Campo 4: Endereço da Loja (Slug) com Live Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Endereço da Loja (Link) *
                        </label>
                        <span className="text-[10px] text-cyan-400 font-mono">
                          {formData.slug || 'sua-loja'}.ajpstore.com.br
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs text-slate-500 font-mono select-none">
                          /loja/
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="sua-loja"
                          className="w-full pl-14 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                          value={formData.slug}
                          onChange={handleSlugChange}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Link gratuito imediato. Você poderá conectar seu domínio próprio (.com.br) depois no painel.
                      </p>
                    </div>

                    {/* Campo 5: Senha */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Senha de Acesso do Painel Admin *
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Crie sua senha de acesso"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Campo 6: WhatsApp (Opcional) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          WhatsApp da Loja
                        </label>
                        <span className="text-[10px] text-slate-500">Opcional</span>
                      </div>
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      />
                    </div>

                    {/* Botão de Cadastro */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>Criando sua loja no sistema...</span>
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4 text-slate-950" />
                            <span>🚀 Criar minha loja grátis</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Mensagens de Confiança */}
                    <div className="pt-2 space-y-1 text-center">
                      <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>🔒 Seus dados estão protegidos.</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Não é necessário cartão de crédito para começar.
                      </p>
                    </div>

                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. DEMONSTRAÇÃO VISUAL — DO CADASTRO À SUA LOJA NO AR */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 bg-slate-900/40 border-y border-slate-800/70 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>SIMPLES E DIRETO AO PONTO</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Do cadastro à sua loja no ar.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 max-w-2xl mx-auto">
              Cadastre seu negócio, adicione seus produtos e tenha uma estrutura profissional para começar a vender.
            </p>
          </div>

          {/* O Fluxo em 4 Passos Visuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
            
            {/* Passo 01 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 relative hover:border-cyan-500/40 transition-colors group">
              <div className="text-2xl font-black text-cyan-400/30 group-hover:text-cyan-400/60 transition-colors mb-2">
                01
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Cadastre seu negócio
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Escolha o nome da sua loja e crie sua conta gratuitamente em menos de 1 minuto.
              </p>
            </div>

            {/* Passo 02 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 relative hover:border-cyan-500/40 transition-colors group">
              <div className="text-2xl font-black text-cyan-400/30 group-hover:text-cyan-400/60 transition-colors mb-2">
                02
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Adicione seus produtos
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Insira fotos, descrições, preços e arquivos digitais com facilidade pelo computador ou celular.
              </p>
            </div>

            {/* Passo 03 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 relative hover:border-cyan-500/40 transition-colors group">
              <div className="text-2xl font-black text-cyan-400/30 group-hover:text-cyan-400/60 transition-colors mb-2">
                03
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Sua página fica pronta
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sua vitrine completa e landing pages automáticas entram no ar instantaneamente.
              </p>
            </div>

            {/* Passo 04 */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 relative hover:border-cyan-500/40 transition-colors group">
              <div className="text-2xl font-black text-cyan-400/30 group-hover:text-cyan-400/60 transition-colors mb-2">
                04
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Compartilhe e venda
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Divulgue seu link no Instagram, WhatsApp ou TikTok e receba diretamente pelo Mercado Pago.
              </p>
            </div>

          </div>

          {/* Chamada para Ver a Loja Modelo */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  Veja uma loja criada com a AJPSTORE
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Explore a vitrine modelo funcionando com checkout transparente Pix e Cartão.
                </p>
              </div>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 shrink-0"
            >
              <span>Ver loja</span>
              <ExternalLink className="w-4 h-4 text-cyan-400" />
            </a>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. SEÇÃO DE PROBLEMA & SOLUÇÃO */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Vender online não precisa ser complicado.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
              Você não precisa contratar programador, juntar várias ferramentas ou pagar comissão sobre cada pedido para ter uma estrutura profissional de vendas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            
            {/* Card Problema 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-xl mb-3">❌</div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Ferramentas demais
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Pare de depender de vários sistemas diferentes para catálogo, checkout e mensagens.
              </p>
            </div>

            {/* Card Problema 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-xl mb-3">❌</div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Configuração complicada
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Tenha uma estrutura simples para começar a divulgar e faturar hoje mesmo.
              </p>
            </div>

            {/* Card Problema 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-xl mb-3">❌</div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Comissões sobre vendas
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                A AJPSTORE não cobra comissão por pedido. Você fatura 100% das suas vendas.
              </p>
            </div>

            {/* Card Problema 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-xl mb-3">❌</div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Loja sem identidade
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Use sua própria marca e seu próprio domínio sem parecer um marketplace genérico.
              </p>
            </div>

          </div>

          {/* Fechamento Conclusivo */}
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/30 max-w-2xl mx-auto">
              <span className="text-sm sm:text-base font-black text-white">
                Com a AJPSTORE, você tem tudo em um só lugar.
              </span>
              <button
                onClick={scrollToRegistration}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                Começar agora →
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. SEÇÃO DE FUNCIONALIDADES / RECURSOS (BENEFÍCIOS) */}
      {/* ------------------------------------------------------------- */}
      <section id="recursos" className="py-16 sm:py-20 bg-slate-900/40 border-y border-slate-800/70 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>RECURSOS COMPLETOS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tudo o que você precisa em uma única plataforma
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3">
              Recursos pensados para converter visitantes em clientes fiéis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 01 — Checkout Mercado Pago */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Checkout Mercado Pago integrado
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  Receba pagamentos por Pix e cartão através do Mercado Pago e ofereça uma experiência simples para seus clientes.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/70">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pix com aprovação imediata</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>QR Code e Copia e Cola dinâmicos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cartão de crédito com parcelamento</span>
                </li>
              </ul>
            </div>

            {/* 02 — Landing Pages automáticas */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Landing pages para vender
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  Cada produto cadastrado pode ter uma página de vendas profissional pronta para você divulgar em anúncios ou redes sociais.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/70">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>Otimizada para carregamento ultrarrápido</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>Botão de compra direta e links amigáveis</span>
                </li>
              </ul>
            </div>

            {/* 03 — Upsell */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Aumente o valor de cada venda
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  Apresente ofertas adicionais de "compre junto" aos seus clientes no checkout e aumente o ticket médio da sua loja.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/70">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Adição de itens complementares com 1 clique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mais faturamento por pedido realizado</span>
                </li>
              </ul>
            </div>

            {/* 04 — Domínio próprio */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Sua marca, seu domínio
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  Conecte seu próprio domínio (.com.br) e tenha uma presença profissional e segura na internet com SSL gratuito.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/70">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>Subdomínio gratuito [slug].ajpstore.com.br</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>Suporte a domínios personalizados</span>
                </li>
              </ul>
            </div>

            {/* 05 — Carrinho abandonado */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Recupere oportunidades perdidas
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  Tenha recursos para acompanhar e recuperar clientes que iniciaram uma compra e não finalizaram o pagamento.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/70">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>Identificação rápida de pedidos pendentes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>Contato direto para fechar a compra</span>
                </li>
              </ul>
            </div>

            {/* 06 — Notificações & Telegram */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Saiba quando uma venda acontecer
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  Receba notificações para acompanhar suas vendas e pedidos. Receba alertas automáticos pelo Telegram em tempo real.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/70">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400" />
                  <span>Alertas instantâneos no Telegram</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400" />
                  <span>Acompanhamento em tempo real</span>
                </li>
              </ul>
            </div>

            {/* 07 — Gestão pelo Celular */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Gerencie sua loja de qualquer lugar
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                    Tenha acesso ao painel pelo celular para acompanhar pedidos, cadastrar novos produtos e administrar seu negócio onde você estiver.
                  </p>
                </div>
              </div>
              <button
                onClick={scrollToRegistration}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs sm:text-sm whitespace-nowrap transition-all shrink-0 cursor-pointer"
              >
                Testar no celular →
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. SEÇÃO "POR QUE A AJPSTORE?" */}
      {/* ------------------------------------------------------------- */}
      <section id="beneficios" className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>DIFERENCIAIS REAIS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Por que escolher a AJPSTORE para o seu negócio?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3">
              Tenha sua própria estrutura de vendas, sua marca e controle sobre seu negócio, sem depender de marketplaces.
            </p>
          </div>

          {/* Destaque Principal Solicitado */}
          <div className="mb-10 p-7 sm:p-9 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/30 text-center max-w-4xl mx-auto shadow-xl shadow-cyan-950/30">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
              Você vende. Você fica com o seu faturamento.
            </h3>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed mb-4">
              A AJPSTORE não cobra comissão sobre os pedidos realizados na sua loja. Você paga uma mensalidade fixa pela plataforma.
            </p>
            <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-3 max-w-xl mx-auto">
              A AJPSTORE não cobra comissão sobre suas vendas. As tarifas eventualmente aplicadas pelo meio de pagamento são cobradas pelo próprio Mercado Pago.
            </p>
          </div>

          {/* 4 Cards Estratégicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-2xl mb-3">💰</div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Sem comissão da AJPSTORE por pedido
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Seu faturamento não é reduzido por uma comissão da plataforma.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-2xl mb-3">🌐</div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Sua própria marca
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Use sua identidade visual, seu logotipo e seu domínio próprio.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-2xl mb-3">📱</div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Controle pelo celular
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Gerencie sua operação de onde estiver com interface adaptada.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-2xl mb-3">⚡</div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Comece rapidamente
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Crie sua estrutura e comece a configurar sua loja em poucos minutos.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. SEÇÃO "COMO FUNCIONA" */}
      {/* ------------------------------------------------------------- */}
      <section id="como-funciona" className="py-16 sm:py-20 bg-slate-900/40 border-y border-slate-800/70 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Comece a vender em 3 passos
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              Sem necessidade de conhecimentos técnicos ou códigos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            
            {/* PASSO 01 */}
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-lg flex items-center justify-center mb-4 border border-cyan-500/20">
                1
              </div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">PASSO 01</span>
              <h3 className="text-lg font-bold text-white mb-2">Crie sua conta</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Preencha seus dados e crie sua loja gratuitamente.
              </p>
            </div>

            {/* PASSO 02 */}
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-lg flex items-center justify-center mb-4 border border-cyan-500/20">
                2
              </div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">PASSO 02</span>
              <h3 className="text-lg font-bold text-white mb-2">Configure sua loja</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Adicione produtos, imagens, preços e informações do seu negócio.
              </p>
            </div>

            {/* PASSO 03 */}
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-lg flex items-center justify-center mb-4 border border-cyan-500/20">
                3
              </div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">PASSO 03</span>
              <h3 className="text-lg font-bold text-white mb-2">Publique e venda</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Compartilhe sua loja ou conecte seu próprio domínio.
              </p>
            </div>

          </div>

          <div className="text-center">
            <button
              onClick={scrollToRegistration}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              <span>🚀 Quero começar grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. SEÇÃO DE PROVA VISUAL (O QUE VOCÊ PODE CRIAR) */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Veja o que você pode criar com a AJPSTORE
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3">
              Telas reais e responsivas projetadas para a melhor experiência de compra do seu cliente.
            </p>
          </div>

          {/* Cards de Demonstração de Telas Reais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Demonstração 1: Vitrine de Produtos */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden group">
              <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  Vitrine da Loja
                </span>
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded">
                  Desktop & Mobile
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div className="h-32 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-500 text-xs border border-slate-700/60 p-3 text-center">
                  Grade de produtos com fotos em alta resolução, busca e categorias inteligentes.
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">Loja Personalizada</span>
                  <span className="text-emerald-400 font-bold">100% Responsiva</span>
                </div>
              </div>
            </div>

            {/* Demonstração 2: Checkout Transparente Mercado Pago */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden group">
              <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  Checkout Transparente
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded">
                  Mercado Pago
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div className="h-32 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-500 text-xs border border-slate-700/60 p-3 text-center">
                  Pix Copia e Cola imediato com QR Code, cartão de crédito e recibo instantâneo.
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">Pagamento Seguro</span>
                  <span className="text-cyan-400 font-bold">Sem atrito</span>
                </div>
              </div>
            </div>

            {/* Demonstração 3: Painel Administrativo */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden group">
              <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                  Painel de Controle
                </span>
                <span className="text-[10px] text-purple-400 font-mono bg-purple-950/60 px-2 py-0.5 rounded">
                  Gestão Fácil
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div className="h-32 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-500 text-xs border border-slate-700/60 p-3 text-center">
                  Acompanhamento de pedidos, controle de faturamento, cupons e estoque no seu celular.
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">Gestão Completa</span>
                  <span className="text-purple-400 font-bold">Prático</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 9. SEÇÃO DE PREÇOS E BENEFÍCIOS (PLANO INICIANTE & PLANO ESCALA) */}
      {/* ------------------------------------------------------------- */}
      <section id="precos" className="py-16 sm:py-24 bg-slate-900/40 border-y border-slate-800/70 relative">
        {/* Glows de fundo decorativos */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3 shadow-xs">
              <Star className="w-3.5 h-3.5 text-cyan-400" />
              <span>⭐ PLANOS TRANSPARENTES & SEM TAXAS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Escolha o plano ideal para a sua loja
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
              Comece com 7 dias de teste grátis em qualquer plano. Sem taxas sobre as suas vendas (0% de comissão) e sem cartão de crédito para testar.
            </p>
          </div>

          {/* Grid de Preços: 2 Planos Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            
            {/* PLANO 1: INICIANTE (R$ 30/mês) */}
            <div className="relative rounded-3xl p-1 bg-gradient-to-b from-slate-700/80 via-slate-800 to-slate-900 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/40 flex flex-col justify-between group">
              <div className="bg-slate-950 rounded-[22px] p-6 sm:p-9 flex flex-col justify-between h-full">
                
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-block px-3.5 py-1 rounded-full bg-slate-800/90 text-slate-300 text-xs font-black tracking-wider uppercase border border-slate-700">
                      Plano Iniciante
                    </span>
                    <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/50 px-3 py-1 rounded-md border border-cyan-500/20">
                      Ideal para Começar
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
                    Perfeito para quem está iniciando seu catálogo ou validando suas primeiras vendas online com estrutura profissional.
                  </p>

                  {/* Preço */}
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-slate-400 text-lg font-bold">R$</span>
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">30,00</span>
                    <span className="text-slate-400 text-xs sm:text-sm font-semibold">/ mês</span>
                  </div>

                  <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <span>🎁 7 Dias de Teste Grátis</span>
                  </div>

                  {/* Limite de Produtos */}
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/25 mb-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-white block">Limite de até 50 produtos</span>
                      <span className="text-[11px] text-slate-400">Catálogo ágil, focado em conversão direta</span>
                    </div>
                  </div>

                  {/* Lista de Benefícios Inclusos */}
                  <div className="space-y-3.5 text-left mb-8 text-xs sm:text-sm text-slate-200 border-t border-slate-800/80 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Suporte a Produtos Físicos e Digitais</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Landing Page Automática</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Personalização completa da página (cores e logo)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Gerenciador de Pedidos integrado</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Sem taxas sobre as vendas (0% de comissão)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Uso de Domínio Próprio</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div>
                  <button
                    onClick={() => handleChoosePlan('iniciante')}
                    className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wide border border-slate-700 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Começar no Plano Iniciante</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <p className="text-[11px] text-slate-400 text-center mt-3">
                    Sem cartão de crédito • 7 dias grátis
                  </p>
                </div>

              </div>
            </div>

            {/* PLANO 2: ESCALA (R$ 50/mês) - DESTAQUE */}
            <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-emerald-500 shadow-2xl shadow-cyan-950/70 flex flex-col justify-between">
              
              {/* Badge Flutuante no Topo */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>MAIS POPULAR • PRODUTOS ILIMITADOS</span>
                </span>
              </div>

              <div className="bg-slate-950 rounded-[22px] p-6 sm:p-9 flex flex-col justify-between h-full pt-8 sm:pt-10">
                
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-block px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-black tracking-wider uppercase border border-cyan-500/30">
                      Plano Escala
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-3 py-1 rounded-md border border-emerald-500/20">
                      Potência Total
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
                    Para lojas em expansão que precisam de escala máxima, catálogo sem limites e alta performance de vendas.
                  </p>

                  {/* Preço */}
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-slate-400 text-lg font-bold">R$</span>
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">50,00</span>
                    <span className="text-slate-400 text-xs sm:text-sm font-semibold">/ mês</span>
                  </div>

                  <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <span>🎁 7 Dias de Acesso Total Grátis</span>
                  </div>

                  {/* Limite de Produtos: Ilimitados */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 mb-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-white block">Produtos Ilimitados</span>
                      <span className="text-[11px] text-emerald-400/90 font-medium">Cadastre quantos produtos e variações desejar</span>
                    </div>
                  </div>

                  {/* Lista de Benefícios Inclusos */}
                  <div className="space-y-3.5 text-left mb-8 text-xs sm:text-sm text-slate-200 border-t border-slate-800/80 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-white">Suporte a Produtos Físicos e Digitais</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-white">Landing Page Automática</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-white">Personalização completa da página (cores e logo)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-white">Gerenciador de Pedidos integrado</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-white">Sem taxas sobre as vendas (0% de comissão)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-white">Uso de Domínio Próprio</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div>
                  <button
                    onClick={() => handleChoosePlan('escala')}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>🚀 Começar no Plano Escala</span>
                  </button>

                  <p className="text-[11px] text-slate-400 text-center mt-3">
                    Sem cartão de crédito • 7 dias de acesso total
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Rodapé informativo */}
          <div className="mt-12 text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs sm:text-sm text-slate-400">
              A AJPSTORE não cobra comissão sobre suas vendas. As tarifas eventualmente aplicadas pelo meio de pagamento são cobradas diretamente pelo próprio Mercado Pago.
            </p>
            <p className="text-[11px] text-emerald-400/90 font-medium">
              ✓ Migre de plano a qualquer momento diretamente pelo seu painel administrativo.
            </p>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 11. SEÇÃO DE PERGUNTAS FREQUENTES (FAQ) */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-16 sm:py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Tudo o que você precisa saber antes de começar o seu teste gratuito de 7 dias.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              {
                q: "Preciso informar cartão de crédito para começar os 7 dias grátis?",
                a: "Não. Você não precisa cadastrar cartão de crédito para iniciar o teste gratuito. Basta criar sua conta e configurar sua loja."
              },
              {
                q: "A AJPSTORE cobra comissão sobre minhas vendas?",
                a: "Não. A AJPSTORE não cobra comissão por pedido. Você paga apenas a mensalidade da plataforma. As tarifas eventualmente aplicadas pelo meio de pagamento são cobradas pelo próprio Mercado Pago."
              },
              {
                q: "Posso usar meu próprio domínio?",
                a: "Sim. A AJPSTORE permite conectar seu próprio domínio à sua loja."
              },
              {
                q: "Consigo gerenciar minha loja pelo celular?",
                a: "Sim. O painel pode ser acessado pelo celular para você administrar sua loja e acompanhar seu negócio."
              },
              {
                q: "Como recebo o dinheiro das vendas?",
                a: "Os pagamentos são processados pelo Mercado Pago. O dinheiro segue as regras e prazos definidos pelo próprio Mercado Pago."
              },
              {
                q: "Preciso saber programação?",
                a: "Não. A AJPSTORE foi desenvolvida para que você possa criar e administrar sua loja sem precisar programar."
              },
              {
                q: "Quanto custa depois dos 7 dias grátis?",
                a: "Após os 7 dias grátis, você pode escolher o Plano Iniciante por R$ 30,00/mês (até 50 produtos) ou o Plano Escala por R$ 50,00/mês (produtos ilimitados). Ambos incluem todos os recursos e 0% de comissão sobre suas vendas."
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${openFaqIndex === idx ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 12. CTA FINAL DE CONVERSÃO */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Sua loja pode estar no ar hoje.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
            Comece gratuitamente, teste a AJPSTORE por 7 dias e descubra como é ter sua própria estrutura de vendas online.
          </p>
          <button
            onClick={scrollToRegistration}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>🚀 Criar minha loja grátis</span>
          </button>
          <p className="text-xs text-slate-400 mt-4">
            7 dias grátis • Sem cartão de crédito • R$ 50/mês depois
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 13. FOOTER OFICIAL */}
      {/* ------------------------------------------------------------- */}
      <footer className="py-10 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-900">
            
            <div className="flex flex-col items-center md:items-start gap-2">
              <a href="/" className="flex items-center gap-2.5 group select-none">
                <div className="w-8 h-8 sm:w-9 sm:h-9 aspect-square rounded-full overflow-hidden shrink-0 border border-white/40 ring-2 ring-emerald-500/60 shadow-md bg-white flex items-center justify-center p-0.5">
                  <img
                    src={AJP_OFFICIAL_LOGO_BASE64}
                    alt="AJPSTORE"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
                <div className="flex items-center tracking-tight text-base sm:text-lg font-black">
                  <span className="text-[#0062FF]">AJP</span>
                  <span className="text-[#00C853] ml-0.5">STORE</span>
                </div>
              </a>
              <p className="text-[11px] text-slate-400">
                Plataforma de lojas virtuais e páginas de vendas.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 font-medium text-xs">
              <a href="/" className="hover:text-cyan-400 transition-colors">Início</a>
              <a href="#recursos" className="hover:text-cyan-400 transition-colors">Recursos</a>
              <a href="#precos" className="hover:text-cyan-400 transition-colors">Preços</a>
              <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
              <a href="/admin" className="hover:text-cyan-400 transition-colors">Entrar</a>
              <button onClick={scrollToRegistration} className="hover:text-cyan-400 transition-colors cursor-pointer">Criar loja</button>
            </div>

          </div>

          <div className="pt-6 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} AJPSTORE. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 14. CTA FLUTUANTE NO MOBILE (FIXO E ELEGANTE) */}
      {/* ------------------------------------------------------------- */}
      {showFloatingCta && (
        <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-2 rounded-2xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl shadow-2xl shadow-cyan-950/80">
            <button
              onClick={scrollToRegistration}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Rocket className="w-4 h-4" />
              <span>🚀 Criar minha loja grátis</span>
              <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded font-bold">7 dias</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketingLandingPage;
