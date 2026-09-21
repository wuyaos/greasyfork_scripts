import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'userscript-build-test-'));
try {
  for (const path of ['script', 'src', 'dist', 'package.json']) cpSync(join(root, path), join(scratch, path), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(scratch, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const command = ['script/build-userscripts.mjs'];
  execFileSync(process.execPath, [...command, '--script', 'nicept-replace-icon', '--check'], { cwd: scratch, stdio: 'pipe' });
  const artifact = join(scratch, 'dist/NicePT_ReplaceIcon.user.js');
  const original = readFileSync(artifact, 'utf8');
  writeFileSync(artifact, `${original}\n// Deliberate drift for guard sensitivity.\n`);
  const stale = spawnSync(process.execPath, [...command, '--script', 'nicept-replace-icon', '--check'], { cwd: scratch, encoding: 'utf8' });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /out of date/);
  assert.match(readFileSync(artifact, 'utf8'), /Deliberate drift/);
  execFileSync(process.execPath, [...command, '--script', 'nicept-replace-icon'], { cwd: scratch, stdio: 'pipe' });
  assert.equal(readFileSync(artifact, 'utf8'), original);
  for (const args of [['--script'], ['--script', 'not-a-script'], ['--unexpected']]) {
    const result = spawnSync(process.execPath, [...command, ...args], { cwd: scratch, encoding: 'utf8' });
    assert.equal(result.status, 1, `must reject ${args.join(' ')}`);
  }
  writeFileSync(join(scratch, 'src/scripts/zhuque-batch-download/index.js'), 'const = ;\n');
  const broken = spawnSync(process.execPath, command, { cwd: scratch, encoding: 'utf8' });
  assert.equal(broken.status, 1);
  assert.equal(readFileSync(artifact, 'utf8'), original, 'failed all-script build must not overwrite earlier artifacts');
  console.log('PASS: build selection, deterministic rebuild, drift detection, invalid arguments and failure isolation');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
