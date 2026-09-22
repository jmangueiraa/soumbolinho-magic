import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export const RESERVED_ROUTES = [
  'admin',
  'orders',
  'pedidos',
  'portal',
  'meus-pedidos',
  'cliente',
  'master',
  'super-admin',
  'api',
  'checkout',
  'cart',
  'carrinho',
  'finalizar-compra',
  'pagamento-cartao',
  'cartao',
  'login',
  'produtos',
  'produto',
  'loja',
  'arquivos',
  'cadastro',
  'criar-loja',
  'planos',
  'comecar',
  'onboarding',
  'recursos',
  'como-funciona',
  'beneficios',
  'precos',
  'faq',
  'duvidas',
  'contato',
  'depoimentos',
  'demonstracao',
  'sobre',
  'garantia',
  'index.html',
  'favicon.ico',
  'favicon.svg',
  'assets',
  'src',
  '@vite',
  '@fs'
];

interface RouterContextType {
  pathname: string;
  hash: string;
  search: string;
  navigate: (to: string | number) => void;
}

const RouterContext = createContext<RouterContextType>({
  pathname: '/',
  hash: '',
  search: '',
  navigate: () => {},
});

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getRouteInfo = () => ({
    pathname: typeof window !== 'undefined' ? window.location.pathname || '/' : '/',
    hash: typeof window !== 'undefined' ? window.location.hash || '' : '',
    search: typeof window !== 'undefined' ? window.location.search || '' : '',
  });

  const [routeInfo, setRouteInfo] = useState(getRouteInfo);

  useEffect(() => {
    const handleLocationChange = () => {
      setRouteInfo(getRouteInfo());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (to: string | number) => {
    if (typeof window === 'undefined') return;

    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }

    if (to.startsWith('#')) {
      window.location.hash = to;
    } else {
      window.history.pushState(null, '', to);
      setRouteInfo(getRouteInfo());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouterContext.Provider
      value={{
        ...routeInfo,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

/**
 * Hook useParams seguro e determinístico:
 * Extrai os parâmetros diretamente da URL atual sem disparar setState durante a renderização.
 */
export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  const { pathname, hash } = useContext(RouterContext);

  return useMemo(() => {
    const path = (pathname || (typeof window !== 'undefined' ? window.location.pathname : '') || '').trim();
    const h = (hash || (typeof window !== 'undefined' ? window.location.hash : '') || '').trim();

    // 1. Rota aninhada de loja + produto: /loja/:storeSlug/produto/:slug ou /loja/:storeSlug/p/:id
    const lojaProdMatch = path.match(/\/loja\/([^/?#]+)\/(?:produto|p)\/([^/?#]+)/i) || h.match(/loja\/([^/?#]+)\/(?:produto|p)\/([^/?#]+)/i);
    if (lojaProdMatch && lojaProdMatch[1] && lojaProdMatch[2]) {
      const storeSlug = decodeURIComponent(lojaProdMatch[1]);
      const prodSlug = decodeURIComponent(lojaProdMatch[2]);
      return { storeSlug, slug: prodSlug, id: prodSlug, productId: prodSlug } as unknown as T;
    }

    // 2. Rota dinâmica direta: /produto/:slug ou /p/:id (pathname ou hash)
    const prodMatch = path.match(/\/(?:produto|p)\/([^/?#]+)/i) || h.match(/(?:produto|p)\/([^/?#]+)/i);
    if (prodMatch && prodMatch[1]) {
      const decoded = decodeURIComponent(prodMatch[1]);
      return { id: decoded, slug: decoded, productId: decoded } as unknown as T;
    }

    // 2.5. Rota /loja/:storeSlug ou /loja/:storeSlug/admin
    const lojaMatch = path.match(/\/loja\/([^/?#]+)/i) || h.match(/loja\/([^/?#]+)/i);
    if (lojaMatch && lojaMatch[1]) {
      const decoded = decodeURIComponent(lojaMatch[1]);
      return { storeSlug: decoded, slug: decoded, id: decoded } as unknown as T;
    }

    // 2.55. Rota direta /editaveisdocanva ou /editaveis-do-canva
    const editaveisMatch = path.match(/^\/(editaveisdocanva|editaveis-do-canva)(?:\/|$)/i) || h.match(/^#?\/?(editaveisdocanva|editaveis-do-canva)(?:\/|$)/i);
    if (editaveisMatch && editaveisMatch[1]) {
      const decoded = decodeURIComponent(editaveisMatch[1]);
      return { storeSlug: decoded, slug: decoded, id: decoded } as unknown as T;
    }

    // 2.6. Rota /:storeSlug/admin direta (com ou sem subrotas como /orders)
    const rootAdminMatch = path.match(/^\/([^/?#]+)\/admin(?:\/.*)?$/i) || h.match(/^#?\/?([^/?#]+)\/admin(?:\/.*)?$/i);
    if (rootAdminMatch && rootAdminMatch[1]) {
      const decoded = decodeURIComponent(rootAdminMatch[1]);
      if (!RESERVED_ROUTES.includes(decoded.toLowerCase())) {
        return { storeSlug: decoded, slug: decoded, id: decoded } as unknown as T;
      }
    }

    // 3. Rota amigável na raiz /:slug
    const cleanPath = path.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (cleanPath && !cleanPath.includes('/') && !RESERVED_ROUTES.includes(cleanPath)) {
      const decoded = decodeURIComponent(cleanPath);
      return { slug: decoded, id: decoded, productId: decoded } as unknown as T;
    }

    // 4. Rota amigável hash #/:slug (apenas para rotas SPA explícitas com #/)
    if (h.startsWith('#/')) {
      const cleanHash = h.replace(/^#\/?/, '').replace(/\/+$/, '').toLowerCase();
      if (cleanHash && !cleanHash.includes('/') && !RESERVED_ROUTES.includes(cleanHash)) {
        const decoded = decodeURIComponent(cleanHash);
        return { slug: decoded, id: decoded, productId: decoded } as unknown as T;
      }
    }

    return {} as unknown as T;
  }, [pathname, hash]);
}

export function useNavigate() {
  const { navigate } = useContext(RouterContext);
  return navigate;
}

export function useLocation() {
  const { pathname, hash, search } = useContext(RouterContext);
  return { pathname, hash, search };
}

export interface RouteProps {
  path: string;
  element: React.ReactNode;
}

export const Route: React.FC<RouteProps> = ({ element }) => {
  return <>{element}</>;
};

export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname, hash } = useContext(RouterContext);

  const matchedElement = useMemo(() => {
    // Normaliza path removendo barras duplicadas ou finais (exceto raiz "/")
    const rawPath = (pathname || '/').toLowerCase().trim();
    const cleanPath = rawPath.replace(/\/+$/, '') || '/';

    // Normaliza hash removendo # e barras finais (ex: "#/master" -> "/master")
    const rawHash = (hash || '').toLowerCase().trim();
    const hashOnly = rawHash.replace(/^#\/?/, '').replace(/\/+$/, '');
    const cleanHash = hashOnly ? `/${hashOnly}` : '';

    // Verifica se o hash é uma âncora interna de seção (ex: #recursos, #como-funciona, #beneficios, #precos, #faq, #cadastro)
    const isInPageAnchor = !rawHash.startsWith('#/') && [
      'recursos', 'como-funciona', 'beneficios', 'precos', 'faq', 'cadastro', 
      'planos', 'comecar', 'onboarding', 'duvidas', 'contato', 'sobre', 'garantia'
    ].includes(hashOnly);

    const routeList = React.Children.toArray(children) as React.ReactElement<RouteProps>[];

    for (const child of routeList) {
      if (!React.isValidElement(child)) continue;
      const { path, element } = child.props;
      const targetPath = (path || '').toLowerCase().trim();
      const cleanTarget = targetPath.replace(/\/+$/, '') || '/';

      // 1. Rota raiz exata
      if (cleanTarget === '/') {
        if (
          (cleanPath === '/' || cleanPath === '' || cleanPath === '/index.html') &&
          (!cleanHash || cleanHash === '/' || cleanHash === '' || isInPageAnchor)
        ) {
          return element;
        }
        continue;
      }

      // 2. Rota estática exata (ex: /admin, /master, /checkout, /cart)
      if (!cleanTarget.includes(':')) {
        // Bate por pathname direto (/master ou /master/)
        if (cleanPath === cleanTarget) {
          return element;
        }

        // Bate por hash (#/master, #master ou #/master/)
        if (cleanHash === cleanTarget || cleanHash.startsWith(`${cleanTarget}/`)) {
          return element;
        }
        continue;
      }

      // 3. Rota dinâmica aninhada de produto em loja: /loja/:storeSlug/produto/:slug ou /loja/:storeSlug/p/:id
      if (cleanTarget.startsWith('/loja/:') && (cleanTarget.includes('/produto/:') || cleanTarget.includes('/p/:'))) {
        const hasLojaProd = (cleanPath.startsWith('/loja/') && (cleanPath.includes('/produto/') || cleanPath.includes('/p/'))) ||
          (cleanHash.startsWith('/loja/') && (cleanHash.includes('/produto/') || cleanHash.includes('/p/')));
        if (hasLojaProd) {
          return element;
        }
        continue;
      }

      // 3.5. Rota dinâmica de produto: /produto/:slug, /produto/:id ou /p/:id
      if (cleanTarget.startsWith('/produto/:') || cleanTarget.startsWith('/p/:')) {
        const prodMatch = cleanPath.match(/^\/(?:produto|p)\/([^/?#]+)/i) || cleanHash.match(/^\/(?:produto|p)\/([^/?#]+)/i);
        if (prodMatch && prodMatch[1]) {
          const seg = prodMatch[1].trim();
          if (seg && !RESERVED_ROUTES.includes(seg.toLowerCase())) {
            return element;
          }
        }
        continue;
      }

      // 3.6. Rota dinâmica de loja: /loja/:storeSlug ou /loja/:storeSlug/admin (incluindo subrotas como /orders)
      if (cleanTarget.startsWith('/loja/:')) {
        const isLojaAdmin = cleanTarget.includes('/admin');
        const hasLojaPrefix = cleanPath.startsWith('/loja/') || cleanHash.startsWith('/loja/');
        const isProductSubpath = cleanPath.includes('/produto/') || cleanPath.includes('/p/') || cleanHash.includes('/produto/') || cleanHash.includes('/p/');
        if (hasLojaPrefix && !isProductSubpath) {
          const currentIsAdmin = cleanPath.includes('/admin') || cleanHash.includes('/admin');
          if (isLojaAdmin === currentIsAdmin) {
            return element;
          }
        }
        continue;
      }

      // 3.7. Rota dinâmica direta de admin da loja: /:slug/admin (incluindo subrotas como /orders)
      if (cleanTarget === '/:slug/admin' || cleanTarget.includes('/:slug/admin')) {
        const adminMatch = cleanPath.match(/^\/([^/?#]+)\/admin(?:\/.*)?$/i) || cleanHash.match(/^#?\/?([^/?#]+)\/admin(?:\/.*)?$/i);
        if (adminMatch && adminMatch[1]) {
          const seg = adminMatch[1].toLowerCase().trim();
          if (!RESERVED_ROUTES.includes(seg)) {
            return element;
          }
        }
        continue;
      }

      // 4. Rota dinâmica amigável na raiz: /:slug
      if (cleanTarget === '/:slug') {
        const pathSegment = cleanPath.replace(/^\/+|\/+$/g, '');
        const hashSegment = cleanHash.replace(/^\/+|\/+$/g, '');

        // Ignora palavras reservadas do sistema e âncoras internas
        if (pathSegment && !pathSegment.includes('/') && !RESERVED_ROUTES.includes(pathSegment)) {
          return element;
        }
        if (rawHash.startsWith('#/') && hashSegment && !hashSegment.includes('/') && !RESERVED_ROUTES.includes(hashSegment) && !isInPageAnchor) {
          return element;
        }
        continue;
      }
    }

    // Fallback Resiliente: se nenhuma rota bater ou URL for inválida, renderiza a primeira rota (Home / StoreFront)
    if (routeList.length > 0) {
      return routeList[0].props.element;
    }

    return null;
  }, [pathname, hash, children]);

  return <>{matchedElement}</>;
};

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <RouterProvider>{children}</RouterProvider>;
};
