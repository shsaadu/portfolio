-- Portfolio blog — database schema
-- Run this in the SAME Supabase project you already use for ai-lead-assistant.
-- Project → SQL Editor → New query → paste this whole file → Run.
-- These are new tables (blog_topics, blog_posts); nothing here touches your
-- existing businesses/documents/chunks/conversations/messages/leads tables.

-- Rotating topic queue the weekly generator draws from. Add/remove/edit rows
-- any time in the Table Editor — no redeploy needed.
create table if not exists blog_topics (
  id uuid primary key default gen_random_uuid(),
  topic text unique not null,
  used boolean default false,
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content_html text not null,
  topic text,
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  approval_token text not null,
  created_at timestamptz default now(),
  published_at timestamptz
);

create index if not exists blog_posts_status_idx on blog_posts (status);
create index if not exists blog_posts_slug_idx on blog_posts (slug);

-- Row-level security: lock both tables down. The backend (api/_lib/supabase.js
-- and the weekly generator script) connects with the service_role key, which
-- bypasses RLS, so everything keeps working. No policies = the public/anon
-- key, if ever used from the browser, can read and write nothing.
alter table blog_topics enable row level security;
alter table blog_posts  enable row level security;

-- Seed topics — a rotating list tied to your field and your AI Lead Assistant
-- business. Edit freely; the generator cycles through them and loops once
-- every topic has been used.
insert into blog_topics (topic) values
  ('What Retrieval-Augmented Generation (RAG) actually is, explained for non-technical business owners'),
  ('Why AI chatbots hallucinate — and how RAG fixes it'),
  ('5 signs your business website is losing leads, and how an AI assistant helps'),
  ('Building a multi-tenant product on Supabase: lessons from a real project'),
  ('Serverless vs. traditional backends for small AI products'),
  ('How vector search (pgvector) works, explained simply'),
  ('Prompt engineering patterns that actually improve AI reliability'),
  ('What I learned deploying a production RAG pipeline on Vercel'),
  ('The real cost of running an AI assistant at small scale: Gemini, Supabase and Vercel pricing'),
  ('Why "AI chatbot" and "AI assistant" are not the same thing'),
  ('Designing admin dashboards developers actually enjoy building'),
  ('How to evaluate an LLM''s answers automatically'),
  ('Building trust into AI products: why "I don''t know" is a feature, not a bug'),
  ('A beginner''s guide to embeddings and why they matter for search'),
  ('What building an internal AI tool for a real business taught me'),
  ('Firebase vs Supabase: picking a backend for an AI product'),
  ('How I structure a RAG chatbot''s system prompt for a small business'),
  ('Three mistakes I made building my first AI assistant product'),
  ('What a production-grade AI feature requires beyond a demo'),
  ('Real-time AI: what Gemini Live makes possible now'),
  ('Computer vision plus LLMs: lessons from building an AI styling assistant'),
  ('How to scope and price an AI integration project as a freelancer'),
  ('The difference between a chatbot and an AI agent'),
  ('Why I chose serverless functions over a traditional Node server'),
  ('A practical intro to LLM evaluation metrics: sentiment, consistency, verbosity')
on conflict (topic) do nothing;
