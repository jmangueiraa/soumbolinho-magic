import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

interface RouterContextType {
  pathname: string;
  hash: string;
  search: string;
  navigate: (to: string | number) => void;
  params: Record<string, string>;
  setParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const RouterContext = createContext<RouterContextType>({
  pathname: '/',
  hash: '',
  search: '',
  navigate: () => {},
  params: {},
  setParams: () => {},
});

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getRouteInfo = () => {
    return {
      pathname: typeof window !== 'undefined' ? window.location.pathname || '/' : '/',
      hash: typeof window !== 'undefined' ? window.location.hash || '' : '',
      search: typeof window !== 'undefined' ? window.location.search || '' : '',
    };
  };

  const [routeInfo, setRouteInfo] = useState(getRouteInfo);
  const [params, setParams] = useState<Record<string, string>>({});

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
        params,
        setParams,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

const SYSTEM_ROUTES = [
  'admin',
  'checkout',
  'finalizar-compra',
  'pagamento-cartao',
  'cartao',
  'login',
  'api'
];

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  const { params } = useContext(RouterContext);
  
  // Extra safety: detect parameters directly from window URL if accessed directly or via external link
  const directParams = useMemo(() => {
    if (typeof window === 'undefined') return params;

    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // 1. Check path /produto/:id
    const pathMatch = path.match(/\/produto\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      const decoded = decodeURIComponent(pathMatch[1]);
      return { id: decoded, slug: decoded, ...params };
    }

    // 2. Check hash #/produto/:id
    const hashMatch = hash.match(/produto\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) {
      const decoded = decodeURIComponent(hashMatch[1]);
      return { id: decoded, slug: decoded, ...params };
    }

    // 3. Check root /:slug
    const cleanPath = path.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (cleanPath && !cleanPath.includes('/') && !SYSTEM_ROUTES.includes(cleanPath)) {
      const decoded = decodeURIComponent(cleanPath);
      return { slug: decoded, id: decoded, ...params };
    }

    // 4. Check root hash #/:slug
    const cleanHash = hash.replace(/^#\/?/, '').replace(/\/+$/, '').toLowerCase();
    if (cleanHash && !cleanHash.includes('/') && !SYSTEM_ROUTES.includes(cleanHash)) {
      const decoded = decodeURIComponent(cleanHash);
      return { slug: decoded, id: decoded, ...params };
    }

    return params;
  }, [params]);

  return directParams as unknown as T;
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
  const { pathname, hash, setParams } = useContext(RouterContext);

  const matchedElement = useMemo(() => {
    const currentPath = pathname.toLowerCase();
    const currentHash = hash.toLowerCase();

    const routeList = React.Children.toArray(children) as React.ReactElement<RouteProps>[];

    for (const child of routeList) {
      if (!React.isValidElement(child)) continue;
      const { path, element } = child.props;
      const targetPath = path.toLowerCase();

      // Parameterized route: e.g. /produto/:id
      if (targetPath.includes(':')) {
        const paramNames: string[] = [];
        const regexStr = targetPath.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
          paramNames.push(paramName);
          return '([^/?#]+)';
        });
        const regex = new RegExp(`^${regexStr}$`, 'i');

        // Test against pathname
        const pathMatch = currentPath.match(regex);
        if (pathMatch) {
          const extractedParams: Record<string, string> = {};
          paramNames.forEach((name, index) => {
            extractedParams[name] = decodeURIComponent(pathMatch[index + 1]);
          });
          if (targetPath === '/:slug' && SYSTEM_ROUTES.includes(extractedParams['slug']?.toLowerCase())) {
            continue;
          }
          setParams(extractedParams);
          return element;
        }

        // Test against hash (e.g. #/produto/123 or #produto/123)
        const cleanHash = currentHash.replace(/^#\/?/, '/');
        const hashMatch = cleanHash.match(regex);
        if (hashMatch) {
          const extractedParams: Record<string, string> = {};
          paramNames.forEach((name, index) => {
            extractedParams[name] = decodeURIComponent(hashMatch[index + 1]);
          });
          if (targetPath === '/:slug' && SYSTEM_ROUTES.includes(extractedParams['slug']?.toLowerCase())) {
            continue;
          }
          setParams(extractedParams);
          return element;
        }
      } else {
        // Exact or root match
        if (targetPath === '/' && (currentPath === '/' || currentPath === '') && (!currentHash || currentHash === '#' || currentHash === '#/')) {
          return element;
        }

        if (targetPath !== '/' && currentPath === targetPath) {
          return element;
        }

        const cleanHash = currentHash.replace(/^#\/?/, '/');
        if (cleanHash === targetPath || (targetPath !== '/' && cleanHash.startsWith(targetPath))) {
          return element;
        }
      }
    }

    // Default fallback to first element if at root
    if (routeList.length > 0 && (currentPath === '/' || currentPath === '')) {
      return routeList[0].props.element;
    }

    return null;
  }, [pathname, hash, children, setParams]);

  return <>{matchedElement}</>;
};

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <RouterProvider>{children}</RouterProvider>;
};
