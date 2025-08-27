// Express module augmentation
declare module 'express' {
  export interface Request {
    headers: any;
    body: any;
    params: any;
    query: any;
    user?: {
      walletAddress: string;
      role: string;
    };
    [key: string]: any;
  }

  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
    send(body: any): Response;
    [key: string]: any;
  }

  export type NextFunction = (err?: any) => void;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        walletAddress: string;
        role: string;
      };
    }
  }
}
