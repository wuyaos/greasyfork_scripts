import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { analyze } from 'eslint-scope';
import { scripts } from '../script/scripts-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(readFileSync(join(root, 'tests/contracts/migration-baseline.json'), 'utf8'));
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
  const missing = expected.statements.filter(statement => !fingerprints.has(statement.hash));
  assert.deepEqual(missing, [], `${script.id}: missing or modified baseline statements`);
  if (expected.globals) assert.deepEqual([...unresolved].sort(), expected.globals, `${script.id}: external identifier contract drift`);
  const metadata = readFileSync(join(root, script.sourceDir, script.metadata), 'utf8').trimEnd();
  let normalizedHeader = metadata.replace(/(^\/\/ @version\s+)\S+/m, expected.metadata.match(/^\/\/ @version\s+\S+/m)[0]);
  normalizedHeader = normalizedHeader.replace(/(^\/\/ @(?:downloadURL|updateURL)\s+.*\/)dist\//gm, '$1');
  if (script.id === 'github-releases') normalizedHeader = normalizedHeader.replace(/^\/\/ @grant\s+GM_deleteValue\n/m, '');
  assert.equal(normalizedHeader, expected.metadata, `${script.id}: unexpected metadata changes`);
  assert.match(metadata, new RegExp(`^// @version\\s+${expected.version.replaceAll('.', '\\.')}\\s*$`, 'm'));
  total += expected.statements.length;
  console.log(`contracts ${script.id}: ${expected.statements.length} original statements, ${modules.size} modules`);
}
console.log(`PASS: ${scripts.length} scripts; ${total} original statement contracts preserved`);
