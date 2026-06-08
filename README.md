# BugTriage AI — Multi-Role Triage Workspace

A polished, multi-page bug triage application built with Next.js and free AI providers. This version is **database-free** and stores analysis only in the current browser session.

## What it does
- Upload a CSV or paste a bug row / raw report
- Analyze severity, area, priority, confidence score, and duplicate signals
- Recommend the best team automatically
- Manage work with role-based tabs and assignment boards
- Ask a chat assistant about the current analysis
- Export the current workspace as CSV or JSON
- View dedicated role pages with custom backgrounds and reports

## Role pages
- `/roles` — choose a role page
- `/roles/manager`
- `/roles/developer`
- `/roles/qa`
- `/roles/security`
- `/roles/devops`
- `/roles/product`

## No-database design
This project does **not** require PostgreSQL.
- No analysis history is stored on the server
- Workspace data is kept in browser session storage only
- Teams are session-based and can be adjusted in the current browser session
- You can still use free AI providers by pasting keys in Settings

## Local development
```bash
npm install
npm run dev
```

## Environment variables
Create a `.env.local` if you want optional AI provider keys:

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
```

If you leave them blank, the app uses the built-in heuristic analyzer.

## Deploy to GitHub + Vercel
1. Create a **public GitHub repository**
2. Push this code to GitHub
3. Import the repo into **Vercel**
4. Deploy with no database variables required
5. Optionally set AI keys in Vercel environment variables if you want live model calls

## Recommended submission links
- Public GitHub repository
- Vercel live app URL
- Demo video link
- AI usage note
- Sample data / test cases

## Suggestion
For your presentation, show:
1. The main workspace
2. The manager page
3. The developer page
4. The QA page
5. The chat assistant
6. Exporting JSON/CSV

That gives a strong end-to-end story without needing a database.
