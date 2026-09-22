// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

export interface CalculateShippingRequest {
  destination_cep?: string;
  origin_cep?: string;
  melhor_envio_token?: string;
  cart_total?: number;
  package_weight_kg?: number;
  package_dimensions?: {
    height_cm?: number;
    width_cm?: number;
    length_cm?: number;
  };
}

export interface ShippingOptionResult {
  id: string;
  name: string;
  price: number;
  deadline: string;
  carrier: string;
  isFree?: boolean;
  description?: string;
  company_picture?: string;
}

/**
 * Consulta de endereço a partir do CEP via ViaCEP
 */
async function lookupViaCep(cep: string): Promise<{ city: string; state: string; street: string; neighborhood: string } | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro === true || data.erro === 'true') return null;
    return {
      city: data.localidade || '',
      state: data.uf || '',
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
    };
  } catch {
    return null;
  }
}

/**
 * Motor de cotação dinâmica de contingência caso o token do Melhor Envio não esteja cadastrado ou a API fique offline.
 * Calcula prazos e valores realistas baseados na distância entre estados brasileiros.
 */
function calculateFallbackApiQuotes(
  originState: string,
  destState: string,
  originCity: string,
  destCity: string
): ShippingOptionResult[] {
  const isSameCity = originCity && destCity && originCity.toLowerCase() === destCity.toLowerCase();
  const isSameState = originState && destState && originState.toUpperCase() === destState.toUpperCase();

  const isSudesteSul = (st: string) => ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS'].includes(st.toUpperCase());
  const isSameRegion = isSudesteSul(originState) && isSudesteSul(destState);

  let pacPrice = 24.90;
  let pacDays = '6 a 8 dias úteis';
  let sedexPrice = 36.90;
  let sedexDays = '2 a 3 dias úteis';
  let jadlogPrice = 21.90;
  let jadlogDays = '5 a 7 dias úteis';

  if (isSameCity) {
    pacPrice = 16.50;
    pacDays = '2 a 3 dias úteis';
    sedexPrice = 22.90;
    sedexDays = '1 dia útil';
    jadlogPrice = 14.90;
    jadlogDays = '1 a 2 dias úteis';
  } else if (isSameState) {
    pacPrice = 19.90;
    pacDays = '3 a 5 dias úteis';
    sedexPrice = 28.50;
    sedexDays = '1 a 2 dias úteis';
    jadlogPrice = 18.00;
    jadlogDays = '3 a 4 dias úteis';
  } else if (isSameRegion) {
    pacPrice = 23.50;
    pacDays = '5 a 7 dias úteis';
    sedexPrice = 34.90;
    sedexDays = '2 a 3 dias úteis';
    jadlogPrice = 22.50;
    jadlogDays = '4 a 6 dias úteis';
  } else {
    // Interestadual longa distância
    pacPrice = 32.90;
    pacDays = '8 a 12 dias úteis';
    sedexPrice = 54.90;
    sedexDays = '3 a 5 dias úteis';
    jadlogPrice = 29.90;
    jadlogDays = '7 a 10 dias úteis';
  }

  return [
    {
      id: 'me_jadlog_package',
      name: '.Package (Jadlog)',
      price: jadlogPrice,
      deadline: jadlogDays,
      carrier: 'Jadlog',
      isFree: false,
    },
    {
      id: 'me_correios_pac',
      name: 'PAC (Correios)',
      price: pacPrice,
      deadline: pacDays,
      carrier: 'Correios',
      isFree: false,
    },
    {
      id: 'me_correios_sedex',
      name: 'SEDEX Expresso (Correios)',
      price: sedexPrice,
      deadline: sedexDays,
      carrier: 'Correios',
      isFree: false,
    },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const {
      destination_cep,
      origin_cep,
      melhor_envio_token,
      package_weight_kg = 0.5,
      package_dimensions = {},
    }: CalculateShippingRequest = req.body || {};

    const cleanDest = String(destination_cep || '').replace(/\D/g, '');
    const cleanOrigin = String(origin_cep || '01001000').replace(/\D/g, '');
    const cleanToken = String(melhor_envio_token || '').trim();

    if (cleanDest.length !== 8) {
      return res.status(400).json({
        success: false,
        error: 'Informe um CEP de destino válido com 8 dígitos.',
      });
    }

    // 1. Busca dados do endereço de destino e origem
    const [destAddress, originAddress] = await Promise.all([
      lookupViaCep(cleanDest),
      lookupViaCep(cleanOrigin),
    ]);

    if (!destAddress) {
      return res.status(400).json({
        success: false,
        error: 'CEP de destino não encontrado. Verifique o número digitado.',
      });
    }

    const height = Math.max(2, package_dimensions.height_cm || 8);
    const width = Math.max(11, package_dimensions.width_cm || 15);
    const length = Math.max(16, package_dimensions.length_cm || 20);
    const weight = Math.max(0.1, Number(package_weight_kg) || 0.5);

    // 2. Se houver token do Melhor Envio, tenta chamar a API oficial
    if (cleanToken) {
      try {
        const payload = {
          from: {
            postal_code: cleanOrigin,
          },
          to: {
            postal_code: cleanDest,
          },
          package: {
            height,
            width,
            length,
            weight,
          },
          options: {
            receipt: false,
            own_hand: false,
          },
        };

        const meResponse = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
            'User-Agent': 'AJPSTORE Multi-Tenant Shipping (contato@ajpstore.com)',
          },
          body: JSON.stringify(payload),
        });

        if (meResponse.ok) {
          const quotes = await meResponse.json();

          if (Array.isArray(quotes) && quotes.length > 0) {
            const validOptions: ShippingOptionResult[] = quotes
              .filter((item: any) => !item.error && parseFloat(item.price || item.custom_price || 0) > 0)
              .map((item: any) => {
                const companyName = item.company?.name || 'Transportadora';
                const serviceName = item.name || 'Envio';
                const deliveryTime = item.delivery_time || item.custom_delivery_time || 5;
                const priceNum = parseFloat(item.custom_price || item.price || 0);

                return {
                  id: `me_${item.id}_${item.company?.id || ''}`,
                  name: `${serviceName} (${companyName})`,
                  price: priceNum,
                  deadline: `${deliveryTime} ${deliveryTime === 1 ? 'dia útil' : 'dias úteis'}`,
                  carrier: companyName,
                  isFree: false,
                  company_picture: item.company?.picture || undefined,
                };
              });

            if (validOptions.length > 0) {
              // Ordena do menor preço para o maior
              validOptions.sort((a, b) => a.price - b.price);

              return res.status(200).json({
                success: true,
                source: 'melhor_envio_api',
                options: validOptions,
                address: {
                  cep: cleanDest.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
                  street: destAddress.street,
                  neighborhood: destAddress.neighborhood,
                  city: destAddress.city,
                  state: destAddress.state,
                },
              });
            }
          }
        } else {
          console.warn('[calculate-shipping] Resposta não-ok do Melhor Envio:', meResponse.status);
        }
      } catch (meErr) {
        console.warn('[calculate-shipping] Erro ao conectar com API do Melhor Envio:', meErr);
      }
    }

    // 3. Fallback inteligente com cálculo dinâmico baseado em distância entre cidades e estados
    const fallbackQuotes = calculateFallbackApiQuotes(
      originAddress?.state || 'SP',
      destAddress.state,
      originAddress?.city || 'São Paulo',
      destAddress.city
    );

    return res.status(200).json({
      success: true,
      source: cleanToken ? 'melhor_envio_fallback' : 'api_engine',
      options: fallbackQuotes,
      address: {
        cep: cleanDest.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        street: destAddress.street,
        neighborhood: destAddress.neighborhood,
        city: destAddress.city,
        state: destAddress.state,
      },
    });
  } catch (err: any) {
    console.error('[calculate-shipping] Erro interno:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular frete via API. Tente novamente.',
    });
  }
}
