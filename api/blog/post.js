// GET /api/blog/post?slug=... — a single published post. Public.
const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, content_html, published_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Post not found' });
    return res.status(200).json({ post: data });
  } catch (err) {
    console.error('blog/post error:', err.message || err);
    return res.status(500).json({ error: 'Could not load this post.' });
  }
};
