import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectDocs, publicFiles } from '../_scripts/check-docs.mjs';
import { buildOutputs, checkOutputs, ROOT } from '../_scripts/generate-connectors.mjs';
const read=(p)=>readFileSync(join(ROOT,p),'utf8');
function fixture(fn) { const dir=mkdtempSync(join(tmpdir(),'vivacity-docs-test-')); try { cpSync(ROOT,dir,{recursive:true,filter:(p)=>!p.includes('/_audit/')}); return fn(dir); } finally {rmSync(dir,{recursive:true,force:true});} }
function change(dir,path,fn) {const p=join(dir,path); writeFileSync(p,fn(readFileSync(p,'utf8')));}

test('all current pages, navigation, local targets, scope and generated outputs pass',()=>{ const r=inspectDocs(); assert.equal(r.status,'pass',r.errors.join('\n')); assert.equal(r.pageCount,77); assert.equal(r.snippetCount,1); assert.ok(r.localTargetsChecked>300); });
test('all 65 historical route URLs remain in the active source',()=>{const before=JSON.parse(read('_audit/2026-10-31-v1/before-snapshot.json'));const paths=new Set(publicFiles().map((p)=>p.slice(ROOT.length+1)));const old=before.files.filter((f)=>f.path.endsWith('.mdx')&&!f.path.startsWith('snippets/'));assert.equal(old.length,65); for(const f of old)assert.ok(paths.has(f.path),f.path);});
test('generator import and --check contract are deterministic and current',()=>{assert.equal(buildOutputs().size,46);assert.deepEqual(checkOutputs(),[]);assert.deepEqual([...buildOutputs()],[...buildOutputs()]);});
test('rejects a reintroduced subscription and generic console promise',()=>fixture((dir)=>{change(dir,'index.mdx',(t)=>t+'\nVivacity refreshes on a schedule. Keep it Running is $499.\n');const r=inspectDocs(dir); assert.ok(r.errors.some((e)=>e.includes('Retired public')));assert.ok(r.errors.some((e)=>e.includes('Unsupported generic')));}));
test('rejects an unsupported training or retention guarantee',()=>fixture((dir)=>{change(dir,'account/security-and-privacy.mdx',(t)=>t+'\nYour data is never used to train models and deleted within 30 days.\n');assert.ok(inspectDocs(dir).errors.some((e)=>e.includes('data-handling promise')));}));
test('rejects fake playable media and internal publication leakage',()=>fixture((dir)=>{change(dir,'videos/video-library.mdx',(t)=>t+'\n<Frame>Walkthrough video coming soon.</Frame>\nowner-review\n');const r=inspectDocs(dir);assert.ok(r.errors.some((e)=>e.includes('Fake player')));assert.ok(r.errors.some((e)=>e.includes('Internal-only')));assert.ok(r.errors.some((e)=>e.includes('unregistered player')));}));
test('rejects missing navigation, broken links and missing snippets',()=>fixture((dir)=>{change(dir,'index.mdx',(t)=>t+'\n[Broken](/missing-guide)\n<Snippet file="missing.mdx" />\n');change(dir,'docs.json',(t)=>t.replace('getting-started/quickstart','getting-started/missing'));const r=inspectDocs(dir);for(const needle of ['Missing navigation page','Missing local target','Missing snippet'])assert.ok(r.errors.some((e)=>e.includes(needle)),needle);}));
test('rejects stale generated pages instead of silently accepting manual changes',()=>fixture((dir)=>{change(dir,'connectors/ai/openai.mdx',(t)=>t+'\nA manual change that will be overwritten.\n');assert.ok(checkOutputs(dir).includes('Generated output differs: connectors/ai/openai.mdx'));}));
test('rejects a catalogue entry presented as a verified connector',()=>fixture((dir)=>{change(dir,'_data/tool-catalogue.json',(t)=>t.replace('requires-project-specific-verification','supported'));assert.throws(()=>buildOutputs(dir),/Unreviewed capability status/);}));
test('exact first-party lockup bytes match the canonical export',()=>{assert.deepEqual(readFileSync(join(ROOT,'logo/vivacity-lockup.png')),readFileSync(join(ROOT,'../vd-business/brand/exports/2026-10-21-documents/vivacity-document-lockup-6x.png')));});
