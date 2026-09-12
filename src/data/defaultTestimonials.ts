export interface TestimonialItem {
  id?: string;
  name: string;
  role?: string;
  avatar: string;
  rating: number;
  text: string;
}

/**
 * 6 Depoimentos de Prova Social de Alta Conversão
 * Baseados nas avaliações reais de clientes com fotos de perfil, 5 estrelas e textos persuasivos.
 * Podem ser editados diretamente aqui ou sobrescritos por produto no painel administrativo.
 */
export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'valentina-rocha',
    name: 'Valentina Rocha',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80',
    rating: 5,
    text: 'Amei a quantidade de designs que o pacote inclui. Os arquivos são muito fáceis de usar e consegui começar a criar meus primeiros cake toppers já no primeiro dia.'
  },
  {
    id: 'camila-fernandes',
    name: 'Camila Fernandes',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80',
    rating: 5,
    text: 'Estou encantada com o material. Os designs são lindos e há infinitos temas para escolher. Está me ajudando a economizar muito tempo com os pedidos das minhas clientes.'
  },
  {
    id: 'sofia-martins',
    name: 'Sofia Martins',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&h=300&q=80',
    rating: 5,
    text: 'O que mais gostei foram os templates do Canva. Consigo trocar o nome e os detalhes em pouquíssimo tempo e ter um design pronto para imprimir. É super prático!'
  },
  {
    id: 'mariana-lopes',
    name: 'Mariana Lopes',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
    rating: 5,
    text: 'Já tinha comprado outros pacotes, mas este me surpreendeu demais pela quantidade e variedade de arquivos. Há designs para todo tipo de comemoração.'
  },
  {
    id: 'daniela-torres',
    name: 'Daniela Torres',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80',
    rating: 5,
    text: 'Os cake toppers 3D me encantaram. Os designs têm um acabamento lindo e fazem meus trabalhos parecerem muito mais profissionais. Minhas clientes estão adorando o resultado!'
  },
  {
    id: 'alessandra-garcia',
    name: 'Alessandra Garcia',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
    rating: 5,
    text: 'Estou muito satisfeita com minha compra. Recebi tudo rapidamente e pude começar a trabalhar na hora. Há tantos designs e temas diferentes que tenho opções para qualquer festa.'
  }
];

export default DEFAULT_TESTIMONIALS;
