import { Product } from '../types';
import { DEFAULT_TESTIMONIALS, TestimonialItem } from '../data/defaultTestimonials';

/**
 * Extrai itens estruturados diretamente da descrição, benefícios ou copy do produto
 */
export function extractFeaturesFromProductDescription(product: Product | null): string[] {
  if (!product) return [];

  const items: string[] = [];

  // 1. Benefícios cadastrados manualmente no produto (máxima prioridade)
  const rawBenefits = product.benefits;
  if (rawBenefits) {
    if (Array.isArray(rawBenefits)) {
      rawBenefits.forEach((b) => {
        const clean = String(b || '').trim().replace(/^[-•*✓✔+✅✨📦]\s*/, '').trim();
        if (clean && clean.length >= 3 && !items.includes(clean)) items.push(clean);
      });
    } else if (typeof rawBenefits === 'string' && rawBenefits.trim()) {
      rawBenefits.split('\n').forEach((line) => {
        const clean = line.trim().replace(/^[-•*✓✔+✅✨📦]\s*/, '').trim();
        if (clean && clean.length >= 3 && !items.includes(clean)) items.push(clean);
      });
    }
  }

  // 2. Extração inteligente a partir da descrição detalhada e descrição do produto
  const fullText = [
    product.detailed_description || (product as any).detailedDescription || '',
    product.description || ''
  ].filter(Boolean).join('\n');

  if (fullText.trim()) {
    // Normalizar quebras de linha de tags HTML <br>, <p>, <li>
    const normalizedText = fullText
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '); // remove all other HTML tags

    const lines = normalizedText.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Remove marcadores de lista comuns (-, •, *, ✓, ✔, +, ✅, ✨, números como "1. ", "01 - ")
      const isBullet = /^[-•*✓✔+✅✨📦]\s+/.test(line) || /^\d+[\.\-\)]\s+/.test(line);
      const clean = line
        .replace(/^[-•*✓✔+✅✨📦]\s*/, '')
        .replace(/^\d+[\.\-\)]\s*/, '')
        .trim();

      // Ignora títulos simples de cabeçalho
      const isHeader = /^(o que est[áa] incluso|o que voc[êe] vai receber|conte[úu]do do pacote|itens inclusos|detalhes|benef[íi]cios|importante|aten[çc][ãa]o|descri[çc][ãa]o|caracter[íi]sticas):?$/i.test(clean);
      if (isHeader) continue;

      if (isBullet && clean.length >= 3 && clean.length <= 140) {
        if (!items.includes(clean)) items.push(clean);
      } else if (!isBullet && line.length >= 4 && line.length <= 100 && !line.endsWith(':') && !line.includes('http')) {
        if (!items.includes(line)) items.push(line);
      }
    }

    // Se tiver poucas linhas mas o texto for descritivo, tenta dividir por frases/pontos
    if (items.length < 2 && normalizedText.length > 30) {
      const sentences = normalizedText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim().replace(/^[-•*✓✔+✅✨📦]\s*/, ''))
        .filter(s => s.length >= 8 && s.length <= 120 && !s.includes('http') && !s.endsWith(':'));

      for (const sent of sentences) {
        const clean = sent.replace(/[.!]+$/, '').trim();
        const isHeader = /^(o que est[áa] incluso|o que voc[êe] vai receber|conte[úu]do do pacote|itens inclusos|detalhes|benef[íi]cios|importante|aten[çc][ãa]o|descri[çc][ãa]o|caracter[íi]sticas):?$/i.test(clean);
        if (!isHeader && clean.length >= 6 && !items.includes(clean)) {
          items.push(clean);
        }
      }
    }
  }

  return items;
}

/**
 * Gera automaticamente os 6 itens da seção "O que você vai encontrar neste pacote"
 * com base na descrição real do produto, benefícios ou nicho, sem que o lojista precise preencher nada manualmente.
 */
export function getAutomaticPackageItems(product: Product | null): string[] {
  if (!product) return [];

  // 1. Prioridade Máxima: Extrai itens diretamente da descrição detalhada, descrição ou benefícios do produto
  const extracted = extractFeaturesFromProductDescription(product);

  if (extracted.length > 0) {
    const items = [...extracted.slice(0, 6)];

    // Se tiver menos de 6 itens na descrição, completa de forma inteligente
    // para atingir sempre os 6 cards elegantes da seção
    if (items.length < 6) {
      const name = (product.name || '').toLowerCase();
      const category = (product.category || '').toLowerCase();
      const desc = (product.detailed_description || (product as any).detailedDescription || product.description || '').toLowerCase();
      const text = `${name} ${category} ${desc}`;

      const complements: string[] = [];

      if (text.includes('canva')) {
        complements.push('Templates 100% editáveis no Canva (versão gratuita ou Pro)');
      } else {
        complements.push('Arquivos organizados e prontos para uso imediato');
      }

      if (text.includes('svg') || text.includes('corte') || text.includes('silhouette') || text.includes('molde') || text.includes('tesoura')) {
        complements.push('Moldes com linhas de corte e vinco perfeitamente testadas');
      } else {
        complements.push('Arquivos em altíssima definição (300 DPI) para impressão perfeita');
      }

      complements.push(
        'Compatível com celular, tablet e computador',
        'Economize horas de trabalho na criação e diagramação',
        'Acesso vitalício e download imediato no seu e-mail e WhatsApp',
        'Materiais prontos para imprimir ou enviar para seus clientes'
      );

      for (const comp of complements) {
        if (items.length >= 6) break;
        if (!items.some((it) => it.toLowerCase() === comp.toLowerCase())) {
          items.push(comp);
        }
      }
    }

    return items.slice(0, 6);
  }

  // 2. Fallback inteligente baseado em categorias/nichos se nenhuma descrição foi informada
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const desc = (product.detailed_description || product.detailedDescription || product.description || '').toLowerCase();
  const text = `${name} ${category} ${desc}`;

  // 1. Topos de Bolo / Cake Toppers / Shaker / 3D
  if (
    text.includes('topo') ||
    text.includes('cake') ||
    text.includes('topper') ||
    text.includes('shaker') ||
    text.includes('bolo')
  ) {
    return [
      'Os temas infantis e comemorativos mais procurados',
      'Cake Toppers Shaker modernos e exclusivos',
      'Arquivos SVG e moldes prontos para cortar',
      'Cake Toppers 3D com acabamento profissional',
      'Templates 100% editáveis no Canva',
      'Muitos estilos para qualquer cliente',
    ];
  }

  // 2. Caixas / Caixinhas / Lembrancinhas / Milk / Pirâmide / Cone / Maletinha
  if (
    text.includes('caixa') ||
    text.includes('lembranc') ||
    text.includes('milk') ||
    text.includes('piramide') ||
    text.includes('pirâmide') ||
    text.includes('cone') ||
    text.includes('maleta') ||
    text.includes('sushi') ||
    text.includes('sacola')
  ) {
    return [
      'Moldes de caixas e lembrancinhas prontas para imprimir',
      'Linhas de corte e vinco perfeitamente alinhadas',
      'Arquivos em alta resolução (300 DPI) para corte manual ou plotter',
      'Templates 100% editáveis no Canva (versão gratuita)',
      'Fontes e elementos inclusos sem custos extras',
      'Montagem rápida e prática para facilitar sua produção',
    ];
  }

  // 3. Convites Digitais / Convite Virtual / Interativo
  if (
    text.includes('convite') ||
    text.includes('virtual') ||
    text.includes('interativo')
  ) {
    return [
      'Convites digitais e interativos com botões clicáveis',
      'Formato perfeito para envio instantâneo no WhatsApp',
      'Templates 100% editáveis no Canva (versão gratuita)',
      'Design moderno com tipografia elegante e ilustrações em alta resolução',
      'Edite nomes, datas, fotos e locais em poucos minutos',
      'Acesso vitalício para você reutilizar em diversos eventos',
    ];
  }

  // 4. Encadernação / Agendas / Planners / Cadernos / Bloquinhos / Miolos
  if (
    text.includes('agenda') ||
    text.includes('planner') ||
    text.includes('caderno') ||
    text.includes('encaderna') ||
    text.includes('bloqu') ||
    text.includes('miolo')
  ) {
    return [
      'Miolo completo e capas em altíssima resolução (300 DPI)',
      'Arquivos configurados para impressão em formato A5 e A4',
      'Gabaritos de furação e linhas de dobra para acabamento perfeito',
      'Capas e páginas 100% editáveis no Canva',
      'Economia de dias de trabalho em criação e diagramação',
      'Acesso imediato para você começar a produzir hoje mesmo',
    ];
  }

  // 5. Tags / Adesivos / Rótulos / Balas Personalizadas / Mimos
  if (
    text.includes('tag') ||
    text.includes('adesivo') ||
    text.includes('rotulo') ||
    text.includes('rótulo') ||
    text.includes('bala') ||
    text.includes('mimo')
  ) {
    return [
      'Gabaritos de tags e adesivos nos formatos mais vendidos',
      'Arquivos prontos para impressão e recorte manual ou plotter',
      'Templates 100% editáveis no Canva (versão gratuita)',
      'Cores vivas e calibradas em alta resolução (300 DPI)',
      'Vários modelos e frases prontas para fidelizar clientes',
      'Acesso vitalício com envio automático após a compra',
    ];
  }

  // 6. Kits Festas / Combos / Só um Bolinho / Pegue e Monte
  if (
    text.includes('kit') ||
    text.includes('festa') ||
    text.includes('combo') ||
    text.includes('pegue')
  ) {
    return [
      'Kit festa completo com os itens mais pedidos pelas clientes',
      'Artes harmonizadas com elementos e cores em alta resolução',
      'Arquivos prontos para impressão em folha A4 com máximo aproveitamento',
      'Templates 100% editáveis no Canva gratuito',
      'Moldes e gabaritos testados para produção prática e rápida',
      'Acesso vitalício sem cobranças futuras ou mensalidades',
    ];
  }

  // 7. Fallback Inteligente baseado no nome do produto
  const cleanTitle = product.name ? product.name.trim() : 'Material Exclusivo';
  return [
    `Arquivos completos de ${cleanTitle} em alta definição (300 DPI)`,
    'Templates 100% editáveis no Canva (versão gratuita ou Pro)',
    'Arquivos prontos para impressão direta ou corte profissional',
    'Camadas organizadas para alterar nomes, datas e fotos facilmente',
    'Economize tempo de criação e entregue pedidos com rapidez',
    'Acesso vitalício e download imediato no seu WhatsApp e E-mail',
  ];
}

/**
 * Gera automaticamente uma descrição persuasiva e profissional para o produto,
 * caso o lojista ainda não tenha preenchido uma descrição manual detalhada.
 */
export function getAutomaticProductDescription(product: Product | null): string {
  if (!product) return '';

  const manualDesc = (
    product.detailed_description ||
    product.detailedDescription ||
    product.description ||
    ''
  ).trim();

  if (manualDesc) return manualDesc;

  const productName = product.name ? product.name.trim() : 'este material digital';
  const category = product.category ? `na categoria ${product.category}` : 'de papelaria personalizada';

  return (
    `O pacote **${productName}** foi desenvolvido especialmente para artesãs, papeleiras, confeiteiras e designers que desejam entregar um trabalho impecável, profissional e de altíssimo valor percebido aos seus clientes.\n\n` +
    `Você receberá arquivos completos e 100% estruturados no **Canva**, permitindo alterar nomes, datas, fotos, fontes e paleta de cores de forma extremamente simples — tanto pelo computador quanto direto pelo celular, utilizando apenas a versão gratuita do Canva.\n\n` +
    `Chega de perder horas montando artes do zero! O material já vem com acabamento refinado, pronto para impressão ou corte, acelerando sua produção diária e multiplicando suas encomendas.`
  );
}

export interface PlanDetails {
  basic: {
    name: string;
    price: number;
    features: string[];
    buttonText: string;
  };
  complete: {
    name: string;
    badge: string;
    price: number;
    features: string[];
    buttonText: string;
  };
}

/**
 * Gera os detalhes e diferenciais dos planos de acesso
 * ("PLANO BÁSICO" vs "PLANO COMPLETO - MAIS POPULAR")
 * extraindo as informações diretamente da descrição do produto.
 */
export function getAutomaticPlanDetails(product: Product | null): PlanDetails {
  const basicPrice = product?.price || 10;

  // Preço do plano completo: se o lojista definiu upsell_price usa este, senão calcula proporcionalmente
  let completePrice = 25;
  if (product?.upsell_price && product.upsell_price > 0) {
    completePrice = product.upsell_price;
  } else if (basicPrice <= 15) {
    completePrice = 25;
  } else {
    completePrice = Math.round(basicPrice * 2.2);
  }

  // Itens de fechamento padrão de alta conversão presentes no modelo
  const standardClosing = [
    'Todos os bônus exclusivos',
    'Acesso imediato',
    'Receba tudo no seu e-mail e WhatsApp',
  ];

  // 1. TENTA EXTRAIR OS ITENS DIRETAMENTE DA DESCRIÇÃO DO PRODUTO
  const descFeatures = extractFeaturesFromProductDescription(product);

  if (descFeatures.length >= 1) {
    const completeFeatures: string[] = [];

    // Adiciona os itens extraídos da descrição (até 7 itens)
    descFeatures.slice(0, 7).forEach((feat) => {
      completeFeatures.push(feat);
    });

    // Garante os itens de fechamento de alta conversão
    standardClosing.forEach((closing) => {
      if (!completeFeatures.some((f) => f.toLowerCase() === closing.toLowerCase())) {
        completeFeatures.push(closing);
      }
    });

    // Card 1 (Plano Básico): item principal da descrição + acesso básico
    const firstItem = descFeatures[0] || `Acesso essencial a ${product?.name || 'Material'}`.trim();
    const basicFeatures = [
      firstItem,
      'Acesso imediato',
      'Receba no seu e-mail',
    ];

    return {
      basic: {
        name: 'PLANO BÁSICO',
        price: basicPrice,
        features: basicFeatures,
        buttonText: 'Quero o Plano Básico',
      },
      complete: {
        name: 'PLANO COMPLETO',
        badge: 'MAIS POPULAR',
        price: completePrice,
        features: completeFeatures,
        buttonText: 'Quero o Pacote Completo',
      },
    };
  }

  // 2. CASO NÃO HAJA DESCRIÇÃO DETALHADA CADASTRADA, GERA POR NICHO E NOME DO PRODUTO
  const name = (product?.name || '').toLowerCase();
  const category = (product?.category || '').toLowerCase();
  const desc = (product?.detailed_description || product?.detailedDescription || product?.description || '').toLowerCase();
  const text = `${name} ${category} ${desc}`;

  // 1. Topos de Bolo / Cake Toppers / Shaker / 3D (Fiel à imagem de referência)
  if (
    text.includes('topo') ||
    text.includes('cake') ||
    text.includes('topper') ||
    text.includes('shaker') ||
    text.includes('bolo')
  ) {
    return {
      basic: {
        name: 'PLANO BÁSICO',
        price: basicPrice,
        features: [
          '20 Cake Toppers Shaker',
          'Acesso imediato',
          'Receba no seu e-mail',
        ],
        buttonText: 'Quero o Plano Básico',
      },
      complete: {
        name: 'PLANO COMPLETO',
        badge: 'MAIS POPULAR',
        price: completePrice,
        features: [
          '100 Cake Toppers Shaker',
          '600 Cake Toppers 3D',
          '100 Cake Toppers editáveis no Canva',
          '82 Arquivos SVG para decorar',
          'Vídeo aula Cricut e Silhouette',
          'Vídeo aula montagem',
          'Todos os bônus exclusivos',
          'Acesso imediato',
          'Receba tudo no seu e-mail e WhatsApp',
        ],
        buttonText: 'Quero o Pacote Completo',
      },
    };
  }

  // 2. Caixas / Caixinhas / Lembrancinhas
  if (
    text.includes('caixa') ||
    text.includes('lembranc') ||
    text.includes('milk') ||
    text.includes('piramide') ||
    text.includes('pirâmide') ||
    text.includes('cone') ||
    text.includes('maleta') ||
    text.includes('sushi') ||
    text.includes('sacola')
  ) {
    return {
      basic: {
        name: 'PLANO BÁSICO',
        price: basicPrice,
        features: [
          'Moldes essenciais para produção',
          'Acesso imediato',
          'Receba no seu e-mail',
        ],
        buttonText: 'Quero o Plano Básico',
      },
      complete: {
        name: 'PLANO COMPLETO',
        badge: 'MAIS POPULAR',
        price: completePrice,
        features: [
          'Coleção completa com dezenas de moldes e variações',
          'Gabaritos de corte para tesoura, Silhouette e Cricut',
          'Arquivos 100% editáveis no Canva gratuito',
          'Fontes e elementos inclusos sem custos extras',
          'Vídeo aula passo a passo de montagem rápida',
          'Todos os bônus exclusivos inclusos',
          'Acesso vitalício e imediato',
          'Receba tudo no seu e-mail e WhatsApp',
        ],
        buttonText: 'Quero o Pacote Completo',
      },
    };
  }

  // 3. Convites Digitais / Interativos
  if (
    text.includes('convite') ||
    text.includes('virtual') ||
    text.includes('interativo')
  ) {
    return {
      basic: {
        name: 'PLANO BÁSICO',
        price: basicPrice,
        features: [
          'Templates essenciais de Convites',
          'Acesso imediato',
          'Receba no seu e-mail',
        ],
        buttonText: 'Quero o Plano Básico',
      },
      complete: {
        name: 'PLANO COMPLETO',
        badge: 'MAIS POPULAR',
        price: completePrice,
        features: [
          'Coleção completa de Convites Digitais e Interativos',
          'Botões interativos clicáveis para WhatsApp e Localização',
          'Templates 100% editáveis no Canva no celular e PC',
          'Design moderno em alta resolução com fontes inclusas',
          'Vídeo aula prática de edição e compartilhamento',
          'Todos os bônus exclusivos inclusos',
          'Acesso vitalício e imediato',
          'Receba tudo no seu e-mail e WhatsApp',
        ],
        buttonText: 'Quero o Pacote Completo',
      },
    };
  }

  // 4. Encadernação / Agendas / Planners / Cadernos
  if (
    text.includes('agenda') ||
    text.includes('planner') ||
    text.includes('caderno') ||
    text.includes('encaderna') ||
    text.includes('bloqu') ||
    text.includes('miolo')
  ) {
    return {
      basic: {
        name: 'PLANO BÁSICO',
        price: basicPrice,
        features: [
          'Miolos e capas essenciais',
          'Acesso imediato',
          'Receba no seu e-mail',
        ],
        buttonText: 'Quero o Plano Básico',
      },
      complete: {
        name: 'PLANO COMPLETO',
        badge: 'MAIS POPULAR',
        price: completePrice,
        features: [
          'Coleção completa de Planners, Agendas e Cadernos',
          'Miolos completos A5 e A4 em altíssima definição (300 DPI)',
          'Capas 100% editáveis no Canva gratuito',
          'Gabaritos de furação, linhas de dobra e laminação',
          'Vídeo aulas passo a passo de encadernação profissional',
          'Todos os bônus exclusivos inclusos',
          'Acesso vitalício e imediato',
          'Receba tudo no seu e-mail e WhatsApp',
        ],
        buttonText: 'Quero o Pacote Completo',
      },
    };
  }

  // Fallback Inteligente baseado no nome do produto
  const cleanTitle = product?.name ? product.name.trim() : 'Material';
  return {
    basic: {
      name: 'PLANO BÁSICO',
      price: basicPrice,
      features: [
        `Arquivos essenciais de ${cleanTitle}`,
        'Acesso imediato',
        'Receba no seu e-mail',
      ],
      buttonText: 'Quero o Plano Básico',
    },
    complete: {
      name: 'PLANO COMPLETO',
      badge: 'MAIS POPULAR',
      price: completePrice,
      features: [
        `Pacote Completo com todas as variações de ${cleanTitle}`,
        'Arquivos em altíssima definição (300 DPI)',
        'Modelos 100% editáveis no Canva gratuito ou Pro',
        'Moldes e gabaritos prontos para imprimir e cortar',
        'Vídeo aulas práticas passo a passo',
        'Todos os bônus exclusivos inclusos',
        'Acesso vitalício e imediato',
        'Receba tudo no seu e-mail e WhatsApp',
      ],
      buttonText: 'Quero o Pacote Completo',
    },
  };
}

/**
 * Gera ou complementa depoimentos de prova social garantindo SEMPRE exatamente 6 cards
 * com nomes, fotos de perfil em alta resolução, avaliação 5 estrelas e depoimentos persuasivos.
 */
export function getAutomaticTestimonials(product: Product | null): TestimonialItem[] {
  let customItems: TestimonialItem[] = [];

  const raw = product?.testimonials;
  if (raw) {
    if (Array.isArray(raw) && raw.length > 0) {
      customItems = raw.map((item: any, idx: number) => ({
        id: item.id || `custom-${idx}`,
        name: String(item.name || `Cliente #${idx + 1}`).trim(),
        text: String(item.text || item.comment || item.depoimento || '').trim(),
        avatar: item.avatar || item.photo_url || item.imageUrl || DEFAULT_TESTIMONIALS[idx % DEFAULT_TESTIMONIALS.length]?.avatar || '',
        rating: Number(item.rating) || 5,
        role: item.role || 'Cliente Verificada',
      })).filter((it) => it.name && it.text);
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          customItems = parsed.map((item: any, idx: number) => ({
            id: item.id || `custom-${idx}`,
            name: String(item.name || `Cliente #${idx + 1}`).trim(),
            text: String(item.text || item.comment || item.depoimento || '').trim(),
            avatar: item.avatar || item.photo_url || item.imageUrl || DEFAULT_TESTIMONIALS[idx % DEFAULT_TESTIMONIALS.length]?.avatar || '',
            rating: Number(item.rating) || 5,
            role: item.role || 'Cliente Verificada',
          })).filter((it) => it.name && it.text);
        }
      } catch {
        const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
        if (lines.length > 0) {
          customItems = lines.map((line, idx) => {
            const parts = line.split('|').map((p) => p.trim());
            return {
              id: `custom-line-${idx}`,
              name: parts[0] || `Cliente #${idx + 1}`,
              text: parts[1] || parts[0],
              avatar: parts[2] || DEFAULT_TESTIMONIALS[idx % DEFAULT_TESTIMONIALS.length]?.avatar || '',
              rating: 5,
              role: 'Cliente Verificada',
            };
          }).filter((it) => it.name && it.text);
        }
      }
    }
  }

  // Base contextual com 6 depoimentos de alta conversão adaptados ao nicho do produto
  const name = (product?.name || '').toLowerCase();
  const category = (product?.category || '').toLowerCase();
  const desc = (product?.detailed_description || product?.detailedDescription || product?.description || '').toLowerCase();
  const text = `${name} ${category} ${desc}`;

  let contextualTestimonials: TestimonialItem[] = DEFAULT_TESTIMONIALS;

  if (
    text.includes('topo') ||
    text.includes('cake') ||
    text.includes('topper') ||
    text.includes('shaker') ||
    text.includes('bolo')
  ) {
    contextualTestimonials = [
      {
        id: 'val-1',
        name: 'Valentina Rocha',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Amei a facilidade dos moldes! Consegui montar meus primeiros cake toppers no mesmo dia e o acabamento ficou impecável. Super recomendo!',
      },
      {
        id: 'cam-2',
        name: 'Camila Fernandes',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Economizei horas de criação. Os temas são lindos, modernos e minhas clientes ficaram apaixonadas pelos topos 3D e Shaker.',
      },
      {
        id: 'sof-3',
        name: 'Sofia Martins',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Editar no Canva pelo celular foi uma virada de chave no meu ateliê. Mudo nomes e idades em menos de 2 minutos!',
      },
      {
        id: 'mar-4',
        name: 'Mariana Lopes',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'A variedade de arquivos é incrível. Nunca mais precisei comprar topo avulso, tenho modelos prontos para qualquer festa ou comemoração.',
      },
      {
        id: 'dan-5',
        name: 'Daniela Torres',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Os arquivos em SVG cortam perfeitamente na Silhouette e tesoura. Sem falhas, sem perda de papel. Valeu cada centavo!',
      },
      {
        id: 'ale-6',
        name: 'Alessandra Garcia',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Entrega instantânea e suporte maravilhoso. Já fiz várias encomendas essa semana usando esse material lindo!',
      },
    ];
  } else if (
    text.includes('caixa') ||
    text.includes('lembranc') ||
    text.includes('milk') ||
    text.includes('cone') ||
    text.includes('sacola')
  ) {
    contextualTestimonials = [
      {
        id: 'val-1',
        name: 'Valentina Rocha',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Os moldes de caixas e lembrancinhas têm linhas de corte e vinco perfeitamente alinhadas. Montagem rápida e sem dor de cabeça.',
      },
      {
        id: 'cam-2',
        name: 'Camila Fernandes',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'As caixinhas ficam firmes e muito bem estruturadas. Minhas clientes elogiaram bastante o acabamento final das festas.',
      },
      {
        id: 'sof-3',
        name: 'Sofia Martins',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Templates no Canva fáceis demais de personalizar. Troco temas, fotos e cores em poucos cliques no computador ou no celular.',
      },
      {
        id: 'mar-4',
        name: 'Mariana Lopes',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'A alta resolução (300 DPI) faz toda a diferença na impressão. As cores saem vivas e a montagem encaixa certinho.',
      },
      {
        id: 'dan-5',
        name: 'Daniela Torres',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Cortei tanto na plotter quanto com a tesoura e deu super certo. Agilizou meu tempo de produção pela metade!',
      },
      {
        id: 'ale-6',
        name: 'Alessandra Garcia',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Material completíssimo! O melhor investimento que fiz para o meu negócio de papelaria personalizada.',
      },
    ];
  } else if (
    text.includes('convite') ||
    text.includes('virtual') ||
    text.includes('interativo')
  ) {
    contextualTestimonials = [
      {
        id: 'val-1',
        name: 'Valentina Rocha',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Os convites interativos com botões clicáveis para WhatsApp deixaram meus clientes maravilhados. Todos elogiam a praticidade!',
      },
      {
        id: 'cam-2',
        name: 'Camila Fernandes',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Muito fácil de editar no Canva. Em menos de 5 minutos o convite já estava pronto para enviar pelo celular.',
      },
      {
        id: 'sof-3',
        name: 'Sofia Martins',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'A qualidade das artes e fontes é de alto nível. Meus pedidos de convites aumentaram muito depois que adquiri o pacote.',
      },
      {
        id: 'mar-4',
        name: 'Mariana Lopes',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Já fiz convites para aniversário infantil, 15 anos e batizado. Todos os modelos são modernos e sofisticados.',
      },
      {
        id: 'dan-5',
        name: 'Daniela Torres',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'O melhor é não precisar de nenhum programa pago ou pesado. Faço tudo direto no Canva gratuito.',
      },
      {
        id: 'ale-6',
        name: 'Alessandra Garcia',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
        rating: 5,
        text: 'Acesso imediato no e-mail logo após a confirmação do pagamento. Excelente compra, recomendo de olhos fechados!',
      },
    ];
  }

  // GARANTIA DOS 6 CARDS:
  // Se o lojista cadastrou menos de 6 depoimentos personalizados,
  // preenche os slots restantes com os depoimentos de alta conversão até totalizar exatamente 6 cards!
  if (customItems.length === 0) {
    return contextualTestimonials.slice(0, 6);
  }

  if (customItems.length >= 6) {
    return customItems.slice(0, 6);
  }

  const result = [...customItems];
  for (const fallback of contextualTestimonials) {
    if (result.length >= 6) break;
    // Evita duplicar nome de cliente
    if (!result.some((it) => it.name.toLowerCase() === fallback.name.toLowerCase())) {
      result.push(fallback);
    }
  }

  // Se ainda assim faltar algum para chegar em 6
  while (result.length < 6) {
    const idx = result.length;
    result.push({
      ...DEFAULT_TESTIMONIALS[idx % DEFAULT_TESTIMONIALS.length],
      id: `fallback-${idx}`,
    });
  }

  return result.slice(0, 6);
}
