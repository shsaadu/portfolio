// Populates the "Field Notes" section on the homepage with the latest
// published blog posts. Independent of blog.js (which powers the full
// /blog.html listing) — this only needs the top few for a teaser.

function formatDateHome(iso) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(iso));
}
function escapeHtmlHome(value) {
  const el = document.createElement('div');
  el.textContent = value == null ? '' : String(value);
  return el.innerHTML;
}

async function loadFieldNotes() {
  const list = document.getElementById('fieldNotesList');
  if (!list) return;

  try {
    const res = await fetch('/api/blog/posts');
    const { posts } = await res.json();

    if (!posts || !posts.length) {
      list.innerHTML = '<p class="field-notes-empty">First post coming soon — this section updates weekly.</p>';
      return;
    }

    const latest = posts.slice(0, 3);
    list.innerHTML =
      latest
        .map(
          (p) => `
      <a class="field-note-card" href="blog-post.html?slug=${encodeURIComponent(p.slug)}">
        <time>${formatDateHome(p.published_at)}</time>
        <h3>${escapeHtmlHome(p.title)}</h3>
        <p>${escapeHtmlHome(p.excerpt || '')}</p>
      </a>`
        )
        .join('') + `<a class="field-notes-all" href="blog.html">View all posts &rarr;</a>`;
  } catch {
    list.innerHTML = '<p class="field-notes-empty">Could not load the latest posts right now.</p>';
  }
}

loadFieldNotes();
