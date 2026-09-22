// Server-only Supabase client using the service_role key — this bypasses
// row-level security, which is fine here because these functions run in
// Vercel's backend, never in the browser. Never expose the service_role key
// to the frontend. Same pattern as the ai-lead-assistant project — this is
// the same Supabase project, just two new tables (blog_topics, blog_posts).

const { createClient } = require('@supabase/supabase-js');

let client = null;

function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

module.exports = { getSupabase };
