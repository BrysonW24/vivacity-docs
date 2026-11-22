#!/usr/bin/env node
/** Educational tool guides. No catalogue entry establishes an integration or partnership.
 * Inputs: _data/tool-catalogue.json and _data/site-settings.json.
 * node _scripts/generate-connectors.mjs [--check]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const quote = (s) => JSON.stringify(s);
export function buildOutputs(root = ROOT) {
  const readLocal = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const catalogue = readLocal('_data/tool-catalogue.json');
  const { guide_groups, app_groups, ...settings } = readLocal('_data/site-settings.json');
  const cats = new Map(catalogue.categories.map((c) => [c.name, c]));
  const logos = new Set(readdirSync(join(root, 'logos/connectors')));
  const logo = (slug) => {
    const file = ['svg', 'png', 'jpg'].map((ext) => `${slug}.${ext}`).find((n) => logos.has(n));
    if (!file) throw new Error(`Missing existing logo for ${slug}`);
    return `/logos/connectors/${file}`;
  };
  const ids = new Set();
  const outputs = new Map();
  for (const tool of catalogue.tools) {
    if (ids.has(tool.slug)) throw new Error(`Duplicate tool: ${tool.slug}`);
    ids.add(tool.slug);
    const c = cats.get(tool.category);
    if (!c) throw new Error(`Unknown category: ${tool.category}`);
    if (tool.guide_type !== 'planning-reference' || tool.integration_status !== 'requires-project-specific-verification') throw new Error(`Unreviewed capability status: ${tool.slug}`);
    if (!['works', 'connects', 'coming'].includes(tool.app_status)) throw new Error(`Missing app status: ${tool.slug}`);
    if (tool.app_status === 'works' && !(tool.app_does || []).length) throw new Error(`A working app needs what it does: ${tool.slug}`);
    const inApp = {
      works: `<Check>\nWorks in the Vivacity app today.\n</Check>\n\n${(tool.app_does || []).map((line) => `- ${line}`).join('\n')}\n\n${tool.slug === 'twilio' ? 'See [how enquiries reach you](/app/enquiries).' : `Connect it from **Connections** in the app, and disconnect from the same card at any time. See [all connections](/app/connections/overview).`}`,
      connects: `<Info>\nYou can connect ${tool.name} in the Vivacity app today. Nothing is read from it yet.\n</Info>\n\nConnect it from **Connections** in the app, and disconnect from the same card at any time. See [all connections](/app/connections/overview).`,
      coming: `<Info>\n${tool.name} is listed on **Connections** in the Vivacity app and is coming. It can't be used in the app yet.\n</Info>`,
    }[tool.app_status];
    let further = '';
    if (tool.slug === 'openai') further = '\nFor a first chat, use the [ChatGPT guide](/tools/chatgpt). OpenAI also offers developer products; an API project is a separate technical and cost decision.\n';
    if (tool.slug === 'anthropic') further = '\nStart with the [Claude guide](/tools/claude). For software projects, see [Claude Code](/tools/claude-code).\n';
    outputs.set(`connectors/${c.slug}/${tool.slug}.mdx`, `---
title: ${quote(tool.name)}
description: ${quote(tool.app_status === 'works' ? `What the Vivacity app does with ${tool.name}, and planning AI tasks around it.` : `Where ${tool.name} stands in the Vivacity app, and planning AI tasks around it.`)}
icon: ${quote(c.icon)}
---

<img src="${logo(tool.slug)}" alt="${tool.name} logo" width="48" height="48" noZoom />

## In the Vivacity app

${inApp}

## Where to start

If you use **${tool.name}**, begin with one task and the information you need for it. ${c.first_exercise}

The rest of this page is a planning guide for using ${tool.name} with AI tools generally. Naming ${tool.name} does not imply a partnership with the provider.
${further}
## Try a small exercise

Use fictional information first. You can paste this prompt into your chosen AI assistant, then add the sample details:

> ${c.practice_prompt}

Check names, figures, tone and missing information before using the result. A useful draft is a starting point for your judgement.

## Before connecting ${tool.name}

- Define the task, the information it needs and the person who will check the result.
- Confirm whether a manual copy or export is enough before adding another connection.
- Check current account access, available permissions, provider terms and any subscription or usage costs.
- Agree the specific connection and test before granting access or allowing changes.

A direct integration, if appropriate, is scoped and tested separately. Its permissions, refresh schedule, supported actions and support arrangements belong in that agreed setup.

## Keep control of access

Use the account you own. Enter credentials in the provider's own sign-in or agreed secure setup flow, and do not paste passwords or API keys into a chat or email. Review [data and permissions](/connectors/data-and-permissions) before sharing business information.

## Learn more

- [${tool.name} official website](${tool.vendor_url}) for current product and account information.
- [How connections work](/connectors/how-connectors-work) for the questions to ask before linking tools.
- [Get started with Vivacity](/getting-started/quickstart) for help choosing your first task.
`);
  }
  outputs.set('snippets/connectors-by-category.mdx', catalogue.categories.map((c) => `### ${c.name}\n\n<CardGroup cols={2}>\n${catalogue.tools.filter((t) => t.category === c.name).map((t) => `  <Card title="${t.name}" icon="${logo(t.slug)}" href="/connectors/${c.slug}/${t.slug}">Plan a task, access and review around ${t.name}.</Card>`).join('\n')}\n</CardGroup>`).join('\n\n') + '\n');
  const docs = { ...settings, navigation: { tabs: [ { tab: 'Practical guides', groups: guide_groups }, ...(app_groups ? [{ tab: 'The Vivacity app', groups: app_groups }] : []), { tab: 'Tools to explore', groups: catalogue.categories.map((c) => ({ group: c.name, icon: c.icon, pages: catalogue.tools.filter((t) => t.category === c.name).map((t) => `connectors/${c.slug}/${t.slug}`) })) } ] } };
  outputs.set('docs.json', JSON.stringify(docs, null, 2) + '\n');
  return outputs;
}
export function checkOutputs(root = ROOT) {
  const errors = [];
  for (const [rel, text] of buildOutputs(root)) {
    const p = join(root, rel);
    if (!existsSync(p) || readFileSync(p, 'utf8') !== text) errors.push(`Generated output differs: ${rel}`);
  }
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const unknown = process.argv.slice(2).filter((x) => x !== '--check');
  if (unknown.length) throw new Error(`Unknown argument: ${unknown[0]}`);
  if (process.argv.includes('--check')) {
    const errors = checkOutputs();
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`Generated outputs match (${buildOutputs().size} files; no writes).`);
  } else {
    for (const [rel, text] of buildOutputs()) { const p = join(ROOT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); }
    console.log(`Generated ${read('_data/tool-catalogue.json').tools.length} educational tool guides, snippet and navigation.`);
  }
}
