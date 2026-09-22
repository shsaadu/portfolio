function formatDate(iso) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(iso));
}

async function loadPost() {
  const root = document.getElementById('postRoot');
  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    root.innerHTML = '<a href="blog.html" class="blog-back">&larr; Back to blog</a><p>No post specified.</p>';
    return;
  }

  try {
    const res = await fetch(`/api/blog/post?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) {
      root.innerHTML = '<a href="blog.html" class="blog-back">&larr; Back to blog</a><p>Post not found.</p>';
      return;
    }
    const { post } = await res.json();

    document.getElementById('pageTitle').textContent = `${post.title} — Mohammad Saad`;
    document.getElementById('pageDescription').setAttribute('content', post.excerpt || '');

    // content_html is written by Gemini and approved by Mohammad before
    // publish (see api/blog/approve.js) — it is not arbitrary visitor input,
    // so rendering it directly is the same trust level as hand-written HTML.
    root.innerHTML = `
      <a href="blog.html" class="blog-back">&larr; Back to blog</a>
      <time>${formatDate(post.published_at)}</time>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="blog-post-body">${post.content_html}</div>
    `;
  } catch {
    root.innerHTML = '<a href="blog.html" class="blog-back">&larr; Back to blog</a><p>Could not load this post.</p>';
  }
}

function escapeHtml(value) {
  const el = document.createElement('div');
  el.textContent = value == null ? '' : String(value);
  return el.innerHTML;
}

loadPost();
