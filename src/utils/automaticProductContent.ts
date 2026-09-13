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
        const clean = String(b || '').trim().replace(/^[-•*✓✔+✅✨📦]\s*/, '').replace(/\*\*/g, '').trim();
        if (clean && clean.length >= 3 && !items.includes(clean)) items.push(clean);
      });
    } else if (typeof rawBenefits === 'string' && rawBenefits.trim()) {
      rawBenefits.split('\n').forEach((line) => {
        const clean = line.trim().replace(/^[-•*✓✔+✅✨📦]\s*/, '').replace(/\*\*/g, '').trim();
        if (clean && clean.length >= 3 && !items.includes(clean)) items.push(clean);
      });
    }
  }

  if (items.length >= 6) {
    return items.slice(0, 6);
  }

  // 2. Extração inteligente a partir da descrição efetiva do produto (manual ou gerada automaticamente)
  const manualDesc = [
    product.detailed_description || (product as any).detailedDescription || '',
    product.description || ''
  ].filter(Boolean).join('\n').trim();

  const effectiveDesc = manualDesc || getAutomaticProductDescription(product);

  if (effectiveDesc) {
    // Normalizar tags HTML e quebras de linha
    const normalizedText = effectiveDesc
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ');

    // 2A. Se houver tópicos/bullets explícitos na descrição, extrai-os com prioridade
    const lines = normalizedText.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const isBullet = /^[-•*✓✔+✅✨📦]\s+/.test(line) || /^\d+[\.\-\)]\s+/.test(line);
      const clean = line
        .replace(/^[-•*✓✔+✅✨📦]\s*/, '')
        .replace(/^\d+[\.\-\)]\s*/, '')
        .replace(/\*\*/g, '')
        .trim();

      const isHeader = /^(o que est[áa] incluso|o que voc[êe] vai receber|conte[úu]do do pacote|itens inclusos|detalhes|benef[íi]cios|importante|aten[çc][ãa]o|descri[çc][ãa]o|caracter[íi]sticas):?$/i.test(clean);
      if (isHeader) continue;

      if (isBullet && clean.length >= 3 && clean.length <= 140) {
        if (!items.includes(clean)) items.push(clean);
      }
    }

    if (items.length >= 6) {
      return items.slice(0, 6);
    }

    // 2B. Se a descrição for ou contiver a copy de alta conversão (exibida em "Detalhes e Descrição do Produto")
    const lower = effectiveDesc.toLowerCase();
    const hasCanva = lower.includes('canva');
    const hasArtisas = lower.includes('artesãs') || lower.includes('papeleiras') || lower.includes('confeiteiras') || lower.includes('designers');
    const hasDevice = lower.includes('computador') || lower.includes('celular');
    const hasCorte = lower.includes('impressão') || lower.includes('corte');
    const hasAlterar = lower.includes('alterar') || lower.includes('nomes') || lower.includes('fontes') || lower.includes('fotos');

    if (hasCanva || hasArtisas || hasDevice || hasCorte || hasAlterar) {
      const standardFeatures = [
        'Arquivos 100% estruturados e editáveis no Canva',
        'Edição simples pelo computador ou direto pelo celular',
        'Altere nomes, datas, fotos, fontes e paleta de cores',
        'Compatível com a versão 100% gratuita do Canva',
        'Material pronto para impressão ou corte com acabamento refinado',
        'Desenvolvido para artesãs, papeleiras, confeiteiras e designers',
      ];

      for (const feat of standardFeatures) {
        if (!items.includes(feat)) {
          items.push(feat);
        }
        if (items.length >= 6) break;
      }

      return items.slice(0, 6);
    }

    // 2C. Para outras descrições em texto corrido (sem bullets e sem a copy padrão):
    // Divide por frases ou orações lógicas
    const cleanedText = normalizedText.replace(/\*\*/g, '').replace(/__/g, '');
    const sentences = cleanedText
      .split(/(?<=[.!?;\n])\s+|—/)
      .map(s => s.trim().replace(/^[-•*✓✔+✅✨📦]\s*/, '').replace(/^[–—-]\s*/, ''))
      .filter(s => s.length >= 10 && s.length <= 110 && !s.includes('http') && !s.endsWith(':'));

    for (const sent of sentences) {
      let clean = sent.replace(/[.!]+$/, '').trim();
      clean = clean.replace(/^(você receberá|o pacote contém|material com|desenvolvido com)\s+/i, '');
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);

      const isHeader = /^(o que est[áa] incluso|o que voc[êe] vai receber|conte[úu]do|detalhes|benef[íi]cios):?$/i.test(clean);
      if (!isHeader && clean.length >= 10 && !items.includes(clean)) {
        items.push(clean);
      }
      if (items.length >= 6) break;
    }
  }

  // 3. Complemento inteligente caso ainda falte algum item
  if (items.length < 6) {
    const text = effectiveDesc.toLowerCase();
    const complements: string[] = [];

    if (text.includes('canva')) {
      complements.push('Templates 100% editáveis no Canva (versão gratuita ou Pro)');
    }
    if (text.includes('impress') || text.includes('corte') || text.includes('molde')) {
      complements.push('Moldes e arquivos prontos para impressão ou corte');
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

/**
 * Gera automaticamente os 6 itens da seção "O que você vai encontrar neste pacote"
 * com base na descrição real do produto, benefícios ou nicho, sem que o lojista precise preencher nada manualmente.
 */
export function getAutomaticPackageItems(product: Product | null): string[] {
  if (!product) return [];

  // 1. Prioridade Máxima: Extrai itens diretamente da descrição detalhada, descrição ou benefícios do produto
  const extracted = extractFeaturesFromProductDescription(product);

  if (extracted.length > 0) {
    return extracted.slice(0, 6);
  }

  // 2. Fallback inteligente baseado em categorias/nichos se nenhuma descrição foi informada
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const desc = (product.detailed_description || product.detailedDescription || product.description || '').toLowerCase();
  const text = `${name} ${category} ${desc}`;

  // 1. Topos de Bolo / Cake Toppers
  if (
    text.includes('topo') ||
    text.includes('cake') ||
    text.includes('topper') ||
    text.includes('bolo')
  ) {
    if (text.includes('shaker') || text.includes('3d')) {
      return [
        'Os temas infantis e comemorativos mais procurados',
        'Cake Toppers Shaker modernos e exclusivos',
        'Arquivos SVG e moldes prontos para cortar',
        'Cake Toppers 3D com acabamento profissional',
        'Templates 100% editáveis no Canva',
        'Muitos estilos para qualquer cliente',
      ];
    }
    return [
      'Arquivos completos e prontos para impressão ou corte',
      'Templates 100% editáveis no Canva (versão gratuita)',
      'Camadas organizadas para alterar nomes, datas e fotos',
      'Desenvolvido para artesãs, papeleiras e confeiteiras',
      'Moldes com linhas perfeitas para corte manual ou plotter',
      'Acesso imediato e vitalício no seu WhatsApp e E-mail',
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

  // Verifica se o produto possui bônus configurados
  let rawBonuses = product?.bonuses;
  if ((!rawBonuses || (Array.isArray(rawBonuses) && rawBonuses.length === 0)) && typeof window !== 'undefined' && window.localStorage && product?.id) {
    try {
      const cached = localStorage.getItem(`soumbolinho_bonuses_${product.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawBonuses = parsed;
        }
      }
    } catch {}
  }

  const hasBonuses = Boolean(
    (Array.isArray(rawBonuses) && rawBonuses.length > 0) ||
    (typeof rawBonuses === 'string' && rawBonuses.trim().length > 0)
  );

  // Itens de fechamento padrão de alta conversão presentes no modelo
  const standardClosing = [
    ...(hasBonuses ? ['Todos os bônus exclusivos'] : []),
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

  // 1. Topos de Bolo / Cake Toppers
  if (
    text.includes('topo') ||
    text.includes('cake') ||
    text.includes('topper') ||
    text.includes('bolo')
  ) {
    if (text.includes('shaker') || text.includes('3d')) {
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
            ...(hasBonuses ? ['Todos os bônus exclusivos'] : []),
            'Acesso imediato',
            'Receba tudo no seu e-mail e WhatsApp',
          ],
          buttonText: 'Quero o Pacote Completo',
        },
      };
    }
    return {
      basic: {
        name: 'PLANO BÁSICO',
        price: basicPrice,
        features: [
          `Arquivos essenciais de ${product?.name || 'Topo de Bolo'}`,
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
          'Arquivos 100% estruturados e editáveis no Canva',
          'Edição simples pelo computador ou direto pelo celular',
          'Altere nomes, datas, fotos, fontes e paleta de cores',
          'Compatível com a versão 100% gratuita do Canva',
          'Material pronto para impressão ou corte com acabamento refinado',
          'Desenvolvido para artesãs, papeleiras, confeiteiras e designers',
          ...(hasBonuses ? ['Todos os bônus exclusivos'] : []),
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
          ...(hasBonuses ? ['Todos os bônus exclusivos inclusos'] : []),
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
          ...(hasBonuses ? ['Todos os bônus exclusivos inclusos'] : []),
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
          ...(hasBonuses ? ['Todos os bônus exclusivos inclusos'] : []),
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
        ...(hasBonuses ? ['Todos os bônus exclusivos inclusos'] : []),
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

  // Nome limpo e amigável do produto para menção natural nos depoimentos
  const rawTitle = (product?.name || '').trim();
  const cleanTitle = rawTitle.replace(/[-_]/g, ' ') || 'este material';

  // Descrição efetiva exibida na Seção 3 ("Detalhes e Descrição do Produto")
  const manualDesc = [
    product?.detailed_description || (product as any)?.detailedDescription || '',
    product?.description || ''
  ].filter(Boolean).join('\n').trim();

  const effectiveDesc = manualDesc || getAutomaticProductDescription(product);
  const textLower = `${cleanTitle} ${(product?.category || '')} ${effectiveDesc}`.toLowerCase();

  const mentionsShaker = textLower.includes('shaker');
  const mentions3D = textLower.includes('3d');
  const mentionsSvg = textLower.includes('svg') || textLower.includes('silhouette');
  const mentionsCaixa = textLower.includes('caixa') || textLower.includes('lembranc') || textLower.includes('maleta') || textLower.includes('milk');
  const mentionsConvite = textLower.includes('convite') || textLower.includes('interativo');
  const mentionsAgenda = textLower.includes('agenda') || textLower.includes('planner') || textLower.includes('caderno');

  // Depoimento 1 (Valentina): Facilidade de edição no Canva e arquivos organizados
  let valText = `Os arquivos de ${cleanTitle} são super organizados e 100% estruturados no Canva! Consegui alterar os nomes, fotos e paleta de cores em poucos minutos direto pelo celular. O resultado ficou impecável!`;
  if (mentionsConvite) {
    valText = `Os convites interativos de ${cleanTitle} são sensacionais! Editei pelo celular no Canva em poucos minutos e os botões clicáveis funcionaram perfeitamente. Meus clientes amaram!`;
  } else if (mentionsCaixa) {
    valText = `Os moldes de ${cleanTitle} têm linhas de corte e vinco perfeitamente alinhadas. Muito fácil de editar no Canva e a montagem foi super rápida!`;
  }

  // Depoimento 2 (Camila): Economia de tempo, fim de perder horas do zero, aceleração da produção
  let camText = `Chega de perder horas montando artes do zero! O material de ${cleanTitle} já vem com acabamento refinado e pronto para impressão ou corte, acelerando demais minha produção diária.`;
  if (mentionsShaker && mentions3D) {
    camText = `Economizei horas de criação! Os temas de ${cleanTitle} são modernos e minhas clientes ficaram apaixonadas pelo acabamento dos modelos 3D e Shaker.`;
  } else if (mentionsAgenda) {
    camText = `Os miolos e capas de ${cleanTitle} economizaram dias de diagramação no meu ateliê. A qualidade das páginas em alta resolução é espetacular!`;
  }

  // Depoimento 3 (Sofia): Versão gratuita do Canva no celular e computador + alto valor percebido
  const sofText = `Uso apenas a versão gratuita do Canva e funcionou com total facilidade tanto pelo celular quanto no computador. As artes de ${cleanTitle} têm um altíssimo valor percebido pelos clientes!`;

  // Depoimento 4 (Mariana): Desenvolvido para artesãs, papeleiras, confeiteiras e designers
  let marText = `Sou artesã e esse pacote de ${cleanTitle} facilitou demais a minha rotina de encomendas. Material profissional, limpo e de facílimo manuseio. Super recomendo!`;
  if (textLower.includes('confeiteira') || textLower.includes('bolo')) {
    marText = `Trabalho com confeitaria e papelaria, e esse material de ${cleanTitle} elevou o padrão das minhas encomendas. Muito prático de personalizar e imprimir!`;
  }

  // Depoimento 5 (Daniela): Pronto para impressão ou corte com precisão
  let danText = `O material já vem pronto para impressão e corte com acabamento impecável. As cores saíram vibrantes e não tive nenhum desperdício de papel. Valeu cada centavo!`;
  if (mentionsSvg) {
    danText = `Os arquivos cortam perfeitamente na Silhouette e tesoura. Sem falhas, sem perda de papel e com encaixe perfeito. Valeu cada centavo!`;
  }

  // Depoimento 6 (Alessandra): Acesso imediato no WhatsApp e E-mail + suporte
  const aleText = `O acesso aos arquivos de ${cleanTitle} foi liberado imediatamente após a confirmação do pagamento no meu WhatsApp e E-mail. Suporte excelente e material de altíssima qualidade!`;

  const contextualTestimonials: TestimonialItem[] = [
    {
      id: 'val-1',
      name: 'Valentina Rocha',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80',
      rating: 5,
      text: valText,
    },
    {
      id: 'cam-2',
      name: 'Camila Fernandes',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80',
      rating: 5,
      text: camText,
    },
    {
      id: 'sof-3',
      name: 'Sofia Martins',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&h=300&q=80',
      rating: 5,
      text: sofText,
    },
    {
      id: 'mar-4',
      name: 'Mariana Lopes',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
      rating: 5,
      text: marText,
    },
    {
      id: 'dan-5',
      name: 'Daniela Torres',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80',
      rating: 5,
      text: danText,
    },
    {
      id: 'ale-6',
      name: 'Alessandra Garcia',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
      rating: 5,
      text: aleText,
    },
  ];

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

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Gera automaticamente as Perguntas Frequentes (FAQ) de alta conversão
 * estritamente alinhadas com os Detalhes e Descrição do Produto.
 */
export function getAutomaticProductFaq(product: Product | null): FaqItem[] {
  if (product?.faq && Array.isArray(product.faq) && product.faq.length > 0) {
    return product.faq;
  }

  const rawTitle = (product?.name || '').trim();
  const cleanTitle = rawTitle.replace(/[-_]/g, ' ') || 'este pacote digital';

  // Descrição efetiva do produto exibida na Seção 3 ("Detalhes e Descrição do Produto")
  const manualDesc = [
    product?.detailed_description || (product as any)?.detailedDescription || '',
    product?.description || ''
  ].filter(Boolean).join('\n').trim();

  const effectiveDesc = manualDesc || getAutomaticProductDescription(product);
  const textLower = `${cleanTitle} ${(product?.category || '')} ${effectiveDesc}`.toLowerCase();

  const mentionsCorte = textLower.includes('corte') || textLower.includes('silhouette') || textLower.includes('svg') || textLower.includes('tesoura') || textLower.includes('molde');
  const mentionsConvite = textLower.includes('convite') || textLower.includes('interativo');

  return [
    {
      question: `O que exatamente vou receber no pacote ${cleanTitle}?`,
      answer: `Você receberá os arquivos completos e 100% estruturados de ${cleanTitle} no Canva. O material foi desenvolvido com acabamento refinado e de altíssimo valor percebido, ideal para artesãs, papeleiras, confeiteiras e designers acelerarem sua produção diária.`
    },
    {
      question: 'Consigo alterar nomes, datas, fotos e paleta de cores?',
      answer: 'Sim! Os arquivos são 100% estruturados e organizados. Você pode alterar facilmente nomes, idades, datas, fotos, fontes e toda a paleta de cores com poucos cliques, tanto pelo computador quanto direto pelo celular.'
    },
    {
      question: 'Preciso ter o Canva Pro para editar?',
      answer: 'Não! Todos os arquivos foram criados pensando na máxima acessibilidade. Você consegue abrir, personalizar e exportar tudo utilizando apenas a versão 100% GRATUITA do Canva, sem precisar pagar nenhuma mensalidade.'
    },
    {
      question: 'Posso editar direto pelo celular ou preciso de computador?',
      answer: 'Você tem total liberdade: pode editar tanto direto pelo celular (através do aplicativo oficial e gratuito do Canva) quanto pelo computador ou tablet, com total facilidade e sincronização em tempo real.'
    },
    {
      question: mentionsCorte
        ? 'O material já vem pronto para impressão e corte (tesoura ou plotter)?'
        : mentionsConvite
          ? 'Como funcionam os botões interativos e o envio pelo WhatsApp?'
          : 'O material já vem pronto para impressão ou uso?',
      answer: mentionsCorte
        ? 'Sim! Chega de perder horas criando do zero. O material já vem com acabamento refinado e moldes perfeitamente alinhados, prontos para impressão em altíssima definição (300 DPI) e corte manual na tesoura ou em plotters (Silhouette e Cricut).'
        : mentionsConvite
          ? 'Os convites já vêm configurados com botões interativos e clicáveis para WhatsApp e Localização. Basta preencher os dados no Canva e enviar diretamente no WhatsApp dos seus clientes.'
          : 'Sim! Chega de perder horas montando artes do zero. Os arquivos já vêm com acabamento refinado em altíssima definição (300 DPI), prontos para impressão ou entrega imediata aos seus clientes.'
    },
    {
      question: 'Como recebo o meu acesso após a compra e qual a validade?',
      answer: 'O envio é imediato e 100% automático! Assim que o seu pagamento por Pix ou Cartão for aprovado, o link de acesso aos arquivos é enviado diretamente para o seu WhatsApp e para o seu E-mail cadastrado. O seu acesso é vitalício, sem mensalidades ou prazo de expiração.'
    }
  ];
}

