// GET /api/blog/reject?id=...&token=... — clicked from the weekly email.
// Marks the draft rejected so it never publishes. Plain HTML response —
// a human lands here from their inbox.
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
  if (!id || !token) return res.status(400).send(page('Missing link details', 'This link looks incomplete.'));

  try {
    const supabase = getSupabase();
    const { data: post, error } = await supabase.from('blog_posts').select('*').eq('id', id).single();
    if (error || !post) return res.status(404).send(page('Not found', 'This draft no longer exists.'));

    if (post.approval_token !== token) {
      return res.status(403).send(page('Invalid link', 'This link does not match this draft.'));
    }
    if (post.status !== 'draft') {
      return res.status(200).send(page('Already handled', `This post is already marked "${post.status}".`));
    }

    const { error: updateError } = await supabase.from('blog_posts').update({ status: 'rejected' }).eq('id', id);
    if (updateError) throw updateError;

    return res.status(200).send(page('Discarded', `“${post.title}” was rejected and will not be published.`));
  } catch (err) {
    console.error('blog/reject error:', err.message || err);
    return res.status(500).send(page('Something went wrong', 'Could not reject this post. Try again from the admin page.'));
  }
};
