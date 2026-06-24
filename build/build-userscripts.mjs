import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const commonPath = resolve(root, 'src/common/pt-common.js');
const common = readFileSync(commonPath, 'utf8').trimEnd();
const checkOnly = process.argv.includes('--check');

const targets = [
  'IYUU_Reseed_Checker.user.js',
  'Moviepilot_NameTest.user.js'
];

for (const target of targets) {
  const file = resolve(root, target);
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('// <pt-common:start>');
  const endMarker = '// <pt-common:end>';
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`Common block marker not found in ${target}`);
  }
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const lineEnd = source.indexOf('\n', end);
  const next = `${source.slice(0, lineStart)}${common}${source.slice(lineEnd < 0 ? source.length : lineEnd)}`;
  if (checkOnly) {
    if (next !== source) throw new Error(`Common block is out of sync in ${target}`);
    console.log(`checked ${target}`);
  } else {
    writeFileSync(file, next);
    console.log(`synced ${target}`);
  }
}
