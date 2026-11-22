#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOutputs, ROOT } from './generate-connectors.mjs';
export const PUBLIC_DIRS = ['app','index.mdx','getting-started','features','connectors','best-practices','troubleshooting','videos','account','tools','snippets'];
export const forbidden = [
  [/AI co-pilot|40\+ connectors|40\+ tools/i, 'Historical platform positioning'],
  [/\bKeep it Running\b|Intelligence (?:Core|Pro)|\$249|\$349|\$499|\$1,499/i,'Retired public commercial model'],
  [/Vivacity (?:stores|refreshes|normalises|learns your|runs a first sync)|Open \*\*Tools\*\*|\+ Add connection|\bConnected\*\* badge/i,'Unsupported generic console behaviour'],
  [/never (?:sold|used to train)|encrypted (?:in transit|at rest)|deleted (?:immediately|within)|purged within|Australian regions where available/i,'Unverified blanket data-handling promise'],
  [/walkthrough video coming soon|VIDEO_ID|PLACEHOLDER|first videos land|\bcoming soon\b/i,'Fake player or promised feature placeholder'],
  [/no paying customers|no payments|owner-review|handoff-payload|source-authority|MCP receipt|\bops\/jobs\b/i,'Internal-only material in outward copy'],
  [/[\u2013\u2014]/u,'Typographic dash in customer copy'],
  [/vivacity\.ai@outlook\.com|vivacity-digital\.com\.au|https?:\/\/vivacity\.ai(?:\/|\b)/i,'Obsolete contact or domain'],
];
export function publicFiles(root = ROOT) {
  const out = [];
  function walk(path) { if (!existsSync(path)) return; for (const ent of readdirSync(path,{withFileTypes:true})) { const p=join(path,ent.name); if(ent.isDirectory()) walk(p); else if(p.endsWith('.mdx')) out.push(p); } }
  for(const item of PUBLIC_DIRS) { const p=join(root,item); if(item.endsWith('.mdx')) {if(existsSync(p)) out.push(p);} else walk(p); }
  return out.sort();
}
export function navigationPages(docs) { return docs.navigation.tabs.flatMap((t)=>t.groups.flatMap((g)=>g.pages)); }
export function inspectDocs(root=ROOT) {
  const errors=[]; const docs=JSON.parse(readFileSync(join(root,'docs.json'),'utf8'));
  const files=publicFiles(root); const pages=files.filter((p)=>!p.includes('/snippets/'));
  const routes=new Set(pages.map((p)=>p.slice(root.length+1,-4))); const nav=navigationPages(docs);
  if(new Set(nav).size!==nav.length) errors.push('Duplicate navigation route');
  for(const route of nav) if(!routes.has(route)) errors.push(`Missing navigation page: ${route}`);
  for(const route of routes) if(!nav.includes(route)) errors.push(`Unlisted public page: ${route}`);
  let links=0;
  for(const p of files) {
    const text=readFileSync(p,'utf8'); const rel=p.slice(root.length+1);
    if(!rel.startsWith('snippets/') && !/^---\ntitle: "[^\n]+"\ndescription: "[^\n]+"\nicon: "[^\n]+"\n---\n/.test(text)) errors.push(`Invalid frontmatter: ${rel}`);
    for(const [pattern,label] of forbidden) if(pattern.test(text)) errors.push(`${label}: ${rel}`);
    for(const m of text.matchAll(/(?:href|src|icon)="(\/[^"#]*)(?:#[^"]*)?"|\]\((\/[^)#]*)(?:#[^)]*)?\)/g)) {
      const path=m[1]||m[2]; links++;
      if(!existsSync(join(root,path)) && !existsSync(join(root,`${path}.mdx`))) errors.push(`Missing local target ${path} in ${rel}`);
    }
    for(const m of text.matchAll(/<Snippet file="([^"]+)"/g)) if(!existsSync(join(root,'snippets',m[1]))) errors.push(`Missing snippet: ${m[1]}`);
    if(/<iframe|<video|<Frame/.test(text)) errors.push(`Video requires reviewed media contract, not an unregistered player: ${rel}`);
    const tags=['Card','CardGroup','Steps','Step','Accordion','AccordionGroup'];
    for(const tag of tags) { const open=[...text.matchAll(new RegExp(`<${tag}(?=[\\s>])[^>]*>`, 'g'))].filter((m)=>!m[0].endsWith('/>')).length; const close=[...text.matchAll(new RegExp(`</${tag}>`,'g'))].length; if(open!==close) errors.push(`Unbalanced ${tag}: ${rel}`); }
  }
  const fees=readFileSync(join(root,'account/account-and-billing.mdx'),'utf8');
  if(!fees.includes('A$500 total, one-off, for one person. No GST charged.')) errors.push('Current setup price/tax wording is missing');
  if(!fees.includes('Customer-paid AI subscriptions are separate.')) errors.push('Separate provider costs are missing');
  if(!docs.description.includes('AI setup, coaching and automation')) errors.push('Current business description is missing');
  if(docs.colors.primary!=='#005EFF') errors.push('Brand blue differs');
  for(const asset of ['/logo/vivacity-lockup.png','/favicon.png','/fonts/Epilogue-variable.ttf','/fonts/InstrumentSerif-Regular.ttf']) if(!existsSync(join(root,asset))) errors.push(`Missing brand asset: ${asset}`);
  if(docs.navbar.links[0].href!=='mailto:hello@vivacityai.com.au') errors.push('Website contact differs');
  for(const rel of ['_audit/**','_scripts/**','_data/**','_tests/**','AGENTS.md','CLAUDE.md','README.md']) if(!readFileSync(join(root,'.mintignore'),'utf8').includes(rel)) errors.push(`Internal publishing exclusion missing: ${rel}`);
  errors.push(...checkOutputs(root));
  return {status:errors.length?'fail':'pass',pageCount:pages.length,snippetCount:files.length-pages.length,localTargetsChecked:links,errors};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) { const result=inspectDocs(); console.log(JSON.stringify(result,null,2)); if(result.errors.length) process.exitCode=1; }
