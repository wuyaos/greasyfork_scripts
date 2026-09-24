import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { analyze } from 'eslint-scope';
import { scripts } from '../script/scripts-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'tests/contracts/migration-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const hash = text => createHash('sha256').update(text).digest('hex');
const cleanAst = node => JSON.stringify(node, (key, value) => {
  if (['start', 'end', 'loc', 'range', 'raw'].includes(key)) return undefined;
  return typeof value === 'bigint' ? `${value}n` : value;
});
function walk(node, visit) {
  if (!node?.type) return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'range'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value?.type) walk(value, visit);
  }
}
function graph(path, modules = new Map()) {
  if (modules.has(path)) return modules;
  const source = readFileSync(path, 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
  const imports = new Map();
  const declarations = new Map();
  modules.set(path, { ast, imports, declarations });
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      const target = resolve(dirname(path), node.source.value);
      for (const spec of node.specifiers) imports.set(spec.local.name, { target, name: spec.imported?.name });
      if (!target.endsWith('.css')) graph(target, modules);
    }
    const declaration = node.declaration || node;
    if (declaration.type === 'VariableDeclaration') for (const item of declaration.declarations) declarations.set(item.id.name, item.init);
  }
  return modules;
}
function restored(node, path, modules, active = new Set()) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(child => restored(child, path, modules, active));
  if (node.type === 'Identifier') {
    const imported = modules.get(path).imports.get(node.name);
    if (imported?.target.endsWith('.css')) {
      const css = readFileSync(imported.target, 'utf8');
      return { type: 'TemplateLiteral', expressions: [], quasis: [{ type: 'TemplateElement', value: { cooked: css }, tail: true }] };
    }
    // The old GitHub enhancer embedded these namespaces in one object literal.
    if (imported?.target.split('\\').join('/').includes('/github-releases/release-') && !active.has(imported.target)) {
      const value = modules.get(imported.target).declarations.get(imported.name);
      if (value?.type === 'ObjectExpression') return restored(value, imported.target, modules, new Set([...active, imported.target]));
    }
  }
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, restored(value, path, modules, active)]));
}
let total = 0;
// --regen: rebuild statement fingerprints and globals from current sources after an
// approved cleanup round. Metadata/version fields are preserved from the existing baseline.
const regen = process.argv.includes('--regen');
for (const script of scripts) {
  const modules = graph(join(root, script.sourceDir, script.entry));
  const fingerprints = new Set();
  const unresolved = new Set();
  for (const [path, { ast }] of modules) {
    for (const reference of analyze(ast, { ecmaVersion: 2022, sourceType: 'module', optimistic: true, ignoreEval: true }).globalScope.through) unresolved.add(reference.identifier.name);
    walk(ast, node => {
      let normalized = restored(node, path, modules);
      // This path change is the one intentional runtime contract change for the local loader.
      const json = cleanAst(normalized).replaceAll('http://127.0.0.1:8787/dist/', 'http://127.0.0.1:8787/');
      fingerprints.add(hash(json));
    });
  }
  const expected = baseline.scripts[script.id];
  // 新脚本（加入 registry 时无历史基线）跳过契约对比；--regen 只重建已有脚本基线。
  if (!expected) {
    console.log(`contracts ${script.id}: no baseline, skipped`);
    continue;
  }
  if (regen) {
    // Contract granularity = top-level statements of each module (matching the
    // original capture), not every AST node.
    const statementHashes = new Set();
    for (const [path, { ast }] of modules) {
      for (const node of ast.body) {
        const normalized = restored(node, path, modules);
        const json = cleanAst(normalized).replaceAll('http://127.0.0.1:8787/dist/', 'http://127.0.0.1:8787/');
        statementHashes.add(hash(json));
      }
    }
    expected.statements = [...statementHashes].map(h => ({ hash: h }));
    expected.globals = [...unresolved].sort();
    console.log(`regen ${script.id}: ${expected.statements.length} statements, ${modules.size} modules`);
    continue;
  }
  const missing = expected.statements.filter(statement => !fingerprints.has(statement.hash));
  assert.deepEqual(missing, [], `${script.id}: missing or modified baseline statements`);
  if (expected.globals) assert.deepEqual([...unresolved].sort(), expected.globals, `${script.id}: external identifier contract drift`);
  const metadata = readFileSync(join(root, script.sourceDir, script.metadata), 'utf8').trimEnd();
  let normalizedHeader = metadata.replace(/(^\/\/ @version\s+)\S+/m, expected.metadata.match(/^\/\/ @version\s+\S+/m)[0]);
  // downloadURL/updateURL are release-channel metadata, not behavior contracts;
  // the intentional dist/ and CDN URL changes are normalized away.
  normalizedHeader = normalizedHeader.replace(/^(\/\/ @(?:downloadURL|updateURL)\s+)\S+$/gm, '$1<URL>');
  let expectedHeader = expected.metadata.replace(/^(\/\/ @(?:downloadURL|updateURL)\s+)\S+$/gm, '$1<URL>');
  if (script.id === 'github-releases') {
    normalizedHeader = normalizedHeader.replace(/^\/\/ @grant\s+GM_deleteValue\n/m, '');
    expectedHeader = expectedHeader.replace(/^\/\/ @grant\s+GM_deleteValue\n/m, '');
  }
  assert.equal(normalizedHeader, expectedHeader, `${script.id}: unexpected metadata changes`);
  assert.match(metadata, new RegExp(`^// @version\\s+${expected.version.replaceAll('.', '\\.')}\\s*$`, 'm'));
  total += expected.statements.length;
  console.log(`contracts ${script.id}: ${expected.statements.length} original statements, ${modules.size} modules`);
}
if (regen) {
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`REGENERATED ${baselinePath} (approved cleanup round; review the diff before committing)`);
} else console.log(`PASS: ${scripts.length} scripts; ${total} original statement contracts preserved`);
