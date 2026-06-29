#!/usr/bin/env node
/**
 * generate-connectors.mjs
 * --------------------------------------------------------------------------
 * Generates one Mintlify MDX page per connector from the Vivacity connector
 * catalogue, plus the complete docs.json navigation (hub pages + the
 * generated connector library tab).
 *
 * Source of truth for the catalogue:
 *   vd-customer-console/apps/web/src/components/console/connector-data.ts
 * Keep this list in sync if connectors are added/removed there.
 *
 * Run:  node _scripts/generate-connectors.mjs
 * Safe to re-run; it overwrites generated connector pages + docs.json only.
 * Hand-written hub pages are never touched.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- catalogue (mirror of CONNECTOR_CATALOG) ------------------------------
const CONNECTORS = [
  ["Shopify","shopify","Ecommerce","Orders, products and customers"],
  ["WooCommerce","woocommerce","Ecommerce","WordPress storefront orders"],
  ["BigCommerce","bigcommerce","Ecommerce","Catalogue, orders and customers",true],
  ["Squarespace","squarespace","Ecommerce","Commerce orders and analytics"],
  ["Wix","wix","Ecommerce","Site, store and bookings",true],
  ["Meta Ads","meta","Advertising","Ad spend, campaigns and lead forms"],
  ["Google Ads","googleads","Advertising","Spend, conversions and keywords"],
  ["TikTok","tiktok","Advertising","Ad performance and lead gen"],
  ["LinkedIn","linkedin","Advertising","Pages, posts and lead forms"],
  ["Klaviyo","klaviyo","Email & SMS","Email and SMS flows and revenue"],
  ["Mailchimp","mailchimp","Email & SMS","Audiences, campaigns, automations"],
  ["Brevo","brevo","Email & SMS","Email, SMS and automation"],
  ["Resend","resend","Email & SMS","Transactional email delivery"],
  ["Gmail","gmail","Email & SMS","Read and draft customer email"],
  ["Outlook","outlook","Email & SMS","Read and draft customer email"],
  ["Twilio","twilio","Email & SMS","SMS, voice and messaging"],
  ["HubSpot","hubspot","CRM","Contacts, deals and pipelines"],
  ["Salesforce","salesforce","CRM","Accounts, opportunities, activity"],
  ["Pipedrive","pipedrive","CRM","Deals, contacts and pipeline stages"],
  ["Zoho CRM","zoho","CRM","Leads, contacts and deals"],
  ["AgentBox","agentbox","CRM","Real-estate contacts and listings"],
  ["Xero","xero","Finance","Invoices and cash position"],
  ["Stripe","stripe","Finance","Payments and subscription revenue"],
  ["QuickBooks","quickbooks","Finance","Invoices, bills and reporting"],
  ["Wave","wave","Finance","Invoicing and accounting",true],
  ["Google Analytics 4","googleanalytics","Analytics","Traffic, conversions, attribution"],
  ["Search Console","googlesearchconsole","Analytics","Search performance and indexing"],
  ["Semrush","semrush","Analytics","SEO, keywords and competitors"],
  ["Google Calendar","googlecalendar","Calendar","Bookings and appointments"],
  ["Calendly","calendly","Calendar","Scheduling and bookings"],
  ["Google Sheets","googlesheets","Productivity","Import a CRM or lead list"],
  ["Google Drive","googledrive","Productivity","Documents and shared files"],
  ["Google Docs","googledocs","Productivity","Create and edit documents"],
  ["Notion","notion","Productivity","Pages, databases and notes"],
  ["Airtable","airtable","Productivity","Spreadsheet-database records"],
  ["Slack","slack","Productivity","Send messages and alerts"],
  ["Microsoft Teams","teams","Productivity","Messages and channels"],
  ["Trello","trello","Productivity","Boards, lists and cards"],
  ["Asana","asana","Productivity","Tasks, projects and teams"],
  ["WhatsApp","whatsapp","Messaging","Business messaging"],
  ["Telegram","telegram","Messaging","Bot messaging and alerts"],
  ["Discord","discord","Messaging","Community messaging"],
  ["OpenAI","openai","AI","GPT models for drafting"],
  ["Anthropic","anthropic","AI","Claude models for drafting"],
];

// --- category metadata ----------------------------------------------------
const CATS = {
  "Ecommerce":    { slug:"ecommerce",    icon:"cart-shopping",   blurb:"your online store",
    syncs:["Orders, refunds and fulfilment status","Products, variants and inventory levels","Customers and repeat-purchase history"],
    features:["Read orders, products and customers (read-only).","Summarise revenue, best sellers and repeat-buyer trends.","Draft restock and win-back messages for your approval."] },
  "Advertising":  { slug:"advertising",  icon:"bullhorn",        blurb:"your ad accounts",
    syncs:["Ad spend by campaign, ad set and ad","Impressions, clicks, conversions and ROAS","Lead-form submissions, where available"],
    features:["Read ad spend, campaign performance and lead forms.","Flag wasted spend and best-performing creatives.","Draft follow-ups to new leads for your approval."] },
  "Email & SMS":  { slug:"email-sms",    icon:"envelope",        blurb:"your messaging tools",
    syncs:["Campaigns, flows and automations","Opens, clicks, unsubscribes and attributed revenue","Audience and list growth"],
    features:["Read campaign and flow performance.","Draft replies and follow-ups in your voice.","Never send without your explicit approval."] },
  "CRM":          { slug:"crm",          icon:"address-book",    blurb:"your CRM",
    syncs:["Contacts, companies and leads","Deals / opportunities and pipeline stages","Activity, notes and record owners"],
    features:["Read contacts, deals and pipeline stages (read-only).","Rank who to contact next and explain why.","Draft outreach and follow-ups for your approval."] },
  "Finance":      { slug:"finance",      icon:"money-bill-wave", blurb:"your accounting and payments",
    syncs:["Invoices, bills and payment status","Payments, payouts and subscription revenue","Cash position and overdue balances"],
    features:["Read invoices, payments and cash position (read-only).","Surface overdue invoices and cash-flow risks.","Draft polite payment reminders for your approval."] },
  "Analytics":    { slug:"analytics",    icon:"chart-line",      blurb:"your analytics",
    syncs:["Sessions, users and traffic sources","Conversions and goal completions","Channel and attribution breakdowns"],
    features:["Read traffic, conversions and attribution.","Explain what moved week-on-week in plain English.","Recommend the next highest-leverage fix."] },
  "Calendar":     { slug:"calendar",     icon:"calendar",        blurb:"your calendar",
    syncs:["Events, bookings and availability","Attendees and appointment types"],
    features:["Read bookings and availability.","Draft confirmations and reminders for your approval.","Never create or cancel events without approval."] },
  "Productivity": { slug:"productivity", icon:"list-check",      blurb:"your workspace tools",
    syncs:["The documents, sheets or records you share","Rows, pages and file metadata you grant access to"],
    features:["Read the documents and records you share.","Summarise and answer questions over them.","Draft updates for your approval."] },
  "Messaging":    { slug:"messaging",    icon:"comments",        blurb:"your messaging channels",
    syncs:["Message threads you connect, for drafting","Delivery and read status where available"],
    features:["Draft messages and alerts in your voice.","Route conversations and flag what needs you.","Never send without your explicit approval."] },
  "AI":           { slug:"ai",           icon:"robot",           blurb:"an AI model provider",
    syncs:["Model access used to draft and reason","Not a data source - Vivacity only uses the data you connect"],
    features:["Power drafting and reasoning for your workflows.","Run inside Vivacity's approval-gated runtime.","Used only on the data you connect."] },
};

const CAT_ORDER = ["Ecommerce","Advertising","Email & SMS","CRM","Finance","Analytics","Calendar","Productivity","Messaging","AI"];

// connectors that authenticate with an API key rather than OAuth
const API_KEY = new Set(["klaviyo","brevo","resend","twilio","semrush","openai","anthropic","telegram","agentbox"]);

// small per-connector overrides
const OVERRIDES = {
  gmail:{ syncs:["Read customer email threads (read-only)","Draft replies in your voice - never sent without your approval"] },
  outlook:{ syncs:["Read customer email threads (read-only)","Draft replies in your voice - never sent without your approval"] },
  googlesheets:{ syncs:["Rows from the sheets you share (e.g. a CRM or lead list)","Used to import contacts and records, read-only"] },
  googlesearchconsole:{ syncs:["Search queries, clicks, impressions and average position","Indexing and coverage status for your verified site"] },
  openai:{ note:"OpenAI is an AI model provider, not a data source. Vivacity uses it only to draft and reason over the data **you** connect." },
  anthropic:{ note:"Anthropic (Claude) is an AI model provider, not a data source. Vivacity uses it only to draft and reason over the data **you** connect." },
};

// --- helpers --------------------------------------------------------------
const esc = (s) => s.replace(/"/g, '\\"');
const bullets = (arr) => arr.map((x) => `- ${x}`).join("\n");

function connectSteps(name, cat, slug) {
  const isKey = API_KEY.has(slug);
  const authStep = isKey
    ? `  <Step title="Add your ${esc(name)} API key">
    Paste your ${esc(name)} API key when prompted. Vivacity stores it **encrypted** and uses it only to read the data you approve. (Find the key in your ${esc(name)} account settings.)
  </Step>`
    : `  <Step title="Authorise with ${esc(name)}">
    You'll be redirected to ${esc(name)} to sign in and approve **read-only** access. Vivacity never sees your ${esc(name)} password.
  </Step>`;
  return `<Steps>
  <Step title="Open Connectors">
    In Vivacity, go to **Settings → Connectors**.
  </Step>
  <Step title="Choose ${esc(name)}">
    Find **${esc(name)}** under **${esc(cat)}** and select **Connect**.
  </Step>
${authStep}
  <Step title="Choose what to share">
    Pick the account, store or property to sync, then confirm.
  </Step>
  <Step title="Confirm the connection">
    Vivacity runs a first sync. You'll see a **Connected** badge when it's ready (usually a few minutes).
  </Step>
</Steps>`;
}

function page([name, slug, cat, desc, isNew]) {
  const meta = CATS[cat];
  const ov = OVERRIDES[slug] || {};
  const syncs = ov.syncs || meta.syncs;
  const tag = isNew ? '\ntag: "New"' : "";
  const note = ov.note ? `\n<Note>${ov.note}</Note>\n` : "";
  return `---
title: "${esc(name)}"
description: "Connect ${esc(name)} to Vivacity - ${esc(desc.toLowerCase())}."
icon: "${meta.icon}"${tag}
---

<Info>
  **Category:** ${esc(cat)} · **Access:** read-only at setup · **Actions:** drafted for your approval
</Info>

Connect **${esc(name)}** so Vivacity can see ${meta.blurb} and help you act on it. Your data stays **read-only** while Vivacity learns. Anything it suggests is **drafted for you to approve** - it never sends or changes anything in ${esc(name)} without your sign-off.
${note}
## What Vivacity does with ${esc(name)}

${bullets(meta.features)}

## What syncs

Vivacity reads the following from ${esc(name)} (read-only):

${bullets(syncs)}

<Note>Vivacity only ever **reads** the data you connect. It does not write back to ${esc(name)} unless you explicitly approve an action.</Note>

## Connect ${esc(name)}

${connectSteps(name, cat, slug)}

## Permissions & security

- **Read-only by default.** Setup grants read access only.
- **You stay in control.** Every suggested action is drafted for your approval before anything happens.
- **Encrypted & revocable.** Credentials are stored encrypted; disconnect any time in **Settings → Connectors**.

See [Data & permissions](/connectors/data-and-permissions) for the full picture.

## Troubleshooting

<AccordionGroup>
  <Accordion title="The connection failed or won't authorise">
    Make sure you're signed in to the correct ${esc(name)} account with admin access, then retry. If a pop-up was blocked, allow pop-ups for Vivacity and try again. Still stuck? See [Connection issues](/troubleshooting/connection-issues).
  </Accordion>
  <Accordion title="My ${esc(name)} data looks out of date">
    Vivacity syncs on a schedule. Trigger a manual sync from **Settings → Connectors → ${esc(name)} → Sync now**, or see [Data & sync](/troubleshooting/data-and-sync).
  </Accordion>
  <Accordion title="I see “Reconnect required”">
    ${esc(name)} access can expire or be revoked. Open the connector and select **Reconnect** to restore it - your history is kept.
  </Accordion>
</AccordionGroup>

## Watch: connecting ${esc(name)}

<Frame>
  {/* Replace the src with your Loom / YouTube / Vimeo embed for ${esc(name)}. */}
  <iframe
    width="100%"
    height="400"
    src="about:blank"
    title="Connecting ${esc(name)} to Vivacity"
    frameborder="0"
    allowfullscreen
  ></iframe>
</Frame>

<Card title="Browse all connectors" icon="grid-2" href="/connectors/introduction">
  See every tool you can connect to Vivacity.
</Card>
`;
}

// --- write connector pages ------------------------------------------------
let count = 0;
const navByCat = Object.fromEntries(CAT_ORDER.map((c) => [c, []]));
for (const row of CONNECTORS) {
  const [name, slug, cat] = row;
  const meta = CATS[cat];
  const rel = `connectors/${meta.slug}/${slug}`;
  const file = join(ROOT, `${rel}.mdx`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(row));
  navByCat[cat].push(rel);
  count++;
}

// --- write the category card snippet (used by connectors/introduction) ----
const cardBlocks = CAT_ORDER.map((c) => {
  const cards = CONNECTORS.filter((r) => r[2] === c).map((r) => {
    const [name, slug, , desc] = r;
    const rel = `/connectors/${CATS[c].slug}/${slug}`;
    return `  <Card title="${esc(name)}" icon="${CATS[c].icon}" href="${rel}">${esc(desc)}</Card>`;
  }).join("\n");
  return `### ${c}\n\n<CardGroup cols={2}>\n${cards}\n</CardGroup>`;
}).join("\n\n");
mkdirSync(join(ROOT, "snippets"), { recursive: true });
writeFileSync(join(ROOT, "snippets/connectors-by-category.mdx"), cardBlocks + "\n");

// --- assemble docs.json ---------------------------------------------------
const connectorGroups = CAT_ORDER.map((c) => ({
  group: c,
  icon: CATS[c].icon,
  pages: navByCat[c],
}));

const docs = {
  $schema: "https://mintlify.com/docs.json",
  theme: "mint",
  name: "Vivacity",
  description: "Help and product docs for Vivacity - connect your tools, see what's happening, and act with confidence.",
  colors: { primary: "#4F46E5", light: "#818CF8", dark: "#4338CA" },
  favicon: "/favicon.svg",
  logo: { light: "/logo/light.svg", dark: "/logo/dark.svg", href: "https://vivacity.ai" },
  navbar: {
    links: [{ label: "Support", href: "mailto:support@vivacity.ai" }],
    primary: { type: "button", label: "Open Vivacity", href: "https://app.vivacity.ai" },
  },
  navigation: {
    tabs: [
      {
        tab: "Guides",
        groups: [
          { group: "Get started", icon: "play", pages: [
            "index",
            "getting-started/quickstart",
            "getting-started/how-vivacity-works",
            "getting-started/connect-your-first-source",
          ]},
          { group: "Using Vivacity", icon: "wand-magic-sparkles", pages: [
            "features/overview",
            "features/daily-briefing",
            "features/ask-vivacity",
            "features/recommendations-and-approvals",
          ]},
          { group: "Connectors", icon: "plug", pages: [
            "connectors/introduction",
            "connectors/how-connectors-work",
            "connectors/manage-connections",
            "connectors/data-and-permissions",
          ]},
          { group: "Tips & best practices", icon: "lightbulb", pages: [
            "best-practices/get-the-most-from-vivacity",
            "best-practices/writing-good-questions",
          ]},
          { group: "Troubleshooting", icon: "wrench", pages: [
            "troubleshooting/overview",
            "troubleshooting/connection-issues",
            "troubleshooting/data-and-sync",
            "troubleshooting/faq",
          ]},
          { group: "Videos", icon: "circle-play", pages: ["videos/video-library"] },
          { group: "Account & security", icon: "shield-check", pages: [
            "account/account-and-billing",
            "account/security-and-privacy",
          ]},
        ],
      },
      {
        tab: "Connector library",
        groups: connectorGroups,
      },
    ],
  },
  footer: {
    socials: { website: "https://vivacity.ai" },
  },
};

writeFileSync(join(ROOT, "docs.json"), JSON.stringify(docs, null, 2) + "\n");
console.log(`Generated ${count} connector pages across ${CAT_ORDER.length} categories.`);
console.log("Wrote docs.json with Guides tab + Connector library tab.");
