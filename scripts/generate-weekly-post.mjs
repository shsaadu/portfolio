#!/usr/bin/env node
// Runs weekly via GitHub Actions (.github/workflows/weekly-blog-draft.yml).
// Picks the next topic from blog_topics, asks Gemini to draft a post, saves
// it to blog_posts as a DRAFT, and emails Mohammad an approve/reject link.
// Nothing here ever publishes on its own — a human always approves first.

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  NOTIFY_EMAIL,
  SITE_URL,
} = process.env;

// Tried in order — if one model is overloaded or unavailable, the next is
// used immediately rather than waiting on that specific model to recover.
// gemini-flash-latest is Google's own alias for "whatever the current
// recommended flash model is," so it's a safe last resort.
const MODEL_CANDIDATES = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}
requireEnv('SUPABASE_URL', SUPABASE_URL);
requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
requireEnv('GEMINI_API_KEY', GEMINI_API_KEY);
requireEnv('RESEND_API_KEY', RESEND_API_KEY);
requireEnv('NOTIFY_EMAIL', NOTIFY_EMAIL);
requireEnv('SITE_URL', SITE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function nextTopic() {
  let { data } = await supabase
    .from('blog_topics')
    .select('id, topic')
    .eq('used', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) {
    // Every topic has been used — loop the list.
    await supabase.from('blog_topics').update({ used: false, used_at: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    ({ data } = await supabase
      .from('blog_topics')
      .select('id, topic')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle());
  }

  if (!data) throw new Error('No topics found in blog_topics — run supabase/blog-schema.sql first.');
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(model, systemInstruction, topic) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: `Write the post. Topic: ${topic}` }] }],
        generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || `${model} request failed`);

  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${model} did not return valid JSON: ` + text.slice(0, 300));
  }
  if (!parsed.title || !parsed.content_html) throw new Error(`${model} response missing title/content_html`);
  return parsed;
}

async function generatePost(topic) {
  const systemInstruction = `You are writing a blog post for Mohammad Saad's personal portfolio site.
He is a Full-Stack and AI/ML developer (BSc Computer Science with AI, University of Sussex) who builds
AI website assistants, RAG systems, and lead-capture tools for service businesses, and also works as a
software developer on a production AI platform. The blog's audience is a mix of potential freelance
clients (small business owners considering an AI assistant) and technical readers (developers, recruiters).

Write in Mohammad's voice: direct, practical, no hype, no invented statistics or case studies, no claims
about specific results he hasn't actually stated. It is fine to explain concepts, share genuine technical
reasoning, or describe how something works — never claim a specific client outcome or number that wasn't
provided to you. Avoid generic AI-blog filler ("In today's fast-paced digital world..."). Get to the point
in the first two sentences.

Output ONLY valid JSON with these exact keys: "title" (string, under 70 characters), "excerpt" (string,
one or two sentences, under 200 characters, for a preview card), "content_html" (string: 500-800 words of
clean semantic HTML using <p>, <h2>, <h3>, <ul>/<li>, <strong> — no <html>/<head>/<body> wrapper, no inline
styles, no markdown asterisks).`;

  // Two passes over the whole model list, with a short wait between passes.
  // Most "high demand" blips clear in under a minute; trying every model
  // immediately (rather than backing off on one model repeatedly) gets an
  // answer fast if it's just one model that's overloaded right now.
  const passDelaysMs = [0, 30000];
  let lastError;

  for (const delay of passDelaysMs) {
    if (delay) {
      console.warn(`All models failed this pass — waiting ${delay / 1000}s before trying again.`);
      await sleep(delay);
    }
    for (const model of MODEL_CANDIDATES) {
      try {
        console.log(`Trying ${model}…`);
        return await callGemini(model, systemInstruction, topic);
      } catch (err) {
        lastError = err;
        console.warn(`${model} failed: ${err.message || err}`);
      }
    }
  }
  throw lastError;
}

async function uniqueSlug(baseTitle) {
  let slug = slugify(baseTitle);
  let attempt = 0;
  // Guard against slug collisions without needing a DB-level retry loop.
  while (attempt < 5) {
    const { data } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    attempt += 1;
    slug = `${slugify(baseTitle)}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${slugify(baseTitle)}-${Date.now()}`;
}

async function sendReviewEmail(post, approvalToken) {
  const approveUrl = `${SITE_URL.replace(/\/$/, '')}/api/blog/approve?id=${post.id}&token=${approvalToken}`;
  const rejectUrl = `${SITE_URL.replace(/\/$/, '')}/api/blog/reject?id=${post.id}&token=${approvalToken}`;
  const from = RESEND_FROM_EMAIL || 'Portfolio Blog <onboarding@resend.dev>';

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from,
      to: NOTIFY_EMAIL,
      subject: `New blog draft ready to review: ${post.title}`,
      html: `
        <h2>New weekly blog draft</h2>
        <p><strong>${escapeHtml(post.title)}</strong></p>
        <p>${escapeHtml(post.excerpt || '')}</p>
        <p style="margin:24px 0;">
          <a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;margin-right:12px;">Approve &amp; Publish</a>
          <a href="${rejectUrl}" style="background:#dc2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Reject</a>
        </p>
        <p>Want to edit it first? Open the admin page: <a href="${SITE_URL.replace(/\/$/, '')}/blog-admin.html">${SITE_URL.replace(/\/$/, '')}/blog-admin.html</a></p>
        <hr/>
        <p style="color:#888;font-size:12px;">Topic: ${escapeHtml(post.topic || '')}</p>
      `,
    }),
  });
  if (!emailRes.ok) {
    console.error('Resend email failed:', await emailRes.text());
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  const topicRow = await nextTopic();
  console.log('Topic:', topicRow.topic);

  const draft = await generatePost(topicRow.topic);
  const slug = await uniqueSlug(draft.title);
  const approvalToken = crypto.randomBytes(16).toString('hex');

  const { data: inserted, error } = await supabase
    .from('blog_posts')
    .insert({
      slug,
      title: draft.title,
      excerpt: draft.excerpt || null,
      content_html: draft.content_html,
      topic: topicRow.topic,
      status: 'draft',
      approval_token: approvalToken,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('blog_topics').update({ used: true, used_at: new Date().toISOString() }).eq('id', topicRow.id);
  await sendReviewEmail(inserted, approvalToken);

  console.log(`Draft created: "${draft.title}" (slug: ${slug}). Review email sent to ${NOTIFY_EMAIL}.`);
}

main().catch((err) => {
  console.error('generate-weekly-post failed:', err.message || err);
  process.exit(1);
});
