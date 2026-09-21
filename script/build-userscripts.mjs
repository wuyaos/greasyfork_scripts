import { readFile, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { build } from 'esbuild';
import { scripts } from './scripts-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let checkOnly = false;
let requested;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--check') checkOnly = true;
  else if (args[index] === '--script' && args[index + 1] && !args[index + 1].startsWith('--')) requested = args[++index];
  else throw new Error(`Invalid argument: ${args[index]}. Use --check or --script <id>.`);
}
const selected = requested ? scripts.filter(script => script.id === requested) : scripts;
if (!selected.length) throw new Error(`Unknown script id: ${requested}`);

async function bundleScript(script) {
  const metadata = (await readFile(join(root, script.sourceDir, script.metadata), 'utf8')).trimEnd();
  if (!metadata.startsWith('// ==UserScript==') || !metadata.endsWith('// ==/UserScript==')) {
    throw new Error(`${script.id}: invalid userscript metadata block`);
  }
  const bundle = await build({
    absWorkingDir: root,
    entryPoints: [join(root, script.sourceDir, script.entry)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'esnext',
    charset: 'utf8',
    keepNames: true,
    treeShaking: false,
    legalComments: 'inline',
    loader: { '.css': 'text' },
    sourcemap: false,
    minify: false,
    logLevel: 'silent'
  });
  const content = `${metadata}\n\n// Generated from ${script.sourceDir}/${script.entry}; do not edit dist files.\n${bundle.outputFiles[0].text}`;
  new Script(content, { filename: script.output });
  return { script, content };
}

// Finish every bundle and syntax check before changing any installable artifact.
const bundles = [];
for (const script of selected) bundles.push(await bundleScript(script));
if (checkOnly) {
  const stale = [];
  for (const { script, content } of bundles) {
    const current = await readFile(join(root, 'dist', script.output), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (current !== content) stale.push(script.output);
    else console.log(`checked dist/${script.output}`);
  }
  if (stale.length) throw new Error(`Generated artifacts are out of date: ${stale.join(', ')}`);
} else {
  const outputDir = join(root, 'dist');
  await mkdir(outputDir, { recursive: true });
  const staging = await mkdtemp(join(outputDir, '.build-'));
  try {
    for (const { script, content } of bundles) await writeFile(join(staging, script.output), content);
    for (const { script } of bundles) {
      await rename(join(staging, script.output), join(outputDir, script.output));
      console.log(`built dist/${script.output}`);
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
