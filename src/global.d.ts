// src/global.d.ts

/** Global Deno declarations for edge function TypeScript compilation */
declare const Deno: {
  env: {
    /** Returns the value of an environment variable or undefined */
    get(key: string): string | undefined;
  };
  // Add any other Deno globals you need (e.g., exit, args) as `any` to silence TS errors.
  [key: string]: any;
};

/** Module declaration for remote Supabase JS import used in edge functions */
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  // Export the minimal types used in the project as `any` to avoid TS errors.
  const supabase: any;
  export default supabase;
  export const createClient: any;
  export const createClientAsync: any;
  // Add other named exports as needed.
}
