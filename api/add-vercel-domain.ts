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
      ''
    ).trim();

    const teamId = (
      process.env.VERCEL_TEAM_ID || 
      process.env.TEAM_ID || 
      ''
    ).trim();

    if (!vercelToken || !projectId) {
      console.warn('[add-vercel-domain] ⚠️ Variáveis VERCEL_AUTH_TOKEN e/ou PROJECT_ID ausentes no ambiente.');
      return res.status(200).json({
        success: false,
        notConfigured: true,
        domain: cleanDomain,
        message: 'Variáveis VERCEL_AUTH_TOKEN e PROJECT_ID não configuradas no ambiente da Vercel. O domínio foi salvo no banco de dados, mas adicione as variáveis no painel da Vercel para automação completa.',
      });
    }

    // Monta URL da Vercel API
    let vercelApiUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains`;
    if (teamId) {
      vercelApiUrl += `?teamId=${encodeURIComponent(teamId)}`;
    }

    console.log(`[add-vercel-domain] 🚀 Enviando domínio "${cleanDomain}" para projeto Vercel "${projectId}"...`);

    const vercelResponse = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanDomain,
      }),
    });

    const responseData = await vercelResponse.json();

    // 1. Sucesso ao adicionar o domínio
    if (vercelResponse.ok) {
      console.log(`[add-vercel-domain] ✅ Domínio "${cleanDomain}" adicionado à Vercel com sucesso!`);
      return res.status(200).json({
        success: true,
        domain: cleanDomain,
        storeId,
        vercel: responseData,
        message: `Domínio "${cleanDomain}" adicionado com sucesso ao seu projeto na Vercel!`,
      });
    }

    // 2. Caso o domínio já pertença ou já tenha sido adicionado a este projeto (409 Conflict ou código domain_already_in_use)
    const errCode = responseData?.error?.code;
    const errMsg = responseData?.error?.message || '';

    if (vercelResponse.status === 409 || errCode === 'domain_already_in_use' || errCode === 'domain_already_exists' || errMsg.toLowerCase().includes('already')) {
      console.log(`[add-vercel-domain] ℹ️ Domínio "${cleanDomain}" já estava registrado no projeto.`);
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        domain: cleanDomain,
        storeId,
        message: `O domínio "${cleanDomain}" já está ativo no seu projeto na Vercel.`,
      });
    }

    // 3. Outros erros da API da Vercel (401 unauthorized, 403 forbidden, 404 project not found, etc.)
    console.error(`[add-vercel-domain] ❌ Erro da Vercel API (${vercelResponse.status}):`, responseData);
    return res.status(200).json({
      success: false,
      domain: cleanDomain,
      status: vercelResponse.status,
      error: responseData?.error?.message || 'Falha ao comunicar com a API da Vercel.',
      code: errCode,
    });

  } catch (error: any) {
    console.error('[add-vercel-domain] ❌ Exceção ao processar domínio na Vercel:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro interno ao adicionar domínio na Vercel.',
    });
  }
}
