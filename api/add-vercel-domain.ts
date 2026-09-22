// @ts-nocheck
type VercelRequest = any;
type VercelResponse = any;

/**
 * Endpoint de backend para automatizar a adição de domínios personalizados dos clientes na Vercel API.
 * Documentação da Vercel: POST https://api.vercel.com/v9/projects/{projectId}/domains
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS para permitir requisições do frontend da plataforma
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
    const { domain, storeId } = req.body || {};

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'O parâmetro "domain" é obrigatório no corpo da requisição.' 
      });
    }

    // Limpa e normaliza o formato do domínio
    let cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');

    if (!cleanDomain || cleanDomain.includes(' ') || !cleanDomain.includes('.')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de domínio inválido. Exemplo correto: "sualoja.com.br" ou "www.sualoja.com.br".' 
      });
    }

    // Se for subdomínio nativo da plataforma, não requer inserção como domínio próprio na Vercel
    if (cleanDomain.endsWith('.ajpstore.com.br') || cleanDomain === 'ajpstore.com.br' || cleanDomain.includes('localhost')) {
      return res.status(200).json({
        success: true,
        isPlatformSubdomain: true,
        domain: cleanDomain,
        message: 'Subdomínio da plataforma não requer configuração adicional na Vercel.',
      });
    }

    // Credenciais seguras obtidas das variáveis de ambiente na Vercel
    const vercelToken = (
      process.env.VERCEL_AUTH_TOKEN || 
      process.env.VERCEL_TOKEN || 
      process.env.AUTH_BEARER_TOKEN || 
      ''
    ).trim();

    const projectId = (
      process.env.PROJECT_ID || 
      process.env.VERCEL_PROJECT_ID || 
      process.env.VERCEL_PROJECT_ID_ENV || 
      'soumbolinho-magic'
    ).trim();

    const teamId = (
      process.env.VERCEL_TEAM_ID || 
      process.env.TEAM_ID || 
      ''
    ).trim();

    if (!vercelToken) {
      console.warn('[add-vercel-domain] ⚠️ Variável VERCEL_AUTH_TOKEN ausente no ambiente da Vercel.');
      return res.status(200).json({
        success: false,
        notConfigured: true,
        domain: cleanDomain,
        message: 'Variável VERCEL_AUTH_TOKEN não configurada na Vercel. O domínio foi salvo no banco, mas adicione VERCEL_AUTH_TOKEN no painel da Vercel para automação completa.',
      });
    }

    // Monta URL da Vercel API
    let vercelApiUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains`;
    if (teamId) {
      vercelApiUrl += `?teamId=${encodeURIComponent(teamId)}`;
    }

    // Determina domínios a registrar (garante registro tanto de www quanto da raiz apex)
    const domainsToRegister = [cleanDomain];
    if (cleanDomain.startsWith('www.')) {
      const apex = cleanDomain.replace(/^www\./, '');
      if (apex && !domainsToRegister.includes(apex)) {
        domainsToRegister.push(apex);
      }
    } else if (!cleanDomain.startsWith('www.') && !cleanDomain.includes('.ajpstore.')) {
      const withWww = `www.${cleanDomain}`;
      if (!domainsToRegister.includes(withWww)) {
        domainsToRegister.push(withWww);
      }
    }

    console.log(`[add-vercel-domain] 🚀 Enviando domínios [${domainsToRegister.join(', ')}] para projeto Vercel "${projectId}"...`);

    let primaryResult: any = null;
    let anySuccess = false;
    let anyAlreadyExists = false;
    let lastError: any = null;

    for (const targetDomain of domainsToRegister) {
      try {
        const vercelResponse = await fetch(vercelApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: targetDomain,
          }),
        });

        const responseData = await vercelResponse.json();
        const errCode = responseData?.error?.code;
        const errMsg = responseData?.error?.message || '';

        if (vercelResponse.ok) {
          console.log(`[add-vercel-domain] ✅ Domínio "${targetDomain}" adicionado à Vercel com sucesso!`);
          anySuccess = true;
          if (!primaryResult) primaryResult = responseData;
        } else if (
          vercelResponse.status === 409 || 
          errCode === 'domain_already_in_use' || 
          errCode === 'domain_already_exists' || 
          errMsg.toLowerCase().includes('already')
        ) {
          console.log(`[add-vercel-domain] ℹ️ Domínio "${targetDomain}" já estava registrado no projeto.`);
          anyAlreadyExists = true;
          if (!primaryResult) primaryResult = responseData;
        } else {
          console.warn(`[add-vercel-domain] ⚠️ Resposta Vercel para "${targetDomain}":`, responseData);
          lastError = responseData?.error?.message || 'Falha ao registrar domínio na Vercel';
        }
      } catch (callErr: any) {
        console.warn(`[add-vercel-domain] Erro na chamada para "${targetDomain}":`, callErr);
        lastError = callErr?.message;
      }
    }

    if (anySuccess || anyAlreadyExists) {
      return res.status(200).json({
        success: true,
        alreadyExists: anyAlreadyExists && !anySuccess,
        domain: cleanDomain,
        domainsAdded: domainsToRegister,
        storeId,
        vercel: primaryResult,
        message: `Domínio(s) [${domainsToRegister.join(', ')}] configurado(s) com sucesso na Vercel!`,
      });
    }

    return res.status(200).json({
      success: false,
      domain: cleanDomain,
      error: lastError || 'Não foi possível cadastrar o domínio na Vercel.',
    });

  } catch (error: any) {
    console.error('[add-vercel-domain] ❌ Exceção ao processar domínio na Vercel:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro interno ao adicionar domínio na Vercel.',
    });
  }
}
