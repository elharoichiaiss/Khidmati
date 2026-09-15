import { createClient } from "@supabase/supabase-js";

const env = (import.meta as any)?.env || {};

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  "https://sviuhrsftubdghvjwzox.supabase.co";
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_SOcSwbe4oXpPZ7HvYOzJeA_x--R7S_G";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
