// GET /api/blog/approve?id=...&token=... — clicked from the weekly email.
// Publishes the draft if the token matches. Returns a plain HTML page since
// a human lands here from their inbox, not a script.
const { getSupabase } = require('../_lib/supabase');

function page(title, body) {
  return `<!doctype html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>body{font-family:-apple-system,sans-serif;background:#07090e;color:#f1f5f9;
  display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
  a{color:#38bdf8}</style></head><body><div><h1>${title}</h1><p>${body}</p></div></body></html>`;
}

module.exports = async function handler(req, res) {
  const { id, token } = req.query;
  res.setHeader('Content-Type', 'text/html');
  if (!id || !token) return res.status(400).send(page('Missing link details', 'This approval link looks incomplete.'));

  try {
    const supabase = getSupabase();
    const { data: post, error } = await supabase.from('blog_posts').select('*').eq('id', id).single();
    if (error || !post) return res.status(404).send(page('Not found', 'This draft no longer exists.'));

    if (post.approval_token !== token) {
      return res.status(403).send(page('Invalid link', 'This approval link does not match this draft.'));
    }
    if (post.status !== 'draft') {
      return res.status(200).send(page('Already handled', `This post is already marked "${post.status}".`));
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;

    return res
      .status(200)
      .send(page('Published ✅', `“${post.title}” is now live on the blog.`));
  } catch (err) {
    console.error('blog/approve error:', err.message || err);
    return res.status(500).send(page('Something went wrong', 'Could not publish this post. Try again from the admin page.'));
  }
};
