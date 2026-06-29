# Vivacity docs site

Customer-facing help and product documentation for Vivacity, built on **[Mintlify](https://mintlify.com)** (the same platform Lovable's docs use). This is where customers self-navigate, troubleshoot, and watch videos.

It covers Getting started, Using Vivacity, **Connectors** (an intro plus a page for all 44 connectors), Tips & best practices, Troubleshooting, Videos, and Account & security.

---

## Preview it locally (2 minutes)

```bash
# 1. Install the Mintlify CLI (one-off)
npm i -g mint

# 2. From this folder, start the live preview
cd vd-docs-site
mint dev
```

Open the URL it prints (usually `http://localhost:3000`). Edits to `.mdx` files and `docs.json` hot-reload.

> If `mint dev` reports a config problem, run `mint broken-links` to check page links, and make sure `docs.json` is valid JSON.

---

## How to host it (what you asked about)

Mintlify hosts the site for you - you connect this folder's Git repo and it deploys on every push.

1. **Push this repo to GitHub** (this `vd-docs-site/` folder can be its own repo, or a subfolder - Mintlify lets you set the content directory).
2. Go to **[mintlify.com](https://mintlify.com) → sign up → "Add your repo"** and authorise the GitHub app.
3. Point it at this folder. Mintlify builds from `docs.json`.
4. **Custom domain:** in the Mintlify dashboard → **Settings → Domain**, set `docs.vivacity.ai` (or similar) and add the CNAME it gives you to your DNS.
5. Every push to your main branch now redeploys the docs automatically.

**Plans:** Mintlify has a free tier to get started and paid tiers for custom domains, more editors, and analytics - check their current pricing. The whole site here is portable Markdown/MDX, so you're never locked in.

---

## Before you go live - replace these placeholders

| Placeholder | Where | Set it to |
| :--- | :--- | :--- |
| Logo | `logo/light.svg`, `logo/dark.svg` (add these files) | Your Vivacity logo |
| Favicon | `favicon.svg` (add this file) | Your favicon |
| Brand colour | `docs.json` → `colors` | Your brand hex (currently indigo `#4F46E5`) |
| App URL | `docs.json` → `navbar.primary.href` | Your real app URL (currently `app.vivacity.ai`) |
| Support email | throughout pages | Your real support inbox (currently `support@vivacity.ai`) |
| Pricing | `account/account-and-billing.mdx` | Link to your live pricing page |

---

## Structure

```
vd-docs-site/
├── docs.json                 # Mintlify config + navigation (GENERATED for connectors)
├── index.mdx                 # Welcome / home
├── getting-started/          # quickstart, how-vivacity-works, connect-your-first-source
├── features/                 # overview, daily-briefing, ask-vivacity, recommendations-and-approvals
├── connectors/               # introduction, how-connectors-work, manage-connections, data-and-permissions
│   ├── ecommerce/ … ai/      # one page per connector (44 total, GENERATED)
├── best-practices/           # get-the-most-from-vivacity, writing-good-questions
├── troubleshooting/          # overview, connection-issues, data-and-sync, faq
├── videos/                   # video-library
├── account/                  # account-and-billing, security-and-privacy
├── snippets/                 # connectors-by-category.mdx (GENERATED - used by the connectors intro)
└── _scripts/
    └── generate-connectors.mjs   # regenerates the 44 connector pages + nav + snippet
```

---

## Add or change a connector

The 44 connector pages, the connector navigation in `docs.json`, and the category card list are all **generated** from one list, so they never drift.

1. Edit the `CONNECTORS` array in `_scripts/generate-connectors.mjs` (keep it in sync with the app's catalogue at `vd-customer-console/apps/web/src/components/console/connector-data.ts`).
2. Regenerate:

   ```bash
   node _scripts/generate-connectors.mjs
   ```

This overwrites the generated connector pages, `snippets/connectors-by-category.mdx`, and the connector portion of `docs.json`. **Hand-written hub pages are never touched.**

> Want to customise one connector's page beyond the template? Edit its `.mdx` directly - but note a regenerate will overwrite it. For lasting per-connector copy, add fields to the generator's `OVERRIDES` map instead.

---

## Add videos

Every connector page and the [video library](videos/video-library.mdx) have ready `<Frame><iframe>` slots. Replace the placeholder `src="about:blank"` with your Loom/YouTube/Vimeo embed URL. That's it.

---

## Writing conventions

- **Audience:** business owners, not developers. Plain English, outcome-led.
- **Voice:** Australian English (optimise, colour, organise). Messaging is **See · Understand · Act**.
- **The rule that recurs everywhere:** Vivacity is read-only at setup and **drafts actions for your approval** - never act without sign-off. Keep this consistent in any new page.
- Mintlify components in use: `Card`, `CardGroup`, `Steps`/`Step`, `Info`, `Tip`, `Note`, `Warning`, `Check`, `AccordionGroup`/`Accordion`, `Frame`, `Snippet`.
