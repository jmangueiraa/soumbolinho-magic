export interface GenerateProductAiParams {
  productName: string;
  category?: string;
  isDigital?: boolean;
  extraContext?: string;
}

export interface AiProductGenerationResult {
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
 * Gerador de copy de vendas de alta conversão no cliente (fallback offline / dev).
 */
function generateLocalSalesCopy(
  name: string,
  category: string = '',
  isDigital: boolean = true
): Omit<AiProductGenerationResult, 'success'> {
  const cleanName = name.trim();
  const theme = cleanName.replace(/^(kit|arquivo|combo|pacote|topo|caixa|lembrancinha|festa|molde)\s+/i, '');
  const capitalizedTheme = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : 'Personalizado';

  let title = '';
  if (isDigital) {
    if (/kit|combo|festa/i.test(cleanName)) {
      title = `Kit Festa Completo ${capitalizedTheme} - Arquivo Digital Editável no Canva`;
    } else if (/topo/i.test(cleanName)) {
      title = `Topo de Bolo ${capitalizedTheme} Personalizado - Arquivo Digital Pronto para Imprimir`;
    } else if (/caixa|milk|piramide/i.test(cleanName)) {
      title = `Molde Caixa ${capitalizedTheme} - Arquivo de Corte & Impressão Alta Resolução`;
    } else {
      title = `${cleanName} ${capitalizedTheme} - Arquivo Digital em Alta Resolução`;
    }
  } else {
    title = `${cleanName} - Personalizado em Papel Fotográfico de Alta Gramatura`;
  }

  const digitalDescription = `✨ **TRANSFORME SUA FESTA COM O ${title.toUpperCase()}!** ✨

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

  const physicalDescription = `✨ **SURPREENDA A TODOS COM ${title.toUpperCase()}!** ✨

Encante seus convidados com uma papelaria afetiva de altíssima qualidade, produzida com muito carinho e acabamento impecável para tornar sua celebração única e memorável!

---

📦 **DETALHES DO PRODUTO:**
• Impressão profissional em papel fotográfico de alta gramatura (cores vivas e durabilidade).
• Corte preciso em máquina profissional com vincos e dobras perfeitas.
• Já vai semi-montado ou montado com fitas e apliques especiais conforme a foto.
• Embalado com máxima proteção para chegar intacto até sua residência.

🚚 **PRAZOS E ENVIO RÁPIDO:**
• Produção ágil e envio com código de rastreamento direto no seu WhatsApp.
• Opção de envio econômico (PAC), expresso (Sedex) ou retirada no local.

⏳ **GARANTA O SEU ANTES DE ESGOTAR O ESTOQUE DESTE TEMA!**
Adicione ao seu carrinho agora mesmo, informe seu CEP para calcular o prazo e finalize seu pedido com total segurança!`;

  const benefits = isDigital
    ? [
        'Download Imediato e Vitalício',
        'Impressão Ilimitada em Alta Resolução (300 DPI)',
        'Fácil de Personalizar e Imprimir',
        'Suporte Dedicado via WhatsApp'
      ]
    : [
        'Produzido em Papel Fotográfico Premium',
        'Corte Eletrônico Preciso de Alta Definição',
        'Embalagem Super Reforçada e Segura',
        'Envio Rápido com Código de Rastreio'
      ];

  const suggestedTags = [
    capitalizedTheme,
    isDigital ? 'Arquivo Digital' : 'Produto Físico',
    'Personalizados',
    'Festa Infantil',
    'Decoração de Festa',
    'Papelaria Criativa'
  ];

  return {
    title,
    description: isDigital ? digitalDescription : physicalDescription,
    suggested_badge: isDigital ? '⚡ Download Imediato' : '⭐ Mais Vendido',
    suggested_tags: suggestedTags,
    benefits,
    urgency_hook: isDigital ? '⚡ Acesso automático liberado na hora via Pix!' : '📦 Poucas unidades com envio promocional!',
    call_to_action: isDigital ? 'Baixar Arquivos Agora' : 'Comprar Produto Físico',
    source: 'copywriter_engine',
  };
}

/**
 * Dispara geração de título e descrição de alta conversão usando IA.
 */
export async function generateProductWithAi(
  params: GenerateProductAiParams
): Promise<AiProductGenerationResult> {
  const cleanName = params.productName?.trim();
  if (!cleanName) {
    return {
      success: false,
      title: '',
      description: '',
      suggested_tags: [],
      benefits: [],
      error: 'Informe um nome ou tema para o produto antes de gerar.',
    };
  }

  // 1. Tentar chamada à rota serverless da aplicação
  try {
    const res = await fetch('/api/generate-product-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: cleanName,
        category: params.category || '',
        is_digital: params.isDigital !== undefined ? params.isDigital : true,
        extra_context: params.extraContext || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.title && data.description) {
        return {
          success: true,
          title: data.title,
          description: data.description,
          suggested_badge: data.suggested_badge,
          suggested_tags: data.suggested_tags || [],
          benefits: data.benefits || [],
          urgency_hook: data.urgency_hook,
          call_to_action: data.call_to_action,
          source: data.source || 'gemini',
        };
      }
    }
  } catch (apiError) {
    console.warn('[aiProductService] Servidor local sem rota serverless ativa, usando motor de copywriting cliente:', apiError);
  }

  // 2. Fallback local instantâneo com garantia de 100% de disponibilidade
  const localCopy = generateLocalSalesCopy(cleanName, params.category, params.isDigital);
  return {
    success: true,
    ...localCopy,
  };
}
