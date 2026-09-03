import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export const RESERVED_ROUTES = [
  'admin',
  'api',
  'checkout',
  'cart',
  'carrinho',
  'finalizar-compra',
  'pagamento-cartao',
  'cartao',
  'login',
  'produtos',
  'produto'
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

    // 1. Rota /produto/:id
    const pathMatch = path.match(/\/produto\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      const decoded = decodeURIComponent(pathMatch[1]);
      return { id: decoded, slug: decoded } as unknown as T;
    }

    // 2. Rota hash #/produto/:id
    const hashMatch = h.match(/produto\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) {
      const decoded = decodeURIComponent(hashMatch[1]);
      return { id: decoded, slug: decoded } as unknown as T;
    }

    // 3. Rota amigável na raiz /:slug
    const cleanPath = path.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (cleanPath && !cleanPath.includes('/') && !RESERVED_ROUTES.includes(cleanPath)) {
      const decoded = decodeURIComponent(cleanPath);
      return { slug: decoded, id: decoded } as unknown as T;
    }

    // 4. Rota amigável hash #/:slug
    const cleanHash = h.replace(/^#\/?/, '').replace(/\/+$/, '').toLowerCase();
    if (cleanHash && !cleanHash.includes('/') && !RESERVED_ROUTES.includes(cleanHash)) {
      const decoded = decodeURIComponent(cleanHash);
      return { slug: decoded, id: decoded } as unknown as T;
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
    const currentPath = pathname.toLowerCase();
    const currentHash = hash.toLowerCase();

    const routeList = React.Children.toArray(children) as React.ReactElement<RouteProps>[];

    for (const child of routeList) {
      if (!React.isValidElement(child)) continue;
      const { path, element } = child.props;
      const targetPath = path.toLowerCase();

      // 1. Rota raiz exata
      if (targetPath === '/') {
        if (
          (currentPath === '/' || currentPath === '') &&
          (!currentHash || currentHash === '#' || currentHash === '#/')
        ) {
          return element;
        }
        continue;
      }

      // 2. Rota estática exata (ex: /admin, /checkout, /cart)
      if (!targetPath.includes(':')) {
        if (currentPath === targetPath) {
          return element;
        }

        const cleanHash = currentHash.replace(/^#\/?/, '/');
        if (cleanHash === targetPath || cleanHash.startsWith(`${targetPath}/`)) {
          return element;
        }
        continue;
      }

      // 3. Rota dinâmica de produto antigo: /produto/:id
      if (targetPath.startsWith('/produto/:')) {
        if (currentPath.startsWith('/produto/') || currentHash.includes('/produto/')) {
          return element;
        }
        continue;
      }

      // 4. Rota dinâmica amigável na raiz: /:slug
      if (targetPath === '/:slug') {
        const pathSegment = currentPath.replace(/^\/+|\/+$/g, '');
        const hashSegment = currentHash.replace(/^#\/?/, '').replace(/\/+$/, '');

        // Ignora palavras reservadas do sistema
        if (pathSegment && !pathSegment.includes('/') && !RESERVED_ROUTES.includes(pathSegment)) {
          return element;
        }
        if (hashSegment && !hashSegment.includes('/') && !RESERVED_ROUTES.includes(hashSegment)) {
          return element;
        }
        continue;
      }
    }

    // Se nenhuma rota bater e estiver na raiz, exibe a primeira rota
    if (routeList.length > 0 && (currentPath === '/' || currentPath === '')) {
      return routeList[0].props.element;
    }

    return null;
  }, [pathname, hash, children]);

  return <>{matchedElement}</>;
};

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <RouterProvider>{children}</RouterProvider>;
};
