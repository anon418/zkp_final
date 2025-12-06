declare module 'snarkjs'
declare module 'qrcode.react'

// CORS 타입 선언 (server.ts용)
declare module 'cors' {
  import { RequestHandler } from 'express'
  interface CorsOptions {
    origin?:
      | string
      | string[]
      | ((
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void
        ) => void)
    credentials?: boolean
    methods?: string | string[]
    allowedHeaders?: string | string[]
    exposedHeaders?: string | string[]
    maxAge?: number
    preflightContinue?: boolean
    optionsSuccessStatus?: number
  }
  function cors(options?: CorsOptions): RequestHandler
  export = cors
}

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    on: (event: string, handler: (data: unknown) => void) => void
    removeListener: (event: string, handler: (data: unknown) => void) => void
  }
}
