const loginScreen = document.getElementById('loginScreen');
const adminShell = document.getElementById('adminShell');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const draftList = document.getElementById('draftList');

function escapeHtml(value) {
  const el = document.createElement('div');
  el.textContent = value == null ? '' : String(value);
  return el.innerHTML;
}
function formatDate(iso) {
  return iso ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';
}

async function checkSession() {
  const res = await fetch('/api/blog/admin/session');
  const data = await res.json();
  if (data.authenticated) {
    loginScreen.classList.add('hidden');
    adminShell.classList.remove('hidden');
    loadDrafts();
  } else {
    loginScreen.classList.remove('hidden');
    adminShell.classList.add('hidden');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch('/api/blog/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || 'Incorrect password';
      return;
    }
    loginForm.reset();
    checkSession();
  } catch {
    loginError.textContent = 'Could not reach the server. Please try again.';
  }
});

async function loadDrafts() {
  const res = await fetch('/api/blog/admin/drafts');
  if (!res.ok) {
    draftList.innerHTML = '<p>Could not load drafts.</p>';
    return;
  }
  const { posts } = await res.json();
  renderDrafts(posts || []);
}

function renderDrafts(posts) {
  if (!posts.length) {
    draftList.innerHTML = '<p>No drafts yet — the weekly job creates one every Monday.</p>';
    return;
  }

  draftList.innerHTML = posts
    .map(
      (p) => `
    <div class="draft-card" data-id="${p.id}">
      <div class="draft-meta">
        <span class="draft-status ${p.status}">${p.status}</span>
        <small>${formatDate(p.published_at || p.created_at)} · topic: ${escapeHtml(p.topic || '—')}</small>
      </div>
      <label>Title</label>
      <input type="text" class="f-title" value="${escapeHtml(p.title)}">
      <label>Excerpt</label>
      <input type="text" class="f-excerpt" value="${escapeHtml(p.excerpt || '')}">
      <label>Content (HTML)</label>
      <textarea class="f-content">${escapeHtml(p.content_html)}</textarea>
      <div class="draft-actions">
        <button class="btn btn-secondary save-btn" type="button">Save edits</button>
        ${
          p.status === 'draft'
            ? `<button class="btn btn-primary publish-btn" type="button">Approve &amp; Publish</button>
               <button class="btn btn-secondary reject-btn" type="button">Reject</button>`
            : ''
        }
        ${p.status === 'published' ? `<a class="btn btn-secondary" href="blog-post.html?slug=${encodeURIComponent(p.slug)}" target="_blank">View live</a>` : ''}
      </div>
      <p class="draft-hint"></p>
    </div>`
    )
    .join('');

  draftList.querySelectorAll('.draft-card').forEach((card) => {
    const id = card.dataset.id;
    const hint = card.querySelector('.draft-hint');

    const patch = async (body, message) => {
      hint.textContent = 'Saving…';
      const res = await fetch('/api/blog/admin/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        hint.textContent = data.error || 'Could not save.';
        return;
      }
      hint.textContent = message;
      loadDrafts();
    };

    card.querySelector('.save-btn').addEventListener('click', () =>
      patch(
        {
          title: card.querySelector('.f-title').value,
          excerpt: card.querySelector('.f-excerpt').value,
          content_html: card.querySelector('.f-content').value,
        },
        'Saved.'
      )
    );

    const publishBtn = card.querySelector('.publish-btn');
    if (publishBtn) publishBtn.addEventListener('click', () => patch({ status: 'published' }, 'Published.'));

    const rejectBtn = card.querySelector('.reject-btn');
    if (rejectBtn)
      rejectBtn.addEventListener('click', () => {
        if (confirm('Reject this draft? It will not be published.')) patch({ status: 'rejected' }, 'Rejected.');
      });
  });
}

checkSession();
