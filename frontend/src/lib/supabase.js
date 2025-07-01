import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log(import.meta.env)
console.log(typeof supabaseUrl)
console.log(typeof supabaseAnonKey)




if (!supabaseUrl) {
  console.warn('Missing Supabase url environment variables. Please check your .env file.')
} 
if (!supabaseAnonKey) {
  console.warn('Missing Supabase anon key environment variables. Please check your .env file.')
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey) 