// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

export interface GenerateProductAiRequest {
  product_name?: string;
  category?: string;
  is_digital?: boolean;
  store_id?: string;
  extra_context?: string;
}

export interface GeneratedProductAiResponse {
  success: boolean;
  title: string;
  description: string;
  suggested_badge?: string;
  suggested_tags: string[];
  benefits: string[];
  urgency_hook?: string;
  call_to_action?: string;
  source?: 'gemini' | 'copywriter_engine';
  error?: string;
}

/**
 * Motor heurístico inteligente de copywriting de alta conversão multi-nichos.
 * Adapta-se automaticamente a Moda/Vestuário, Eletrônicos, Beleza, Produtos Físicos, Digitais e Papelaria.
 * Usado como garantia de 100% de disponibilidade em qualquer ambiente.
 */
function generateHeuristicSalesCopy(
  name: string,
  category: string = '',
  isDigital: boolean = false
): Omit<GeneratedProductAiResponse, 'success'> {
  const cleanName = name.trim();
  const fullText = `${cleanName} ${category}`.toLowerCase();

  // 1. Nicho Moda, Roupas e Vestuário
  const isClothing = /(camisa|camiseta|t-shirt|blusa|cropped|moletom|regata|cal[çc]a|short|bermuda|vestido|saia|casaco|jaqueta|cardigan|manga\s*longa|manga\s*curta|manda\s*longa|polo|jeans|lingerie|pijama|cueca|calcinha|meia|roupa|vestu[aá]rio|moda|look|uniforme|biqu[ií]ni|mai[oô]|sunga|agasalho|corta\s*vento|su[eé]ter|blazer|terno|colete)/i.test(fullText);

  // 2. Nicho Calçados e Acessórios de Moda
  const isAccessoryOrFootwear = /(t[eê]nis|sapato|sand[aá]lia|chinelo|bota|coturno|sapatilha|bolsa|mochila|carteira|cinto|rel[oó]gio|[oó]culos|colar|brinco|pulseira|joia|semijoia|bijuteria|anel|bon[eé]|touca|cachecol)/i.test(fullText);

  // 3. Nicho Tecnologia e Eletrônicos
  const isTech = /(celular|smartphone|fone|headset|headphone|earbud|carregador|cabo\s*usb|smartwatch|relogio\s*inteligente|gamer|mouse|teclado|caixa\s*de\s*som|bluetooth|usb|notebook|computador|led|c[aâ]mera|power\s*bank|eletr[oô]nico|gadget)/i.test(fullText);

  // 4. Nicho Beleza e Cosméticos
  const isBeauty = /(perfume|fragr[aâ]ncia|batom|maquiagem|creme|hidratante|skincare|shampoo|condicionador|[oó]leo|s[eé]rum|esmalte|sabonete|cabelo|barba|protetor\s*solar|cosm[eé]tico|beleza|anti-idade)/i.test(fullText);

  // 5. Nicho Papelaria e Festas
  const isStationeryParty = /(papelaria|topo\s*de\s*bolo|lembrancinha|caixa\s*milk|caixa\s*pir[aâ]mide|sacolinha|tubete|latinha|scrap|centro\s*de\s*mesa|convite\s*impresso|papel\s*fotogr[aá]fico|papelaria\s*personalizada)/i.test(fullText);

  // 6. Produto Digital Explícito
  const isExplicitDigital = isDigital || /(arquivo|digital|pdf|canva|download|pack|combo\s*digital|corel|svg|png|planner|ebook|curso|template|planilha|preset)/i.test(fullText);

  // --- GERAÇÃO POR NICHO ---

  // CASO 1: ROUPAS / VESTUÁRIO (Foco em tecido macio, caimento, costuras e conforto)
  if (isClothing && !isExplicitDigital) {
    const title = `${cleanName} - Conforto, Alta Qualidade e Caimento Perfeito`;
    const description = `✨ **ELEVE SEU ESTILO COM ${cleanName.toUpperCase()}!** ✨

Procurando a combinação ideal entre conforto, estilo moderno e alta durabilidade? O(A) **${cleanName}** foi desenvolvido(a) especialmente para quem valoriza um visual impecável, caimento anatômico e tecido de altíssima qualidade!

---

👕 **DESTAQUES E QUALIDADE DO PRODUTO:**
• **Tecido de Toque Macio e Respirável:** Confeccionado com material de excelente procedência que proporciona sensação leve e confortável na pele o dia todo.
• **Caimento Impecável no Corpo:** Modelagem moderna que se adapta ao corpo com total liberdade de movimentos.
• **Costuras Duplas e Reforçadas:** Acabamento de primeira linha que garante máxima resistência, sem deformar ou esgarçar.
• **Cores Vivas e Duradouras:** Tecido com alta fixação que preserva a tonalidade original mesmo após diversas lavagens.
• **Versatilidade Total:** Perfeito tanto para o uso casual no dia a dia quanto para momentos especiais e combinações elegantes.

🚚 **ENVIO RÁPIDO E COMPRA 100% SEGURA:**
• Peça rigorosamente inspecionada antes do envio para assegurar padrão de qualidade impecável.
• Embalagem protegida e envio ágil com código de rastreamento enviado diretamente no seu WhatsApp e E-mail.
• Compra protegida com garantia de satisfação ou troca facilitada.

⏳ **ESTOQUE LIMITADO COM PREÇO PROMOCIONAL!**
Selecione seu tamanho e cor, calcule o prazo de entrega e clique em **Comprar Agora** para garantir o seu antes do término da promoção!`;

    return {
      title,
      description,
      suggested_badge: '🔥 Mais Vendido',
      suggested_tags: ['Moda & Vestuário', 'Conforto & Estilo', 'Alta Qualidade', 'Lançamento', 'Look do Dia'],
      benefits: [
        'Tecido macio, respirável e de extremo conforto',
        'Modelagem anatômica com caimento perfeito ao corpo',
        'Costuras duplas reforçadas para alta durabilidade',
        'Envio rápido e protegido com código de rastreamento'
      ],
      urgency_hook: '⚡ Poucas unidades disponíveis com preço promocional neste lote!',
      call_to_action: 'Comprar Agora com Desconto',
      source: 'copywriter_engine',
    };
  }

  // CASO 2: CALÇADOS & ACESSÓRIOS
  if (isAccessoryOrFootwear && !isExplicitDigital) {
    const title = `${cleanName} - Design Exclusivo, Conforto e Elegância`;
    const description = `✨ **DESTAQUE-SE COM ${cleanName.toUpperCase()}!** ✨

Complemente seu visual com elegância, qualidade e personalidade. O(A) **${cleanName}** une design moderno, acabamento impecável e alta durabilidade para acompanhar você em qualquer ocasião!

---

🎒 **DIFERENCIAIS DO PRODUTO:**
• **Design Moderno e Exclusivo:** Linhas sofisticadas que valorizam qualquer combinação de estilo.
• **Material Selecionado:** Matéria-prima de alta resistência projetada para durar muito mais tempo.
• **Conforto e Funcionalidade:** Praticidade no uso diário sem abrir mão da elegância.
• **Acabamento Premium:** Atenção minuciosa em cada detalhe, costura e fechamento.

🚚 **ENTREGA ÁGIL E GARANTIDA:**
• Envio rápido com código de rastreamento enviado em tempo real.
• Embalagem especial e protegida para que o produto chegue impecável até você.

⏳ **OFERTA ESPECIAL POR TEMPO LIMITADO!**
Garanta já o seu com condição especial de lançamento. Clique em **Comprar Agora**!`;

    return {
      title,
      description,
      suggested_badge: '⭐ Destaque',
      suggested_tags: ['Acessórios', 'Moda & Estilo', 'Design Exclusivo', 'Alta Qualidade'],
      benefits: [
        'Design moderno e acabamento de alto padrão',
        'Material resistente de alta durabilidade',
        'Conforto, versatilidade e praticidade diária',
        'Envio rápido com rastreamento seguro'
      ],
      urgency_hook: '⚡ Últimas unidades em estoque com preço promocional!',
      call_to_action: 'Comprar Agora com Desconto',
      source: 'copywriter_engine',
    };
  }

  // CASO 3: TECNOLOGIA & ELETRÔNICOS
  if (isTech && !isExplicitDigital) {
    const title = `${cleanName} - Alta Performance, Tecnologia e Confiabilidade`;
    const description = `⚡ **POTÊNCIA E PRATICIDADE COM ${cleanName.toUpperCase()}!** ⚡

Eleve sua experiência tecnológica a outro nível! O(A) **${cleanName}** combina alta tecnologia, máxima performance e durabilidade para facilitar sua rotina e oferecer o melhor desempenho.

---

⚙️ **PRINCIPAIS RECURSOS:**
• **Tecnologia Avançada:** Alta eficiência e estabilidade para garantir o melhor desempenho.
• **Construção Robusta e Durável:** Componentes selecionados para longa vida útil e segurança.
• **Design Moderno e Ergonômico:** Visual sofisticado, intuitivo e fácil de usar ou transportar.
• **Pronto para Uso:** Instalação e sincronização simples, rápidas e sem complicações.

🚚 **ENVIO RÁPIDO E SUPORTE GARANTIDO:**
• Postagem imediata com código de rastreio para você acompanhar cada etapa.
• Embalagem lacrada e protegida contra impactos durante o transporte.
• Garantia com suporte dedicado para qualquer necessidade.

⏳ **GARANTA O SEU COM DESCONTO ESPECIAL!**
Clique em **Comprar Agora** e aproveite as condições promocionais antes do encerramento!`;

    return {
      title,
      description,
      suggested_badge: '⚡ Alta Performance',
      suggested_tags: ['Tecnologia', 'Alta Performance', 'Inovação', 'Praticidade', 'Qualidade'],
      benefits: [
        'Alta performance e tecnologia de ponta',
        'Construção robusta e durabilidade comprovada',
        'Design ergonômico, moderno e intuitivo',
        'Garantia e envio com rastreamento seguro'
      ],
      urgency_hook: '🔥 Lote promocional com poucas unidades restantes!',
      call_to_action: 'Garantir com Garantia',
      source: 'copywriter_engine',
    };
  }

  // CASO 4: BELEZA E COSMÉTICOS
  if (isBeauty && !isExplicitDigital) {
    const title = `${cleanName} - Fórmula Premium, Cuidado Especial e Resultados Incríveis`;
    const description = `✨ **SINTA A DIFERENÇA COM ${cleanName.toUpperCase()}!** ✨

Realce sua beleza e cuide de você com o que há de melhor! O(A) **${cleanName}** foi desenvolvido(a) com fórmula de alto desempenho e ingredientes nobres para proporcionar resultados visíveis e sensação incomparável de bem-estar.

---

💖 **POR QUE VOCÊ VAI AMAR:**
• **Fórmula de Alta Eficácia:** Ação rápida e profunda com textura agradável e absorção ideal.
• **Ingredientes Selecionados:** Cuidado seguro, suave e que respeita o equilíbrio natural do seu corpo.
• **Sensação Única:** Toque aveludado, hidratação prolongada e fragrância delicada e marcante.
• **Qualidade Comprovada:** Testado e aprovado com foco em resultados reais no seu dia a dia.

🚚 **ENVIO ÁGIL E COMPRA SEGURA:**
• Envio rápido com embalagem protegida para preservar todas as propriedades do produto.
• Código de rastreamento enviado automaticamente após a postagem.

⏳ **APROVEITE O VALOR PROMOCIONAL DESTE LOTE!**
Clique em **Comprar Agora** e transforme seu momento de autocuidado com resultados surpreendentes!`;

    return {
      title,
      description,
      suggested_badge: '✨ Fórmula Premium',
      suggested_tags: ['Beleza & Cuidados', 'Skincare', 'Bem-Estar', 'Qualidade Premium', 'Autocuidado'],
      benefits: [
        'Fórmula de alta performance com resultados visíveis',
        'Ingredientes selecionados para máximo cuidado',
        'Textura leve, toque aveludado e fragrância especial',
        'Envio rápido e compra 100% segura'
      ],
      urgency_hook: '⚡ Oferta especial por tempo limitado ou até durar o estoque!',
      call_to_action: 'Comprar Agora com Segurança',
      source: 'copywriter_engine',
    };
  }

  // CASO 5: PAPELARIA E FESTAS FÍSICAS (APENAS se o produto for explicitamente de papelaria/festa)
  if (isStationeryParty && !isExplicitDigital) {
    const title = `${cleanName} - Personalizado em Papel Fotográfico de Alta Gramatura`;
    const description = `✨ **SURPREENDA A TODOS COM ${title.toUpperCase()}!** ✨

Encante seus convidados com uma papelaria afetiva de altíssima qualidade, produzida com muito carinho e acabamento impecável para tornar sua celebração única e memorável!

---

📦 **DETALHES DO PRODUTO:**
• Impressão profissional em papel fotográfico de alta gramatura (cores vivas e durabilidade).
• Corte preciso em máquina profissional com vincos e dobras perfeitas.
• Já vai semi-montado ou montado com fitas e apliques especiais conforme o tema.
• Embalado com máxima proteção para chegar intacto até sua residência.

🚚 **PRAZOS E ENVIO RÁPIDO:**
• Produção ágil e envio com código de rastreamento direto no seu WhatsApp.
• Opção de envio econômico (PAC), expresso (Sedex) ou retirada no local.

⏳ **GARANTA O SEU ANTES DE ESGOTAR O ESTOQUE DESTE TEMA!**
Adicione ao seu carrinho agora mesmo, informe seu CEP para calcular o prazo e finalize seu pedido com total segurança!`;

    return {
      title,
      description,
      suggested_badge: '⭐ Mais Vendido',
      suggested_tags: ['Papelaria Criativa', 'Personalizados', 'Festa Infantil', 'Decoração de Festa'],
      benefits: [
        'Produzido em Papel Fotográfico Premium',
        'Corte Eletrônico Preciso de Alta Definição',
        'Embalagem Super Reforçada e Segura',
        'Envio Rápido com Código de Rastreio'
      ],
      urgency_hook: '📦 Poucas unidades com envio promocional!',
      call_to_action: 'Comprar Produto Físico',
      source: 'copywriter_engine',
    };
  }

  // CASO 6: PRODUTOS DIGITAIS DE FESTA (Arquivos, topos, kits)
  if (isStationeryParty && isExplicitDigital) {
    const title = `${cleanName} - Arquivo Digital Editável e Pronto para Imprimir`;
    const description = `✨ **TRANSFORME SUA FESTA COM O ${title.toUpperCase()}!** ✨

Você quer criar uma comemoração inesquecível, cheia de encanto e sem passar horas quebrando a cabeça com design? Este arquivo foi feito especialmente para você surpreender seus convidados e clientes!

---

🎯 **O QUE VOCÊ VAI RECEBER:**
• Arquivos em **Altíssima Resolução (300 DPI)** garantindo impressões nítidas e cores vibrantes.
• Acesso imediato no seu e-mail e na tela após a confirmação do pagamento.
• Pronto para impressão em impressora jato de tinta ou laser (papel fotográfico, offset ou glossy).
• Fácil personalização com o nome e idade do aniversariante.

💡 **POR QUE ESTE ARQUIVO É PERFEITO PARA VOCÊ?**
✅ **Economia Inteligente:** Imprima quantas unidades precisar sem custos adicionais.
✅ **Praticidade Total:** Baixe instantaneamente e comece a produzir hoje mesmo.
✅ **Qualidade Profissional:** Artes desenvolvidas com acabamento de excelência para valorizar seu trabalho.

⏳ **OFERTA ESPECIAL POR TEMPO LIMITADO!**
Garanta seu acesso agora mesmo com desconto promocional e liberação automática via Pix ou Cartão. Clique em **Comprar Agora** e receba seu link imediatamente!`;

    return {
      title,
      description,
      suggested_badge: '⚡ Download Imediato',
      suggested_tags: ['Arquivo Digital', 'Kit Festa', 'Fácil de Imprimir', 'Alta Resolução'],
      benefits: [
        'Download Imediato e Vitalício',
        'Impressão Ilimitada em Alta Resolução (300 DPI)',
        'Fácil de Personalizar e Imprimir',
        'Suporte Dedicado via WhatsApp'
      ],
      urgency_hook: '⚡ Acesso automático liberado na hora via Pix!',
      call_to_action: 'Baixar Arquivos Agora',
      source: 'copywriter_engine',
    };
  }

  // CASO 7: PRODUTOS DIGITAIS GERAIS (Infoprodutos, Ebooks, Cursos, Templates, Planilhas, etc.)
  if (isExplicitDigital) {
    const title = `${cleanName} - Arquivo Digital Completo com Download Imediato`;
    const description = `🚀 **AGILIZE SEUS RESULTADOS COM ${cleanName.toUpperCase()}!** 🚀

Tenha acesso a um material digital completo, profissional e pronto para uso imediato! Desenvolvido para poupar o seu tempo e elevar a qualidade dos seus projetos com extrema praticidade.

---

🎯 **O QUE VOCÊ VAI RECEBER:**
• **Acesso Instantâneo e Vitalício:** Baixe imediatamente logo após a confirmação do pagamento.
• **Arquivos em Alta Resolução:** Formatos organizados, fáceis de editar e prontos para uso.
• **Compatibilidade Total:** Acesse no celular, computador ou tablet onde e quando quiser.
• **Economia Inteligente:** Sem frete, sem espera de entrega e com acesso direto.

💡 **VANTAGENS EXCLUSIVAS:**
✅ **Liberado na Hora:** Receba na tela e no seu e-mail cadastrado automaticamente.
✅ **Economia de Tempo:** Projeto pronto e testado para você aplicar imediatamente.
✅ **Suporte Garantido:** Canal direto para esclarecer dúvidas sobre o acesso.

⏳ **OFERTA ESPECIAL POR TEMPO LIMITADO!**
Clique em **Baixar Agora** e tenha acesso imediato a todo o conteúdo!`;

    return {
      title,
      description,
      suggested_badge: '⚡ Download Imediato',
      suggested_tags: ['Arquivo Digital', 'Download Imediato', 'Pronto para Uso', 'Alta Resolução', 'Acesso Vitalício'],
      benefits: [
        'Download imediato e vitalício após a confirmação',
        'Arquivos em altíssima resolução e prontos para uso',
        'Compatível com celular, computador e tablet',
        'Suporte dedicado via WhatsApp'
      ],
      urgency_hook: '⚡ Liberação automática instantânea via Pix!',
      call_to_action: 'Baixar Arquivos Agora',
      source: 'copywriter_engine',
    };
  }

  // CASO 8: PRODUTO FÍSICO GERAL (Universal para qualquer outro produto físico)
  const title = `${cleanName} - Qualidade Premium, Praticidade e Durabilidade`;
  const description = `✨ **VALORIZE SEU DIA A DIA COM ${cleanName.toUpperCase()}!** ✨

Se você busca máxima qualidade, acabamento refinado e excelente custo-benefício, o(a) **${cleanName}** é a escolha ideal! Fabricado com materiais de primeira linha para oferecer durabilidade, praticidade e satisfação total.

---

📦 **POR QUE ESCOLHER ESTE PRODUTO?**
• **Material de Alta Qualidade:** Matéria-prima selecionada que garante resistência e longa vida útil.
• **Acabamento Impecável:** Cuidado minucioso em cada detalhe para um visual elegante e funcional.
• **Praticidade Total:** Fácil de usar, versátil e perfeito para o dia a dia.
• **Garantia de Satisfação:** Produto revisado e testado antes do envio.

🚚 **ENVIO RÁPIDO E TRANSPORTE SEGURO:**
• Postagem ágil com código de rastreamento enviado diretamente no seu WhatsApp e E-mail.
• Embalagem reforçada e protegida para seu produto chegar 100% perfeito.
• Suporte dedicado para acompanhar seu pedido até a entrega.

⏳ **GARANTA O SEU ANTES QUE ACABEM OS ESTOQUES!**
Adicione ao carrinho, consulte seu CEP e clique em **Comprar Agora** com total segurança!`;

  return {
    title,
    description,
    suggested_badge: '⭐ Qualidade Garantida',
    suggested_tags: ['Qualidade Premium', 'Produto Físico', 'Alta Durabilidade', 'Praticidade', 'Mais Vendido'],
    benefits: [
      'Material de alta resistência e excelente acabamento',
      'Design funcional, moderno e versátil',
      'Embalagem reforçada e transporte 100% seguro',
      'Envio rápido com rastreamento atualizado'
    ],
    urgency_hook: '📦 Poucas unidades disponíveis com frete promocional!',
    call_to_action: 'Comprar Agora com Segurança',
    source: 'copywriter_engine',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const {
      product_name = '',
      category = '',
      is_digital = false,
      extra_context = '',
    }: GenerateProductAiRequest = req.body || {};

    const cleanName = product_name.trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        error: 'Informe ao menos o nome ou tema básico do produto para a IA gerar a copy.',
      });
    }

    // Procura chave da API Gemini nas variáveis de ambiente
    const geminiApiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();

    // Se houver chave Gemini, tenta a geração avançada via modelo Gemini
    if (geminiApiKey) {
      try {
        console.log('[AI Product Generator] 🤖 Chamando Google Gemini API para:', cleanName);

        const prompt = `Você é um Copywriter Sênior Especialista em E-commerce e Lojas Virtuais Multi-Nichos (Moda & Roupas, Eletrônicos, Beleza & Cuidados, Casa & Decoração, Papelaria & Festas, Acessórios e Produtos Digitais). Seu foco é criar descrições irresistíveis de Alta Conversão utilizando o framework AIDA (Atenção, Interesse, Desejo, Ação).

PRODUTO INFORMADO PELO LOJISTA:
- Nome/Título: "${cleanName}"
- Categoria: "${category || 'Geral'}"
- Tipo de Entrega: ${is_digital ? 'Arquivo Digital (Download Imediato, sem frete)' : 'Produto Físico (Enviado via Correios/Transportadora)'}
${extra_context ? `- Informações adicionais do lojista: "${extra_context}"` : ''}

REGRAS OBRIGATÓRIAS E CRÍTICAS:
1. IDENTIFICAÇÃO DO NICHO REAL:
   - Analise o nome ("${cleanName}") e a categoria com atenção absoluta.
   - SE FOR ROUPA OU MODA (ex: camisa, camiseta, manga longa, blusa, calça, vestido, bermuda, etc.): Escreva EXCLUSIVAMENTE sobre vestuário! Destaque tecido macio e respirável, caimento no corpo, modelagem anatômica, conforto para o dia a dia, costuras reforçadas, durabilidade das cores e estilo versátil. NUNCA mencione papel, papel fotográfico, impressão, gramatura ou corte eletrônico!
   - SE FOR ELETRÔNICO: Destaque desempenho, tecnologia, conectividade, durabilidade e praticidade.
   - SE FOR BELEZA/COSMÉTICOS: Destaque fórmula, cuidado diário, hidratação, bem-estar e resultados visíveis.
   - SE FOR PRODUTO DIGITAL: Destaque download imediato, alta resolução, praticidade e suporte.
   - APENAS mencione papelaria ou papel fotográfico se o produto for EXPLICITAMENTE de papelaria ou festa de papel.
2. ESTRUTURA PERSUASIVA (AIDA):
   - Gancho inicial chamativo com emojis elegantes.
   - Bullet points com os principais diferenciais e especificações reais do produto.
   - Informações sobre envio rápido com rastreamento (se físico) ou liberação imediata (se digital).
   - Chamada para ação com senso de urgência/escassez.
3. FORMATO DE RESPOSTA:
   Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos de código markdown ou texto extra ao redor) com a seguinte estrutura:
   {
     "title": "Título comercial chamativo e profissional (máximo 85 caracteres)",
     "description": "Texto persuasivo completo com quebras de linha e emojis elegantes",
     "suggested_badge": "Selo curto de destaque (ex: '🔥 Mais Vendido', '⭐ Alta Qualidade', '⚡ Lançamento', '⚡ Download Imediato')",
     "suggested_tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
     "benefits": [
       "Benefício específico do produto 1",
       "Benefício específico do produto 2",
       "Benefício específico do produto 3",
       "Benefício específico do produto 4"
     ],
     "urgency_hook": "Frase curta de urgência para fechar a compra agora",
     "call_to_action": "Texto do botão de compra coerente com o produto"
   }`;

        // Tentamos modelos modernos com fallback
        const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
        let geminiSuccess = false;

        for (const model of models) {
          if (geminiSuccess) break;
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1500,
                    responseMimeType: 'application/json',
                  },
                }),
              }
            );

            if (geminiRes.ok) {
              const data = await geminiRes.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              
              if (rawText) {
                try {
                  const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                  const parsed = JSON.parse(cleanedJson);

                  if (parsed.title && parsed.description) {
                    console.log(`[AI Product Generator] ✅ Copy gerada com sucesso via Gemini (${model})!`);
                    geminiSuccess = true;
                    return res.status(200).json({
                      success: true,
                      title: parsed.title,
                      description: parsed.description,
                      suggested_badge: parsed.suggested_badge || (is_digital ? '⚡ Download Imediato' : '🔥 Mais Vendido'),
                      suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags : [],
                      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
                      urgency_hook: parsed.urgency_hook || '',
                      call_to_action: parsed.call_to_action || (is_digital ? 'Baixar Agora' : 'Comprar Agora'),
                      source: 'gemini',
                    });
                  }
                } catch (jsonErr) {
                  console.warn(`[AI Product Generator] Falha ao fazer parse do JSON do Gemini (${model}):`, jsonErr);
                }
              }
            } else {
              console.warn(`[AI Product Generator] Status não OK de ${model}:`, geminiRes.status);
            }
          } catch (modelErr) {
            console.warn(`[AI Product Generator] Falha na requisição de ${model}:`, modelErr);
          }
        }
      } catch (geminiError) {
        console.warn('[AI Product Generator] Erro geral na chamada Gemini API:', geminiError);
      }
    }

    // Fallback garantido: motor de copywriting de alta conversão
    console.log('[AI Product Generator] ⚡ Utilizando motor heurístico de copywriting...');
    const heuristicResult = generateHeuristicSalesCopy(cleanName, category, is_digital);

    return res.status(200).json({
      success: true,
      ...heuristicResult,
    });
  } catch (error: any) {
    console.error('[AI Product Generator] ❌ Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao processar geração com inteligência artificial.',
    });
  }
}
