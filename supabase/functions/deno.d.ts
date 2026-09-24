// =========================================================
// Ambient Type Declarations for Supabase Edge Functions (Deno Runtime)
// File: supabase/functions/deno.d.ts
//
// Provides IDE language server definitions for Deno globals
// and URL-based ESM module imports used by Supabase Edge Functions.
// =========================================================

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export const serve: any;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const GoogleGenerativeAI: any;
  export const crypto: any;
  export const hmac: any;
}
