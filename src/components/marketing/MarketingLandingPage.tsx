import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Star, 
  Clock, 
  Globe, 
  CreditCard, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  MessageCircle, 
  AlertCircle, 
  Check, 
  HelpCircle,
  ShoppingBag,
  TrendingUp,
  Percent,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from '../../lib/router';
import { cloneStoreTemplate } from '../../services/storeCloneService';
import { slugify } from '../../utils/slug';
import { SoumbolinhoLogo } from '../common/SoumbolinhoLogo';

export const MarketingLandingPage: React.FC = () => {
  const navigate = useNavigate();

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

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
    const el = document.getElementById('cadastro');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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
      // 1. Verifica se já existe uma loja com este slug no Supabase
      const { data: existingStore, error: checkError } = await supabase
        .from('stores')
        .select('id, slug, name')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Erro ao checar duplicidade de slug:', checkError);
      }

      if (existingStore) {
        throw new Error(`O endereço "ajpstore.com.br/loja/${cleanSlug}" já está sendo usado por outro lojista. Por favor, escolha outro nome para sua loja.`);
      }

      // 2. Consultar a loja matriz no Supabase (slug === 'ajpstore')
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
      const resolvedLogoUrl = matrizStore?.logo_url || matrizTheme?.logo_url || null;
      const resolvedBannerUrl = matrizStore?.banner_url || matrizTheme?.banner_url || null;
      const resolvedBannerDesktop = matrizStore?.banner_desktop || null;
      const resolvedBannerMobile = matrizStore?.banner_mobile || null;
      const resolvedBannersConfig = matrizStore?.banners_config || matrizTheme?.banners_config || null;
      const resolvedButtonsConfig = matrizStore?.buttons_config || matrizTheme?.buttons_config || null;
      const resolvedBenefitCards = matrizStore?.benefit_cards || matrizTheme?.benefit_cards || null;

      // 3. Monta payload resiliente para inserção na tabela stores copiando configurações da matriz AJPSTORE
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newStoreId = `store_${cleanSlug}`;

      const storePayload: any = {
        id: newStoreId,
        name: formData.storeName.trim(),
        store_name: formData.storeName.trim(),
        slug: cleanSlug,
        client_name: formData.clientName.trim(),
        owner_name: formData.clientName.trim(),
        client_email: formData.clientEmail.toLowerCase().trim(),
        owner_email: formData.clientEmail.toLowerCase().trim(),
        owner_phone: formData.clientPhone.trim() || 'WhatsApp não informado',
        whatsapp_number: formData.clientPhone.trim() || '5511999999999',
        whatsapp_display: formData.clientPhone.trim() || '(11) 99999-9999',
        admin_password: formData.password.trim(),
        // Status do Trial de 7 Dias
        status: 'trial',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        expires_at: trialEndsAt,
        monthly_fee: 50.00,
        is_active: true,
        is_matriz: false,
        domain_status: 'ativo',
        custom_domain: `${cleanSlug}.ajpstore.com.br`,
        slogan: 'Sua Loja Virtual Oficial',
        working_hours: 'Segunda a Sábado, das 09h às 18h',
        address: 'Atendimento Online e Entregas',
        // Configurações exatas copiadas da Matriz AJPSTORE:
        logo_url: resolvedLogoUrl,
        banner_url: resolvedBannerUrl,
        banner_desktop: resolvedBannerDesktop,
        banner_mobile: resolvedBannerMobile,
        banners_config: resolvedBannersConfig,
        buttons_config: resolvedButtonsConfig,
        benefit_cards: resolvedBenefitCards,
        layout_style: resolvedLayoutStyle,
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        color_palette: resolvedColorPalette,
        theme_settings: {
          ...(matrizTheme || {}),
          primary_color: resolvedPrimaryColor,
          secondary_color: resolvedSecondaryColor,
          color_palette: resolvedColorPalette,
          theme_layout: resolvedLayoutStyle,
          layout_style: resolvedLayoutStyle,
          buttons_config: resolvedButtonsConfig,
          banners_config: resolvedBannersConfig,
          benefit_cards: resolvedBenefitCards
        },
        created_at: now.toISOString(),
        criado_em: now.toISOString(),
        updated_at: now.toISOString()
      };

      // 4. Inserção adaptativa para acomodar diferenças de esquema caso existam
      let currentPayload = { ...storePayload };
      let inserted = null;

      for (let attempt = 0; attempt < 8; attempt++) {
        const res = await supabase
          .from('stores')
          .insert([currentPayload])
          .select()
          .single();

        if (!res.error) {
          inserted = res.data;
          break;
        }

        console.warn(`Tentativa ${attempt + 1} de criação da loja:`, res.error.message);
        const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1]) {
          delete currentPayload[colMatch[1]];
          continue;
        }

        throw new Error(res.error.message);
      }

      setSuccessMessage('🎉 Loja criada com sucesso! Seus 7 dias grátis foram ativados. Preparando seu painel...');

      // 5. Autenticação imediata na sessão para que o lojista caia logado no painel sem atrito
      try {
        sessionStorage.setItem('soumbolinho_admin_auth_session', 'true');
        sessionStorage.setItem('current_store_slug', cleanSlug);
        sessionStorage.setItem('last_created_store_id', newStoreId);
      } catch (err) {
        console.warn('Erro ao salvar sessão local:', err);
      }

      // 6. Clona produtos, categorias e banners da matriz AJPSTORE
      try {
        await cloneStoreTemplate(matrizStore?.id || 'ajpstore', newStoreId, formData.storeName.trim());
      } catch (cloneErr) {
        console.warn('Aviso de clonagem da matriz AJPSTORE:', cloneErr);
      }

      // 6. Redirecionamento instantâneo para o painel administrativo da nova loja (ex: /[slug]/admin)
      setTimeout(() => {
        navigate(`/${cleanSlug}/admin`);
      }, 1200);

    } catch (err: any) {
      console.error('Erro ao criar loja:', err);
      setErrorMessage(err?.message || 'Erro inesperado ao criar a loja. Tente novamente ou use outro endereço.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. BARRA DE NAVEGAÇÃO SUPERIOR */}
      {/* ------------------------------------------------------------- */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Oficial AJPSTORE */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group">
              <SoumbolinhoLogo variant="light" size="lg" />
            </a>
          </div>

          {/* Links Centrais (Desktop) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#beneficios" className="hover:text-cyan-400 transition-colors">Benefícios</a>
            <a href="#recursos" className="hover:text-cyan-400 transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-cyan-400 transition-colors">Planos (R$ 50/mês)</a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">Dúvidas Frequentes</a>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3">
            <a 
              href="/admin"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-all"
            >
              Já sou Lojista
            </a>
            <button
              onClick={scrollToRegistration}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Testar 7 Dias Grátis</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION — A PRIMEIRA IMPRESSÃO DE ALTO IMPACTO */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Efeitos de Luz de Fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Coluna Esquerda: Argumentos de Venda & Headline */}
            <div className="lg:col-span-7 text-center lg:text-left">
              
              {/* Badge de Oferta */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-6 shadow-inner animate-pulse">
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                <span>OFERTA EXCLUSIVA — 7 DIAS GRÁTIS</span>
              </div>

              {/* Título Principal Requisitado */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
                AJPSTORE — Crie seu sistema para seu negócio em <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">minutos</span>.
              </h1>

              {/* Subtítulo Requisitado */}
              <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
                Venda online do seu jeito, com sua marca e sua estrutura própria. <strong className="text-white font-semibold">Sem cobrança por pedido pela plataforma</strong>.
              </p>

              {/* Gatilhos de Confiança & Micro-benefícios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left max-w-xl mx-auto lg:mx-0">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">Sem taxa por pedido</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">Ativação em 2 min</span>
                </div>
              </div>

              {/* CTA do Hero */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={scrollToRegistration}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Criar minha loja grátis por 7 dias</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="/"
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-sm transition-all text-center"
                >
                  Ver Loja Modelo
                </a>
              </div>

              <p className="text-xs text-slate-500 mt-4 flex items-center justify-center lg:justify-start gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Não precisa de cartão de crédito para testar. Acesso completo liberado na hora.</span>
              </p>
            </div>

            {/* Coluna Direita: FORMULÁRIO DE CADASTRO INTEGRADO (ONBOARDING) */}
            <div className="lg:col-span-5" id="cadastro">
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-950/50">
                <div className="bg-slate-900/95 rounded-[22px] p-6 sm:p-8 backdrop-blur-xl">
                  
                  {/* Cabeçalho do Formulário */}
                  <div className="mb-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      Comece seu Teste Grátis
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Preencha os dados abaixo e seu painel será gerado em segundos.
                    </p>
                  </div>

                  {/* Alertas de Notificação */}
                  {errorMessage && (
                    <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Formulário Principal */}
                  <form onSubmit={handleRegister} className="space-y-4">
                    
                    {/* Campo 1: Nome Completo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Seu Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      />
                    </div>

                    {/* Campo 2: E-mail de Acesso */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        E-mail de Acesso *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      />
                    </div>

                    {/* Campo 3: Nome da Loja / Negócio */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Nome da sua Loja / Negócio *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Doce Sonho Confeitaria"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.storeName}
                        onChange={handleStoreNameChange}
                      />
                    </div>

                    {/* Campo 4: Endereço da Loja (Slug) com Live Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Endereço da Loja (Link) *
                        </label>
                        <span className="text-[10px] text-cyan-400 font-mono">
                          ajpstore.com.br/loja/{formData.slug || 'sua-loja'}
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs text-slate-500 font-mono select-none">
                          /loja/
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="sua-loja"
                          className="w-full pl-16 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                          value={formData.slug}
                          onChange={handleSlugChange}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Seus clientes acessarão por este link (ou você poderá conectar seu domínio próprio .com.br depois).
                      </p>
                    </div>

                    {/* Campo 5: Senha de Acesso Administrativo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Senha de Acesso do Painel Admin *
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Crie uma senha forte"
                          className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Campo 6 (Opcional): WhatsApp com DDD */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>WhatsApp da Loja (Opcional)</span>
                        <span className="text-[10px] text-slate-500 font-normal">Para pedidos rápidos</span>
                      </label>
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      />
                    </div>

                    {/* Botão de Envio com Efeito de Destaque */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>Criando sua loja no sistema...</span>
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4 text-slate-950" />
                            <span>Ativar Meus 7 Dias Grátis</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Selos de Garantia */}
                    <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-cyan-400" />
                        100% Seguro
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Sem Cartão Agora
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        Acesso Imediato
                      </span>
                    </div>

                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEÇÃO DE BENEFÍCIOS (POR QUE A AJPSTORE?) */}
      {/* ------------------------------------------------------------- */}
      <section id="beneficios" className="py-20 bg-slate-900/50 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-4">
              <Star className="w-3.5 h-3.5 text-cyan-400" />
              <span>VANTAGENS EXCLUSIVAS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Por que escolher a AJPSTORE para o seu negócio?
            </h2>
            <p className="text-slate-400 text-base mt-4">
              Desenvolvida especialmente para que você tenha controle absoluto das suas vendas, sem intermediários mordendo o seu faturamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Benefício 1: Sem Taxa por Pedido */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Percent className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Sem Taxa por Pedido
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Você fatura <strong className="text-white">100% das suas vendas</strong>. Diferente de outros marketplaces, a AJPSTORE não cobra comissão sobre o que você vende.
              </p>
            </div>

            {/* Benefício 2: Sua Própria Marca */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Sua Própria Marca
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Conecte seu próprio domínio (.com.br), coloque seu logotipo, personalize cores, banner e identidade visual sem marcas d'água invasivas.
              </p>
            </div>

            {/* Benefício 3: Estrutura Completa */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Estrutura Completa
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Landing pages automáticas para cada produto, checkout transparente via Mercado Pago (Pix e Cartão), cupons e controle de estoque.
              </p>
            </div>

            {/* Benefício 4: Suporte 24 Horas */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Suporte 24 Horas
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ajuda de verdade em qualquer etapa da sua operação. Atendimento com especialistas para tirar sua loja do papel sem dor de cabeça.
              </p>
            </div>

          </div>

          {/* Destaque Adicional de Recuperação de Carrinho via Telegram */}
          <div className="mt-10 p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                <Send className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white">
                  Notificações & Recuperação de Carrinho via Telegram
                </h4>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Seja avisado instantaneamente no seu celular quando um cliente fizer um pedido ou abandonar o carrinho, permitindo contato imediato para fechar a venda.
                </p>
              </div>
            </div>
            <button
              onClick={scrollToRegistration}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-lg shadow-blue-500/20 cursor-pointer shrink-0"
            >
              Testar Gratuitamente
            </button>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. SEÇÃO DE RECURSOS (TUDO INCLUÍDO) */}
      {/* ------------------------------------------------------------- */}
      <section id="recursos" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Tudo o que você precisa em uma única plataforma
            </h2>
            <p className="text-slate-400 text-base mt-4">
              Elimine a necessidade de contratar múltiplos softwares, plugins e integrações complexas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Recurso 1 */}
            <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 font-bold">
                01
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Checkout Mercado Pago Integrado</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Receba pagamentos via Pix com aprovação imediata e cartão de crédito parcelado. O dinheiro vai direto para a sua conta.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pix com QR Code copia e cola dinâmico</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cartão de crédito em até 12x</span>
                </li>
              </ul>
            </div>

            {/* Recurso 2 */}
            <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 font-bold">
                02
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Landing Pages de Alta Conversão</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Cada produto cadastrado ganha automaticamente uma página exclusiva, rápida e otimizada para campanhas no Instagram, TikTok e Google.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fotos de alta resolução e galeria</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>Botão de compra direta e links amigáveis</span>
                </li>
              </ul>
            </div>

            {/* Recurso 3 */}
            <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 font-bold">
                03
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Gestão de Pedidos & Cupons</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Acompanhe o faturamento em tempo real, crie cupons de desconto por porcentagem ou valor fixo e gerencie o estoque com facilidade.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dashboard com métricas e faturamento</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Controle de cupons e datas de validade</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. SEÇÃO DE PREÇO IRRECUSÁVEL (PLANOS) */}
      {/* ------------------------------------------------------------- */}
      <section id="planos" className="py-20 bg-slate-900/40 border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>PREÇO SIMPLES E JUSTO</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Apenas R$ 50,00 por mês. Sem surpresas.
            </h2>
            <p className="text-slate-400 text-base mt-4">
              Você começa testando tudo na prática por 7 dias grátis. Se gostar, continua por uma mensalidade fixa e sem comissões.
            </p>
          </div>

          {/* Cartão de Preço Principal */}
          <div className="max-w-lg mx-auto">
            <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 shadow-2xl shadow-cyan-950/80">
              <div className="bg-slate-950 rounded-[22px] p-8 sm:p-10 text-center">
                
                <span className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-black uppercase tracking-wider mb-4 border border-cyan-500/20">
                  Plano Pro Completo
                </span>

                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-slate-400 text-lg font-bold">R$</span>
                  <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">50,00</span>
                  <span className="text-slate-400 text-sm font-semibold">/ mês</span>
                </div>

                <p className="text-xs text-emerald-400 font-bold mb-8">
                  🎁 7 Dias de Acesso Total Gratuito para Testar
                </p>

                {/* Lista de Inclusões */}
                <div className="space-y-3.5 text-left mb-8 text-sm text-slate-300 border-y border-slate-800/80 py-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span><strong>Zero taxa</strong> sobre seus pedidos (100% de lucro seu)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Conexão de <strong>domínio próprio</strong> (.com.br)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Checkout transparente via <strong>Mercado Pago</strong> (Pix e Cartão)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Recuperação de carrinho & alertas no <strong>Telegram</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Landing Pages exclusivas para cada produto</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Produtos e fotos ilimitados</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Suporte humanizado no WhatsApp</span>
                  </div>
                </div>

                {/* Botão de Assinatura / Teste */}
                <button
                  onClick={scrollToRegistration}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Quero Testar 7 Dias Grátis</span>
                </button>

                <p className="text-[11px] text-slate-500 mt-4">
                  Cancele quando quiser diretamente no painel. Sem contratos de fidelidade.
                </p>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. PERGUNTAS FREQUENTES (FAQ) */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Tudo o que você precisa saber antes de começar o seu teste grátis.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Preciso informar cartão de crédito para ativar os 7 dias grátis?",
                a: "Não! Você não precisa cadastrar nenhum cartão de crédito para iniciar. Basta preencher o formulário com o nome da sua loja e seu e-mail para ter acesso imediato ao painel administrativo."
              },
              {
                q: "A plataforma cobra comissão sobre as minhas vendas?",
                a: "Não cobramos absolutamente nenhuma taxa ou comissão por venda. Você fatura 100% do valor dos seus produtos. O único custo após o período de teste é a mensalidade fixa de R$ 50,00."
              },
              {
                q: "Posso usar meu próprio domínio (ex: www.minhaloja.com.br)?",
                a: "Sim! Dentro do seu painel administrativo você tem a opção de apontar seu domínio personalizado gratuitamente, com certificado de segurança SSL incluso."
              },
              {
                q: "Como recebo o dinheiro das vendas realizadas pelo site?",
                a: "O pagamento é processado diretamente pelo Mercado Pago. O valor cai diretamente na sua própria conta do Mercado Pago via Pix instantâneo ou Cartão de Crédito."
              },
              {
                q: "Consigo gerenciar a loja pelo celular?",
                a: "Com certeza! Tanto a vitrine de produtos quanto o painel administrativo da AJPSTORE são 100% responsivos e funcionam perfeitamente no navegador do seu smartphone."
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openFaqIndex === idx ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. CTA FINAL DE CONVERSÃO */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 bg-gradient-to-b from-slate-950 to-slate-900 border-t border-slate-800 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Pronto para transformar o seu negócio online?
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
            Crie sua loja em menos de 2 minutos e aproveite 7 dias de acesso total gratuito.
          </p>
          <button
            onClick={scrollToRegistration}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Criar Minha Loja Grátis por 7 Dias</span>
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. RODAPÉ OFICIAL */}
      {/* ------------------------------------------------------------- */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">AJPSTORE</span>
            <span>— Plataforma de Lojas Virtuais & Catálogo Digital</span>
          </div>
          <div>
            © {new Date().getFullYear()} AJPSTORE. Todos os direitos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default MarketingLandingPage;
