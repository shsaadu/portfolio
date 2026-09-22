// GET  /api/blog/admin/drafts        — list all posts (any status), newest first.
// PATCH /api/blog/admin/drafts       — edit a post's fields, and/or change its
//                                       status (publish / reject) from the UI,
//                                       as an alternative to the email links.
const { getSupabase } = require('../../_lib/supabase');
const { requireAuth } = require('../../_lib/admin-auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content_html, topic, status, created_at, published_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ posts: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, title, excerpt, content_html: contentHtml, status } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (contentHtml !== undefined) updates.content_html = contentHtml;
    if (status !== undefined) {
      if (!['draft', 'published', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.status = status;
      if (status === 'published') updates.published_at = new Date().toISOString();
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { error } = await supabase.from('blog_posts').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
