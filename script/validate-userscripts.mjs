import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { parse } from 'acorn';
import { analyze } from 'eslint-scope';
import { scripts } from './scripts-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0;
let warnings = 0;
function fail(message) { console.error(`ERROR: ${message}`); errors++; }
for (const script of scripts) {
  const path = join(root, 'dist', script.output);
  try {
    const source = readFileSync(path, 'utf8');
    new Script(source, { filename: path });
    const blocks = [...source.matchAll(/^\/\/ ==UserScript==\r?\n([\s\S]*?)^\/\/ ==\/UserScript==/gm)];
    if (blocks.length !== 1 || blocks[0].index !== 0) throw new Error('expected exactly one metadata header at file start');
    const metadata = new Map();
    for (const [, key, value] of blocks[0][1].matchAll(/^\/\/\s*@([\w.:-]+)\s*(.*)$/gm)) metadata.set(key, [...(metadata.get(key) || []), value.trim()]);
    for (const key of ['name', 'version', 'description']) if (!metadata.get(key)?.[0]) fail(`${script.id}: missing @${key}`);
    if (!metadata.has('match') && !metadata.has('include')) fail(`${script.id}: no route patterns`);
    for (const key of ['downloadURL', 'updateURL']) for (const url of metadata.get(key) || []) if (!new URL(url).pathname.endsWith(`/dist/${script.output}`)) fail(`${script.id}: @${key} does not point to dist`);
    const declared = new Set(metadata.get('grant') || []);
    const ast = parse(source, { ecmaVersion: 'latest', ranges: true });
    const used = new Set();
    const scopes = analyze(ast, { ecmaVersion: 2022, sourceType: 'script', optimistic: true, ignoreEval: true });
    for (const reference of scopes.globalScope.through) {
      const name = reference.identifier.name;
      if (/^GM_/.test(name) || name === 'unsafeWindow') used.add(name);
    }
    function inspect(node) {
      if (!node?.type) return;
      if (node.type === 'MemberExpression' && node.object?.name === 'GM') {
        const method = node.computed ? node.property.value : node.property.name;
        if (typeof method === 'string') used.add(`GM.${method}`);
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === 'range') continue;
        if (Array.isArray(value)) value.forEach(inspect);
        else if (value?.type) inspect(value);
      }
    }
    inspect(ast);
    if (declared.has('none') && (used.size || declared.size > 1)) fail(`${script.id}: @grant none conflicts with privileged APIs`);
    for (const api of used) if (!declared.has(api)) fail(`${script.id}: missing @grant ${api}`);
    const unused = [...declared].filter(grant => grant !== 'none' && !used.has(grant));
    if (unused.length) {
      warnings++;
      console.warn(`WARN ${script.id}: preserved declared grants not statically used: ${unused.join(', ')}`);
    }
    const canonical = readFileSync(join(root, script.sourceDir, script.metadata), 'utf8').trimEnd();
    if (blocks[0][0] !== canonical) fail(`${script.id}: published metadata differs from source`);
    console.log(`validated dist/${script.output}`);
  } catch (error) { fail(`${script.id}: ${error.message}`); }
}
const expected = new Set(scripts.map(script => script.output));
for (const file of readdirSync(join(root, 'dist'))) if (file.endsWith('.user.js') && !expected.has(file)) fail(`unregistered artifact: ${file}`);
for (const file of readdirSync(root)) if (file.endsWith('.user.js')) fail(`root artifact must be moved into dist: ${file}`);
console.log(`${errors ? 'FAIL' : 'PASS'}: ${scripts.length} artifacts, ${errors} error(s), ${warnings} warning group(s)`);
process.exitCode = errors ? 1 : 0;
