// Minimal admin auth for the blog review page — the admin password (set as
// an env var, never stored in the database) is hashed into a session token
// and set as an HttpOnly cookie on login. Every protected /api/blog/admin/*
// route checks this cookie server-side. Same pattern as the ai-lead-assistant
// project's admin auth, kept separate (own env var, own cookie name) so this
// portfolio site and that client-facing app never share a secret.

const crypto = require('crypto');

const COOKIE_NAME = 'blog_admin_session';

function getExpectedToken() {
  const secret = process.env.BLOG_ADMIN_PASSWORD;
  if (!secret) return null;
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function isAuthed(req) {
  const expected = getExpectedToken();
  if (!expected) return false;
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const provided = Buffer.from(match[1]);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(provided, expectedBuf);
}

function setSessionCookie(res) {
  const token = getExpectedToken();
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function requireAuth(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  return true;
}

module.exports = { isAuthed, setSessionCookie, clearSessionCookie, requireAuth };
