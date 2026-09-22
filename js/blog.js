function formatDate(iso) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(iso));
}

async function loadPosts() {
  const list = document.getElementById('blogList');
  try {
    const res = await fetch('/api/blog/posts');
    const { posts } = await res.json();

    if (!posts || !posts.length) {
      list.innerHTML = '<p class="blog-empty">No posts yet — the first one goes up shortly after the weekly draft is approved.</p>';
      return;
    }

    list.innerHTML = posts
      .map(
        (p) => `
      <a class="blog-card" href="blog-post.html?slug=${encodeURIComponent(p.slug)}">
        <time>${formatDate(p.published_at)}</time>
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.excerpt || '')}</p>
      </a>`
      )
      .join('');
  } catch {
    list.innerHTML = '<p class="blog-empty">Could not load posts right now.</p>';
  }
}

function escapeHtml(value) {
  const el = document.createElement('div');
  el.textContent = value == null ? '' : String(value);
  return el.innerHTML;
}

loadPosts();
