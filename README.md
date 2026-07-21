# Mohammad Saad — Portfolio

A personal portfolio site for freelance/client work: full-stack developer & AI/ML engineer.

## File structure

```
portfolio/
├── index.html      → page content and structure
├── css/
│   └── style.css   → all styling (colors, layout, animations)
├── js/
│   └── main.js      → scroll reveals, hero chat demo, custom cursor
├── favicon.svg      → browser tab icon
└── README.md         → this file
```

No build step, no dependencies to install — just plain HTML/CSS/JS. Open `index.html` directly in a browser to preview it locally.

## Before you publish — update these

1. **Project GitHub links** — in `index.html`, every project card currently links to your general profile:
   `https://github.com/shsaadu`
   Replace each with the direct repo link once your projects are organized into separate repos, e.g.:
   `https://github.com/shsaadu/persona-ai-argumentation`

2. **"Coming soon" project card** — once you build the AI document Q&A chatbot or the Three.js configurator we talked about, replace the dashed "Building next" card in `index.html` with a real project card (copy the format of the existing ones).

3. **Contact links** — already pulled from your CV (email, WhatsApp, LinkedIn, GitHub) in the `#contact` section of `index.html`. Update if any of these change.

## Deploying

### Option A — Vercel Drop (fastest, no Git)
1. Go to [vercel.com/drop](https://vercel.com/drop)
2. Drag the whole `portfolio` folder onto the page
3. Name your project, click Deploy
4. Note: each drop creates a *new* project — re-dropping after edits won't update the same URL. Use Option B if you'll be editing regularly.

### Option B — GitHub + Vercel (recommended, auto-updates)
1. Create a new GitHub repo (e.g. `portfolio`)
2. Push this whole folder to it:
   ```
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/portfolio.git
   git push -u origin main
   ```
3. In Vercel: **Add New Project → Import Git Repository** → select the repo
4. Deploy — no configuration needed, Vercel auto-detects it's a static site
5. From now on, any `git push` automatically redeploys the same live URL

## Notes

- Fully responsive (test down to mobile widths)
- Respects `prefers-reduced-motion` — animations and the custom cursor disable automatically if a visitor has that OS setting on
- The custom cursor only activates on devices with a real mouse (not touchscreens)
