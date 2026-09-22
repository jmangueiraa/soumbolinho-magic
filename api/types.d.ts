declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare module '@vercel/node' {
  export interface VercelRequest {
    body: any;
    query: { [key: string]: string | string[] | undefined };
    cookies: { [key: string]: string | undefined };
    method?: string;
    headers: { [key: string]: string | string[] | undefined };
    url?: string;
    [key: string]: any;
  }

  export interface VercelResponse {
    status: (statusCode: number) => VercelResponse;
    json: (data: any) => VercelResponse;
    send: (data: any) => VercelResponse;
    setHeader: (name: string, value: string | number | readonly string[]) => VercelResponse;
    end: (cb?: () => void) => VercelResponse;
    [key: string]: any;
  }
}
