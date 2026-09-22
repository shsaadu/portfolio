// GET /api/blog/posts — list published posts, newest first. Public.
const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ posts: data || [] });
  } catch (err) {
    console.error('blog/posts error:', err.message || err);
    // No database yet, or a transient error — the blog page still renders,
    // just with no posts, instead of crashing.
    return res.status(200).json({ posts: [] });
  }
};
