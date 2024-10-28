import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase_url = process.env.SUPABASE_URL;
const supabase_key = process.env.SUPABASE_KEY;

export const supabase = createClient(supabase_url,supabase_key);