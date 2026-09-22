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
 * Motor heurístico inteligente de copywriting de alta conversão para papelaria, festas e produtos digitais/físicos.
 * Usado como garantia de 100% de disponibilidade em qualquer ambiente.
 */
function generateHeuristicSalesCopy(
  name: string,
  category: string = '',
  isDigital: boolean = true
): Omit<GeneratedProductAiResponse, 'success'> {
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
      is_digital = true,
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

    // Se houver chave Gemini, tenta a geração avançada via modelo Gemini 1.5/2.0
    if (geminiApiKey) {
      try {
        console.log('[AI Product Generator] 🤖 Chamando Google Gemini API para:', cleanName);

        const prompt = `Você é um Copywriter Especialista em E-commerce de Festas, Papelaria Personalizada e Produtos Digitais e Físicos com foco em Alta Conversão (AIDA: Atenção, Interesse, Desejo, Ação).

PRODUTO INFORMADO PELO LOJISTA:
- Nome/Tema: "${cleanName}"
- Categoria: "${category || 'Geral'}"
- Tipo de Produto: ${is_digital ? 'Arquivo Digital (para imprimir / download imediato)' : 'Produto Físico (será enviado por Correios/Frete)'}
${extra_context ? `- Informações adicionais: "${extra_context}"` : ''}

TAREFA:
Crie um cadastro de produto persuasivo e profissional.
Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos de código markdown ou texto ao redor) com a seguinte estrutura:

{
  "title": "Título comercial chamativo, otimizado para busca e vendas (máximo 80 caracteres)",
  "description": "Texto persuasivo completo contendo gancho inicial emocional, bullet points com o que acompanha, motivos para comprar, urgência/escassez e chamada para ação clara. Use formatação limpa com emojis e quebras de linha",
  "suggested_badge": "Selo de destaque curto (ex: '⚡ Mais Vendido', '🔥 Oferta Especial', '⭐ Destaque da Semana')",
  "suggested_tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "benefits": [
    "Benefício forte 1",
    "Benefício forte 2",
    "Benefício forte 3",
    "Benefício forte 4"
  ],
  "urgency_hook": "Frase curta de urgência (ex: 'Aproveite o preço de lançamento antes do encerramento da promoção!')",
  "call_to_action": "Texto do botão de compra (ex: 'Garantir Acesso Imediato')"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
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
              // Limpa possíveis marcadores markdown de json
              const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanedJson);

              if (parsed.title && parsed.description) {
                console.log('[AI Product Generator] ✅ Copy gerada com sucesso via Gemini!');
                return res.status(200).json({
                  success: true,
                  title: parsed.title,
                  description: parsed.description,
                  suggested_badge: parsed.suggested_badge || (is_digital ? '⚡ Download Imediato' : '⭐ Mais Vendido'),
                  suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags : [],
                  benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
                  urgency_hook: parsed.urgency_hook || '',
                  call_to_action: parsed.call_to_action || (is_digital ? 'Baixar Agora' : 'Comprar Agora'),
                  source: 'gemini',
                });
              }
            } catch (jsonErr) {
              console.warn('[AI Product Generator] Falha ao fazer parse do JSON do Gemini:', jsonErr);
            }
          }
        } else {
          console.warn('[AI Product Generator] Status não OK da Gemini API:', geminiRes.status);
        }
      } catch (geminiError) {
        console.warn('[AI Product Generator] Erro na chamada Gemini API:', geminiError);
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
