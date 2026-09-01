import { BannerSlide } from '../types';

export const INITIAL_BANNERS: BannerSlide[] = [
  {
    id: 'banner-1',
    type: 'text',
    tag: '🎀 Ateliê Encantando Festa',
    title: 'Personalizamos em Qualquer Tema para sua Festa!',
    subtitle: 'Kits Só um Bolinho, topos de bolo shaker, caixinhas milk, centros de mesa e lembrancinhas feitas à mão.',
    highlightText: '✨ Enviamos a prévia da arte para aprovação no WhatsApp antes de produzir! 💕',
    themeColor: 'blue',
    order: 1,
    isActive: true,
  },
  {
    id: 'banner-2',
    type: 'text',
    tag: '📅 Prazo & Produção Artesanal',
    title: 'Faça seu Pedido com Antecedência!',
    subtitle: 'Trabalhamos com agendamento prévio para garantir acabamento perfeito e entrega pontual para a sua comemoração.',
    highlightText: '🚚 Entregas em domicílio no Rio de Janeiro ou retirada no ateliê.',
    themeColor: 'pink',
    order: 2,
    isActive: true,
  },
  {
    id: 'banner-3',
    type: 'text',
    tag: '💬 Como Funciona o Pedido',
    title: 'Escolha os Produtos e Finalize no WhatsApp',
    subtitle: 'Adicione os itens ao carrinho, informe o nome e tema do aniversariante e gere sua comanda com um clique!',
    highlightText: '💠 Pagamento facilitado via Pix ou Cartão de Crédito.',
    themeColor: 'lilac',
    order: 3,
    isActive: true,
  }
];
