import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://sggpbjmxzooxwnwfodxp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_qdSxbI1gKD9SfS5gkclOaw_B_wK5sWD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
